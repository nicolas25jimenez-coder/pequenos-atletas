// Configuración de la app. Las claves vienen de app/.env.local (en Netlify, de sus variables).
const env = import.meta.env;

export const supabaseUrl = ((env.VITE_SUPABASE_URL as string | undefined) ?? '').trim();
export const supabaseAnonKey = ((env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '').trim();

/** true si están las dos claves de Supabase. Si es false, la app no puede conectarse. */
export const configurado = !!supabaseUrl && !!supabaseAnonKey;

if (!configurado) {
  console.error(
    '[Pequeños Atletas] Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
    'Copia app/.env.example como app/.env.local y pega ahí las claves de tu proyecto de Supabase.',
  );
}

// --- Restos de Firebase (se borran en la Fase 3, cuando ninguna pantalla los use) ---
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
