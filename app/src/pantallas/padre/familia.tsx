// Contexto del acudiente: sus hijos, el hijo seleccionado y las categorías.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  iniciales, type Asistencia, type Categoria, type MedicionFisica, type Nino, type Pago, type Prueba, type ResultadoPrueba,
  type Sesion, type SolicitudCambio,
} from '@pa/shared';
import { useColeccion, useDeFamilia } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { COLOR } from '../../ui/base';

interface Familia {
  ninos: Nino[]; // activos e inactivos (no pendientes ni rechazados)
  solicitudes: Nino[]; // inscripciones pendientes o rechazadas
  nino: Nino | null;
  elegir: (id: string) => void;
  categorias: Map<string, Categoria>;
  pruebas: Map<string, Prueba>;
  cargando: boolean;
  // Datos del hijo seleccionado, ordenados por fecha ascendente
  asistencias: Asistencia[];
  sesiones: Sesion[]; // de la categoría del hijo
  pagos: Pago[];
  mediciones: MedicionFisica[];
  resultados: ResultadoPrueba[];
  solicitudesCambio: SolicitudCambio[];
  /** Rutas de navegación (cambian si las vistas se reutilizan en la ficha del entrenador). */
  rutas: { pruebas: string; prueba: (id: string) => string };
}

export const RUTAS_PADRE: Familia['rutas'] = { pruebas: '/p/hijo/pruebas', prueba: (id) => `/p/prueba/${id}` };

export const CtxFamilia = createContext<Familia | null>(null);
const Ctx = CtxFamilia;
export type { Familia };
const CLAVE = 'pa:nino';

function leer(): string | null { try { return localStorage.getItem(CLAVE); } catch { return null; } }
function guardar(id: string) { try { localStorage.setItem(CLAVE, id); } catch { /* sin almacenamiento */ } }

export function ProveedorFamilia({ children }: { children: ReactNode }) {
  const { usuario } = useSesion();
  const todos = useDeFamilia<Nino>('ninos', usuario?.uid);
  const cats = useColeccion<Categoria>('categorias');
  const [params, setParams] = useSearchParams();
  const [sel, setSel] = useState<string | null>(leer());

  const ninos = useMemo(() => todos.datos.filter((n) => n.estado === 'activo' || n.estado === 'inactivo')
    .sort((a, b) => (a.estado === b.estado ? a.fechaNacimiento.localeCompare(b.fechaNacimiento) : a.estado === 'activo' ? -1 : 1)), [todos.datos]);
  const solicitudes = useMemo(() => todos.datos.filter((n) => n.estado === 'pendiente_aprobacion' || n.estado === 'rechazado'), [todos.datos]);

  // ?nino=… en la URL (enlaces de notificaciones) tiene prioridad
  const deUrl = params.get('nino');
  useEffect(() => {
    if (deUrl && ninos.some((n) => n.id === deUrl)) {
      setSel(deUrl); guardar(deUrl);
      params.delete('nino'); setParams(params, { replace: true });
    }
  }, [deUrl, ninos]); // eslint-disable-line react-hooks/exhaustive-deps

  const nino = ninos.find((n) => n.id === sel) ?? ninos[0] ?? null;
  const categorias = useMemo(() => new Map(cats.datos.map((c) => [c.id, c])), [cats.datos]);

  const uid = usuario?.uid;
  const asis = useDeFamilia<Asistencia>('asistencias', uid);
  const pag = useDeFamilia<Pago>('pagos', uid);
  const med = useDeFamilia<MedicionFisica>('medicionesFisicas', uid);
  const res = useDeFamilia<ResultadoPrueba>('resultadosPruebas', uid);
  const sol = useDeFamilia<SolicitudCambio>('solicitudesCambio', uid);
  const pr = useColeccion<Prueba>('pruebas');
  const ses = useColeccion<Sesion>(nino?.categoriaId ? 'sesiones' : null, [['categoriaId', '==', nino?.categoriaId ?? '']]);
  const pruebas = useMemo(() => new Map(pr.datos.map((p) => [p.id, p])), [pr.datos]);

  const delNino = <T extends { ninoId: string; fecha?: string }>(xs: T[]) =>
    nino ? xs.filter((x) => x.ninoId === nino.id).sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? '')) : [];

  const valor: Familia = {
    ninos, solicitudes, nino, elegir: (id) => { setSel(id); guardar(id); }, categorias, pruebas,
    cargando: todos.cargando || cats.cargando || asis.cargando || pag.cargando || res.cargando || pr.cargando,
    asistencias: useMemo(() => delNino(asis.datos), [asis.datos, nino?.id]), // eslint-disable-line react-hooks/exhaustive-deps
    pagos: useMemo(() => (nino ? pag.datos.filter((p) => p.ninoId === nino.id).sort((a, b) => a.periodo.localeCompare(b.periodo)) : []), [pag.datos, nino?.id]), // eslint-disable-line react-hooks/exhaustive-deps
    mediciones: useMemo(() => delNino(med.datos), [med.datos, nino?.id]), // eslint-disable-line react-hooks/exhaustive-deps
    resultados: useMemo(() => delNino(res.datos), [res.datos, nino?.id]), // eslint-disable-line react-hooks/exhaustive-deps
    solicitudesCambio: useMemo(() => delNino(sol.datos), [sol.datos, nino?.id]), // eslint-disable-line react-hooks/exhaustive-deps
    sesiones: useMemo(() => [...ses.datos].sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio)), [ses.datos]),
    rutas: RUTAS_PADRE,
  };

  return (
    <Ctx.Provider value={valor}>
      {children}
    </Ctx.Provider>
  );
}

export function useFamilia() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useFamilia fuera de ProveedorFamilia');
  return c;
}

const COLORES_AVATAR = [COLOR.marca, '#7B3FE4', '#C2410C', '#0E7490'];

export function colorNino(ninos: Nino[], id: string) {
  const i = ninos.findIndex((n) => n.id === id);
  return COLORES_AVATAR[Math.max(0, i) % COLORES_AVATAR.length];
}

/** Botones circulares para cambiar de hijo (cabecera de Asistencia, Pagos, Mi hijo). */
export function SelectorMini() {
  const { ninos, nino, elegir } = useFamilia();
  if (ninos.length < 2) return null;
  return (
    <div className="flex gap-1.5 shrink-0">
      {ninos.map((n) => {
        const on = n.id === nino?.id;
        return (
          <button key={n.id} onClick={() => elegir(n.id)} aria-label={n.nombres}
            className="w-[34px] h-[34px] rounded-full cursor-pointer text-[11px] font-extrabold"
            style={{ background: on ? COLOR.verde : '#141924', color: on ? COLOR.tinta : '#C9CFDB', border: `1px solid ${on ? COLOR.verde : 'rgba(255,255,255,0.1)'}` }}>
            {iniciales(n.nombres, n.apellidos)}
          </button>
        );
      })}
    </div>
  );
}
