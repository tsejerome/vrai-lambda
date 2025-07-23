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

const parseServiceAccountKey = (envVar: string): any => {
  try {
    // First, try direct JSON parsing
    return JSON.parse(envVar);
  } catch (directParseError) {
    const directError = directParseError as Error;

    try {
      // Try Base64 decoding (in case it's base64 encoded)
      const decoded = Buffer.from(envVar, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (base64Error) {
      const base64Err = base64Error as Error;

      try {
        // Try to fix common quote issues by adding quotes back
        let fixed = envVar;

        // Replace unquoted keys/values with quoted ones
        fixed = fixed.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Fix unquoted keys
        fixed = fixed.replace(/:\s*([^",{}\[\]]+)([,}])/g, ':"$1"$2'); // Fix unquoted values

        return JSON.parse(fixed);
      } catch (fixError) {
        const fixErr = fixError as Error;

        // Log the raw environment variable for debugging
        throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${directError.message}`);
      }
    }
  }
};

const initFirebase = async () => {
  if (!firebase || !firestore) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = parseServiceAccountKey(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        setupFirebase(serviceAccount);
      } else {
        // Fallback to local file
        console.log('Using local service account file...');
        const serviceAccount = await import('../config/google-services-key.dev.json');
        setupFirebase(serviceAccount);
      }
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      throw error;
    }
  }
};

export { firestore, firebase, initFirebase };
