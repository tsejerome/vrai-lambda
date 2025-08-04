#!/bin/bash

# VRAI Lambda to Fly.io Migration Script
# This script helps automate the migration process

set -e

echo "🚀 Starting VRAI Lambda to Fly.io migration..."

# Check if Fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI is not installed. Please install it first:"
    echo "   macOS: brew install flyctl"
    echo "   Linux: curl -L https://fly.io/install.sh | sh"
    echo "   Windows: powershell -Command \"iwr https://fly.io/install.ps1 -useb | iex\""
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
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the build errors and try again."
    exit 1
fi

echo "✅ Build completed successfully"

# Check if fly.toml exists
if [ ! -f "fly.toml" ]; then
    echo "❌ fly.toml not found. Please ensure the migration files are in place."
    exit 1
fi

# Deploy to Fly.io (avoiding extension issues)
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
echo "🎉 Migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Set up your environment variables:"
echo "   fly secrets set openai_secret=your_openai_api_key"
echo "   fly secrets set MONGODB_URI=your_mongodb_connection_string"
echo "   # ... (see FLY_DEPLOYMENT.md for all required variables)"
echo ""
echo "2. Test your application:"
echo "   fly logs"
echo "   curl https://your-app-name.fly.dev/"
echo ""
echo "3. Monitor your application:"
echo "   fly dashboard"
echo ""
echo "For more information, see FLY_DEPLOYMENT.md" 