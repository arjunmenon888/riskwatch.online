# backend/Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Railway builds with root = backend/, so backend files are the build context
WORKDIR /app

# System deps (for psycopg/asyncpg, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
# Make sure requirements.txt is in backend/ (same folder as this Dockerfile)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend source
COPY . .

# Run Alembic migrations, then start FastAPI
CMD alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT}
