# filepath: backend/app/schemas/news.py
from pydantic import BaseModel, HttpUrl
from typing import Optional

class NewsSourceBase(BaseModel):
    url: HttpUrl
    name: Optional[str] = None

class NewsSourceCreate(NewsSourceBase):
    pass

class NewsSourcePublic(NewsSourceBase):
    id: int
    name: str # Name is not optional on retrieval

    class Config:
        from_attributes = True