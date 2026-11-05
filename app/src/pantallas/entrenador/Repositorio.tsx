// Repositorio (planilla): pruebas (baterías TGMD-3 y MOBAK-KG) y ejercicios para casa.
import { Barbell, CaretRight, ClipboardText, MagnifyingGlass, PersonSimpleRun } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ahoraIso, BATERIAS, bateriaPorId, estadisticas, fechaCorta, pruebasDeBaterias, tareaPorId, type ResultadoPrueba,
} from '@pa/shared';
import { actualizar, guardarVarios, useColeccion } from '../../lib/datos';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, COLOR, Encabezado, Etiqueta, Kicker, Tarjeta, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { nombreNino, useEntrenador } from './contexto';

const IMAGEN = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i;
const VIDEO = /\.(mp4|webm|mov)(\?.*)?$/i;

/** Si las pruebas de las baterías aún no están en la base de datos, las agrega (para usarlas en sesiones de control). */
function useSincronizarBaterias() {
  const { pruebaPorId, cargando } = useEntrenador();
  const hecho = useRef(false);
  useEffect(() => {
    if (cargando || hecho.current) return;
    const faltan = pruebasDeBaterias().filter((p) => !pruebaPorId.has(p.id));
    hecho.current = true;
    if (!faltan.length) return;
    const t = ahoraIso();
    guardarVarios('pruebas', faltan.map((p) => ({ ...p, creadoEn: t, actualizadoEn: t }))).catch(() => { hecho.current = false; });
  }, [cargando, pruebaPorId]);
}

export function Repositorio() {
  const nav = useNavigate();
  useSincronizarBaterias();
  return (
    <Pantalla>
      <Encabezado titulo="Repositorio" sub="Protocolos y ejercicios" />
      <div className="flex flex-col gap-3">
        <button onClick={() => nav('/e/repositorio/pruebas')} className="tarjeta p-[18px] flex items-center gap-3.5 text-texto text-left cursor-pointer hover:bg-suph w-full">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${COLOR.verde}22`, color: COLOR.verde }}><ClipboardText size={26} weight="bold" /></span>
          <span className="flex-1 flex flex-col"><span className="text-base font-bold">Repositorio de pruebas</span><span className="text-xs text-tenue">Baterías TGMD-3 y MOBAK-KG: protocolos e historial</span></span>
          <CaretRight weight="bold" className="text-apagado" />
        </button>
        <button onClick={() => nav('/e/repositorio/ejercicios')} className="tarjeta p-[18px] flex items-center gap-3.5 text-texto text-left cursor-pointer hover:bg-suph w-full">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${COLOR.ambar}22`, color: COLOR.ambar }}><PersonSimpleRun size={26} weight="bold" /></span>
          <span className="flex-1 flex flex-col"><span className="text-base font-bold">Repositorio de ejercicios</span><span className="text-xs text-tenue">Ejercicios para casa: añadir, buscar y asignar</span></span>
          <CaretRight weight="bold" className="text-apagado" />
        </button>
      </div>
    </Pantalla>
  );
}

export function RepositorioPruebas() {
  const nav = useNavigate();
  return (
    <Pantalla>
      <Volver a="/e/repositorio">Repositorio</Volver>
      <Encabezado titulo="Pruebas" sub="Elige una batería" />
      <div className="flex flex-col gap-3">
        {BATERIAS.map((b) => (
          <Tarjeta key={b.id} onClick={() => nav(`/e/repositorio/pruebas/${b.id}`)} className="gap-2">
            <div className="flex items-center justify-between"><Kicker color={COLOR.verde}>{b.siglas}</Kicker><span className="text-xs text-tenue">{b.edades}</span></div>
            <div className="text-lg font-bold leading-tight">{b.nombre}</div>
            <div className="text-[13px] text-suave leading-snug">{b.resumen}</div>
            <div className="text-xs text-tenue">{b.tareas.length} pruebas · {b.areas.length} áreas</div>
          </Tarjeta>
        ))}
      </div>
    </Pantalla>
  );
}

export function RepositorioBateria() {
  const { bateria: id } = useParams();
  const nav = useNavigate();
  const b = bateriaPorId(id);
  if (!b) return <Pantalla><Volver a="/e/repositorio/pruebas">Pruebas</Volver><Aviso tono="error">No encontré esa batería.</Aviso></Pantalla>;
  return (
    <Pantalla>
      <Volver a="/e/repositorio/pruebas">Pruebas</Volver>
      <Encabezado titulo={b.siglas} sub={b.nombre} />
      <Aviso>{b.resumen}</Aviso>
      {b.areas.map((a) => (
        <div key={a.id} className="flex flex-col gap-2">
          <div className="px-1"><span className="titulo text-base" style={{ fontWeight: 800 }}>{a.nombre}</span><div className="text-xs text-tenue">{a.detalle}</div></div>
          {b.tareas.filter((t) => t.area === a.id).map((t) => (
            <button key={t.id} onClick={() => nav(`/e/repositorio/prueba/${t.id}`)} className="flex items-center gap-3 rounded-[20px] px-4 py-3 bg-sup border border-white/[0.07] text-texto text-left cursor-pointer hover:bg-suph">
              <Barbell weight="bold" className="text-verde shrink-0" />
              <div className="flex-1 min-w-0"><div className="text-sm font-semibold">{t.nombre}</div><div className="text-xs text-tenue truncate">{t.evalua}</div></div>
              <CaretRight weight="bold" className="text-apagado" />
            </button>
          ))}
        </div>
      ))}
      <div className="text-[11px] text-tenue leading-snug">Fuente: {b.fuente}</div>
    </Pantalla>
  );
}

export function DetalleTarea() {
  const { id } = useParams();
  const toast = useToast();
  const { porId, pruebaPorId } = useEntrenador();
  const enc = tareaPorId(id);
  const { datos: resultados, cargando } = useColeccion<ResultadoPrueba>(enc ? 'resultadosPruebas' : null, [['pruebaId', '==', id ?? '']]);
  const prueba = pruebaPorId.get(id ?? '');
  const [editando, setEditando] = useState(false);
  const [url, setUrl] = useState(prueba?.mediaEjemploUrl ?? '');
  useEffect(() => setUrl(prueba?.mediaEjemploUrl ?? ''), [prueba?.mediaEjemploUrl]);

  const filas = useMemo(
    () => resultados.filter((r) => r.valorFinal !== null && !r.noRealizada).sort((a, b) => (b.valorFinal ?? 0) - (a.valorFinal ?? 0) || b.fecha.localeCompare(a.fecha)),
    [resultados],
  );
  const stats = useMemo(() => estadisticas(filas.map((r) => r.valorFinal as number)), [filas]);
  const ultima = useMemo(() => [...filas].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]?.fecha, [filas]);

  if (!enc) return <Pantalla><Volver a="/e/repositorio/pruebas">Pruebas</Volver><Aviso tono="error">No encontré esa prueba.</Aviso></Pantalla>;
  const { bateria: b, tarea: t } = enc;
  const area = b.areas.find((a) => a.id === t.area)?.nombre;
  const media = prueba?.mediaEjemploUrl;

  async function guardarMedia() {
    try {
      await actualizar('pruebas', t.id, { mediaEjemploUrl: url.trim() || undefined, actualizadoEn: ahoraIso() });
      toast('Enlace guardado'); setEditando(false);
    } catch (e) { toast(mensajeError(e), 'error'); }
  }

  return (
    <Pantalla>
      <Volver a={`/e/repositorio/pruebas/${b.id}`}>{b.siglas}</Volver>
      <Encabezado titulo={t.nombre} sub={`${b.siglas} · ${area}`} />

      <Tarjeta>
        <Kicker>Descripción</Kicker>
        <div className="text-sm leading-relaxed">{t.descripcion}</div>
        {t.montaje && <div className="text-[13px] text-suave leading-snug"><b>Montaje:</b> {t.montaje}</div>}
        <div className="text-[13px] text-suave leading-snug"><b>Materiales:</b> {t.materiales}</div>
      </Tarjeta>

      <Tarjeta>
        <Kicker>Imagen o video de ejemplo</Kicker>
        {media && IMAGEN.test(media) && <img src={media} alt={`Ejemplo: ${t.nombre}`} className="w-full rounded-2xl" />}
        {media && VIDEO.test(media) && <video src={media} controls className="w-full rounded-2xl" />}
        {media && !IMAGEN.test(media) && !VIDEO.test(media) && <a href={media} target="_blank" rel="noreferrer" className="text-azul text-sm font-semibold">Abrir el video o imagen guardado</a>}
        {!media && <div className="text-[13px] text-tenue">Todavía no hay un ejemplo guardado. Busca uno y pega el enlace aquí.</div>}
        <div className="flex gap-2 flex-wrap">
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(t.busquedaVideo)}`} target="_blank" rel="noreferrer" className="no-underline">
            <Boton variante="secundario" alto="sm" icono={<MagnifyingGlass weight="bold" />}>Buscar video</Boton>
          </a>
          <Boton variante="secundario" alto="sm" onClick={() => setEditando(!editando)}>{media ? 'Cambiar enlace' : 'Pegar enlace'}</Boton>
        </div>
        {editando && (<>
          <Etiqueta texto="Enlace (YouTube, o una imagen/video .jpg .png .mp4)"><Campo value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Etiqueta>
          <Boton onClick={guardarMedia} disabled={!prueba}>Guardar enlace</Boton>
        </>)}
      </Tarjeta>

      <Tarjeta>
        <Kicker>Qué se evalúa</Kicker>
        <div className="text-sm leading-snug">{t.evalua}</div>
        <ul className="m-0 pl-5 text-[13px] text-suave leading-relaxed">{t.criterios.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </Tarjeta>

      <Tarjeta>
        <Kicker>Unidad de medida</Kicker>
        <div className="text-sm leading-snug">{t.medida}</div>
        <div className="text-xs text-tenue">Se registra de 0 a {t.maximo}.</div>
      </Tarjeta>

      <Tarjeta>
        <Kicker>Historial de resultados</Kicker>
        {cargando ? <div className="text-sm text-tenue">Cargando…</div> : !filas.length ? (
          <div className="text-[13px] text-tenue leading-snug">Aún no hay resultados. Cuando agregues esta prueba a un día de control y guardes los resultados, aparecerán aquí.</div>
        ) : (<>
          <div className="grid grid-cols-3 gap-2">
            <Dato k="Promedio" v={String(stats!.media).replace('.', ',')} />
            <Dato k="Mediana" v={String(stats!.mediana).replace('.', ',')} />
            <Dato k="Moda" v={stats!.moda.length ? stats!.moda.join(' · ') : 'Sin moda'} />
          </div>
          <div className="text-xs text-tenue">{stats!.n} resultados · última vez: {ultima ? fechaCorta(ultima) : '—'} · de mayor a menor</div>
          <div className="flex flex-col">
            {filas.map((r) => {
              const n = porId.get(r.ninoId);
              return (
                <div key={r.id} className="flex items-center gap-3 py-2.5 border-t border-white/[0.07]">
                  <span className="text-lg font-extrabold w-14 tabular">{r.valorFinal}<span className="text-xs text-tenue font-semibold">/{t.maximo}</span></span>
                  <span className="flex-1 min-w-0 text-sm truncate">{n ? nombreNino(n) : 'Niño'}</span>
                  <span className="text-xs text-tenue">{fechaCorta(r.fecha)}</span>
                </div>
              );
            })}
          </div>
        </>)}
      </Tarjeta>
    </Pantalla>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return <div className="rounded-2xl px-3 py-2.5 bg-white/[0.04] flex flex-col gap-0.5"><span className="text-[11px] text-tenue">{k}</span><span className="text-[17px] font-extrabold">{v}</span></div>;
}
