#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# --- THIS IS THE FIX ---
# Add the current directory to Python's module search path.
# This allows Alembic and other scripts to find the 'app' package.
export PYTHONPATH=.
# --- END FIX ---

# Wait for the database to be ready
DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*@\(.*\):.*\/.*|\1|p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*:.*@.*:\(.*\)\/.*|\1|p')

echo "Waiting for database at $DB_HOST:$DB_PORT..."
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; do
  sleep 2
done
echo "Database is ready!"

# Run Alembic migrations
echo "Applying database migrations..."
alembic upgrade head

# Run the database seeder
echo "Seeding initial data..."
python seed.py

# Start the Uvicorn server
echo "Starting Uvicorn server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000