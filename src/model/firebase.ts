import admin = require('firebase-admin');
import { Firestore } from '@google-cloud/firestore';

let firestore: Firestore;
let firebase: any;

const setupFirebase = (serviceAccount: any, secondInstance = false) => {
  console.log
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

  firestore = app.firestore();
  firestore.settings({ ignoreUndefinedProperties: true });
  firebase = app;
};

const initFirebase = async () => {
  if (!firebase || !firestore) {
    setupFirebase(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string));
  }

};

export { firestore, firebase, initFirebase };
