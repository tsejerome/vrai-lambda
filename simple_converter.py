#!/usr/bin/env python3
"""
Simple function to convert remote CAF files to base64
"""

import requests
import base64

def caf_url_to_base64(url: str) -> str:
    """
    Download a CAF file from URL and return it as base64 string
    
    Args:
        url: URL of the CAF file
        
    Returns:
        Base64 encoded string
    """
    response = requests.get(url)
    response.raise_for_status()
    
    # Convert to base64
    base64_content = base64.b64encode(response.content).decode('utf-8')
    return base64_content

# Example usage
if __name__ == "__main__":
    # Replace with your actual CAF URL
    caf_url = "YOUR_CAF_URL_HERE"
    
    try:
        base64_data = caf_url_to_base64(caf_url)
        print(f"Base64 data (first 100 chars): {base64_data[:100]}...")
        print(f"Total length: {len(base64_data)} characters")
        
        # Create request payload
        request_payload = {
            "fileBlob": base64_data,
            "summarizationType": "summarizev2",
            "fromTime": 0.0,
            "toTime": 10.0
        }
        
        print("\nRequest payload created successfully!")
        
    except Exception as e:
        print(f"Error: {e}") 