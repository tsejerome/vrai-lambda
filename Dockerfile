# Use Node.js 20 Alpine as base image for Fly.io deployment
FROM node:20-alpine

# Install system dependencies including FFmpeg
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-dev \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Clean up any deprecated type packages that might cause issues
RUN npm uninstall @types/minimatch 2>/dev/null || true

# Verify TypeScript is available
RUN npx tsc --version

# Copy source code
COPY . .

# Build the application with explicit TypeScript compilation
RUN npx tsc --project tsconfig.json

# Verify build output exists
RUN ls -la dist/ && test -f dist/app.js

# Remove dev dependencies to keep production image lean
RUN npm prune --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Set environment variables for FFmpeg paths
ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

# Verify FFmpeg installation
RUN ffmpeg -version && ffprobe -version

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start the application
CMD ["npm", "start"]
