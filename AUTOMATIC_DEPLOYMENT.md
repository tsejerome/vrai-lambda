# Automatic Deployment Setup

## Overview

By default, Fly.io does **not** automatically deploy when you push to main. You need to manually trigger deployments or set up CI/CD. Here are your options:

## Option 1: GitHub Actions (Recommended)

### Setup Steps

1. **Create Fly.io API Token:**
   ```bash
   fly auth token
   ```
   Copy the token that's displayed.

2. **Add Token to GitHub Secrets:**
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `FLY_API_TOKEN`
   - Value: Paste your Fly.io API token

3. **The GitHub Actions workflow is already created:**
   - File: `.github/workflows/fly-deploy.yml`
   - Triggers on push to `main` branch
   - Automatically builds and deploys

### How It Works

```yaml
on:
  push:
    branches: [ main ]  # Deploy on push to main
  pull_request:
    branches: [ main ]  # Build on PRs (for testing)
```

### Benefits

- ✅ **Automatic**: Deploys on every push to main
- ✅ **Secure**: Uses API tokens, not CLI credentials
- ✅ **Reliable**: Runs in GitHub's infrastructure
- ✅ **Visible**: See deployment status in GitHub

## Option 2: Manual Deployment

### Commands

```bash
# Deploy manually
fly deploy

# Deploy with no cache (force rebuild)
fly deploy --no-cache

# Deploy from local machine
fly deploy --local-only
```

### When to Use

- Testing changes before pushing to main
- Hotfixes that need immediate deployment
- Debugging deployment issues

## Option 3: Fly.io CLI Watch Mode

### Setup

```bash
# Watch for changes and auto-deploy
fly deploy --watch

# Or use the development script
npm run dev:fly
```

### Add to package.json

```json
{
  "scripts": {
    "dev:fly": "fly deploy --watch"
  }
}
```

## Option 4: Git Hooks

### Pre-push Hook

Create `.git/hooks/pre-push`:

```bash
#!/bin/bash
echo "Deploying to Fly.io..."
fly deploy --remote-only
```

Make it executable:
```bash
chmod +x .git/hooks/pre-push
```

## Deployment Strategies

### 1. Direct Deployment (Current)
- Deploy immediately on push
- Good for small teams
- Fast feedback loop

### 2. Staging + Production
```yaml
# Deploy to staging on PR
on:
  pull_request:
    branches: [ main ]

# Deploy to production on merge
on:
  push:
    branches: [ main ]
```

### 3. Manual Approval
- Use GitHub's "Required reviews" feature
- Deploy only after code review
- More control over deployments

## Environment Variables in CI/CD

### GitHub Actions Secrets

Set these in your GitHub repository:

```bash
FLY_API_TOKEN=your_fly_api_token
NODE_ENV=production
```

### Fly.io Secrets

Environment variables are managed separately:

```bash
# Set secrets in Fly.io (not in GitHub)
fly secrets set openai_secret=your_key
fly secrets set MONGODB_URI=your_uri
```

## Monitoring Deployments

### GitHub Actions
- View deployment status in Actions tab
- See build logs and deployment progress
- Get notifications on failure

### Fly.io Dashboard
```bash
# Check deployment status
fly status

# View deployment logs
fly logs

# Monitor resources
fly dashboard
```

## Rollback Strategy

### Quick Rollback
```bash
# Rollback to previous deployment
fly deploy --image-label v1

# Or destroy and redeploy
fly destroy
fly deploy
```

### Blue-Green Deployment
- Deploy to new instance
- Test new deployment
- Switch traffic
- Remove old instance

## Best Practices

### 1. Testing
- Run tests before deployment
- Use staging environment for testing
- Test locally before pushing

### 2. Security
- Use API tokens, not CLI credentials
- Rotate tokens regularly
- Limit token permissions

### 3. Monitoring
- Set up health checks
- Monitor application logs
- Set up alerts for failures

### 4. Documentation
- Document deployment process
- Keep deployment scripts updated
- Document rollback procedures

## Troubleshooting

### Common Issues

1. **API Token Issues:**
   ```bash
   # Regenerate token
   fly auth token
   ```

2. **Build Failures:**
   - Check GitHub Actions logs
   - Verify build locally first
   - Check dependency issues

3. **Deployment Failures:**
   ```bash
   # Check deployment status
   fly status
   
   # View logs
   fly logs
   ```

### Debug Commands

```bash
# Check app status
fly status

# View recent logs
fly logs

# SSH into container
fly ssh console

# Check configuration
fly config show
```

## Next Steps

1. **Set up GitHub Actions:**
   - Add `FLY_API_TOKEN` to GitHub secrets
   - Push to main to trigger first deployment

2. **Monitor first deployment:**
   - Check GitHub Actions tab
   - Verify deployment in Fly.io dashboard

3. **Set up monitoring:**
   - Configure health checks
   - Set up logging
   - Test rollback procedures

4. **Optimize workflow:**
   - Add testing steps
   - Configure notifications
   - Set up staging environment 