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
  fileBlob: string; // Base64encoded audio file (supports MP3, M4A, WAV, etc.)

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
    environment: process.env.node_env || 'development',
    ffmpegPath: process.env.IS_OFFLINE ? 'local' : '/opt/bin/ffmpeg',
    region: 'us-east-2'
  };
});

ffmpegRouter.post('/trim-and-transcribe', routeAuth.userRoute, validateTrimAndTranscribe, ffmpegController.trimAndTranscribe);

export { ffmpegRouter };