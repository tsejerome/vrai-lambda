#!/bin/bash

# Debug script for Docker build issues

set -e

echo "🐳 Debugging Docker build issues..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Test basic Node.js build
echo "🔍 Testing Node.js build in Docker..."
docker run --rm -v "$(pwd):/app" -w /app node:20-alpine sh -c "
    echo 'Installing dependencies...'
    npm ci
    echo 'TypeScript version:'
    npx tsc --version
    echo 'Building...'
    npx tsc
    echo 'Build output:'
    ls -la dist/
    echo 'Verifying app.js exists:'
    test -f dist/app.js && echo '✅ Build successful!' || echo '❌ Build failed!'
"

if [ $? -eq 0 ]; then
    echo "✅ Docker build test successful!"
else
    echo "❌ Docker build test failed!"
    exit 1
fi

echo ""
echo "🔧 If the above test passed, try building the full image:"
echo "   docker build -t vrai-lambda-test ."
echo ""
echo "🔍 To debug further, you can run:"
echo "   docker build -t vrai-lambda-test . --progress=plain --no-cache" 