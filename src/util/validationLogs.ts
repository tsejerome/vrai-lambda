import { Context } from 'vm';
import { validateMediaFileTypeByNameReqBody } from '../routes/ffmpeg/ffmpeg.router';
import { firestore, firebase } from '../model/firebase';
import { exec, ExecException } from 'child_process';
import jwt_decode from 'jwt-decode';
import ffmpeg from '../../types/ffmpeg';

const logVideoValidationToFirebase = async (fileInfo: {
  parsed: true;
  error: ExecException | null;
  data: ffmpeg.FfprobeData;
  stderr: string;
} | {
  parsed: false;
  error: any;
}, file_valid: boolean, ctx: Context) => {
  try {
    const body = ctx.request.body as validateMediaFileTypeByNameReqBody;
    const authHeader = ctx.headers['authorization'];
    const bearerToken = authHeader ? authHeader.split(' ')[1] : null;
    let decodedToken: any = null;

    if (bearerToken) {
      try {
        decodedToken = jwt_decode(bearerToken);
        console.log("Decoded JWT:", decodedToken);
      } catch (error) {
        console.error("Failed to decode JWT:", error);
      }
    } else {
      console.log("No bearer token provided.");
    }
    let logData = {
      parsed: fileInfo.parsed,
      error: JSON.stringify(fileInfo.error) || null,
      data: fileInfo.parsed ? fileInfo.data : null,
      stderr: fileInfo.parsed ? fileInfo.stderr : null,
      duration: fileInfo.parsed ? fileInfo.data.format.duration : null,
      file_valid: file_valid || null,
      url: body.url || null,
      author_details: decodedToken || null,
      created_at: new Date().toISOString()
    }

    const docRef = await firestore.collection('video_validation_logs').add(logData);
    console.log("Logged to Firebase with ID:", docRef.id);
  } catch (err) {
    console.error("Failed to log error to Firebase:", err);
  }
};

export { logVideoValidationToFirebase }