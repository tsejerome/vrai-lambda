# Troubleshooting Guide

## Common Issues and Solutions

### 1. Fly CLI Extension Error

**Error:**
```
panic: interface conversion: gql.AgreedToProviderTosViewerPrincipal is *gql.AgreedToProviderTosViewerMacaroon, not *gql.AgreedToProviderTosViewerUser
```

**Cause:** This is a known bug in the Fly CLI when trying to create extensions (like Tigris storage).

**Solution:**
1. **Use the deployment script without extensions:**
   ```bash
   ./scripts/deploy-without-extensions.sh
   ```

2. **Or deploy manually without mounts:**
   ```bash
   fly deploy --no-cache
   ```

3. **If you need persistent storage later:**
   - Deploy first without storage
   - Add storage manually through the Fly.io dashboard
   - Or use a different storage solution (S3, etc.)

### 2. Build Failures

**Error:** `npm run build` fails

**Solutions:**
1. **Check TypeScript errors:**
   ```bash
   npx tsc --noEmit
   ```

2. **Clear build cache:**
   ```bash
   rm -rf dist/
   npm run build
   ```

3. **Check dependencies:**
   ```bash
   npm ci
   npm run build
   ```

### 3. Environment Variables Not Set

**Error:** Application fails to start due to missing environment variables

**Solutions:**
1. **Import from .env file:**
   ```bash
   ./scripts/import-env-to-fly.sh
   ```

2. **Set manually:**
   ```bash
   fly secrets set VARIABLE_NAME=value
   ```

3. **Check current secrets:**
   ```bash
   fly secrets list
   ```

### 4. FFmpeg Not Found

**Error:** FFmpeg binary not found in container

**Solutions:**
1. **Check Dockerfile:** Ensure FFmpeg is installed
2. **Rebuild container:**
   ```bash
   fly deploy --no-cache
   ```

3. **Check FFmpeg installation:**
   ```bash
   fly ssh console
   which ffmpeg
   ffmpeg -version
   ```

### 5. Port Binding Issues

**Error:** Application fails to start or health checks fail

**Solutions:**
1. **Check port configuration:**
   - Ensure app listens on `0.0.0.0:8080`
   - Verify `fly.toml` internal_port is 8080

2. **Check health check endpoints:**
   ```bash
   curl https://your-app.fly.dev/
   curl https://your-app.fly.dev/apis/health
   ```

### 6. Memory Issues

**Error:** Application runs out of memory

**Solutions:**
1. **Increase memory in fly.toml:**
   ```toml
   [[vm]]
     memory_mb = 2048  # Increase from 1024
   ```

2. **Optimize application:**
   - Reduce concurrent requests
   - Optimize FFmpeg parameters
   - Add memory monitoring

### 7. Cold Start Issues

**Issue:** Slow response times on first request

**Solutions:**
1. **Keep at least one machine running:**
   ```toml
   [http_service]
     min_machines_running = 1
   ```

2. **Use health checks to keep warm:**
   - External monitoring service
   - Scheduled requests

### 8. Authentication Issues

**Error:** Firebase or other auth services failing

**Solutions:**
1. **Check service account keys:**
   - Verify Firebase private key format
   - Ensure all required fields are set

2. **Check network access:**
   - Verify external API access
   - Check firewall rules

## Debugging Commands

### View Logs
```bash
# Real-time logs
fly logs

# All logs
fly logs --all

# Follow logs
fly logs -f
```

### SSH into Container
```bash
# Access running container
fly ssh console

# Check environment
env | grep -i node
which ffmpeg
ps aux
```

### Check Application Status
```bash
# App status
fly status

# Machine status
fly machines list

# Health checks
fly health check
```

### Monitor Resources
```bash
# Resource usage
fly dashboard

# Metrics
fly metrics
```

## Getting Help

### Fly.io Resources
- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io Community](https://community.fly.io/)
- [Fly.io Status](https://status.fly.io/)

### Application-Specific Issues
- Check the application logs for specific error messages
- Verify all environment variables are set correctly
- Test locally before deploying

### CLI Issues
- Update Fly CLI: `brew upgrade flyctl` (macOS)
- Check Fly CLI version: `fly version`
- Try alternative deployment methods if CLI fails

## Prevention Tips

1. **Test locally first:** Always test your application locally before deploying
2. **Use staging environment:** Deploy to a staging environment first
3. **Monitor logs:** Set up proper logging and monitoring
4. **Backup configuration:** Keep backups of your `fly.toml` and environment variables
5. **Document changes:** Keep track of configuration changes and their effects 