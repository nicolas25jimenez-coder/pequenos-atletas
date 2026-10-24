import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ahoraIso, diaSemana, FAMILIAS, hoy, type PlantillaControl, type Sesion, type TipoSesion } from '@pa/shared';
import { actualizar, guardar as guardarDoc, idNuevo, useColeccion, useDocumento } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, Casilla, Etiqueta, Segmentado, Selector, Tarjeta, Volver, useToast, Kicker } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useEntrenador } from './contexto';

export function FormSesion() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { categorias, catPorId, pruebas } = useEntrenador();
  const existente = useDocumento<Sesion>(id ? `sesiones/${id}` : null);
  const plantillas = useColeccion<PlantillaControl>('plantillasControl');
  const activas = categorias.filter((c) => c.activa);

  const [f, setF] = useState({ tipo: 'entrenamiento' as TipoSesion, categoriaId: activas[0]?.id ?? '', fecha: hoy(), horaInicio: '', horaFin: '', lugar: '', tema: '', notasGenerales: '' });
  const [sel, setSel] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = existente.datos;
    if (s) {
      setF({ tipo: s.tipo, categoriaId: s.categoriaId, fecha: s.fecha, horaInicio: s.horaInicio, horaFin: s.horaFin, lugar: s.lugar, tema: s.tema ?? '', notasGenerales: s.notasGenerales ?? '' });
      setSel(s.pruebasSeleccionadas);
    }
  }, [existente.datos]);

  // Precarga hora y lugar según el horario de la categoría (RF-E17)
  useEffect(() => {
    if (id) return;
    const c = catPorId.get(f.categoriaId);
    const h = c?.horarios.find((x) => x.diaSemana === diaSemana(f.fecha)) ?? c?.horarios[0];
    if (h) setF((x) => ({ ...x, horaInicio: h.horaInicio, horaFin: h.horaFin, lugar: h.lugar }));
  }, [f.categoriaId, f.fecha, id, catPorId]);

  async function guardar() {
    setError('');
    if (!f.categoriaId || !f.fecha || !f.horaInicio || !f.horaFin || !f.lugar.trim()) return setError('Completa categoría, fecha, horario y lugar.');
    if (f.tipo === 'control' && !sel.length) return setError('Selecciona al menos una prueba para el día de control.');
    setGuardando(true);
    try {
      const datos = { ...f, lugar: f.lugar.trim(), tema: f.tema.trim(), pruebasSeleccionadas: f.tipo === 'control' ? sel : [], actualizadoEn: ahoraIso() };
      if (id) await actualizar('sesiones', id, datos);
      else {
        const nuevo = idNuevo('sesiones');
        await guardarDoc('sesiones', { id: nuevo, ...datos, estado: 'programada', creadoEn: ahoraIso(), creadoPor: usuario!.uid } satisfies Sesion);
        toast('Sesión creada');
        nav(`/e/sesion/${nuevo}`, { replace: true });
        return;
      }
      toast('Sesión actualizada');
      nav(-1);
    } catch (e) { setError(mensajeError(e)); }
    setGuardando(false);
  }

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <Pantalla>
      <Volver>Volver</Volver>
      <div className="titulo text-[28px]">{id ? 'Editar sesión' : 'Nueva sesión'}</div>
      <Segmentado<TipoSesion> valor={f.tipo} onCambio={(t) => setF({ ...f, tipo: t })} opciones={[{ id: 'entrenamiento', etiqueta: 'Entrenamiento' }, { id: 'control', etiqueta: 'Día de control' }]} />
      <div className="grid grid-cols-2 gap-2.5">
        <Etiqueta texto="Categoría" className="col-span-2">
          <Selector value={f.categoriaId} onChange={set('categoriaId')}>{activas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Selector>
        </Etiqueta>
        <Etiqueta texto="Fecha" className="col-span-2"><Campo type="date" value={f.fecha} onChange={set('fecha')} /></Etiqueta>
        <Etiqueta texto="Inicia"><Campo type="time" value={f.horaInicio} onChange={set('horaInicio')} /></Etiqueta>
        <Etiqueta texto="Termina"><Campo type="time" value={f.horaFin} onChange={set('horaFin')} /></Etiqueta>
        <Etiqueta texto="Lugar" className="col-span-2"><Campo value={f.lugar} onChange={set('lugar')} /></Etiqueta>
        <Etiqueta texto="Tema u objetivo (lo ven los padres)" className="col-span-2"><Campo value={f.tema} onChange={set('tema')} placeholder="Ej. Saltos y aterrizajes seguros" /></Etiqueta>
        <Etiqueta texto="Notas internas" className="col-span-2"><Campo value={f.notasGenerales} onChange={set('notasGenerales')} placeholder="Solo para ti" /></Etiqueta>
      </div>
      {f.tipo === 'control' && (
        <Tarjeta className="gap-3">
          <div className="flex justify-between items-center"><Kicker>Pruebas a realizar · {sel.length}</Kicker></div>
          {plantillas.datos.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {plantillas.datos.map((p) => <Boton key={p.id} alto="sm" variante="secundario" onClick={() => setSel(p.pruebasIds)}>{p.nombre}</Boton>)}
            </div>
          )}
          {FAMILIAS.map((fam) => {
            const ps = pruebas.filter((p) => p.activa && p.familia === fam.id);
            if (!ps.length) return null;
            return (
              <div key={fam.id} className="flex flex-col gap-2">
                <span className="text-xs font-bold text-azul">{fam.nombre}</span>
                {ps.map((p) => <Casilla key={p.id} activo={sel.includes(p.id)} onCambio={(v) => setSel(v ? [...sel, p.id] : sel.filter((x) => x !== p.id))}>{p.nombre} <span className="text-tenue">· {p.unidad || 'escala'}</span></Casilla>)}
              </div>
            );
          })}
        </Tarjeta>
      )}
      {error && <Aviso tono="error">{error}</Aviso>}
      <Boton alto="lg" onClick={guardar} cargando={guardando}>{id ? 'Guardar cambios' : 'Crear sesión'}</Boton>
    </Pantalla>
  );
}
