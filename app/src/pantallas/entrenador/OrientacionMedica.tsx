// Quién usó el botón "Orientación médica" y con qué frecuencia.
import { useMemo, useState } from 'react';
import { fechaCorta, hora12 } from '@pa/shared';
import { useColeccion } from '../../lib/datos';
import { Kicker, Segmentado, Tarjeta, Vacio, Volver } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import type { OrientacionMedica as Registro } from '../padre/Orientacion';
import { nombreNino, useEntrenador } from './contexto';

interface UsuarioMin { id: string; nombres: string; apellidos: string }

export function OrientacionMedica() {
  const { porId } = useEntrenador();
  const regs = useColeccion<Registro>('orientacionesMedicas');
  const usuarios = useColeccion<UsuarioMin>('usuarios');
  const [vista, setVista] = useState<'resumen' | 'historial'>('resumen');
  const nombrePadre = (id: string) => { const u = usuarios.datos.find((x) => x.id === id); return u ? `${u.nombres} ${u.apellidos}`.trim() : 'Acudiente'; };

  const orden = useMemo(() => [...regs.datos].sort((a, b) => b.fecha.localeCompare(a.fecha)), [regs.datos]);
  const porPadre = useMemo(() => {
    const m = new Map<string, Registro[]>();
    for (const r of orden) m.set(r.usuarioId, [...(m.get(r.usuarioId) ?? []), r]);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [orden]);
  const esteMes = orden.filter((r) => r.fecha.slice(0, 7) === new Date().toISOString().slice(0, 7)).length;

  return (
    <Pantalla>
      <Volver a="/e/mas">Más</Volver>
      <div className="titulo text-[28px]">Orientación médica</div>
      <div className="text-[13px] text-tenue">Cada vez que un padre toca el botón de Orientación médica queda aquí.</div>
      <div className="grid grid-cols-2 gap-2.5">
        <Tarjeta className="gap-1 !p-4"><span className="text-[28px] font-[850] leading-none text-rojo">{orden.length}</span><span className="text-[13px]">Usos en total</span></Tarjeta>
        <Tarjeta className="gap-1 !p-4"><span className="text-[28px] font-[850] leading-none text-ambar">{esteMes}</span><span className="text-[13px]">Este mes</span></Tarjeta>
      </div>
      <Segmentado valor={vista} onCambio={setVista} opciones={[{ id: 'resumen', etiqueta: 'Por padre' }, { id: 'historial', etiqueta: 'Historial' }]} />
      {!orden.length && !regs.cargando && <Vacio titulo="Nadie la ha usado todavía" texto="Cuando un padre use el botón, lo verás aquí y en la campanita." />}
      {vista === 'resumen' && porPadre.map(([uid, lista]) => {
        const hijos = [...new Set(lista.map((r) => r.ninoId))].map((id) => porId.get(id)).filter(Boolean);
        return (
          <Tarjeta key={uid} className="gap-1.5">
            <div className="flex justify-between items-baseline"><span className="text-[16px] font-bold">{nombrePadre(uid)}</span><span className="text-sm font-bold text-rojo">{lista.length} {lista.length === 1 ? 'vez' : 'veces'}</span></div>
            <div className="text-xs text-tenue">{hijos.map((n) => nombreNino(n!)).join(', ')} · última: {fechaCorta(lista[0].fecha.slice(0, 10))}</div>
            <div className="text-xs text-suave">{[...new Set(lista.map((r) => r.motivo))].join(' · ')}</div>
          </Tarjeta>
        );
      })}
      {vista === 'historial' && (<>
        {orden.length > 0 && <Kicker>Más recientes primero</Kicker>}
        {orden.map((r) => {
          const n = porId.get(r.ninoId);
          return (
            <Tarjeta key={r.id} className="gap-1">
              <div className="flex justify-between"><span className="text-[15px] font-bold">{nombrePadre(r.usuarioId)}</span><span className="text-xs text-tenue">{fechaCorta(r.fecha.slice(0, 10))} · {hora12(r.fecha.slice(11, 16))}</span></div>
              <div className="text-sm text-suave">{n ? nombreNino(n) : 'Niño'} · {r.motivo}</div>
            </Tarjeta>
          );
        })}
      </>)}
    </Pantalla>
  );
}
