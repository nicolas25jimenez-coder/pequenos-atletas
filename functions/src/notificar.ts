// Envío de notificaciones: bandeja interna (colección notificaciones) + push FCM.
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { ahoraIso, horaActual, type PreferenciasNotificacion, type TipoNotificacion, type Usuario } from '@pa/shared';

const db = () => getFirestore();
const enEmulador = () => process.env.FUNCTIONS_EMULATOR === 'true';

/** Tipo de notificación → preferencia que la controla (las demás no se pueden desactivar). */
const PREFERENCIA: Partial<Record<TipoNotificacion, keyof PreferenciasNotificacion>> = {
  pago_registrado: 'pagoRegistrado',
  inasistencia: 'inasistencia',
  resultados: 'resultados',
  evento_proximo: 'eventos',
  confirmar_evento: 'eventos',
  solicitud_resuelta: 'solicitudes',
  resumen_vencidos: 'pagoRegistrado',
};

/** Horario permitido para push: 6:00 a.m. a 9:00 p.m. (SPEC §9.2). */
export function horarioPermitido(ahora = new Date()): boolean {
  const h = horaActual(ahora);
  return h >= '06:00' && h < '21:00';
}

export interface Mensaje { tipo: TipoNotificacion; titulo: string; cuerpo: string; enlace?: string }

export async function notificar(usuarioIds: string[], m: Mensaje): Promise<number> {
  const ids = [...new Set(usuarioIds)].filter(Boolean);
  if (!ids.length) return 0;
  const usuarios = await Promise.all(ids.map((id) => db().doc(`usuarios/${id}`).get()));
  const pref = PREFERENCIA[m.tipo];
  const fecha = ahoraIso();
  const permitido = horarioPermitido();
  const batch = db().batch();
  const tokens: string[] = [];
  let n = 0;
  for (const s of usuarios) {
    if (!s.exists) continue;
    const u = s.data() as Usuario;
    if (pref && u.preferenciasNotificacion && u.preferenciasNotificacion[pref] === false) continue;
    batch.set(db().collection('notificaciones').doc(), {
      usuarioId: s.id, tipo: m.tipo, titulo: m.titulo, cuerpo: m.cuerpo, enlace: m.enlace ?? null,
      leida: false, fecha, pushPendiente: !permitido,
    });
    n++;
    if (permitido) tokens.push(...(u.fcmTokens ?? []));
  }
  await batch.commit();
  if (tokens.length && !enEmulador()) await enviarPush(tokens, m);
  return n;
}

export async function enviarPush(tokens: string[], m: Mensaje) {
  try {
    await getMessaging().sendEachForMulticast({
      tokens,
      data: { titulo: m.titulo, cuerpo: m.cuerpo, enlace: m.enlace ?? '/' },
      webpush: { fcmOptions: { link: m.enlace ?? '/' } },
    });
  } catch (e) {
    console.error('Error enviando push', e);
  }
}

export async function idsEntrenador(): Promise<string[]> {
  const s = await db().collection('usuarios').where('rol', '==', 'entrenador').get();
  return s.docs.map((d) => d.id);
}
