# filepath: backend/app/core/config.py
from pydantic_settings import BaseSettings
from pydantic import model_validator
from dotenv import load_dotenv
import os
from typing import List # <-- ADD THIS IMPORT

load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    INVITE_TOKEN_EXPIRE_HOURS: int = 24
    FIRST_SUPERADMIN_EMAIL: str
    FIRST_SUPERADMIN_PASSWORD: str
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    PEXELS_API_KEY: str = os.getenv("PEXELS_API_KEY", "")
    
    # --- THIS IS THE CHANGE ---
    # Moved from main.py to be configurable per environment
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    # --- END OF CHANGE ---

    # Attachment configuration
    MAX_ATTACHMENT_SIZE_MB: int = 200

    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_PUBLIC_URL: str = ""

    @model_validator(mode='after')
    def fix_database_url(self) -> 'Settings':
        """
        Ensures the database URL uses the correct 'psycopg' driver scheme
        for async operations with psycopg3.
        """
        if self.DATABASE_URL and self.DATABASE_URL.startswith("postgresql://"):
            self.DATABASE_URL = self.DATABASE_URL.replace(
                "postgresql://", "postgresql+psycopg://", 1
            )
        return self

    class Config:
        env_file = ".env"

settings = Settings()