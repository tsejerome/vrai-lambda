import { Context, Next } from 'koa'
import { ExecException, execFile, ExecFileException, execSync } from 'child_process';
import fs from 'fs'
import path from 'path';
import shortUUID from 'short-uuid';
import { TrimAndTranscribeRequestBody } from './ffmpeg.router';
import OpenAI from 'openai';

// production / staging
const ffprobeStatic = {
  path: '/opt/bin/ffprobe'
}
const ffmpegPath = process.env.IS_OFFLINE ? path.resolve(__dirname, 'ffmpeg') : '/opt/bin/ffmpeg'

// don't remove below
const ffmpegStatic = {
  path: ffmpegPath
}

const openai = new OpenAI({
  apiKey: process.env.openai_secret,
});

const trimAndTranscribe = async (ctx: Context, next: Next) => {
  try {
    const body = ctx.request.body as TrimAndTranscribeRequestBody;

    // Decode base64 file blob
    const fileBuffer = Buffer.from(body.fileBlob, 'base64') as Buffer;

    // Create temporary file paths with unique names to avoid conflicts in Lambda
    const timestamp = Date.now();
    const uniqueId = shortUUID.generate();
    const inputPath = path.join('/tmp', `input-${timestamp}-${uniqueId}.audio`);
    const outputPath = path.join('/tmp', `trimmed-${timestamp}-${uniqueId}.mp3`);

    try {
      // Write the input file
      fs.writeFileSync(inputPath, fileBuffer as Uint8Array);

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
        '-ar', '0', // Set sample rate (OpenAI Whisper works well with 16Hz)
        '-ac', '1',     // Convert to mono (better for transcription)
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

      ctx.body = {
        success: true,
        transcription: transcriptionResult.text,
        duration: duration,
        fromTime: body.fromTime,
        toTime: body.toTime,
        fileSize: fs.statSync(outputPath).size
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
    ctx.throw(500, err instanceof Error ? err.message : 'Failed to trim and transcribe audio');
  }

  await next();
};

export { trimAndTranscribe };