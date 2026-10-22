import { Baby, CalendarCheck, FlagBanner, House, Wallet } from '@phosphor-icons/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Cargando } from '../../ui/base';
import { BarraNav, Marco } from '../../ui/marco';
import { ProveedorFamilia, useFamilia } from './familia';
import { Inicio } from './Inicio';
import { MiHijo } from './MiHijo';
import { DetallePrueba } from './DetallePrueba';
import { Asistencia } from './Asistencia';
import { Pagos } from './Pagos';
import { Eventos } from './Eventos';
import { Mas } from './Mas';
import { Anuncios } from './Anuncios';
import { Notificaciones } from '../comun/Notificaciones';
import { Inscribir } from './Inscribir';
import { Invitar } from './Invitar';
import { Cuenta } from './Cuenta';
import { Informe } from './Informe';
import { SinHijos } from './SinHijos';

const NAV = [
  { a: '/p', etiqueta: 'Inicio', icono: House, fin: true },
  { a: '/p/hijo', etiqueta: 'Mi hijo', icono: Baby },
  { a: '/p/asistencia', etiqueta: 'Asistencia', icono: CalendarCheck },
  { a: '/p/pagos', etiqueta: 'Pagos', icono: Wallet },
  { a: '/p/eventos', etiqueta: 'Eventos', icono: FlagBanner },
];

function Rutas() {
  const { ninos, cargando } = useFamilia();
  if (cargando) return <Cargando />;
  const conHijos = ninos.length > 0;
  return (
    <>
      <Routes>
        <Route path="inscribir" element={<Inscribir />} />
        <Route path="mas" element={<Mas />} />
        <Route path="notificaciones" element={<Notificaciones />} />
        <Route path="cuenta" element={<Cuenta />} />
        {conHijos ? (<>
          <Route index element={<Inicio />} />
          <Route path="hijo" element={<MiHijo />} />
          <Route path="hijo/:tab" element={<MiHijo />} />
          <Route path="prueba/:pruebaId" element={<DetallePrueba />} />
          <Route path="asistencia" element={<Asistencia />} />
          <Route path="pagos" element={<Pagos />} />
          <Route path="eventos" element={<Eventos />} />
          <Route path="anuncios" element={<Anuncios />} />
          <Route path="invitar" element={<Invitar />} />
          <Route path="informe" element={<Informe />} />
        </>) : <Route index element={<SinHijos />} />}
        <Route path="*" element={<Navigate to="/p" replace />} />
      </Routes>
      {conHijos && <BarraNav items={NAV} />}
    </>
  );
}

export default function AppPadre() {
  return (
    <Marco>
      <ProveedorFamilia>
        <Rutas />
      </ProveedorFamilia>
    </Marco>
  );
}
