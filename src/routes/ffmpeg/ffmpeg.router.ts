import koaRouter from 'koa-router'
import { routeAuth } from '../../middleware/authorize';
import * as ffmpegController from './ffmpeg.controller'
import { Expose } from 'class-transformer';
import { IsDefined, IsOptional, IsBoolean, IsArray, ValidateNested, IsString, IsNumber } from 'class-validator';
import { Context } from 'koa';
import { coreValidation } from '../../util/validation';


export class validateMediaFileTypeByNameReqBody {
  @IsDefined()
  @Expose()
  url: string;
  @IsOptional()
  @Expose()
  metadata: string;
}

const validateMediaFileTypeByName = async (ctx: Context, next: any) => {
  try {
    let validation = await coreValidation(ctx, next, "body", validateMediaFileTypeByNameReqBody, { whitelist: true, forbidNonWhitelisted: true });
    if (validation.hasError === true) return ctx.throwHttpError(validation.error, validation.error.metadata)
    await next();
  } catch (err) {
    console.error(err)
  }
}
export class StockAssetDto {
  @IsDefined()
  @Expose()
  @IsNumber()
  duration: number;

  @IsDefined()
  @Expose()
  @IsBoolean()
  download_from_getty: boolean;

  @IsOptional()
  @Expose()
  @IsString()
  url?: string;

  @IsOptional()
  @Expose()
  @IsString()
  gettyId?: string;

  @IsOptional()
  @Expose()
  @IsString()
  type?: 'image' | 'video';
}


export class BatchStockAssetRequestBody {
  @IsDefined()
  @Expose()
  @IsArray()
  assets: StockAssetDto[];
}

const validateBatchStockAsset = async (ctx: Context, next: any) => {
  try {
    const validation = await coreValidation(ctx, next, "body", BatchStockAssetRequestBody, { whitelist: true, forbidNonWhitelisted: true });
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

const validateSingleStockAsset = async (ctx: Context, next: any) => {
  try {
    if (!ctx.request.body) {
      return ctx.throwHttpError({
        status: 400,
        message: 'Request body is required'
      });
    }

    const validation = await coreValidation(ctx, next, "body", StockAssetDto, { whitelist: true, forbidNonWhitelisted: true });
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
ffmpegRouter.post('/validate', routeAuth.userRoute, ffmpegController.validateFile);
ffmpegRouter.post('/download-stock-assets', routeAuth.userRoute,
  async (ctx, next) => {
    if (ctx.query.batch) {
      return validateBatchStockAsset(ctx, next);
    } else {
      return validateSingleStockAsset(ctx, next);
    }
  },
  ffmpegController.downloadStockAsset
);

export { ffmpegRouter };