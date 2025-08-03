import modal
import os
import subprocess
import json
from typing import Dict, Any

app = modal.App("vrai-ffmpeg-processor")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install([
        "curl",
        "ffmpeg",
        "nodejs",
        "npm"
    ])
    .pip_install("fastapi[standard]")
    .run_commands([
        "npm install -g typescript ts-node",
        "node --version",
        "npm --version",
        "ffmpeg -version",
        "ffprobe -version"
    ])
    .workdir("/app")
    .add_local_dir("./handlers", "/app/handlers", copy=True)
    .add_local_file("./package.json", "/app/package.json", copy=True)
    .add_local_file("./tsconfig.json", "/app/tsconfig.json", copy=True)
    .run_commands([
        "npm install --production"
    ])
)

@app.function(
    image=image,
    cpu=1.0,
    memory=1024,
    timeout=60,
    # secrets=[
    #     modal.Secret.from_name("firebase-config"),
    #     modal.Secret.from_name("openai-config"),
    #     modal.Secret.from_name("aws-config"),
    #     modal.Secret.from_name("database-config")
    # ]
)
@modal.fastapi_endpoint(method="GET")
def health():
    """Health check endpoint for the vrai-ffmpeg service"""
    try:
        result = subprocess.run([
            "node", "/app/handlers/health.js"
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            return {
                "status": "error",
                "message": "Health check failed",
                "error": result.stderr
            }, 500
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Health check exception: {str(e)}"
        }, 500

@app.function(
    image=image,
    cpu=1.0,
    memory=1024,
    timeout=900,  # 15 minutes for audio processing
    # secrets=[
    #     modal.Secret.from_name("firebase-config"),
    #     modal.Secret.from_name("openai-config"),
    #     modal.Secret.from_name("aws-config"),
    #     modal.Secret.from_name("database-config")
    # ]
)
@modal.fastapi_endpoint(method="POST")
def trim_and_transcribe():
    """Main endpoint for trimming audio and transcribing with OpenAI Whisper"""
    try:
        from fastapi import Request
        import tempfile
        
        request = modal.current_request()
        request_data = request.json()
        
        headers = dict(request.headers)
        full_request_data = {
            **request_data,
            "headers": headers
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(full_request_data, f)
            temp_file = f.name
        
        result = subprocess.run([
            "node", "/app/handlers/trim-and-transcribe.js", temp_file
        ], capture_output=True, text=True, timeout=870)  # Leave some buffer for cleanup
        
        os.unlink(temp_file)
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            return {
                "status": "error",
                "message": "Processing failed",
                "error": result.stderr
            }, 500
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Processing exception: {str(e)}"
        }, 500

@app.local_entrypoint()
def main():
    """Local development server"""
    print("Starting Modal development server...")
    print("Health endpoint: /health")
    print("Main endpoint: /trim-and-transcribe")
    print("Use 'modal serve modal_app.py' to start the server")
