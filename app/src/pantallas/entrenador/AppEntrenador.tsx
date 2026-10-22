import { useSesion } from '../../lib/sesion';
import { Boton } from '../../ui/base';
import { Marco, Pantalla } from '../../ui/marco';

export default function AppEntrenador() {
  const { salir } = useSesion();
  return <Marco><Pantalla><div className="titulo text-3xl">Entrenador</div><Boton onClick={salir}>Salir</Boton></Pantalla></Marco>;
}
