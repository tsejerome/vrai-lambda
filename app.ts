
import Koa from 'koa'
import koaRouter from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from 'koa-cors';
import helmet from 'koa-helmet';
import error from 'koa-json-error'
import serverless from 'serverless-http'
import dotenv from 'dotenv';
dotenv.config();

process.env.repo_name = 'vrai-lambda'
import { ffmpegRouter } from './src/routes/ffmpeg/ffmpeg.router';
import { initDB, closeDB } from './src/model/mongodb'
import { formatError, setupThrowError } from './src/util/error';
import { authorizationSetup } from './src/middleware/authorize';
import { initFirebase } from './src/model/firebase';

// Environment variables are loaded via dotenv.config() at the top
// No need to import config files since we're using .env files

let api = new koaRouter()
  .use('/apis', ffmpegRouter.routes());

let options = {
  origin: '*',
  methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE']
};
const app = new Koa()

app
  .use(cors(options))
  .use(bodyParser({
    jsonLimit: '20mb', // Increase JSON payload size limit to 10 MB
  }))
  .use(helmet())
  .use(error({
    preFormat: undefined,
    format: formatError
  }))
  .use(async (ctx, next) => {
    try {
      // return ctx.body = {}
      setupThrowError(ctx);
      await initDB()
      await initFirebase();
      await authorizationSetup(ctx);
      if (ctx.state.error === true) return;
      // updateLastOnline(ctx);
      await next()
    } catch (err) {
      if (process.env.NODE_ENV === 'production') console.dir(err)
      if (typeof ctx.throwHttpError === "function") {
        return ctx.throwHttpError(err);
      } else {
        return ctx.body(err)
      }
    }
  })
  .use(api.routes())
  .use(api.allowedMethods())
  ;

module.exports.server = serverless(app, {
  request: function (req: any, ...context: any) {
    context.callbackWaitsForEmptyEventLoop = false;
  }
});

process.on('SIGTERM', () => {
  closeDB();
  // app.close();
})
