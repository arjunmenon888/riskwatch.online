# filepath: backend/app/db/base.py

# This file is used to ensure all SQLAlchemy models are registered
# with the metadata before Alembic or the application tries to use them.

# Import the Base object that all models inherit from
from app.models.user import Base  # Assuming your Base is here

# Import all the models to register them with SQLAlchemy's metadata
from app.models.user import User, Invitation, Post  # noqa
from app.models.news import NewsSource  # noqa
from app.models.training import Training, Module, Lesson, Attachment  # noqa
from app.models.progress import UserLessonCompletion # <-- ADD THIS LINE

# The 'noqa' comments are to prevent linters from complaining about unused imports.
# Their purpose is purely to be imported so SQLAlchemy's declarative system
# knows they exist.