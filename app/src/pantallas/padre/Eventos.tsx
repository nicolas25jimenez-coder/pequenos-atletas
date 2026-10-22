import { CalendarPlus, MapTrifold } from '@phosphor-icons/react';
import { doc, setDoc } from 'firebase/firestore';
import { useMemo } from 'react';
import {
  ahoraIso, cop, fechaChip, hora12, hoy, iniciales, MESES,
  type ConfirmacionEvento, type Evento, type Nino, type RespuestaEvento,
} from '@pa/shared';
import { useColeccion, useDeFamilia } from '../../lib/datos';
import { db } from '../../lib/firebase';
import { useSesion } from '../../lib/sesion';
import { descargarIcs } from '../../lib/ics';
import { mensajeError } from '../../lib/errores';
import { Avatar, COLOR, Titulo, Vacio, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useFamilia } from './familia';

export const TIPO_EVENTO: Record<Evento['tipo'], { etiqueta: string; color: string }> = {
  control: { etiqueta: 'Día de control', color: COLOR.azul },
  torneo: { etiqueta: 'Festival / torneo', color: COLOR.verde },
  actividad_especial: { etiqueta: 'Actividad especial', color: COLOR.ambar },
};

export function Eventos() {
  const { usuario } = useSesion();
  const toast = useToast();
  const { ninos } = useFamilia();
  const eventos = useColeccion<Evento>('eventos');
  const conf = useDeFamilia<ConfirmacionEvento>('confirmacionesEvento', usuario?.uid);
  const activos = ninos.filter((n) => n.estado === 'activo');

  const proximos = useMemo(() => eventos.datos
    .filter((e) => e.fechaFin.slice(0, 10) >= hoy())
    .map((e) => ({ e, ninos: activos.filter((n) => e.categoriasIds === 'todas' || e.categoriasIds.includes(n.categoriaId ?? '')) }))
    .filter((x) => x.ninos.length > 0)
    .sort((a, b) => a.e.fechaInicio.localeCompare(b.e.fechaInicio)), [eventos.datos, activos]);

  async function responder(e: Evento, n: Nino, respuesta: RespuestaEvento) {
    if (!usuario) return;
    try {
      await setDoc(doc(db, 'confirmacionesEvento', `${e.id}_${n.id}`), {
        eventoId: e.id, ninoId: n.id, acudientesIds: n.acudientesIds, respuesta, respondidoPor: usuario.uid, fecha: ahoraIso(),
        creadoEn: ahoraIso(), actualizadoEn: ahoraIso(), creadoPor: usuario.uid,
      });
      toast(respuesta === 'asistira' ? `Confirmado: ${n.nombres} asistirá` : `Registrado: ${n.nombres} no asistirá`);
    } catch (err) { toast(mensajeError(err), 'error'); }
  }

  return (
    <Pantalla>
      <Titulo>Eventos</Titulo>
      {!proximos.length && <Vacio titulo="No hay eventos próximos" texto="Aquí verás días de control, festivales y actividades especiales." />}
      {proximos.map(({ e, ninos: hijos }, idx) => {
        const t = TIPO_EVENTO[e.tipo];
        const f = e.fechaInicio.slice(0, 10);
        const esHoy = f === hoy();
        const abierto = !e.fechaLimiteConfirmacion || ahoraIso() <= e.fechaLimiteConfirmacion;
        const meta = [e.costo ? `${cop(e.costo)} por niño` : e.requiereConfirmacion ? 'Gratis' : null,
          e.requiereConfirmacion ? (e.fechaLimiteConfirmacion ? `confirma hasta el ${e.fechaLimiteConfirmacion.slice(8, 10)}/${e.fechaLimiteConfirmacion.slice(5, 7)}` : 'requiere confirmación') : `Para ${hijos.map((h) => h.nombres).join(' y ')} · no requiere confirmación`]
          .filter(Boolean).join(' · ');
        return (
          <div key={e.id} className="rounded-4xl overflow-hidden bg-sup border border-white/[0.07] flex flex-col">
            <div className="flex gap-4 p-[18px] pb-3.5">
              <div className="w-[62px] h-[70px] shrink-0 rounded-[18px] flex flex-col items-center justify-center leading-none"
                style={{ background: esHoy ? COLOR.verde : idx % 2 ? COLOR.marca : '#1B2130', color: esHoy ? COLOR.tinta : COLOR.texto }}>
                <span className="text-[11px] font-extrabold tracking-[0.1em]">{MESES[Number(f.slice(5, 7)) - 1].slice(0, 3).toUpperCase()}</span>
                <span className="text-[28px] font-[850]">{Number(f.slice(8, 10))}</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-[5px]">
                <span className="kicker" style={{ color: t.color }}>{t.etiqueta}</span>
                <span className="text-[17px] font-bold leading-tight">{e.titulo}</span>
                <span className="text-[13px] text-suave">{esHoy ? 'Hoy' : fechaChip(f)} {hora12(e.fechaInicio.slice(11, 16))} · {e.lugar}</span>
                <span className="text-xs text-tenue">{meta}</span>
                {e.descripcion && <span className="text-[13px] text-suave leading-snug mt-1 pretty">{e.descripcion}</span>}
              </div>
            </div>
            {e.requiereConfirmacion && (
              <div className="flex flex-col gap-2 px-[18px] pb-3.5">
                {hijos.map((n) => {
                  const r = conf.datos.find((c) => c.eventoId === e.id && c.ninoId === n.id)?.respuesta;
                  return (
                    <div key={n.id} className="flex items-center gap-2.5">
                      <Avatar ini={iniciales(n.nombres, n.apellidos)} tam={30} />
                      <span className="flex-1 text-sm font-semibold">{n.nombres}</span>
                      <button disabled={!abierto} onClick={() => responder(e, n, 'asistira')} className="h-9 px-3 rounded-full text-xs font-bold cursor-pointer disabled:opacity-50"
                        style={{ background: r === 'asistira' ? COLOR.verde : 'transparent', color: r === 'asistira' ? COLOR.tinta : COLOR.texto, border: `1px solid ${r === 'asistira' ? COLOR.verde : 'rgba(255,255,255,0.14)'}` }}>Asistirá</button>
                      <button disabled={!abierto} onClick={() => responder(e, n, 'no_asistira')} className="h-9 px-3 rounded-full text-xs font-bold cursor-pointer disabled:opacity-50"
                        style={{ background: r === 'no_asistira' ? 'rgba(229,72,77,0.2)' : 'transparent', color: r === 'no_asistira' ? '#FF8A8D' : COLOR.tenue, border: `1px solid ${r === 'no_asistira' ? COLOR.rojo : 'rgba(255,255,255,0.1)'}` }}>No asistirá</button>
                    </div>
                  );
                })}
                {!abierto && <span className="text-xs text-tenue">La confirmación ya cerró.</span>}
              </div>
            )}
            <div className="flex border-t border-white/[0.06]">
              <a href={e.ubicacionMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(e.lugar)}`} target="_blank" rel="noreferrer"
                className="flex-1 h-[46px] text-azul text-[13px] font-bold flex items-center justify-center gap-1.5 no-underline"><MapTrifold weight="bold" />Cómo llegar</a>
              <button onClick={() => { descargarIcs(e); toast('Evento descargado. Ábrelo para agregarlo a tu calendario.'); }}
                className="flex-1 h-[46px] bg-transparent border-0 border-l border-white/[0.06] text-azul text-[13px] font-bold cursor-pointer flex items-center justify-center gap-1.5" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                <CalendarPlus weight="bold" />Agregar al calendario
              </button>
            </div>
          </div>
        );
      })}
    </Pantalla>
  );
}
