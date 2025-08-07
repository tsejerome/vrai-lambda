#!/bin/bash

# Production build script for Fly.io deployment

set -e

echo "🏗️  Building for production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in the project root directory"
    exit 1
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Clean npm cache
echo "🗑️  Cleaning npm cache..."
npm cache clean --force

# Remove deprecated packages that might cause issues
echo "🔧 Removing deprecated packages..."
npm uninstall @types/minimatch 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Type check without emitting
echo "🔍 Type checking..."
npx tsc --noEmit

# Build the application
echo "🔨 Building application..."
npm run build

# Verify build output
echo "✅ Verifying build output..."
if [ ! -f "dist/app.js" ]; then
    echo "❌ Build failed: dist/app.js not found"
    exit 1
fi

echo "🎉 Production build completed successfully!"
echo "📁 Build output: dist/"
echo "📊 Build size: $(du -sh dist/ | cut -f1)" 