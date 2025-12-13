# SNS Automation - Video Generator Docker Image
FROM python:3.11-slim

# Install system dependencies including FFmpeg and fonts
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install additional packages for Cloud integration
RUN pip install --no-cache-dir \
    google-cloud-storage \
    flask \
    gunicorn

# Copy application code
COPY src/ ./src/
COPY config/ ./config/
COPY assets/ ./assets/

# Create output directory
RUN mkdir -p /app/output

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Expose port for Cloud Run
EXPOSE 8080

# Copy and set up the server
COPY cloud_run_server.py .

# Run the server
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--timeout", "600", "--workers", "1", "cloud_run_server:app"]
