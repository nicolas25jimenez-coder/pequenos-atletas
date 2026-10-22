import {
  Bell, CaretRight, FilePdf, FileText, MegaphoneSimple, SignOut, UserCircle, UserPlus, UsersThree, WhatsappLogo, type Icon,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { enlaceWhatsApp, iniciales } from '@pa/shared';
import { useConfiguracion } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { Avatar, COLOR, Titulo } from '../../ui/base';
import { Logo, Pantalla } from '../../ui/marco';
import { useFamilia } from './familia';

export function ItemMenu({ icono: I, titulo, sub, onClick, color = COLOR.azul, href }: { icono: Icon; titulo: string; sub?: string; onClick?: () => void; color?: string; href?: string }) {
  const contenido = (<>
    <span className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0" style={{ background: `${color}22`, color }}><I size={20} weight="bold" /></span>
    <span className="flex-1 min-w-0 flex flex-col"><span className="text-[15px] font-semibold">{titulo}</span>{sub && <span className="text-xs text-tenue">{sub}</span>}</span>
    <CaretRight weight="bold" className="text-apagado" />
  </>);
  const cls = 'flex items-center gap-3.5 px-4 py-3 bg-sup border border-white/[0.07] rounded-[20px] text-texto text-left cursor-pointer no-underline hover:bg-suph w-full';
  return href ? <a href={href} target="_blank" rel="noreferrer" className={cls}>{contenido}</a> : <button onClick={onClick} className={cls}>{contenido}</button>;
}

export function Mas() {
  const nav = useNavigate();
  const { perfil, salir } = useSesion();
  const config = useConfiguracion();
  const { ninos, solicitudes } = useFamilia();
  const hay = ninos.length > 0;

  return (
    <Pantalla className={hay ? '' : 'pb-10'}>
      <div className="flex items-center gap-3.5">
        <Avatar ini={iniciales(perfil?.nombres ?? '', perfil?.apellidos)} tam={56} />
        <div className="flex flex-col gap-0.5 min-w-0">
          <Titulo tam={22}>{perfil?.nombres} {perfil?.apellidos}</Titulo>
          <span className="text-[13px] text-tenue truncate">{perfil?.correo}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {hay && <ItemMenu icono={MegaphoneSimple} titulo="Anuncios" sub="Mensajes del entrenador" onClick={() => nav('/p/anuncios')} />}
        <ItemMenu icono={Bell} titulo="Notificaciones" onClick={() => nav('/p/notificaciones')} />
        <ItemMenu icono={UserPlus} titulo="Inscribir otro hijo" sub={solicitudes.some((s) => s.estado === 'pendiente_aprobacion') ? 'Tienes una inscripción pendiente' : undefined} color={COLOR.verde} onClick={() => nav('/p/inscribir')} />
        {hay && <ItemMenu icono={UsersThree} titulo="Invitar a otro acudiente" sub="Papá, mamá u otro familiar" onClick={() => nav('/p/invitar')} />}
        {hay && <ItemMenu icono={FilePdf} titulo="Descargar informe de progreso" sub="PDF con medidas, pruebas y asistencia" color={COLOR.ambar} onClick={() => nav('/p/informe')} />}
        <ItemMenu icono={UserCircle} titulo="Mi cuenta" sub="Datos, notificaciones y privacidad" onClick={() => nav('/p/cuenta')} />
        <ItemMenu icono={WhatsappLogo} titulo="Escribir al entrenador" color={COLOR.verde} href={enlaceWhatsApp(config.telefonoWhatsApp, 'Hola profe Nicolás, ')} />
        <ItemMenu icono={FileText} titulo="Términos y política de datos" color={COLOR.gris} onClick={() => nav('/terminos')} />
        <ItemMenu icono={SignOut} titulo="Cerrar sesión" color={COLOR.rojo} onClick={salir} />
      </div>
      <div className="mt-4 opacity-60"><Logo tam={14} /></div>
    </Pantalla>
  );
}
