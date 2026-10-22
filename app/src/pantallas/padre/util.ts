import {
  diaCobroDe, diaMes, diferenciaDias, estadoEn, fechaChip, fechaCobro, hoy, horaActual, sumarMeses,
  type Anuncio, type EstadoPago, type Nino, type Pago, type Sesion,
} from '@pa/shared';

export function proximaSesion(sesiones: Sesion[]): Sesion | null {
  const f = hoy(), h = horaActual();
  return sesiones.find((s) => s.estado === 'programada' && (s.fecha > f || (s.fecha === f && s.horaFin > h))) ?? null;
}

export function cuandoSesion(s: Sesion): string {
  const d = diferenciaDias(hoy(), s.fecha);
  return d === 0 ? 'HOY' : d === 1 ? 'MAÑANA' : fechaChip(s.fecha).toUpperCase();
}

export const ESTADO_PAGO_PADRE: Record<EstadoPago, string> = {
  pagado: 'Al día', pendiente: 'Pendiente', vencido: 'Vencido', exonerado: 'Exonerado', congelado: 'Congelado',
};

/** Pago del ciclo vigente (el más reciente) con su estado actualizado a hoy. */
export function pagoActual(pagos: Pago[]): Pago | null {
  const p = pagos[pagos.length - 1];
  return p ? { ...p, estado: estadoEn(p, hoy()) } : null;
}

export function notaPago(p: Pago, nino: Nino): string {
  const h = hoy();
  if (p.estado === 'pagado' || p.estado === 'exonerado' || p.estado === 'congelado') {
    return `Próximo cobro ${diaMes(fechaCobro(diaCobroDe(nino), sumarMeses(p.periodo, 1)))}`;
  }
  const d = diferenciaDias(h, p.fechaVencimiento);
  if (d < 0) return `Venció el ${diaMes(p.fechaVencimiento)}`;
  if (d === 0) return `Vence hoy · ${diaMes(p.fechaVencimiento)}`;
  if (d === 1) return `Vence mañana · ${diaMes(p.fechaVencimiento)}`;
  return `Vence el ${diaMes(p.fechaVencimiento)}`;
}

export function anunciosPara(anuncios: Anuncio[], ninos: Nino[]): Anuncio[] {
  const ahora = new Date().toISOString();
  const cats = new Set(ninos.map((n) => n.categoriaId).filter(Boolean) as string[]);
  const ids = new Set(ninos.map((n) => n.id));
  return anuncios
    .filter((a) => !a.fechaExpiracion || a.fechaExpiracion > ahora)
    .filter((a) => a.destinatarios.tipo === 'todas'
      || (a.destinatarios.tipo === 'categorias' && a.destinatarios.ids.some((c) => cats.has(c)))
      || (a.destinatarios.tipo === 'ninos' && a.destinatarios.ids.some((n) => ids.has(n))))
    .sort((a, b) => (a.fijado === b.fijado ? b.fechaPublicacion.localeCompare(a.fechaPublicacion) : a.fijado ? -1 : 1));
}
