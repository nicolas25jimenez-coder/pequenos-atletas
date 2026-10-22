// Configuración de Firebase. Sin variables de entorno se usa el proyecto "demo-"
// que solo funciona con los emuladores locales (sin cuenta de Google).
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo-pequenos-atletas.firebaseapp.com',
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? 'demo-pequenos-atletas',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo-pequenos-atletas.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: env.VITE_FIREBASE_APP_ID ?? '1:000000000000:web:demo',
};

export const VAPID_KEY = env.VITE_FIREBASE_VAPID_KEY as string | undefined;

export const usaEmuladores = firebaseConfig.projectId.startsWith('demo-') || env.VITE_USE_EMULATORS === 'true';
