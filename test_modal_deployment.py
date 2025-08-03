#!/usr/bin/env python3
"""
Test script for Modal.com deployment
"""

import json
import base64
import requests
import os

def test_health_endpoint(base_url):
    """Test the health check endpoint"""
    print("Testing health endpoint...")
    
    try:
        response = requests.get(f"{base_url}/health", timeout=30)
        print(f"Health check status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Health check response:")
            print(json.dumps(data, indent=2))
            return True
        else:
            print(f"Health check failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"Health check error: {e}")
        return False

def test_audio_processing_endpoint(base_url, auth_token=None):
    """Test the audio processing endpoint with a sample request"""
    print("Testing audio processing endpoint...")
    
    test_audio_data = base64.b64encode(b"fake audio data for testing").decode('utf-8')
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    payload = {
        "fileBlob": test_audio_data,
        "summarizationType": "simple-cleanup",
        "fromTime": 0,
        "toTime": 5
    }
    
    try:
        response = requests.post(
            f"{base_url}/trim-and-transcribe",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        print(f"Audio processing status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Audio processing response:")
            print(json.dumps(data, indent=2))
            return True
        else:
            print(f"Audio processing failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"Audio processing error: {e}")
        return False

def main():
    """Main test function"""
    print("Modal.com Deployment Test")
    print("=" * 40)
    
    base_url = os.getenv("MODAL_BASE_URL", "https://your-app-id.modal.run")
    auth_token = os.getenv("FIREBASE_TEST_TOKEN")  # Optional Firebase JWT token for testing
    
    if base_url == "https://your-app-id.modal.run":
        print("⚠️  Please set MODAL_BASE_URL environment variable with your actual Modal app URL")
        print("   Example: export MODAL_BASE_URL=https://your-app-id.modal.run")
        return
    
    print(f"Testing Modal app at: {base_url}")
    print()
    
    health_ok = test_health_endpoint(base_url)
    print()
    
    if health_ok:
        audio_ok = test_audio_processing_endpoint(base_url, auth_token)
        print()
        
        if health_ok and audio_ok:
            print("✅ All tests passed! Modal deployment is working correctly.")
        else:
            print("❌ Some tests failed. Check the logs above for details.")
    else:
        print("❌ Health check failed. Skipping audio processing test.")

if __name__ == "__main__":
    main()
