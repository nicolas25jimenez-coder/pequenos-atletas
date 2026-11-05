// Repositorio de ejercicios: menú por tipo, buscador, detalle, añadir y editar.
import { CaretRight, MagnifyingGlass, PaperPlaneTilt, Plus, PencilSimple, PlayCircle } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ahoraIso, EJERCICIOS_BASE, NIVELES_VARIANTE, nombreTipo, textoCarga, TIPOS_EJERCICIO,
  type Ejercicio, type SubtipoManipulacion, type TipoCarga, type TipoEjercicio,
} from '@pa/shared';
import { guardar, guardarVarios, idNuevo, useColeccion } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, AreaTexto, COLOR, Encabezado, Esqueleto, Etiqueta, Kicker, Selector, Tarjeta, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';

const quitarTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function useEjercicios() {
  const e = useColeccion<Ejercicio>('ejercicios');
  const lista = useMemo(() => [...e.datos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')), [e.datos]);
  return { lista, cargando: e.cargando, error: e.error };
}

/** Si faltan los ejercicios de ejemplo en la base de datos, los agrega (solo la primera vez que la tabla está vacía). */
function useSembrarEjemplos(cargando: boolean, total: number) {
  const hecho = useRef(false);
  useEffect(() => {
    if (cargando || hecho.current || total > 0) return;
    hecho.current = true;
    const t = ahoraIso();
    guardarVarios('ejercicios', EJERCICIOS_BASE.map((e) => ({ ...e, creadoEn: t, actualizadoEn: t }))).catch(() => { hecho.current = false; });
  }, [cargando, total]);
}

function FilaEjercicio({ e }: { e: Ejercicio }) {
  const nav = useNavigate();
  return (
    <button onClick={() => nav(`/e/repositorio/ejercicio/${e.id}`)} className="flex items-center gap-3 rounded-[20px] px-4 py-3 bg-sup border border-white/[0.07] text-texto text-left cursor-pointer hover:bg-suph w-full">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{e.nombre}</div>
        <div className="text-xs text-tenue truncate">{nombreTipo(e)} · {textoCarga(e.carga)}</div>
      </div>
      <CaretRight weight="bold" className="text-apagado" />
    </button>
  );
}

export function RepoEjercicios() {
  const nav = useNavigate();
  const { lista, cargando, error } = useEjercicios();
  useSembrarEjemplos(cargando, lista.length);
  const [q, setQ] = useState('');
  const resultados = useMemo(() => {
    const t = quitarTildes(q.trim());
    if (!t) return [];
    return lista.filter((e) => quitarTildes(`${e.nombre} ${e.descripcion} ${nombreTipo(e)} ${e.materiales} ${e.puntosClave.join(' ')}`).includes(t));
  }, [q, lista]);

  return (
    <Pantalla>
      <Volver a="/e/repositorio">Repositorio</Volver>
      <Encabezado titulo="Ejercicios" sub="Para hacer en casa · 4 a 6 años" />
      <Campo icono={<MagnifyingGlass weight="bold" />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio (nombre, material, tipo…)" aria-label="Buscar ejercicio" />
      <div className="grid grid-cols-2 gap-2.5">
        <Boton icono={<Plus weight="bold" />} onClick={() => nav('/e/repositorio/ejercicios/nuevo')}>Añadir</Boton>
        <Boton variante="claro" icono={<PaperPlaneTilt weight="bold" />} onClick={() => nav('/e/repositorio/asignar')}>Asignar</Boton>
      </div>
      {error && <Aviso tono="error">No pudimos cargar los ejercicios. ¿Ya aplicaste la migración 0007 en Supabase? ({error})</Aviso>}

      {q.trim() ? (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-tenue px-1">{resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}</div>
          {resultados.map((e) => <FilaEjercicio key={e.id} e={e} />)}
          {!resultados.length && <Aviso>No encontré ejercicios con “{q}”.</Aviso>}
        </div>
      ) : cargando ? <Esqueleto alto={90} /> : (
        <div className="flex flex-col gap-3">
          {TIPOS_EJERCICIO.map((t) => {
            const n = lista.filter((e) => e.tipo === t.id).length;
            return (
              <Tarjeta key={t.id} onClick={() => nav(`/e/repositorio/ejercicios/tipo/${t.id}`)} className="gap-1.5">
                <div className="flex items-center justify-between"><Kicker color={COLOR.verde}>{n} {n === 1 ? 'ejercicio' : 'ejercicios'}</Kicker><CaretRight weight="bold" className="text-apagado" /></div>
                <div className="text-lg font-bold">{t.nombre}</div>
                <div className="text-[13px] text-suave">{t.detalle}</div>
              </Tarjeta>
            );
          })}
        </div>
      )}
    </Pantalla>
  );
}

export function ListaTipo() {
  const { tipo } = useParams();
  const nav = useNavigate();
  const { lista, cargando } = useEjercicios();
  const t = TIPOS_EJERCICIO.find((x) => x.id === tipo);
  if (!t) return <Pantalla><Volver a="/e/repositorio/ejercicios">Ejercicios</Volver><Aviso tono="error">No encontré ese tipo.</Aviso></Pantalla>;
  const items = lista.filter((e) => e.tipo === t.id);
  return (
    <Pantalla>
      <Volver a="/e/repositorio/ejercicios">Ejercicios</Volver>
      <Encabezado titulo={t.nombre} sub={t.detalle} derecha={<Boton alto="sm" icono={<Plus weight="bold" />} onClick={() => nav(`/e/repositorio/ejercicios/nuevo?tipo=${t.id}`)}>Nuevo</Boton>} />
      {cargando ? <Esqueleto alto={70} /> : items.map((e) => <FilaEjercicio key={e.id} e={e} />)}
      {!cargando && !items.length && <Aviso>Todavía no hay ejercicios de este tipo.</Aviso>}
    </Pantalla>
  );
}

export function DetalleEjercicio() {
  const { id } = useParams();
  const nav = useNavigate();
  const { lista, cargando } = useEjercicios();
  const e = lista.find((x) => x.id === id);
  if (cargando) return <Pantalla><Esqueleto alto={200} /></Pantalla>;
  if (!e) return <Pantalla><Volver a="/e/repositorio/ejercicios">Ejercicios</Volver><Aviso tono="error">No encontré ese ejercicio.</Aviso></Pantalla>;
  return (
    <Pantalla>
      <Volver a={`/e/repositorio/ejercicios/tipo/${e.tipo}`}>{TIPOS_EJERCICIO.find((t) => t.id === e.tipo)?.nombre}</Volver>
      <Encabezado titulo={e.nombre} sub={nombreTipo(e)} derecha={<Boton alto="sm" variante="secundario" icono={<PencilSimple weight="bold" />} onClick={() => nav(`/e/repositorio/ejercicio/${e.id}/editar`)}>Editar</Boton>} />
      <Tarjeta>
        <Kicker>Descripción</Kicker>
        <div className="text-sm leading-relaxed">{e.descripcion}</div>
        <div className="text-[13px] text-suave"><b>Espacio:</b> {e.espacio || '—'} · <b>Material:</b> {e.materiales || '—'}</div>
        {e.videoUrl ? <a href={e.videoUrl} target="_blank" rel="noreferrer" className="no-underline"><Boton variante="secundario" alto="sm" icono={<PlayCircle weight="bold" />}>Ver video de ejemplo</Boton></a>
          : <div className="text-xs text-tenue">Sin video de ejemplo. Puedes agregar el enlace en Editar.</div>}
      </Tarjeta>
      <Tarjeta>
        <Kicker>Puntos clave</Kicker>
        <ul className="m-0 pl-5 text-sm leading-relaxed">{e.puntosClave.map((p, i) => <li key={i}>{p}</li>)}</ul>
      </Tarjeta>
      <Tarjeta>
        <Kicker>Componentes de la carga</Kicker>
        <div className="text-sm">{textoCarga(e.carga)}</div>
        <div className="text-xs text-tenue">Series, repeticiones o tiempo y recuperación entre series (sugerido; se puede cambiar al asignar).</div>
      </Tarjeta>
      <Tarjeta>
        <Kicker>Variantes (a mayor adaptación, más fácil)</Kicker>
        {NIVELES_VARIANTE.map((n) => {
          const v = e.variantes.find((x) => x.nivel === n.nivel);
          return v?.descripcion ? <div key={n.nivel} className="text-sm leading-snug"><b>{n.nivel}. {n.nombre}:</b> <span className="text-suave">{v.descripcion}</span></div> : null;
        })}
      </Tarjeta>
    </Pantalla>
  );
}

const lineas = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export function FormEjercicio() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { lista, cargando } = useEjercicios();
  const actual = id ? lista.find((x) => x.id === id) : undefined;
  const tipoUrl = new URLSearchParams(location.search).get('tipo') as TipoEjercicio | null;
  const [f, setF] = useState({
    nombre: '', tipo: (tipoUrl ?? 'locomocion') as TipoEjercicio, subtipo: 'manos' as SubtipoManipulacion, descripcion: '', videoUrl: '',
    puntos: '', series: 3, tipoCarga: 'repeticiones' as TipoCarga, valor: 5, recuperacionS: 30, espacio: '', materiales: '',
    variantes: ['', '', '', ''],
  });
  const [listo, setListo] = useState(!id);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!actual || listo) return;
    setF({
      nombre: actual.nombre, tipo: actual.tipo, subtipo: actual.subtipo ?? 'manos', descripcion: actual.descripcion, videoUrl: actual.videoUrl ?? '',
      puntos: actual.puntosClave.join('\n'), series: actual.carga.series, tipoCarga: actual.carga.tipo, valor: actual.carga.valor,
      recuperacionS: actual.carga.recuperacionS, espacio: actual.espacio, materiales: actual.materiales,
      variantes: [1, 2, 3, 4].map((n) => actual.variantes.find((v) => v.nivel === n)?.descripcion ?? ''),
    });
    setListo(true);
  }, [actual, listo]);

  if (id && (cargando || !listo)) return <Pantalla><Esqueleto alto={200} /></Pantalla>;
  if (id && !actual) return <Pantalla><Volver a="/e/repositorio/ejercicios">Ejercicios</Volver><Aviso tono="error">No encontré ese ejercicio.</Aviso></Pantalla>;

  const num = (v: string, min: number) => Math.max(min, Math.round(Number(v.replace(',', '.')) || min));

  async function enviar() {
    setError('');
    if (!f.nombre.trim() || !f.descripcion.trim()) return setError('El nombre y la descripción son obligatorios.');
    if (!f.variantes[0].trim()) return setError('Escribe al menos la variante 1 (predeterminado).');
    setGuardando(true);
    try {
      const t = ahoraIso();
      const e: Ejercicio = {
        id: actual?.id ?? idNuevo('ejercicios'), nombre: f.nombre.trim(), tipo: f.tipo,
        ...(f.tipo === 'manipulacion' ? { subtipo: f.subtipo } : {}),
        descripcion: f.descripcion.trim(), videoUrl: f.videoUrl.trim() || undefined, puntosClave: lineas(f.puntos),
        carga: { series: f.series, tipo: f.tipoCarga, valor: f.valor, recuperacionS: f.recuperacionS },
        variantes: f.variantes.map((descripcion, i) => ({ nivel: i + 1, descripcion: descripcion.trim() })).filter((v) => v.descripcion),
        espacio: f.espacio.trim(), materiales: f.materiales.trim(), esBase: actual?.esBase ?? false,
        actualizadoEn: t, creadoEn: actual?.creadoEn ?? t, creadoPor: actual?.creadoPor ?? usuario?.uid,
      };
      await guardar('ejercicios', e);
      toast(actual ? 'Ejercicio actualizado' : 'Ejercicio creado');
      nav(`/e/repositorio/ejercicio/${e.id}`, { replace: true });
    } catch (er) { setError(mensajeError(er)); }
    setGuardando(false);
  }

  return (
    <Pantalla>
      <Volver a={actual ? `/e/repositorio/ejercicio/${actual.id}` : '/e/repositorio/ejercicios'}>Cancelar</Volver>
      <div className="titulo text-[26px]">{actual ? 'Editar ejercicio' : 'Nuevo ejercicio'}</div>
      <Tarjeta className="gap-3">
        <Etiqueta texto="Nombre del ejercicio"><Campo value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Etiqueta>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Clasificación"><Selector value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as TipoEjercicio })}>{TIPOS_EJERCICIO.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</Selector></Etiqueta>
          {f.tipo === 'manipulacion' && <Etiqueta texto="Con"><Selector value={f.subtipo} onChange={(e) => setF({ ...f, subtipo: e.target.value as SubtipoManipulacion })}><option value="manos">Manos</option><option value="pies">Pies</option></Selector></Etiqueta>}
        </div>
        <Etiqueta texto="Descripción"><AreaTexto rows={4} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Cómo se hace, paso a paso" /></Etiqueta>
        <Etiqueta texto="Enlace de video de ejemplo (opcional)"><Campo value={f.videoUrl} onChange={(e) => setF({ ...f, videoUrl: e.target.value })} placeholder="https://…" /></Etiqueta>
        <Etiqueta texto="Puntos clave (uno por línea)"><AreaTexto rows={4} value={f.puntos} onChange={(e) => setF({ ...f, puntos: e.target.value })} /></Etiqueta>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Espacio (máx. 20 m²)"><Campo value={f.espacio} onChange={(e) => setF({ ...f, espacio: e.target.value })} placeholder="Pasillo de 4 × 2 m" /></Etiqueta>
          <Etiqueta texto="Material básico"><Campo value={f.materiales} onChange={(e) => setF({ ...f, materiales: e.target.value })} placeholder="Cojines, cinta…" /></Etiqueta>
        </div>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Componentes de la carga (sugerida)</Kicker>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Series"><Campo inputMode="numeric" value={f.series} onChange={(e) => setF({ ...f, series: num(e.target.value, 1) })} /></Etiqueta>
          <Etiqueta texto="Se mide en"><Selector value={f.tipoCarga} onChange={(e) => setF({ ...f, tipoCarga: e.target.value as TipoCarga })}><option value="repeticiones">Repeticiones</option><option value="tiempo">Tiempo (s)</option></Selector></Etiqueta>
          <Etiqueta texto={f.tipoCarga === 'tiempo' ? 'Segundos por serie' : 'Repeticiones por serie'}><Campo inputMode="numeric" value={f.valor} onChange={(e) => setF({ ...f, valor: num(e.target.value, 1) })} /></Etiqueta>
          <Etiqueta texto="Recuperación (s)"><Campo inputMode="numeric" value={f.recuperacionS} onChange={(e) => setF({ ...f, recuperacionS: num(e.target.value, 0) })} /></Etiqueta>
        </div>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Variantes (a mayor adaptación, más fácil)</Kicker>
        {NIVELES_VARIANTE.map((n, i) => (
          <Etiqueta key={n.nivel} texto={`${n.nivel}. ${n.nombre}${i === 0 ? ' (obligatoria)' : ' (opcional)'}`}>
            <AreaTexto rows={2} value={f.variantes[i]} onChange={(e) => setF({ ...f, variantes: f.variantes.map((v, j) => (j === i ? e.target.value : v)) })} />
          </Etiqueta>
        ))}
      </Tarjeta>
      {error && <Aviso tono="error">{error}</Aviso>}
      <Boton alto="lg" onClick={enviar} cargando={guardando}>Guardar ejercicio</Boton>
    </Pantalla>
  );
}
