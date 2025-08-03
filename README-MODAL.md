# Vrai Lambda Server - Modal.com Version

VoiceRecorder AI Lambda Server - FFmpeg processing service for audio and video processing, now running on Modal.com

A serverless backend with TypeScript, Modal.com, and Firebase for the Vrai (Voice Recorder AI) project.

## Modal.com Migration

This repository has been migrated from AWS Lambda to Modal.com while maintaining the same TypeScript functionality and API endpoints.

### Key Changes

- **Platform**: AWS Lambda → Modal.com
- **Architecture**: KOA server → Modal web endpoints with Node.js handlers
- **FFmpeg**: AWS Lambda layers → Container image with FFmpeg
- **Resources**: 1 CPU core + 1GB RAM (equivalent to original Lambda configuration)
- **Language**: TypeScript (maintained as requested)

### New File Structure

```
.
├── modal_app.py              # Main Modal application definition
├── handlers/                 # Node.js handlers for Modal execution
│   ├── health.js             # Health check endpoint
│   ├── trim-and-transcribe.js # Main audio processing endpoint
│   └── package.json          # Handler dependencies
├── Dockerfile                # Container image definition
├── modal.toml               # Modal configuration
├── MODAL_MIGRATION_GUIDE.md # Complete migration guide
└── README-MODAL.md          # This file
```

## Quick Start with Modal.com

### Prerequisites

1. **Modal.com account**: Register at [modal.com](https://modal.com)
2. **Python 3.8+**: For Modal CLI
3. **Node.js 18+**: For handlers

### Setup

1. **Install Modal CLI**:
   ```bash
   pip install modal
   modal setup
   ```

2. **Configure secrets** (see MODAL_MIGRATION_GUIDE.md for details):
   ```bash
   modal secret create firebase-config FIREBASE_SERVICE_ACCOUNT_KEY='...'
   modal secret create openai-config OPENAI_SECRET='...'
   modal secret create aws-config AWS_ACCESS_KEY_ID='...' AWS_ACCESS_PW='...'
   modal secret create database-config DATABASE_URL='...'
   ```

3. **Deploy to Modal**:
   ```bash
   npm run modal:deploy
   # or
   modal deploy modal_app.py
   ```

### API Endpoints

After deployment, you'll get Modal endpoints:

- **Health Check**: `https://your-app-id--health.modal.run`
- **Audio Processing**: `https://your-app-id--trim-and-transcribe.modal.run`

### Usage

The API remains the same as the original Lambda version:

```bash
# Health check
curl https://your-app-id--health.modal.run

# Audio processing
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

## Development

### Local Development

```bash
# Serve locally for development
npm run modal:serve
# or
modal serve modal_app.py
```

### Monitoring

```bash
# View logs
npm run modal:logs
# or
modal logs vrai-ffmpeg-processor
```

## Migration Guide

For complete migration instructions, see [MODAL_MIGRATION_GUIDE.md](./MODAL_MIGRATION_GUIDE.md).

## Tech Stack

### Modal.com Platform
- **Runtime**: Python 3.11 (for Modal app definition)
- **Handlers**: Node.js 18+ (for TypeScript/JavaScript execution)
- **Container**: Debian Slim with FFmpeg
- **Resources**: 1 CPU core, 1GB RAM, 15-minute timeout

### Dependencies (Maintained)
- **Audio Processing**: FFmpeg, FFprobe
- **Transcription**: OpenAI Whisper API
- **Authentication**: Firebase Admin SDK
- **Storage**: AWS S3 (for debugging files)
- **Database**: MongoDB/Firebase

### Key Features (Preserved)
- Audio trimming and format conversion
- OpenAI Whisper transcription
- Automatic summarization
- Firebase authentication
- S3 file uploads for debugging
- Error handling and logging

## Resource Configuration

The Modal deployment uses:
- **CPU**: 1.0 cores (as requested)
- **Memory**: 1024 MiB (1GB as requested)
- **Timeout**: 900 seconds (15 minutes)
- **Container**: Custom image with Node.js + FFmpeg

## Environment Variables

All environment variables have been migrated to Modal secrets:

| Original Variable | Modal Secret | Purpose |
|------------------|--------------|---------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | `firebase-config` | Firebase authentication |
| `openai_secret` | `openai-config` | OpenAI API access |
| `AWS_ACCESS_KEY_ID` | `aws-config` | S3 uploads |
| `AWS_ACCESS_PW` | `aws-config` | S3 uploads |
| `DATABASE_URL` | `database-config` | MongoDB connection |

## Deployment

### Production Deployment

```bash
modal deploy modal_app.py
```

### Staging Deployment

Create separate Modal apps for different environments by modifying the app name in `modal_app.py`.

## Monitoring and Logging

- **Modal Dashboard**: View function calls, performance metrics
- **Real-time Logs**: `modal logs vrai-ffmpeg-processor --follow`
- **Error Tracking**: Built into Modal platform

## Performance

Modal.com provides:
- **Automatic Scaling**: Functions scale based on demand
- **Cold Start Optimization**: Faster cold starts than traditional serverless
- **Resource Efficiency**: Pay only for actual compute time
- **Global Distribution**: Automatic global deployment

## Support

- **Migration Issues**: See [MODAL_MIGRATION_GUIDE.md](./MODAL_MIGRATION_GUIDE.md)
- **Modal Platform**: [docs.modal.com](https://docs.modal.com)
- **Original Codebase**: All original files preserved for reference

## License

Same as original project (ISC)

---

**Successfully migrated to Modal.com!** 🎉

The application now runs on Modal.com with the same TypeScript functionality, 1 CPU + 1GB RAM configuration, and all original features preserved.
