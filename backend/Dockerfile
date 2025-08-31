# backend/Dockerfile
FROM python:3.11-slim

# Set a root working directory
WORKDIR /

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the PYTHONPATH environment variable permanently in the image.
# This ensures that any python command run will find the 'app' package.
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create the app directory before copying files
RUN mkdir /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy the application code into the /app directory
COPY . /app/

# Make the entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Expose the port
EXPOSE 8000

# Set the command to run when the container starts
CMD ["/app/entrypoint.sh"]