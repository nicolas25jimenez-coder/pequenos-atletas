// Utilidades de fecha sobre cadenas 'YYYY-MM-DD' (sin zona) para evitar
// errores de zona horaria. "Hoy" siempre se calcula en America/Bogota.

export const ZONA = 'America/Bogota';
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const pad = (n: number) => String(n).padStart(2, '0');

export function aFecha(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function partes(fecha: string): { y: number; m: number; d: number } {
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

/** Fecha actual en Bogotá como 'YYYY-MM-DD'. */
export function hoy(ahora: Date = new Date()): string {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(ahora);
}

/** Hora actual en Bogotá como 'HH:mm'. */
export function horaActual(ahora: Date = new Date()): string {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false });
  return f.format(ahora);
}

/** Instante ISO con zona de Bogotá (UTC-5, sin horario de verano). */
export function ahoraIso(ahora: Date = new Date()): string {
  return `${hoy(ahora)}T${horaActual(ahora)}:00-05:00`;
}

export function ultimoDiaMes(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function sumarDias(fecha: string, n: number): string {
  const { y, m, d } = partes(fecha);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return aFecha(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function sumarMeses(periodo: string, n: number): string {
  const [y, m] = periodo.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}`;
}

export function diferenciaDias(desde: string, hasta: string): number {
  const a = partes(desde), b = partes(hasta);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000);
}

/** 1 = lunes … 7 = domingo */
export function diaSemana(fecha: string): number {
  const { y, m, d } = partes(fecha);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}

/** Edad en meses cumplidos. */
export function edadMeses(nacimiento: string, en: string): number {
  const n = partes(nacimiento), f = partes(en);
  let meses = (f.y - n.y) * 12 + (f.m - n.m);
  if (f.d < n.d) meses -= 1;
  return meses;
}

/** Edad en meses con fracción (para interpolar tablas OMS). */
export function edadMesesExacta(nacimiento: string, en: string): number {
  return diferenciaDias(nacimiento, en) / 30.4375;
}

export function edadTexto(nacimiento: string, en: string = hoy()): string {
  const total = edadMeses(nacimiento, en);
  const a = Math.floor(total / 12), m = total % 12;
  const ta = `${a} ${a === 1 ? 'año' : 'años'}`;
  return m === 0 ? ta : `${ta} ${m} ${m === 1 ? 'mes' : 'meses'}`;
}

export function edadAnios(nacimiento: string, en: string = hoy()): number {
  return Math.floor(edadMeses(nacimiento, en) / 12);
}

/** 'dd/mm/aaaa' */
export function fechaCorta(fecha?: string | null): string {
  if (!fecha) return '—';
  const { y, m, d } = partes(fecha);
  return `${pad(d)}/${pad(m)}/${y}`;
}

/** 'dd/mm' */
export function diaMes(fecha: string): string {
  const { m, d } = partes(fecha);
  return `${pad(d)}/${pad(m)}`;
}

/** 'Jueves 22 de octubre' */
export function fechaLarga(fecha: string, conAnio = false): string {
  const { y, m, d } = partes(fecha);
  const dia = DIAS[diaSemana(fecha) - 1];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${d} de ${MESES[m - 1]}${conAnio ? ` de ${y}` : ''}`;
}

/** 'Jue 22 oct' */
export function fechaChip(fecha: string): string {
  const { m, d } = partes(fecha);
  return `${DIAS_CORTOS[diaSemana(fecha) - 1]} ${d} ${MESES[m - 1].slice(0, 3)}`;
}

export function nombreMes(periodo: string, conAnio = false): string {
  const [y, m] = periodo.split('-').map(Number);
  const n = MESES[m - 1];
  return `${n[0].toUpperCase()}${n.slice(1)}${conAnio ? ` ${y}` : ''}`;
}

/** '15:00' → '3:00 p.m.' */
export function hora12(hhmm: string): string {
  const [h, mi] = hhmm.split(':').map(Number);
  const suf = h >= 12 ? 'p.m.' : 'a.m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(mi)} ${suf}`;
}

export function periodoDe(fecha: string): string {
  return fecha.slice(0, 7);
}
