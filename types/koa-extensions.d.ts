import { Context } from 'koa';

declare module 'koa' {
  interface Context {
    throwHttpError: (error: { status: number, code: string, message: string, metadata?: any } | string | unknown, metadata?: any) => void;
    params: { [key: string]: any }
  }
}