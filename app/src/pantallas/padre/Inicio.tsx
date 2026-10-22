import { ArrowUpRight, Bell, Clock, MapPin, MegaphoneSimple, WhatsappLogo } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  cop, enlaceWhatsApp, fechaChip, fechaCorta, fechaLarga, hora12, hoy, iniciales, resumirAsistencia, tendencia, formatoValor,
  type Anuncio, type Notificacion,
} from '@pa/shared';
import { useColeccion, useConfiguracion } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { COLOR_ASISTENCIA, COLOR_PAGO, COLOR_TENDENCIA } from '../../lib/estilos';
import { alfa, Avatar, Barra, BotonIcono, COLOR, Kicker, Tarjeta } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { colorNino, useFamilia } from './familia';
import { anunciosPara, cuandoSesion, ESTADO_PAGO_PADRE, notaPago, pagoActual, proximaSesion } from './util';

export function Inicio() {
  const nav = useNavigate();
  const { perfil, usuario } = useSesion();
  const config = useConfiguracion();
  const { ninos, nino, elegir, categorias, sesiones, pagos, asistencias, resultados, pruebas } = useFamilia();
  const anuncios = useColeccion<Anuncio>('anuncios');
  const notis = useColeccion<Notificacion>('notificaciones', [['usuarioId', '==', usuario?.uid ?? '']]);
  const sinLeer = notis.datos.some((n) => !n.leida);
  const ultimo = useUltimoResultado(resultados, pruebas);
  if (!nino) return null;

  const cat = nino.categoriaId ? categorias.get(nino.categoriaId) : undefined;
  const prox = proximaSesion(sesiones);
  const pago = pagoActual(pagos);
  const mes = hoy().slice(0, 7);
  const resumen = resumirAsistencia(asistencias.filter((a) => a.fecha.startsWith(mes)).map((a) => a.estado));
  const anuncio = anunciosPara(anuncios.datos, [nino])[0];
  const inactivo = nino.estado === 'inactivo';

  return (
    <Pantalla>
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-0.5">
          <div className="text-[13px] text-tenue">{fechaLarga(hoy())}</div>
          <div className="text-[22px] font-bold">Hola, {perfil?.nombres.split(' ')[0]}</div>
        </div>
        <div className="flex gap-2">
          <BotonIcono onClick={() => nav('/p/notificaciones')} aria-label="Notificaciones">
            <Bell size={19} weight="bold" />
            {sinLeer && <span className="absolute top-2.5 right-[11px] w-2 h-2 rounded-full bg-verde" />}
          </BotonIcono>
          <button onClick={() => nav('/p/mas')} className="border-0 p-0 bg-transparent cursor-pointer" aria-label="Más opciones">
            <Avatar ini={iniciales(perfil?.nombres ?? '', perfil?.apellidos)} />
          </button>
        </div>
      </div>

      {ninos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto -mx-5 px-5">
          {ninos.map((k) => {
            const on = k.id === nino.id;
            return (
              <button key={k.id} onClick={() => elegir(k.id)}
                className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full cursor-pointer shrink-0"
                style={{ background: on ? COLOR.verde : '#141924', border: `1px solid ${on ? COLOR.verde : 'rgba(255,255,255,0.08)'}`, color: on ? COLOR.tinta : COLOR.texto }}>
                <Avatar ini={iniciales(k.nombres, k.apellidos)} tam={36} fondo={on ? '#0F3A1F' : colorNino(ninos, k.id)} />
                <span className="flex flex-col items-start leading-tight">
                  <span className="font-bold text-sm">{k.nombres}</span>
                  <span className="text-[11px] opacity-75">{k.estado === 'inactivo' ? 'Inactivo' : categorias.get(k.categoriaId ?? '')?.nombre}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {inactivo && (
        <Tarjeta><span className="text-sm text-suave">{nino.nombres} está inactivo desde el {fechaCorta(nino.fechaInactivacion)}. Puedes consultar todo su historial.</span></Tarjeta>
      )}

      {!inactivo && (
        <div className="relative overflow-hidden rounded-4xl p-[22px] flex flex-col gap-3.5" style={{ background: 'linear-gradient(150deg,#1F4FD8 0%,#163AA6 55%,#0F2A7A 100%)' }}>
          <div className="absolute -right-10 -top-10 w-[180px] h-[180px] rounded-full border-[28px] border-white/[0.06]" />
          <div className="flex justify-between items-center relative">
            <span className="kicker text-azul-hielo" style={{ color: '#C8D5FF' }}>Próxima sesión</span>
            {prox && <span className="px-3 py-[5px] rounded-full bg-verde text-tinta text-[11px] font-extrabold tracking-[0.08em]">{cuandoSesion(prox)}</span>}
          </div>
          {prox ? (<>
            <div className="titulo text-[26px]" style={{ fontStretch: '112%' }}>{prox.tipo === 'control' ? 'Día de control' : 'Entrenamiento'}</div>
            {prox.tema && <div className="text-sm text-[#DCE4FF] leading-snug">{prox.tema}</div>}
            <div className="flex gap-4 text-[13px] flex-wrap">
              <span className="flex items-center gap-1.5"><Clock weight="bold" />{fechaChip(prox.fecha)} · {hora12(prox.horaInicio)}</span>
              <span className="flex items-center gap-1.5"><MapPin weight="bold" />{prox.lugar}</span>
            </div>
          </>) : <div className="text-sm text-[#DCE4FF]">No hay sesiones programadas por ahora.</div>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Tarjeta como="/p/pagos" className="gap-2.5">
          <div className="flex justify-between items-center w-full"><span className="kicker whitespace-nowrap">Pago {pago ? nombrePeriodo(pago.periodo) : ''}</span><ArrowUpRight weight="bold" className="text-tenue" /></div>
          {pago ? (<>
            <div className="text-2xl font-extrabold tracking-tight">{cop(pago.valorAPagar)}</div>
            <span className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: alfa(COLOR_PAGO[pago.estado], 0.15), color: COLOR_PAGO[pago.estado] }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLOR_PAGO[pago.estado] }} />{ESTADO_PAGO_PADRE[pago.estado]}
            </span>
            <div className="text-xs text-tenue">{notaPago(pago, nino)}</div>
          </>) : <div className="text-sm text-tenue">Sin cobros aún</div>}
        </Tarjeta>
        <Tarjeta como={ultimo ? `/p/prueba/${ultimo.pruebaId}` : '/p/hijo/pruebas'} className="gap-2.5">
          <div className="flex justify-between items-center w-full"><span className="kicker">Último resultado</span><ArrowUpRight weight="bold" className="text-tenue" /></div>
          {ultimo ? (<>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-2xl font-extrabold">{ultimo.valor}</span><span className="text-[13px] text-tenue">{ultimo.unidad}</span>
              {ultimo.tendencia && <span className="text-[13px] font-bold ml-1" style={{ color: ultimo.color }}>{ultimo.tendencia}</span>}
            </div>
            <div className="text-[13px] leading-tight">{ultimo.nombre}</div>
            <div className="text-xs text-tenue">Control del {fechaCorta(ultimo.fecha)}</div>
          </>) : <div className="text-sm text-tenue">Aún no hay pruebas</div>}
        </Tarjeta>
      </div>

      <Tarjeta como="/p/asistencia" className="gap-3.5">
        <div className="flex justify-between items-center w-full"><span className="kicker">Asistencia · {nombrePeriodo(mes).toLowerCase()}</span><span className="text-xs text-tenue">{resumen.total} sesiones</span></div>
        <div className="grid grid-cols-4 gap-2.5 w-full">
          {resumen.indicadores.map((s) => (
            <div key={s.estado} className="flex flex-col gap-1.5">
              <div className="text-[22px] font-extrabold" style={{ color: COLOR_ASISTENCIA[s.estado] }}>{s.cantidad}</div>
              <Barra pct={s.porcentaje} color={COLOR_ASISTENCIA[s.estado]} />
              <div className="text-[11px] text-suave">{s.etiqueta}<br /><span className="text-tenue">{s.porcentaje.toLocaleString('es-CO')} %</span></div>
            </div>
          ))}
        </div>
      </Tarjeta>

      {anuncio && (
        <Tarjeta como="/p/anuncios" className="gap-2">
          <Kicker icono={<MegaphoneSimple weight="bold" size={16} className="text-azul" />}>Anuncio{anuncio.fijado ? ' · fijado' : ''}</Kicker>
          <div className="text-base font-bold">{anuncio.titulo}</div>
          <div className="text-sm text-suave leading-snug pretty">{anuncio.mensaje}</div>
        </Tarjeta>
      )}

      <a href={enlaceWhatsApp(config.telefonoWhatsApp, `Hola profe Nicolás, le escribo sobre ${nino.nombres} ${nino.apellidos.split(' ')[0]}${cat ? ` (${cat.nombre})` : ''}. `)}
        target="_blank" rel="noreferrer"
        className="sticky bottom-[104px] self-end h-[54px] pl-4 pr-5 rounded-full bg-verde text-tinta font-extrabold text-sm flex items-center gap-2 no-underline shadow-[0_10px_30px_rgba(61,220,106,0.35)] z-10">
        <WhatsappLogo size={22} weight="bold" />Escribir al entrenador
      </a>
    </Pantalla>
  );
}

function nombrePeriodo(p: string) {
  const n = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][Number(p.slice(5, 7)) - 1];
  return n;
}

/** Resultado destacado del último control: el de mayor mejora respecto al anterior. */
function useUltimoResultado(resultados: ReturnType<typeof useFamilia>['resultados'], pruebas: ReturnType<typeof useFamilia>['pruebas']) {
  return useMemo(() => {
    const validos = resultados.filter((r) => r.valorFinal !== null && !r.noRealizada);
    if (!validos.length) return null;
    const fecha = validos[validos.length - 1].fecha;
    const ultimos = validos.filter((r) => r.fecha === fecha);
    let mejor: { pruebaId: string; valor: string; unidad: string; nombre: string; fecha: string; tendencia?: string; color?: string; puntaje: number } | null = null;
    for (const r of ultimos) {
      const p = pruebas.get(r.pruebaId);
      if (!p) continue;
      const prev = validos.filter((x) => x.pruebaId === r.pruebaId && x.fecha < fecha).pop();
      const t = prev && p.tipoResultado !== 'cualitativa' ? tendencia(p, prev.valorFinal!, r.valorFinal!) : null;
      const rango = p.referencias[0] ? p.referencias[0].valorAlto - p.referencias[0].valorBajo || 1 : Math.max(1, Math.abs(r.valorFinal!));
      const puntaje = t ? (t.direccion === 'mejor' ? 1 : t.direccion === 'peor' ? -1 : 0) * t.diferencia / rango : -2;
      if (!mejor || puntaje > mejor.puntaje) {
        mejor = {
          pruebaId: p.id, valor: formatoValor(p, r.valorFinal), unidad: p.unidad, nombre: p.nombre, fecha, puntaje,
          ...(t && t.direccion !== 'igual' ? { tendencia: `${t.direccion === 'mejor' ? '↑' : '↓'} ${t.diferencia.toLocaleString('es-CO')}`, color: COLOR_TENDENCIA[t.direccion] } : {}),
        };
      }
    }
    return mejor;
  }, [resultados, pruebas]);
}
