import admin from 'firebase-admin';

// v1.3.2+27: firebase-admin needs the PEM private key with actual
// newlines, but .env files store the value with escaped "\n" literals.
// Replacing the literal "\n" sequences with real newlines is the
// standard fix — without it admin.initializeApp throws a cryptic
// "Failed to parse private key" error at boot.
const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
const privateKey = rawKey.replace(/\\n/g, '\n');

try {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    console.warn('[firebase] Skipping init — FIREBASE_* env vars missing.');
  } else if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    console.info('Firebase Admin SDK initialized successfully!');
  }
} catch (error: any) {
  console.error('Error initializing Firebase Admin SDK:', error.message);
}

export default admin;
