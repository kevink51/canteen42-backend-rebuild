const admin = require('firebase-admin');

let firebaseInitialized = false;

const initializeFirebase = () => {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let serviceAccount;

      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (parseError) {
        console.log('Direct JSON parsing failed, trying alternative methods...');

        try {
          const cleanedJson = process.env.FIREBASE_SERVICE_ACCOUNT
            .replace(/\\"/g, '"')  // Replace escaped quotes
            .replace(/^"|"$/g, ''); // Remove surrounding quotes if present

          serviceAccount = JSON.parse(cleanedJson);
        } catch (secondError) {
          try {
            if (process.env.FIREBASE_SERVICE_ACCOUNT.match(/^[A-Za-z0-9+/=]+$/)) {
              const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString();
              serviceAccount = JSON.parse(decoded);
            } else {
              throw new Error('Not base64 encoded');
            }
          } catch (thirdError) {
            console.error('All parsing attempts failed:', parseError.message);
            throw parseError;
          }
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });

      firebaseInitialized = true;
      console.log('Firebase initialized successfully');
    } else {
      console.log('Firebase credentials not found, skipping initialization');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.error('FIREBASE_SERVICE_ACCOUNT is present but invalid. Length:',
        process.env.FIREBASE_SERVICE_ACCOUNT.length,
        'First 20 chars:', process.env.FIREBASE_SERVICE_ACCOUNT.substring(0, 20) + '...');
    }
  }
};

module.exports = {
  initializeFirebase,
  firebaseInitialized
};
