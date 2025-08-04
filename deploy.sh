#!/bin/bash

# Simple deployment script for Fly.io

set -e

echo "🚀 Deploying to Fly.io..."

# Check if Fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI is not installed. Please install it first:"
    echo "   brew install flyctl"
    exit 1
fi

# Check if user is logged in to Fly.io
if ! fly auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Please run: fly auth login"
    exit 1
fi

echo "✅ Fly CLI is installed and authenticated"

# Build the application
echo "📦 Building application..."
npm run build:prod

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the build errors and try again."
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Fly.io
echo "🚀 Deploying to Fly.io..."
fly deploy --no-cache

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi

echo "✅ Deployment completed successfully!"

# Show status
echo "📊 Checking deployment status..."
fly status

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "Your application is now running at: https://vrai-lambda.fly.dev/"
echo ""
echo "Monitor your application:"
echo "  fly logs"
echo "  fly status"
echo "  fly dashboard" 