import { CalendarPlus, CaretRight, Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  aFecha, ahoraIso, DIAS_CORTOS, diaSemana, hora12, hoy, nombreMes, sumarMeses, ultimoDiaMes, type Sesion,
} from '@pa/shared';
import { lote, obtener, useColeccion } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import { alfa, Boton, Chips, COLOR, Encabezado, Hoja, Segmentado, Selector, Etiqueta, Vacio, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useEntrenador } from './contexto';

type Vista = 'proximas' | 'pasadas';

export function Sesiones() {
  const nav = useNavigate();
  const { categorias, catPorId } = useEntrenador();
  const [vista, setVista] = useState<Vista>('proximas');
  const [cat, setCat] = useState('todas');
  const [generar, setGenerar] = useState(false);
  const hoyF = hoy();
  const filtro: [string, '>=' | '<', string][] = [['fecha', vista === 'proximas' ? '>=' : '<', hoyF]];
  const { datos, cargando } = useColeccion<Sesion>('sesiones', filtro);
  const lista = datos.filter((s) => cat === 'todas' || s.categoriaId === cat)
    .sort((a, b) => (vista === 'proximas' ? 1 : -1) * (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio))
    .slice(0, vista === 'proximas' ? 60 : 80);

  // Agrupar por mes
  const grupos = new Map<string, Sesion[]>();
  for (const s of lista) (grupos.get(s.fecha.slice(0, 7)) ?? grupos.set(s.fecha.slice(0, 7), []).get(s.fecha.slice(0, 7))!).push(s);

  return (
    <Pantalla>
      <Encabezado titulo="Sesiones" derecha={<Boton alto="sm" icono={<Plus weight="bold" />} onClick={() => nav('/e/sesiones/nueva')}>Nueva</Boton>} />
      <Segmentado<Vista> valor={vista} onCambio={setVista} opciones={[{ id: 'proximas', etiqueta: 'Próximas' }, { id: 'pasadas', etiqueta: 'Pasadas' }]} />
      <Chips valor={cat} onCambio={setCat} opciones={[{ id: 'todas', etiqueta: 'Todas' }, ...categorias.filter((c) => c.activa).map((c) => ({ id: c.id, etiqueta: c.nombre }))]} />
      {vista === 'proximas' && <Boton variante="punteado" className="h-12" icono={<CalendarPlus weight="bold" />} onClick={() => setGenerar(true)}>Generar sesiones del mes desde los horarios</Boton>}
      {!cargando && !lista.length && <Vacio titulo={vista === 'proximas' ? 'No hay sesiones programadas' : 'No hay sesiones pasadas'} />}
      {[...grupos].map(([mes, ses]) => (
        <div key={mes} className="flex flex-col gap-2">
          <span className="kicker px-1">{nombreMes(mes, true)}</span>
          {ses.map((s) => <FilaSesion key={s.id} s={s} cat={catPorId.get(s.categoriaId)?.nombre ?? s.categoriaId} onClick={() => nav(`/e/sesion/${s.id}`)} />)}
        </div>
      ))}
      <GenerarMes abierta={generar} onCerrar={() => setGenerar(false)} />
    </Pantalla>
  );
}

export function FilaSesion({ s, cat, onClick }: { s: Sesion; cat: string; onClick: () => void }) {
  const control = s.tipo === 'control';
  const estado = s.estado === 'cancelada' ? { t: 'Cancelada', c: COLOR.gris } : s.asistenciaGuardada ? { t: 'Asistencia ✓', c: COLOR.verde } : s.fecha < hoy() ? { t: 'Sin asistencia', c: COLOR.ambar } : s.fecha === hoy() ? { t: 'Hoy', c: COLOR.verde } : null;
  return (
    <button onClick={onClick} className="flex items-center gap-3.5 rounded-[20px] px-4 py-3 bg-sup border border-white/[0.07] text-texto text-left cursor-pointer hover:bg-suph">
      <div className="w-11 shrink-0 flex flex-col items-center leading-none"><span className="text-xl font-extrabold">{Number(s.fecha.slice(8))}</span><span className="text-[11px] text-tenue uppercase">{DIAS_CORTOS[diaSemana(s.fecha) - 1]}</span></div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-semibold"><span style={{ color: control ? COLOR.azul : undefined }}>{control ? 'Control' : 'Entrenamiento'}</span> · {cat}</span>
        <span className="text-xs text-tenue truncate">{hora12(s.horaInicio)} · {s.tema || s.lugar}</span>
      </div>
      {estado && <span className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap" style={{ background: alfa(estado.c, 0.15), color: estado.c }}>{estado.t}</span>}
      <CaretRight weight="bold" className="text-apagado shrink-0" />
    </button>
  );
}

function GenerarMes({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const { usuario } = useSesion();
  const toast = useToast();
  const { categorias } = useEntrenador();
  const [mes, setMes] = useState(hoy().slice(0, 7));
  const [ocupado, setOcupado] = useState(false);

  async function generar() {
    if (!usuario) return;
    setOcupado(true);
    try {
      const [y, m] = mes.split('-').map(Number);
      const batch = lote();
      let n = 0;
      for (const c of categorias.filter((x) => x.activa)) {
        for (let d = 1; d <= ultimoDiaMes(y, m); d++) {
          const f = aFecha(y, m, d);
          if (f < hoy()) continue;
          for (const h of c.horarios.filter((x) => x.diaSemana === diaSemana(f))) {
            const id = `${c.id}_${f}${c.horarios.filter((x) => x.diaSemana === h.diaSemana).length > 1 ? `_${h.horaInicio.replace(':', '')}` : ''}`;
            if (await obtener('sesiones', id)) continue;
            const s: Sesion = { id, tipo: 'entrenamiento', categoriaId: c.id, fecha: f, horaInicio: h.horaInicio, horaFin: h.horaFin, lugar: h.lugar, pruebasSeleccionadas: [], estado: 'programada', creadoEn: ahoraIso(), actualizadoEn: ahoraIso(), creadoPor: usuario.uid };
            batch.guardar('sesiones', s);
            n++;
          }
        }
      }
      await batch.confirmar();
      toast(n ? `${n} sesiones creadas para ${nombreMes(mes).toLowerCase()}` : 'Ya estaban todas las sesiones del mes');
      onCerrar();
    } catch (e) { toast(mensajeError(e), 'error'); }
    setOcupado(false);
  }

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Generar sesiones" sub="Crea los entrenamientos según el horario de cada categoría. No duplica los que ya existen.">
      <Etiqueta texto="Mes">
        <Selector value={mes} onChange={(e) => setMes(e.target.value)}>
          {[0, 1, 2].map((i) => { const p = sumarMeses(hoy().slice(0, 7), i); return <option key={p} value={p}>{nombreMes(p, true)}</option>; })}
        </Selector>
      </Etiqueta>
      <Boton onClick={generar} cargando={ocupado}>Generar</Boton>
    </Hoja>
  );
}
