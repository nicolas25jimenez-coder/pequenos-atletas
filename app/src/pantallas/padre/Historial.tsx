// Línea de tiempo con todo lo realizado (RF-P18), filtrable por tipo y fechas.
import { Barbell, CalendarCheck, Ruler, Timer, XCircle } from '@phosphor-icons/react';
import { useMemo, useState, type ReactNode } from 'react';
import { ETIQUETA_ASISTENCIA, fechaCorta, formatoValor, hoy, num, sumarDias } from '@pa/shared';
import { COLOR_ASISTENCIA } from '../../lib/estilos';
import { Chips, COLOR, Vacio } from '../../ui/base';
import { useFamilia } from './familia';

type Tipo = 'todo' | 'sesiones' | 'controles' | 'mediciones';
type Rango = '30' | '90' | '365' | 'todo';

interface Item { fecha: string; orden: number; tipo: Exclude<Tipo, 'todo'>; icono: ReactNode; color: string; titulo: string; detalle: string }

export function Historial() {
  const { asistencias, sesiones, mediciones, resultados, pruebas } = useFamilia();
  const [tipo, setTipo] = useState<Tipo>('todo');
  const [rango, setRango] = useState<Rango>('90');

  const items = useMemo(() => {
    const out: Item[] = [];
    const sesionPorId = new Map(sesiones.map((s) => [s.id, s]));
    for (const a of asistencias) {
      const s = sesionPorId.get(a.sesionId);
      const control = a.tipoSesion === 'control';
      out.push({
        fecha: a.fecha, orden: 1, tipo: control ? 'controles' : 'sesiones',
        icono: control ? <Timer weight="bold" /> : <CalendarCheck weight="bold" />, color: COLOR_ASISTENCIA[a.estado],
        titulo: `${control ? 'Día de control' : 'Entrenamiento'} · ${ETIQUETA_ASISTENCIA[a.estado]}`,
        detalle: [s?.tema, a.observacion].filter(Boolean).join(' · ') || '—',
      });
    }
    for (const s of sesiones.filter((x) => x.estado === 'cancelada')) {
      out.push({ fecha: s.fecha, orden: 1, tipo: 'sesiones', icono: <XCircle weight="bold" />, color: COLOR.gris, titulo: 'Sesión cancelada', detalle: s.motivoCancelacion ?? '' });
    }
    for (const m of mediciones) {
      out.push({ fecha: m.fecha, orden: 2, tipo: 'mediciones', icono: <Ruler weight="bold" />, color: COLOR.azul, titulo: 'Medición física', detalle: `Talla ${num(m.tallaCm)} cm · Peso ${num(m.pesoKg)} kg · IMC ${num(m.imc)}` });
    }
    const porFecha = new Map<string, string[]>();
    for (const r of resultados) {
      const p = pruebas.get(r.pruebaId);
      if (!p) continue;
      const v = r.noRealizada ? 'no realizó' : `${formatoValor(p, r.valorFinal)}${p.tipoResultado === 'cualitativa' ? '' : ' ' + p.unidad}`;
      (porFecha.get(r.fecha) ?? porFecha.set(r.fecha, []).get(r.fecha)!).push(`${p.nombre}: ${v}`);
    }
    for (const [f, lista] of porFecha) {
      out.push({ fecha: f, orden: 3, tipo: 'controles', icono: <Barbell weight="bold" />, color: COLOR.verde, titulo: `${lista.length} pruebas motrices`, detalle: lista.join(' · ') });
    }
    return out.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.orden - a.orden);
  }, [asistencias, sesiones, mediciones, resultados, pruebas]);

  const desde = rango === 'todo' ? '0000' : sumarDias(hoy(), -Number(rango));
  const visibles = items.filter((i) => i.fecha >= desde && i.fecha <= hoy() && (tipo === 'todo' || i.tipo === tipo));

  return (<>
    <Chips<Tipo> valor={tipo} onCambio={setTipo} opciones={[{ id: 'todo', etiqueta: 'Todo' }, { id: 'sesiones', etiqueta: 'Entrenamientos' }, { id: 'controles', etiqueta: 'Días de control' }, { id: 'mediciones', etiqueta: 'Mediciones' }]} />
    <Chips<Rango> valor={rango} onCambio={setRango} opciones={[{ id: '30', etiqueta: '30 días' }, { id: '90', etiqueta: '3 meses' }, { id: '365', etiqueta: '1 año' }, { id: 'todo', etiqueta: 'Todo' }]} />
    {!visibles.length && <Vacio titulo="Nada en este periodo" />}
    <div className="flex flex-col">
      {visibles.map((i, k) => (
        <div key={k} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${i.color}22`, color: i.color }}>{i.icono}</span>
            {k < visibles.length - 1 && <span className="w-px flex-1 bg-white/10 my-1" />}
          </div>
          <div className="flex-1 min-w-0 pb-4">
            <div className="text-xs text-tenue">{fechaCorta(i.fecha)}</div>
            <div className="text-sm font-bold">{i.titulo}</div>
            <div className="text-[13px] text-suave leading-snug break-words">{i.detalle}</div>
          </div>
        </div>
      ))}
    </div>
  </>);
}
