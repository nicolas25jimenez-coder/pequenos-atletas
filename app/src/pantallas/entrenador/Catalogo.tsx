// Catálogo de pruebas (RF-E30) y plantillas de control (RF-E31).
import { CaretRight, Copy, Plus, Trash } from '@phosphor-icons/react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ahoraIso, ESCALA_CUALITATIVA, FAMILIAS, TIPOS_RESULTADO, type Familia, type PlantillaControl, type Prueba, type Referencia,
} from '@pa/shared';
import { idNuevo, useColeccion } from '../../lib/datos';
import { db } from '../../lib/firebase';
import { useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import {
  AreaTexto, Aviso, Boton, Campo, Casilla, Encabezado, Etiqueta, Hoja, Interruptor, Kicker, Selector, Tarjeta, Volver, useToast,
} from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useEntrenador } from './contexto';

export function Catalogo() {
  const nav = useNavigate();
  const { pruebas } = useEntrenador();
  return (
    <Pantalla>
      <Volver a="/e/mas">Más</Volver>
      <Encabezado titulo="Pruebas" derecha={<Boton alto="sm" icono={<Plus weight="bold" />} onClick={() => nav('/e/pruebas/nueva')}>Nueva</Boton>} />
      <Boton variante="secundario" onClick={() => nav('/e/plantillas')}>Plantillas de control</Boton>
      <Aviso tono="alerta">Las referencias por edad del catálogo base son provisionales. Revísalas y ajústalas con tu criterio o tus datos.</Aviso>
      {FAMILIAS.map((f) => (
        <div key={f.id} className="flex flex-col gap-2">
          <span className="titulo text-base px-1" style={{ fontWeight: 800 }}>{f.nombre}</span>
          {pruebas.filter((p) => p.familia === f.id).map((p) => (
            <button key={p.id} onClick={() => nav(`/e/pruebas/${p.id}`)} className="flex items-center gap-3 rounded-[20px] px-4 py-3 bg-sup border border-white/[0.07] text-texto text-left cursor-pointer hover:bg-suph" style={{ opacity: p.activa ? 1 : 0.5 }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{p.nombre}</div>
                <div className="text-xs text-tenue">{TIPOS_RESULTADO.find((t) => t.id === p.tipoResultado)?.nombre} {p.unidad && `· ${p.unidad}`} · {p.referencias.length ? `${p.referencias.length} ref.` : 'sin referencia'}{p.esDelCatalogoBase ? '' : ' · propia'}{!p.activa ? ' · inactiva' : ''}</div>
              </div>
              <CaretRight weight="bold" className="text-apagado" />
            </button>
          ))}
        </div>
      ))}
    </Pantalla>
  );
}

const NUEVA: Omit<Prueba, 'id'> = {
  nombre: '', familia: 'locomocion', capacidad: 'Coordinación', objetivo: '', protocolo: '', materiales: '', deportesRelacionados: [],
  tipoResultado: 'tiempo', unidad: 's', mejorEs: 'menor', intentos: 2, agregacion: 'mejor', referencias: [], esDelCatalogoBase: false, activa: true,
};

export function FormPrueba() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { pruebaPorId } = useEntrenador();
  const nueva = id === 'nueva';
  const actual = nueva ? undefined : pruebaPorId.get(id ?? '');
  const [p, setP] = useState<Omit<Prueba, 'id'>>(actual ?? NUEVA);
  const [deportes, setDeportes] = useState(p.deportesRelacionados.join(', '));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const setRef = (i: number, r: Partial<Referencia>) => setP({ ...p, referencias: p.referencias.map((x, j) => (j === i ? { ...x, ...r } : x)) });

  async function guardar(copia = false) {
    setError('');
    if (!p.nombre.trim() || !p.objetivo.trim()) return setError('El nombre y el objetivo son obligatorios (el objetivo es lo que leen los padres).');
    setGuardando(true);
    try {
      const nid = copia || !actual ? idNuevo('pruebas') : actual.id;
      const datos = JSON.parse(JSON.stringify({
        ...p, nombre: copia ? `${p.nombre} (copia)` : p.nombre.trim(), esDelCatalogoBase: copia ? false : p.esDelCatalogoBase,
        deportesRelacionados: deportes.split(',').map((d) => d.trim()).filter(Boolean),
        escalaCualitativa: p.tipoResultado === 'cualitativa' ? p.escalaCualitativa ?? ESCALA_CUALITATIVA : undefined,
        intentos: p.tipoResultado === 'cualitativa' ? 1 : p.intentos,
        actualizadoEn: ahoraIso(), ...(copia || !actual ? { creadoEn: ahoraIso(), creadoPor: usuario!.uid } : {}),
      }));
      await setDoc(doc(db, 'pruebas', nid), datos);
      toast(copia ? 'Prueba duplicada' : 'Prueba guardada');
      nav(copia ? `/e/pruebas/${nid}` : '/e/pruebas', { replace: true });
    } catch (e) { setError(mensajeError(e)); }
    setGuardando(false);
  }

  return (
    <Pantalla>
      <Volver a="/e/pruebas">Pruebas</Volver>
      <div className="titulo text-[26px]">{actual ? 'Editar prueba' : 'Nueva prueba'}</div>
      <Tarjeta className="gap-3">
        <Etiqueta texto="Nombre"><Campo value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} /></Etiqueta>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Familia"><Selector value={p.familia} onChange={(e) => setP({ ...p, familia: e.target.value as Familia })}>{FAMILIAS.map((f) => <option key={f.id} value={f.id}>{f.corto}</option>)}</Selector></Etiqueta>
          <Etiqueta texto="Capacidad"><Selector value={p.capacidad} onChange={(e) => setP({ ...p, capacidad: e.target.value })}>{['Velocidad', 'Agilidad', 'Fuerza', 'Coordinación', 'Equilibrio', 'Flexibilidad', 'Precisión'].map((c) => <option key={c}>{c}</option>)}</Selector></Etiqueta>
        </div>
        <Etiqueta texto="Objetivo (lo leen los padres)"><AreaTexto value={p.objetivo} onChange={(e) => setP({ ...p, objetivo: e.target.value })} placeholder="Qué mide y por qué es importante" /></Etiqueta>
        <Etiqueta texto="Cómo se realiza"><AreaTexto value={p.protocolo} onChange={(e) => setP({ ...p, protocolo: e.target.value })} /></Etiqueta>
        <Etiqueta texto="Materiales"><Campo value={p.materiales} onChange={(e) => setP({ ...p, materiales: e.target.value })} /></Etiqueta>
        <Etiqueta texto="Prepara para (separados por coma)"><Campo value={deportes} onChange={(e) => setDeportes(e.target.value)} placeholder="Atletismo, Fútbol" /></Etiqueta>
        <Etiqueta texto="Video o imagen de ejemplo (enlace, opcional)"><Campo value={p.mediaEjemploUrl ?? ''} onChange={(e) => setP({ ...p, mediaEjemploUrl: e.target.value || undefined })} placeholder="https://…" /></Etiqueta>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Resultado</Kicker>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Tipo"><Selector value={p.tipoResultado} onChange={(e) => { const t = TIPOS_RESULTADO.find((x) => x.id === e.target.value)!; setP({ ...p, tipoResultado: t.id, unidad: t.unidad, mejorEs: t.mejorEs, ...(t.id === 'aciertos' ? { maximo: 5, intentos: 1 } : {}) }); }}>{TIPOS_RESULTADO.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</Selector></Etiqueta>
          {p.tipoResultado !== 'cualitativa' && <>
            <Etiqueta texto="Unidad"><Campo value={p.unidad} onChange={(e) => setP({ ...p, unidad: e.target.value })} /></Etiqueta>
            <Etiqueta texto="Mejor es"><Selector value={p.mejorEs} onChange={(e) => setP({ ...p, mejorEs: e.target.value as Prueba['mejorEs'] })}><option value="mayor">Mayor</option><option value="menor">Menor</option></Selector></Etiqueta>
            <Etiqueta texto="Intentos"><Selector value={p.intentos} onChange={(e) => setP({ ...p, intentos: Number(e.target.value) })}>{[1, 2, 3].map((n) => <option key={n}>{n}</option>)}</Selector></Etiqueta>
            {p.intentos > 1 && <Etiqueta texto="Se guarda"><Selector value={p.agregacion} onChange={(e) => setP({ ...p, agregacion: e.target.value as Prueba['agregacion'] })}><option value="mejor">El mejor</option><option value="promedio">El promedio</option></Selector></Etiqueta>}
            <Etiqueta texto="Máximo (opcional)"><Campo inputMode="decimal" value={p.maximo ?? ''} onChange={(e) => setP({ ...p, maximo: Number(e.target.value) || undefined })} /></Etiqueta>
          </>}
        </div>
      </Tarjeta>
      {p.tipoResultado !== 'cualitativa' && (
        <Tarjeta className="gap-3">
          <Kicker>Valores de referencia</Kicker>
          <div className="text-xs text-tenue">El rango “esperado” por edad y sexo. Fuera del rango se muestra “Por debajo” o “Por encima”.</div>
          {p.referencias.map((r, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1.2fr_auto] gap-2 items-end">
              <Etiqueta texto="Edad"><Selector value={`${r.edadMin}-${r.edadMax}`} onChange={(e) => { const [a, b] = e.target.value.split('-').map(Number); setRef(i, { edadMin: a, edadMax: b }); }}>{['4-4', '5-5', '6-6', '4-6', '3-7'].map((x) => <option key={x} value={x}>{x.replace('-', '–')} años</option>)}</Selector></Etiqueta>
              <Etiqueta texto="Sexo"><Selector value={r.sexo} onChange={(e) => setRef(i, { sexo: e.target.value as Referencia['sexo'] })}><option value="todos">Todos</option><option value="F">Niñas</option><option value="M">Niños</option></Selector></Etiqueta>
              <Etiqueta texto={`Rango (${p.unidad})`}><div className="flex gap-1"><Campo inputMode="decimal" value={r.valorBajo} onChange={(e) => setRef(i, { valorBajo: Number(e.target.value.replace(',', '.')) })} /><Campo inputMode="decimal" value={r.valorAlto} onChange={(e) => setRef(i, { valorAlto: Number(e.target.value.replace(',', '.')) })} /></div></Etiqueta>
              <button onClick={() => setP({ ...p, referencias: p.referencias.filter((_, j) => j !== i) })} className="h-[52px] bg-transparent border-0 text-rojo cursor-pointer px-1" aria-label="Quitar"><Trash weight="bold" /></button>
            </div>
          ))}
          <Boton variante="punteado" className="h-11" icono={<Plus weight="bold" />} onClick={() => setP({ ...p, referencias: [...p.referencias, { edadMin: 4, edadMax: 6, sexo: 'todos', valorBajo: 0, valorAlto: 0 }] })}>Agregar rango</Boton>
        </Tarjeta>
      )}
      <Interruptor activo={p.activa} onCambio={(v) => setP({ ...p, activa: v })}>Prueba activa (aparece al planear un control)</Interruptor>
      {error && <Aviso tono="error">{error}</Aviso>}
      <div className="flex gap-2">
        {actual && <Boton variante="secundario" icono={<Copy weight="bold" />} onClick={() => guardar(true)}>Duplicar</Boton>}
        <Boton className="flex-1" alto="lg" onClick={() => guardar()} cargando={guardando}>Guardar</Boton>
      </div>
    </Pantalla>
  );
}

export function Plantillas() {
  const toast = useToast();
  const { usuario } = useSesion();
  const { pruebas, pruebaPorId } = useEntrenador();
  const { datos } = useColeccion<PlantillaControl>('plantillasControl');
  const [edit, setEdit] = useState<{ id?: string; nombre: string; pruebasIds: string[] } | null>(null);

  async function guardar() {
    if (!edit?.nombre.trim() || !edit.pruebasIds.length) return toast('Escribe un nombre y elige pruebas', 'error');
    try {
      await setDoc(doc(db, 'plantillasControl', edit.id ?? idNuevo('plantillasControl')), { nombre: edit.nombre.trim(), pruebasIds: edit.pruebasIds, actualizadoEn: ahoraIso(), creadoPor: usuario!.uid });
      toast('Plantilla guardada'); setEdit(null);
    } catch (e) { toast(mensajeError(e), 'error'); }
  }
  return (
    <Pantalla>
      <Volver a="/e/pruebas">Pruebas</Volver>
      <Encabezado titulo="Plantillas" derecha={<Boton alto="sm" icono={<Plus weight="bold" />} onClick={() => setEdit({ nombre: '', pruebasIds: [] })}>Nueva</Boton>} />
      <div className="text-[13px] text-tenue">Grupos de pruebas que reutilizas en cada día de control.</div>
      {datos.map((t) => (
        <Tarjeta key={t.id} onClick={() => setEdit({ id: t.id, nombre: t.nombre, pruebasIds: t.pruebasIds })} className="gap-1">
          <div className="font-bold">{t.nombre}</div>
          <div className="text-xs text-tenue">{t.pruebasIds.map((p) => pruebaPorId.get(p)?.nombre ?? p).join(' · ')}</div>
        </Tarjeta>
      ))}
      <Hoja abierta={!!edit} onCerrar={() => setEdit(null)} titulo={edit?.id ? 'Editar plantilla' : 'Nueva plantilla'}>
        {edit && (<>
          <Campo value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} placeholder="Nombre" />
          <div className="flex flex-col gap-2 max-h-[40dvh] overflow-y-auto">
            {pruebas.filter((p) => p.activa).map((p) => <Casilla key={p.id} activo={edit.pruebasIds.includes(p.id)} onCambio={(v) => setEdit({ ...edit, pruebasIds: v ? [...edit.pruebasIds, p.id] : edit.pruebasIds.filter((x) => x !== p.id) })}>{p.nombre}</Casilla>)}
          </div>
          <div className="flex gap-2">
            {edit.id && <Boton variante="secundario" className="!text-rojo" onClick={async () => { await deleteDoc(doc(db, 'plantillasControl', edit.id!)); setEdit(null); toast('Plantilla eliminada'); }}>Eliminar</Boton>}
            <Boton className="flex-1" onClick={guardar}>Guardar</Boton>
          </div>
        </>)}
      </Hoja>
    </Pantalla>
  );
}
