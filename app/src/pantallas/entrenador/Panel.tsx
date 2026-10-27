import { Bell, CalendarStar, CheckCircle, NotePencil, Plus, Timer, UserPlus, Warning, WarningCircle } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import {
  ahoraIso, cop, estadoEn, fechaChip, fechaLarga, hora12, hoy, nombreCorto,
  type ConfirmacionEvento, type Evento, type Notificacion, type Pago, type Sesion, type SolicitudCambio,
} from '@pa/shared';
import { guardar, idNuevo, useColeccion } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import { Avatar, Boton, BotonIcono, COLOR, ErrorCarga, Esqueleto, Kicker, Tarjeta, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { alertaSalud, useEntrenador } from './contexto';

export function Panel() {
  const nav = useNavigate();
  const toast = useToast();
  const { perfil, usuario } = useSesion();
  const { ninos, activos, catPorId } = useEntrenador();
  const hoyF = hoy();
  const sesiones = useColeccion<Sesion>('sesiones', [['fecha', '==', hoyF]]);
  const solicitudes = useColeccion<SolicitudCambio>('solicitudesCambio', [['estado', '==', 'pendiente']]);
  const pagos = useColeccion<Pago>('pagos', [['estado', 'in', ['pendiente', 'vencido']]]);
  const eventos = useColeccion<Evento>('eventos', [['fechaInicio', '>=', hoyF]]);
  const notis = useColeccion<Notificacion>('notificaciones', [['usuarioId', '==', usuario?.uid ?? '']]);

  const proximoEvento = [...eventos.datos].filter((e) => e.requiereConfirmacion).sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))[0];
  const conf = useColeccion<ConfirmacionEvento>(proximoEvento ? 'confirmacionesEvento' : null, [['eventoId', '==', proximoEvento?.id ?? '']]);

  const pendientes = ninos.filter((n) => n.estado === 'pendiente_aprobacion');
  const vencidos = pagos.datos.filter((p) => estadoEn(p, hoyF) === 'vencido');
  const deHoy = [...sesiones.datos].filter((s) => s.estado !== 'cancelada').sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  const sinLeer = notis.datos.some((n) => !n.leida);

  const destino = proximoEvento ? activos.filter((n) => proximoEvento.categoriasIds === 'todas' || proximoEvento.categoriasIds.includes(n.categoriaId ?? '')) : [];
  const si = conf.datos.filter((c) => c.respuesta === 'asistira' && destino.some((n) => n.id === c.ninoId)).length;
  const no = conf.datos.filter((c) => c.respuesta === 'no_asistira' && destino.some((n) => n.id === c.ninoId)).length;
  const sinResp = destino.filter((n) => !conf.datos.some((c) => c.ninoId === n.id));

  async function recordarSinRespuesta() {
    if (!proximoEvento) return;
    try {
      const ids = [...new Set(sinResp.flatMap((n) => n.acudientesIds))];
      await Promise.all(ids.map((u) => guardar('notificaciones', {
        id: idNuevo('notificaciones'), usuarioId: u, tipo: 'confirmar_evento', titulo: `Confirma: ${proximoEvento.titulo}`,
        cuerpo: `¿Tu hijo asistirá a ${proximoEvento.titulo} el ${fechaChip(proximoEvento.fechaInicio.slice(0, 10))}? Confirma en Eventos.`,
        enlace: '/p/eventos', leida: false, fecha: ahoraIso(),
      })));
      toast(`Recordatorio enviado a ${ids.length} acudientes`);
    } catch (e) { toast(mensajeError(e), 'error'); }
  }

  const tiles = [
    { icono: UserPlus, n: pendientes.length, label: 'Inscripciones por aprobar', sub: pendientes.map((x) => nombreCorto(x.nombres, x.apellidos)).join(', ') || 'Ninguna', color: COLOR.verde, a: '/e/inscripciones' },
    { icono: NotePencil, n: solicitudes.datos.length, label: solicitudes.datos.length === 1 ? 'Solicitud de cambio' : 'Solicitudes de cambio', sub: solicitudes.datos[0] ? `${solicitudes.datos[0].etiqueta}` : 'Ninguna', color: COLOR.azul, a: '/e/solicitudes' },
    { icono: WarningCircle, n: vencidos.length, label: 'Pagos vencidos', sub: `${cop(vencidos.reduce((a, p) => a + p.valorAPagar, 0))} por cobrar`, color: COLOR.rojo, a: '/e/pagos?estado=vencido' },
    { icono: CalendarStar, n: eventos.datos.length, label: 'Próximos eventos', sub: [...eventos.datos].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio)).slice(0, 2).map((e) => e.titulo.split(' ')[0]).join(' · ') || 'Ninguno', color: COLOR.ambar, a: '/e/eventos' },
  ];

  return (
    <Pantalla>
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-0.5"><div className="text-[13px] text-tenue">{fechaLarga(hoyF)}</div><div className="text-[22px] font-bold">Hola, {perfil?.nombres.split(' ')[0]}</div></div>
        <div className="flex gap-2">
          <BotonIcono onClick={() => nav('/e/notificaciones')} aria-label="Notificaciones"><Bell size={19} weight="bold" />{sinLeer && <span className="absolute top-2.5 right-[11px] w-2 h-2 rounded-full bg-verde" />}</BotonIcono>
          <button onClick={() => nav('/e/mas')} className="border-0 p-0 bg-transparent cursor-pointer"><Avatar ini="NJ" fondo={COLOR.verde} color={COLOR.tinta} /></button>
        </div>
      </div>
      <div className="titulo text-[34px]" style={{ lineHeight: 0.98 }}>
        {sesiones.cargando ? <Esqueleto alto={68} ancho="70%" />
          : sesiones.error ? <>No pudimos<br /><span className="text-verde">cargar hoy.</span></>
          : deHoy.length ? <>Hoy entrenas<br /><span className="text-verde">{new Set(deHoy.map((s) => s.categoriaId)).size} {new Set(deHoy.map((s) => s.categoriaId)).size === 1 ? 'categoría.' : 'categorías.'}</span></>
          : <>Hoy no hay<br /><span className="text-verde">sesiones.</span></>}
      </div>

      {sesiones.cargando && <Esqueleto alto={170} className="!rounded-4xl" />}
      {sesiones.error && <ErrorCarga mensaje={sesiones.error} onReintentar={() => location.reload()} />}
      {deHoy.map((s) => {
        const cat = catPorId.get(s.categoriaId);
        const kids = activos.filter((n) => n.categoriaId === s.categoriaId);
        const alertas = kids.filter((n) => alertaSalud(n)).length;
        const control = s.tipo === 'control';
        return (
          <div key={s.id} className="rounded-4xl p-5 flex flex-col gap-3 cursor-pointer" onClick={() => nav(`/e/sesion/${s.id}`)}
            style={{ background: control ? 'linear-gradient(150deg,#1F4FD8,#0F2A7A)' : '#141924', border: `1px solid ${control ? 'rgba(79,123,255,0.5)' : 'rgba(255,255,255,0.07)'}` }}>
            <div className="flex justify-between items-center">
              <span className="kicker" style={{ color: control ? '#C8D5FF' : undefined }}>{control ? 'Día de control' : 'Entrenamiento'}{s.asistenciaGuardada ? ' · asistencia lista ✓' : ''}</span>
              <span className="text-[13px] font-bold">{hora12(s.horaInicio)} – {hora12(s.horaFin)}</span>
            </div>
            <div className="flex items-baseline gap-2.5"><span className="titulo text-[28px]">{cat?.nombre ?? s.categoriaId}</span><span className="text-[13px] text-suave">{kids.length} niños</span></div>
            <div className="text-[13px] text-suave">{s.lugar}{s.tema ? ` · ${s.tema}` : ''}{control ? ` · ${s.pruebasSeleccionadas.length} pruebas` : ''}</div>
            {alertas > 0 && <div className="flex items-center gap-2 text-xs text-ambar"><Warning weight="bold" />{alertas} {alertas === 1 ? 'niño' : 'niños'} con alertas de salud</div>}
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Boton className="flex-1 h-14 text-sm whitespace-nowrap px-3" icono={<CheckCircle weight="bold" size={20} />} onClick={() => nav(`/e/sesion/${s.id}/asistencia`)}>{s.asistenciaGuardada ? 'Ver asistencia' : 'Tomar asistencia'}</Boton>
              {control && <Boton variante="claro" className="flex-1 h-14 text-sm whitespace-nowrap px-3" icono={<Timer weight="bold" />} onClick={() => nav(`/e/sesion/${s.id}/captura`)}>Registrar pruebas</Boton>}
            </div>
          </div>
        );
      })}
      <Boton variante="punteado" className="h-12" icono={<Plus weight="bold" />} onClick={() => nav('/e/sesiones/nueva')}>Nueva sesión</Boton>

      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((t) => (
          <Tarjeta key={t.label} como={t.a} className="gap-2 rounded-[22px] p-4">
            <t.icono size={20} weight="bold" style={{ color: t.color }} />
            <span className="text-[28px] font-[850] leading-none" style={{ color: t.color }}>{t.n}</span>
            <span className="text-[13px] leading-tight">{t.label}</span>
            <span className="text-[11px] text-tenue leading-snug line-clamp-2">{t.sub}</span>
          </Tarjeta>
        ))}
      </div>

      {proximoEvento && (
        <Tarjeta className="gap-3">
          <div className="flex justify-between items-center"><Kicker>{proximoEvento.titulo.split('·')[0].trim()} · {fechaChip(proximoEvento.fechaInicio.slice(0, 10)).toLowerCase()}</Kicker><span className="text-xs text-tenue">{destino.length} niños</span></div>
          <div className="flex h-2.5 rounded-[5px] overflow-hidden gap-0.5">
            {si > 0 && <div style={{ flex: si, background: COLOR.verde }} />}
            {no > 0 && <div style={{ flex: no, background: COLOR.rojo }} />}
            {sinResp.length > 0 && <div style={{ flex: sinResp.length, background: '#2A3142' }} />}
          </div>
          <div className="flex gap-4 text-xs text-suave"><span><b className="text-verde">{si}</b> asistirán</span><span><b className="text-rojo">{no}</b> no asistirán</span><span><b>{sinResp.length}</b> sin respuesta</span></div>
          {sinResp.length > 0 && <Boton variante="secundario" className="h-11 text-[13px]" onClick={recordarSinRespuesta}>Recordar a los {sinResp.length} sin respuesta</Boton>}
        </Tarjeta>
      )}
    </Pantalla>
  );
}
