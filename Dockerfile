# Dockerfile for Modal.com container image
FROM node:18-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    ffprobe \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY handlers/package.json ./
COPY package.json ./package-main.json

# Install Node.js dependencies
RUN npm install --production

# Copy application files
COPY handlers/ ./handlers/
COPY tsconfig.json ./

# Verify FFmpeg installation
RUN ffmpeg -version && ffprobe -version

# Set environment variables
ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

# Default command
CMD ["node", "handlers/health.js"]
