# filepath: backend/app/api/r2_deps.py
import boto3
from botocore.client import Config
from fastapi import HTTPException, status
from app.core.config import settings

# --- THIS IS A NEW FILE ---

# Initialize the client once at startup
r2_client = None
if all([
    settings.R2_ACCOUNT_ID,
    settings.R2_ACCESS_KEY_ID,
    settings.R2_SECRET_ACCESS_KEY,
    settings.R2_BUCKET_NAME
]):
    r2_client = boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
    )

def get_r2_client():
    """
    A FastAPI dependency that provides the initialized R2 client.
    Raises a 501 Not Implemented error if R2 is not configured.
    """
    if not r2_client:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Cloudflare R2 is not configured on the server."
        )
    return r2_client