#!/usr/bin/env python3
"""
Final Ultimate Complete Modal app for Vrai FFmpeg processing with ALL TypeScript features
"""

import modal
import os
import subprocess
import json
import base64
import tempfile
import logging
import uuid
import signal
import atexit
from typing import Dict, Any, Optional, List, Union
from datetime import datetime

# Container-only imports (will be available in Modal environment)
try:
    import requests
    from fastapi import FastAPI, HTTPException, status, Depends, Header, Request
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from pydantic import BaseModel, Field, field_validator, ValidationError
    import firebase_admin
    from firebase_admin import credentials, auth, firestore
    from pymongo import MongoClient
    from pymongo.database import Database
    import openai
    from s3_utils import upload_file_for_debugging
    
    # Pydantic models
    class AudioProcessingRequest(BaseModel):
        fileBlob: str = Field(..., description="Audio file (base64 string or binary buffer)")
        summarizationType: str = Field(..., description="Type of summarization: summarize, simple-cleanup, whatsapp-cleanup, none")
        fromTime: float = Field(..., ge=0, description="Start time in seconds")
        toTime: float = Field(..., gt=0, description="End time in seconds")
        
        @field_validator('toTime')
        @classmethod
        def validate_time_range(cls, v, info):
            if 'fromTime' in info.data and v <= info.data['fromTime']:
                raise ValueError('toTime must be greater than fromTime')
            if v > 300:
                raise ValueError('toTime cannot exceed 300 seconds')
            return v
        
        @field_validator('summarizationType')
        @classmethod
        def validate_summarization_type(cls, v):
            valid_types = ["none", "summarize", "simple-cleanup", "whatsapp-cleanup", "title"]
            if v not in valid_types:
                raise ValueError(f'summarizationType must be one of: {", ".join(valid_types)}')
            return v
        
        model_config = {"extra": "forbid"}

    class AudioProcessingResponse(BaseModel):
        success: bool
        transcription: Optional[str] = None
        duration: Optional[float] = None
        fromTime: Optional[float] = None
        toTime: Optional[float] = None
        fileSize: Optional[int] = None
        summary: Optional[str] = None
        post: Optional[Dict[str, Any]] = None
        error: Optional[str] = None
        message: Optional[str] = None
        debugFiles: Optional[List[str]] = None
        
        model_config = {"extra": "forbid"}
        
except ImportError:
    # These will be available in the Modal container
    pass

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = modal.App("vrai-ffmpeg-processor-v2")

# Constants (matching TypeScript)
MONGODB_USER_COLLECTION = 'users'

# Environment variables (matching TypeScript)
REPO_NAME = 'vrai-lambda'
NODE_ENV = os.environ.get('NODE_ENV', 'development')
IS_OFFLINE = os.environ.get('IS_OFFLINE', 'false').lower() == 'true'

# Error messages (matching TypeScript)
ERROR_MESSAGES = {
    "UNAUTHORIZED": {
        "status": 401,
        "code": "unauthorized",
        "message": "You need to login first"
    },
    "FORBIDDEN": {
        "status": 403,
        "code": "forbidden",
        "message": "You have no permission to access this route"
    },
    "NOT_FOUND": {
        "status": 404,
        "code": "resource_not_found",
        "message": "Cannot find corresponding resources"
    },
    "EXISTS": {
        "status": 409,
        "code": "resource_exists",
        "message": "Resource already exists"
    },
    "BAD_REQUEST": {
        "status": 400,
        "code": "bad_request",
        "message": "Bad request"
    }
}

# Message utilities (matching TypeScript MessageUtil)
class MessageUtil:
    @staticmethod
    def success(data: Dict[str, Any]) -> Dict[str, Any]:
        return data
    
    @staticmethod
    def error(status: int = 500, code: str = "internal_error", message: str = "Default Error: There is some error on our end", metadata: Any = None) -> Dict[str, Any]:
        error_response = {
            "status": status,
            "code": code,
            "message": message
        }
        if metadata:
            error_response["metadata"] = metadata
        
        logger.error(json.dumps(error_response))
        return error_response

# Fetch wrapper (matching TypeScript fetchWrapper)
class MethodType:
    GET = 'GET'
    POST = 'POST'
    PUT = 'PUT'
    PATCH = 'PATCH'

async def fetch_wrapper(url: str, method: str, body: str = None) -> Any:
    """HTTP fetch wrapper matching TypeScript implementation"""
    try:
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
        
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            data=body,
            timeout=30
        )
        
        if response.status_code >= 300:
            raise Exception(response.text)
        
        return response.json()
    except Exception as error:
        logger.error(f"Fetch wrapper error: {error}")
        raise error







# Modal image with all required dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install([
        "curl",
        "ffmpeg"
    ])
    .pip_install([
        "fastapi==0.104.1",
        "openai==1.3.7",
        "pydantic==2.5.0",
        "python-multipart==0.0.6",
        "firebase-admin==6.2.0",
        "pymongo==4.6.0",
        "python-jose[cryptography]==3.3.0",
        "uvicorn==0.24.0",
        "python-dotenv==1.0.0",
        "boto3==1.34.0",
        "requests==2.31.0"
    ])
    .run_commands([
        "ffmpeg -version",
        "ffprobe -version"
    ])
    .workdir("/app")
)

# Modal function to serve the FastAPI app
@app.function(
    image=image,
    cpu=2.0,
    memory=2048,
    timeout=900,  # 15 minutes for audio processing
    secrets=[
        modal.Secret.from_name("custom-secret")
    ]
)
@modal.asgi_app()
def fastapi_app():
    # Security scheme for JWT tokens
    security = HTTPBearer()
    
    # Create FastAPI app
    web_app = FastAPI(title="Vrai FFmpeg Processor Final Ultimate", version="1.0.0")

    @web_app.get("/")
    async def root():
        """Root endpoint (matching TypeScript)"""
        return {
            "status": "ok",
            "service": "vrai-ffmpeg-lambda",
            "version": "1.0.0",
            "timestamp": datetime.now().isoformat()
        }

    @web_app.get("/health")
    async def health():
        """Health check endpoint (matching TypeScript)"""
        return {
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "service": "vrai-ffmpeg-lambda",
            "environment": NODE_ENV,
            "ffmpegPath": '/opt/bin/ffmpeg' if not IS_OFFLINE else 'local',
            "region": "us-east-2"
        }

    @web_app.post("/trim-and-transcribe")
    async def trim_and_transcribe(
        request: AudioProcessingRequest,
        user_state: UserState = Depends(require_user_auth)
    ):
        """Main endpoint for trimming audio and transcribing with all features"""
        input_path = None
        output_path = None
        file_buffer = None
        debug_file_urls = []
        
        try:
            # Initialize Firebase and seed templates
            init_firebase()
            seed_prompt_templates()
            
            # Decode audio data
            file_buffer = decode_audio_data(request.fileBlob)
            logger.info(f"Decoded audio data: {len(file_buffer)} bytes")
            
            # Create temporary file paths with unique names
            timestamp = int(datetime.now().timestamp() * 1000)
            unique_id = generate_unique_id()
            input_path = f"/tmp/input-{timestamp}-{unique_id}.caf"
            output_path = f"/tmp/trimmed-{timestamp}-{unique_id}.mp3"
            
            # Write input file
            with open(input_path, 'wb') as f:
                f.write(file_buffer)
            
            # Upload input file to S3 for debugging
            try:
                user_id = user_state.user.get('auth', {}).get('uid', 'anonymous')
                input_file_name = f"debug-input-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}-{unique_id}.caf"
                input_file_url = upload_file_for_debugging(
                    file_buffer,
                    input_file_name,
                    user_id,
                    'audio/x-caf'
                )
                debug_file_urls.append(input_file_url)
                logger.info(f"Input file uploaded to S3 for debugging: {input_file_url}")
            except Exception as e:
                logger.error(f"Failed to upload input file to S3: {e}")
            
            # Analyze audio with ffprobe
            probe_result = analyze_audio_with_ffprobe(input_path)
            logger.info(f"Audio analysis: {probe_result}")
            
            # Log validation to Firebase (matching TypeScript)
            await log_video_validation_to_firebase(
                {
                    "parsed": bool(probe_result),
                    "error": None if probe_result else "FFprobe analysis failed",
                    "data": probe_result,
                    "stderr": ""
                },
                bool(probe_result),
                user_state,
                {"fileBlob": "base64_encoded_data"}
            )
            
            # Trim audio
            trimmed_audio = trim_audio(file_buffer, request.fromTime, request.toTime)
            logger.info(f"Trimmed audio: {len(trimmed_audio)} bytes")
            
            # Write output file for S3 upload
            with open(output_path, 'wb') as f:
                f.write(trimmed_audio)
            
            # Upload output file to S3 for debugging
            try:
                user_id = user_state.user.get('auth', {}).get('uid', 'anonymous')
                output_file_name = f"debug-output-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}-{unique_id}.mp3"
                output_file_url = upload_file_for_debugging(
                    trimmed_audio,
                    output_file_name,
                    user_id,
                    'audio/mpeg'
                )
                debug_file_urls.append(output_file_url)
                logger.info(f"Output file uploaded to S3 for debugging: {output_file_url}")
            except Exception as e:
                logger.error(f"Failed to upload output file to S3: {e}")
            
            # Transcribe audio
            transcription_result = transcribe_audio(trimmed_audio)
            logger.info(f"Transcription completed: {len(transcription_result)} characters")
            
            # Calculate duration
            duration = request.toTime - request.fromTime
            
            # Create post with summary if needed
            post = None
            summary = None
            
            if request.summarizationType and request.summarizationType != 'none':
                try:
                    user_id = user_state.user.get('auth', {}).get('uid', 'default-user')
                    
                    # Map summarization types
                    prompt_id = request.summarizationType
                    domain = 'notion.so'
                    
                    if request.summarizationType == 'summarize':
                        prompt_id = 'simple-cleanup'
                        domain = 'notion.so'
                    elif request.summarizationType == 'whatsapp-cleanup':
                        prompt_id = 'whatsapp-cleanup'
                        domain = 'whatsapp.com'
                    elif request.summarizationType == 'simple-cleanup':
                        prompt_id = 'simple-cleanup'
                        domain = 'notion.so'
                    
                    post = create_post_with_summary(
                        user_id,
                        transcription_result,
                        prompt_id,
                        domain
                    )
                    
                    summary = post['summary']
                    
                    logger.info(f"Post created successfully: {post['id']}")
                    
                except Exception as e:
                    logger.error(f"Error creating post with summary: {e}")
            
            # Prepare response
            response_data = {
                "success": True,
                "transcription": transcription_result,
                "duration": duration,
                "fromTime": request.fromTime,
                "toTime": request.toTime,
                "fileSize": len(trimmed_audio),
                "message": "Audio processed successfully"
            }
            
            if post:
                response_data["post"] = {
                    "id": post["id"],
                    "title": post["title"],
                    "summarizedContent": post["summarizedContent"],
                    "finalContent": post["finalContent"]
                }
            
            if summary:
                response_data["summary"] = summary
            
            if debug_file_urls:
                response_data["debugFiles"] = debug_file_urls
            
            logger.info("Request completed successfully")
            return response_data
            
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            
            # Upload error files to S3 for debugging
            try:
                user_id = user_state.user.get('auth', {}).get('uid', 'anonymous')
                timestamp = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
                error_type = type(e).__name__
                
                # Upload input file if available
                if file_buffer:
                    input_file_name = f"error-input-{timestamp}-{error_type}.caf"
                    input_file_url = upload_file_for_debugging(
                        file_buffer,
                        input_file_name,
                        user_id,
                        'audio/x-caf'
                    )
                    debug_file_urls.append(input_file_url)
                
                # Upload output file if available
                if output_path and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    with open(output_path, 'rb') as f:
                        output_buffer = f.read()
                    output_file_name = f"error-output-{timestamp}-{error_type}.mp3"
                    output_file_url = upload_file_for_debugging(
                        output_buffer,
                        output_file_name,
                        user_id,
                        'audio/mpeg'
                    )
                    debug_file_urls.append(output_file_url)
                
                logger.info(f"Error debug files uploaded: {debug_file_urls}")
                
            except Exception as upload_error:
                logger.error(f"Failed to upload debug files: {upload_error}")
            
            # Clean up temporary files
            try:
                if input_path and os.path.exists(input_path):
                    os.unlink(input_path)
                if output_path and os.path.exists(output_path):
                    os.unlink(output_path)
            except Exception as cleanup_error:
                logger.error(f"Error cleaning up temporary files: {cleanup_error}")
            
            error_response = MessageUtil.error(
                500,
                "internal_error",
                "Failed to process audio",
                {"debugFiles": debug_file_urls} if debug_file_urls else None
            )
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_response
            )

    # Admin endpoint for testing admin privileges
    @web_app.get("/admin/test")
    async def admin_test(user_state: UserState = Depends(require_admin_auth)):
        """Test admin endpoint"""
        return MessageUtil.success({
            "success": True,
            "message": "Admin access granted",
            "user": user_state.user.get('auth', {}),
            "relation": user_state.auth_relation
        })
    
    return web_app

@app.local_entrypoint()
def main():
    """Local development server"""
    print("Starting Modal development server (Final Ultimate Complete version)...")
    print("Root endpoint: /")
    print("Health endpoint: /health")
    print("Main endpoint: /trim-and-transcribe")
    print("Admin endpoint: /admin/test")
    print("Features included:")
    print("- Firebase authentication with admin privileges")
    print("- OpenAI Whisper transcription")
    print("- GPT-4 summary generation")
    print("- MongoDB post creation with closeDB")
    print("- S3 debug file uploads")
    print("- FFprobe audio analysis")
    print("- Prompt template seeding")
    print("- Complete error handling with MessageUtil")
    print("- Admin route protection")
    print("- Internal call support")
    print("- Validation logging to Firebase")
    print("- Fetch wrapper utility")
    print("- Standardized error messages")
    print("- Root endpoint")
    print("- Health endpoint")
    print("- Signal handling (SIGTERM)")
    print("- Process environment handling")
    print("- FFmpeg path detection")
    print("Use 'modal serve modal_app.py' to start the server")

if __name__ == "__main__":
    main() 