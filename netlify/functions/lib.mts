// Código compartido de las funciones de Netlify: cliente de Supabase (clave de servicio), tareas nocturnas y matutinas.
// Reemplaza a functions/src/tareas.ts y notificar.ts (sin push; solo la campanita).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  avisoPrevio, CONFIG_POR_DEFECTO, construirPago, cop, diaCobroDe, diferenciaDias, estadoEn, fechaCorta, hoy,
  nombreMes, periodoVigente, recordatorioDelDia,
  type Categoria, type Configuracion, type Evento, type MedioPago, type Nino, type Pago,
} from '@pa/shared';

declare const Netlify: { env: { get(k: string): string | undefined } } | undefined;

function env(nombre: string): string | undefined {
  try { const v = typeof Netlify !== 'undefined' ? Netlify?.env.get(nombre) : undefined; if (v) return v; } catch { /* sin Netlify */ }
  return process.env[nombre];
}

let _cliente: SupabaseClient | null = null;
/** Cliente con la clave de servicio (salta las reglas de seguridad). Solo para uso en el servidor. */
export function supabase(): SupabaseClient {
  if (_cliente) return _cliente;
  const url = env('VITE_SUPABASE_URL') ?? env('SUPABASE_URL');
  const clave = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave) throw new Error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
  _cliente = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  return _cliente;
}

interface Fila { id: string; datos: Record<string, unknown> | null }

/** Lee una tabla completa como objetos ({...datos, id}); pagina de 1000 en 1000. */
export async function leerTabla<T>(tabla: string): Promise<T[]> {
  const salida: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase().from(tabla).select('id, datos').order('id').range(desde, desde + 999);
    if (error) throw new Error(`Error leyendo ${tabla}: ${error.message}`);
    const pagina = (data ?? []) as Fila[];
    salida.push(...pagina.map((f) => ({ ...(f.datos ?? {}), id: f.id }) as T));
    if (pagina.length < 1000) break;
  }
  return salida;
}

/** Crea o reemplaza un objeto completo (upsert por id; el id no va dentro de datos). */
export async function guardarObjeto(tabla: string, obj: { id: string } & Record<string, unknown>): Promise<void> {
  const { id, ...datos } = JSON.parse(JSON.stringify(obj)) as { id: string } & Record<string, unknown>;
  const { error } = await supabase().from(tabla).upsert({ id, datos });
  if (error) throw new Error(`Error guardando en ${tabla}: ${error.message}`);
}

export interface Mensaje { tipo: string; titulo: string; cuerpo: string; enlace?: string }

/** Crea la notificación en la campanita de cada usuario. Devuelve el número de destinatarios únicos. */
export async function notificar(usuarioIds: string[], m: Mensaje): Promise<number> {
  const ids = [...new Set(usuarioIds)].filter(Boolean);
  if (!ids.length) return 0;
  const { error } = await supabase().rpc('notificar', {
    usuarios: ids, tipo: m.tipo, titulo: m.titulo, cuerpo: m.cuerpo, enlace: m.enlace ?? null,
  });
  if (error) throw new Error(`Error enviando notificación: ${error.message}`);
  return ids.length;
}

export async function idsEntrenador(): Promise<string[]> {
  const { data, error } = await supabase().from('usuarios').select('id').eq('rol', 'entrenador');
  if (error) throw new Error(`Error leyendo entrenadores: ${error.message}`);
  return (data ?? []).map((f: { id: string }) => f.id);
}

async function configuracion(): Promise<Configuracion> {
  const { data, error } = await supabase().from('configuracion').select('id, datos').eq('id', 'general').maybeSingle();
  if (error) throw new Error(`Error leyendo configuración: ${error.message}`);
  return { ...CONFIG_POR_DEFECTO, ...((data as Fila | null)?.datos ?? {}) } as Configuracion;
}

async function ninosActivos(): Promise<Nino[]> {
  return (await leerTabla<Nino>('ninos')).filter((n) => n.estado === 'activo');
}

export function ninosDe(ninos: Nino[], categorias: string[] | 'todas'): Nino[] {
  return categorias === 'todas' ? ninos : ninos.filter((n) => n.categoriaId && categorias.includes(n.categoriaId));
}

/** 00:05 — genera el ciclo vigente de cada niño activo y marca los vencidos. */
export async function tareasNocturnas(fecha = hoy()) {
  const config = await configuracion();
  const [ninos, cats, pagos] = await Promise.all([ninosActivos(), leerTabla<Categoria>('categorias'), leerTabla<Pago & { id: string }>('pagos')]);
  const categorias = new Map(cats.map((c) => [c.id, c]));
  const existentes = new Set(pagos.map((p) => p.id));
  let creados = 0, vencidos = 0;
  const marca = `${fecha}T00:05:00-05:00`;

  for (const n of ninos) {
    const cat = n.categoriaId ? categorias.get(n.categoriaId) : undefined;
    if (!cat || !n.fechaInscripcion) continue;
    const dia = diaCobroDe(n);
    const periodo = periodoVigente(dia, fecha);
    if (periodo < n.fechaInscripcion.slice(0, 7)) continue;
    const id = `${n.id}_${periodo}`;
    if (existentes.has(id)) continue;
    const p = construirPago({ ninoId: n.id, acudientesIds: n.acudientesIds, categoriaId: cat.id, diaCobro: dia, valorMensual: cat.valorMensual, descuento: n.descuento }, periodo, config);
    await guardarObjeto('pagos', { ...p, id, creadoEn: marca, actualizadoEn: marca, creadoPor: 'sistema' });
    existentes.add(id);
    creados++;
  }

  for (const p of pagos) {
    if (p.estado === 'pendiente' && estadoEn(p, fecha) === 'vencido') {
      await guardarObjeto('pagos', { ...p, estado: 'vencido', actualizadoEn: marca });
      vencidos++;
    }
  }
  return { creados, vencidos };
}

/** 07:00 — recordatorios de pago (N01–N03), eventos (N07–N08) y resumen (N15). */
export async function tareasMatutinas(fecha = hoy()) {
  const config = await configuracion();
  const ninos = await ninosActivos();
  const porId = new Map(ninos.map((n) => [n.id, n]));
  const pagos = await leerTabla<Pago & { id: string }>('pagos');
  const pagoPorId = new Map(pagos.map((p) => [p.id, p]));
  const medios = (await leerTabla<MedioPago>('medios_pago')).filter((m) => m.activo)
    .sort((a, b) => a.orden - b.orden).map((m) => m.nombre.split(' ')[0]);
  const textoMedios = medios.length ? `Puedes pagar por ${medios.slice(0, -1).join(', ')}${medios.length > 1 ? ' o ' : ''}${medios[medios.length - 1]}.` : '';
  const res = { previos: 0, delMes: 0, avisosVencidos: 0, eventos: 0, confirmar: 0 };

  // N01: aviso previo
  for (const n of ninos) {
    const per = avisoPrevio(diaCobroDe(n), fecha, config.diasRecordatorioPrevio);
    if (!per) continue;
    const pago = pagoPorId.get(`${n.id}_${per}`);
    if (pago && ['pagado', 'exonerado', 'congelado'].includes(pago.estado)) continue;
    res.previos += await notificar(n.acudientesIds, {
      tipo: 'pago_proximo', titulo: `Se acerca el pago de ${nombreMes(per).toLowerCase()} · ${n.nombres}`,
      cuerpo: `En ${config.diasRecordatorioPrevio} días inicia el periodo de pago de ${n.nombres}.`, enlace: `/p/pagos?nino=${n.id}`,
    });
  }

  // N02 / N03
  for (const p of pagos.filter((x) => x.estado === 'pendiente' || x.estado === 'vencido')) {
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
      res.avisosVencidos += await notificar(p.acudientesIds, {
        tipo: 'pago_vencido', titulo: `Pago vencido · ${n.nombres}`,
        cuerpo: `El pago de ${mes} (${cop(p.valorAPagar)}) venció el ${fechaCorta(p.fechaVencimiento)}${dias > 1 ? `, hace ${dias} días` : ''}. Si ya pagaste, avísale al entrenador.`,
        enlace: `/p/pagos?nino=${n.id}`,
      });
    }
    await guardarObjeto('pagos', { ...p, recordatoriosEnviados: [...(p.recordatoriosEnviados ?? []), fecha] });
  }

  // N07 / N08: eventos
  const eventos = (await leerTabla<Evento>('eventos')).filter((e) => e.fechaInicio >= fecha);
  const confirmaciones = eventos.length ? await leerTabla<{ eventoId: string; ninoId: string }>('confirmaciones_evento') : [];
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
      await guardarObjeto('eventos', { ...e, recordatoriosEnviados: [...enviados, dias] });
    }
    if (e.requiereConfirmacion && e.fechaLimiteConfirmacion && diferenciaDias(fecha, e.fechaLimiteConfirmacion.slice(0, 10)) === 2) {
      const respondieron = new Set(confirmaciones.filter((c) => c.eventoId === e.id).map((c) => c.ninoId));
      const sin = destino.filter((n) => !respondieron.has(n.id));
      res.confirmar += await notificar(sin.flatMap((n) => n.acudientesIds), {
        tipo: 'confirmar_evento', titulo: `Confirma: ${e.titulo}`,
        cuerpo: `Quedan 2 días para confirmar si tu hijo asistirá a ${e.titulo}.`, enlace: '/p/eventos',
      });
    }
  }

  // N15: resumen para el entrenador
  const vencidos = (await leerTabla<Pago>('pagos')).filter((p) => p.estado === 'vencido');
  if (vencidos.length) {
    const total = vencidos.reduce((a, p) => a + p.valorAPagar, 0);
    await notificar(await idsEntrenador(), {
      tipo: 'resumen_vencidos', titulo: `${vencidos.length} pagos vencidos`, cuerpo: `${cop(total)} por cobrar. Toca para ver el detalle.`, enlace: '/e/pagos?estado=vencido',
    });
  }
  return res;
}
