import { LockSimple } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { actualizarClave, useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, Cargando } from '../../ui/base';
import { CabeceraAcceso } from './CabeceraAcceso';

/** Pantalla a la que llega el enlace del correo de "olvidé mi contraseña" (/nueva-clave). */
export function NuevaClave() {
  const { usuario, cargando } = useSesion();
  const nav = useNavigate();
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (clave !== repetir) return setError('Las contraseñas no coinciden.');
    setEnviando(true);
    try { await actualizarClave(clave); setListo(true); }
    catch (err) { setError(mensajeError(err)); }
    setEnviando(false);
  }

  if (cargando) return <Cargando />;

  return (
    <CabeceraAcceso>
      <div className="titulo text-[30px]">Crea tu nueva<br /><span className="text-verde">contraseña.</span></div>
      {listo ? (
        <>
          <Aviso tono="exito">Listo, tu contraseña se cambió.</Aviso>
          <Boton alto="lg" onClick={() => nav('/', { replace: true })}>Continuar</Boton>
        </>
      ) : !usuario ? (
        <>
          <Aviso tono="error">Este enlace ya venció o no es válido. Pide uno nuevo.</Aviso>
          <div className="text-center text-sm text-tenue"><Link to="/recuperar" className="text-verde font-bold no-underline">Pedir otro enlace</Link></div>
        </>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-2.5">
            <Campo icono={<LockSimple weight="bold" />} type="password" autoComplete="new-password" placeholder="Nueva contraseña (mín. 8 caracteres)" value={clave} onChange={(e) => setClave(e.target.value)} required />
            <Campo icono={<LockSimple weight="bold" />} type="password" autoComplete="new-password" placeholder="Repite la contraseña" value={repetir} onChange={(e) => setRepetir(e.target.value)} required />
          </div>
          {error && <Aviso tono="error">{error}</Aviso>}
          <Boton type="submit" alto="lg" cargando={enviando}>Guardar contraseña</Boton>
        </form>
      )}
    </CabeceraAcceso>
  );
}
