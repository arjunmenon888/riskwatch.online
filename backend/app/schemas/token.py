from pydantic import BaseModel
from typing import Optional
from .user import UserPublic  # Import the UserPublic schema

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

# --- NEW SCHEMA ---
class LoginResponse(BaseModel):
    token: Token
    user: UserPublic
# --- END OF NEW SCHEMA ---

class TokenPayload(BaseModel):
    sub: Optional[str] = None