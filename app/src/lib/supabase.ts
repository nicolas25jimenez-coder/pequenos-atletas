// Cliente único de Supabase (base de datos, login y archivos).
import { createClient } from '@supabase/supabase-js';
import { configurado, supabaseAnonKey, supabaseUrl } from './config';

const BANDERA = 'pa-recordar-sesion';

/** true si el usuario marcó "Recordarme" (por defecto sí). */
export function recordarSesion(): boolean {
  try { return localStorage.getItem(BANDERA) !== '0'; } catch { return true; }
}
/** Decide dónde se guarda la sesión: localStorage (recordar) o sessionStorage (hasta cerrar la pestaña). */
export function fijarRecordar(recordar: boolean) {
  try { localStorage.setItem(BANDERA, recordar ? '1' : '0'); } catch { /* sin almacenamiento */ }
}

/** Almacén propio: elige localStorage o sessionStorage según la bandera. */
const almacen = {
  getItem(k: string): string | null {
    try {
      const [a, b] = recordarSesion() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
      return a.getItem(k) ?? b.getItem(k);
    } catch { return null; }
  },
  setItem(k: string, v: string) {
    try {
      const [a, b] = recordarSesion() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
      a.setItem(k, v);
      b.removeItem(k);
    } catch { /* sin almacenamiento */ }
  },
  removeItem(k: string) {
    try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* sin almacenamiento */ }
  },
};

export const supabase = createClient(
  configurado ? supabaseUrl : 'http://localhost:54321',
  configurado ? supabaseAnonKey : 'sin-configurar',
  {
    auth: { storage: almacen, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 10 } },
  },
);

/** Convierte un error de Supabase (base de datos, archivos o login) en un Error con mensaje en español. */
export function traducirError(e: unknown): Error {
  const x = e as { message?: string; code?: string; status?: number; statusCode?: string | number; name?: string } | null;
  const msg = (x?.message ?? '').toLowerCase();
  const code = x?.code ?? '';
  let texto: string | null = null;
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) texto = 'Sin conexión. Revisa tu internet.';
  else if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied') || msg.includes('not authorized')) texto = 'No tienes permiso para hacer esto.';
  else if (code === '23505' || msg.includes('duplicate key')) texto = 'Ese registro ya existe.';
  else if (code === '23503') texto = 'Falta un dato relacionado (por ejemplo, el niño ya no existe).';
  else if (code === '23502') texto = 'Falta un dato obligatorio.';
  else if (code === 'P0001' || code === '23514') texto = x?.message ?? null; // reglas escritas en la base de datos
  else if (msg.includes('invalid login credentials')) texto = 'Correo o contraseña incorrectos.';
  else if (msg.includes('email not confirmed')) texto = 'Aún no confirmas tu correo. Abre el enlace que te enviamos.';
  else if (msg.includes('user already registered') || msg.includes('already been registered')) texto = 'Ya existe una cuenta con ese correo. Inicia sesión.';
  else if (msg.includes('password should be at least') || code === 'weak_password') texto = 'La contraseña debe tener al menos 8 caracteres.';
  else if (msg.includes('rate limit') || code === 'over_email_send_rate_limit' || x?.status === 429) texto = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
  else if (msg.includes('same password') || code === 'same_password') texto = 'La nueva contraseña debe ser distinta a la anterior.';
  else if (msg.includes('invalid email') || code === 'email_address_invalid') texto = 'El correo no es válido.';
  else if (msg.includes('session') && msg.includes('missing')) texto = 'Tu sesión venció. Vuelve a iniciar sesión.';
  else if (msg.includes('bucket not found') || msg.includes('object not found')) texto = 'No se encontró el archivo.';
  else if (msg.includes('exceeded the maximum allowed size') || msg.includes('too large')) texto = 'El archivo es demasiado grande.';
  if (e instanceof Error && texto === null) return e;
  return new Error(texto ?? x?.message ?? 'Ocurrió un error inesperado.');
}
