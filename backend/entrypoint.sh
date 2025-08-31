#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Run Alembic migrations
echo "Applying database migrations..."
alembic upgrade head

# Run the database seeder (optional but recommended for first deploy)
echo "Seeding initial data..."
python seed.py

# Start the Uvicorn server
echo "Starting Uvicorn server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000