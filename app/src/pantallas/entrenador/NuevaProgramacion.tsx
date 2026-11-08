// "Nueva sesión": el entrenador elige si programa una sesión, un evento o un día de pruebas.
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Segmentado } from '../../ui/base';
import { FormEvento } from './EventosEntrenador';
import { FormSesion } from './FormSesion';

type Que = 'sesion' | 'evento' | 'pruebas';

export function NuevaProgramacion() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const que = (params.get('tipo') as Que) || 'sesion';
  const selector = (
    <Segmentado<Que> valor={que} onCambio={(t) => nav(`/e/sesiones/nueva?tipo=${t}`, { replace: true })}
      opciones={[{ id: 'sesion', etiqueta: 'Sesión' }, { id: 'evento', etiqueta: 'Evento' }, { id: 'pruebas', etiqueta: 'Día de pruebas' }]} />
  );
  if (que === 'evento') return <FormEvento key="evento" forzarNuevo selector={selector} />;
  return <FormSesion key={que} tipoInicial={que === 'pruebas' ? 'control' : 'entrenamiento'} selector={selector} />;
}
