import { Context, Next } from 'koa'
import { ExecException, execFile, ExecFileException, execFileSync, execSync } from 'child_process';
import fs from 'fs'
import path from 'path';
import shortUUID from 'short-uuid';
import { TrimAndTranscribeRequestBody } from './ffmpeg.router';
import OpenAI from 'openai';
import { createPostWithSummary } from '../../helpers/post';
import { uploadFileForDebugging } from '../../util/s3';
import { updateUserRemainingMinutes } from '../../model/mongodb';

// For Fly.io deployment, use system-installed FFmpeg
const ffprobeStatic = {
  path: process.env.FFPROBE_PATH || 'ffprobe'
}
const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'

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


    // Create temporary file paths with unique names to avoid conflicts in Lambda
    const timestamp = Date.now();
    const uniqueId = shortUUID.generate();
    // Use .caf extension for proper CAF format detection
    inputPath = path.join('/tmp', `input-${timestamp}-${uniqueId}.caf`);
    outputPath = path.join('/tmp', `trimmed-${timestamp}-${uniqueId}.mp3`);

    try {
      // Write the input file
      fs.writeFileSync(inputPath, fileBuffer as Uint8Array);
      const stat = fs.statSync(inputPath);
      // Log first 32 bytes of file
      const fileFirstBytes = fs.readFileSync(inputPath).slice(0, 32);

      try {
        const ffprobeOutput = execFileSync(ffprobeStatic.path, [
          '-v', 'error',
          '-show_format',
          '-of', 'json',
          inputPath
        ], { encoding: 'utf8' });
        const probeJson = JSON.parse(ffprobeOutput);
      } catch (probeErr) {
        console.error('ffprobe failed:', probeErr);
      }

      // Upload file to S3 for debugging (every time, not just on errors)
      try {
        const userId = ctx.state.user?.auth?.uid || 'anonymous';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const requestId = shortUUID.generate();

        // Upload original input file
        const inputFileName = `debug-input-${timestamp}-${requestId}.caf`;
        const inputFileUrl = await uploadFileForDebugging(
          fileBuffer,
          inputFileName,
          userId,
          'audio/x-caf'
        );
        console.log('Input file uploaded to S3 for debugging:', inputFileUrl);

      } catch (uploadError) {
        console.error('Failed to upload input file to S3:', uploadError);
      }

      // Verify FFmpeg binary exists
      await new Promise((resolve, reject) => {
        fs.access(ffmpegStatic.path, (err) => {
          if (err) reject(new Error('FFmpeg binary not found'));
          else resolve(true);
        });
      });

      // Trim the audio using FFmpeg and convert to MP3 (OpenAI prefers MP3)
      const duration = body.toTime - body.fromTime;

      // Debug: Log time values
      console.log('Time values:', {
        fromTime: body.fromTime,
        toTime: body.toTime,
        duration: duration,
      });

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
            console.error('FFmpeg stdout:', stdout);
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



      // Upload output file to S3 for debugging (every time)
      try {
        const userId = ctx.state.user?.auth?.uid || 'anonymous';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const requestId = shortUUID.generate();

        const outputFileBuffer = fs.readFileSync(outputPath);
        const outputFileName = `debug-output-${timestamp}-${requestId}.mp3`;
        const outputFileUrl = await uploadFileForDebugging(
          outputFileBuffer,
          outputFileName,
          userId,
          'audio/mpeg'
        );
        console.log('Output file uploaded to S3 for debugging:', outputFileUrl);
      } catch (uploadError) {
        console.error('Failed to upload output file to S3:', uploadError);
      }

      // Call OpenAI Whisper API for transcription using file buffer

      let transcriptionResult;
      try {
        // Use the file path directly with createReadStream
        transcriptionResult = await openai.audio.transcriptions.create({
          file: fs.createReadStream(outputPath),
          model: 'whisper-1',
          response_format: 'json'
        });

      } catch (transcriptionError) {
        console.error('OpenAI transcription failed:', transcriptionError);
        throw new Error(`Transcription failed: ${transcriptionError instanceof Error ? transcriptionError.message : String(transcriptionError)}`);
      }

      // Create post with summary based on summarizationType
      let post = null;
      let summary = null;

      if (body.summarizationType && body.summarizationType !== 'none') {
        try {
          const userId = ctx.state.user?.auth?.uid || 'default-user';

          // Map summarizationType to the correct prompt template
          let promptId = body.summarizationType;
          let domain = 'notion.so';

          // Map the summarization types to actual prompt templates
          if (body.summarizationType === 'summarize') {
            promptId = 'simple-cleanup'; // Use simple-cleanup for general summarization
            domain = 'notion.so';
          } else if (body.summarizationType === 'whatsapp-cleanup') {
            promptId = 'whatsapp-cleanup';
            domain = 'whatsapp.com';
          } else if (body.summarizationType === 'simple-cleanup') {
            promptId = 'simple-cleanup';
            domain = 'notion.so';
          }



          try {
            post = await createPostWithSummary({
              userId: userId,
              transcriptionResult: transcriptionResult.text,
              summarizationType: promptId,
              domain: domain
            });

            console.log('Post created successfully:', {
              id: post.id,
              title: post.title,
              summarizedContent: post.summarizedContent,
              finalContent: post.finalContent,
              summary: post.summary
            });

            summary = post.summary;
          } catch (summaryError) {
            console.error('Error creating post with summary:', summaryError);
            console.error('Summary error details:', {
              message: summaryError instanceof Error ? summaryError.message : String(summaryError),
              stack: summaryError instanceof Error ? summaryError.stack : undefined
            });
          }
        } catch (error) {
          console.error('Error in summarization block:', error);
        }
      }

      const responseBody = {
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

      console.log('Sending response to frontend:', JSON.stringify(responseBody, null, 2));

      // Set proper content type for JSON response with UTF-8 encoding
      ctx.body = responseBody;

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

    // Upload files to S3 for debugging (error case - additional debugging)
    try {
      const userId = ctx.state.user?.auth?.uid || 'anonymous';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const errorType = err instanceof Error ? err.constructor.name : 'UnknownError';

      // Upload original input file if available
      if (fileBuffer) {
        const inputFileName = `error-input-${timestamp}-${errorType}.caf`;
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

        const inputFileName = `error-input-${timestamp}-${errorType}.caf`;
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
        const outputFileName = `error-output-${timestamp}-${errorType}.mp3`;
        const outputFileUrl = await uploadFileForDebugging(
          outputFileBuffer,
          outputFileName,
          userId,
          'audio/mpeg'
        );
        debugFileUrls.push(outputFileUrl);
      }

      // Log debug information
      console.log('Error debug files uploaded:', debugFileUrls);
      console.log('Error details:', {
        error: err instanceof Error ? err.message : String(err),
        errorType,
        userId,
        timestamp,
        debugFileUrls
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
  try {
    const userId = ctx.state.user?.auth?.uid;
    if (userId) {
      await updateUserRemainingMinutes(userId, 1);
      console.log('✅ [Multipart] User remaining minutes updated');
    } else {
      console.log('⚠️ [Multipart] No user ID found, skipping remaining minutes update');
    }
  } catch (updateError) {
    console.error('❌ [Multipart] Failed to update user remaining minutes:', updateError);
    // Don't fail the request if this update fails
  }
  await next();
};

export { trimAndTranscribe };

// MARK: - Multipart Upload Handler
// Business Context: Handle multipart form data for memory-efficient audio processing
// This prevents signal 9 termination by avoiding base64 encoding overhead

const trimAndTranscribeMultipart = async (ctx: Context, next: Next) => {
  let inputPath: string | null = null;
  let outputPath: string | null = null;
  let debugFileUrls: string[] = [];

  try {
    // Extract multipart form data with proper typing
    const file = (ctx.request as any).file;
    const body = ctx.request.body as any;
    const fromTime = parseFloat(body?.fromTime || '0');
    const toTime = parseFloat(body?.toTime || '0');
    const summarizationType = body?.summarizationType || 'summarize';

    console.log('🚀 [Multipart] Processing multipart upload');
    console.log('📁 [Multipart] File:', file?.originalname);
    console.log('⏱️ [Multipart] Time range:', fromTime, 'to', toTime);
    console.log('🎯 [Multipart] Summarization type:', summarizationType);

    // Validate required fields
    if (!file) {
      throw new Error('No audio file provided');
    }

    if (fromTime < 0 || toTime <= fromTime || toTime > 300) {
      throw new Error('Invalid time range');
    }

    if (!summarizationType) {
      throw new Error('Summarization type is required');
    }

    // Create temporary file paths with unique names
    const timestamp = Date.now();
    const uniqueId = shortUUID.generate();
    inputPath = path.join('/tmp', `input-${timestamp}-${uniqueId}.caf`);
    outputPath = path.join('/tmp', `trimmed-${timestamp}-${uniqueId}.mp3`);

    try {
      // Write the uploaded file directly to disk
      fs.writeFileSync(inputPath, file.buffer);
      const stat = fs.statSync(inputPath);
      console.log('📊 [Multipart] Input file size:', stat.size, 'bytes');

      // Upload file to S3 for debugging
      try {
        const userId = ctx.state.user?.auth?.uid || 'anonymous';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const requestId = shortUUID.generate();

        const inputFileName = `debug-multipart-input-${timestamp}-${requestId}.caf`;
        const inputFileUrl = await uploadFileForDebugging(
          file.buffer,
          inputFileName,
          userId,
          'audio/x-caf'
        );
        console.log('📤 [Multipart] Input file uploaded to S3:', inputFileUrl);
      } catch (uploadError) {
        console.error('❌ [Multipart] Failed to upload input file to S3:', uploadError);
      }

      // Verify FFmpeg binary exists
      await new Promise((resolve, reject) => {
        fs.access(ffmpegStatic.path, (err) => {
          if (err) reject(new Error('FFmpeg binary not found'));
          else resolve(true);
        });
      });

      // Trim the audio using FFmpeg
      const duration = toTime - fromTime;
      console.log('⏱️ [Multipart] Duration to extract:', duration, 'seconds');

      const args = [
        '-i', inputPath,
        '-ss', fromTime.toString(),
        '-t', duration.toString(),
        '-c:a', 'mp3',
        '-b:a', '128k',
        '-ar', '16000',
        '-ac', '1',
        '-f', 'mp3',
        '-y',
        outputPath
      ];

      await new Promise<void>((resolve, reject) => {
        execFile(ffmpegStatic.path, args, {
          maxBuffer: 10 * 1024 * 1024,
          timeout: 60000
        }, (error, stdout, stderr) => {
          if (error) {
            console.error('❌ [Multipart] FFmpeg stderr:', stderr);
            console.error('❌ [Multipart] FFmpeg stdout:', stdout);
            reject(new Error(`FFmpeg execution failed: ${error.message}`));
          } else {
            console.log('✅ [Multipart] FFmpeg processing completed');
            resolve();
          }
        });
      });

      // Verify output file
      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        throw new Error('FFmpeg failed to create output file');
      }

      // Upload output file to S3 for debugging
      try {
        const userId = ctx.state.user?.auth?.uid || 'anonymous';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const requestId = shortUUID.generate();

        const outputFileBuffer = fs.readFileSync(outputPath);
        const outputFileName = `debug-multipart-output-${timestamp}-${requestId}.mp3`;
        const outputFileUrl = await uploadFileForDebugging(
          outputFileBuffer,
          outputFileName,
          userId,
          'audio/mpeg'
        );
        console.log('📤 [Multipart] Output file uploaded to S3:', outputFileUrl);
      } catch (uploadError) {
        console.error('❌ [Multipart] Failed to upload output file to S3:', uploadError);
      }

      // Call OpenAI Whisper API
      let transcriptionResult;
      try {
        transcriptionResult = await openai.audio.transcriptions.create({
          file: fs.createReadStream(outputPath),
          model: 'whisper-1',
          response_format: 'json'
        });
        console.log('✅ [Multipart] Transcription completed');
      } catch (transcriptionError) {
        console.error('❌ [Multipart] OpenAI transcription failed:', transcriptionError);
        throw new Error(`Transcription failed: ${transcriptionError instanceof Error ? transcriptionError.message : String(transcriptionError)}`);
      }

      // Create post with summary
      let post = null;
      let summary = null;

      if (summarizationType && summarizationType !== 'none') {
        try {
          const userId = ctx.state.user?.auth?.uid || 'default-user';

          // Map summarizationType to prompt template
          let promptId = summarizationType;
          let domain = 'notion.so';

          if (summarizationType === 'summarize') {
            promptId = 'simple-cleanup';
            domain = 'notion.so';
          } else if (summarizationType === 'whatsapp-cleanup') {
            promptId = 'whatsapp-cleanup';
            domain = 'whatsapp.com';
          } else if (summarizationType === 'simple-cleanup') {
            promptId = 'simple-cleanup';
            domain = 'notion.so';
          }

          post = await createPostWithSummary({
            userId: userId,
            transcriptionResult: transcriptionResult.text,
            summarizationType: promptId,
            domain: domain
          });

          console.log('✅ [Multipart] Post created successfully:', {
            id: post.id,
            title: post.title,
            summarizedContent: post.summarizedContent,
            finalContent: post.finalContent,
            summary: post.summary
          });

          summary = post.summary;
        } catch (summaryError) {
          console.error('❌ [Multipart] Error creating post with summary:', summaryError);
        }
      }

      // Prepare response
      const responseBody = {
        success: true,
        transcription: transcriptionResult.text,
        duration: duration,
        fromTime: fromTime,
        toTime: toTime,
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

      console.log('✅ [Multipart] Sending response to frontend');
      ctx.body = responseBody;

      // Update user's remaining minutes (-1)
      try {
        const userId = ctx.state.user?.auth?.uid;
        if (userId) {
          await updateUserRemainingMinutes(userId, 1);
          console.log('✅ [Multipart] User remaining minutes updated');
        } else {
          console.log('⚠️ [Multipart] No user ID found, skipping remaining minutes update');
        }
      } catch (updateError) {
        console.error('❌ [Multipart] Failed to update user remaining minutes:', updateError);
        // Don't fail the request if this update fails
      }

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
        console.error('❌ [Multipart] Error cleaning up temporary files:', err);
      }
    }

  } catch (err) {
    console.error('❌ [Multipart] Error in trimAndTranscribeMultipart:', err);

    // Upload debug files on error
    try {
      const userId = ctx.state.user?.auth?.uid || 'anonymous';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const errorType = 'multipart-error';

      // Upload input file if it exists
      if (inputPath && fs.existsSync(inputPath)) {
        const inputFileBuffer = fs.readFileSync(inputPath);
        const inputFileName = `error-multipart-input-${timestamp}-${errorType}.caf`;
        const inputFileUrl = await uploadFileForDebugging(
          inputFileBuffer,
          inputFileName,
          userId,
          'audio/x-caf'
        );
        debugFileUrls.push(inputFileUrl);
      }

      // Upload output file if it exists
      if (outputPath && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        const outputFileBuffer = fs.readFileSync(outputPath);
        const outputFileName = `error-multipart-output-${timestamp}-${errorType}.mp3`;
        const outputFileUrl = await uploadFileForDebugging(
          outputFileBuffer,
          outputFileName,
          userId,
          'audio/mpeg'
        );
        debugFileUrls.push(outputFileUrl);
      }

      console.log('📤 [Multipart] Error debug files uploaded:', debugFileUrls);
    } catch (uploadError) {
      console.error('❌ [Multipart] Failed to upload debug files:', uploadError);
    }

    // Include debug file URLs in error response
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

export { trimAndTranscribeMultipart };
