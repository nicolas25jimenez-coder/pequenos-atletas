import { HourglassMedium, UserPlus, XCircle } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { fechaCorta } from '@pa/shared';
import { useSesion } from '../../lib/sesion';
import { Boton, Tarjeta } from '../../ui/base';
import { Logo, Pantalla } from '../../ui/marco';
import { useFamilia } from './familia';

/** Inicio del acudiente cuando todavía no tiene hijos aprobados. */
export function SinHijos() {
  const nav = useNavigate();
  const { perfil, salir } = useSesion();
  const { solicitudes } = useFamilia();
  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente_aprobacion');
  const rechazadas = solicitudes.filter((s) => s.estado === 'rechazado');

  return (
    <Pantalla conNav={false} className="pt-14 gap-5">
      <Logo tam={18} />
      <div className="titulo text-[30px]">Hola,<br /><span className="text-verde">{perfil?.nombres.split(' ')[0]}.</span></div>
      {!solicitudes.length && <p className="text-[15px] text-suave leading-normal pretty">Inscribe a tu hijo para empezar. El entrenador revisará la inscripción y le asignará una categoría.</p>}
      {pendientes.map((n) => (
        <Tarjeta key={n.id}>
          <div className="flex items-center gap-3"><HourglassMedium size={26} weight="bold" className="text-ambar" />
            <div><div className="font-bold">{n.nombres} {n.apellidos}</div><div className="text-[13px] text-tenue">Inscripción enviada el {fechaCorta(n.creadoEn?.slice(0, 10))} · pendiente de aprobación</div></div>
          </div>
          <div className="text-[13px] text-suave">Te avisaremos con una notificación cuando el entrenador la apruebe.</div>
        </Tarjeta>
      ))}
      {rechazadas.map((n) => (
        <Tarjeta key={n.id}>
          <div className="flex items-center gap-3"><XCircle size={26} weight="bold" className="text-rojo" />
            <div><div className="font-bold">{n.nombres} {n.apellidos}</div><div className="text-[13px] text-tenue">Inscripción no aprobada</div></div>
          </div>
          {n.motivoRechazo && <div className="text-[13px] text-suave">Motivo: {n.motivoRechazo}</div>}
        </Tarjeta>
      ))}
      <Boton alto="lg" icono={<UserPlus weight="bold" size={20} />} onClick={() => nav('/p/inscribir')}>{solicitudes.length ? 'Inscribir otro hijo' : 'Inscribir a mi hijo'}</Boton>
      <Boton variante="secundario" onClick={() => nav('/p/mas')}>Mi cuenta y más opciones</Boton>
      <Boton variante="fantasma" className="self-center text-tenue" onClick={salir}>Cerrar sesión</Boton>
    </Pantalla>
  );
}
