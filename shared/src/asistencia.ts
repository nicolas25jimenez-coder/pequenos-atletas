// Indicadores de asistencia independientes (SPEC §7.5).
import type { EstadoAsistencia } from './tipos';

export const ESTADOS_ASISTENCIA: EstadoAsistencia[] = ['asistio', 'retardo', 'excusa', 'falto'];

export const ETIQUETA_ASISTENCIA: Record<EstadoAsistencia, string> = {
  asistio: 'Asistió', retardo: 'Retardo', excusa: 'Excusa', falto: 'Faltó',
};

export interface Indicador {
  estado: EstadoAsistencia;
  etiqueta: string;
  cantidad: number;
  porcentaje: number; // 0–100, con 1 decimal
}

export interface ResumenAsistencia {
  total: number; // sesiones realizadas (sin canceladas)
  indicadores: Indicador[];
}

/**
 * Cuenta cada estado sobre el total de sesiones realizadas. Los porcentajes se
 * redondean con el método del mayor residuo para que siempre sumen 100.
 */
export function resumirAsistencia(estados: EstadoAsistencia[]): ResumenAsistencia {
  const total = estados.length;
  const conteo = Object.fromEntries(ESTADOS_ASISTENCIA.map((e) => [e, 0])) as Record<EstadoAsistencia, number>;
  for (const e of estados) conteo[e]++;
  const pct = redondearA100(ESTADOS_ASISTENCIA.map((e) => (total ? (conteo[e] / total) * 100 : 0)), total > 0);
  return {
    total,
    indicadores: ESTADOS_ASISTENCIA.map((e, i) => ({ estado: e, etiqueta: ETIQUETA_ASISTENCIA[e], cantidad: conteo[e], porcentaje: pct[i] })),
  };
}

function redondearA100(valores: number[], hayDatos: boolean): number[] {
  if (!hayDatos) return valores.map(() => 0);
  const decimas = valores.map((v) => v * 10);
  const base = decimas.map(Math.floor);
  let resto = 1000 - base.reduce((a, b) => a + b, 0);
  const orden = decimas.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of orden) {
    if (resto <= 0) break;
    base[i]++;
    resto--;
  }
  return base.map((b) => b / 10);
}

export function porcentajeFaltas(r: ResumenAsistencia): number {
  return r.indicadores.find((i) => i.estado === 'falto')!.porcentaje;
}
