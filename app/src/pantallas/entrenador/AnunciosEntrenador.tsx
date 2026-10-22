// Anuncios generales, por categoría o por niño (RF-E39).
import { Plus, PushPin, Trash } from '@phosphor-icons/react';
import { deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ahoraIso, type Anuncio } from '@pa/shared';
import { idNuevo, useColeccion } from '../../lib/datos';
import { db } from '../../lib/firebase';
import { useSesion } from '../../lib/sesion';
import { subirArchivo } from '../../lib/archivos';
import { mensajeError } from '../../lib/errores';
import { AreaTexto, Aviso, Boton, Campo, Casilla, Encabezado, Etiqueta, Segmentado, Tarjeta, Vacio, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { TarjetaAnuncio } from '../padre/Anuncios';
import { SelectorArchivo } from '../padre/Inscribir';
import { nombreNino, useEntrenador } from './contexto';

export function AnunciosEntrenador() {
  const nav = useNavigate();
  const toast = useToast();
  const { datos } = useColeccion<Anuncio>('anuncios');
  const { catPorId } = useEntrenador();
  const lista = [...datos].sort((a, b) => (a.fijado === b.fijado ? b.fechaPublicacion.localeCompare(a.fechaPublicacion) : a.fijado ? -1 : 1));
  const para = (a: Anuncio) => a.destinatarios.tipo === 'todas' ? 'Todos' : a.destinatarios.tipo === 'categorias' ? a.destinatarios.ids.map((c) => catPorId.get(c)?.nombre ?? c).join(', ') : `${a.destinatarios.ids.length} niños`;
  return (
    <Pantalla>
      <Volver a="/e/mas">Más</Volver>
      <Encabezado titulo="Anuncios" derecha={<Boton alto="sm" icono={<Plus weight="bold" />} onClick={() => nav('/e/anuncios/nuevo')}>Nuevo</Boton>} />
      {!lista.length && <Vacio titulo="No hay anuncios" />}
      {lista.map((a) => (
        <div key={a.id} className="flex flex-col gap-1">
          <TarjetaAnuncio a={a} acciones={
            <div className="flex gap-1">
              <button onClick={() => updateDoc(doc(db, 'anuncios', a.id), { fijado: !a.fijado })} className="w-8 h-8 rounded-full bg-transparent border border-white/10 cursor-pointer flex items-center justify-center" style={{ color: a.fijado ? '#3DDC6A' : '#8C95A8' }} aria-label="Fijar"><PushPin weight={a.fijado ? 'fill' : 'bold'} /></button>
              <button onClick={async () => { if (confirm('¿Eliminar este anuncio?')) { await deleteDoc(doc(db, 'anuncios', a.id)); toast('Anuncio eliminado'); } }} className="w-8 h-8 rounded-full bg-transparent border border-white/10 text-rojo cursor-pointer flex items-center justify-center" aria-label="Eliminar"><Trash weight="bold" /></button>
            </div>} />
          <span className="text-[11px] text-tenue px-2">Para: {para(a)}{a.enviarPush ? ' · con notificación' : ''}</span>
        </div>
      ))}
    </Pantalla>
  );
}

export function FormAnuncio() {
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { categorias, activos } = useEntrenador();
  const [a, setA] = useState({ titulo: '', mensaje: '', fijado: false, enviarPush: true, expira: '' });
  const [tipo, setTipo] = useState<'todas' | 'categorias' | 'ninos'>('todas');
  const [ids, setIds] = useState<string[]>([]);
  const [imagen, setImagen] = useState<File>();
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function publicar() {
    setError('');
    if (!a.titulo.trim() || !a.mensaje.trim()) return setError('Escribe el título y el mensaje.');
    if (tipo !== 'todas' && !ids.length) return setError('Elige al menos un destinatario.');
    setEnviando(true);
    try {
      const nid = idNuevo('anuncios');
      const imagenRuta = imagen ? await subirArchivo(`publico/anuncio-${nid}.jpg`, imagen) : undefined;
      const d: Omit<Anuncio, 'id'> = {
        titulo: a.titulo.trim(), mensaje: a.mensaje.trim(), destinatarios: tipo === 'todas' ? { tipo } : { tipo, ids },
        fijado: a.fijado, enviarPush: a.enviarPush, fechaPublicacion: ahoraIso(), ...(a.expira ? { fechaExpiracion: `${a.expira}T23:59:00-05:00` } : {}),
        ...(imagenRuta ? { imagenRuta } : {}), creadoEn: ahoraIso(), actualizadoEn: ahoraIso(), creadoPor: usuario!.uid,
      };
      await setDoc(doc(db, 'anuncios', nid), d);
      toast(a.enviarPush ? 'Anuncio publicado y notificado' : 'Anuncio publicado');
      nav('/e/anuncios', { replace: true });
    } catch (e) { setError(mensajeError(e)); }
    setEnviando(false);
  }

  return (
    <Pantalla>
      <Volver a="/e/anuncios">Anuncios</Volver>
      <div className="titulo text-[28px]">Nuevo anuncio</div>
      <Tarjeta className="gap-3">
        <Etiqueta texto="Título"><Campo value={a.titulo} onChange={(e) => setA({ ...a, titulo: e.target.value })} placeholder="Ej. Sesión del sábado cancelada" /></Etiqueta>
        <Etiqueta texto="Mensaje"><AreaTexto value={a.mensaje} onChange={(e) => setA({ ...a, mensaje: e.target.value })} /></Etiqueta>
        <SelectorArchivo etiqueta="Imagen (opcional)" archivo={imagen} onCambio={setImagen} aceptar="image/*" />
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Segmentado valor={tipo} onCambio={(t) => { setTipo(t); setIds([]); }} alto={36} opciones={[{ id: 'todas', etiqueta: 'Todos' }, { id: 'categorias', etiqueta: 'Categorías' }, { id: 'ninos', etiqueta: 'Niños' }]} />
        {tipo === 'categorias' && categorias.filter((c) => c.activa).map((c) => <Casilla key={c.id} activo={ids.includes(c.id)} onCambio={(v) => setIds(v ? [...ids, c.id] : ids.filter((x) => x !== c.id))}>{c.nombre}</Casilla>)}
        {tipo === 'ninos' && <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">{activos.map((n) => <Casilla key={n.id} activo={ids.includes(n.id)} onCambio={(v) => setIds(v ? [...ids, n.id] : ids.filter((x) => x !== n.id))}>{nombreNino(n)}</Casilla>)}</div>}
        <Casilla activo={a.enviarPush} onCambio={(v) => setA({ ...a, enviarPush: v })}>Enviar notificación</Casilla>
        <Casilla activo={a.fijado} onCambio={(v) => setA({ ...a, fijado: v })}>Fijar arriba</Casilla>
        <Etiqueta texto="Ocultar después de (opcional)"><Campo type="date" value={a.expira} onChange={(e) => setA({ ...a, expira: e.target.value })} /></Etiqueta>
      </Tarjeta>
      {error && <Aviso tono="error">{error}</Aviso>}
      <Boton alto="lg" onClick={publicar} cargando={enviando}>Publicar</Boton>
    </Pantalla>
  );
}
