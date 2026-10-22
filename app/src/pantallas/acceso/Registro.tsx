import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ahoraIso, CONFIG_POR_DEFECTO, normalizarCorreo, type Parentesco, type Usuario } from '@pa/shared';
import { auth, db } from '../../lib/firebase';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, Casilla, Selector } from '../../ui/base';
import { CabeceraAcceso } from './CabeceraAcceso';

export const PARENTESCOS: Parentesco[] = ['Madre', 'Padre', 'Abuelo/a', 'Tío/a', 'Otro'];

export function Registro() {
  const [f, setF] = useState({ nombres: '', apellidos: '', correo: '', telefono: '', parentesco: '', tipoDocumento: 'CC', numeroDocumento: '', clave: '' });
  const [terminos, setTerminos] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!f.parentesco) return setError('Selecciona tu parentesco con el niño.');
    if (f.clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (!/^\+?[\d\s]{10,15}$/.test(f.telefono.trim())) return setError('Escribe un teléfono válido, por ejemplo 310 555 0148.');
    if (!terminos) return setError('Debes aceptar los Términos y la Política de Tratamiento de Datos.');
    setEnviando(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, normalizarCorreo(f.correo), f.clave);
      await updateProfile(cred.user, { displayName: `${f.nombres} ${f.apellidos}`.trim() });
      const t = ahoraIso();
      const tel = f.telefono.replace(/\D/g, '');
      const usuario: Omit<Usuario, 'id'> = {
        rol: 'padre', estado: 'activo',
        nombres: f.nombres.trim(), apellidos: f.apellidos.trim(),
        correo: normalizarCorreo(f.correo),
        telefono: tel.startsWith('57') && tel.length === 12 ? `+${tel}` : `+57${tel}`,
        parentesco: f.parentesco as Parentesco,
        tipoDocumento: f.tipoDocumento, numeroDocumento: f.numeroDocumento.trim(),
        aceptoTerminos: { fecha: t, version: CONFIG_POR_DEFECTO.versionTerminos },
        preferenciasNotificacion: { pagoRegistrado: true, inasistencia: true, resultados: true, eventos: true, solicitudes: true },
        creadoEn: t, actualizadoEn: t, creadoPor: cred.user.uid,
      };
      await setDoc(doc(db, 'usuarios', cred.user.uid), usuario);
      await sendEmailVerification(cred.user);
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  }

  return (
    <CabeceraAcceso>
      <div className="titulo text-[30px]">Crea tu<br /><span className="text-verde">cuenta.</span></div>
      <div className="text-[13px] text-tenue leading-normal -mt-2">Regístrate como acudiente. Luego inscribes a tu hijo y el entrenador aprueba la inscripción.</div>
      <form onSubmit={enviar} className="flex flex-col gap-[18px]">
        <div className="grid grid-cols-2 gap-2.5">
          <Campo placeholder="Nombres" value={f.nombres} onChange={set('nombres')} required autoComplete="given-name" />
          <Campo placeholder="Apellidos" value={f.apellidos} onChange={set('apellidos')} required autoComplete="family-name" />
          <Campo className="col-span-2" type="email" placeholder="Correo electrónico" value={f.correo} onChange={set('correo')} required autoComplete="email" />
          <Campo type="tel" placeholder="+57 Teléfono" value={f.telefono} onChange={set('telefono')} required autoComplete="tel" />
          <Selector value={f.parentesco} onChange={set('parentesco')} className={f.parentesco ? '' : 'text-suave'}>
            <option value="">Parentesco</option>
            {PARENTESCOS.map((p) => <option key={p}>{p}</option>)}
          </Selector>
          <Selector value={f.tipoDocumento} onChange={set('tipoDocumento')}>
            <option value="CC">CC</option><option value="CE">CE</option><option value="PA">Pasaporte</option><option value="PPT">PPT</option>
          </Selector>
          <Campo placeholder="Número de documento" value={f.numeroDocumento} onChange={set('numeroDocumento')} required inputMode="numeric" />
          <Campo className="col-span-2" type="password" placeholder="Contraseña (mín. 8 caracteres)" value={f.clave} onChange={set('clave')} required autoComplete="new-password" />
        </div>
        <Casilla activo={terminos} onCambio={setTerminos}>
          Acepto los <Link to="/terminos" className="text-azul">Términos y la Política de Tratamiento de Datos</Link> (Ley 1581 de 2012).
        </Casilla>
        {error && <Aviso tono="error">{error}</Aviso>}
        <Boton type="submit" alto="lg" cargando={enviando} className="uppercase tracking-[0.06em]">Crear cuenta</Boton>
      </form>
      <div className="text-center text-sm text-tenue">¿Ya tienes cuenta? <Link to="/ingresar" className="text-verde font-bold no-underline">Iniciar sesión</Link></div>
    </CabeceraAcceso>
  );
}
