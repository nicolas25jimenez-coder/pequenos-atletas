// Asignar ejercicios para casa: categoría y sesión a cubrir, niños, hasta 3 ejercicios y envío.
import { PaperPlaneTilt, Plus, Trash, X } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ahoraIso, asignarEjercicio, fechaCorta, hoy, NIVELES_VARIANTE, nombreTipo, textoCarga, TIPOS_EJERCICIO,
  type Asistencia, type CargaEjercicio, type Ejercicio, type EjercicioAsignado, type Sesion, type SesionRemota, type TipoCarga, type TipoEjercicio,
} from '@pa/shared';
import { guardarVarios, idNuevo, useColeccion } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, Chips, COLOR, Encabezado, Etiqueta, Hoja, Kicker, Selector, Tarjeta, Volver, useToast, AreaTexto } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { nombreNino, useEntrenador } from './contexto';
import { useEjercicios } from './Ejercicios';

const quitarTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const RANURAS = 3;

export function AsignarEjercicios() {
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { categorias, activos } = useEntrenador();
  const { lista } = useEjercicios();
  const [catId, setCatId] = useState('');
  const [sesId, setSesId] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [ninos, setNinos] = useState<string[]>([]);
  const [ranuras, setRanuras] = useState<(EjercicioAsignado | null)[]>(Array(RANURAS).fill(null));
  const [abierta, setAbierta] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const sesiones = useColeccion<Sesion>(catId ? 'sesiones' : null, [['categoriaId', '==', catId]]);
  const asis = useColeccion<Asistencia>(sesId ? 'asistencias' : null, [['sesionId', '==', sesId]]);
  const ses = useMemo(() => [...sesiones.datos].filter((s) => s.estado !== 'cancelada').sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 15), [sesiones.datos]);
  const sesion = ses.find((s) => s.id === sesId);
  const kids = useMemo(() => activos.filter((n) => n.categoriaId === catId), [activos, catId]);

  // Al elegir categoría: primera categoría por defecto.
  useEffect(() => { if (!catId && categorias.length) setCatId(categorias.find((c) => c.activa)?.id ?? categorias[0].id); }, [categorias, catId]);
  // Al cargar sesiones: la más reciente que ya pasó (o la de hoy).
  useEffect(() => {
    if (!catId || sesiones.cargando || sesId) return;
    const pasada = ses.find((s) => s.fecha <= hoy()) ?? ses[0];
    if (pasada) setSesId(pasada.id);
  }, [catId, sesiones.cargando, ses, sesId]);
  // Objetivo = tema de la sesión.
  useEffect(() => { if (sesion) setObjetivo(sesion.tema?.trim() || sesion.notasGenerales?.trim() || ''); }, [sesion?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Niños que faltaron a esa sesión, marcados de entrada.
  useEffect(() => {
    if (!sesId || asis.cargando) return;
    setNinos(asis.datos.filter((a) => a.estado === 'falto' || a.estado === 'excusa').map((a) => a.ninoId));
  }, [sesId, asis.cargando, asis.datos]);

  const alternar = (id: string) => setNinos((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const llenas = ranuras.filter(Boolean) as EjercicioAsignado[];

  async function enviar() {
    setError('');
    if (!sesion) return setError('Elige la categoría y la sesión que quieres cubrir.');
    if (!ninos.length) return setError('Elige al menos un niño.');
    if (!llenas.length) return setError('Añade al menos un ejercicio.');
    setEnviando(true);
    try {
      const t = ahoraIso();
      const docs: SesionRemota[] = ninos.map((nid) => {
        const n = kids.find((k) => k.id === nid)!;
        return {
          id: idNuevo('sesionesRemotas'), ninoId: nid, acudientesIds: n.acudientesIds, categoriaId: catId, sesionId: sesion.id, fecha: hoy(), enviadaEn: t,
          objetivo: objetivo.trim(), ejercicios: llenas, estado: 'enviada', creadoEn: t, actualizadoEn: t, creadoPor: usuario?.uid,
        };
      });
      await guardarVarios('sesionesRemotas', docs);
      toast(`Sesión enviada a ${docs.length} ${docs.length === 1 ? 'niño' : 'niños'}. Se avisó a los acudientes.`);
      nav('/e/remotas');
    } catch (e) { setError(mensajeError(e)); }
    setEnviando(false);
  }

  return (
    <Pantalla>
      <Volver a="/e/repositorio/ejercicios">Ejercicios</Volver>
      <Encabezado titulo="Asignar" sub="Ejercicios para casa" />

      <Tarjeta className="gap-3">
        <Kicker>1. Sesión a cubrir</Kicker>
        <Etiqueta texto="Categoría"><Selector value={catId} onChange={(e) => { setCatId(e.target.value); setSesId(''); setNinos([]); }}>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Selector></Etiqueta>
        <Etiqueta texto="Sesión">
          <Selector value={sesId} onChange={(e) => setSesId(e.target.value)}>
            {!ses.length && <option value="">Sin sesiones</option>}
            {ses.map((s) => <option key={s.id} value={s.id}>{fechaCorta(s.fecha)} · {s.tipo === 'control' ? 'Control' : 'Entrenamiento'}{s.tema ? ` · ${s.tema}` : ''}</option>)}
          </Selector>
        </Etiqueta>
        <Etiqueta texto="Objetivo de la sesión" ayuda="Se toma del tema de la sesión; puedes ajustarlo. Lo ven los acudientes.">
          <AreaTexto rows={2} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ej. Coordinación y saltos" />
        </Etiqueta>
      </Tarjeta>

      <Tarjeta className="gap-3">
        <Kicker>2. Niños</Kicker>
        {!kids.length ? <div className="text-sm text-tenue">No hay niños activos en esta categoría.</div> : (<>
          <div className="text-xs text-tenue">{asis.datos.some((a) => a.estado === 'falto' || a.estado === 'excusa') ? 'Marqué a quienes faltaron a esa sesión. Cambia la selección si quieres.' : 'Toca los niños a quienes quieres asignar.'}</div>
          <div className="flex flex-wrap gap-2">
            {kids.map((n) => {
              const on = ninos.includes(n.id);
              return <button key={n.id} type="button" aria-pressed={on} onClick={() => alternar(n.id)} className="h-11 px-4 rounded-full text-[13px] font-bold cursor-pointer"
                style={{ background: on ? COLOR.verde : '#141924', color: on ? COLOR.tinta : '#C9CFDB', border: `1px solid ${on ? COLOR.verde : 'rgba(255,255,255,0.1)'}` }}>{nombreNino(n)}</button>;
            })}
          </div>
          <button type="button" onClick={() => setNinos(ninos.length === kids.length ? [] : kids.map((k) => k.id))} className="self-start bg-transparent border-0 text-azul text-[13px] cursor-pointer p-0">{ninos.length === kids.length ? 'Quitar a todos' : 'Elegir a todos'}</button>
        </>)}
      </Tarjeta>

      <div className="flex flex-col gap-2.5">
        <Kicker className="px-1">3. Ejercicios (hasta {RANURAS})</Kicker>
        {ranuras.map((r, i) => r ? (
          <Tarjeta key={i} className="gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><div className="text-sm font-bold">{r.nombre}</div><div className="text-xs text-tenue">{r.tipoTexto}</div></div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setAbierta(i)} className="bg-transparent border-0 text-azul text-xs cursor-pointer h-11 px-2">Cambiar</button>
                <button aria-label="Quitar ejercicio" onClick={() => setRanuras(ranuras.map((x, j) => (j === i ? null : x)))} className="bg-transparent border-0 text-rojo cursor-pointer h-11 px-2"><Trash weight="bold" /></button>
              </div>
            </div>
            <div className="text-[13px] text-suave">{r.nivel}. {r.nivelNombre}</div>
            <div className="text-[13px]">{textoCarga(r.carga)}</div>
          </Tarjeta>
        ) : (
          <Boton key={i} variante="punteado" className="h-14" icono={<Plus weight="bold" />} onClick={() => setAbierta(i)}>Añade ejercicio</Boton>
        ))}
      </div>

      {error && <Aviso tono="error">{error}</Aviso>}
      <Boton alto="lg" icono={<PaperPlaneTilt weight="bold" />} onClick={enviar} cargando={enviando}>Enviar a {ninos.length} {ninos.length === 1 ? 'niño' : 'niños'}</Boton>
      <div className="text-xs text-tenue text-center leading-normal">Cada acudiente recibe la sesión en su cuenta y un aviso en la campanita.</div>

      <SelectorEjercicio abierto={abierta !== null} ejercicios={lista} onCerrar={() => setAbierta(null)}
        onConfirmar={(a) => { setRanuras(ranuras.map((x, j) => (j === abierta ? a : x))); setAbierta(null); }} />
    </Pantalla>
  );
}

function SelectorEjercicio({ abierto, ejercicios, onCerrar, onConfirmar }: { abierto: boolean; ejercicios: Ejercicio[]; onCerrar: () => void; onConfirmar: (a: EjercicioAsignado) => void }) {
  const [filtro, setFiltro] = useState<TipoEjercicio | 'todos'>('todos');
  const [q, setQ] = useState('');
  const [e, setE] = useState<Ejercicio | null>(null);
  const [nivel, setNivel] = useState(1);
  const [carga, setCarga] = useState<CargaEjercicio>({ series: 3, tipo: 'repeticiones', valor: 5, recuperacionS: 30 });
  useEffect(() => { if (!abierto) { setE(null); setQ(''); } }, [abierto]);

  const visibles = useMemo(() => {
    const t = quitarTildes(q.trim());
    return ejercicios.filter((x) => (filtro === 'todos' || x.tipo === filtro) && (!t || quitarTildes(`${x.nombre} ${x.materiales}`).includes(t)));
  }, [ejercicios, filtro, q]);

  const elegir = (x: Ejercicio) => { setE(x); setNivel(1); setCarga({ ...x.carga }); };
  const num = (v: string, min: number) => Math.max(min, Math.round(Number(v) || min));

  return (
    <Hoja abierta={abierto} onCerrar={onCerrar} titulo={e ? e.nombre : 'Elige un ejercicio'} sub={e ? nombreTipo(e) : undefined}>
      {!e ? (<>
        <div className="shrink-0"><Chips<TipoEjercicio | 'todos'> valor={filtro} onCambio={setFiltro} opciones={[{ id: 'todos', etiqueta: 'Todos' }, ...TIPOS_EJERCICIO.map((t) => ({ id: t.id, etiqueta: t.nombre }))]} /></div>
        <Campo className="shrink-0" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Buscar…" aria-label="Buscar ejercicio" />
        <div className="flex flex-col gap-2 shrink-0">
          {visibles.map((x) => (
            <button key={x.id} onClick={() => elegir(x)} className="flex flex-col gap-0.5 rounded-2xl px-4 py-3 bg-sup2 border border-white/[0.07] text-texto text-left cursor-pointer">
              <span className="text-sm font-semibold">{x.nombre}</span><span className="text-xs text-tenue">{nombreTipo(x)}</span>
            </button>
          ))}
          {!visibles.length && <div className="text-sm text-tenue">No hay ejercicios con ese filtro.</div>}
        </div>
      </>) : (<>
        <Etiqueta texto="Variante (a mayor adaptación, más fácil)">
          <Selector value={nivel} onChange={(ev) => setNivel(Number(ev.target.value))}>
            {NIVELES_VARIANTE.filter((n) => e.variantes.some((v) => v.nivel === n.nivel)).map((n) => <option key={n.nivel} value={n.nivel}>{n.nivel}. {n.nombre}</option>)}
          </Selector>
        </Etiqueta>
        <div className="text-[13px] text-suave leading-snug">{e.variantes.find((v) => v.nivel === nivel)?.descripcion}</div>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Series"><Campo inputMode="numeric" value={carga.series} onChange={(ev) => setCarga({ ...carga, series: num(ev.target.value, 1) })} /></Etiqueta>
          <Etiqueta texto="Se mide en"><Selector value={carga.tipo} onChange={(ev) => setCarga({ ...carga, tipo: ev.target.value as TipoCarga })}><option value="repeticiones">Repeticiones</option><option value="tiempo">Tiempo (s)</option></Selector></Etiqueta>
          <Etiqueta texto={carga.tipo === 'tiempo' ? 'Segundos por serie' : 'Repeticiones por serie'}><Campo inputMode="numeric" value={carga.valor} onChange={(ev) => setCarga({ ...carga, valor: num(ev.target.value, 1) })} /></Etiqueta>
          <Etiqueta texto="Recuperación (s)"><Campo inputMode="numeric" value={carga.recuperacionS} onChange={(ev) => setCarga({ ...carga, recuperacionS: num(ev.target.value, 0) })} /></Etiqueta>
        </div>
        <div className="flex gap-2">
          <Boton variante="secundario" icono={<X weight="bold" />} onClick={() => setE(null)}>Otro</Boton>
          <Boton className="flex-1" onClick={() => onConfirmar(asignarEjercicio(e, nivel, carga))}>Confirmar ejercicio</Boton>
        </div>
      </>)}
    </Hoja>
  );
}
