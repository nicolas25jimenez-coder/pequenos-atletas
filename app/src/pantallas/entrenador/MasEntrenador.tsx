import {
  Bell, Barbell, CalendarStar, ChartBar, FlagPennant, GearSix, MegaphoneSimple, NotePencil, Ruler, SignOut, UserPlus, Wallet,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import type { SolicitudCambio } from '@pa/shared';
import { useColeccion } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { Avatar, COLOR, Titulo } from '../../ui/base';
import { Logo, Pantalla } from '../../ui/marco';
import { ItemMenu } from '../padre/Mas';
import { useEntrenador } from './contexto';

export function MasEntrenador() {
  const nav = useNavigate();
  const { perfil, salir } = useSesion();
  const { ninos } = useEntrenador();
  const sol = useColeccion<SolicitudCambio>('solicitudesCambio', [['estado', '==', 'pendiente']]);
  const pend = ninos.filter((n) => n.estado === 'pendiente_aprobacion').length;
  return (
    <Pantalla>
      <div className="flex items-center gap-3.5">
        <Avatar ini="NJ" tam={56} fondo={COLOR.verde} color={COLOR.tinta} />
        <div><Titulo tam={22}>{perfil?.nombres} {perfil?.apellidos}</Titulo><div className="text-[13px] text-tenue">Entrenador · administrador</div></div>
      </div>
      <div className="flex flex-col gap-2">
        <ItemMenu icono={UserPlus} titulo="Inscripciones" sub={pend ? `${pend} por aprobar` : 'Sin pendientes'} color={COLOR.verde} onClick={() => nav('/e/inscripciones')} />
        <ItemMenu icono={NotePencil} titulo="Solicitudes de cambio" sub={sol.datos.length ? `${sol.datos.length} pendientes` : 'Sin pendientes'} onClick={() => nav('/e/solicitudes')} />
        <ItemMenu icono={FlagPennant} titulo="Categorías y tarifas" onClick={() => nav('/e/categorias')} />
        <ItemMenu icono={Barbell} titulo="Catálogo de pruebas" sub="Pruebas, referencias y plantillas" color={COLOR.verde} onClick={() => nav('/e/pruebas')} />
        <ItemMenu icono={Ruler} titulo="Mediciones en lote" onClick={() => nav('/e/mediciones')} />
        <ItemMenu icono={CalendarStar} titulo="Eventos" color={COLOR.ambar} onClick={() => nav('/e/eventos')} />
        <ItemMenu icono={MegaphoneSimple} titulo="Anuncios" onClick={() => nav('/e/anuncios')} />
        <ItemMenu icono={Wallet} titulo="Medios de pago" onClick={() => nav('/e/medios-pago')} />
        <ItemMenu icono={ChartBar} titulo="Reportes" sub="Pagos, asistencia, PDF y Excel" color={COLOR.ambar} onClick={() => nav('/e/reportes')} />
        <ItemMenu icono={Bell} titulo="Notificaciones" onClick={() => nav('/e/notificaciones')} />
        <ItemMenu icono={GearSix} titulo="Configuración" color={COLOR.gris} onClick={() => nav('/e/configuracion')} />
        <ItemMenu icono={SignOut} titulo="Cerrar sesión" color={COLOR.rojo} onClick={salir} />
      </div>
      <div className="mt-4 opacity-60"><Logo tam={14} /></div>
    </Pantalla>
  );
}
