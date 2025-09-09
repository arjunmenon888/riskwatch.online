# backend/Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

# system deps (for psycopg/asyncpg builds, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# install python deps
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# copy the backend code
COPY backend/ /app/backend/

# default port; Railway also sets $PORT
ENV PORT=8000

# run DB migrations, then start API
CMD alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT}
