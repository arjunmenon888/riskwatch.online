# filepath: backend/app/api/v1/api.py
from fastapi import APIRouter

# V-- CHECK THIS LINE CAREFULLY --V
from app.api.v1.endpoints import admins, users, posts, fetcher, trainings, news_sources, progress 

api_router = APIRouter()

# Include the router from the admins endpoints file
api_router.include_router(admins.router, prefix="/superadmin", tags=["superadmin"])

# Include the router for the news fetcher
api_router.include_router(fetcher.router, prefix="/superadmin", tags=["superadmin-fetcher"])

# NEW: Include the router for managing news sources
api_router.include_router(news_sources.router, prefix="/news-sources", tags=["news-sources"])

# Include the router from the users endpoints file
api_router.include_router(users.router, tags=["users"])

# Include the router for public post access
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])

# V-- AND CHECK THIS LINE CAREFULLY --V
# Include the router for the new training endpoints
api_router.include_router(trainings.router, prefix="/trainings", tags=["trainings"])

# --- ADD THIS LINE FOR THE NEW PROGRESS ENDPOINTS ---
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])