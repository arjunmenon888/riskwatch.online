from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PostBase(BaseModel):
    title: str
    summary: str
    description: str
    image_url: str
    source_name: str
    source_url: str
    published_date: Optional[datetime] = None

class PostCreate(PostBase):
    author_id: int

class PostPublic(PostBase):
    id: int
    created_at: datetime
    is_ai_generated: bool
    author_id: int

    class Config:
        from_attributes = True

class FetchStatus(BaseModel):
    stage: str
    progress: float
    message: str
    is_complete: bool = False