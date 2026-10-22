// Configuración de medios de pago (SPEC §4.10, RF-E34).
import { PencilSimple, Plus } from '@phosphor-icons/react';
import { doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ahoraIso, type MedioPago } from '@pa/shared';
import { idNuevo, useColeccion } from '../../lib/datos';
import { db } from '../../lib/firebase';
import { subirArchivo } from '../../lib/archivos';
import { mensajeError } from '../../lib/errores';
import { Boton, Campo, Casilla, Encabezado, Etiqueta, Hoja, Interruptor, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { SelectorArchivo } from '../padre/Inscribir';

const NUEVO: Omit<MedioPago, 'id'> = { nombre: '', iniciales: '', color: '#2A3142', titular: '', numero: '', copiable: true, activo: true, orden: 99 };

export function MediosPago() {
  const { datos } = useColeccion<MedioPago>('mediosPago');
  const [edit, setEdit] = useState<(Omit<MedioPago, 'id'> & { id?: string }) | null>(null);
  const lista = [...datos].sort((a, b) => a.orden - b.orden);
  return (
    <Pantalla>
      <Volver>Volver</Volver>
      <Encabezado titulo="Medios de pago" derecha={<Boton alto="sm" icono={<Plus weight="bold" />} onClick={() => setEdit({ ...NUEVO, orden: lista.length })}>Nuevo</Boton>} />
      <div className="text-[13px] text-tenue">Los padres los ven en Pagos y en el recordatorio mensual.</div>
      {lista.map((m) => (
        <div key={m.id} className="flex items-center gap-3.5 rounded-[20px] px-4 py-3.5 bg-sup border border-white/[0.07]" style={{ opacity: m.activo ? 1 : 0.5 }}>
          <div className="w-11 h-11 rounded-[14px] shrink-0 flex items-center justify-center font-[850]" style={{ background: m.color }}>{m.iniciales}</div>
          <div className="flex-1 min-w-0"><div className="text-sm font-bold">{m.nombre}{!m.activo && ' · inactivo'}</div><div className="text-sm">{m.numero}</div><div className="text-xs text-tenue">{m.titular}</div></div>
          <button onClick={() => setEdit(m)} className="w-9 h-9 rounded-full bg-transparent border border-white/10 text-texto cursor-pointer flex items-center justify-center" aria-label="Editar"><PencilSimple weight="bold" /></button>
        </div>
      ))}
      {edit && <Editor key={edit.id ?? 'nuevo'} medio={edit} onCerrar={() => setEdit(null)} />}
    </Pantalla>
  );
}

function Editor({ medio, onCerrar }: { medio: (Omit<MedioPago, 'id'> & { id?: string }) | null; onCerrar: () => void }) {
  const toast = useToast();
  const [m, setM] = useState(medio);
  const [qr, setQr] = useState<File>();
  const [guardando, setGuardando] = useState(false);
  if (!medio || !m) return null;
  async function guardar() {
    if (!m!.nombre.trim() || !m!.numero.trim()) return toast('Escribe el nombre y el número', 'error');
    setGuardando(true);
    try {
      const id = m!.id ?? idNuevo('mediosPago');
      const qrRuta = qr ? await subirArchivo(`publico/qr-${id}-${Date.now()}.jpg`, qr) : m!.qrRuta;
      const { id: _omit, ...resto } = m!; void _omit;
      await setDoc(doc(db, 'mediosPago', id), JSON.parse(JSON.stringify({ ...resto, ...(qrRuta ? { qrRuta } : {}), iniciales: m!.iniciales || m!.nombre[0].toUpperCase(), actualizadoEn: ahoraIso() })));
      toast('Medio de pago guardado');
      setQr(undefined);
      onCerrar();
    } catch (e) { toast(mensajeError(e), 'error'); }
    setGuardando(false);
  }
  return (
    <Hoja abierta onCerrar={onCerrar} titulo={medio.id ? 'Editar medio' : 'Nuevo medio'}>
      <div className="grid grid-cols-2 gap-2.5">
        <Etiqueta texto="Nombre" className="col-span-2"><Campo value={m.nombre} onChange={(e) => setM({ ...m, nombre: e.target.value })} placeholder="Ej. Nequi" /></Etiqueta>
        <Etiqueta texto="Número o llave"><Campo value={m.numero} onChange={(e) => setM({ ...m, numero: e.target.value })} /></Etiqueta>
        <Etiqueta texto="Iniciales"><Campo value={m.iniciales} maxLength={2} onChange={(e) => setM({ ...m, iniciales: e.target.value })} /></Etiqueta>
        <Etiqueta texto="Titular" className="col-span-2"><Campo value={m.titular} onChange={(e) => setM({ ...m, titular: e.target.value })} /></Etiqueta>
        <Etiqueta texto="Instrucciones" className="col-span-2"><Campo value={m.instrucciones ?? ''} onChange={(e) => setM({ ...m, instrucciones: e.target.value })} placeholder="Opcional" /></Etiqueta>
        <Etiqueta texto="Color"><input type="color" value={m.color} onChange={(e) => setM({ ...m, color: e.target.value })} className="campo p-1" /></Etiqueta>
      </div>
      <SelectorArchivo etiqueta={m.qrRuta ? 'Reemplazar código QR' : 'Código QR (opcional)'} archivo={qr} onCambio={setQr} aceptar="image/*" />
      <Casilla activo={m.copiable} onCambio={(v) => setM({ ...m, copiable: v })}>Mostrar botón “Copiar”</Casilla>
      <Interruptor activo={m.activo} onCambio={(v) => setM({ ...m, activo: v })}>Activo</Interruptor>
      <Boton onClick={guardar} cargando={guardando}>Guardar</Boton>
    </Hoja>
  );
}
