# Fly.io Migration Guide

This guide will help you migrate your VRAI Lambda application from AWS Lambda to Fly.io.

## Prerequisites

1. Install the Fly CLI:
   ```bash
   # macOS
   brew install flyctl
   
   # Linux
   curl -L https://fly.io/install.sh | sh
   
   # Windows
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. Sign up for a Fly.io account at https://fly.io

3. Login to Fly.io:
   ```bash
   fly auth login
   ```

## Environment Variables

You have several options to set up your environment variables in Fly.io:

### Option 1: Import from .env file (Recommended)

If you have a `.env` file, you can import it directly:

```bash
# Import all variables from .env file
./scripts/import-env-to-fly.sh

# Or specify a different file
./scripts/import-env-to-fly.sh .env.production
```

### Option 2: Interactive Setup

Use the interactive setup script:

```bash
./scripts/setup-fly-env.sh
```

This will give you options to:
- Import from different .env files
- Set secrets individually
- List current secrets

### Option 3: Manual Setup

Set up your environment variables manually:

```bash
# Set environment variables
fly secrets set NODE_ENV=production
fly secrets set openai_secret=your_openai_api_key
fly secrets set MONGODB_URI=your_mongodb_connection_string
fly secrets set FIREBASE_PROJECT_ID=your_firebase_project_id
fly secrets set FIREBASE_PRIVATE_KEY=your_firebase_private_key
fly secrets set FIREBASE_CLIENT_EMAIL=your_firebase_client_email
fly secrets set AWS_ACCESS_KEY_ID=your_aws_access_key
fly secrets set AWS_SECRET_ACCESS_KEY=your_aws_secret_key
fly secrets set AWS_REGION=us-east-2
fly secrets set S3_BUCKET=your_s3_bucket_name
```

### Verify Your Secrets

Check that all secrets are set correctly:

```bash
fly secrets list
```

## Deployment Steps

1. **Build the application locally:**
   ```bash
   npm run build
   ```

2. **Deploy to Fly.io:**
   ```bash
   fly deploy
   ```

3. **Check deployment status:**
   ```bash
   fly status
   ```

4. **View logs:**
   ```bash
   fly logs
   ```

## Key Changes Made

### 1. Application Entry Point
- Removed `serverless-http` wrapper
- Added direct Koa server startup with port configuration
- Added graceful shutdown handlers

### 2. FFmpeg Configuration
- Changed from Lambda layers to system-installed FFmpeg
- Updated paths to use system binaries (`ffmpeg` and `ffprobe`)
- FFmpeg is installed via Alpine package manager in Docker

### 3. Storage Architecture
- **Temporary Storage Only**: Uses `/tmp` for file processing
- **S3 for Debugging**: Debug files uploaded to S3
- **Automatic Cleanup**: Files cleaned up after each request
- **No Persistent Storage**: Optimized for stateless processing

### 4. Environment Configuration
- Removed serverless-specific environment handling
- Added Fly.io environment variable support
- Updated health check endpoints

### 5. Build and Deployment
- Added Dockerfile for containerization
- Created `fly.toml` configuration
- Updated package.json scripts for Fly.io deployment

## Health Checks

The application provides two health check endpoints:

- **Root health check:** `GET /`
- **API health check:** `GET /apis/health`

These are automatically monitored by Fly.io for application health.

## Scaling

Fly.io supports automatic scaling based on traffic. The current configuration:

- **Auto-scaling:** Enabled
- **Minimum machines:** 0 (scales to zero when not in use)
- **Memory:** 1GB
- **CPU:** 1 shared CPU

## Monitoring

Monitor your application using:

```bash
# View real-time logs
fly logs

# Check application status
fly status

# View metrics
fly dashboard
```

## Troubleshooting

### Common Issues

1. **FFmpeg not found:**
   - Ensure FFmpeg is properly installed in the Docker container
   - Check the Dockerfile includes FFmpeg installation

2. **Environment variables not set:**
   - Use `fly secrets list` to verify all secrets are set
   - Check application logs for missing environment variables

3. **Port binding issues:**
   - Ensure the application listens on `0.0.0.0:8080`
   - Check `fly.toml` internal_port configuration

### Debug Commands

```bash
# SSH into the running container
fly ssh console

# View detailed logs
fly logs --all

# Check application configuration
fly config show
```

## Cost Optimization

Fly.io pricing is based on:
- **Compute time:** Only pay when your app is running
- **Memory usage:** 1GB allocated
- **Bandwidth:** Included in base plan

The current configuration will scale to zero when not in use, minimizing costs.

## Migration Checklist

- [ ] Install Fly CLI
- [ ] Set up Fly.io account
- [ ] Configure environment variables
- [ ] Test local build
- [ ] Deploy to Fly.io
- [ ] Verify health checks
- [ ] Test API endpoints
- [ ] Monitor logs and performance
- [ ] Update DNS/domain configuration (if applicable)
- [ ] Decommission AWS Lambda resources

## Support

For Fly.io specific issues:
- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io Community](https://community.fly.io/)
- [Fly.io Status](https://status.fly.io/) 