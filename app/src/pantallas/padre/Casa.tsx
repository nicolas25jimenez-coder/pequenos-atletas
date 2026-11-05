// Ejercicios en casa (padre): ve lo que envió el entrenador y sube un video de máx. 30 s por ejercicio.
import { CaretRight, UploadSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ETIQUETA_REMOTA, fechaCorta, MAX_VIDEO_S, textoCarga, type EstadoRemota, type SesionRemota } from '@pa/shared';
import { actualizar, useColeccion, useDocumento } from '../../lib/datos';
import { subirArchivo, extension } from '../../lib/archivos';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, COLOR, Encabezado, Esqueleto, Kicker, Pildora, Tarjeta, Vacio, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { VideoRemoto } from '../comun/VideoRemoto';
import { useFamilia } from './familia';

const COLOR_ESTADO: Record<EstadoRemota, string> = { enviada: COLOR.ambar, entregada: COLOR.azul, revisada: COLOR.verde };

/** Duración de un video leyendo solo sus datos (sin subirlo). */
function duracionVideo(f: File): Promise<number> {
  return new Promise((ok, mal) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(f);
    v.preload = 'metadata';
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); ok(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No pude leer el video. Prueba con otro.')); };
    v.src = url;
  });
}

export function Casa() {
  const nav = useNavigate();
  const { nino } = useFamilia();
  const { datos, cargando } = useColeccion<SesionRemota>(nino ? 'sesionesRemotas' : null, [['ninoId', '==', nino?.id ?? '']]);
  const lista = [...datos].sort((a, b) => b.enviadaEn.localeCompare(a.enviadaEn));
  return (
    <Pantalla>
      <Volver a="/p">Inicio</Volver>
      <Encabezado titulo="Ejercicios en casa" sub={nino ? nino.nombres : undefined} />
      {cargando ? <Esqueleto alto={90} /> : !lista.length ? (
        <Vacio titulo="Aún no hay ejercicios" texto="Cuando el entrenador envíe ejercicios para hacer en casa, aparecerán aquí." />
      ) : lista.map((r) => (
        <Tarjeta key={r.id} onClick={() => nav(`/p/casa/${r.id}`)} className="gap-1.5">
          <div className="flex items-center justify-between"><span className="text-base font-bold">Enviada {fechaCorta(r.fecha)}</span><Pildora color={COLOR_ESTADO[r.estado]}>{r.estado === 'enviada' ? 'Por hacer' : ETIQUETA_REMOTA[r.estado]}</Pildora></div>
          {r.objetivo && <div className="text-[13px] text-suave">{r.objetivo}</div>}
          <div className="flex items-center justify-between text-xs text-tenue"><span>{r.ejercicios.filter((e) => e.video).length}/{r.ejercicios.length} videos subidos</span><CaretRight weight="bold" /></div>
        </Tarjeta>
      ))}
    </Pantalla>
  );
}

export function DetalleCasa() {
  const { id } = useParams();
  const toast = useToast();
  const { datos: r, cargando } = useDocumento<SesionRemota>(`sesionesRemotas/${id}`);
  const [subiendo, setSubiendo] = useState<number | null>(null);

  if (cargando) return <Pantalla><Esqueleto alto={200} /></Pantalla>;
  if (!r) return <Pantalla><Volver a="/p/casa">Ejercicios en casa</Volver><Aviso tono="error">No encontré esta sesión.</Aviso></Pantalla>;
  const sesion = r;

  async function subir(i: number, f?: File) {
    if (!f) return;
    setSubiendo(i);
    try {
      if (!f.type.startsWith('video/')) throw new Error('Elige un video.');
      const dur = await duracionVideo(f);
      if (dur > MAX_VIDEO_S + 0.5) throw new Error(`El video dura ${Math.round(dur)} s. Debe durar máximo ${MAX_VIDEO_S} s.`);
      const ruta = await subirArchivo(`remotas/${sesion.ninoId}/${sesion.id}-${i}-${Date.now()}.${extension(f)}`, f, 50);
      const ejercicios = sesion.ejercicios.map((e, j) => (j === i ? { ...e, video: { ruta, duracionS: Math.round(dur * 10) / 10, subidoEn: new Date().toISOString() } } : e));
      await actualizar('sesionesRemotas', sesion.id, { ejercicios, ...(sesion.estado === 'enviada' ? { estado: 'entregada' } : {}) });
      toast('Video enviado al entrenador');
    } catch (e) { toast(mensajeError(e), 'error'); }
    setSubiendo(null);
  }

  return (
    <Pantalla>
      <Volver a="/p/casa">Ejercicios en casa</Volver>
      <Encabezado titulo="Para hacer en casa" sub={`Enviada ${fechaCorta(sesion.fecha)}`} />
      {sesion.objetivo && <Tarjeta className="gap-1"><Kicker>Objetivo</Kicker><div className="text-sm">{sesion.objetivo}</div></Tarjeta>}
      <Aviso>Graba a tu hijo haciendo cada ejercicio. Cada video puede durar máximo {MAX_VIDEO_S} segundos.</Aviso>
      {sesion.ejercicios.map((e, i) => (
        <Tarjeta key={i} className="gap-3">
          <div><div className="text-base font-bold">{i + 1}. {e.nombre}</div><div className="text-xs text-tenue">{e.nivel}. {e.nivelNombre}</div></div>
          <div className="text-sm leading-relaxed">{e.descripcion}</div>
          {e.varianteDescripcion && <div className="text-[13px] text-suave"><b>Cómo hacerlo:</b> {e.varianteDescripcion}</div>}
          <div className="text-[13px]"><b>Carga:</b> {textoCarga(e.carga)}</div>
          <div className="text-[13px] text-suave"><b>Espacio:</b> {e.espacio || '—'} · <b>Material:</b> {e.materiales || '—'}</div>
          {e.puntosClave.length > 0 && <ul className="m-0 pl-5 text-[13px] text-suave leading-relaxed">{e.puntosClave.map((p, k) => <li key={k}>{p}</li>)}</ul>}
          {e.videoUrl && <a href={e.videoUrl} target="_blank" rel="noreferrer" className="text-azul text-sm font-semibold">Ver video de ejemplo</a>}
          {e.video && <VideoRemoto ruta={e.video.ruta} />}
          {e.feedback && <Aviso tono="exito"><b>Entrenador:</b> {e.feedback}</Aviso>}
          <label className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-sup2 border border-white/10 text-sm font-bold cursor-pointer">
            <UploadSimple weight="bold" />{subiendo === i ? 'Subiendo…' : e.video ? 'Cambiar video' : 'Subir video'}
            <input type="file" accept="video/*" capture="environment" className="hidden" disabled={subiendo !== null} onChange={(ev) => { subir(i, ev.target.files?.[0]); ev.target.value = ''; }} />
          </label>
        </Tarjeta>
      ))}
      <Boton variante="secundario" onClick={() => history.back()}>Volver</Boton>
    </Pantalla>
  );
}
