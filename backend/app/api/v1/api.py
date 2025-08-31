from fastapi import APIRouter

from app.api.v1.endpoints import admins, users, posts, fetcher

api_router = APIRouter()

# Include the router from the admins endpoints file
api_router.include_router(admins.router, prefix="/superadmin", tags=["superadmin"])

# Include the router for the news fetcher
api_router.include_router(fetcher.router, prefix="/superadmin", tags=["superadmin-fetcher"])

# Include the router from the users endpoints file
api_router.include_router(users.router, tags=["users"])

# Include the router for public post access
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])