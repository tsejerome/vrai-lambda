# Sample Curl Requests and Responses

## Endpoint
`POST /ffmpeg/trim-and-transcribe`

## Sample Curl Request - Simple Cleanup Summarization

```bash
curl -X POST https://your-lambda-url.amazonaws.com/ffmpeg/trim-and-transcribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-firebase-jwt-token" \
  -d '{
    "fileBlob": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
    "summarizationType": "simple-cleanup",
    "fromTime": 0,
    "toTime": 30
  }'
```

## Sample Success Response

```json
{
  "success": true,
  "transcription": "Hello, this is a test recording where I'm discussing the new features we're implementing in our application. Um, so basically we're adding some really cool functionality that will help users, you know, manage their content better.",
  "duration": 30,
  "fromTime": 0,
  "toTime": 30,
  "fileSize": 1024,
  "post": {
    "id": "507f1f77bcf86cd799439011",
    "title": "New Application Features Discussion",
    "summarizedContent": "Hello, this is a test recording where I'm discussing the new features we're implementing in our application. We're adding functionality that will help users manage their content better.",
    "finalContent": "Hello, this is a test recording where I'm discussing the new features we're implementing in our application. We're adding functionality that will help users manage their content better."
  },
  "summary": "Hello, this is a test recording where I'm discussing the new features we're implementing in our application. We're adding functionality that will help users manage their content better."
}
```

## Sample Curl Request - Title Generation Only

```bash
curl -X POST https://your-lambda-url.amazonaws.com/ffmpeg/trim-and-transcribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-firebase-jwt-token" \
  -d '{
    "fileBlob": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
    "summarizationType": "title",
    "fromTime": 5,
    "toTime": 25
  }'
```

## Sample Curl Request - WhatsApp Cleanup

```bash
curl -X POST https://your-lambda-url.amazonaws.com/ffmpeg/trim-and-transcribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-firebase-jwt-token" \
  -d '{
    "fileBlob": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
    "summarizationType": "whatsapp-cleanup",
    "fromTime": 0,
    "toTime": 60
  }'
```

## Sample Curl Request - No Summarization

```bash
curl -X POST https://your-lambda-url.amazonaws.com/ffmpeg/trim-and-transcribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-firebase-jwt-token" \
  -d '{
    "fileBlob": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
    "summarizationType": "none",
    "fromTime": 0,
    "toTime": 15
  }'
```

## Sample Response - No Summarization

```json
{
  "success": true,
  "transcription": "Hello, this is a test recording.",
  "duration": 15,
  "fromTime": 0,
  "toTime": 15,
  "fileSize": 512
}
```

## Sample Error Response - Invalid Audio

```json
{
  "success": false,
  "error": "Invalid audio format or corrupted file",
  "message": "The provided audio file could not be processed"
}
```

## Sample Error Response - Missing Required Fields

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "fileBlob",
      "message": "fileBlob is required"
    },
    {
      "field": "fromTime",
      "message": "fromTime must be a number"
    }
  ]
}
```

## Notes

- Replace `https://your-lambda-url.amazonaws.com` with the actual deployed Lambda URL
- Replace `your-firebase-jwt-token` with a valid Firebase JWT token
- The `fileBlob` should be a base64-encoded audio file (MP3, M4A, WAV, etc.)
- The `userId` is automatically extracted from the JWT token - no need to provide it in the request body
- Supported `summarizationType` values: "simple-cleanup", "title", "whatsapp-cleanup", "none"
- When `summarizationType` is "none", no post creation or summarization occurs
- The response includes both the original transcription and the new post data when summarization is enabled
