// Reportes (RF-E40 a RF-E43): pagos del mes, asistencia, informes PDF y Excel.
import { FilePdf, FileXls } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import {
  cop, edadTexto, ETIQUETA_ASISTENCIA, ETIQUETA_PAGO, estadoEn, ETIQUETA_COMPARACION, fechaCorta, formatoValor, hoy, nombreMes, porcentajeFaltas,
  resumirAsistencia, sumarDias, sumarMeses,
  type Asistencia, type MedicionFisica, type Nino, type Pago, type ResultadoPrueba,
} from '@pa/shared';
import { listar, useColeccion, useConfiguracion } from '../../lib/datos';
import { COLOR_ASISTENCIA, COLOR_PAGO } from '../../lib/estilos';
import { mensajeError } from '../../lib/errores';
import { alfa, Boton, Campo, Etiqueta, Kicker, Segmentado, Selector, Tarjeta, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { nombreNino, useEntrenador } from './contexto';

type Tab = 'pagos' | 'asistencia' | 'informes' | 'excel';

export function Reportes() {
  const [tab, setTab] = useState<Tab>('pagos');
  return (
    <Pantalla>
      <Volver a="/e/mas">Más</Volver>
      <div className="titulo text-[30px]">Reportes</div>
      <Segmentado<Tab> valor={tab} onCambio={setTab} alto={36} opciones={[{ id: 'pagos', etiqueta: 'Pagos' }, { id: 'asistencia', etiqueta: 'Asistencia' }, { id: 'informes', etiqueta: 'PDF' }, { id: 'excel', etiqueta: 'Excel' }]} />
      {tab === 'pagos' && <ReportePagos />}
      {tab === 'asistencia' && <ReporteAsistencia />}
      {tab === 'informes' && <Informes />}
      {tab === 'excel' && <Excel />}
    </Pantalla>
  );
}

function ReportePagos() {
  const { categorias, porId } = useEntrenador();
  const [mes, setMes] = useState(hoy().slice(0, 7));
  const { datos } = useColeccion<Pago>('pagos', [['periodo', '==', mes]]);
  const pagos = datos.map((p) => ({ ...p, estado: estadoEn(p, hoy()) }));
  const fila = (ps: typeof pagos) => {
    const cob = ps.filter((p) => p.estado !== 'congelado' && p.estado !== 'exonerado');
    const esperado = cob.reduce((a, p) => a + p.valorAPagar, 0);
    const recaudado = ps.filter((p) => p.estado === 'pagado').reduce((a, p) => a + p.valorAPagar, 0);
    return { esperado, recaudado, n: ps.length, pagados: ps.filter((p) => p.estado === 'pagado').length };
  };
  const total = fila(pagos);
  const deudores = pagos.filter((p) => p.estado === 'pendiente' || p.estado === 'vencido');
  return (<>
    <Etiqueta texto="Mes"><Selector value={mes} onChange={(e) => setMes(e.target.value)}>{Array.from({ length: 12 }, (_, i) => sumarMeses(hoy().slice(0, 7), -i)).map((p) => <option key={p} value={p}>{nombreMes(p, true)}</option>)}</Selector></Etiqueta>
    <Tarjeta className="gap-2">
      <Kicker>Total · {nombreMes(mes, true)}</Kicker>
      <div className="flex justify-between text-sm"><span className="text-tenue">Esperado</span><b>{cop(total.esperado)}</b></div>
      <div className="flex justify-between text-sm"><span className="text-tenue">Recaudado</span><b className="text-verde">{cop(total.recaudado)}</b></div>
      <div className="flex justify-between text-sm"><span className="text-tenue">Por cobrar</span><b className="text-ambar">{cop(total.esperado - total.recaudado)}</b></div>
      <div className="flex gap-2 flex-wrap mt-1">
        {(['pagado', 'pendiente', 'vencido', 'congelado', 'exonerado'] as const).map((e) => {
          const n = pagos.filter((p) => p.estado === e).length;
          return <span key={e} className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: alfa(COLOR_PAGO[e], 0.15), color: COLOR_PAGO[e] }}>{n} {ETIQUETA_PAGO[e].toLowerCase()}</span>;
        })}
      </div>
    </Tarjeta>
    <Tarjeta className="gap-1">
      <div className="grid grid-cols-[1.2fr_1fr_1fr_0.6fr] kicker pb-1.5"><span>Categoría</span><span>Esperado</span><span>Recaudado</span><span>Pag.</span></div>
      {categorias.map((c) => { const f = fila(pagos.filter((p) => p.categoriaId === c.id)); if (!f.n) return null; return (
        <div key={c.id} className="grid grid-cols-[1.2fr_1fr_1fr_0.6fr] text-[13px] py-2 border-t border-white/[0.06]"><span className="font-semibold">{c.nombre}</span><span>{cop(f.esperado)}</span><span className="text-verde">{cop(f.recaudado)}</span><span>{f.pagados}/{f.n}</span></div>
      ); })}
    </Tarjeta>
    {deudores.length > 0 && (
      <Tarjeta className="gap-1.5">
        <Kicker>Por cobrar · {deudores.length}</Kicker>
        {deudores.map((p) => { const n = porId.get(p.ninoId); return <div key={p.id} className="flex justify-between text-[13px]"><span>{n ? nombreNino(n) : p.ninoId}</span><span style={{ color: COLOR_PAGO[p.estado] }}>{cop(p.valorAPagar)} · {ETIQUETA_PAGO[p.estado]}</span></div>; })}
      </Tarjeta>
    )}
  </>);
}

function ReporteAsistencia() {
  const config = useConfiguracion();
  const { categorias, activos } = useEntrenador();
  const [desde, setDesde] = useState(sumarDias(hoy(), -30));
  const [hasta, setHasta] = useState(hoy());
  const [cat, setCat] = useState('todas');
  const { datos } = useColeccion<Asistencia>('asistencias', [['fecha', '>=', desde]]);
  const enRango = useMemo(() => datos.filter((a) => a.fecha <= hasta && (cat === 'todas' || a.categoriaId === cat)), [datos, hasta, cat]);
  const general = resumirAsistencia(enRango.map((a) => a.estado));
  const porNino = activos.filter((n) => cat === 'todas' || n.categoriaId === cat)
    .map((n) => ({ n, r: resumirAsistencia(enRango.filter((a) => a.ninoId === n.id).map((a) => a.estado)) }))
    .sort((a, b) => porcentajeFaltas(b.r) - porcentajeFaltas(a.r));
  return (<>
    <div className="grid grid-cols-2 gap-2.5">
      <Etiqueta texto="Desde"><Campo type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Etiqueta>
      <Etiqueta texto="Hasta"><Campo type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Etiqueta>
      <Etiqueta texto="Categoría" className="col-span-2"><Selector value={cat} onChange={(e) => setCat(e.target.value)}><option value="todas">Todas</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Selector></Etiqueta>
    </div>
    <Tarjeta className="gap-2">
      <Kicker>General · {general.total} registros</Kicker>
      <div className="grid grid-cols-4 gap-2">{general.indicadores.map((i) => <div key={i.estado}><div className="text-xl font-extrabold" style={{ color: COLOR_ASISTENCIA[i.estado] }}>{Math.round(i.porcentaje)} %</div><div className="text-[11px] text-tenue">{i.etiqueta}</div></div>)}</div>
    </Tarjeta>
    <Tarjeta className="gap-1">
      <div className="grid grid-cols-[1.6fr_repeat(4,0.7fr)] kicker pb-1.5" style={{ letterSpacing: '0.04em' }}><span>Niño</span>{(['asistio', 'retardo', 'excusa', 'falto'] as const).map((e) => <span key={e} style={{ color: COLOR_ASISTENCIA[e] }}>{ETIQUETA_ASISTENCIA[e].slice(0, 3)}</span>)}</div>
      {porNino.map(({ n, r }) => {
        const alta = porcentajeFaltas(r) > config.umbralFaltas;
        return (
          <div key={n.id} className="grid grid-cols-[1.6fr_repeat(4,0.7fr)] text-[13px] py-2 border-t border-white/[0.06]" style={{ background: alta ? 'rgba(229,72,77,0.08)' : undefined }}>
            <span className="truncate font-semibold">{nombreNino(n)}{alta ? ' ⚠️' : ''}</span>
            {r.indicadores.map((i) => <span key={i.estado}>{Math.round(i.porcentaje)}%</span>)}
          </div>
        );
      })}
      <div className="text-[11px] text-tenue pt-2">⚠️ Faltas por encima del {config.umbralFaltas} % (umbral en Configuración).</div>
    </Tarjeta>
  </>);
}

async function porNino<T>(col: string, ninoId: string): Promise<T[]> {
  const s = await listar<T>(col, [['ninoId', '==', ninoId]]);
  return s.sort((a, b) => ((a as { fecha?: string }).fecha ?? '').localeCompare((b as { fecha?: string }).fecha ?? ''));
}

function Informes() {
  const toast = useToast();
  const { categorias, catPorId, activos, pruebaPorId } = useEntrenador();
  const [cat, setCat] = useState(categorias[0]?.id ?? '');
  const [desde, setDesde] = useState(sumarDias(hoy(), -365));
  const [hasta, setHasta] = useState(hoy());
  const [generando, setGenerando] = useState(false);
  async function generar() {
    setGenerando(true);
    try {
      const kids = activos.filter((n) => n.categoriaId === cat);
      const datos = await Promise.all(kids.map(async (nino) => ({
        nino, categoria: catPorId.get(cat), pruebas: pruebaPorId, desde, hasta,
        mediciones: await porNino<MedicionFisica>('medicionesFisicas', nino.id),
        resultados: await porNino<ResultadoPrueba>('resultadosPruebas', nino.id),
        asistencias: await porNino<Asistencia>('asistencias', nino.id),
      })));
      const { generarInformes, descargarBlob } = await import('../../pdf/informe');
      descargarBlob(await generarInformes(datos, `Informes ${catPorId.get(cat)?.nombre}`), `informes-${cat}-${hoy()}.pdf`);
      toast(`PDF con ${kids.length} informes descargado`);
    } catch (e) { toast(mensajeError(e), 'error'); }
    setGenerando(false);
  }
  return (<>
    <div className="text-[13px] text-suave">Un solo PDF con una página por niño. Para un informe individual con comentario, ábrelo desde la ficha del niño.</div>
    <div className="grid grid-cols-2 gap-2.5">
      <Etiqueta texto="Categoría" className="col-span-2"><Selector value={cat} onChange={(e) => setCat(e.target.value)}>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Selector></Etiqueta>
      <Etiqueta texto="Desde"><Campo type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Etiqueta>
      <Etiqueta texto="Hasta"><Campo type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Etiqueta>
    </div>
    <Boton alto="lg" onClick={generar} cargando={generando} icono={<FilePdf weight="bold" size={20} />}>Descargar informes de la categoría</Boton>
  </>);
}

function Excel() {
  const toast = useToast();
  const { ninos, catPorId, pruebaPorId, porId } = useEntrenador();
  const [desde, setDesde] = useState(sumarDias(hoy(), -365));
  const [hasta, setHasta] = useState(hoy());
  const [generando, setGenerando] = useState(false);
  async function exportar() {
    setGenerando(true);
    try {
      const traer = async <T,>(col: string) => listar<T>(col, [['fecha', '>=', desde]]);
      const [asis, res, med, pagos] = await Promise.all([
        traer<Asistencia>('asistencias'), traer<ResultadoPrueba>('resultadosPruebas'), traer<MedicionFisica>('medicionesFisicas'),
        listar<Pago>('pagos'),
      ]);
      const enRango = <T extends { fecha: string }>(xs: T[]) => xs.filter((x) => x.fecha <= hasta).sort((a, b) => a.fecha.localeCompare(b.fecha));
      const nom = (id: string) => { const n = porId.get(id); return n ? `${n.nombres} ${n.apellidos}` : id; };
      const cat = (id?: string) => catPorId.get(id ?? '')?.nombre ?? '';
      const { exportarExcel } = await import('../../lib/excel');
      await exportarExcel([
        { nombre: 'Niños', columnas: [{ titulo: 'Nombre', clave: 'nombre', ancho: 28 }, { titulo: 'Estado', clave: 'estado' }, { titulo: 'Categoría', clave: 'cat' }, { titulo: 'Nacimiento', clave: 'nac' }, { titulo: 'Edad', clave: 'edad', ancho: 18 }, { titulo: 'Sexo', clave: 'sexo', ancho: 6 }, { titulo: 'Documento', clave: 'doc', ancho: 18 }, { titulo: 'Talla', clave: 'talla', ancho: 8 }, { titulo: 'Acudiente', clave: 'acu', ancho: 26 }, { titulo: 'Teléfono', clave: 'tel', ancho: 18 }, { titulo: 'EPS / Seguro', clave: 'eps', ancho: 20 }, { titulo: 'Alergias', clave: 'ale', ancho: 18 }, { titulo: 'Inscripción', clave: 'ins' }],
          filas: ninos.map((n: Nino) => ({ nombre: `${n.nombres} ${n.apellidos}`, estado: n.estado, cat: cat(n.categoriaId), nac: fechaCorta(n.fechaNacimiento), edad: edadTexto(n.fechaNacimiento), sexo: n.sexo, doc: `${n.tipoDocumento} ${n.numeroDocumento}`, talla: n.tallaUniforme, acu: n.acudientes.map((a) => a.nombre).join(', '), tel: n.contactos[0]?.telefono, eps: n.seguroMedico.entidad, ale: n.salud.alergias, ins: fechaCorta(n.fechaInscripcion) })) },
        { nombre: 'Asistencia', columnas: [{ titulo: 'Fecha', clave: 'f' }, { titulo: 'Niño', clave: 'n', ancho: 28 }, { titulo: 'Categoría', clave: 'c' }, { titulo: 'Tipo', clave: 't', ancho: 14 }, { titulo: 'Estado', clave: 'e' }, { titulo: 'Observación', clave: 'o', ancho: 30 }],
          filas: enRango(asis).map((a) => ({ f: fechaCorta(a.fecha), n: nom(a.ninoId), c: cat(a.categoriaId), t: a.tipoSesion === 'control' ? 'Control' : 'Entrenamiento', e: ETIQUETA_ASISTENCIA[a.estado], o: a.observacion ?? '' })) },
        { nombre: 'Resultados', columnas: [{ titulo: 'Fecha', clave: 'f' }, { titulo: 'Niño', clave: 'n', ancho: 28 }, { titulo: 'Prueba', clave: 'p', ancho: 34 }, { titulo: 'Valor', clave: 'v' }, { titulo: 'Unidad', clave: 'u', ancho: 8 }, { titulo: 'Intentos', clave: 'i' }, { titulo: 'Referencia', clave: 'r' }, { titulo: 'Observación', clave: 'o', ancho: 30 }],
          filas: enRango(res).map((r) => { const p = pruebaPorId.get(r.pruebaId); return { f: fechaCorta(r.fecha), n: nom(r.ninoId), p: p?.nombre ?? r.pruebaId, v: r.noRealizada ? `No realizó (${r.noRealizada.motivo})` : p ? formatoValor(p, r.valorFinal) : r.valorFinal, u: p?.unidad ?? '', i: r.intentos.join(' / '), r: r.comparacionReferencia ? ETIQUETA_COMPARACION[r.comparacionReferencia] : '', o: r.observacion ?? '' }; }) },
        { nombre: 'Mediciones', columnas: [{ titulo: 'Fecha', clave: 'f' }, { titulo: 'Niño', clave: 'n', ancho: 28 }, { titulo: 'Talla (cm)', clave: 't' }, { titulo: 'Peso (kg)', clave: 'p' }, { titulo: 'IMC', clave: 'i' }, { titulo: 'Percentil', clave: 'pc' }, { titulo: 'Clasificación OMS', clave: 'c', ancho: 22 }],
          filas: enRango(med).map((m) => ({ f: fechaCorta(m.fecha), n: nom(m.ninoId), t: m.tallaCm, p: m.pesoKg, i: m.imc, pc: m.percentilImc, c: m.clasificacionImc })) },
        { nombre: 'Pagos', columnas: [{ titulo: 'Periodo', clave: 'per' }, { titulo: 'Niño', clave: 'n', ancho: 28 }, { titulo: 'Categoría', clave: 'c' }, { titulo: 'Valor base', clave: 'b' }, { titulo: 'Descuento', clave: 'd' }, { titulo: 'A pagar', clave: 'v' }, { titulo: 'Estado', clave: 'e' }, { titulo: 'Fecha pago', clave: 'fp' }, { titulo: 'Medio', clave: 'm' }, { titulo: 'Nota', clave: 'nota', ancho: 24 }],
          filas: pagos.filter((p) => p.fechaInicioCiclo >= desde && p.fechaInicioCiclo <= hasta).sort((a, b) => a.periodo.localeCompare(b.periodo)).map((p) => ({ per: nombreMes(p.periodo, true), n: nom(p.ninoId), c: cat(p.categoriaId), b: p.valorBase, d: p.descuento, v: p.valorAPagar, e: ETIQUETA_PAGO[estadoEn(p, hoy())], fp: fechaCorta(p.fechaPago), m: p.medioPago ?? '', nota: p.motivoEstado ?? p.notas ?? '' })) },
      ], `pequenos-atletas-${hoy()}.xlsx`);
      toast('Excel descargado');
    } catch (e) { toast(mensajeError(e), 'error'); }
    setGenerando(false);
  }
  return (<>
    <div className="text-[13px] text-suave">Un archivo con 5 hojas: niños, asistencia, resultados de pruebas, mediciones y pagos.</div>
    <div className="grid grid-cols-2 gap-2.5">
      <Etiqueta texto="Desde"><Campo type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Etiqueta>
      <Etiqueta texto="Hasta"><Campo type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Etiqueta>
    </div>
    <Boton alto="lg" onClick={exportar} cargando={generando} icono={<FileXls weight="bold" size={20} />}>Exportar a Excel</Boton>
  </>);
}
