// Tareas programadas (SPEC §7.2 y §9): ciclos de pago, vencimientos y recordatorios.
import { getFirestore } from 'firebase-admin/firestore';
import {
  avisoPrevio, CONFIG_POR_DEFECTO, construirPago, cop, diaCobroDe, diferenciaDias, estadoEn, fechaCorta, hoy,
  nombreMes, periodoVigente, recordatorioDelDia,
  type Categoria, type Configuracion, type Evento, type MedioPago, type Nino, type Pago, type Usuario,
} from '@pa/shared';
import { enviarPush, idsEntrenador, notificar } from './notificar';

const db = () => getFirestore();

async function configuracion(): Promise<Configuracion> {
  const s = await db().doc('configuracion/general').get();
  return { ...CONFIG_POR_DEFECTO, ...(s.data() ?? {}) } as Configuracion;
}

async function ninosActivos(): Promise<Nino[]> {
  const s = await db().collection('ninos').where('estado', '==', 'activo').get();
  return s.docs.map((d) => ({ id: d.id, ...d.data() }) as Nino);
}

export function ninosDe(ninos: Nino[], categorias: string[] | 'todas'): Nino[] {
  return categorias === 'todas' ? ninos : ninos.filter((n) => n.categoriaId && categorias.includes(n.categoriaId));
}

/** 00:05 — genera el ciclo vigente de cada niño activo y marca los vencidos. */
export async function tareasNocturnas(fecha = hoy()) {
  const config = await configuracion();
  const [ninos, cats] = await Promise.all([ninosActivos(), db().collection('categorias').get()]);
  const categorias = new Map(cats.docs.map((d) => [d.id, { id: d.id, ...d.data() } as Categoria]));
  let creados = 0, vencidos = 0;

  for (const n of ninos) {
    const cat = n.categoriaId ? categorias.get(n.categoriaId) : undefined;
    if (!cat || !n.fechaInscripcion) continue;
    const dia = diaCobroDe(n);
    const periodo = periodoVigente(dia, fecha);
    if (periodo < n.fechaInscripcion.slice(0, 7)) continue;
    const ref = db().doc(`pagos/${n.id}_${periodo}`);
    if ((await ref.get()).exists) continue;
    const p = construirPago({ ninoId: n.id, acudientesIds: n.acudientesIds, categoriaId: cat.id, diaCobro: dia, valorMensual: cat.valorMensual, descuento: n.descuento }, periodo, config);
    await ref.set({ ...p, creadoEn: `${fecha}T00:05:00-05:00`, actualizadoEn: `${fecha}T00:05:00-05:00`, creadoPor: 'sistema' });
    creados++;
  }

  const pend = await db().collection('pagos').where('estado', '==', 'pendiente').get();
  const batch = db().batch();
  for (const d of pend.docs) {
    const p = d.data() as Pago;
    if (estadoEn(p, fecha) === 'vencido') { batch.update(d.ref, { estado: 'vencido', actualizadoEn: `${fecha}T00:05:00-05:00` }); vencidos++; }
  }
  await batch.commit();
  return { creados, vencidos };
}

/** 07:00 — recordatorios de pago (N01–N03), eventos (N07–N08), push pendientes y resumen (N15). */
export async function tareasMatutinas(fecha = hoy()) {
  const config = await configuracion();
  const ninos = await ninosActivos();
  const porId = new Map(ninos.map((n) => [n.id, n]));
  const medios = (await db().collection('mediosPago').where('activo', '==', true).get()).docs
    .map((d) => d.data() as MedioPago).sort((a, b) => a.orden - b.orden).map((m) => m.nombre.split(' ')[0]);
  const textoMedios = medios.length ? `Puedes pagar por ${medios.slice(0, -1).join(', ')}${medios.length > 1 ? ' o ' : ''}${medios[medios.length - 1]}.` : '';
  const res = { previos: 0, delMes: 0, vencidos: 0, eventos: 0, confirmar: 0, push: 0 };

  // N01: aviso previo
  for (const n of ninos) {
    const per = avisoPrevio(diaCobroDe(n), fecha, config.diasRecordatorioPrevio);
    if (!per) continue;
    const pago = await db().doc(`pagos/${n.id}_${per}`).get();
    if (pago.exists && ['pagado', 'exonerado', 'congelado'].includes(pago.data()!.estado)) continue;
    res.previos += await notificar(n.acudientesIds, {
      tipo: 'pago_proximo', titulo: `Se acerca el pago de ${nombreMes(per).toLowerCase()} · ${n.nombres}`,
      cuerpo: `En ${config.diasRecordatorioPrevio} días inicia el periodo de pago de ${n.nombres}.`, enlace: `/p/pagos?nino=${n.id}`,
    });
  }

  // N02 / N03
  const abiertos = await db().collection('pagos').where('estado', 'in', ['pendiente', 'vencido']).get();
  for (const d of abiertos.docs) {
    const p = d.data() as Pago;
    const n = porId.get(p.ninoId);
    if (!n || (p.recordatoriosEnviados ?? []).includes(fecha)) continue;
    const r = recordatorioDelDia(p, fecha, config);
    if (!r) continue;
    const mes = nombreMes(p.periodo).toLowerCase();
    if (r === 'pago_mes') {
      res.delMes += await notificar(p.acudientesIds, {
        tipo: 'pago_mes', titulo: `💳 Pago de ${mes} · ${n.nombres}`,
        cuerpo: `Hoy inicia el periodo de pago de ${mes} de ${n.nombres}. Valor: ${cop(p.valorAPagar)}. ${textoMedios} Toca para ver los datos.`,
        enlace: `/p/pagos?nino=${n.id}`,
      });
    } else {
      const dias = diferenciaDias(p.fechaVencimiento, fecha);
      res.vencidos += await notificar(p.acudientesIds, {
        tipo: 'pago_vencido', titulo: `Pago vencido · ${n.nombres}`,
        cuerpo: `El pago de ${mes} (${cop(p.valorAPagar)}) venció el ${fechaCorta(p.fechaVencimiento)}${dias > 1 ? `, hace ${dias} días` : ''}. Si ya pagaste, avísale al entrenador.`,
        enlace: `/p/pagos?nino=${n.id}`,
      });
    }
    await d.ref.update({ recordatoriosEnviados: [...(p.recordatoriosEnviados ?? []), fecha] });
  }

  // N07 / N08: eventos
  const eventos = (await db().collection('eventos').where('fechaInicio', '>=', fecha).get()).docs.map((d) => ({ id: d.id, ...d.data() }) as Evento);
  for (const e of eventos) {
    const dias = diferenciaDias(fecha, e.fechaInicio.slice(0, 10));
    const destino = ninosDe(ninos, e.categoriasIds);
    const enviados = e.recordatoriosEnviados ?? [];
    if (e.recordatorios.includes(dias) && !enviados.includes(dias)) {
      const cuando = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `el ${fechaCorta(e.fechaInicio.slice(0, 10))}`;
      res.eventos += await notificar(destino.flatMap((n) => n.acudientesIds), {
        tipo: 'evento_proximo', titulo: `📅 ${e.titulo}`,
        cuerpo: `Recuerda: ${cuando} es ${e.titulo} en ${e.lugar}.${e.requiereConfirmacion ? ' Confirma la asistencia.' : ''}`, enlace: '/p/eventos',
      });
      await db().doc(`eventos/${e.id}`).update({ recordatoriosEnviados: [...enviados, dias] });
    }
    if (e.requiereConfirmacion && e.fechaLimiteConfirmacion && diferenciaDias(fecha, e.fechaLimiteConfirmacion.slice(0, 10)) === 2) {
      const conf = await db().collection('confirmacionesEvento').where('eventoId', '==', e.id).get();
      const respondieron = new Set(conf.docs.map((d) => d.data().ninoId));
      const sin = destino.filter((n) => !respondieron.has(n.id));
      res.confirmar += await notificar(sin.flatMap((n) => n.acudientesIds), {
        tipo: 'confirmar_evento', titulo: `Confirma: ${e.titulo}`,
        cuerpo: `Quedan 2 días para confirmar si tu hijo asistirá a ${e.titulo}.`, enlace: '/p/eventos',
      });
    }
  }

  // Push que quedaron pendientes por el horario nocturno
  const pendientes = await db().collection('notificaciones').where('pushPendiente', '==', true).get();
  for (const d of pendientes.docs) {
    const x = d.data();
    const u = (await db().doc(`usuarios/${x.usuarioId}`).get()).data() as Usuario | undefined;
    if (u?.fcmTokens?.length && process.env.FUNCTIONS_EMULATOR !== 'true') await enviarPush(u.fcmTokens, x as never);
    await d.ref.update({ pushPendiente: false });
    res.push++;
  }

  // N15: resumen para el entrenador
  const vencidos = await db().collection('pagos').where('estado', '==', 'vencido').get();
  if (!vencidos.empty) {
    const total = vencidos.docs.reduce((a, d) => a + (d.data().valorAPagar as number), 0);
    await notificar(await idsEntrenador(), {
      tipo: 'resumen_vencidos', titulo: `${vencidos.size} pagos vencidos`, cuerpo: `${cop(total)} por cobrar. Toca para ver el detalle.`, enlace: '/e/pagos?estado=vencido',
    });
  }
  return res;
}
