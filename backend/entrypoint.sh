#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# --- THIS IS THE FIX ---
# Change directory to the app's root where alembic.ini is located.
cd /app
# The PYTHONPATH is now set in the Dockerfile, so we don't need it here.
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