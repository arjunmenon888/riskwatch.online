from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1.api import api_router
from app.auth.routes import router as auth_router
import os

# Ensure the static directory exists
os.makedirs("static/images/posts", exist_ok=True)

app = FastAPI(title="RiskWatch API")

# Serve static files (uploaded images)
app.mount("/static", StaticFiles(directory="static"), name="static")


# Set up CORS
origins = [
    "http://localhost:5173", # Vite dev server
    "https://your-firebase-project-id.web.app", # Firebase hosting URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])

@app.get("/")
def read_root():
    return {"message": "Welcome to RiskWatch API"}