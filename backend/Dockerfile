# backend/Dockerfile

# Use a specific, slim version of Python for reproducibility and smaller image size.
FROM python:3.11-slim

# Set the working directory inside the container.
WORKDIR /app

# Prevent Python from writing .pyc files to disk and from buffering stdout/stderr.
# This makes logging in containers behave as expected.
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies required by the application.
# - build-essential: Needed for compiling some Python packages with C extensions.
# - libpq-dev: Header files for PostgreSQL, required by psycopg.
# - postgresql-client: Provides command-line tools like pg_isready, which we use in the entrypoint script.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install Python dependencies from requirements.txt.
# Using --no-cache-dir reduces the image size.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application source code into the container.
COPY . .

# Copy the entrypoint script and make it executable.
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose the port that Uvicorn will run on.
# Railway will automatically detect this and map it.
EXPOSE 8000

# The command to run when the container starts.
# This executes our entrypoint script which handles migrations before starting the app.
CMD ["/app/entrypoint.sh"]