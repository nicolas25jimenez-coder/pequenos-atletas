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
