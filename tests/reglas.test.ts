// Pruebas de las reglas de Firestore (RNF-01, CA-01, CA-07, CA-08).
// Requiere el emulador de Firestore en 127.0.0.1:8080 (npm run emulators).
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const nino = (id: string, acudientes: string[], extra: object = {}) => ({
  nombres: id, apellidos: 'Prueba', fechaNacimiento: '2021-05-01', sexo: 'F', acudientesIds: acudientes, estado: 'activo', categoriaId: 'c1',
  consentimientos: { usoImagen: { autorizado: true }, tratamientoDatos: { autorizado: true }, actividadFisica: { autorizado: true } }, ...extra,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-reglas',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => { await env.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await db.doc('usuarios/coach').set({ rol: 'entrenador' });
    await db.doc('usuarios/ana').set({ rol: 'padre' });
    await db.doc('usuarios/beto').set({ rol: 'padre' });
    await db.doc('ninos/n_ana').set(nino('n_ana', ['ana']));
    await db.doc('ninos/n_beto').set(nino('n_beto', ['beto']));
    await db.doc('ninos/n_sinimg').set(nino('n_sinimg', ['ana'], { consentimientos: { usoImagen: { autorizado: false } } }));
    await db.doc('pagos/p_beto').set({ ninoId: 'n_beto', acudientesIds: ['beto'], estado: 'pendiente' });
  });
});

const como = (uid: string) => env.authenticatedContext(uid).firestore();

describe('CA-01: un padre solo ve a sus hijos', () => {
  it('lee el perfil de su hijo', () => assertSucceeds(como('ana').doc('ninos/n_ana').get()));
  it('no lee el perfil de otro niño', () => assertFails(como('ana').doc('ninos/n_beto').get()));
  it('no lee pagos de otra familia', () => assertFails(como('ana').doc('pagos/p_beto').get()));
  it('consulta solo lo suyo con array-contains', () => assertSucceeds(como('ana').collection('ninos').where('acudientesIds', 'array-contains', 'ana').get()));
  it('no puede listar todos los niños', () => assertFails(como('ana').collection('ninos').get()));
  it('el entrenador lee todo', () => assertSucceeds(como('coach').collection('ninos').get()));
  it('un visitante no lee nada', () => assertFails(env.unauthenticatedContext().firestore().doc('ninos/n_ana').get()));
});

describe('Inscripción y roles', () => {
  it('un padre se registra solo como padre', () => assertFails(como('nuevo').doc('usuarios/nuevo').set({ rol: 'entrenador', estado: 'activo' })));
  it('un padre no puede volverse entrenador', () => assertFails(como('ana').doc('usuarios/ana').update({ rol: 'entrenador' })));
  const sinCategoria = (estado: string) => { const { categoriaId: _c, ...resto } = nino('x', ['ana']); void _c; return { ...resto, estado }; };
  it('inscribe a un hijo como pendiente', () => assertSucceeds(como('ana').doc('ninos/nuevo').set(sinCategoria('pendiente_aprobacion'))));
  it('no puede inscribirlo ya activo', () => assertFails(como('ana').doc('ninos/nuevo2').set(sinCategoria('activo'))));
  it('no puede inscribir a nombre de otro acudiente', () => assertFails(como('ana').doc('ninos/nuevo4').set({ ...sinCategoria('pendiente_aprobacion'), acudientesIds: ['beto'] })));
  it('no puede asignarse categoría', () => assertFails(como('ana').doc('ninos/nuevo3').set({ ...nino('x', ['ana']), estado: 'pendiente_aprobacion' })));
});

describe('CA-07: los cambios requieren aprobación', () => {
  it('el padre no edita el perfil activo directamente', () => assertFails(como('ana').doc('ninos/n_ana').update({ 'salud.alergias': 'Maní' })));
  it('el padre crea una solicitud de cambio', () => assertSucceeds(como('ana').collection('solicitudesCambio').add({ ninoId: 'n_ana', acudientesIds: ['ana'], solicitadoPor: 'ana', estado: 'pendiente' })));
  it('el padre no aprueba su propia solicitud', async () => {
    const ref = await como('ana').collection('solicitudesCambio').add({ ninoId: 'n_ana', acudientesIds: ['ana'], solicitadoPor: 'ana', estado: 'pendiente' });
    await assertFails(ref.update({ estado: 'aprobado' }));
  });
  it('no puede pedir cambios sobre un niño ajeno', () => assertFails(como('ana').collection('solicitudesCambio').add({ ninoId: 'n_beto', acudientesIds: ['beto'], solicitadoPor: 'ana', estado: 'pendiente' })));
  it('el padre no marca pagos ni asistencia', async () => {
    await assertFails(como('beto').doc('pagos/p_beto').update({ estado: 'pagado' }));
    await assertFails(como('ana').doc('asistencias/x').set({ ninoId: 'n_ana', acudientesIds: ['ana'], estado: 'asistio' }));
  });
});

describe('CA-08: sin autorización de imagen no hay fotos', () => {
  it('el entrenador guarda resultados con fotos si hay autorización', () =>
    assertSucceeds(como('coach').doc('resultadosPruebas/r1').set({ ninoId: 'n_ana', acudientesIds: ['ana'], medios: [{ tipo: 'foto', ruta: 'x' }] })));
  it('no puede adjuntar fotos sin autorización', () =>
    assertFails(como('coach').doc('resultadosPruebas/r2').set({ ninoId: 'n_sinimg', acudientesIds: ['ana'], medios: [{ tipo: 'foto', ruta: 'x' }] })));
  it('sí puede guardar el resultado sin fotos', () =>
    assertSucceeds(como('coach').doc('resultadosPruebas/r3').set({ ninoId: 'n_sinimg', acudientesIds: ['ana'], medios: [] })));
});

describe('Eventos y notificaciones', () => {
  it('el padre confirma asistencia de su hijo', () => assertSucceeds(como('ana').doc('confirmacionesEvento/e_n_ana').set({ eventoId: 'e', ninoId: 'n_ana', acudientesIds: ['ana'], respuesta: 'asistira', respondidoPor: 'ana' })));
  it('no confirma por un hijo ajeno', () => assertFails(como('ana').doc('confirmacionesEvento/e_n_beto').set({ eventoId: 'e', ninoId: 'n_beto', acudientesIds: ['beto'], respuesta: 'asistira', respondidoPor: 'ana' })));
  it('solo lee sus notificaciones', async () => {
    await env.withSecurityRulesDisabled((c) => c.firestore().doc('notificaciones/x').set({ usuarioId: 'beto', leida: false }));
    await assertFails(como('ana').doc('notificaciones/x').get());
    await assertSucceeds(como('beto').doc('notificaciones/x').update({ leida: true }));
    await assertFails(como('beto').doc('notificaciones/x').update({ titulo: 'hack' }));
  });
});
