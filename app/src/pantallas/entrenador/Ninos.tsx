import { CaretRight, MagnifyingGlass, Plus, Ruler, Warning } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { edadTexto, estadoEn, hoy, porcentajeFaltas, resumirAsistencia, sumarDias, type Asistencia, type Pago } from '@pa/shared';
import { useColeccion, useConfiguracion } from '../../lib/datos';
import { Avatar, Boton, Campo, Chips, COLOR, Encabezado, Selector, Vacio } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useFoto } from '../comun/useFoto';
import { alertaSalud, iniNino, useEntrenador } from './contexto';
import type { Nino } from '@pa/shared';

type Filtro = 'activos' | 'pendientes' | 'inactivos' | 'vencidos' | 'faltas' | 'todos';

export function Ninos() {
  const nav = useNavigate();
  const config = useConfiguracion();
  const { ninos, categorias, catPorId } = useEntrenador();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('activos');
  const [cat, setCat] = useState('todas');
  const pagos = useColeccion<Pago>(filtro === 'vencidos' ? 'pagos' : null, [['estado', 'in', ['pendiente', 'vencido']]]);
  const asis = useColeccion<Asistencia>(filtro === 'faltas' ? 'asistencias' : null, [['fecha', '>=', sumarDias(hoy(), -90)]]);

  const lista = useMemo(() => {
    const vencidos = new Set(pagos.datos.filter((p) => estadoEn(p, hoy()) === 'vencido').map((p) => p.ninoId));
    const faltas = new Map<string, number>();
    if (filtro === 'faltas') {
      const por = new Map<string, Asistencia[]>();
      asis.datos.forEach((a) => (por.get(a.ninoId) ?? por.set(a.ninoId, []).get(a.ninoId)!).push(a));
      por.forEach((xs, id) => faltas.set(id, porcentajeFaltas(resumirAsistencia(xs.map((a) => a.estado)))));
    }
    const texto = q.trim().toLowerCase();
    return ninos.filter((n) => {
      if (texto && !`${n.nombres} ${n.apellidos} ${n.numeroDocumento}`.toLowerCase().includes(texto)) return false;
      if (cat !== 'todas' && n.categoriaId !== cat) return false;
      if (filtro === 'activos') return n.estado === 'activo';
      if (filtro === 'pendientes') return n.estado === 'pendiente_aprobacion';
      if (filtro === 'inactivos') return n.estado === 'inactivo' || n.estado === 'rechazado';
      if (filtro === 'vencidos') return vencidos.has(n.id);
      if (filtro === 'faltas') return n.estado === 'activo' && (faltas.get(n.id) ?? 0) > config.umbralFaltas;
      return true;
    });
  }, [ninos, q, filtro, cat, pagos.datos, asis.datos, config.umbralFaltas]);

  return (
    <Pantalla>
      <Encabezado titulo="Niños" sub={`${ninos.filter((n) => n.estado === 'activo').length} activos`}
        derecha={<Boton alto="sm" icono={<Plus weight="bold" />} onClick={() => nav('/e/ninos/nuevo')}>Nuevo</Boton>} />
      <Campo icono={<MagnifyingGlass weight="bold" />} placeholder="Buscar por nombre o documento" value={q} onChange={(e) => setQ(e.target.value)} />
      <Chips<Filtro> valor={filtro} onCambio={setFiltro} opciones={[
        { id: 'activos', etiqueta: 'Activos' }, { id: 'pendientes', etiqueta: 'Pendientes' }, { id: 'vencidos', etiqueta: 'Pago vencido' },
        { id: 'faltas', etiqueta: `Faltas > ${config.umbralFaltas} %` }, { id: 'inactivos', etiqueta: 'Inactivos' }, { id: 'todos', etiqueta: 'Todos' },
      ]} />
      <div className="flex gap-2">
        <Selector value={cat} onChange={(e) => setCat(e.target.value)} className="flex-1">
          <option value="todas">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Selector>
        <Boton variante="secundario" icono={<Ruler weight="bold" />} onClick={() => nav(`/e/mediciones${cat !== 'todas' ? `?categoria=${cat}` : ''}`)} className="h-[52px]">Medir</Boton>
      </div>
      {!lista.length && <Vacio titulo="No hay niños con ese filtro" />}
      <div className="flex flex-col gap-2">
        {lista.map((n) => <FilaNino key={n.id} n={n} cat={catPorId.get(n.categoriaId ?? '')?.nombre} onClick={() => nav(n.estado === 'pendiente_aprobacion' ? `/e/inscripciones/${n.id}` : `/e/nino/${n.id}`)} />)}
      </div>
    </Pantalla>
  );
}

function FilaNino({ n, cat, onClick }: { n: Nino; cat?: string; onClick: () => void }) {
  const foto = useFoto(n.fotoRuta);
  const alerta = alertaSalud(n);
  const estado = n.estado === 'pendiente_aprobacion' ? 'Pendiente' : n.estado === 'inactivo' ? 'Inactivo' : n.estado === 'rechazado' ? 'Rechazado' : null;
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-[20px] px-3.5 py-3 bg-sup border border-white/[0.07] text-texto text-left cursor-pointer hover:bg-suph">
      <Avatar ini={iniNino(n)} tam={42} redondo={false} fondo="#1F2638" foto={foto} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[15px] font-bold truncate">{n.nombres} {n.apellidos}</span>
        <span className="text-xs text-tenue">{edadTexto(n.fechaNacimiento)}{cat ? ` · ${cat}` : ''}</span>
        {alerta && <span className="flex items-center gap-1 text-[11px] text-ambar"><Warning weight="bold" /><span className="truncate">{alerta}</span></span>}
      </div>
      {estado && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: estado === 'Pendiente' ? COLOR.ambar : COLOR.gris }}>{estado}</span>}
      <CaretRight weight="bold" className="text-apagado" />
    </button>
  );
}
