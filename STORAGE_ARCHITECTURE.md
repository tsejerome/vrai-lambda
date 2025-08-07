# Storage Architecture: Temporary Storage Design

## Overview

The VRAI Lambda application is designed to use **temporary storage only**, which is perfect for Fly.io deployment. This architecture provides optimal performance, cost efficiency, and simplicity.

## How Temporary Storage Works

### 1. File Processing Flow

```
1. Audio File Upload → /tmp/input-{timestamp}-{id}.caf
2. FFmpeg Processing → /tmp/trimmed-{timestamp}-{id}.mp3  
3. OpenAI Transcription → Text Response
4. Cleanup → Temporary files deleted
```

### 2. Storage Locations

- **Input Files**: `/tmp/input-{timestamp}-{uniqueId}.caf`
- **Output Files**: `/tmp/trimmed-{timestamp}-{uniqueId}.mp3`
- **Debug Files**: Uploaded to S3 for debugging purposes

### 3. Automatic Cleanup

```typescript
// Files are automatically cleaned up after each request
finally {
  try {
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  } catch (err) {
    console.error('Error cleaning up temporary files:', err);
  }
}
```

## Benefits of Temporary Storage

### ✅ Performance
- **Fast I/O**: `/tmp` is memory-backed storage
- **No Network Latency**: Local file operations
- **No Cold Starts**: No external storage dependencies

### ✅ Cost Efficiency
- **No Storage Costs**: No persistent storage fees
- **Pay-per-Request**: Only pay for compute time
- **Scales to Zero**: No idle storage costs

### ✅ Simplicity
- **No Configuration**: Works out of the box
- **No Maintenance**: No storage management needed
- **No Backup**: No data persistence concerns

### ✅ Security
- **Isolated**: Each request gets fresh storage
- **Auto-Cleanup**: No data leakage between requests
- **No Shared State**: Complete request isolation

## Debug Storage Strategy

### S3 for Debugging
- **Input Files**: Uploaded to S3 for debugging
- **Output Files**: Uploaded to S3 for debugging  
- **Error Files**: Uploaded to S3 when errors occur
- **Retention**: Debug files can be managed separately

### Debug File Naming
```
debug-input-{timestamp}-{requestId}.caf
debug-output-{timestamp}-{requestId}.mp3
error-input-{timestamp}-{errorType}.caf
error-output-{timestamp}-{errorType}.mp3
```

## Fly.io Optimization

### Container Configuration
```toml
# No persistent mounts needed
# /tmp is automatically available in containers
# Files are cleaned up when container stops
```

### Memory Management
```toml
[[vm]]
  memory_mb = 1024  # Sufficient for audio processing
  # /tmp uses available memory efficiently
```

### Scaling Benefits
- **Horizontal Scaling**: Each instance has independent storage
- **Load Distribution**: No storage bottlenecks
- **Auto-Recovery**: Failed instances don't affect others

## File Size Considerations

### Typical File Sizes
- **Input Audio**: 1-50 MB (CAF, MP3, M4A, WAV)
- **Output Audio**: 0.5-10 MB (MP3, 16kHz, mono)
- **Memory Usage**: Peak ~100MB per request

### Memory Limits
- **Container Memory**: 1GB allocated
- **Temporary Storage**: Uses available memory
- **FFmpeg Buffer**: 10MB max buffer configured

## Error Handling

### Storage Errors
- **Disk Full**: Graceful error handling
- **Permission Issues**: Automatic fallback
- **Cleanup Failures**: Logged but don't break requests

### Debug Information
- **File URLs**: S3 URLs included in error responses
- **Error Types**: Categorized error handling
- **User Context**: User ID included in debug files

## Monitoring and Logging

### Storage Metrics
- **File Sizes**: Logged for monitoring
- **Processing Times**: Tracked for optimization
- **Cleanup Success**: Monitored for issues

### Debug Information
```typescript
console.log('File processing details:', {
  inputSize: fs.statSync(inputPath).size,
  outputSize: fs.statSync(outputPath).size,
  processingTime: Date.now() - startTime,
  userId: ctx.state.user?.auth?.uid
});
```

## Best Practices

### 1. File Naming
- Use unique timestamps and IDs
- Include user context for debugging
- Categorize by file type and purpose

### 2. Cleanup
- Always clean up in finally blocks
- Handle cleanup errors gracefully
- Log cleanup failures for monitoring

### 3. Error Handling
- Upload debug files on errors
- Include file URLs in error responses
- Preserve user context in debug files

### 4. Performance
- Use appropriate buffer sizes
- Monitor memory usage
- Optimize FFmpeg parameters

## Conclusion

The temporary storage architecture is **perfect for this application** because:

1. **Audio processing is stateless** - No need for persistent storage
2. **Debug files go to S3** - Separate storage for debugging
3. **Fly.io optimizes /tmp** - Fast, reliable temporary storage
4. **Cost efficient** - No persistent storage costs
5. **Simple deployment** - No storage configuration needed

This design provides the best performance, cost efficiency, and simplicity for the VRAI Lambda application. 