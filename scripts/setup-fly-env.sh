#!/bin/bash

# Comprehensive Fly.io environment setup script
# Supports multiple environment files and interactive setup

set -e

echo "🚀 Fly.io Environment Setup"
echo "=========================="

# Check if Fly CLI is installed and authenticated
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI is not installed. Please install it first:"
    echo "   macOS: brew install flyctl"
    echo "   Linux: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

if ! fly auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Please run: fly auth login"
    exit 1
fi

echo "✅ Fly CLI is installed and authenticated"

# Function to import from file
import_from_file() {
    local file=$1
    echo "📁 Importing from $file..."
    ./scripts/import-env-to-fly.sh "$file"
}

# Function to set individual secrets
set_individual_secrets() {
    echo ""
    echo "🔧 Setting up individual secrets..."
    echo "Enter your secrets (press Enter to skip any):"
    echo ""
    
    # Common secrets for this app
    declare -a secrets=(
        "NODE_ENV=production"
        "openai_secret"
        "MONGODB_URI"
        "FIREBASE_PROJECT_ID"
        "FIREBASE_PRIVATE_KEY"
        "FIREBASE_CLIENT_EMAIL"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "AWS_REGION=us-east-2"
        "S3_BUCKET"
    )
    
    for secret in "${secrets[@]}"; do
        if [[ "$secret" == *"="* ]]; then
            # Already has a default value
            key="${secret%=*}"
            default_value="${secret#*=}"
            echo -n "Enter $key [$default_value]: "
            read -r value
            if [[ -z "$value" ]]; then
                value="$default_value"
            fi
        else
            # No default value
            echo -n "Enter $secret: "
            read -r value
        fi
        
        if [[ -n "$value" ]]; then
            echo "🔑 Setting $secret..."
            fly secrets set "$secret=$value" &> /dev/null
            echo "✅ Set $secret"
        else
            echo "⏭️  Skipping $secret"
        fi
    done
}

# Main menu
echo ""
echo "Choose an option:"
echo "1) Import from .env file"
echo "2) Import from .env.local file"
echo "3) Import from .env.production file"
echo "4) Set secrets individually (interactive)"
echo "5) List current secrets"
echo "6) Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        if [[ -f ".env" ]]; then
            import_from_file ".env"
        else
            echo "❌ .env file not found"
        fi
        ;;
    2)
        if [[ -f ".env.local" ]]; then
            import_from_file ".env.local"
        else
            echo "❌ .env.local file not found"
        fi
        ;;
    3)
        if [[ -f ".env.production" ]]; then
            import_from_file ".env.production"
        else
            echo "❌ .env.production file not found"
        fi
        ;;
    4)
        set_individual_secrets
        ;;
    5)
        echo "📋 Current Fly.io secrets:"
        fly secrets list
        ;;
    6)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Environment setup completed!"
echo ""
echo "Next steps:"
echo "1. Deploy your application: fly deploy"
echo "2. Check logs: fly logs"
echo "3. Monitor status: fly status" 