# filepath: backend/app/models/training.py
from sqlalchemy import (
    Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .user import Base  # Import Base from your existing user model file
import enum


class UploadStatus(enum.Enum):
    PENDING = "pending"
    COMPLETE = "complete"
    FAILED = "failed"


class Training(Base):
    """
    Represents a top-level training course.
    """
    __tablename__ = "trainings"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_published = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Foreign key to the user who created this training
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationship to the author (User model)
    author = relationship("User", back_populates="created_trainings")
    
    # Relationship to all modules within this training
    # - cascade="all, delete-orphan": Deleting a training deletes its modules.
    # - order_by="Module.order": Ensures modules are loaded in the correct order.
    modules = relationship(
        "Module", 
        back_populates="training", 
        cascade="all, delete-orphan", 
        order_by="Module.order"
    )

class Module(Base):
    """
    Represents a module or section within a training course.
    """
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    order = Column(Integer, nullable=False, default=0)
    training_id = Column(Integer, ForeignKey("trainings.id"), nullable=False)
    
    # Relationship back to the parent training
    training = relationship("Training", back_populates="modules")
    
    # Relationship to all lessons within this module
    lessons = relationship(
        "Lesson", 
        back_populates="module", 
        cascade="all, delete-orphan", 
        order_by="Lesson.order"
    )

class Lesson(Base):
    """
    Represents an individual lesson within a module.
    """
    __tablename__ = "lessons"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    order = Column(Integer, nullable=False, default=0)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    
    # Relationship back to the parent module
    module = relationship("Module", back_populates="lessons")
    
    # Relationship to multiple attachments
    attachments = relationship(
        "Attachment",
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="Attachment.created_at"
    )


class Attachment(Base):
    """
    Represents a file attached to a lesson.
    """
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    lesson_id = Column(Integer, ForeignKey("lessons.id"), nullable=False)
    
    filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    size = Column(Integer, nullable=False) # Size in bytes
    storage_key = Column(String, nullable=False, unique=True) # e.g., lessons/101/abc-123.pdf
    upload_status = Column(SAEnum(UploadStatus), nullable=False, default=UploadStatus.PENDING)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    lesson = relationship("Lesson", back_populates="attachments")