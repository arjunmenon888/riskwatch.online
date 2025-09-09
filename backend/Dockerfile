# backend/Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Build context is the backend/ folder on Railway
WORKDIR /app/backend

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Python deps (requirements.txt must be in backend/)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source into /app/backend
COPY . .

# Run Alembic migrations, then start FastAPI
# Now that we're in /app/backend, 'main:app' is importable and 'from app...' works
CMD alembic upgrade head && uvicorn app.main:app \
  --host 0.0.0.0 --port ${PORT} \
  --proxy-headers --forwarded-allow-ips='*'