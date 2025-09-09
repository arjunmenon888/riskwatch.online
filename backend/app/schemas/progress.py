# filepath: backend/app/schemas/progress.py
from pydantic import BaseModel
from typing import List, Optional

class ProgressCreate(BaseModel):
    lesson_id: int

class UserProgress(BaseModel):
    completed_lesson_ids: List[int]
    next_lesson_id: Optional[int] = None
    total_lessons: int
    completed_lessons_count: int