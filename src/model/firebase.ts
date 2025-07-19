// Removed import of env.prod - using environment variables instead
import admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

let firestore: Firestore;
let firebase: any;

const initFirebase = async () => {
  try {
    // Only initialize if not already initialized
    if (!firebase || !firestore) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        // Safely parse the Firebase service account key from environment variables
        console.log('Using FIREBASE_SERVICE_ACCOUNT_KEY from environment');
        console.log(typeof process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string || '{}');

        // Check if the serviceAccount object is valid before initializing Firebase Admin
        if (!Object.keys(serviceAccount).length) {
          throw new Error('Firebase service account key is missing or invalid');
        }

        // Initialize Firebase Admin only if it's not already initialized
        if (!admin.apps.length) {
          console.log('Initializing Firebase Admin');
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.firebase_database_url
          });
        }

        // Get the default app instance
        const app = admin.app();
        firestore = app.firestore();
        firebase = app;

      } else {
        // Fallback to local service account file
        const serviceAccount = await import('../config/google-services-key.dev.json');

        if (!admin.apps.length) {
          console.log('Initializing Firebase Admin with local service account');
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as any),
            databaseURL: process.env.firebase_database_url
          });
        }

        const app = admin.app();
        firestore = app.firestore();
        firebase = app;
      }
    }

  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    // Handle or throw the error based on your application requirements
    throw error;
  }
};

export { firestore, firebase, initFirebase };

