import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSesion } from './lib/sesion';
import { Boton, Cargando } from './ui/base';
import { Marco, Pantalla } from './ui/marco';
import { Ingresar } from './pantallas/acceso/Ingresar';
import { Registro } from './pantallas/acceso/Registro';
import { NuevaClave } from './pantallas/acceso/NuevaClave';
import { Recuperar } from './pantallas/acceso/Recuperar';
import { Splash } from './pantallas/acceso/Splash';
import { Terminos } from './pantallas/acceso/Terminos';
import { Verificar } from './pantallas/acceso/Verificar';

const AppPadre = lazy(() => import('./pantallas/padre/AppPadre'));
const AppEntrenador = lazy(() => import('./pantallas/entrenador/AppEntrenador'));

export function App() {
  const { usuario, perfil, cargando, salir } = useSesion();

  const { pathname } = useLocation();
  // Enlace del correo de recuperación: se atiende aparte, con o sin sesión.
  if (pathname === '/nueva-clave') return <Marco><NuevaClave /></Marco>;

  if (cargando) return <Marco><Splash /></Marco>;

  if (!usuario) {
    return (
      <Marco>
        <Routes>
          <Route path="/" element={<Splash auto />} />
          <Route path="/ingresar" element={<Ingresar />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar" element={<Recuperar />} />
          <Route path="/terminos" element={<Terminos />} />
          <Route path="*" element={<Navigate to="/ingresar" replace />} />
        </Routes>
      </Marco>
    );
  }

  if (!perfil) {
    return (
      <Marco>
        <Pantalla conNav={false}>
          <div className="titulo text-[26px] mt-16">No encontramos tu perfil</div>
          <p className="text-sm text-suave">Tu cuenta existe pero no tiene datos de acudiente. Vuelve a registrarte o contacta al entrenador.</p>
          <Boton variante="secundario" onClick={salir}>Cerrar sesión</Boton>
        </Pantalla>
      </Marco>
    );
  }

  if (perfil.rol === 'padre' && !usuario.emailVerified) {
    return <Marco><Routes><Route path="/terminos" element={<Terminos />} /><Route path="*" element={<Verificar />} /></Routes></Marco>;
  }

  const inicio = perfil.rol === 'entrenador' ? '/e' : '/p';
  return (
    <Suspense fallback={<Marco><Cargando /></Marco>}>
      <Routes>
        <Route path="/terminos" element={<Marco><Terminos /></Marco>} />
        {perfil.rol === 'padre' && <Route path="/p/*" element={<AppPadre />} />}
        {perfil.rol === 'entrenador' && <Route path="/e/*" element={<AppEntrenador />} />}
        <Route path="*" element={<Navigate to={inicio} replace />} />
      </Routes>
    </Suspense>
  );
}
