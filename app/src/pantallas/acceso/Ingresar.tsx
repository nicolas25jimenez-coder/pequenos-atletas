import { ArrowRight, EnvelopeSimple, LockSimple } from '@phosphor-icons/react';
import { browserLocalPersistence, browserSessionPersistence, setPersistence, signInWithEmailAndPassword } from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../../lib/firebase';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, Interruptor } from '../../ui/base';
import { CabeceraAcceso } from './CabeceraAcceso';

export function Ingresar() {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await setPersistence(auth, recordar ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, correo.trim(), clave);
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  }

  return (
    <CabeceraAcceso>
      <div className="titulo text-[30px]">Bienvenido<br /><span className="text-verde">de vuelta.</span></div>
      <form onSubmit={enviar} className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-2.5">
          <Campo icono={<EnvelopeSimple weight="bold" />} type="email" autoComplete="email" placeholder="Correo electrónico" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          <Campo icono={<LockSimple weight="bold" />} type="password" autoComplete="current-password" placeholder="Contraseña" value={clave} onChange={(e) => setClave(e.target.value)} required />
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <Interruptor activo={recordar} onCambio={setRecordar}>Recordarme</Interruptor>
          <Link to="/recuperar" className="text-azul text-[13px] no-underline">¿Olvidaste tu contraseña?</Link>
        </div>
        {error && <Aviso tono="error">{error}</Aviso>}
        <Boton type="submit" alto="lg" cargando={enviando} className="uppercase tracking-[0.06em]">Ingresar <ArrowRight weight="bold" /></Boton>
      </form>
      <div className="text-center text-sm text-tenue">¿Primera vez? <Link to="/registro" className="text-verde font-bold no-underline">Crear cuenta</Link></div>
    </CabeceraAcceso>
  );
}
