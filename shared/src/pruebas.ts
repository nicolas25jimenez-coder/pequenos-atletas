// Comparación con la referencia, tendencia y perfil multidisciplinar (SPEC §7.6).
import { FAMILIAS } from './catalogo';
import type { Familia, Prueba, Referencia, ResultadoPrueba, Sexo } from './tipos';

export type Comparacion = 'por_debajo' | 'esperado' | 'por_encima';

export const ETIQUETA_COMPARACION: Record<Comparacion, string> = {
  por_debajo: 'Por debajo', esperado: 'Esperado', por_encima: 'Por encima',
};

export function referenciaPara(p: Pick<Prueba, 'referencias'>, edadAnios: number, sexo: Sexo): Referencia | null {
  return p.referencias.find((r) => edadAnios >= r.edadMin && edadAnios <= r.edadMax && (r.sexo === 'todos' || r.sexo === sexo)) ?? null;
}

export function comparar(p: Pick<Prueba, 'referencias' | 'mejorEs' | 'tipoResultado'>, valor: number, edadAnios: number, sexo: Sexo): Comparacion | null {
  if (p.tipoResultado === 'cualitativa') return null;
  const r = referenciaPara(p, edadAnios, sexo);
  if (!r) return null;
  if (valor >= r.valorBajo && valor <= r.valorAlto) return 'esperado';
  const arriba = p.mejorEs === 'mayor' ? valor > r.valorAlto : valor < r.valorBajo;
  return arriba ? 'por_encima' : 'por_debajo';
}

export function valorFinal(p: Pick<Prueba, 'agregacion' | 'mejorEs'>, intentos: number[]): number | null {
  if (!intentos.length) return null;
  if (p.agregacion === 'promedio') return Math.round((intentos.reduce((a, b) => a + b, 0) / intentos.length) * 100) / 100;
  return p.mejorEs === 'menor' ? Math.min(...intentos) : Math.max(...intentos);
}

export interface Tendencia {
  direccion: 'mejor' | 'peor' | 'igual';
  diferencia: number;
}

export function tendencia(p: Pick<Prueba, 'mejorEs'>, anterior: number, actual: number): Tendencia {
  const diferencia = Math.round(Math.abs(actual - anterior) * 100) / 100;
  if (diferencia === 0) return { direccion: 'igual', diferencia: 0 };
  const mejoro = p.mejorEs === 'menor' ? actual < anterior : actual > anterior;
  return { direccion: mejoro ? 'mejor' : 'peor', diferencia };
}

/** Puntaje 0–100 de un resultado (25 = límite bajo de la referencia, 75 = límite alto). */
export function puntaje(p: Prueba, valor: number, edadAnios: number, sexo: Sexo): number | null {
  if (p.tipoResultado === 'cualitativa') {
    const n = (p.escalaCualitativa?.length ?? 3) - 1;
    return n > 0 ? Math.round(10 + (valor / n) * 80) : null;
  }
  const r = referenciaPara(p, edadAnios, sexo);
  if (!r || r.valorAlto === r.valorBajo) return null;
  let x = (valor - r.valorBajo) / (r.valorAlto - r.valorBajo);
  if (p.mejorEs === 'menor') x = 1 - x;
  return Math.round(Math.min(100, Math.max(0, 25 + x * 50)));
}

/** Perfil por familia usando el último resultado de cada prueba. */
export function perfilMultidisciplinar(
  resultados: Pick<ResultadoPrueba, 'pruebaId' | 'fecha' | 'valorFinal' | 'noRealizada'>[],
  pruebas: Map<string, Prueba>,
  edadAnios: number,
  sexo: Sexo,
): Record<Familia, number | null> {
  const ultimo = new Map<string, number>();
  for (const r of [...resultados].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    if (r.valorFinal !== null && !r.noRealizada) ultimo.set(r.pruebaId, r.valorFinal);
  }
  const acc: Record<string, number[]> = {};
  for (const [id, v] of ultimo) {
    const p = pruebas.get(id);
    if (!p) continue;
    const s = puntaje(p, v, edadAnios, sexo);
    if (s !== null) (acc[p.familia] ??= []).push(s);
  }
  return Object.fromEntries(FAMILIAS.map((f) => {
    const v = acc[f.id];
    return [f.id, v?.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null];
  })) as Record<Familia, number | null>;
}

/** Texto amable que resume el perfil, sin recomendar un deporte específico. */
export function notaPerfil(perfil: Record<Familia, number | null>): string {
  const con = FAMILIAS.filter((f) => perfil[f.id] !== null).map((f) => ({ ...f, v: perfil[f.id]! }));
  if (con.length < 2) return 'Aún no hay suficientes resultados para armar el perfil.';
  const orden = [...con].sort((a, b) => b.v - a.v);
  const alto = orden[0], bajo = orden[orden.length - 1];
  if (alto.v - bajo.v < 8) return 'Tiene un desarrollo equilibrado entre las distintas habilidades.';
  return `Se destaca en ${alto.corto.toLowerCase()}. Conviene reforzar ${bajo.corto === 'Manos' || bajo.corto === 'Pies' ? `el trabajo con ${bajo.corto.toLowerCase()}` : `la ${bajo.corto.toLowerCase()}`}.`;
}

export function formatoValor(p: Pick<Prueba, 'tipoResultado' | 'escalaCualitativa'>, v: number | null): string {
  if (v === null || v === undefined) return '—';
  if (p.tipoResultado === 'cualitativa') return (p.escalaCualitativa ?? [])[v] ?? '—';
  return v.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}
