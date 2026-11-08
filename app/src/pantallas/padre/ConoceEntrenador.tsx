import { CaretDown } from '@phosphor-icons/react';
import { useState } from 'react';
import { iniciales } from '@pa/shared';
import { useDocumento } from '../../lib/datos';
import { Avatar, COLOR, Tarjeta, Volver } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useFoto } from '../comun/useFoto';
import { RUTA_PERFIL, VistaPerfil, type PerfilProfesional } from '../entrenador/PerfilEntrenador';

/** Tarjeta plegable con el perfil del entrenador (solo lectura), para la pantalla de Eventos. */
export function TarjetaEntrenador() {
  const { datos } = useDocumento<PerfilProfesional>(RUTA_PERFIL);
  const [abierta, setAbierta] = useState(false);
  const foto = useFoto(datos?.fotoRuta);
  const nombre = datos?.nombre || 'Tu entrenador';
  return (
    <Tarjeta className="gap-3.5">
      <button onClick={() => setAbierta(!abierta)} aria-expanded={abierta} className="flex items-center gap-3 bg-transparent border-0 p-0 text-texto text-left cursor-pointer w-full">
        <Avatar ini={iniciales(nombre, '')} tam={48} fondo={COLOR.verde} color={COLOR.tinta} foto={foto} />
        <span className="flex-1 min-w-0 flex flex-col"><span className="text-[15px] font-bold">{nombre}</span><span className="text-xs text-tenue">{datos?.titulo || 'Conoce a tu entrenador'}</span></span>
        <CaretDown weight="bold" className={`text-tenue transition-transform ${abierta ? 'rotate-180' : ''}`} />
      </button>
      {abierta && <VistaPerfil perfil={datos} nombre={nombre} />}
    </Tarjeta>
  );
}

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
