import { useDocumento } from '../../lib/datos';
import { Volver } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { RUTA_PERFIL, VistaPerfil, type PerfilProfesional } from '../entrenador/PerfilEntrenador';

/** Perfil profesional del entrenador, de solo lectura para los padres. */
export function ConoceEntrenador() {
  const { datos } = useDocumento<PerfilProfesional>(RUTA_PERFIL);
  return (
    <Pantalla>
      <Volver a="/p/mas">Más</Volver>
      <VistaPerfil perfil={datos} nombre={datos?.nombre || 'Tu entrenador'} />
    </Pantalla>
  );
}
