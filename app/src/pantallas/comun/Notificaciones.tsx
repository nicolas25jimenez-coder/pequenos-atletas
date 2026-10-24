import { Bell, Checks } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { fechaCorta, hora12, hoy, type Notificacion } from '@pa/shared';
import { actualizar, lote, useColeccion } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { Boton, Vacio, Volver } from '../../ui/base';
import { Pantalla } from '../../ui/marco';

export function Notificaciones() {
  const nav = useNavigate();
  const { usuario, perfil } = useSesion();
  const { datos } = useColeccion<Notificacion>('notificaciones', [['usuarioId', '==', usuario?.uid ?? '']]);
  const lista = [...datos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const sinLeer = lista.filter((n) => !n.leida);
  const base = perfil?.rol === 'entrenador' ? '/e' : '/p';

  async function abrir(n: Notificacion) {
    if (!n.leida) await actualizar('notificaciones', n.id, { leida: true });
    if (n.enlace) nav(n.enlace);
  }
  async function leerTodas() {
    const b = lote();
    sinLeer.forEach((n) => b.actualizar('notificaciones', n.id, { leida: true }));
    await b.confirmar();
  }

  return (
    <Pantalla>
      <Volver a={base === '/e' ? '/e/mas' : '/p'}>Volver</Volver>
      <div className="flex justify-between items-end">
        <div className="titulo text-[30px]">Notificaciones</div>
        {sinLeer.length > 0 && <Boton variante="fantasma" onClick={leerTodas} icono={<Checks weight="bold" />}>Marcar leídas</Boton>}
      </div>
      {!lista.length && <Vacio icono={<Bell />} titulo="Sin notificaciones" />}
      <div className="flex flex-col gap-2">
        {lista.map((n) => (
          <button key={n.id} onClick={() => abrir(n)} className="text-left flex gap-3 rounded-[20px] px-4 py-3.5 bg-sup border border-white/[0.07] text-texto cursor-pointer hover:bg-suph">
            <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.leida ? 'transparent' : '#3DDC6A' }} />
            <span className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="flex justify-between gap-3"><span className={`text-sm ${n.leida ? 'font-semibold text-suave' : 'font-bold'}`}>{n.titulo}</span>
                <span className="text-[11px] text-tenue shrink-0">{n.fecha.slice(0, 10) === hoy() ? hora12(n.fecha.slice(11, 16)) : fechaCorta(n.fecha.slice(0, 10))}</span></span>
              <span className="text-[13px] text-suave leading-snug">{n.cuerpo}</span>
            </span>
          </button>
        ))}
      </div>
    </Pantalla>
  );
}
