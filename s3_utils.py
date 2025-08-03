import boto3
import os
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

def get_s3_client():
    """Get S3 client instance"""
    return boto3.client(
        's3',
        aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.environ.get('AWS_ACCESS_PW'),
        region_name='us-east-2'
    )

def upload_file_for_debugging(
    file_buffer: bytes,
    filename: str,
    user_id: str,
    content_type: str
) -> Optional[str]:
    """Upload file to S3 for debugging purposes"""
    try:
        s3_client = get_s3_client()
        bucket_name = os.environ.get('S3_BUCKET_NAME')
        
        if not bucket_name:
            logger.error("S3_BUCKET_NAME environment variable not set")
            return None
        
        # Create S3 key with user and timestamp
        timestamp = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
        s3_key = f"debug/{user_id}/{timestamp}/{filename}"
        
        # Upload file
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=file_buffer,
            ContentType=content_type,
            Metadata={
                'user_id': user_id,
                'uploaded_at': timestamp,
                'purpose': 'debug'
            }
        )
        
        # Generate URL
        url = f"https://{bucket_name}.s3.us-east-2.amazonaws.com/{s3_key}"
        logger.info(f"File uploaded to S3: {url}")
        
        return url
        
    except Exception as e:
        logger.error(f"Failed to upload file to S3: {e}")
        return None 