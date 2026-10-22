import { EnvelopeSimple, Trash } from '@phosphor-icons/react';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { useState } from 'react';
import { ahoraIso, normalizarCorreo, type Invitacion } from '@pa/shared';
import { useColeccion } from '../../lib/datos';
import { db } from '../../lib/firebase';
import { useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, Casilla, Etiqueta, Kicker, Selector, Tarjeta, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { PARENTESCOS } from '../acceso/Registro';
import { useFamilia } from './familia';

export function Invitar() {
  const { usuario } = useSesion();
  const toast = useToast();
  const { ninos } = useFamilia();
  const activos = ninos.filter((n) => n.estado === 'activo');
  const [correo, setCorreo] = useState('');
  const [parentesco, setParentesco] = useState('Padre');
  const [sel, setSel] = useState<string[]>(activos.map((n) => n.id));
  const [enviando, setEnviando] = useState(false);
  const invitaciones = useColeccion<Invitacion>('invitaciones', [['invitadoPor', '==', usuario?.uid ?? '']]);

  async function invitar() {
    if (!usuario || !correo.includes('@') || !sel.length) return;
    setEnviando(true);
    try {
      await addDoc(collection(db, 'invitaciones'), {
        correo: normalizarCorreo(correo), ninosIds: sel, parentesco, invitadoPor: usuario.uid, estado: 'pendiente',
        creadoEn: ahoraIso(), actualizadoEn: ahoraIso(), creadoPor: usuario.uid,
      });
      toast('Invitación creada. Pídele que se registre en la app con ese correo.');
      setCorreo('');
    } catch (e) { toast(mensajeError(e), 'error'); }
    setEnviando(false);
  }

  return (
    <Pantalla>
      <Volver a="/p/mas">Más</Volver>
      <div className="titulo text-[30px]">Invitar acudiente</div>
      <div className="text-sm text-suave leading-normal pretty">La otra persona verá la misma información de tus hijos con su propia cuenta y también recibirá las notificaciones.</div>
      <Tarjeta className="gap-3.5">
        <Etiqueta texto="Correo de la persona"><Campo icono={<EnvelopeSimple weight="bold" />} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" /></Etiqueta>
        <Etiqueta texto="Parentesco"><Selector value={parentesco} onChange={(e) => setParentesco(e.target.value)}>{PARENTESCOS.map((p) => <option key={p}>{p}</option>)}</Selector></Etiqueta>
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold text-tenue">Hijos a los que tendrá acceso</span>
          {activos.map((n) => <Casilla key={n.id} activo={sel.includes(n.id)} onCambio={(v) => setSel(v ? [...sel, n.id] : sel.filter((x) => x !== n.id))}>{n.nombres} {n.apellidos}</Casilla>)}
        </div>
        <Boton onClick={invitar} cargando={enviando} disabled={!correo.includes('@') || !sel.length}>Crear invitación</Boton>
      </Tarjeta>
      <Aviso>No enviamos correos: avísale a la persona que descargue la app y se registre con ese mismo correo. Quedará vinculada automáticamente.</Aviso>
      {invitaciones.datos.length > 0 && (
        <Tarjeta className="gap-2">
          <Kicker>Invitaciones</Kicker>
          {invitaciones.datos.map((i) => (
            <div key={i.id} className="flex items-center gap-3 py-2 border-t border-white/[0.06]">
              <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{i.correo}</div><div className="text-xs text-tenue">{i.parentesco} · {i.estado === 'aceptada' ? 'Aceptada ✅' : 'Esperando registro'}</div></div>
              {i.estado === 'pendiente' && <button onClick={() => deleteDoc(doc(db, 'invitaciones', i.id))} className="bg-transparent border-0 text-rojo cursor-pointer p-1" aria-label="Cancelar invitación"><Trash weight="bold" /></button>}
            </div>
          ))}
        </Tarjeta>
      )}
    </Pantalla>
  );
}
