#!/usr/bin/env python3
"""
Script to convert remote CAF files to base64 for testing the Modal endpoint
"""

import requests
import base64
import sys
import json
from typing import Optional

def download_and_convert_to_base64(url: str) -> Optional[str]:
    """
    Download a file from URL and convert it to base64
    
    Args:
        url: The URL of the CAF file
        
    Returns:
        Base64 encoded string of the file content, or None if failed
    """
    try:
        print(f"Downloading file from: {url}")
        
        # Download the file
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        # Get file size
        file_size = int(response.headers.get('content-length', 0))
        print(f"File size: {file_size} bytes")
        
        # Read the file content
        file_content = response.content
        print(f"Downloaded {len(file_content)} bytes")
        
        # Convert to base64
        base64_content = base64.b64encode(file_content).decode('utf-8')
        print(f"Base64 length: {len(base64_content)} characters")
        
        return base64_content
        
    except requests.exceptions.RequestException as e:
        print(f"Error downloading file: {e}")
        return None
    except Exception as e:
        print(f"Error converting to base64: {e}")
        return None

def create_test_request(base64_content: str, from_time: float = 0.0, to_time: float = 10.0, 
                       summarization_type: str = "summarizev2") -> dict:
    """
    Create a test request payload for the Modal endpoint
    
    Args:
        base64_content: Base64 encoded audio data
        from_time: Start time in seconds
        to_time: End time in seconds
        summarization_type: Type of summarization
        
    Returns:
        Dictionary with the request payload
    """
    return {
        "fileBlob": base64_content,
        "summarizationType": summarization_type,
        "fromTime": from_time,
        "toTime": to_time
    }

def save_test_request(request_data: dict, filename: str = "test_request.json"):
    """Save the test request to a JSON file"""
    try:
        with open(filename, 'w') as f:
            json.dump(request_data, f, indent=2)
        print(f"Test request saved to: {filename}")
    except Exception as e:
        print(f"Error saving test request: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_caf_to_base64.py <CAF_URL> [from_time] [to_time] [summarization_type]")
        print("Example: python convert_caf_to_base64.py https://example.com/audio.caf 0.0 10.0 summarizev2")
        sys.exit(1)
    
    url = sys.argv[1]
    from_time = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0
    to_time = float(sys.argv[3]) if len(sys.argv) > 3 else 10.0
    summarization_type = sys.argv[4] if len(sys.argv) > 4 else "summarizev2"
    
    print("=== CAF to Base64 Converter ===")
    print(f"URL: {url}")
    print(f"Time range: {from_time}s to {to_time}s")
    print(f"Summarization type: {summarization_type}")
    print()
    
    # Download and convert to base64
    base64_content = download_and_convert_to_base64(url)
    
    if base64_content is None:
        print("Failed to convert file to base64")
        sys.exit(1)
    
    # Create test request
    request_data = create_test_request(base64_content, from_time, to_time, summarization_type)
    
    # Save to file
    save_test_request(request_data)
    
    # Show curl command
    print("\n=== Curl Command ===")
    curl_command = f'''curl --location 'https://soulkitstudio--vrai-ffmpeg-processor-trim-and-transcribe.modal.run/' \\
--header 'Content-Type: application/json' \\
--data '{json.dumps(request_data)}' '''
    
    print(curl_command)
    
    # Show first 100 characters of base64 for verification
    print(f"\n=== Base64 Preview (first 100 chars) ===")
    print(base64_content[:100] + "...")

if __name__ == "__main__":
    main() 