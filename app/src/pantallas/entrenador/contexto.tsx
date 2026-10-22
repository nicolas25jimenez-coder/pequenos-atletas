import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  iniciales, nombreCorto, type Asistencia, type Categoria, type MedicionFisica, type Nino, type Pago, type Prueba,
  type ResultadoPrueba, type Sesion, type SolicitudCambio,
} from '@pa/shared';
import { useColeccion } from '../../lib/datos';
import { CtxFamilia, type Familia } from '../padre/familia';

interface Entrenador {
  ninos: Nino[]; // todos (incluye pendientes, inactivos y rechazados)
  activos: Nino[];
  porId: Map<string, Nino>;
  categorias: Categoria[];
  catPorId: Map<string, Categoria>;
  pruebas: Prueba[];
  pruebaPorId: Map<string, Prueba>;
  cargando: boolean;
}

const Ctx = createContext<Entrenador | null>(null);

export function ProveedorEntrenador({ children }: { children: ReactNode }) {
  const n = useColeccion<Nino>('ninos');
  const c = useColeccion<Categoria>('categorias');
  const p = useColeccion<Prueba>('pruebas');
  const valor = useMemo<Entrenador>(() => {
    const ninos = [...n.datos].sort((a, b) => `${a.nombres} ${a.apellidos}`.localeCompare(`${b.nombres} ${b.apellidos}`, 'es'));
    const categorias = [...c.datos].sort((a, b) => a.rangoEdad.min - b.rangoEdad.min || a.nombre.localeCompare(b.nombre));
    const pruebas = [...p.datos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return {
      ninos, activos: ninos.filter((x) => x.estado === 'activo'), porId: new Map(ninos.map((x) => [x.id, x])),
      categorias, catPorId: new Map(categorias.map((x) => [x.id, x])),
      pruebas, pruebaPorId: new Map(pruebas.map((x) => [x.id, x])),
      cargando: n.cargando || c.cargando || p.cargando,
    };
  }, [n.datos, c.datos, p.datos, n.cargando, c.cargando, p.cargando]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useEntrenador() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEntrenador fuera de ProveedorEntrenador');
  return c;
}

export const nombreNino = (n: Nino) => nombreCorto(n.nombres, n.apellidos);
export const iniNino = (n: Nino) => iniciales(n.nombres, n.apellidos);

/** Alerta de salud resumida (alergias o condiciones) para mostrar en asistencia y captura. */
export function alertaSalud(n: Nino): string | null {
  const partes: string[] = [];
  const nada = (v?: string) => !v || /^(ningun[oa]?|no|n\/a|-)$/i.test(v.trim());
  if (!nada(n.salud.alergias)) partes.push(`Alergia: ${n.salud.alergias}`);
  if (!nada(n.salud.condicionesMedicas)) partes.push(n.salud.condicionesMedicas);
  if (!nada(n.salud.restriccionesActividad)) partes.push(`Restricción: ${n.salud.restriccionesActividad}`);
  return partes.length ? partes.join(' · ') : null;
}

/** Provee el mismo contexto que ve el padre, pero para un solo niño (ficha del entrenador). */
export function ProveedorNino({ nino, children }: { nino: Nino; children: ReactNode }) {
  const { catPorId, pruebaPorId } = useEntrenador();
  const f: [string, '==', string][] = [['ninoId', '==', nino.id]];
  const asis = useColeccion<Asistencia>('asistencias', f);
  const pag = useColeccion<Pago>('pagos', f);
  const med = useColeccion<MedicionFisica>('medicionesFisicas', f);
  const res = useColeccion<ResultadoPrueba>('resultadosPruebas', f);
  const sol = useColeccion<SolicitudCambio>('solicitudesCambio', f);
  const ses = useColeccion<Sesion>(nino.categoriaId ? 'sesiones' : null, [['categoriaId', '==', nino.categoriaId ?? '']]);
  const orden = <T extends { fecha: string }>(xs: T[]) => [...xs].sort((a, b) => a.fecha.localeCompare(b.fecha));

  const valor: Familia = {
    ninos: [nino], solicitudes: [], nino, elegir: () => {}, categorias: catPorId, pruebas: pruebaPorId,
    cargando: asis.cargando || res.cargando,
    asistencias: useMemo(() => orden(asis.datos), [asis.datos]),
    pagos: useMemo(() => [...pag.datos].sort((a, b) => a.periodo.localeCompare(b.periodo)), [pag.datos]),
    mediciones: useMemo(() => orden(med.datos), [med.datos]),
    resultados: useMemo(() => orden(res.datos), [res.datos]),
    solicitudesCambio: useMemo(() => orden(sol.datos.map((s) => ({ ...s, fecha: s.creadoEn ?? '' }))), [sol.datos]),
    sesiones: useMemo(() => [...ses.datos].sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio)), [ses.datos]),
    rutas: { pruebas: `/e/nino/${nino.id}/pruebas`, prueba: (id) => `/e/nino/${nino.id}/prueba/${id}` },
  };
  return <CtxFamilia.Provider value={valor}>{children}</CtxFamilia.Provider>;
}
