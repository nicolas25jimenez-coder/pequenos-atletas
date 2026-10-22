import { CalendarBlank, DotsThreeOutline, Lightning, UsersThree, Wallet } from '@phosphor-icons/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Cargando } from '../../ui/base';
import { BarraNav, Marco } from '../../ui/marco';
import { Notificaciones } from '../comun/Notificaciones';
import { ProveedorEntrenador, useEntrenador } from './contexto';
import { Panel } from './Panel';
import { Sesiones } from './Sesiones';
import { FormSesion } from './FormSesion';
import { DetalleSesion } from './DetalleSesion';
import { TomarAsistencia } from './TomarAsistencia';
import { Captura } from './Captura';
import { Mediciones } from './Mediciones';
import { Ninos } from './Ninos';
import { FichaNino } from './FichaNino';
import { FormNino } from './FormNino';
import { Inscripciones, RevisarInscripcion } from './Inscripciones';
import { Solicitudes } from './Solicitudes';
import { Categorias, FormCategoria } from './Categorias';
import { PagosEntrenador } from './PagosEntrenador';
import { MediosPago } from './MediosPago';
import { Catalogo, FormPrueba, Plantillas } from './Catalogo';
import { EventosEntrenador, FormEvento } from './EventosEntrenador';
import { AnunciosEntrenador, FormAnuncio } from './AnunciosEntrenador';
import { Reportes } from './Reportes';
import { Configuracion } from './Configuracion';
import { MasEntrenador } from './MasEntrenador';

const NAV = [
  { a: '/e', etiqueta: 'Hoy', icono: Lightning, fin: true },
  { a: '/e/sesiones', etiqueta: 'Sesiones', icono: CalendarBlank },
  { a: '/e/ninos', etiqueta: 'Niños', icono: UsersThree },
  { a: '/e/pagos', etiqueta: 'Pagos', icono: Wallet },
  { a: '/e/mas', etiqueta: 'Más', icono: DotsThreeOutline },
];

function Rutas() {
  const { cargando } = useEntrenador();
  if (cargando) return <Cargando />;
  return (
    <>
      <Routes>
        <Route index element={<Panel />} />
        <Route path="sesiones" element={<Sesiones />} />
        <Route path="sesiones/nueva" element={<FormSesion />} />
        <Route path="sesion/:id" element={<DetalleSesion />} />
        <Route path="sesion/:id/editar" element={<FormSesion />} />
        <Route path="sesion/:id/asistencia" element={<TomarAsistencia />} />
        <Route path="sesion/:id/captura" element={<Captura />} />
        <Route path="sesion/:id/mediciones" element={<Mediciones />} />
        <Route path="mediciones" element={<Mediciones />} />
        <Route path="ninos" element={<Ninos />} />
        <Route path="ninos/nuevo" element={<FormNino />} />
        <Route path="nino/:id/editar" element={<FormNino />} />
        <Route path="nino/:id/*" element={<FichaNino />} />
        <Route path="inscripciones" element={<Inscripciones />} />
        <Route path="inscripciones/:id" element={<RevisarInscripcion />} />
        <Route path="solicitudes" element={<Solicitudes />} />
        <Route path="categorias" element={<Categorias />} />
        <Route path="categorias/:id" element={<FormCategoria />} />
        <Route path="pagos" element={<PagosEntrenador />} />
        <Route path="medios-pago" element={<MediosPago />} />
        <Route path="pruebas" element={<Catalogo />} />
        <Route path="pruebas/:id" element={<FormPrueba />} />
        <Route path="plantillas" element={<Plantillas />} />
        <Route path="eventos" element={<EventosEntrenador />} />
        <Route path="eventos/:id" element={<FormEvento />} />
        <Route path="anuncios" element={<AnunciosEntrenador />} />
        <Route path="anuncios/:id" element={<FormAnuncio />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="configuracion" element={<Configuracion />} />
        <Route path="notificaciones" element={<Notificaciones />} />
        <Route path="mas" element={<MasEntrenador />} />
        <Route path="*" element={<Navigate to="/e" replace />} />
      </Routes>
      <BarraNav items={NAV} />
    </>
  );
}

export default function AppEntrenador() {
  return (
    <Marco>
      <ProveedorEntrenador>
        <Rutas />
      </ProveedorEntrenador>
    </Marco>
  );
}
