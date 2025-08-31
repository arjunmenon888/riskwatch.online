#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# --- NEW: Wait for the database to be ready ---
# The DATABASE_URL will be in the format: postgresql://user:password@host:port/dbname
# We need to extract the host and port for pg_isready.
DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*@\(.*\):.*\/.*|\1|p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*:.*@.*:\(.*\)\/.*|\1|p')

echo "Waiting for database at $DB_HOST:$DB_PORT..."
# pg_isready will return 0 when the server is accepting connections
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; do
  sleep 2
done
echo "Database is ready!"
# --- END NEW ---

# Run Alembic migrations
echo "Applying database migrations..."
alembic upgrade head

# Run the database seeder (optional but recommended for first deploy)
echo "Seeding initial data..."
python seed.py

# Start the Uvicorn server
echo "Starting Uvicorn server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000