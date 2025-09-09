# filepath: backend/app/models/progress.py
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .user import Base # Use the same Base as other models

class UserLessonCompletion(Base):
    """
    Tracks that a specific user has completed a specific lesson.
    """
    __tablename__ = "user_lesson_completions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    training_id = Column(Integer, ForeignKey("trainings.id"), nullable=False) # For easier querying
    completed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    lesson = relationship("Lesson")
    training = relationship("Training")

    # A user can only complete a lesson once.
    __table_args__ = (UniqueConstraint('user_id', 'lesson_id', name='_user_lesson_uc'),)