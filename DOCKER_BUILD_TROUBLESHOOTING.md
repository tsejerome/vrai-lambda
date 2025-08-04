# Docker Build Troubleshooting Guide

## Common Docker Build Issues in Fly.io

### Issue: `npm run build` fails in Docker

**Error:**
```
Error: failed to fetch an image or build from source: error building: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
```

## Root Causes and Solutions

### 1. **TypeScript Compilation Issues**

**Problem:** TypeScript compilation fails in Docker environment

**Solution:** Use explicit TypeScript compilation
```dockerfile
# Instead of: RUN npm run build
RUN npx tsc
```

### 2. **Missing Dev Dependencies**

**Problem:** Production-only install but build requires dev dependencies

**Solution:** Install all dependencies for build, then prune
```dockerfile
# Install all dependencies for build
RUN npm ci

# Build the application
RUN npx tsc

# Remove dev dependencies after build
RUN npm prune --production
```

### 3. **Deprecated Type Packages**

**Problem:** Conflicting or deprecated TypeScript type packages

**Solution:** Remove deprecated packages
```dockerfile
RUN npm uninstall @types/minimatch 2>/dev/null || true
```

### 4. **File Permissions**

**Problem:** Permission issues in Docker container

**Solution:** Set proper ownership
```dockerfile
RUN chown -R nodejs:nodejs /app
USER nodejs
```

## Debugging Steps

### Step 1: Test Local Build
```bash
# Test build locally first
npm run build
npx tsc
```

### Step 2: Test Docker Build Locally
```bash
# Build Docker image locally
docker build -t vrai-lambda-test . --no-cache

# Or use the debug script
./scripts/debug-docker-build.sh
```

### Step 3: Check Build Logs
```bash
# View detailed build logs
docker build -t vrai-lambda-test . --progress=plain --no-cache
```

### Step 4: Interactive Debugging
```bash
# Run container interactively
docker run -it --rm -v "$(pwd):/app" -w /app node:20-alpine sh

# Inside container:
npm ci
npx tsc --version
npx tsc
ls -la dist/
```

## Current Fixed Dockerfile

```dockerfile
# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Install system dependencies including FFmpeg
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Clean up any deprecated type packages that might cause issues
RUN npm uninstall @types/minimatch 2>/dev/null || true

# Verify TypeScript is available and show environment info
RUN npx tsc --version && \
    echo "Node version: $(node --version)" && \
    echo "NPM version: $(npm --version)" && \
    echo "Working directory: $(pwd)" && \
    ls -la

# Copy source code
COPY . .

# Build the application with explicit TypeScript compilation
RUN npx tsc

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

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start the application
CMD ["npm", "start"]
```

## GitHub Actions Workaround

If Docker builds continue to fail, you can use a multi-stage build approach:

```yaml
# In .github/workflows/fly-deploy.yml
- name: Build application
  run: |
    # Build locally and copy to container
    rm -rf dist/
    npm ci
    npm uninstall @types/minimatch 2>/dev/null || true
    npx tsc
    ls -la dist/
    test -f dist/app.js
```

## Common Error Messages and Solutions

### "Cannot find type definition file"
**Solution:** Remove deprecated type packages
```bash
npm uninstall @types/minimatch
```

### "npm run build did not complete successfully"
**Solution:** Use explicit TypeScript compilation
```bash
npx tsc
```

### "Permission denied"
**Solution:** Fix file permissions in Dockerfile
```dockerfile
RUN chown -R nodejs:nodejs /app
USER nodejs
```

### "Module not found"
**Solution:** Ensure all dependencies are installed
```dockerfile
RUN npm ci  # Install all dependencies
```

## Prevention Tips

1. **Test locally first:** Always test builds locally before deploying
2. **Use explicit commands:** Use `npx tsc` instead of `npm run build`
3. **Clean dependencies:** Remove deprecated packages regularly
4. **Verify output:** Always verify build output exists
5. **Use debug scripts:** Use the provided debug scripts for troubleshooting

## Quick Fix Commands

```bash
# Fix build issues locally
./scripts/build-for-production.sh

# Debug Docker build
./scripts/debug-docker-build.sh

# Deploy with fixes
./deploy.sh
``` 