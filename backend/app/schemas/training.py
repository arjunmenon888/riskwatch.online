# filepath: backend/app/schemas/training.py
from pydantic import BaseModel, computed_field
from typing import List, Optional
from datetime import datetime
from app.core.config import settings

# NEW: Attachment Schemas
class AttachmentBase(BaseModel):
    filename: str
    mime_type: str
    size: int

class AttachmentPublic(AttachmentBase):
    id: int
    storage_key: str
    created_at: datetime

    @computed_field
    @property
    def public_url(self) -> str:
        # Derive the public URL on the fly
        return f"{settings.R2_PUBLIC_URL}/{self.storage_key}"

    class Config:
        from_attributes = True

# --- Lesson Schemas ---
class LessonBase(BaseModel):
    title: str
    content: Optional[str] = None
    order: int = 0

class LessonCreate(LessonBase):
    pass

class LessonPublic(LessonBase):
    id: int
    attachments: List[AttachmentPublic] = [] # Add this line

    class Config:
        from_attributes = True

# --- Module Schemas ---
class ModuleBase(BaseModel):
    title: str
    order: int = 0

class ModuleCreate(ModuleBase):
    pass

class ModulePublic(ModuleBase):
    id: int
    lessons: List[LessonPublic] = []

    class Config:
        from_attributes = True

# --- Training Schemas ---
class TrainingBase(BaseModel):
    title: str
    description: Optional[str] = None
    is_published: bool = False

class TrainingCreate(TrainingBase):
    pass

class TrainingPublic(TrainingBase):
    id: int
    modules: List[ModulePublic] = []

    class Config:
        from_attributes = True

# For the navbar dropdown
class TrainingListItem(BaseModel):
    id: int
    title: str

    class Config:
        from_attributes = True

class TrainingManagementListItem(BaseModel):
    id: int
    title: str
    is_published: bool
    created_at: datetime 

    class Config:
        from_attributes = True