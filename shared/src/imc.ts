// IMC para la edad según la OMS (SPEC §7.4).
// ≤ 60 meses: Patrones de Crecimiento OMS 2006 · > 60 meses: Referencia OMS 2007.
import tabla from './data/oms-imc.json';
import type { Sexo } from './tipos';

type Lms = [number, number, number];
const T = tabla as unknown as { M: Record<string, Lms>; F: Record<string, Lms> };

export const EDAD_MIN_TABLA = 24;
export const EDAD_MAX_TABLA = 120;

export function calcularImc(pesoKg: number, tallaCm: number): number {
  const m = tallaCm / 100;
  return Math.round((pesoKg / (m * m)) * 10) / 10;
}

/** L, M, S interpolados linealmente para una edad en meses (con fracción). */
export function lms(sexo: Sexo, edadMeses: number): Lms | null {
  if (edadMeses < EDAD_MIN_TABLA || edadMeses > EDAD_MAX_TABLA) return null;
  const t = T[sexo];
  const a = Math.floor(edadMeses), b = Math.ceil(edadMeses);
  // El cambio de tabla (2006 → 2007) ocurre entre 60 y 61 meses: no se interpola a través de él.
  if (a === b || (a === 60 && b === 61)) return t[String(edadMeses <= 60 ? Math.min(a, 60) : b)];
  const f = edadMeses - a;
  const la = t[String(a)], lb = t[String(b)];
  return [la[0] + (lb[0] - la[0]) * f, la[1] + (lb[1] - la[1]) * f, la[2] + (lb[2] - la[2]) * f];
}

function valorEnZ([L, M, S]: Lms, z: number): number {
  return M * Math.pow(1 + L * S * z, 1 / L);
}

/** z-score con el ajuste de la OMS para valores más allá de ±3 DE. */
export function zScoreImc(imc: number, sexo: Sexo, edadMeses: number): number | null {
  const p = lms(sexo, edadMeses);
  if (!p) return null;
  const [L, M, S] = p;
  let z = (Math.pow(imc / M, L) - 1) / (L * S);
  if (z > 3) {
    const sd3 = valorEnZ(p, 3), sd23 = sd3 - valorEnZ(p, 2);
    z = 3 + (imc - sd3) / sd23;
  } else if (z < -3) {
    const sd3 = valorEnZ(p, -3), sd23 = valorEnZ(p, -2) - sd3;
    z = -3 + (imc - sd3) / sd23;
  }
  return Math.round(z * 100) / 100;
}

/** Función de distribución normal estándar (aprox. Abramowitz–Stegun 7.1.26). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export function percentil(z: number): number {
  return Math.min(99.9, Math.max(0.1, Math.round(normalCdf(z) * 1000) / 10));
}

export type NivelImc = 'adecuado' | 'leve' | 'alerta';

export interface ClasificacionImc {
  tecnica: string; // para el entrenador
  amable: string; // para el padre
  nivel: NivelImc;
}

const AMABLE = {
  arribaAlerta: 'Por encima del rango esperado — consulta con tu pediatra',
  arribaLeve: 'Ligeramente por encima del rango esperado',
  adecuado: 'Dentro del rango esperado para su edad',
  abajoLeve: 'Ligeramente por debajo del rango esperado',
  abajoAlerta: 'Por debajo del rango esperado — consulta con tu pediatra',
};

export function clasificarImc(z: number, edadMeses: number): ClasificacionImc {
  const menor5 = edadMeses <= 60;
  if (z > 3) return { tecnica: 'Obesidad', amable: AMABLE.arribaAlerta, nivel: 'alerta' };
  if (z > 2) return { tecnica: menor5 ? 'Sobrepeso' : 'Obesidad', amable: AMABLE.arribaAlerta, nivel: 'alerta' };
  if (z > 1) return { tecnica: menor5 ? 'Riesgo de sobrepeso' : 'Sobrepeso', amable: AMABLE.arribaLeve, nivel: 'leve' };
  if (z >= -1) return { tecnica: 'Adecuado', amable: AMABLE.adecuado, nivel: 'adecuado' };
  if (z >= -2) return { tecnica: 'Riesgo de delgadez', amable: AMABLE.abajoLeve, nivel: 'leve' };
  return { tecnica: 'Delgadez', amable: AMABLE.abajoAlerta, nivel: 'alerta' };
}

export function referenciaTabla(edadMeses: number, sexo: Sexo): string {
  const s = sexo === 'F' ? 'niñas' : 'niños';
  return edadMeses <= 60 ? `OMS 2006 · ${s} menores de 5 años` : `OMS 2007 · ${s} de 5 a 19 años`;
}

/** Valores de IMC para los percentiles 3, 15, 50, 85 y 97 (bandas de la gráfica). */
export function curvasPercentiles(sexo: Sexo, edadMeses: number): Record<'p3' | 'p15' | 'p50' | 'p85' | 'p97', number> | null {
  const p = lms(sexo, edadMeses);
  if (!p) return null;
  return {
    p3: valorEnZ(p, -1.881), p15: valorEnZ(p, -1.036), p50: valorEnZ(p, 0),
    p85: valorEnZ(p, 1.036), p97: valorEnZ(p, 1.881),
  };
}

export interface EvaluacionImc {
  imc: number;
  zScore: number | null;
  percentil: number | null;
  clasificacion: ClasificacionImc | null;
}

export function evaluarImc(pesoKg: number, tallaCm: number, sexo: Sexo, edadMesesExacta: number): EvaluacionImc {
  const imc = calcularImc(pesoKg, tallaCm);
  const z = zScoreImc(imc, sexo, edadMesesExacta);
  if (z === null) return { imc, zScore: null, percentil: null, clasificacion: null };
  return { imc, zScore: z, percentil: percentil(z), clasificacion: clasificarImc(z, edadMesesExacta) };
}
