# filepath: backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
try:
    from app.auth.routes import router as auth_router
except Exception:
    auth_router = None 
from app.core.config import settings # <-- ADD THIS IMPORT

app = FastAPI(title="RiskWatch API")

# --- THIS IS THE CHANGE ---
# Use the configurable origins list from settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- END OF CHANGE ---

app.include_router(api_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

@app.get("/")
def read_root():
    return {"message": "Welcome to RiskWatch API"}