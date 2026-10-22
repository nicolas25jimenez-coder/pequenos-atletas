import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useState } from 'react';
import {
  DIAS_CORTOS, diaSemana, ETIQUETA_ASISTENCIA, hoy, nombreMes, resumirAsistencia, sumarDias, sumarMeses, ultimoDiaMes, aFecha,
  type Asistencia as TAsistencia, type Sesion,
} from '@pa/shared';
import { COLOR_ASISTENCIA } from '../../lib/estilos';
import { alfa, Barra, Encabezado, Segmentado, Tarjeta } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { SelectorMini, useFamilia } from './familia';

type Periodo = 'mes' | 'trimestre' | 'total';

export function Asistencia() {
  const { nino, categorias, asistencias, sesiones } = useFamilia();
  const [mes, setMes] = useState(hoy().slice(0, 7));
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  if (!nino) return null;
  const cat = nino.categoriaId ? categorias.get(nino.categoriaId) : undefined;

  const porFecha = new Map<string, TAsistencia>(asistencias.map((a) => [a.fecha, a]));
  const canceladas = new Map<string, Sesion>(sesiones.filter((s) => s.estado === 'cancelada').map((s) => [s.fecha, s]));
  const programadas = new Set(sesiones.filter((s) => s.estado === 'programada').map((s) => s.fecha));

  const desde = periodo === 'mes' ? `${mes}-01` : periodo === 'trimestre' ? sumarDias(hoy(), -90) : '0000-00-00';
  const hasta = periodo === 'mes' ? `${mes}-31` : hoy();
  const enPeriodo = asistencias.filter((a) => a.fecha >= desde && a.fecha <= hasta);
  const resumen = resumirAsistencia(enPeriodo.map((a) => a.estado));
  const nota = periodo === 'mes' ? `${nombreMes(mes, true)} · ${resumen.total} sesiones realizadas.`
    : periodo === 'trimestre' ? `Últimos 3 meses · ${resumen.total} sesiones realizadas.` : `Desde la inscripción · ${resumen.total} sesiones realizadas.`;

  // Calendario
  const [y, m] = mes.split('-').map(Number);
  const primero = aFecha(y, m, 1);
  const vacios = diaSemana(primero) - 1;
  const dias = Array.from({ length: ultimoDiaMes(y, m) }, (_, i) => aFecha(y, m, i + 1));

  const lista = [
    ...asistencias.filter((a) => a.fecha.startsWith(mes)).map((a) => ({ fecha: a.fecha, tipo: a.tipoSesion === 'control' ? 'Día de control' : 'Entrenamiento', obs: a.observacion ?? sesiones.find((s) => s.id === a.sesionId)?.tema ?? '', estado: a.estado as keyof typeof COLOR_ASISTENCIA })),
    ...[...canceladas.values()].filter((s) => s.fecha.startsWith(mes)).map((s) => ({ fecha: s.fecha, tipo: s.tipo === 'control' ? 'Día de control' : 'Entrenamiento', obs: s.motivoCancelacion ?? '', estado: 'cancelada' as const })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <Pantalla>
      <Encabezado titulo="Asistencia" derecha={<SelectorMini />} />
      <Tarjeta className="rounded-4xl gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <button onClick={() => setMes(sumarMeses(mes, -1))} className="w-8 h-8 rounded-full bg-transparent border-0 text-tenue cursor-pointer flex items-center justify-center" aria-label="Mes anterior"><CaretLeft weight="bold" /></button>
            <span className="font-bold text-base">{nombreMes(mes, true)}</span>
            <button onClick={() => setMes(sumarMeses(mes, 1))} disabled={mes >= hoy().slice(0, 7)} className="w-8 h-8 rounded-full bg-transparent border-0 text-tenue cursor-pointer flex items-center justify-center disabled:opacity-30" aria-label="Mes siguiente"><CaretRight weight="bold" /></button>
          </div>
          <span className="text-xs text-tenue">{nino.nombres}{cat ? ` · ${cat.nombre}` : ''}</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-tenue font-bold">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: vacios }, (_, i) => <div key={`v${i}`} />)}
          {dias.map((f) => {
            const a = porFecha.get(f);
            const est = a ? a.estado : canceladas.has(f) ? 'cancelada' : null;
            const c = est ? COLOR_ASISTENCIA[est] : null;
            const esHoy = f === hoy();
            return (
              <div key={f} title={est ? (est === 'cancelada' ? 'Cancelada' : ETIQUETA_ASISTENCIA[est]) : undefined}
                className="aspect-square rounded-xl flex items-center justify-center text-[13px] box-border"
                style={{
                  fontWeight: est || esHoy ? 800 : 500,
                  background: c ? alfa(c, 0.2) : 'transparent',
                  color: c ?? (programadas.has(f) ? '#F2F4F8' : '#5E6678'),
                  border: `1.5px solid ${esHoy ? '#F2F4F8' : programadas.has(f) && !est ? 'rgba(255,255,255,0.18)' : 'transparent'}`,
                }}>
                {Number(f.slice(8))}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-2.5 text-[11px] text-suave">
          {(['asistio', 'retardo', 'excusa', 'falto', 'cancelada'] as const).map((e) => (
            <span key={e} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLOR_ASISTENCIA[e] }} />{e === 'cancelada' ? 'Cancelada' : ETIQUETA_ASISTENCIA[e]}</span>
          ))}
        </div>
      </Tarjeta>

      <Segmentado<Periodo> valor={periodo} onCambio={setPeriodo} alto={36}
        opciones={[{ id: 'mes', etiqueta: 'Mes' }, { id: 'trimestre', etiqueta: 'Trimestre' }, { id: 'total', etiqueta: 'Total' }]} />
      <div className="grid grid-cols-2 gap-2.5">
        {resumen.indicadores.map((s) => (
          <div key={s.estado} className="rounded-[22px] p-4 bg-sup border border-white/[0.07] flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-[13px] text-suave"><span className="w-2 h-2 rounded-full" style={{ background: COLOR_ASISTENCIA[s.estado] }} />{s.etiqueta}</span>
            <div className="flex items-baseline gap-2"><span className="text-[30px] font-[850]" style={{ color: COLOR_ASISTENCIA[s.estado] }}>{Math.round(s.porcentaje)} %</span><span className="text-[13px] text-tenue">{s.cantidad} ses.</span></div>
            <Barra pct={s.porcentaje} color={COLOR_ASISTENCIA[s.estado]} alto={5} />
          </div>
        ))}
      </div>
      <div className="text-xs text-tenue px-1">{nota}</div>

      <div className="flex flex-col gap-2">
        <span className="kicker px-1">Sesiones de {nombreMes(mes).toLowerCase()}</span>
        {!lista.length && <div className="text-sm text-tenue px-1">No hay sesiones registradas en este mes.</div>}
        {lista.map((s, i) => {
          const c = COLOR_ASISTENCIA[s.estado];
          return (
            <div key={i} className="flex items-center gap-3.5 rounded-[20px] px-4 py-3 bg-sup border border-white/[0.07]">
              <div className="w-11 shrink-0 flex flex-col items-center leading-none"><span className="text-xl font-extrabold">{Number(s.fecha.slice(8))}</span><span className="text-[11px] text-tenue uppercase">{DIAS_CORTOS[diaSemana(s.fecha) - 1]}</span></div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5"><span className="text-sm font-semibold">{s.tipo}</span><span className="text-xs text-tenue truncate">{s.obs}</span></div>
              <span className="px-2.5 py-[5px] rounded-full text-xs font-bold" style={{ background: alfa(c, 0.15), color: c }}>{s.estado === 'cancelada' ? 'Cancelada' : ETIQUETA_ASISTENCIA[s.estado]}</span>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-tenue leading-normal px-1 pretty">Las excusas las registra el entrenador. Si tu hijo no puede asistir, avísale por WhatsApp.</div>
    </Pantalla>
  );
}
