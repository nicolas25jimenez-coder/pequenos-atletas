// Operaciones del entrenador que tocan varios documentos.
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  ahoraIso, construirPago, diaCobroDe, hoy, periodoVigente,
  type Categoria, type Configuracion, type Nino,
} from '@pa/shared';
import { db } from '../../lib/firebase';

/** Genera el pago del ciclo vigente si no existe (al aprobar o activar un niño). */
export async function asegurarPagoVigente(nino: Nino, categoria: Categoria, config: Configuracion, uid: string) {
  if (!nino.fechaInscripcion) return;
  const dia = diaCobroDe(nino);
  const periodo = periodoVigente(dia, hoy() < nino.fechaInscripcion ? nino.fechaInscripcion : hoy());
  const ref = doc(db, 'pagos', `${nino.id}_${periodo}`);
  if ((await getDoc(ref)).exists()) return;
  const p = construirPago({ ninoId: nino.id, acudientesIds: nino.acudientesIds, categoriaId: categoria.id, diaCobro: dia, valorMensual: categoria.valorMensual, descuento: nino.descuento }, periodo, config);
  await setDoc(ref, { ...p, creadoEn: ahoraIso(), actualizadoEn: ahoraIso(), creadoPor: uid });
}

/** Asigna un valor dentro de un objeto siguiendo una ruta 'a.b.0.c' (para aplicar solicitudes de cambio). */
export function asignarRuta<T extends object>(obj: T, ruta: string, valor: unknown): T {
  const copia = structuredClone(obj) as Record<string, unknown>;
  const partes = ruta.split('.');
  let cur: Record<string, unknown> | unknown[] = copia;
  partes.slice(0, -1).forEach((p) => {
    const k = /^\d+$/.test(p) ? Number(p) : p;
    cur = (cur as Record<string | number, unknown>)[k] as Record<string, unknown>;
  });
  const ult = partes[partes.length - 1];
  (cur as Record<string | number, unknown>)[/^\d+$/.test(ult) ? Number(ult) : ult] = valor;
  return copia as T;
}
