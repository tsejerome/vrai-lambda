import { Context, Next } from 'koa'
import { ExecException, execFile, ExecFileException, execSync } from 'child_process';
import fs from 'fs'
import path from 'path';
import shortUUID from 'short-uuid';
import { TrimAndTranscribeRequestBody } from './ffmpeg.router';
import OpenAI from 'openai';
import { createPostWithSummary } from '../../helpers/post';
import { uploadFileForDebugging } from '../../util/s3';

// production / staging
const ffprobeStatic = {
  path: process.env.IS_OFFLINE
    ? (process.env.FFPROBE_PATH || path.resolve(process.cwd(), 'ffmpeg', 'bin', 'ffprobe'))
    : '/opt/bin/ffprobe'
}
const ffmpegPath = process.env.IS_OFFLINE
  ? (process.env.FFMPEG_PATH || path.resolve(process.cwd(), 'ffmpeg', 'bin', 'ffmpeg'))
  : '/opt/bin/ffmpeg'

// don't remove below
const ffmpegStatic = {
  path: ffmpegPath
}

const openai = new OpenAI({
  apiKey: process.env.openai_secret,
});

const trimAndTranscribe = async (ctx: Context, next: Next) => {
  let inputPath: string | null = null;
  let outputPath: string | null = null;
  let fileBuffer: Buffer | null = null;
  let debugFileUrls: string[] = [];

  try {
    const body = ctx.request.body as TrimAndTranscribeRequestBody;
    const fileBlob: any = body.fileBlob;

    // Helper type guard for array
    function isArray(val: unknown): val is any[] {
      return Array.isArray(val);
    }

    // Debug: Log fileBlob type and length
    console.log('fileBlob typeof:', typeof fileBlob);
    if (typeof fileBlob === 'string') {
      console.log('fileBlob (string) length:', fileBlob.length);
      // Log first 100 chars for inspection
      console.log('fileBlob (string) first 100 chars:', fileBlob.slice(0, 100));
    } else if (Buffer.isBuffer(fileBlob)) {
      console.log('fileBlob (Buffer) length:', fileBlob.length);
      // Log first 32 bytes as hex
      console.log('fileBlob (Buffer) first 32 bytes:', fileBlob.slice(0, 32).toString('hex'));
    } else if (isArray(fileBlob)) {
      console.log('fileBlob (Array) length:', fileBlob.length);
      // Log first 10 elements
      if (fileBlob.length > 0) {
        console.log('fileBlob (Array) first 10 elements:', fileBlob.slice(0, 10));
      } else {
        console.log('fileBlob (Array) is empty');
      }
    } else {
      console.log('fileBlob (Unknown type):', fileBlob);
    }

    // Handle binary CAF file directly (more efficient than base64)
    if (typeof fileBlob === 'string') {
      // If it's still base64 encoded (backward compatibility)
      fileBuffer = Buffer.from(fileBlob, 'base64');
    } else if (Buffer.isBuffer(fileBlob)) {
      // If it's already a Buffer (binary file)
      fileBuffer = fileBlob;
    } else {
      // If it's an array or other format, convert to Buffer
      fileBuffer = Buffer.from(fileBlob as any);
    }

    // Debug: Log fileBuffer length and first bytes
    console.log('fileBuffer length:', fileBuffer.length);
    console.log('fileBuffer first 32 bytes:', fileBuffer.slice(0, 32).toString('hex'));

    // Create temporary file paths with unique names to avoid conflicts in Lambda
    const timestamp = Date.now();
    const uniqueId = shortUUID.generate();
    // Use .caf extension for proper CAF format detection
    inputPath = path.join('/tmp', `input-${timestamp}-${uniqueId}.caf`);
    outputPath = path.join('/tmp', `trimmed-${timestamp}-${uniqueId}.mp3`);

    try {
      // Write the input file
      fs.writeFileSync(inputPath, fileBuffer as Uint8Array);
      // Debug: Confirm file written
      console.log('Wrote input file:', inputPath);
      const stat = fs.statSync(inputPath);
      console.log('Input file size:', stat.size);
      // Log first 32 bytes of file
      const fileFirstBytes = fs.readFileSync(inputPath).slice(0, 32);
      console.log('Input file first 32 bytes:', fileFirstBytes.toString('hex'));

      // Verify FFmpeg binary exists
      await new Promise((resolve, reject) => {
        fs.access(ffmpegStatic.path, (err) => {
          if (err) reject(new Error('FFmpeg binary not found'));
          else resolve(true);
        });
      });

      // Trim the audio using FFmpeg and convert to MP3 (OpenAI prefers MP3)
      const duration = body.toTime - body.fromTime;
      const args = [
        '-i', inputPath,
        '-ss', body.fromTime.toString(),
        '-t', duration.toString(),
        '-c:a', 'mp3',  // Convert to MP3 codec
        '-b:a', '128k', // Set bitrate for good quality
        '-ar', '16000', // Set sample rate to 16kHz (optimal for Whisper)
        '-ac', '1',     // Convert to mono (better for transcription)
        '-f', 'mp3',    // Force MP3 format
        '-y',           // Overwrite output file if exists
        outputPath
      ];

      await new Promise<void>((resolve, reject) => {
        execFile(ffmpegStatic.path, args, {
          maxBuffer: 10 * 1024 * 1024,
          timeout: 60000
        }, (error, stdout, stderr) => {
          if (error) {
            console.error('FFmpeg stderr:', stderr);
            reject(new Error(`FFmpeg execution failed: ${error.message}`));
          } else {
            resolve();
          }
        });
      });

      // Verify the output file exists and has content
      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        throw new Error('FFmpeg failed to create output file');
      }

      // Call OpenAI Whisper API for transcription using file path
      const transcriptionResult = await openai.audio.transcriptions.create({
        file: fs.createReadStream(outputPath),
        model: 'whisper-1',
        response_format: 'json'
      });

      // Create post with summary based on summarizationType
      let post = null;
      let summary = null;

      if (body.summarizationType && body.summarizationType !== 'none') {
        try {
          const userId = ctx.state.user?.auth?.uid || 'default-user';

          post = await createPostWithSummary({
            userId: userId,
            transcriptionResult: transcriptionResult.text,
            summarizationType: body.summarizationType,
            domain: body.summarizationType === 'summarize' ? 'whatsapp.com' : 'notion.so'
          });

          summary = post.summary;
        } catch (summaryError) {
          console.error('Error creating post with summary:', summaryError);
        }
      }

      ctx.body = {
        success: true,
        transcription: transcriptionResult.text,
        duration: duration,
        fromTime: body.fromTime,
        toTime: body.toTime,
        fileSize: fs.statSync(outputPath).size,
        ...(post && {
          post: {
            id: post.id,
            title: post.title,
            summarizedContent: post.summarizedContent,
            finalContent: post.finalContent
          }
        }),
        ...(summary && { summary })
      };

    } finally {
      // Clean up temporary files
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

  } catch (err) {
    console.error('Error in trimAndTranscribe:', err);

    // Upload files to S3 for debugging
    try {
      const userId = ctx.state.user?.auth?.uid || 'anonymous';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const errorType = err instanceof Error ? err.constructor.name : 'UnknownError';

      // Upload original input file if available
      if (fileBuffer) {
        const inputFileName = `debug-input-${timestamp}-${errorType}.caf`;
        const inputFileUrl = await uploadFileForDebugging(
          fileBuffer,
          inputFileName,
          userId,
          'audio/x-caf'
        );
        debugFileUrls.push(inputFileUrl);
      } else if ((ctx.request.body as any)?.fileBlob) {
        // If fileBuffer is not available, decode the original fileBlob
        const body = ctx.request.body as TrimAndTranscribeRequestBody;
        let decodedBuffer: Buffer;

        if (typeof body.fileBlob === 'string') {
          // Decode base64 to binary
          decodedBuffer = Buffer.from(body.fileBlob, 'base64');
        } else if (Buffer.isBuffer(body.fileBlob)) {
          // Already binary
          decodedBuffer = body.fileBlob;
        } else {
          // Convert to buffer
          decodedBuffer = Buffer.from(body.fileBlob as any);
        }

        const inputFileName = `debug-input-${timestamp}-${errorType}.caf`;
        const inputFileUrl = await uploadFileForDebugging(
          decodedBuffer,
          inputFileName,
          userId,
          'audio/x-caf'
        );
        debugFileUrls.push(inputFileUrl);
      }

      // Upload output file if it exists and has content
      if (outputPath && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        const outputFileBuffer = fs.readFileSync(outputPath);
        const outputFileName = `debug-output-${timestamp}-${errorType}.mp3`;
        const outputFileUrl = await uploadFileForDebugging(
          outputFileBuffer,
          outputFileName,
          userId,
          'audio/mpeg'
        );
        debugFileUrls.push(outputFileUrl);
      }

      // Log debug information
      console.log('Debug files uploaded:', debugFileUrls);
      console.log('Error details:', {
        error: err instanceof Error ? err.message : String(err),
        errorType,
        userId,
        timestamp,
        debugFileUrls,
        fileBufferExists: !!fileBuffer,
        fileBufferType: fileBuffer ? typeof fileBuffer : 'undefined'
      });

    } catch (uploadError) {
      console.error('Failed to upload debug files:', uploadError);
    }

    // Include debug file URLs in error response if available
    const errorMessage = err instanceof Error ? err.message : 'Failed to trim and transcribe audio';
    const errorResponse: any = {
      status: 500,
      message: errorMessage
    };

    if (debugFileUrls.length > 0) {
      errorResponse.debugFiles = debugFileUrls;
      errorResponse.debugNote = 'Files have been uploaded to S3 for debugging purposes';
    }

    ctx.throw(500, errorResponse);
  }

  await next();
};

export { trimAndTranscribe };
