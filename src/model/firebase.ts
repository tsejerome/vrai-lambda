// Removed import of env.prod - using environment variables instead
import admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

let firestore: Firestore;
let firebase: any;

const setupFirebase = (serviceAccount: any, secondInstance = false) => {
  const appName = secondInstance ? 'dev' : '[DEFAULT]';

  // Check if the app already exists
  if (!admin.apps.some(app => app && app.name === appName)) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.firebase_database_url
    }, secondInstance ? 'dev' : undefined);
  }

  const app = admin.app(appName); // Get the initialized app instance


  firestore = app.firestore();
  firebase = app;
};

const initFirebase = async () => {
  if (!firebase || !firestore) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Parse the JSON string from environment variable
      console.log('Using FIREBASE_SERVICE_ACCOUNT_KEY from environment');
      console.log(typeof process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      setupFirebase(serviceAccount);
    } else {
      await import('../config/google-services-key.dev.json')
        .then((serviceAccount) => {
          setupFirebase(serviceAccount);
        });
    }
  }
  // if (!devFirebase || !devFirestore) {
  //   if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  //     // Parse the JSON string from environment variable for dev instance
  //     console.log('Using FIREBASE_SERVICE_ACCOUNT_KEY from environment for dev instance');
  //     const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  //     setupFirebase(serviceAccount, true);
  //   } else {
  //     await import('../config/google-services-key.dev.json')
  //       .then((serviceAccount) => {
  //         setupFirebase(serviceAccount, true);
  //       });
  //   }
  // }
};

export { firestore, firebase, initFirebase };
