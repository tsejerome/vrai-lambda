// Removed import of env.prod - using environment variables instead
import admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

let firestore: Firestore;
let firebase: any;
let devFirestore: Firestore;
let devFirebase: any;

const setupFirebase = (serviceAccount: any, secondInstance = false) => {
  const params = {
    type: serviceAccount.type,
    projectId: serviceAccount.project_id,
    privateKeyId: serviceAccount.private_key_id,
    privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'), // Ensure private keys with escaped newlines are correctly formatted
    clientEmail: serviceAccount.client_email,
    clientId: serviceAccount.client_id,
    authUri: serviceAccount.auth_uri,
    tokenUri: serviceAccount.token_uri,
    authProviderX509CertUrl: serviceAccount.auth_provider_x509_cert_url,
    clientC509CertUrl: serviceAccount.client_x509_cert_url,
  };

  const appName = secondInstance ? 'dev' : '[DEFAULT]';

  // Check if the app already exists
  if (!admin.apps.some(app => app && app.name === appName)) {
    admin.initializeApp({
      credential: admin.credential.cert(params),
      databaseURL: process.env.firebase_database_url
    }, secondInstance ? 'dev' : undefined);
  }

  const app = admin.app(appName); // Get the initialized app instance

  if (secondInstance) {
    devFirestore = app.firestore();
    devFirebase = app;
  } else {
    firestore = app.firestore();
    firebase = app;
  }
};

const initFirebase = async () => {
  if (!firebase || !firestore) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Use service account key from environment variable
      console.log('FIREBASE_SERVICE_ACCOUNT_KEY', process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      setupFirebase(serviceAccount);
    } else {
      await import('../config/google-services-key.dev.json')
        .then((serviceAccount) => {
          setupFirebase(serviceAccount);
        });
    }
  }
  if (!devFirebase || !devFirestore) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Use service account key from environment variable for dev instance
      console.log('FIREBASE_SERVICE_ACCOUNT_KEY', process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      setupFirebase(serviceAccount, true);
    } else {
      await import('../config/google-services-key.dev.json')
        .then((serviceAccount) => {
          setupFirebase(serviceAccount, true);
        });
    }
  }
};

export { firestore, firebase, devFirestore, devFirebase, initFirebase };
