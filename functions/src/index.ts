// Cloud Functions de Pequeños Atletas (SPEC §9).
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  ahoraIso, cop, diferenciaDias, fechaChip, hora12, hoy, nombreMes, normalizarCorreo,
  type Anuncio, type Asistencia, type Invitacion, type Nino, type Pago, type Sesion, type SolicitudCambio, type Usuario,
} from '@pa/shared';
import { idsEntrenador, notificar } from './notificar';
import { tareasMatutinas, tareasNocturnas } from './tareas';

initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 5 });
const db = () => getFirestore();
const ZONA = 'America/Bogota';

// ───────── Programadas ─────────
export const cicloNocturno = onSchedule({ schedule: '5 0 * * *', timeZone: ZONA }, async () => { await tareasNocturnas(); });
export const recordatoriosMatutinos = onSchedule({ schedule: '0 7 * * *', timeZone: ZONA }, async () => { await tareasMatutinas(); });

/** Permite al entrenador ejecutar las tareas a mano (útil en los emuladores, donde no corren solas). */
export const ejecutarTareas = onCall(async (req) => {
  const uid = req.auth?.uid;
  const u = uid ? (await db().doc(`usuarios/${uid}`).get()).data() : null;
  if (u?.rol !== 'entrenador') throw new HttpsError('permission-denied', 'Solo el entrenador.');
  const fecha = typeof req.data?.fecha === 'string' ? req.data.fecha : undefined;
  const noche = await tareasNocturnas(fecha);
  const manana = await tareasMatutinas(fecha);
  return { ...noche, ...manana };
});

// ───────── Inscripciones (N11, N13) ─────────
export const alCrearNino = onDocumentCreated('ninos/{id}', async (e) => {
  const n = e.data?.data() as Nino | undefined;
  if (!n || n.estado !== 'pendiente_aprobacion') return;
  await notificar(await idsEntrenador(), {
    tipo: 'nueva_inscripcion', titulo: 'Nueva inscripción', cuerpo: `${n.nombres} ${n.apellidos} espera tu aprobación.`, enlace: `/e/inscripciones/${e.params.id}`,
  });
});

export const alActualizarNino = onDocumentUpdated('ninos/{id}', async (e) => {
  const antes = e.data?.before.data() as Nino, despues = e.data?.after.data() as Nino;
  if (!antes || !despues || antes.estado !== 'pendiente_aprobacion') return;
  if (despues.estado === 'activo') {
    const cat = despues.categoriaId ? (await db().doc(`categorias/${despues.categoriaId}`).get()).data() : null;
    await notificar(despues.acudientesIds, {
      tipo: 'inscripcion_resuelta', titulo: `¡Bienvenido, ${despues.nombres}! 🎉`,
      cuerpo: `La inscripción fue aprobada${cat ? ` en la categoría ${cat.nombre}` : ''}. Ya puedes ver su perfil, horarios y pagos.`, enlace: `/p/hijo?nino=${e.params.id}`,
    });
  } else if (despues.estado === 'rechazado') {
    await notificar(despues.acudientesIds, {
      tipo: 'inscripcion_resuelta', titulo: 'Inscripción no aprobada',
      cuerpo: `La inscripción de ${despues.nombres} no fue aprobada${despues.motivoRechazo ? `: ${despues.motivoRechazo}` : ''}.`, enlace: '/p/mas',
    });
  }
});

// ───────── Asistencia (N05) ─────────
export const alGuardarAsistencia = onDocumentWritten('asistencias/{id}', async (e) => {
  const antes = e.data?.before.data() as Asistencia | undefined;
  const despues = e.data?.after.data() as Asistencia | undefined;
  if (!despues || despues.estado !== 'falto' || antes?.estado === 'falto') return;
  if (diferenciaDias(despues.fecha, hoy()) > 2) return; // no se avisan faltas antiguas (correcciones del historial)
  const [n, s] = await Promise.all([db().doc(`ninos/${despues.ninoId}`).get(), db().doc(`sesiones/${despues.sesionId}`).get()]);
  const nino = n.data() as Nino | undefined, sesion = s.data() as Sesion | undefined;
  if (!nino || !sesion) return;
  const tipo = sesion.tipo === 'control' ? 'al día de control' : 'al entrenamiento';
  await notificar(despues.acudientesIds, {
    tipo: 'inasistencia', titulo: `${nino.nombres} no asistió`,
    cuerpo: `${fechaChip(sesion.fecha)}: ${nino.nombres} no asistió ${tipo} de las ${hora12(sesion.horaInicio)} Si fue por una razón justificada, avísale al entrenador.`,
    enlace: `/p/asistencia?nino=${despues.ninoId}`,
  });
});

// ───────── Sesiones: cancelación (N10) y resultados (N06) ─────────
export const alActualizarSesion = onDocumentUpdated('sesiones/{id}', async (e) => {
  const antes = e.data?.before.data() as Sesion, despues = e.data?.after.data() as Sesion;
  if (!antes || !despues) return;
  if (antes.estado !== 'cancelada' && despues.estado === 'cancelada') {
    const ninos = await db().collection('ninos').where('categoriaId', '==', despues.categoriaId).where('estado', '==', 'activo').get();
    await notificar(ninos.docs.flatMap((d) => (d.data() as Nino).acudientesIds), {
      tipo: 'sesion_cancelada', titulo: 'Sesión cancelada',
      cuerpo: `La sesión del ${fechaChip(despues.fecha)} (${hora12(despues.horaInicio)}) fue cancelada${despues.motivoCancelacion ? `: ${despues.motivoCancelacion}` : ''}.`,
      enlace: '/p/asistencia',
    });
  }
  if (!antes.resultadosGuardados && despues.resultadosGuardados) {
    const res = await db().collection('resultadosPruebas').where('sesionId', '==', e.params.id).get();
    const porNino = new Map<string, string[]>();
    for (const d of res.docs) { const r = d.data(); if (!r.noRealizada) porNino.set(r.ninoId, r.acudientesIds); }
    for (const [ninoId, acudientes] of porNino) {
      const nino = (await db().doc(`ninos/${ninoId}`).get()).data() as Nino | undefined;
      await notificar(acudientes, {
        tipo: 'resultados', titulo: `🏅 ¡Nuevos resultados de ${nino?.nombres ?? 'tu hijo'}!`,
        cuerpo: 'Ya están los resultados del día de control. Mira su progreso.', enlace: `/p/hijo/pruebas?nino=${ninoId}`,
      });
    }
  }
});

// ───────── Pagos (N04) ─────────
export const alActualizarPago = onDocumentUpdated('pagos/{id}', async (e) => {
  const antes = e.data?.before.data() as Pago, despues = e.data?.after.data() as Pago;
  if (!antes || !despues || antes.estado === 'pagado' || despues.estado !== 'pagado') return;
  const nino = (await db().doc(`ninos/${despues.ninoId}`).get()).data() as Nino | undefined;
  await notificar(despues.acudientesIds, {
    tipo: 'pago_registrado', titulo: 'Pago registrado ✅',
    cuerpo: `Recibimos el pago de ${nombreMes(despues.periodo).toLowerCase()} de ${nino?.nombres ?? 'tu hijo'} por ${cop(despues.valorAPagar)}. ¡Gracias!`,
    enlace: `/p/pagos?nino=${despues.ninoId}`,
  });
});

// ───────── Solicitudes de cambio (N12, N14) ─────────
export const alCrearSolicitud = onDocumentCreated('solicitudesCambio/{id}', async (e) => {
  const s = e.data?.data() as SolicitudCambio | undefined;
  if (!s) return;
  await notificar(await idsEntrenador(), {
    tipo: 'nueva_solicitud', titulo: 'Solicitud de cambio', cuerpo: `${s.solicitadoPorNombre}: ${s.etiqueta}.`, enlace: '/e/solicitudes',
  });
});

export const alResolverSolicitud = onDocumentUpdated('solicitudesCambio/{id}', async (e) => {
  const antes = e.data?.before.data() as SolicitudCambio, despues = e.data?.after.data() as SolicitudCambio;
  if (!antes || !despues || antes.estado !== 'pendiente' || despues.estado === 'pendiente') return;
  const ok = despues.estado === 'aprobado';
  await notificar([despues.solicitadoPor], {
    tipo: 'solicitud_resuelta', titulo: ok ? 'Cambio aprobado' : 'Cambio no aprobado',
    cuerpo: `${despues.etiqueta}: ${ok ? `ahora es “${despues.valorPropuesto}”` : 'se mantiene el valor actual'}.${despues.comentarioEntrenador ? ` ${despues.comentarioEntrenador}` : ''}`,
    enlace: `/p/hijo?nino=${despues.ninoId}`,
  });
});

// ───────── Anuncios (N09) ─────────
export const alCrearAnuncio = onDocumentCreated('anuncios/{id}', async (e) => {
  const a = e.data?.data() as Anuncio | undefined;
  if (!a || !a.enviarPush) return;
  const activos = (await db().collection('ninos').where('estado', '==', 'activo').get()).docs.map((d) => ({ id: d.id, ...d.data() }) as Nino);
  const destino = a.destinatarios.tipo === 'todas' ? activos
    : a.destinatarios.tipo === 'categorias' ? activos.filter((n) => (a.destinatarios as { ids: string[] }).ids.includes(n.categoriaId ?? ''))
    : activos.filter((n) => (a.destinatarios as { ids: string[] }).ids.includes(n.id));
  await notificar(destino.flatMap((n) => n.acudientesIds), { tipo: 'anuncio', titulo: a.titulo, cuerpo: a.mensaje, enlace: '/p/anuncios' });
});

// ───────── Segundo acudiente: invitación por correo (RF-P10) ─────────
async function vincularInvitaciones(uid: string, correo: string) {
  const inv = await db().collection('invitaciones').where('correo', '==', normalizarCorreo(correo)).where('estado', '==', 'pendiente').get();
  if (inv.empty) return 0;
  const u = (await db().doc(`usuarios/${uid}`).get()).data() as Usuario | undefined;
  const nombre = u ? `${u.nombres} ${u.apellidos}` : correo;
  for (const d of inv.docs) {
    const i = d.data() as Invitacion;
    for (const ninoId of i.ninosIds) {
      await db().runTransaction(async (tx) => {
        const ref = db().doc(`ninos/${ninoId}`);
        const n = (await tx.get(ref)).data() as Nino | undefined;
        if (!n || n.acudientesIds.includes(uid)) return;
        const acudientesIds = [...n.acudientesIds, uid];
        tx.update(ref, { acudientesIds, acudientes: [...n.acudientes, { usuarioId: uid, nombre, parentesco: i.parentesco, esPrincipal: false }], actualizadoEn: ahoraIso() });
        // Copia el acceso a los documentos ya existentes del niño.
        for (const col of ['asistencias', 'medicionesFisicas', 'pagos', 'resultadosPruebas', 'confirmacionesEvento', 'solicitudesCambio']) {
          const docs = await db().collection(col).where('ninoId', '==', ninoId).get();
          docs.forEach((x) => tx.update(x.ref, { acudientesIds }));
        }
      });
    }
    await d.ref.update({ estado: 'aceptada', actualizadoEn: ahoraIso() });
  }
  return inv.size;
}

export const alCrearUsuario = onDocumentCreated('usuarios/{id}', async (e) => {
  const u = e.data?.data() as Usuario | undefined;
  if (u?.correo) await vincularInvitaciones(e.params.id, u.correo);
});

export const alCrearInvitacion = onDocumentCreated('invitaciones/{id}', async (e) => {
  const i = e.data?.data() as Invitacion | undefined;
  if (!i) return;
  const existe = await db().collection('usuarios').where('correo', '==', normalizarCorreo(i.correo)).limit(1).get();
  if (!existe.empty) await vincularInvitaciones(existe.docs[0].id, i.correo);
});
