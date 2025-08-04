#!/bin/bash

# Deploy to Fly.io without problematic extensions
# This script avoids the Tigris extension bug

set -e

echo "🚀 Deploying to Fly.io (without extensions)..."

# Check if Fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI is not installed. Please install it first:"
    echo "   macOS: brew install flyctl"
    echo "   Linux: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in to Fly.io
if ! fly auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Please run: fly auth login"
    exit 1
fi

echo "✅ Fly CLI is installed and authenticated"

# Check if app exists, if not create it
if ! fly apps list | grep -q "vrai-lambda"; then
    echo "📱 Creating new Fly.io app..."
    fly apps create vrai-lambda --org soul-kit
else
    echo "✅ App 'vrai-lambda' already exists"
fi

# Build the application
echo "📦 Building application..."
npm run build

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
echo "Next steps:"
echo "1. Set up your environment variables:"
echo "   ./scripts/setup-fly-env.sh"
echo ""
echo "2. Test your application:"
echo "   curl https://vrai-lambda.fly.dev/"
echo "   curl https://vrai-lambda.fly.dev/apis/health"
echo ""
echo "3. Monitor your application:"
echo "   fly logs"
echo "   fly status"
echo ""
echo "💡 Note: If you need persistent storage later, you can add it manually"
echo "   through the Fly.io dashboard or CLI after the initial deployment." 