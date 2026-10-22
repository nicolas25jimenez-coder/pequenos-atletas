// Categorías y tarifas (RF-E14 a RF-E16).
import { CaretRight, Plus, Trash } from '@phosphor-icons/react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ahoraIso, cop, DIAS, hora12, type Categoria, type Horario } from '@pa/shared';
import { db } from '../../lib/firebase';
import { idNuevo } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import { AreaTexto, Aviso, Boton, Campo, Encabezado, Etiqueta, Interruptor, Kicker, Selector, Tarjeta, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useEntrenador } from './contexto';

export function Categorias() {
  const nav = useNavigate();
  const { categorias, activos } = useEntrenador();
  return (
    <Pantalla>
      <Volver a="/e/mas">Más</Volver>
      <Encabezado titulo="Categorías" derecha={<Boton alto="sm" icono={<Plus weight="bold" />} onClick={() => nav('/e/categorias/nueva')}>Nueva</Boton>} />
      {categorias.map((c) => {
        const n = activos.filter((x) => x.categoriaId === c.id).length;
        return (
          <Tarjeta key={c.id} onClick={() => nav(`/e/categorias/${c.id}`)} className="gap-2">
            <div className="flex items-center gap-3">
              <span className="w-3 h-10 rounded-full shrink-0" style={{ background: c.color }} />
              <div className="flex-1 min-w-0">
                <div className="titulo text-xl">{c.nombre}{!c.activa && <span className="text-xs text-gris not-italic normal-case font-bold ml-2">Inactiva</span>}</div>
                <div className="text-xs text-tenue">{c.rangoEdad.min}–{c.rangoEdad.max} años · {n}{c.cupoMaximo ? `/${c.cupoMaximo}` : ''} niños · {cop(c.valorMensual)}</div>
              </div>
              <CaretRight weight="bold" className="text-apagado" />
            </div>
            <div className="text-xs text-suave">{c.horarios.map((h) => `${DIAS[h.diaSemana - 1]} ${hora12(h.horaInicio)}–${hora12(h.horaFin)} · ${h.lugar}`).join(' | ')}</div>
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}

const COLORES = ['#3DDC6A', '#4F7BFF', '#F5A524', '#E5484D', '#3E9BFF', '#B57BFF', '#F472B6'];

export function FormCategoria() {
  const { id } = useParams();
  const nueva = id === 'nueva';
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { catPorId, activos } = useEntrenador();
  const actual = nueva ? undefined : catPorId.get(id ?? '');
  const [c, setC] = useState<Omit<Categoria, 'id'>>(actual ?? {
    nombre: '', descripcion: '', rangoEdad: { min: 4, max: 4 }, horarios: [{ diaSemana: 2, horaInicio: '15:00', horaFin: '16:00', lugar: 'Parque El Virrey' }],
    valorMensual: 120000, color: COLORES[0], activa: true,
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const conNinos = activos.filter((n) => n.categoriaId === id).length;
  const setH = (i: number, h: Partial<Horario>) => setC({ ...c, horarios: c.horarios.map((x, j) => (j === i ? { ...x, ...h } : x)) });

  async function guardar() {
    setError('');
    if (!c.nombre.trim()) return setError('Escribe el nombre de la categoría.');
    if (!c.horarios.length) return setError('Agrega al menos un horario.');
    if (!c.activa && conNinos) return setError(`No puedes inactivar una categoría con ${conNinos} niños activos. Muévelos primero.`);
    setGuardando(true);
    try {
      const datos = { ...c, nombre: c.nombre.trim(), actualizadoEn: ahoraIso() };
      if (actual) await updateDoc(doc(db, 'categorias', actual.id), datos);
      else await setDoc(doc(db, 'categorias', idNuevo('categorias')), { ...datos, creadoEn: ahoraIso(), creadoPor: usuario!.uid });
      toast(actual && actual.valorMensual !== c.valorMensual ? 'Guardado. La nueva tarifa aplica desde el próximo ciclo de cada niño.' : 'Categoría guardada');
      nav('/e/categorias', { replace: true });
    } catch (e) { setError(mensajeError(e)); }
    setGuardando(false);
  }

  return (
    <Pantalla>
      <Volver a="/e/categorias">Categorías</Volver>
      <div className="titulo text-[28px]">{actual ? actual.nombre : 'Nueva categoría'}</div>
      <Tarjeta className="gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Nombre" className="col-span-2"><Campo value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} placeholder="Ej. Pequeños Leones" /></Etiqueta>
          <Etiqueta texto="Descripción" className="col-span-2"><AreaTexto value={c.descripcion} onChange={(e) => setC({ ...c, descripcion: e.target.value })} /></Etiqueta>
          <Etiqueta texto="Edad mínima" ayuda="Solo referencial"><Campo inputMode="numeric" value={c.rangoEdad.min} onChange={(e) => setC({ ...c, rangoEdad: { ...c.rangoEdad, min: Number(e.target.value) || 0 } })} /></Etiqueta>
          <Etiqueta texto="Edad máxima"><Campo inputMode="numeric" value={c.rangoEdad.max} onChange={(e) => setC({ ...c, rangoEdad: { ...c.rangoEdad, max: Number(e.target.value) || 0 } })} /></Etiqueta>
          <Etiqueta texto="Mensualidad (COP)"><Campo inputMode="numeric" value={c.valorMensual} onChange={(e) => setC({ ...c, valorMensual: Number(e.target.value.replace(/\D/g, '')) })} /></Etiqueta>
          <Etiqueta texto="Cupo máximo"><Campo inputMode="numeric" value={c.cupoMaximo ?? ''} onChange={(e) => setC({ ...c, cupoMaximo: Number(e.target.value) || undefined })} placeholder="Sin límite" /></Etiqueta>
        </div>
        <div className="flex gap-2">{COLORES.map((x) => <button key={x} onClick={() => setC({ ...c, color: x })} className="w-9 h-9 rounded-full cursor-pointer" style={{ background: x, border: c.color === x ? '3px solid #F2F4F8' : '3px solid transparent' }} aria-label={x} />)}</div>
        <Interruptor activo={c.activa} onCambio={(v) => setC({ ...c, activa: v })}>Categoría activa</Interruptor>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Horarios</Kicker>
        {c.horarios.map((h, i) => (
          <div key={i} className="flex flex-col gap-2 pb-3 border-b border-white/[0.06]">
            <div className="flex gap-2">
              <Selector value={h.diaSemana} onChange={(e) => setH(i, { diaSemana: Number(e.target.value) })}>{DIAS.map((d, j) => <option key={d} value={j + 1}>{d[0].toUpperCase() + d.slice(1)}</option>)}</Selector>
              <button onClick={() => setC({ ...c, horarios: c.horarios.filter((_, j) => j !== i) })} className="bg-transparent border-0 text-rojo cursor-pointer px-2" aria-label="Quitar"><Trash weight="bold" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2"><Campo type="time" value={h.horaInicio} onChange={(e) => setH(i, { horaInicio: e.target.value })} /><Campo type="time" value={h.horaFin} onChange={(e) => setH(i, { horaFin: e.target.value })} /></div>
            <Campo value={h.lugar} onChange={(e) => setH(i, { lugar: e.target.value })} placeholder="Lugar" />
          </div>
        ))}
        <Boton variante="punteado" className="h-11" icono={<Plus weight="bold" />} onClick={() => setC({ ...c, horarios: [...c.horarios, { ...(c.horarios[c.horarios.length - 1] ?? { horaInicio: '15:00', horaFin: '16:00', lugar: '' }), diaSemana: 4 }] })}>Agregar horario</Boton>
      </Tarjeta>
      {error && <Aviso tono="error">{error}</Aviso>}
      <Boton alto="lg" onClick={guardar} cargando={guardando}>Guardar</Boton>
    </Pantalla>
  );
}
