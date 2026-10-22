// Hooks de lectura en tiempo real y utilidades de escritura sobre Firestore.
import {
  collection, doc, onSnapshot, query, where, type DocumentData, type Query, type QueryConstraint, type WhereFilterOp,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ahoraIso, CONFIG_POR_DEFECTO, type Configuracion } from '@pa/shared';
import { db } from './firebase';

export interface Estado<T> { datos: T; cargando: boolean; error: string | null }

/** Escucha una consulta. `clave` controla cuándo se vuelve a suscribir; null = no consultar. */
export function useConsulta<T>(fabrica: () => Query<DocumentData> | null, clave: unknown[]): Estado<T[]> {
  const [estado, setEstado] = useState<Estado<T[]>>({ datos: [], cargando: true, error: null });
  useEffect(() => {
    const q = fabrica();
    if (!q) { setEstado({ datos: [], cargando: false, error: null }); return; }
    setEstado((e) => ({ ...e, cargando: true }));
    return onSnapshot(q,
      (s) => setEstado({ datos: s.docs.map((d) => ({ id: d.id, ...d.data() }) as T), cargando: false, error: null }),
      (e) => { console.error(e); setEstado({ datos: [], cargando: false, error: e.message }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, clave);
  return estado;
}

export type Filtro = [campo: string, op: WhereFilterOp, valor: unknown];

/** Colección con filtros `where`. El orden se aplica en el cliente para no requerir índices compuestos. */
export function useColeccion<T>(nombre: string | null, filtros: Filtro[] = []): Estado<T[]> {
  const clave = JSON.stringify([nombre, filtros]);
  const restricciones = useMemo<QueryConstraint[]>(() => filtros.map(([c, o, v]) => where(c, o, v)), [clave]); // eslint-disable-line react-hooks/exhaustive-deps
  return useConsulta<T>(() => (nombre ? query(collection(db, nombre), ...restricciones) : null), [clave]);
}

export function useDocumento<T>(ruta: string | null): Estado<T | null> {
  const [estado, setEstado] = useState<Estado<T | null>>({ datos: null, cargando: true, error: null });
  useEffect(() => {
    if (!ruta) { setEstado({ datos: null, cargando: false, error: null }); return; }
    setEstado((e) => ({ ...e, cargando: true }));
    return onSnapshot(doc(db, ruta),
      (s) => setEstado({ datos: s.exists() ? ({ id: s.id, ...s.data() } as T) : null, cargando: false, error: null }),
      (e) => { console.error(e); setEstado({ datos: null, cargando: false, error: e.message }); });
  }, [ruta]);
  return estado;
}

/** Documentos de una familia: todo lo que tenga al usuario en acudientesIds. */
export function useDeFamilia<T>(nombre: string, uid: string | undefined): Estado<T[]> {
  return useConsulta<T>(() => (uid ? query(collection(db, nombre), where('acudientesIds', 'array-contains', uid)) : null), [nombre, uid]);
}

export function useConfiguracion(): Configuracion {
  const { datos } = useDocumento<Configuracion>('configuracion/general');
  return { ...CONFIG_POR_DEFECTO, ...(datos ?? {}) };
}

export function auditoriaNueva(uid: string) {
  const t = ahoraIso();
  return { creadoEn: t, actualizadoEn: t, creadoPor: uid };
}

export function idNuevo(nombre: string): string {
  return doc(collection(db, nombre)).id;
}

/** Quita propiedades undefined (Firestore no las acepta dentro de arreglos). */
export function limpio<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}
