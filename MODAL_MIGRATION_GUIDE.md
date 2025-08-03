# Modal.com Migration Guide for vrai-lambda

This guide provides step-by-step instructions for migrating the vrai-lambda TypeScript serverless application from AWS Lambda to Modal.com.

## Prerequisites

Before starting the migration, ensure you have:

1. **Modal.com Account**: Register at [modal.com](https://modal.com)
2. **Python 3.8+**: Required for Modal CLI
3. **Node.js 18+**: For local development and testing
4. **Git**: For version control
5. **Access to Original Environment Variables**: From your AWS Lambda deployment

## Step 1: Modal.com Account Setup

### 1.1 Register Account
1. Go to [modal.com](https://modal.com)
2. Click "Sign Up" and create your account
3. Verify your email address
4. Complete the onboarding process

### 1.2 Install Modal CLI
```bash
# Install Modal Python package
pip install modal

# Authenticate with Modal
modal setup
```

### 1.3 Create API Token
1. Go to Modal dashboard → Settings → API Tokens
2. Create a new token with appropriate permissions
3. Save the token securely (you'll need it for CI/CD)

## Step 2: Environment Variables Migration

### 2.1 Create Modal Secrets

You need to migrate the following environment variables from your AWS Lambda to Modal secrets:

#### Firebase Configuration
```bash
modal secret create firebase-config \
  FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'
```

#### OpenAI Configuration
```bash
modal secret create openai-config \
  OPENAI_SECRET='sk-your-openai-api-key-here' \
  openai_secret='sk-your-openai-api-key-here'
```

#### AWS Configuration (for S3 uploads)
```bash
modal secret create aws-config \
  AWS_ACCESS_KEY_ID='your-aws-access-key-id' \
  AWS_ACCESS_PW='your-aws-secret-access-key' \
  S3_BUCKET_NAME='vrai'
```

#### Database Configuration
```bash
modal secret create database-config \
  DATABASE_URL='mongodb+srv://username:password@your-cluster.mongodb.net/your-database?retryWrites=true&w=majority'
```

### 2.2 Environment Variables Reference

| Original Variable | Modal Secret | Description |
|------------------|--------------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `firebase-config` | Firebase service account JSON |
| `openai_secret` | `openai-config` | OpenAI API key |
| `AWS_ACCESS_KEY_ID` | `aws-config` | AWS access key for S3 |
| `AWS_ACCESS_PW` | `aws-config` | AWS secret key for S3 |
| `s3bucket_name` | `aws-config` | S3 bucket name |
| `DATABASE_URL` | `database-config` | MongoDB connection string |

## Step 3: Deploy to Modal.com

### 3.1 Install Dependencies
```bash
# Navigate to the project directory
cd /path/to/vrai-lambda

# Install Node.js dependencies for handlers
cd handlers
npm install
cd ..
```

### 3.2 Deploy the Application
```bash
# Deploy to Modal
modal deploy modal_app.py

# Or for development/testing
modal serve modal_app.py
```

### 3.3 Get Deployment URLs
After deployment, Modal will provide you with:
- Health check endpoint: `https://your-app-id--health.modal.run`
- Main processing endpoint: `https://your-app-id--trim-and-transcribe.modal.run`

## Step 4: Testing the Migration

### 4.1 Health Check Test
```bash
curl https://your-app-id--health.modal.run
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-08-03T18:23:58.000Z",
  "service": "vrai-ffmpeg-modal",
  "environment": "production",
  "ffmpegPath": "/usr/bin/ffmpeg",
  "ffprobePath": "/usr/bin/ffprobe",
  "platform": "modal.com",
  "nodeVersion": "v18.x.x",
  "region": "modal-cloud",
  "ffmpegAvailable": true,
  "ffprobeAvailable": true
}
```

### 4.2 Audio Processing Test

#### Using curl:
```bash
curl -X POST https://your-app-id--trim-and-transcribe.modal.run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-firebase-jwt-token" \
  -d '{
    "fileBlob": "base64-encoded-audio-file",
    "summarizationType": "simple-cleanup",
    "fromTime": 0,
    "toTime": 30
  }'
```

#### Using the test script:
```bash
# Set your Modal app URL
export MODAL_BASE_URL=https://your-app-id.modal.run

# Optional: Set Firebase test token
export FIREBASE_TEST_TOKEN=your-firebase-jwt-token

# Run the test
python test_modal_deployment.py
```

## Step 5: Update Client Applications

### 5.1 Update API Endpoints
Replace your AWS Lambda URLs with the new Modal endpoints in your client applications:

**Before (AWS Lambda):**
```
https://your-lambda-url.amazonaws.com/apis/health
https://your-lambda-url.amazonaws.com/apis/trim-and-transcribe
```

**After (Modal.com):**
```
https://your-app-id--health.modal.run
https://your-app-id--trim-and-transcribe.modal.run
```

### 5.2 Update CORS Configuration
If needed, update CORS settings in your client applications to allow requests to the new Modal endpoints.

## Step 6: Monitoring and Logging

### 6.1 Modal Dashboard
1. Go to Modal dashboard
2. Navigate to your app
3. Monitor function calls, logs, and performance metrics

### 6.2 Log Access
```bash
# View recent logs
modal logs your-app-name

# Follow logs in real-time
modal logs your-app-name --follow
```

## Step 7: Production Deployment

### 7.1 Environment-Specific Deployments
For production deployments, consider:

1. **Separate Modal Apps**: Create separate apps for staging and production
2. **Environment Variables**: Use different secret configurations for each environment
3. **Resource Scaling**: Adjust CPU/memory based on production load

### 7.2 CI/CD Integration
Add Modal deployment to your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Deploy to Modal
  run: |
    pip install modal
    modal deploy modal_app.py
  env:
    MODAL_TOKEN_ID: ${{ secrets.MODAL_TOKEN_ID }}
    MODAL_TOKEN_SECRET: ${{ secrets.MODAL_TOKEN_SECRET }}
```

## Step 8: Performance Optimization

### 8.1 Resource Configuration
The current configuration uses:
- **CPU**: 1.0 cores
- **Memory**: 1024 MiB (1GB)
- **Timeout**: 900 seconds (15 minutes)

Adjust these in `modal_app.py` based on your needs:

```python
@app.function(
    cpu=1.0,        # Adjust CPU cores
    memory=1024,    # Adjust memory in MiB
    timeout=900     # Adjust timeout in seconds
)
```

### 8.2 Cold Start Optimization
Modal automatically handles cold starts, but you can optimize by:
- Keeping functions warm with regular health checks
- Using Modal's built-in warming features
- Optimizing container image size

## Step 9: Cost Optimization

### 9.1 Monitor Usage
1. Check Modal dashboard for usage metrics
2. Monitor function execution times
3. Review resource utilization

### 9.2 Optimize Costs
- Adjust resource allocation based on actual usage
- Use Modal's automatic scaling features
- Consider function timeout optimization

## Troubleshooting

### Common Issues

#### 1. FFmpeg Not Found
**Error**: `FFmpeg binary not found`
**Solution**: Verify the container image includes FFmpeg installation

#### 2. Environment Variables Missing
**Error**: `Environment variable not found`
**Solution**: Ensure all secrets are properly created and referenced

#### 3. File Upload Issues
**Error**: `Failed to process file`
**Solution**: Check file size limits and encoding format

#### 4. Timeout Issues
**Error**: `Function timeout`
**Solution**: Increase timeout value or optimize processing

### Getting Help

1. **Modal Documentation**: [docs.modal.com](https://docs.modal.com)
2. **Modal Discord**: Join the Modal community Discord
3. **GitHub Issues**: Create issues in the vrai-lambda repository
4. **Modal Support**: Contact Modal support for platform-specific issues

## Migration Checklist

- [ ] Modal.com account created and verified
- [ ] Modal CLI installed and authenticated
- [ ] All environment variables migrated to Modal secrets
- [ ] Application deployed to Modal
- [ ] Health check endpoint tested
- [ ] Audio processing endpoint tested
- [ ] Client applications updated with new endpoints
- [ ] Monitoring and logging configured
- [ ] Production deployment completed
- [ ] Performance optimization reviewed
- [ ] Cost monitoring set up

## Rollback Plan

If you need to rollback to AWS Lambda:

1. Keep your original AWS Lambda deployment running during the migration
2. Update client applications to point back to AWS Lambda URLs
3. Verify all functionality works as expected
4. Decommission Modal deployment if needed

## Next Steps

After successful migration:

1. **Monitor Performance**: Compare performance metrics between AWS Lambda and Modal
2. **Optimize Resources**: Fine-tune CPU/memory allocation based on usage patterns
3. **Scale Testing**: Test with production-level traffic
4. **Documentation**: Update internal documentation with new endpoints
5. **Team Training**: Train team members on Modal.com platform

## Support

For migration support or questions:
- Create an issue in the GitHub repository
- Contact the development team
- Refer to Modal.com documentation and community resources

---

**Migration completed successfully!** 🎉

Your vrai-lambda application is now running on Modal.com with the same TypeScript functionality and 1 CPU + 1GB RAM configuration.
