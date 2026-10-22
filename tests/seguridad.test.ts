// Pruebas de seguridad (RLS) contra el Supabase real (RNF-01, CA-01, CA-07, CA-08).
// Necesita app/.env.local con VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY.
// Crea cuentas y datos temporales (prefijo "t_") y los borra al terminar.
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

config({ path: 'app/.env.local' });
const URL = process.env.VITE_SUPABASE_URL!;
const ANON = process.env.VITE_SUPABASE_ANON_KEY!;
const SECRETA = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const opciones = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, SECRETA, opciones);
const CLAVE = 'PruebaSeguridad#2026';
const SUFIJO = Date.now();

const ids: Record<string, string> = {};
const clientes: Record<string, SupabaseClient> = {};

async function crearCuenta(alias: string, rol: 'padre' | 'entrenador') {
  const correo = `t_${alias}_${SUFIJO}@pruebas.test`;
  const { data, error } = await admin.auth.admin.createUser({ email: correo, password: CLAVE, email_confirm: true });
  if (error) throw error;
  ids[alias] = data.user.id;
  const r = await admin.from('usuarios').upsert({ id: data.user.id, datos: { rol, estado: 'activo', correo, nombres: alias, apellidos: 'Prueba' } });
  if (r.error) throw r.error;
  const c = createClient(URL, ANON, opciones);
  const { error: e2 } = await c.auth.signInWithPassword({ email: correo, password: CLAVE });
  if (e2) throw e2;
  clientes[alias] = c;
}

const nino = (acudientes: string[], extra: Record<string, unknown> = {}) => ({
  nombres: 'Niño', apellidos: 'Prueba', fechaNacimiento: '2021-05-01', sexo: 'F', acudientesIds: acudientes,
  estado: 'activo', categoriaId: 'c1',
  consentimientos: { usoImagen: { autorizado: true }, tratamientoDatos: { autorizado: true }, actividadFisica: { autorizado: true } },
  ...extra,
});

type Resp = PromiseLike<{ data: unknown; error: unknown }>;
/** Una escritura "falla" si da error o si no tocó ninguna fila (RLS filtra en silencio). */
async function bloqueada(p: Resp) {
  const { data, error } = await p;
  return Boolean(error) || (Array.isArray(data) && data.length === 0);
}
async function permitida(p: Resp) {
  const { data, error } = await p;
  if (error) console.error(error);
  return !error && (!Array.isArray(data) || data.length > 0);
}

beforeAll(async () => {
  await crearCuenta('coach', 'entrenador');
  await crearCuenta('ana', 'padre');
  await crearCuenta('beto', 'padre');
  const f = [
    admin.from('ninos').upsert({ id: 't_n_ana', datos: nino([ids.ana]) }),
    admin.from('ninos').upsert({ id: 't_n_beto', datos: nino([ids.beto]) }),
    admin.from('ninos').upsert({ id: 't_n_sinimg', datos: nino([ids.ana], { consentimientos: { usoImagen: { autorizado: false } } }) }),
  ];
  for (const r of await Promise.all(f)) if (r.error) throw r.error;
  const r = await admin.from('pagos').upsert({ id: 't_p_beto', datos: { ninoId: 't_n_beto', acudientesIds: [ids.beto], estado: 'pendiente', periodo: '2026-10' } });
  if (r.error) throw r.error;
});

afterAll(async () => {
  await admin.from('notificaciones').delete().in('usuario_id', Object.values(ids));
  for (const t of ['confirmaciones_evento', 'solicitudes_cambio', 'resultados_pruebas', 'asistencias', 'pagos', 'ninos']) {
    await admin.from(t).delete().like('id', 't\\_%');
  }
  for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id);
});

describe('CA-01: un padre solo ve a sus hijos', () => {
  it('lee el perfil de su hijo', async () => {
    const { data } = await clientes.ana.from('ninos').select('id').eq('id', 't_n_ana');
    expect(data).toHaveLength(1);
  });
  it('no lee el perfil de otro niño', async () => {
    const { data } = await clientes.ana.from('ninos').select('id').eq('id', 't_n_beto');
    expect(data).toHaveLength(0);
  });
  it('no lee pagos de otra familia', async () => {
    const { data } = await clientes.ana.from('pagos').select('id').eq('id', 't_p_beto');
    expect(data).toHaveLength(0);
  });
  it('al listar niños solo aparecen los suyos', async () => {
    const { data } = await clientes.ana.from('ninos').select('id').like('id', 't\\_%');
    expect(data!.map((x) => x.id).sort()).toEqual(['t_n_ana', 't_n_sinimg']);
  });
  it('el entrenador lee todo', async () => {
    const { data } = await clientes.coach.from('ninos').select('id').like('id', 't\\_%');
    expect(data).toHaveLength(3);
  });
  it('un visitante no lee nada', async () => {
    const anonimo = createClient(URL, ANON, opciones);
    const { data } = await anonimo.from('ninos').select('id');
    expect(data ?? []).toHaveLength(0);
  });
});

describe('Inscripción y roles', () => {
  const sinCategoria = (estado: string, acudientes: string[]) => {
    const { categoriaId: _c, ...resto } = nino(acudientes); void _c;
    return { ...resto, estado };
  };
  it('un padre no puede volverse entrenador', async () => {
    expect(await bloqueada(clientes.ana.from('usuarios').update({ datos: { rol: 'entrenador', estado: 'activo', correo: 'x@x.co' } }).eq('id', ids.ana).select())).toBe(true);
    const { data } = await admin.from('usuarios').select('datos').eq('id', ids.ana).single();
    expect(data!.datos.rol).toBe('padre');
  });
  it('inscribe a un hijo como pendiente', async () => {
    expect(await permitida(clientes.ana.from('ninos').insert({ id: 't_nuevo', datos: sinCategoria('pendiente_aprobacion', [ids.ana]) }).select())).toBe(true);
  });
  it('no puede inscribirlo ya activo', async () => {
    expect(await bloqueada(clientes.ana.from('ninos').insert({ id: 't_nuevo2', datos: sinCategoria('activo', [ids.ana]) }).select())).toBe(true);
  });
  it('no puede inscribir a nombre de otro acudiente', async () => {
    expect(await bloqueada(clientes.ana.from('ninos').insert({ id: 't_nuevo3', datos: sinCategoria('pendiente_aprobacion', [ids.beto]) }).select())).toBe(true);
  });
  it('no puede asignarse categoría', async () => {
    expect(await bloqueada(clientes.ana.from('ninos').insert({ id: 't_nuevo4', datos: { ...nino([ids.ana]), estado: 'pendiente_aprobacion' } }).select())).toBe(true);
  });
});

describe('CA-07: los cambios requieren aprobación', () => {
  it('el padre no edita el perfil activo directamente', async () => {
    expect(await bloqueada(clientes.ana.from('ninos').update({ datos: nino([ids.ana], { salud: { alergias: 'Maní' } }) }).eq('id', 't_n_ana').select())).toBe(true);
  });
  const solicitud = (ninoId: string, acudientes: string[], por: string) => ({ ninoId, acudientesIds: acudientes, solicitadoPor: por, estado: 'pendiente' });
  it('el padre crea una solicitud de cambio', async () => {
    expect(await permitida(clientes.ana.from('solicitudes_cambio').insert({ id: 't_s1', datos: solicitud('t_n_ana', [ids.ana], ids.ana) }).select())).toBe(true);
  });
  it('el padre no aprueba su propia solicitud', async () => {
    expect(await bloqueada(clientes.ana.from('solicitudes_cambio').update({ datos: { ...solicitud('t_n_ana', [ids.ana], ids.ana), estado: 'aprobado' } }).eq('id', 't_s1').select())).toBe(true);
  });
  it('no puede pedir cambios sobre un niño ajeno', async () => {
    expect(await bloqueada(clientes.ana.from('solicitudes_cambio').insert({ id: 't_s2', datos: solicitud('t_n_beto', [ids.beto], ids.ana) }).select())).toBe(true);
  });
  it('el padre no marca pagos ni asistencia', async () => {
    expect(await bloqueada(clientes.beto.from('pagos').update({ datos: { ninoId: 't_n_beto', acudientesIds: [ids.beto], estado: 'pagado' } }).eq('id', 't_p_beto').select())).toBe(true);
    expect(await bloqueada(clientes.ana.from('asistencias').insert({ id: 't_a1', datos: { ninoId: 't_n_ana', acudientesIds: [ids.ana], estado: 'asistio' } }).select())).toBe(true);
  });
});

describe('CA-08: sin autorización de imagen no hay fotos', () => {
  const resultado = (ninoId: string, acudientes: string[], medios: unknown[]) => ({ ninoId, acudientesIds: acudientes, medios });
  it('el entrenador guarda resultados con fotos si hay autorización', async () => {
    expect(await permitida(clientes.coach.from('resultados_pruebas').insert({ id: 't_r1', datos: resultado('t_n_ana', [ids.ana], [{ tipo: 'foto', ruta: 'x' }]) }).select())).toBe(true);
  });
  it('no puede adjuntar fotos sin autorización', async () => {
    expect(await bloqueada(clientes.coach.from('resultados_pruebas').insert({ id: 't_r2', datos: resultado('t_n_sinimg', [ids.ana], [{ tipo: 'foto', ruta: 'x' }]) }).select())).toBe(true);
  });
  it('sí puede guardar el resultado sin fotos', async () => {
    expect(await permitida(clientes.coach.from('resultados_pruebas').insert({ id: 't_r3', datos: resultado('t_n_sinimg', [ids.ana], []) }).select())).toBe(true);
  });
});

describe('Eventos y notificaciones', () => {
  const conf = (ninoId: string, acudientes: string[]) => ({ eventoId: 'e', ninoId, acudientesIds: acudientes, respuesta: 'asistira', respondidoPor: ids.ana });
  it('el padre confirma asistencia de su hijo', async () => {
    expect(await permitida(clientes.ana.from('confirmaciones_evento').insert({ id: 't_c1', datos: conf('t_n_ana', [ids.ana]) }).select())).toBe(true);
  });
  it('no confirma por un hijo ajeno', async () => {
    expect(await bloqueada(clientes.ana.from('confirmaciones_evento').insert({ id: 't_c2', datos: conf('t_n_beto', [ids.beto]) }).select())).toBe(true);
  });
  it('solo lee y marca como leídas sus notificaciones', async () => {
    const r = await admin.from('notificaciones').insert({ id: 't_notif', datos: { usuarioId: ids.beto, leida: false, titulo: 'Hola' } });
    expect(r.error).toBeNull();
    const ajena = await clientes.ana.from('notificaciones').select('id').eq('id', 't_notif');
    expect(ajena.data).toHaveLength(0);
    expect(await permitida(clientes.beto.from('notificaciones').update({ datos: { usuarioId: ids.beto, leida: true, titulo: 'Hola' } }).eq('id', 't_notif').select())).toBe(true);
    expect(await bloqueada(clientes.beto.from('notificaciones').update({ datos: { usuarioId: ids.beto, leida: true, titulo: 'hack' } }).eq('id', 't_notif').select())).toBe(true);
  });
});
