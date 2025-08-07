import koaRouter from 'koa-router'
import { routeAuth } from '../../middleware/authorize'; import * as ffmpegController from './ffmpeg.controller'
import { Expose } from 'class-transformer';
import { IsDefined, IsOptional, IsNumber, IsString } from 'class-validator';
import { Context } from 'koa';
import { coreValidation } from '../../util/validation';

export class TrimAndTranscribeRequestBody {
  @IsDefined()
  @Expose()
  @IsString()
  fileBlob: string; // Audio file (base64 string or binary buffer) - supports MP3, M4A, WAV, CAF, etc.

  @IsDefined()
  @Expose()
  @IsString()
  summarizationType: string; //"summarize" or "simple-cleanup"

  @IsDefined()
  @Expose()
  @IsNumber()
  fromTime: number; // Start time in seconds

  @IsDefined()
  @Expose()
  @IsNumber()
  toTime: number; // End time in seconds
}

const validateTrimAndTranscribe = async (ctx: Context, next: any) => {
  try {
    const validation = await coreValidation(ctx, next, "body", TrimAndTranscribeRequestBody, { whitelist: true, forbidNonWhitelisted: true });
    if (validation.hasError === true) {
      return ctx.throwHttpError(validation.error, validation.error.metadata);
    }
    await next();
  } catch (err) {
    console.error(err);
    ctx.throwHttpError({
      status: 500,
      message: 'Validation error'
    });
  }
}

let ffmpegRouter = new koaRouter()

// Health check route for debugging
ffmpegRouter.get('/health', async (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'vrai-ffmpeg-lambda',
    environment: process.env.NODE_ENV || 'development',
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
    deployment: 'fly.io'
  };
});

ffmpegRouter.post('/trim-and-transcribe', routeAuth.userRoute, validateTrimAndTranscribe, ffmpegController.trimAndTranscribe);

// New multipart endpoint for memory-efficient uploads
ffmpegRouter.post('/trim-and-transcribe-multipart', routeAuth.userRoute, upload.single('audio'), ffmpegController.trimAndTranscribeMultipart);

export { ffmpegRouter };
