import Koa from 'koa';
import { MessageUtil } from '../../src/util/message';


export function formatError(err: any) {
  const statusCode: number = 500;
  const code: string = 'internal_error';
  const message: string = 'Default Error: There is some error on our end';
  return MessageUtil.error(statusCode, code, message);
}

export function setupThrowError(ctx: Koa.ParameterizedContext<Koa.DefaultState, Koa.DefaultContext, any>) {
  ctx.throwHttpError = (err: { status: number, code: string, message: string } | string | unknown, metadata?: any) => {
    const error = (err as any) || 'There is some error on our end';
    const statusCode: number = typeof error !== 'string' ? error?.status : 500;
    const code: string = typeof error !== 'string' ? error?.code : 'internal_error';
    const message: string = !error ? 'There is some error on our end' : typeof error !== 'string' ? error.message : error.toString();

    ctx.status = typeof statusCode === 'number' ? statusCode : 500;
    ctx.body = MessageUtil.error(statusCode, code, message, metadata);
    return;
  }
}