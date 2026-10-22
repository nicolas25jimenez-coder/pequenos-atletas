// Eventos con confirmación de asistencia (RF-E36 a RF-E38).
import { Plus } from '@phosphor-icons/react';
import { addDoc, collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ahoraIso, cop, fechaChip, hora12, hoy, sumarDias,
  type ConfirmacionEvento, type Evento, type Sesion, type TipoEvento,
} from '@pa/shared';
import { idNuevo, useColeccion, useDocumento } from '../../lib/datos';
import { db } from '../../lib/firebase';
import { useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import {
  AreaTexto, Aviso, Boton, Campo, Casilla, COLOR, Encabezado, Etiqueta, Hoja, Kicker, Segmentado, Selector, Tarjeta, Vacio, Volver, useToast,
} from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { TIPO_EVENTO } from '../padre/Eventos';
import { nombreNino, useEntrenador } from './contexto';

export function EventosEntrenador() {
  const nav = useNavigate();
  const [vista, setVista] = useState<'proximos' | 'pasados'>('proximos');
  const { datos } = useColeccion<Evento>('eventos');
  const conf = useColeccion<ConfirmacionEvento>('confirmacionesEvento');
  const { activos } = useEntrenador();
  const [detalle, setDetalle] = useState<Evento | null>(null);
  const lista = datos.filter((e) => (vista === 'proximos' ? e.fechaFin.slice(0, 10) >= hoy() : e.fechaFin.slice(0, 10) < hoy()))
    .sort((a, b) => (vista === 'proximos' ? 1 : -1) * a.fechaInicio.localeCompare(b.fechaInicio));

  return (
    <Pantalla>
      <Volver a="/e/mas">Más</Volver>
      <Encabezado titulo="Eventos" derecha={<Boton alto="sm" icono={<Plus weight="bold" />} onClick={() => nav('/e/eventos/nuevo')}>Nuevo</Boton>} />
      <Segmentado valor={vista} onCambio={setVista} opciones={[{ id: 'proximos', etiqueta: 'Próximos' }, { id: 'pasados', etiqueta: 'Pasados' }]} />
      {!lista.length && <Vacio titulo="No hay eventos" />}
      {lista.map((e) => {
        const t = TIPO_EVENTO[e.tipo];
        const destino = activos.filter((n) => e.categoriasIds === 'todas' || e.categoriasIds.includes(n.categoriaId ?? ''));
        const c = conf.datos.filter((x) => x.eventoId === e.id && destino.some((n) => n.id === x.ninoId));
        const si = c.filter((x) => x.respuesta === 'asistira').length, no = c.filter((x) => x.respuesta === 'no_asistira').length;
        return (
          <Tarjeta key={e.id} onClick={() => setDetalle(e)} className="gap-2">
            <div className="flex justify-between"><Kicker color={t.color}>{t.etiqueta}</Kicker><span className="text-xs text-tenue">{fechaChip(e.fechaInicio.slice(0, 10))} · {hora12(e.fechaInicio.slice(11, 16))}</span></div>
            <div className="text-[17px] font-bold">{e.titulo}</div>
            <div className="text-[13px] text-suave">{e.lugar}{e.costo ? ` · ${cop(e.costo)}` : ''}</div>
            {e.requiereConfirmacion && (<>
              <div className="flex h-2 rounded overflow-hidden gap-0.5">
                {si > 0 && <div style={{ flex: si, background: COLOR.verde }} />}{no > 0 && <div style={{ flex: no, background: COLOR.rojo }} />}
                {destino.length - si - no > 0 && <div style={{ flex: destino.length - si - no, background: '#2A3142' }} />}
              </div>
              <div className="text-xs text-suave"><b className="text-verde">{si}</b> asistirán · <b className="text-rojo">{no}</b> no · <b>{destino.length - si - no}</b> sin respuesta</div>
            </>)}
          </Tarjeta>
        );
      })}
      <DetalleEvento e={detalle} conf={conf.datos} onCerrar={() => setDetalle(null)} />
    </Pantalla>
  );
}

function DetalleEvento({ e, conf, onCerrar }: { e: Evento | null; conf: ConfirmacionEvento[]; onCerrar: () => void }) {
  const nav = useNavigate();
  const toast = useToast();
  const { activos } = useEntrenador();
  if (!e) return null;
  const destino = activos.filter((n) => e.categoriasIds === 'todas' || e.categoriasIds.includes(n.categoriaId ?? ''));
  const resp = (id: string) => conf.find((c) => c.eventoId === e.id && c.ninoId === id)?.respuesta;
  const sin = destino.filter((n) => !resp(n.id));

  async function recordar() {
    try {
      const ids = [...new Set(sin.flatMap((n) => n.acudientesIds))];
      await Promise.all(ids.map((u) => addDoc(collection(db, 'notificaciones'), { usuarioId: u, tipo: 'confirmar_evento', titulo: `Confirma: ${e!.titulo}`, cuerpo: `¿Tu hijo asistirá a ${e!.titulo}? Confirma en Eventos.`, enlace: '/p/eventos', leida: false, fecha: ahoraIso() })));
      toast(`Recordatorio enviado a ${ids.length} acudientes`);
    } catch (err) { toast(mensajeError(err), 'error'); }
  }
  async function eliminar() {
    if (!confirm('¿Eliminar este evento?')) return;
    await deleteDoc(doc(db, 'eventos', e!.id));
    toast('Evento eliminado'); onCerrar();
  }

  return (
    <Hoja abierta onCerrar={onCerrar} titulo={e.titulo} sub={`${fechaChip(e.fechaInicio.slice(0, 10))} · ${e.lugar}`}>
      {e.requiereConfirmacion ? (
        <div className="flex flex-col gap-1.5 max-h-[40dvh] overflow-y-auto">
          {destino.map((n) => {
            const r = resp(n.id);
            return <div key={n.id} className="flex justify-between text-sm"><span>{nombreNino(n)}</span><span style={{ color: r === 'asistira' ? COLOR.verde : r === 'no_asistira' ? COLOR.rojo : COLOR.tenue }}>{r === 'asistira' ? 'Asistirá' : r === 'no_asistira' ? 'No asistirá' : 'Sin respuesta'}</span></div>;
          })}
        </div>
      ) : <div className="text-sm text-tenue">Este evento no requiere confirmación.</div>}
      {e.requiereConfirmacion && sin.length > 0 && <Boton variante="secundario" onClick={recordar}>Recordar a los {sin.length} sin respuesta</Boton>}
      <div className="flex gap-2">
        <Boton variante="secundario" className="!text-rojo" onClick={eliminar}>Eliminar</Boton>
        <Boton className="flex-1" onClick={() => nav(`/e/eventos/${e.id}`)}>Editar</Boton>
      </div>
    </Hoja>
  );
}

export function FormEvento() {
  const { id } = useParams();
  const nuevo = id === 'nuevo';
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { categorias } = useEntrenador();
  const { datos: actual, cargando } = useDocumento<Evento>(nuevo ? null : `eventos/${id}`);
  const sesiones = useColeccion<Sesion>('sesiones', [['fecha', '>=', hoy()]]);
  const [f, setF] = useState<Omit<Evento, 'id'> | null>(null);
  const base: Omit<Evento, 'id'> = actual ?? {
    tipo: 'actividad_especial', titulo: '', descripcion: '', lugar: 'Parque El Virrey', fechaInicio: `${sumarDias(hoy(), 7)}T09:00:00-05:00`, fechaFin: `${sumarDias(hoy(), 7)}T11:00:00-05:00`,
    categoriasIds: 'todas', requiereConfirmacion: true, fechaLimiteConfirmacion: `${sumarDias(hoy(), 5)}T23:59:00-05:00`, recordatorios: [7, 1],
  };
  const e = f ?? base;
  const set = (x: Partial<Omit<Evento, 'id'>>) => setF({ ...e, ...x });
  const [error, setError] = useState('');
  if (!nuevo && cargando) return null;

  const fecha = e.fechaInicio.slice(0, 10), hIni = e.fechaInicio.slice(11, 16), hFin = e.fechaFin.slice(11, 16);
  const iso = (d: string, h: string) => `${d}T${h}:00-05:00`;

  async function guardar() {
    setError('');
    if (!e.titulo.trim() || !e.lugar.trim()) return setError('Escribe el título y el lugar.');
    if (hFin <= hIni) return setError('La hora de fin debe ser posterior a la de inicio.');
    try {
      const nid = nuevo ? idNuevo('eventos') : id!;
      await setDoc(doc(db, 'eventos', nid), JSON.parse(JSON.stringify({ ...e, titulo: e.titulo.trim(), actualizadoEn: ahoraIso(), ...(nuevo ? { creadoEn: ahoraIso(), creadoPor: usuario!.uid } : {}) })));
      toast('Evento guardado');
      nav('/e/eventos', { replace: true });
    } catch (err) { setError(mensajeError(err)); }
  }

  return (
    <Pantalla>
      <Volver a="/e/eventos">Eventos</Volver>
      <div className="titulo text-[28px]">{nuevo ? 'Nuevo evento' : 'Editar evento'}</div>
      <Tarjeta className="gap-3">
        <Etiqueta texto="Tipo"><Selector value={e.tipo} onChange={(x) => set({ tipo: x.target.value as TipoEvento })}>{Object.entries(TIPO_EVENTO).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}</Selector></Etiqueta>
        <Etiqueta texto="Título"><Campo value={e.titulo} onChange={(x) => set({ titulo: x.target.value })} /></Etiqueta>
        <Etiqueta texto="Descripción"><AreaTexto value={e.descripcion} onChange={(x) => set({ descripcion: x.target.value })} /></Etiqueta>
        <div className="grid grid-cols-3 gap-2">
          <Etiqueta texto="Fecha" className="col-span-3"><Campo type="date" value={fecha} onChange={(x) => set({ fechaInicio: iso(x.target.value, hIni), fechaFin: iso(x.target.value, hFin) })} /></Etiqueta>
          <Etiqueta texto="Inicia" className="col-span-1"><Campo type="time" value={hIni} onChange={(x) => set({ fechaInicio: iso(fecha, x.target.value) })} /></Etiqueta>
          <Etiqueta texto="Termina" className="col-span-1"><Campo type="time" value={hFin} onChange={(x) => set({ fechaFin: iso(fecha, x.target.value) })} /></Etiqueta>
          <Etiqueta texto="Costo" className="col-span-1"><Campo inputMode="numeric" value={e.costo ?? ''} onChange={(x) => set({ costo: Number(x.target.value.replace(/\D/g, '')) || undefined })} placeholder="Gratis" /></Etiqueta>
        </div>
        <Etiqueta texto="Lugar"><Campo value={e.lugar} onChange={(x) => set({ lugar: x.target.value })} /></Etiqueta>
        <Etiqueta texto="Enlace de Google Maps (opcional)"><Campo value={e.ubicacionMapsUrl ?? ''} onChange={(x) => set({ ubicacionMapsUrl: x.target.value || undefined })} /></Etiqueta>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Para quién</Kicker>
        <Casilla activo={e.categoriasIds === 'todas'} onCambio={(v) => set({ categoriasIds: v ? 'todas' : [] })}>Todas las categorías</Casilla>
        {e.categoriasIds !== 'todas' && categorias.filter((c) => c.activa).map((c) => {
          const ids = e.categoriasIds as string[];
          return <Casilla key={c.id} activo={ids.includes(c.id)} onCambio={(v) => set({ categoriasIds: v ? [...ids, c.id] : ids.filter((x) => x !== c.id) })}>{c.nombre}</Casilla>;
        })}
        <Casilla activo={e.requiereConfirmacion} onCambio={(v) => set({ requiereConfirmacion: v })}>Los padres deben confirmar asistencia</Casilla>
        {e.requiereConfirmacion && <Etiqueta texto="Confirmar hasta"><Campo type="date" value={e.fechaLimiteConfirmacion?.slice(0, 10) ?? ''} onChange={(x) => set({ fechaLimiteConfirmacion: `${x.target.value}T23:59:00-05:00` })} /></Etiqueta>}
        <Etiqueta texto="Recordatorios (días antes)"><Campo value={e.recordatorios.join(', ')} onChange={(x) => set({ recordatorios: x.target.value.split(',').map((d) => Number(d.trim())).filter((d) => !isNaN(d) && d >= 0) })} placeholder="7, 1" /></Etiqueta>
        {e.tipo === 'control' && (
          <Etiqueta texto="Sesión de control vinculada (opcional)">
            <Selector value={e.sesionId ?? ''} onChange={(x) => set({ sesionId: x.target.value || undefined })}>
              <option value="">Ninguna</option>
              {sesiones.datos.filter((s) => s.tipo === 'control').map((s) => <option key={s.id} value={s.id}>{fechaChip(s.fecha)} · {s.categoriaId}</option>)}
            </Selector>
          </Etiqueta>
        )}
      </Tarjeta>
      {error && <Aviso tono="error">{error}</Aviso>}
      <Boton alto="lg" onClick={guardar}>Guardar evento</Boton>
    </Pantalla>
  );
}
