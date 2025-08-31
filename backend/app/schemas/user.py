from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.user import Role

# --- BASE & INPUT SCHEMAS ---

class UserBase(BaseModel):
    email: EmailStr

class AdminRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    company_name: str

class AdminCreate(BaseModel):
    email: EmailStr
    password: str

class AdminUpdate(BaseModel):
    is_active: bool

class AdminSettingsUpdate(BaseModel):
    can_create_users: bool
    user_creation_limit: int

class UserAcceptInvite(BaseModel):
    password: str

class InvitationCreate(BaseModel):
    email: EmailStr
    role: Role
    full_name: str

# --- DATABASE & PUBLIC-FACING SCHEMAS ---

class InvitationPublic(BaseModel):
    id: int
    email: EmailStr
    expires_at: datetime
    is_used: bool
    token: str

    class Config:
        from_attributes = True

class UserPublic(BaseModel):
    id: int
    email: EmailStr
    role: Role
    is_active: bool
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    can_create_users: bool
    user_creation_limit: int
    created_at: datetime
    last_login: Optional[datetime] = None
    users_created_count: Optional[int] = None # For admins
    pending_invite_token: Optional[str] = None # For users

    status_locked: bool

    class Config:
        from_attributes = True