
import Koa from 'koa'
import koaRouter from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from 'koa-cors';
import helmet from 'koa-helmet';
import error from 'koa-json-error'
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
  .get('/', async (ctx) => {
    ctx.body = {
      status: 'ok',
      service: 'vrai-ffmpeg-lambda',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  })
  .use('/apis', ffmpegRouter.routes());

let options = {
  origin: '*',
  methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE']
};
const app = new Koa()

app
  .use(cors(options))
  .use(bodyParser({
    jsonLimit: '20mb', // Increase JSON payload size limit to 20 MB
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
        ctx.status = 500;
        ctx.body = { status: 500, message: 'Internal Server Error' };
        return;
      }
    }
  })
  .use(api.routes())
  .use(api.allowedMethods())
  ;

// For Fly.io deployment, we need to start the server directly
const PORT = parseInt(process.env.PORT || '8080', 10);

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}/`);
    console.log(`🔧 API health check at http://localhost:${PORT}/apis/health`);
  });
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  closeDB();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  closeDB();
  process.exit(0);
});

// Export for testing purposes
export default app;
