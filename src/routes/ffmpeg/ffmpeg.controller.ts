import { Context, Next } from 'koa'
import { ExecException, execFile, ExecFileException, execSync } from 'child_process';
import fs from 'fs'

// dev
// import ffprobeStatic from 'ffprobe-static'
/** 
 * If you are using localhost / dev
 * ffprobe: use ffprobe-static
 * ffmpeg: if you have ffmpeg installed on your mac by going in /opt/homebrew/bin/ffmpeg
*/


// production / staging
const ffprobeStatic = {
  path: '/opt/bin/ffprobe'
}
const ffmpegPath = process.env.IS_OFFLINE ? path.resolve(__dirname, 'ffmpeg') : '/opt/bin/ffmpeg'

// don't remove below
const ffmpegStatic = {
  path: ffmpegPath
}

import { validateMediaFileTypeByNameReqBody } from './ffmpeg.router';
import { logVideoValidationToFirebase } from '../../util/validationLogs'
import { PassThrough } from 'stream';
import { Upload } from '@aws-sdk/lib-storage';
import { S3 } from '@aws-sdk/client-s3';
import Ffmpeg from '../../../types/ffmpeg';
import path from 'path';
import shortUUID from 'short-uuid';
import { initDB, mongodb } from '../../model/mongodb';
import { errorMsgs } from '../../middleware/authorize';
import axios from 'axios';
const s3 = new S3({
  credentials: {
    accessKeyId: process.env.aws_access_key_id || '',
    secretAccessKey: process.env.aws_access_pw || '',
  },
  region: process.env.s3_bucket_region || 'us-east-2',
});


async function getFileInfo(filePath: string): Promise<{ parsed: true, error: ExecException | null, data: Ffmpeg.FfprobeData, stderr: string } | { parsed: false, error: any }> {
  return new Promise(async (resolve, reject) => {
    const args = [
      '-v', 'warning',
      '-show_format',
      '-show_streams',
      '-print_format', 'json',
      filePath
    ];
    try {
      await new Promise((resolve, reject) => {
        fs.access(ffprobeStatic.path, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      console.log(`FFprobe binary exists at: ${ffprobeStatic.path}`);
    } catch (error) {
      console.error(`FFprobe binary does not exist at expected path: ${ffprobeStatic.path}`);
      reject('Ffprobe binary not found');
    }
    // const args = ['-v', videoStartTime.toString(), '-i', fetchUrl, '-to', videoDuration.toString(), '-c', 'copy', outputPath];
    execFile(ffprobeStatic.path, args, (error: ExecFileException | null, stdout: string, stderr: string) => {
      try {
        const data = JSON.parse(stdout) as Ffmpeg.FfprobeData;
        resolve({ parsed: true, error, data, stderr });
      } catch (parseError) {
        console.error(parseError)
        console.error(stdout)
        resolve({ parsed: false, error: parseError });
      }

    });
  });
}

const checkPotentialWarningMessage = (stderr: string) => {
  const warningMsgs = [
    'Missing key frame', // Missing key frame while searching for timestamp
    'Cannot find', // Cannot find an index entry before timestamp
    'Could not find', // Warning: Invalid codec parameters for stream.
    'error', // error while decoding MB 92 4, bytestream -7
    'Header missing', // Warning: Invalid codec parameters for stream.
    'Invalid timestamps',
    'decode_slice_header error',
    'no frame', // Decoding Error
    'height not divisible', // Encoding Error
    'Error',
    'partial file', // Stream Index Errors
    'buffer underflow', // Buffering Issues
    'buffer overflow'
  ];

  const hasError = warningMsgs.some(message => stderr.includes(message));
  return hasError;
}

const checkIgnoreErrorMessage = (errMsg: string) => {
  const validErrorMsgs = ['Unknown content coding: base64', 'Estimating duration from bitrate'];

  const isErrorIgnorable = validErrorMsgs.some(message => errMsg.includes(message));
  return isErrorIgnorable;
}

const isVideo = (streams: Ffmpeg.FfprobeStream[]) => {
  let isVideoFile = false;
  streams.forEach((stream) => {
    if (stream.codec_type === 'audio') return;
    if (stream.codec_type === 'video') {
      // Check for typical image codecs or cover art tag
      if (
        (stream.codec_name && ['png', 'jpeg', 'jpg', 'bmp', 'gif'].includes(stream.codec_name))
        || (stream.tags && stream.tags.comment?.toLowerCase().includes('cover'))) {
        // Likely cover art, not a true video
        return;
      }
      // Check if the frame rate is low, indicating a static image
      if (stream.r_frame_rate) {
        const [num, den] = stream.r_frame_rate.split('/').map(Number);
        const frameRate = num / (den || 1);
        if (frameRate <= 1) {
          return; // Treat as cover art, not a video
        }
        isVideoFile = true;
      }
    }
  });
  return isVideoFile;
}

const validateFile = async (ctx: Context, next: any) => {
  try {
    const body = ctx.request.body as validateMediaFileTypeByNameReqBody;
    const fileInfo = await getFileInfo(body.url)
    if (!fileInfo.parsed) {
      await logVideoValidationToFirebase(fileInfo, false, ctx);
      return ctx.body = {
        file_valid: false,
        error: fileInfo.error,
      }
    }

    const hasVideo = isVideo(fileInfo.data?.streams)
    const hasAudio = fileInfo.data?.streams.some(stream => stream.codec_type === 'audio');
    const type = hasVideo ? 'video' : hasAudio ? 'audio' : 'unknown'


    const ret = {
      file_valid: true,
      error: fileInfo.error || undefined,
      duration: fileInfo.data?.format.duration,
      type
    }

    if (
      fileInfo.error !== null
      && JSON.stringify(fileInfo.error).length > 2
    ) {
      await logVideoValidationToFirebase(fileInfo, false, ctx);
      return ctx.body = Object.assign(ret, {
        file_valid: false,
        error: fileInfo.error,
        stderr: fileInfo.stderr,
        data: fileInfo.data,
      })
    }
    if (checkPotentialWarningMessage(fileInfo.stderr)) {
      await logVideoValidationToFirebase(fileInfo, false, ctx);
      return ctx.body = Object.assign(ret, {
        file_valid: false,
        error: fileInfo.stderr,
        stderr: fileInfo.stderr,
        data: fileInfo.data,
      })
    }

    if (body.metadata) return ctx.body = Object.assign(ret, {
      stderr: fileInfo.stderr,
      data: fileInfo.data,
    })
    await logVideoValidationToFirebase(fileInfo, true, ctx);
    return ctx.body = ret;
  } catch (err) {
    console.error('err')
    console.error(err)
    ctx.throwHttpError(err);
  }
}

const getDirectFileUrl = async (url: string): Promise<string> => {
  try {
    const response = await axios.head(url, { maxRedirects: 5 });
    return response.request.res.responseUrl || url;
  } catch (error) {
    console.error('Failed to resolve redirect URL:', error);
    return url
  }
};

async function processAsset(
  asset: {
    url?: string;
    gettyId?: string;
    duration: number;
    download_from_getty: boolean;
    type?: 'image' | 'video';
    testing?: boolean;
  },
  user: any,
  userId: string
): Promise<{ s3Url: string; testing?: boolean; maxDuration?: number }> {
  const outputPath = path.join('/tmp/', `${Date.now()}-${shortUUID.generate()}.mp4`);
  let url = '', maxDuration = 100;
  const gettyClient = new GettyImagesClient();

  try {
    if (asset.download_from_getty && asset.gettyId) {
      if (!user.current_premium) {
        url = asset.type === 'image'
          ? await gettyClient.getImageWithWatermarkByID(asset.gettyId)
          : await gettyClient.getVideoWithWatermarkByID(asset.gettyId);
      } else {
        const gettyResponse = asset.type === 'image'
          ? await gettyClient.downloadsimages(asset.gettyId)
          : await gettyClient.downloadsvideos(asset.gettyId);
        url = gettyResponse.uri;
        maxDuration = (gettyResponse as any).duration;
      }
      url = await getDirectFileUrl(url);

      if (asset.testing) {
        return { s3Url: url, testing: true, maxDuration };
      }

      if (asset.type === 'image') {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const imageContent = Buffer.from(response.data);
        const s3Key = `${userId}/images/${shortUUID.generate()}-${path.basename(url)}`;

        const uploadParams = {
          Bucket: process.env.s3_bucket_name || vrai - staging - playground',
          Key: s3Key,
          Body: imageContent,
          ContentType: response.headers['content-type'],
        };

        const upload = new Upload({
          client: s3,
          params: uploadParams,
        });

        const uploadResult = await upload.done();
        return { s3Url: uploadResult.Location as string };
      }
    } else {
      url = asset.url || '';
    }

    if (!url) throw new Error('No URL provided');

    // Verify FFmpeg binary exists
    await new Promise((resolve, reject) => {
      fs.access(ffmpegStatic.path, (err) => {
        if (err) reject(new Error('FFmpeg binary not found'));
        else resolve(true);
      });
    });

    const args = [
      '-v', 'debug',
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '20',
      '-ss', '0',
      '-i', url,
      '-to', (asset.duration && asset.duration > 0 ? Math.min(asset.duration + 2, maxDuration) : 1).toString(),
      '-c', 'copy',
      outputPath
    ];

    await new Promise<void>((resolve, reject) => {
      execFile(ffmpegStatic.path, args, { maxBuffer: 10 * 1024 * 1024, timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`FFmpeg execution failed: ${error.message}\nStderr: ${stderr}`));
        } else {
          resolve();
        }
      });
    });

    const fileContent = fs.readFileSync(outputPath);
    const s3Key = `${userId}/trimmed-videos/${path.basename(url)}`;

    const uploadParams = {
      Bucket: process.env.s3_bucket_name || vrai - staging - playground',
      Key: s3Key,
      Body: fileContent,
      ContentType: 'video/mp4',
    };

    const upload = new Upload({
      client: s3,
      params: uploadParams,
    });

    const uploadResult = await upload.done();
    return { s3Url: uploadResult.Location as string };

  } finally {
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (err) {
      console.error('Error cleaning up:', err);
    }
  }
}

const downloadStockAsset = async (ctx: Context, next: Next) => {
  try {
    await initDB();
    const user = await mongodb.collection('users').findOne({ id: ctx.state.user.auth.uid });
    if (!user) return ctx.throwHttpError(errorMsgs.NOT_FOUND);

    if (ctx.query.batch) {
      const { assets } = ctx.request.body as { assets: Array<any> };
      const results = await Promise.allSettled(
        assets.map(asset => processAsset(asset, user, ctx.state.user.auth.uid))
      );

      ctx.body = {
        results: results.map((result, index) => ({
          asset: assets[index],
          ...(result.status === 'fulfilled'
            ? { success: true, ...result.value }
            : { success: false, error: result.reason?.message })
        }))
      };
    } else {
      const result = await processAsset(ctx.request.body as any, user, ctx.state.user.auth.uid);
      ctx.body = {
        message: 'Asset processed and uploaded successfully',
        ...result
      };
    }
  } catch (err) {
    console.error('Error in downloadStockAsset:', err);
    ctx.throw(500, err instanceof Error ? err.message : 'Failed to process assets');
  }

  await next();
};

export { validateFile, downloadStockAsset };