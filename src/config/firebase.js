const admin = require('firebase-admin');
require('dotenv').config();

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return;
  
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      
      firebaseInitialized = true;
      console.log('Firebase initialized');
    } else {
      console.log('Firebase credentials not found, skipping initialization');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};

module.exports = {
  admin,
  initializeFirebase
};
