// Botón "Ejecutar tareas de hoy" (solo entrenador). POST con Authorization: Bearer <token de sesión>.
import { supabase, tareasMatutinas, tareasNocturnas } from './lib.mts';

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') ?? '')?.[1];
  if (!token) return json({ error: 'Falta iniciar sesión.' }, 401);
  try {
    const sb = supabase();
    const { data: u, error } = await sb.auth.getUser(token);
    if (error || !u.user) return json({ error: 'Sesión no válida.' }, 401);
    const { data: fila } = await sb.from('usuarios').select('rol').eq('id', u.user.id).maybeSingle();
    if (fila?.rol !== 'entrenador') return json({ error: 'Solo el entrenador puede ejecutar las tareas.' }, 403);

    let fecha: string | undefined;
    try {
      const b = (await req.json()) as { fecha?: unknown };
      if (typeof b?.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.fecha)) fecha = b.fecha;
    } catch { /* sin cuerpo */ }

    const noche = await tareasNocturnas(fecha);
    const manana = await tareasMatutinas(fecha);
    return json({ ...noche, ...manana });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Error inesperado.' }, 500);
  }
};
