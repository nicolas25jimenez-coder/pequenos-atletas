// Adaptador de datos sobre Supabase: hooks en tiempo real y funciones de lectura/escritura.
// Las pantallas hablan en "colecciones" y objetos (camelCase); aquí se traduce a tablas y columnas.
// Cada fila guarda el objeto completo (sin id) en la columna `datos` (jsonb); el servidor
// deriva las columnas reales (nino_id, estado, fecha...) a partir de `datos`.
import { useEffect, useState } from 'react';
import { ahoraIso, CONFIG_POR_DEFECTO, type Configuracion } from '@pa/shared';
import { supabase, traducirError } from './supabase';

export interface Estado<T> { datos: T; cargando: boolean; error: string | null }

/** Operadores de filtro (mismos nombres que usaba Firestore). */
export type Operador = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'not-in' | 'array-contains' | 'array-contains-any';
export type Filtro = [campo: string, op: Operador, valor: unknown];

// ---------------------------------------------------------------------------------------------
// Tablas y columnas
// ---------------------------------------------------------------------------------------------

/** Nombre de colección (camelCase) → tabla de Postgres. */
const TABLAS: Record<string, string> = {
  usuarios: 'usuarios', ninos: 'ninos', categorias: 'categorias', sesiones: 'sesiones', pruebas: 'pruebas',
  plantillasControl: 'plantillas_control', mediosPago: 'medios_pago', eventos: 'eventos', anuncios: 'anuncios',
  configuracion: 'configuracion', asistencias: 'asistencias', medicionesFisicas: 'mediciones_fisicas', pagos: 'pagos',
  resultadosPruebas: 'resultados_pruebas', confirmacionesEvento: 'confirmaciones_evento',
  solicitudesCambio: 'solicitudes_cambio', invitaciones: 'invitaciones', notificaciones: 'notificaciones',
};

const snake = (s: string) => s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

/** Campos (camelCase) que existen como columna real en cada tabla; el resto se filtra en el cliente. */
const CAMPOS_COLUMNA: Record<string, string[]> = {
  usuarios: ['rol', 'correo', 'estado'],
  ninos: ['estado', 'categoriaId', 'acudientesIds'],
  categorias: [],
  sesiones: ['categoriaId', 'fecha', 'estado'],
  pruebas: [],
  plantillasControl: [],
  mediosPago: [],
  eventos: ['fechaInicio'],
  anuncios: [],
  configuracion: [],
  asistencias: ['ninoId', 'sesionId', 'fecha', 'acudientesIds'],
  medicionesFisicas: ['ninoId', 'fecha', 'acudientesIds'],
  pagos: ['ninoId', 'periodo', 'estado', 'acudientesIds'],
  resultadosPruebas: ['ninoId', 'sesionId', 'pruebaId', 'acudientesIds'],
  confirmacionesEvento: ['eventoId', 'ninoId', 'acudientesIds'],
  solicitudesCambio: ['ninoId', 'estado', 'solicitadoPor', 'acudientesIds'],
  invitaciones: ['correo', 'estado', 'invitadoPor'],
  notificaciones: ['usuarioId', 'leida', 'fecha'],
};

/** Mapa COLUMNAS: colección → { campo camelCase → columna snake_case }. */
export const COLUMNAS: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(CAMPOS_COLUMNA).map(([c, campos]) => [c, { id: 'id', ...Object.fromEntries(campos.map((x) => [x, snake(x)])) }]),
);

function tablaDe(nombre: string): string {
  const t = TABLAS[nombre];
  if (!t) throw new Error(`Colección desconocida: ${nombre}`);
  return t;
}

interface Fila { id: string; datos: Record<string, unknown> | null }
const aObjeto = <T,>(f: Fila) => ({ ...(f.datos ?? {}), id: f.id }) as T;

// ---------------------------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------------------------

/** Evalúa un filtro sobre un objeto en el cliente (para campos que no son columna). */
function cumple(o: Record<string, unknown>, [campo, op, valor]: Filtro): boolean {
  const v = o[campo];
  const cmp = (a: unknown, b: unknown) => ((a as string) < (b as string) ? -1 : (a as string) > (b as string) ? 1 : 0);
  switch (op) {
    case '==': return v === valor || (valor === null && v == null);
    case '!=': return v !== valor;
    case '>': return v != null && cmp(v, valor) > 0;
    case '>=': return v != null && cmp(v, valor) >= 0;
    case '<': return v != null && cmp(v, valor) < 0;
    case '<=': return v != null && cmp(v, valor) <= 0;
    case 'in': return Array.isArray(valor) && valor.includes(v);
    case 'not-in': return Array.isArray(valor) && !valor.includes(v);
    case 'array-contains': return Array.isArray(v) && v.includes(valor);
    case 'array-contains-any': return Array.isArray(v) && Array.isArray(valor) && v.some((x) => valor.includes(x));
  }
}

/** Trae todas las filas que cumplen los filtros (pagina de 1000 en 1000). */
async function consultar<T>(nombre: string, filtros: Filtro[] = []): Promise<T[]> {
  const tabla = tablaDe(nombre);
  const cols = COLUMNAS[nombre];
  const enCliente: Filtro[] = [];
  const enServidor: Filtro[] = [];
  for (const f of filtros) {
    const [campo, op, valor] = f;
    if (!cols[campo]) enCliente.push(f);
    else if (op === 'in' && Array.isArray(valor) && valor.length === 0) return []; // nada puede coincidir
    else if (op === 'not-in' || op === 'array-contains-any') enCliente.push(f);
    else enServidor.push(f);
  }
  const filas: Fila[] = [];
  for (let desde = 0; ; desde += 1000) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from(tabla).select('id, datos');
    for (const [campo, op, valor] of enServidor) {
      const col = cols[campo];
      if (op === '==') q = valor === null ? q.is(col, null) : q.eq(col, valor);
      else if (op === '!=') q = q.neq(col, valor);
      else if (op === '>') q = q.gt(col, valor);
      else if (op === '>=') q = q.gte(col, valor);
      else if (op === '<') q = q.lt(col, valor);
      else if (op === '<=') q = q.lte(col, valor);
      else if (op === 'in') q = q.in(col, valor as unknown[]);
      else if (op === 'array-contains') q = q.contains(col, [valor]);
    }
    const { data, error } = await q.order('id').range(desde, desde + 999);
    if (error) throw traducirError(error);
    const pagina = (data ?? []) as Fila[];
    filas.push(...pagina);
    if (pagina.length < 1000) break;
  }
  let objs = filas.map((f) => aObjeto<Record<string, unknown>>(f));
  if (enCliente.length) objs = objs.filter((o) => enCliente.every((f) => cumple(o, f)));
  return objs as T[];
}

/** Lee un documento por id; devuelve null si no existe. */
export async function obtener<T>(nombre: string, id: string): Promise<T | null> {
  const { data, error } = await supabase.from(tablaDe(nombre)).select('id, datos').eq('id', id).maybeSingle();
  if (error) throw traducirError(error);
  return data ? aObjeto<T>(data as Fila) : null;
}

/** Lee una sola vez (sin tiempo real) todos los documentos que cumplen los filtros. */
export async function listar<T>(nombre: string, filtros: Filtro[] = []): Promise<T[]> {
  try { return await consultar<T>(nombre, filtros); } catch (e) { throw traducirError(e); }
}

// ---------------------------------------------------------------------------------------------
// Aviso interno de cambios (para refrescar al instante aunque Realtime tarde o esté apagado)
// ---------------------------------------------------------------------------------------------

const oyentes = new Map<string, Set<() => void>>();
function alCambiar(tabla: string, fn: () => void): () => void {
  if (!oyentes.has(tabla)) oyentes.set(tabla, new Set());
  oyentes.get(tabla)!.add(fn);
  return () => { oyentes.get(tabla)?.delete(fn); };
}
function avisar(tabla: string) { oyentes.get(tabla)?.forEach((fn) => fn()); }

// ---------------------------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------------------------

/** Quita propiedades undefined (el JSON no las admite). */
export function limpio<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

/** Asigna un valor dentro de un objeto siguiendo una ruta 'a.b.0.c' (copia de la de entrenador/acciones.ts). */
function asignarRuta<T extends object>(obj: T, ruta: string, valor: unknown): T {
  const copia = structuredClone(obj) as Record<string, unknown>;
  const partes = ruta.split('.');
  let cur: Record<string, unknown> | unknown[] = copia;
  partes.slice(0, -1).forEach((p) => {
    const k = /^\d+$/.test(p) ? Number(p) : p;
    const sig = (cur as Record<string | number, unknown>)[k];
    if (sig === undefined || sig === null) (cur as Record<string | number, unknown>)[k] = {};
    cur = (cur as Record<string | number, unknown>)[k] as Record<string, unknown>;
  });
  const ult = partes[partes.length - 1];
  (cur as Record<string | number, unknown>)[/^\d+$/.test(ult) ? Number(ult) : ult] = valor;
  return copia as T;
}

/** Aplica un parche (claves normales o con punto, como 'preferenciasNotificacion.eventos') a un objeto. */
function aplicarParche(base: Record<string, unknown>, parche: Record<string, unknown>): Record<string, unknown> {
  let r = base;
  for (const [k, v] of Object.entries(parche)) {
    if (v === undefined) { r = { ...r }; delete r[k]; } // undefined = quitar el campo
    else r = asignarRuta(r, k, v);
  }
  return limpio(r);
}

function sinId<T extends { id?: string }>(obj: T): { id: string; datos: Record<string, unknown> } {
  const { id, ...datos } = limpio(obj) as { id?: string } & Record<string, unknown>;
  if (!id) throw new Error('Falta el id del registro.');
  return { id, datos };
}

/** Crea o reemplaza un documento completo (upsert por id). El objeto debe traer `id`. */
export async function guardar<T extends { id: string }>(nombre: string, obj: T): Promise<void> {
  const tabla = tablaDe(nombre);
  const { error } = await supabase.from(tabla).upsert(sinId(obj));
  if (error) throw traducirError(error);
  avisar(tabla);
}

/** Crea o reemplaza varios documentos de una misma colección en una sola llamada. */
export async function guardarVarios<T extends { id: string }>(nombre: string, objs: T[]): Promise<void> {
  if (!objs.length) return;
  const tabla = tablaDe(nombre);
  const { error } = await supabase.from(tabla).upsert(objs.map(sinId));
  if (error) throw traducirError(error);
  avisar(tabla);
}

/** Cambia solo algunos campos de un documento (admite claves con punto y undefined = quitar). Falla si no existe. */
export async function actualizar(nombre: string, id: string, parche: Record<string, unknown>): Promise<void> {
  const tabla = tablaDe(nombre);
  const actual = await obtener<Record<string, unknown>>(nombre, id);
  if (!actual) throw new Error('El registro ya no existe.');
  const { id: _omitido, ...datos } = actual; // eslint-disable-line @typescript-eslint/no-unused-vars
  const { data, error } = await supabase.from(tabla).update({ datos: aplicarParche(datos, parche) }).eq('id', id).select('id');
  if (error) throw traducirError(error);
  if (!data?.length) throw new Error('No tienes permiso para hacer esto.');
  avisar(tabla);
}

/** Agrega un valor a un campo-lista sin repetirlo (como arrayUnion). Crea la lista si no existe. */
export async function agregarA(nombre: string, id: string, campo: string, valor: unknown): Promise<void> {
  const actual = await obtener<Record<string, unknown>>(nombre, id);
  if (!actual) throw new Error('El registro ya no existe.');
  const lista = Array.isArray(actual[campo]) ? (actual[campo] as unknown[]) : [];
  const ya = lista.some((x) => JSON.stringify(x) === JSON.stringify(valor));
  if (!ya) await actualizar(nombre, id, { [campo]: [...lista, valor] });
}

/** Quita un valor de un campo-lista (como arrayRemove). */
export async function quitarDe(nombre: string, id: string, campo: string, valor: unknown): Promise<void> {
  const actual = await obtener<Record<string, unknown>>(nombre, id);
  if (!actual || !Array.isArray(actual[campo])) return;
  const lista = (actual[campo] as unknown[]).filter((x) => JSON.stringify(x) !== JSON.stringify(valor));
  await actualizar(nombre, id, { [campo]: lista });
}

/** Borra un documento. */
export async function borrar(nombre: string, id: string): Promise<void> {
  const tabla = tablaDe(nombre);
  const { error } = await supabase.from(tabla).delete().eq('id', id);
  if (error) throw traducirError(error);
  avisar(tabla);
}

/**
 * Lote de escrituras (reemplaza a writeBatch). OJO: no es atómico; si una operación falla,
 * las anteriores ya se guardaron. Se ejecutan en el orden en que se agregaron.
 * Uso: const l = lote(); l.guardar('pagos', p); l.actualizar('ninos', id, {...}); await l.confirmar();
 */
export function lote() {
  const pendientes: { nombre: string; objs?: { id: string }[]; op?: () => Promise<void> }[] = [];
  return {
    /** Agrega un guardado (set). */
    guardar<T extends { id: string }>(nombre: string, obj: T) {
      const ultimo = pendientes[pendientes.length - 1];
      if (ultimo?.objs && ultimo.nombre === nombre) ultimo.objs.push(obj);
      else pendientes.push({ nombre, objs: [obj] });
    },
    /** Agrega un parche (update). */
    actualizar(nombre: string, id: string, parche: Record<string, unknown>) {
      pendientes.push({ nombre, op: () => actualizar(nombre, id, parche) });
    },
    /** Agrega un borrado. */
    borrar(nombre: string, id: string) {
      pendientes.push({ nombre, op: () => borrar(nombre, id) });
    },
    /** Ejecuta todo en orden. */
    async confirmar() {
      for (const p of pendientes) {
        if (p.objs) await guardarVarios(p.nombre, p.objs);
        else await p.op!();
      }
      pendientes.length = 0;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Hooks en tiempo real
// ---------------------------------------------------------------------------------------------

let contadorCanales = 0;

/**
 * Carga datos y los vuelve a cargar cuando la tabla cambia (Realtime, cambios propios o al volver a la app).
 * `clave` controla cuándo se reinicia; `tabla` null = no consultar. Seguro con el doble montaje de StrictMode.
 */
function useVivo<R>(tabla: string | null, filtroRealtime: string | undefined, cargar: () => Promise<R>, vacio: R, clave: unknown[]): Estado<R> {
  const [estado, setEstado] = useState<Estado<R>>({ datos: vacio, cargando: true, error: null });
  useEffect(() => {
    if (!tabla) { setEstado({ datos: vacio, cargando: false, error: null }); return; }
    let vivo = true;
    let ultima = 0;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const traer = async () => {
      const mi = ++ultima;
      try {
        const d = await cargar();
        if (vivo && mi === ultima) setEstado({ datos: d, cargando: false, error: null });
      } catch (e) {
        console.error(e);
        if (vivo && mi === ultima) setEstado({ datos: vacio, cargando: false, error: traducirError(e).message });
      }
    };
    const pedir = () => { clearTimeout(temporizador); temporizador = setTimeout(traer, 120); };
    setEstado((e) => ({ ...e, cargando: true }));
    traer();

    let yaSuscrito = false;
    const canal = supabase
      .channel(`pa-${tabla}-${++contadorCanales}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabla, ...(filtroRealtime ? { filter: filtroRealtime } : {}) }, pedir)
      .subscribe((s) => {
        if (s !== 'SUBSCRIBED') return;
        if (yaSuscrito) pedir(); // se reconectó: puede haber cambios perdidos
        yaSuscrito = true;
      });
    const quitarAviso = alCambiar(tabla, pedir);
    const alVolver = () => { if (document.visibilityState === 'visible') pedir(); };
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      vivo = false;
      clearTimeout(temporizador);
      quitarAviso();
      document.removeEventListener('visibilitychange', alVolver);
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, clave);
  return estado;
}

const SIN_DATOS: never[] = [];

/** Colección con filtros, en tiempo real. nombre null = no consultar. El orden se aplica en la pantalla. */
export function useColeccion<T>(nombre: string | null, filtros: Filtro[] = []): Estado<T[]> {
  const clave = JSON.stringify([nombre, filtros]);
  return useVivo<T[]>(nombre ? tablaDe(nombre) : null, undefined, () => consultar<T>(nombre!, filtros), SIN_DATOS, [clave]);
}

/** Un documento en tiempo real. `ruta` = 'coleccion/id'; null = no consultar. */
export function useDocumento<T>(ruta: string | null): Estado<T | null> {
  const corte = ruta ? ruta.indexOf('/') : -1;
  const nombre = ruta && corte > 0 ? ruta.slice(0, corte) : null;
  const id = ruta && corte > 0 ? ruta.slice(corte + 1) : null;
  return useVivo<T | null>(nombre ? tablaDe(nombre) : null, id ? `id=eq.${id}` : undefined, () => obtener<T>(nombre!, id!), null, [ruta]);
}

/** Documentos de una familia: todo lo que tenga al usuario en acudientesIds. */
export function useDeFamilia<T>(nombre: string, uid: string | undefined): Estado<T[]> {
  return useVivo<T[]>(uid ? tablaDe(nombre) : null, undefined, () => consultar<T>(nombre, [['acudientesIds', 'array-contains', uid]]), SIN_DATOS, [nombre, uid]);
}

export function useConfiguracion(): Configuracion {
  const { datos } = useDocumento<Configuracion>('configuracion/general');
  return { ...CONFIG_POR_DEFECTO, ...(datos ?? {}) };
}

export function auditoriaNueva(uid: string) {
  const t = ahoraIso();
  return { creadoEn: t, actualizadoEn: t, creadoPor: uid };
}

/** Id nuevo y único (texto sin guiones; los usuarios usan uuid normal). */
export function idNuevo(nombre: string): string {
  const u = crypto.randomUUID();
  return nombre === 'usuarios' ? u : u.replace(/-/g, '');
}
