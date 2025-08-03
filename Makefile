# Vrai Lambda - Modal.com Makefile

.PHONY: help deploy install serve logs clean test build

# Default target
help:
	@echo "Available commands:"
	@echo "  make deploy    - Deploy to Modal.com"
	@echo "  make install   - Install Modal CLI"
	@echo "  make serve     - Start local development server"
	@echo "  make logs      - View Modal logs"
	@echo "  make clean     - Clean temporary files"
	@echo "  make test      - Run tests"
	@echo "  make build     - Build TypeScript"

# Deploy to Modal.com
deploy:
	@echo "🚀 Deploying to Modal.com..."
	@source venv/bin/activate && modal deploy modal_app.py
	@echo "✅ Deployment complete!"

# Install Modal CLI
install:
	@echo "📦 Installing Modal CLI..."
	@source venv/bin/activate && pip install modal
	@echo "✅ Modal CLI installed!"

# Start local development server
serve:
	@echo "🔧 Starting local development server..."
	@source venv/bin/activate && modal serve modal_app.py

# View Modal logs
logs:
	@echo "📋 Viewing Modal logs..."
	@source venv/bin/activate && modal app logs vrai-ffmpeg-processor

# Clean temporary files
clean:
	@echo "🧹 Cleaning temporary files..."
	rm -rf dist/
	rm -rf node_modules/
	rm -rf .serverless/
	@echo "✅ Clean complete!"

# Run tests
test:
	@echo "🧪 Running tests..."
	npm test

# Build TypeScript
build:
	@echo "🔨 Building TypeScript..."
	npm run build

# Quick git push (keeping your existing command)
p:
	git add . && git commit -m '.' && git push

# Convert local file to base64
base64:
	@echo "Usage: make base64 FILE=/path/to/your/file.caf"
	@if [ -z "$(FILE)" ]; then echo "Error: Please specify FILE parameter"; exit 1; fi
	@echo "Converting $(FILE) to base64..."
	@python3 convert_local_file.py "$(FILE)" 