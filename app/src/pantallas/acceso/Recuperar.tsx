import { EnvelopeSimple } from '@phosphor-icons/react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo } from '../../ui/base';
import { CabeceraAcceso } from './CabeceraAcceso';

export function Recuperar() {
  const [correo, setCorreo] = useState('');
  const [listo, setListo] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try { await sendPasswordResetEmail(auth, correo.trim()); setListo(true); }
    catch (err) { setError(mensajeError(err)); }
    setEnviando(false);
  }

  return (
    <CabeceraAcceso>
      <div className="titulo text-[30px]">Recupera tu<br /><span className="text-verde">contraseña.</span></div>
      {listo ? (
        <Aviso tono="exito">Si existe una cuenta con <b>{correo}</b>, te llegará un correo con el enlace para crear una nueva contraseña.</Aviso>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-[18px]">
          <Campo icono={<EnvelopeSimple weight="bold" />} type="email" placeholder="Correo electrónico" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          {error && <Aviso tono="error">{error}</Aviso>}
          <Boton type="submit" alto="lg" cargando={enviando}>Enviar enlace</Boton>
        </form>
      )}
      <div className="text-center text-sm text-tenue"><Link to="/ingresar" className="text-verde font-bold no-underline">Volver a iniciar sesión</Link></div>
    </CabeceraAcceso>
  );
}
