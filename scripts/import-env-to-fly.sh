#!/bin/bash

# Script to import .env file variables to Fly.io secrets
# Usage: ./scripts/import-env-to-fly.sh [env_file]

set -e

ENV_FILE=${1:-.env}

echo "🔧 Importing environment variables from $ENV_FILE to Fly.io..."

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file $ENV_FILE not found!"
    echo "Please create a .env file or specify a different file path."
    exit 1
fi

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

# Read .env file and set secrets
echo "📝 Reading environment variables from $ENV_FILE..."

# Counter for tracking
IMPORTED=0
SKIPPED=0

while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
        continue
    fi
    
    # Parse key=value pairs
    if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
        KEY="${BASH_REMATCH[1]}"
        VALUE="${BASH_REMATCH[2]}"
        
        # Remove quotes from value if present
        VALUE=$(echo "$VALUE" | sed 's/^["'\'']//;s/["'\'']$//')
        
        # Skip if key is empty
        if [[ -z "$KEY" ]]; then
            continue
        fi
        
        echo "🔑 Setting $KEY..."
        
        # Set the secret in Fly.io
        if fly secrets set "$KEY=$VALUE" &> /dev/null; then
            echo "✅ Successfully set $KEY"
            ((IMPORTED++))
        else
            echo "⚠️  Failed to set $KEY (might already exist)"
            ((SKIPPED++))
        fi
    fi
done < "$ENV_FILE"

echo ""
echo "🎉 Environment import completed!"
echo "📊 Summary:"
echo "   ✅ Imported: $IMPORTED variables"
echo "   ⚠️  Skipped: $SKIPPED variables"
echo ""
echo "💡 Note: If some variables were skipped, they might already exist in Fly.io."
echo "   You can check existing secrets with: fly secrets list"
echo ""
echo "🔍 To verify your secrets:"
echo "   fly secrets list" 