// Ciclos de pago según la fecha de inscripción (SPEC §7.2).
import { aFecha, diferenciaDias, partes, sumarDias, sumarMeses, ultimoDiaMes } from './fechas';
import type { Configuracion, Descuento, EstadoPago, Pago } from './tipos';

/** Fecha de cobro de un periodo 'YYYY-MM'. Si el día no existe en el mes, se usa el último día. */
export function fechaCobro(diaCobro: number, periodo: string): string {
  const [y, m] = periodo.split('-').map(Number);
  return aFecha(y, m, Math.min(diaCobro, ultimoDiaMes(y, m)));
}

/** Periodo cuyo ciclo está vigente en la fecha dada. */
export function periodoVigente(diaCobro: number, fecha: string): string {
  const periodo = fecha.slice(0, 7);
  return fechaCobro(diaCobro, periodo) <= fecha ? periodo : sumarMeses(periodo, -1);
}

export function diaCobroDe(n: { diaCobro?: number; fechaInscripcion?: string }): number {
  return n.diaCobro ?? (n.fechaInscripcion ? partes(n.fechaInscripcion).d : 1);
}

export function descuentoVigente(d: Descuento | null | undefined, fecha: string): Descuento | null {
  if (!d || !d.valor) return null;
  if (d.vigenteHasta && d.vigenteHasta < fecha) return null;
  return d;
}

export function valorDescuento(base: number, d: Descuento | null): number {
  if (!d) return 0;
  const v = d.tipo === 'porcentaje' ? Math.round((base * d.valor) / 100) : d.valor;
  return Math.min(base, Math.max(0, v));
}

export function etiquetaDescuento(d: Descuento): string {
  return d.tipo === 'porcentaje' ? `${d.motivo} · ${d.valor} %` : d.motivo;
}

interface DatosCiclo {
  ninoId: string;
  acudientesIds: string[];
  categoriaId: string;
  diaCobro: number;
  valorMensual: number;
  descuento?: Descuento | null;
}

/** Construye el pago (sin auditoría) de un periodo. Los valores quedan congelados al generarse. */
export function construirPago(datos: DatosCiclo, periodo: string, config: Pick<Configuracion, 'diasGracia'>): Omit<Pago, keyof import('./tipos').Auditoria> {
  const inicio = fechaCobro(datos.diaCobro, periodo);
  const d = descuentoVigente(datos.descuento, inicio);
  const desc = valorDescuento(datos.valorMensual, d);
  return {
    id: `${datos.ninoId}_${periodo}`,
    ninoId: datos.ninoId,
    acudientesIds: datos.acudientesIds,
    categoriaId: datos.categoriaId,
    periodo,
    fechaInicioCiclo: inicio,
    fechaVencimiento: sumarDias(inicio, config.diasGracia),
    valorBase: datos.valorMensual,
    descuento: desc,
    ...(d ? { descuentoMotivo: etiquetaDescuento(d) } : {}),
    valorAPagar: datos.valorMensual - desc,
    ajusteManual: null,
    estado: 'pendiente',
    recordatoriosEnviados: [],
  };
}

/** Estado que debería tener un pago en la fecha dada (solo cambia pendiente → vencido). */
export function estadoEn(p: Pick<Pago, 'estado' | 'fechaVencimiento'>, fecha: string): EstadoPago {
  if (p.estado === 'pendiente' && fecha > p.fechaVencimiento) return 'vencido';
  return p.estado;
}

export type Recordatorio = 'pago_proximo' | 'pago_mes' | 'pago_vencido';

/**
 * Recordatorio que corresponde enviar hoy para un pago:
 * - pago_mes: el día de inicio del ciclo.
 * - pago_vencido: el día siguiente al vencimiento y luego cada N días (si N > 0).
 */
export function recordatorioDelDia(
  p: Pick<Pago, 'estado' | 'fechaInicioCiclo' | 'fechaVencimiento'>,
  fecha: string,
  config: Pick<Configuracion, 'recordarVencidosCadaDias'>,
): Recordatorio | null {
  if (p.estado === 'pagado' || p.estado === 'exonerado' || p.estado === 'congelado') return null;
  if (fecha === p.fechaInicioCiclo) return 'pago_mes';
  const dias = diferenciaDias(p.fechaVencimiento, fecha);
  if (dias === 1) return 'pago_vencido';
  if (dias > 1 && config.recordarVencidosCadaDias > 0 && (dias - 1) % config.recordarVencidosCadaDias === 0) return 'pago_vencido';
  return null;
}

/** ¿Hoy toca el aviso previo (N días antes del próximo cobro)? Devuelve el periodo que se avecina. */
export function avisoPrevio(diaCobro: number, fecha: string, diasPrevio: number): string | null {
  const objetivo = sumarDias(fecha, diasPrevio);
  const periodo = objetivo.slice(0, 7);
  return fechaCobro(diaCobro, periodo) === objetivo ? periodo : null;
}

export function estaAlDia(estado: EstadoPago): boolean {
  return estado === 'pagado' || estado === 'exonerado' || estado === 'congelado';
}

export const ETIQUETA_PAGO: Record<EstadoPago, string> = {
  pendiente: 'Pendiente', pagado: 'Pagado', vencido: 'Vencido', exonerado: 'Exonerado', congelado: 'Congelado',
};
