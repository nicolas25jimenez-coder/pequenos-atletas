// Sesiones remotas (ejercicios para casa): historial y revisión de videos con comentarios.
import { CaretRight } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ahoraIso, estadoRemota, ETIQUETA_REMOTA, fechaCorta, textoCarga, type EstadoRemota, type SesionRemota } from '@pa/shared';
import { actualizar, useColeccion, useDocumento } from '../../lib/datos';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Chips, COLOR, Encabezado, Esqueleto, Kicker, AreaTexto, Pildora, Tarjeta, Vacio, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { VideoRemoto } from '../comun/VideoRemoto';
import { nombreNino, useEntrenador } from './contexto';

const COLOR_ESTADO: Record<EstadoRemota, string> = { enviada: COLOR.gris, entregada: COLOR.ambar, revisada: COLOR.verde };

export function Remotas() {
  const nav = useNavigate();
  const { porId } = useEntrenador();
  const { datos, cargando, error } = useColeccion<SesionRemota>('sesionesRemotas');
  const [filtro, setFiltro] = useState<EstadoRemota | 'todas'>('todas');
  const lista = useMemo(
    () => [...datos].sort((a, b) => b.enviadaEn.localeCompare(a.enviadaEn)).filter((r) => filtro === 'todas' || r.estado === filtro),
    [datos, filtro],
  );
  return (
    <Pantalla>
      <Volver a="/e">Hoy</Volver>
      <Encabezado titulo="Sesiones remotas" sub="Ejercicios para casa · más recientes primero" />
      <Chips<EstadoRemota | 'todas'> valor={filtro} onCambio={setFiltro} opciones={[
        { id: 'todas', etiqueta: 'Todas' }, { id: 'entregada', etiqueta: 'Por revisar' }, { id: 'enviada', etiqueta: 'Sin videos' }, { id: 'revisada', etiqueta: 'Revisadas' },
      ]} />
      {error && <Aviso tono="error">No pudimos cargar las sesiones remotas. ¿Ya aplicaste la migración 0007? ({error})</Aviso>}
      {cargando ? <Esqueleto alto={96} /> : !lista.length ? (
        <Vacio titulo="Sin sesiones remotas" texto="Asigna ejercicios desde Planilla → Repositorio de ejercicios → Asignar." />
      ) : lista.map((r) => {
        const n = porId.get(r.ninoId);
        const con = r.ejercicios.filter((e) => e.video).length;
        return (
          <Tarjeta key={r.id} onClick={() => nav(`/e/remota/${r.id}`)} className="gap-1.5">
            <div className="flex items-center justify-between gap-2"><span className="text-base font-bold">{n ? nombreNino(n) : 'Niño'}</span><Pildora color={COLOR_ESTADO[r.estado]}>{ETIQUETA_REMOTA[r.estado]}</Pildora></div>
            <div className="text-xs text-tenue">Enviada {fechaCorta(r.fecha)} · {con}/{r.ejercicios.length} videos</div>
            {r.objetivo && <div className="text-[13px] text-suave line-clamp-2">{r.objetivo}</div>}
            <div className="flex items-center justify-between text-xs text-tenue"><span>{r.ejercicios.map((e) => e.nombre).join(' · ')}</span><CaretRight weight="bold" className="shrink-0" /></div>
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}

export function DetalleRemota() {
  const { id } = useParams();
  const toast = useToast();
  const { porId } = useEntrenador();
  const { datos: r, cargando } = useDocumento<SesionRemota>(`sesionesRemotas/${id}`);
  const [textos, setTextos] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState<number | null>(null);

  if (cargando) return <Pantalla><Esqueleto alto={200} /></Pantalla>;
  if (!r) return <Pantalla><Volver a="/e/remotas">Sesiones remotas</Volver><Aviso tono="error">No encontré esta sesión.</Aviso></Pantalla>;
  const n = porId.get(r.ninoId);

  async function guardarFeedback(i: number) {
    if (!r) return;
    setGuardando(i);
    try {
      const t = ahoraIso();
      const ejercicios = r.ejercicios.map((e, j) => (j === i ? { ...e, feedback: (textos[i] ?? e.feedback ?? '').trim(), feedbackEn: t } : e));
      await actualizar('sesionesRemotas', r.id, { ejercicios, estado: estadoRemota(ejercicios), actualizadoEn: t });
      toast('Comentario guardado. Se avisó al acudiente.');
    } catch (e) { toast(mensajeError(e), 'error'); }
    setGuardando(null);
  }

  return (
    <Pantalla>
      <Volver a="/e/remotas">Sesiones remotas</Volver>
      <Encabezado titulo={n ? nombreNino(n) : 'Niño'} sub={`Enviada ${fechaCorta(r.fecha)}`} derecha={<Pildora color={COLOR_ESTADO[r.estado]}>{ETIQUETA_REMOTA[r.estado]}</Pildora>} />
      {r.objetivo && <Tarjeta className="gap-1"><Kicker>Objetivo</Kicker><div className="text-sm">{r.objetivo}</div></Tarjeta>}
      {r.ejercicios.map((e, i) => (
        <Tarjeta key={i} className="gap-3">
          <div><div className="text-base font-bold">{i + 1}. {e.nombre}</div>
            <div className="text-xs text-tenue">{e.tipoTexto} · {e.nivel}. {e.nivelNombre}</div></div>
          <div className="text-[13px] text-suave">{textoCarga(e.carga)}</div>
          {e.video ? (<>
            <VideoRemoto ruta={e.video.ruta} />
            <div className="text-xs text-tenue">Video de {Math.round(e.video.duracionS)} s · subido {fechaCorta(e.video.subidoEn.slice(0, 10))}</div>
            <AreaTexto rows={3} value={textos[i] ?? e.feedback ?? ''} onChange={(ev) => setTextos({ ...textos, [i]: ev.target.value })} placeholder="Comentario para la familia (ej. ¡Muy bien! Intenta doblar más las rodillas)" aria-label={`Comentario del ejercicio ${i + 1}`} />
            <Boton variante="claro" onClick={() => guardarFeedback(i)} cargando={guardando === i} disabled={!(textos[i] ?? e.feedback ?? '').trim()}>{e.feedback ? 'Actualizar comentario' : 'Enviar comentario'}</Boton>
          </>) : <div className="text-sm text-tenue">Todavía no hay video de este ejercicio.</div>}
        </Tarjeta>
      ))}
    </Pantalla>
  );
}
