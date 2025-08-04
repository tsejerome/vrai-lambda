#!/bin/bash

# Test script for Fly.io migration
# This script tests the migrated application

set -e

echo "🧪 Testing Fly.io migration..."

# Get the app name from fly.toml
APP_NAME=$(grep '^app = ' fly.toml | cut -d'"' -f2)

if [ -z "$APP_NAME" ]; then
    echo "❌ Could not find app name in fly.toml"
    exit 1
fi

echo "📱 Testing app: $APP_NAME"

# Test root health check
echo "🔍 Testing root health check..."
ROOT_RESPONSE=$(curl -s "https://$APP_NAME.fly.dev/")
if echo "$ROOT_RESPONSE" | grep -q "status.*ok"; then
    echo "✅ Root health check passed"
else
    echo "❌ Root health check failed"
    echo "Response: $ROOT_RESPONSE"
    exit 1
fi

# Test API health check
echo "🔍 Testing API health check..."
API_RESPONSE=$(curl -s "https://$APP_NAME.fly.dev/apis/health")
if echo "$API_RESPONSE" | grep -q "status.*ok"; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed"
    echo "Response: $API_RESPONSE"
    exit 1
fi

# Check if FFmpeg is available
if echo "$API_RESPONSE" | grep -q "ffmpegPath"; then
    echo "✅ FFmpeg configuration detected"
else
    echo "⚠️  FFmpeg configuration not found in health check"
fi

# Test application status
echo "📊 Checking application status..."
fly status

# Show recent logs
echo "📝 Recent logs:"
fly logs --all | head -20

echo ""
echo "🎉 All tests passed! Your migration was successful!"
echo ""
echo "Your application is now running at: https://$APP_NAME.fly.dev/"
echo ""
echo "You can monitor it using:"
echo "  fly logs"
echo "  fly status"
echo "  fly dashboard" 