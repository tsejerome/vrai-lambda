#!/usr/bin/env python3
"""
Simple script to convert a local file to base64
"""

import base64
import sys
import os

def file_to_base64(file_path: str) -> str:
    """Convert a local file to base64 string"""
    try:
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        base64_content = base64.b64encode(file_content).decode('utf-8')
        return base64_content
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

def main():
    if len(sys.argv) != 2:
        print("Usage: python convert_local_file.py <file_path>")
        print("Example: python convert_local_file.py /path/to/your/audio.caf")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' does not exist")
        sys.exit(1)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    print(f"File: {file_path}")
    print(f"Size: {file_size} bytes")
    
    # Convert to base64
    print("Converting to base64...")
    base64_content = file_to_base64(file_path)
    
    print(f"Base64 length: {len(base64_content)} characters")
    print("\n=== Base64 Content ===")
    print(base64_content)
    
    # Save to file
    output_file = f"{os.path.basename(file_path)}.base64.txt"
    with open(output_file, 'w') as f:
        f.write(base64_content)
    print(f"\nBase64 content saved to: {output_file}")

if __name__ == "__main__":
    main() 