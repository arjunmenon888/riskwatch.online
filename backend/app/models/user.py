# filepath: backend/app/models/user.py
import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum as SAEnum, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

class Role(enum.Enum):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    USER = "user"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String, index=True)
    company_name = Column(String, nullable=True)
    role = Column(SAEnum(Role), nullable=False)
    is_active = Column(Boolean, default=True)
    can_create_users = Column(Boolean, default=True, nullable=False, server_default='true')
    user_creation_limit = Column(Integer, default=5, nullable=False, server_default='5')
    created_at = Column(DateTime, default=datetime.utcnow)
    
    last_login = Column(DateTime, nullable=True)
    status_locked = Column(Boolean, default=False, nullable=False, server_default='false')
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    creator = relationship("User", remote_side=[id], back_populates="created_users")
    created_users = relationship("User", back_populates="creator", cascade="all, delete-orphan")

    invitations = relationship(
        "Invitation",
        back_populates="created_by",
        foreign_keys="[Invitation.created_by_id]",
        cascade="all, delete-orphan"
    )
    
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")

    # --- ADDED FOR TRAINING MODULE ---
    created_trainings = relationship("Training", back_populates="author", cascade="all, delete-orphan")

     # --- ADD THIS LINE FOR PROGRESS TRACKING ---
    lesson_completions = relationship("UserLessonCompletion", back_populates="user", cascade="all, delete-orphan")


class Invitation(Base):
    __tablename__ = "invitations"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    created_by = relationship("User", back_populates="invitations")


class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    image_url = Column(String, nullable=False)
    source_name = Column(String, nullable=False)
    source_url = Column(String, unique=True, index=True, nullable=False)
    published_date = Column(DateTime, nullable=True, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_ai_generated = Column(Boolean, default=True, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    author = relationship("User", back_populates="posts")