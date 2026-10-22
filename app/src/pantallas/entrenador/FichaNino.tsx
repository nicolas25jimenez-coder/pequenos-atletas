// Ficha completa del niño para el entrenador (RF-E06 a RF-E12).
import { FilePdf, FilePlus, PencilSimple, Ruler, Warning, WhatsappLogo } from '@phosphor-icons/react';
import { doc, updateDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { useState } from 'react';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  ahoraIso, cop, diaCobroDe, DIAS, edadAnios, edadTexto, enlaceWhatsApp, ETIQUETA_ASISTENCIA, ETIQUETA_PAGO, estadoEn, fechaCorta, hora12,
  hoy, nombreMes, resumirAsistencia, type Descuento, type Documento, type Nino,
} from '@pa/shared';
import { db } from '../../lib/firebase';
import { useConfiguracion } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { extension, subirArchivo, urlArchivo } from '../../lib/archivos';
import { COLOR_ASISTENCIA, COLOR_PAGO } from '../../lib/estilos';
import { mensajeError } from '../../lib/errores';
import {
  alfa, AreaTexto, Aviso, Avatar, Barra, Boton, Campo, Cargando, Etiqueta, Fila, Hoja, Kicker, Segmentado, Selector, Tarjeta, Vacio, Volver, useToast,
} from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useFoto } from '../comun/useFoto';
import { useFamilia } from '../padre/familia';
import { Fisico, Pruebas } from '../padre/MiHijo';
import { Historial } from '../padre/Historial';
import { DetallePrueba } from '../padre/DetallePrueba';
import { SelectorArchivo } from '../padre/Inscribir';
import { alertaSalud, iniNino, ProveedorNino, useEntrenador } from './contexto';
import { asegurarPagoVigente } from './acciones';

type Tab = 'datos' | 'fisico' | 'pruebas' | 'asistencia' | 'pagos' | 'historial';

export function FichaNino() {
  const { id } = useParams();
  const { porId, cargando } = useEntrenador();
  const nino = porId.get(id ?? '');
  if (cargando) return <Cargando />;
  if (!nino) return <Pantalla><Volver a="/e/ninos">Niños</Volver><Aviso tono="error">No encontramos al niño.</Aviso></Pantalla>;
  return (
    <ProveedorNino nino={nino}>
      <Routes>
        <Route path="prueba/:pruebaId" element={<DetallePrueba />} />
        <Route path=":tab?" element={<Ficha nino={nino} />} />
      </Routes>
    </ProveedorNino>
  );
}

function Ficha({ nino }: { nino: Nino }) {
  const { tab = 'datos' } = useParams();
  const nav = useNavigate();
  const { catPorId } = useEntrenador();
  const foto = useFoto(nino.fotoRuta);
  const [informe, setInforme] = useState(false);
  const cat = catPorId.get(nino.categoriaId ?? '');
  const alerta = alertaSalud(nino);
  const tel = nino.contactos[0]?.telefono.replace(/\D/g, '') ?? '';

  return (
    <Pantalla>
      <Volver a="/e/ninos">Niños</Volver>
      <div className="flex items-center gap-4">
        <div className="w-[76px] h-[76px] rounded-3xl shrink-0 border-2 border-verde overflow-hidden rayado flex items-center justify-center">
          {foto ? <img src={foto} alt="" className="w-full h-full object-cover" /> : <Avatar ini={iniNino(nino)} tam={60} fondo="transparent" />}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="titulo text-[24px]">{nino.nombres} {nino.apellidos.split(' ')[0]}</div>
          <div className="text-[13px] text-suave">{edadTexto(nino.fechaNacimiento)} · {nino.sexo === 'F' ? 'Niña' : 'Niño'}</div>
          <div className="flex gap-1.5 flex-wrap">
            {cat && <span className="px-2.5 py-1 rounded-full bg-azul/[0.16] text-azul-claro text-xs font-bold">{cat.nombre}</span>}
            {nino.estado !== 'activo' && <span className="px-2.5 py-1 rounded-full bg-white/10 text-gris text-xs font-bold">{nino.estado === 'inactivo' ? 'Inactivo' : nino.estado}</span>}
            {cat && edadAnios(nino.fechaNacimiento) > cat.rangoEdad.max && <span className="px-2.5 py-1 rounded-full bg-ambar/15 text-ambar text-xs font-bold">Supera la edad de la categoría</span>}
          </div>
        </div>
      </div>
      {alerta && <Aviso tono="alerta"><Warning weight="bold" className="inline mr-1" />{alerta}</Aviso>}
      <div className="grid grid-cols-4 gap-2">
        <AccionIcono icono={<PencilSimple weight="bold" size={20} />} texto="Editar" onClick={() => nav(`/e/nino/${nino.id}/editar`)} />
        <AccionIcono icono={<Ruler weight="bold" size={20} />} texto="Medir" onClick={() => nav(`/e/mediciones?nino=${nino.id}`)} />
        <AccionIcono icono={<FilePdf weight="bold" size={20} />} texto="Informe" onClick={() => setInforme(true)} />
        <AccionIcono icono={<WhatsappLogo weight="bold" size={20} />} texto="Acudiente" href={tel ? enlaceWhatsApp(tel.startsWith('57') ? tel : `57${tel}`, `Hola, le escribe el profe Nicolás de Pequeños Atletas sobre ${nino.nombres}. `) : undefined} />
      </div>
      <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5">
        <Segmentado<Tab> valor={tab as Tab} onCambio={(t) => nav(`/e/nino/${nino.id}/${t === 'datos' ? '' : t}`, { replace: true })} alto={36}
          opciones={[{ id: 'datos', etiqueta: 'Datos' }, { id: 'fisico', etiqueta: 'Físico' }, { id: 'pruebas', etiqueta: 'Pruebas' }, { id: 'asistencia', etiqueta: 'Asist.' }, { id: 'pagos', etiqueta: 'Pagos' }, { id: 'historial', etiqueta: 'Hist.' }]} />
      </div>
      {tab === 'datos' && <DatosGestion nino={nino} />}
      {tab === 'fisico' && <Fisico nino={nino} />}
      {tab === 'pruebas' && <Pruebas nino={nino} />}
      {tab === 'asistencia' && <AsistenciaNino />}
      {tab === 'pagos' && <PagosNino />}
      {tab === 'historial' && <Historial />}
      <HojaInforme abierta={informe} onCerrar={() => setInforme(false)} />
    </Pantalla>
  );
}

function AccionIcono({ icono, texto, onClick, href }: { icono: React.ReactNode; texto: string; onClick?: () => void; href?: string }) {
  const cls = 'flex flex-col items-center gap-1.5 py-3 rounded-[18px] bg-sup border border-white/[0.07] text-texto text-xs font-semibold cursor-pointer no-underline hover:bg-suph';
  return href ? <a href={href} target="_blank" rel="noreferrer" className={cls}><span className="text-verde">{icono}</span>{texto}</a>
    : <button onClick={onClick} disabled={!onClick} className={cls}><span className="text-verde">{icono}</span>{texto}</button>;
}

/* ───────── Datos + gestión ───────── */

function DatosGestion({ nino }: { nino: Nino }) {
  const { catPorId } = useEntrenador();
  const toast = useToast();
  const [hoja, setHoja] = useState<'categoria' | 'descuento' | 'cobro' | 'estado' | 'documento' | null>(null);
  const cat = catPorId.get(nino.categoriaId ?? '');
  const s = nino.salud, seg = nino.seguroMedico, c = nino.consentimientos;

  async function abrir(d: Documento) {
    try { window.open(await urlArchivo(d.ruta), '_blank'); } catch (e) { toast(mensajeError(e), 'error'); }
  }

  return (<>
    <Tarjeta>
      <div className="flex justify-between items-center"><Kicker>Categoría y cobro</Kicker></div>
      <Fila k="Categoría" v={<button className="bg-transparent border-0 text-verde font-bold cursor-pointer p-0" onClick={() => setHoja('categoria')}>{cat?.nombre ?? 'Asignar'} ›</button>} />
      {cat && <Fila k="Horario" v={cat.horarios.map((h) => `${DIAS[h.diaSemana - 1].slice(0, 3)} ${hora12(h.horaInicio)}`).join(' · ')} />}
      <Fila k="Inscrito desde" v={fechaCorta(nino.fechaInscripcion)} />
      <Fila k="Día de cobro" v={<button className="bg-transparent border-0 text-verde font-bold cursor-pointer p-0" onClick={() => setHoja('cobro')}>Día {diaCobroDe(nino)} ›</button>} />
      <Fila k="Mensualidad" v={cat ? cop(cat.valorMensual) : '—'} />
      <Fila k="Descuento" v={<button className="bg-transparent border-0 text-verde font-bold cursor-pointer p-0" onClick={() => setHoja('descuento')}>{nino.descuento?.valor ? `${nino.descuento.tipo === 'porcentaje' ? `${nino.descuento.valor} %` : cop(nino.descuento.valor)} · ${nino.descuento.motivo}` : 'Agregar'} ›</button>} />
      <Fila k="Estado" v={<button className="bg-transparent border-0 text-verde font-bold cursor-pointer p-0" onClick={() => setHoja('estado')}>{nino.estado === 'activo' ? 'Activo' : `Inactivo${nino.motivoInactivacion ? ` · ${nino.motivoInactivacion}` : ''}`} ›</button>} />
      {(nino.historialCategorias?.length ?? 0) > 1 && <div className="text-xs text-tenue">Historial: {nino.historialCategorias!.map((h) => `${catPorId.get(h.categoriaId)?.nombre ?? h.categoriaId} (${fechaCorta(h.desde)})`).join(' → ')}</div>}
    </Tarjeta>
    <Tarjeta>
      <Kicker>Datos personales</Kicker>
      <Fila k="Nombre" v={`${nino.nombres} ${nino.apellidos}`} />
      <Fila k="Nacimiento" v={fechaCorta(nino.fechaNacimiento)} />
      <Fila k="Documento" v={`${nino.tipoDocumento} ${nino.numeroDocumento}`} />
      <Fila k="Talla uniforme" v={nino.tallaUniforme} />
      {nino.tallaCalzado && <Fila k="Calzado" v={nino.tallaCalzado} />}
    </Tarjeta>
    <Tarjeta>
      <Kicker>Acudientes y contactos</Kicker>
      {nino.acudientes.map((a) => <Fila key={a.usuarioId} k={`Acudiente${a.esPrincipal ? ' principal' : ''}`} v={`${a.nombre} (${a.parentesco})`} />)}
      {nino.contactos.map((x, i) => <Fila key={i} k={`${x.nombre} · ${x.parentesco}`} v={<a className="text-azul no-underline" href={`tel:${x.telefono.replace(/\s/g, '')}`}>{x.telefono}</a>} />)}
      <Fila k="Emergencia" v={nino.contactos.filter((x) => x.esEmergencia).map((x) => x.nombre).join(', ') || '—'} />
      <Fila k="Pueden recogerlo" v={nino.contactos.filter((x) => x.puedeRecoger).map((x) => x.nombre).join(', ') || '—'} />
    </Tarjeta>
    <Tarjeta>
      <Kicker>Salud</Kicker>
      <Fila k="Tipo de sangre" v={s.tipoSangre} /><Fila k="Alergias" v={s.alergias} /><Fila k="Condiciones" v={s.condicionesMedicas} />
      <Fila k="Medicamentos" v={s.medicamentos} /><Fila k="Restricciones" v={s.restriccionesActividad} />
      {s.observaciones && <Fila k="Observaciones" v={s.observaciones} />}
    </Tarjeta>
    <Tarjeta>
      <Kicker>Seguro médico</Kicker>
      <Fila k="Tipo" v={seg.tipo} /><Fila k="Entidad" v={seg.entidad} /><Fila k="Afiliación" v={seg.numeroAfiliacion} />
      {seg.telefonoEntidad && <Fila k="Teléfono" v={seg.telefonoEntidad} />}
    </Tarjeta>
    <Tarjeta>
      <Kicker>Consentimientos</Kicker>
      {([['Tratamiento de datos', c.tratamientoDatos], ['Uso de imagen', c.usoImagen], ['Actividad física', c.actividadFisica]] as const).map(([k, v]) =>
        <Fila key={k} k={k} v={<span style={{ color: v.autorizado ? '#3DDC6A' : '#E5484D' }}>{v.autorizado ? 'Autorizado' : 'No autorizado'} · {fechaCorta(v.fecha)}</span>} />)}
    </Tarjeta>
    <Tarjeta>
      <div className="flex justify-between items-center"><Kicker>Documentos</Kicker><button onClick={() => setHoja('documento')} className="bg-transparent border-0 text-verde font-bold text-[13px] cursor-pointer p-0 flex items-center gap-1"><FilePlus weight="bold" />Subir</button></div>
      {!nino.documentos.length && <span className="text-sm text-tenue">Sin documentos.</span>}
      {nino.documentos.map((d) => <button key={d.ruta} onClick={() => abrir(d)} className="flex justify-between text-sm bg-transparent border-0 text-texto cursor-pointer p-0 text-left"><span>{d.tipo}<br /><span className="text-xs text-tenue">{d.nombre} · {fechaCorta(d.fecha)}</span></span><span className="text-azul">Ver</span></button>)}
    </Tarjeta>
    <HojaCategoria abierta={hoja === 'categoria'} nino={nino} onCerrar={() => setHoja(null)} />
    <HojaDescuento abierta={hoja === 'descuento'} nino={nino} onCerrar={() => setHoja(null)} />
    <HojaCobro abierta={hoja === 'cobro'} nino={nino} onCerrar={() => setHoja(null)} />
    <HojaEstado abierta={hoja === 'estado'} nino={nino} onCerrar={() => setHoja(null)} />
    <HojaDocumento abierta={hoja === 'documento'} nino={nino} onCerrar={() => setHoja(null)} />
  </>);
}

function HojaCategoria({ abierta, nino, onCerrar }: { abierta: boolean; nino: Nino; onCerrar: () => void }) {
  const { categorias, catPorId, activos } = useEntrenador();
  const { usuario } = useSesion();
  const config = useConfiguracion();
  const toast = useToast();
  const [sel, setSel] = useState(nino.categoriaId ?? '');
  async function guardar() {
    if (!sel || sel === nino.categoriaId) return onCerrar();
    const c = catPorId.get(sel)!;
    if (c.cupoMaximo && activos.filter((n) => n.categoriaId === sel).length >= c.cupoMaximo) toast(`Ojo: ${c.nombre} ya está en su cupo máximo (${c.cupoMaximo}).`, 'error');
    try {
      await updateDoc(doc(db, 'ninos', nino.id), { categoriaId: sel, historialCategorias: [...(nino.historialCategorias ?? []), { categoriaId: sel, desde: hoy() }], actualizadoEn: ahoraIso() });
      if (!nino.categoriaId && nino.estado === 'activo') await asegurarPagoVigente({ ...nino, categoriaId: sel }, c, config, usuario!.uid);
      toast(`${nino.nombres} ahora está en ${c.nombre}. La nueva tarifa aplica desde el próximo ciclo.`);
      onCerrar();
    } catch (e) { toast(mensajeError(e), 'error'); }
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Cambiar categoría" sub="Queda en el historial con la fecha de hoy.">
      <Selector value={sel} onChange={(e) => setSel(e.target.value)}>
        <option value="">Seleccionar</option>
        {categorias.filter((c) => c.activa).map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.rangoEdad.min}–{c.rangoEdad.max} años · {cop(c.valorMensual)}</option>)}
      </Selector>
      <Boton onClick={guardar}>Guardar</Boton>
    </Hoja>
  );
}

export function EditorDescuento({ valor, onCambio }: { valor: Descuento | null; onCambio: (d: Descuento | null) => void }) {
  const d = valor ?? { tipo: 'porcentaje' as const, valor: 0, motivo: '' };
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Etiqueta texto="Tipo"><Selector value={d.tipo} onChange={(e) => onCambio({ ...d, tipo: e.target.value as Descuento['tipo'] })}><option value="porcentaje">Porcentaje</option><option value="valor">Valor fijo (COP)</option></Selector></Etiqueta>
      <Etiqueta texto={d.tipo === 'porcentaje' ? 'Porcentaje' : 'Valor'}><Campo inputMode="numeric" value={d.valor || ''} onChange={(e) => onCambio({ ...d, valor: Number(e.target.value.replace(/\D/g, '')) })} /></Etiqueta>
      <Etiqueta texto="Motivo" className="col-span-2"><Campo value={d.motivo} onChange={(e) => onCambio({ ...d, motivo: e.target.value })} placeholder="Ej. Descuento hermanos, beca" /></Etiqueta>
      <Etiqueta texto="Vigente hasta (opcional)" className="col-span-2"><Campo type="date" value={d.vigenteHasta ?? ''} onChange={(e) => onCambio({ ...d, vigenteHasta: e.target.value || undefined })} /></Etiqueta>
    </div>
  );
}

function HojaDescuento({ abierta, nino, onCerrar }: { abierta: boolean; nino: Nino; onCerrar: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<Descuento | null>(nino.descuento ?? null);
  async function guardar(quitar = false) {
    try {
      const v = quitar || !d?.valor ? null : JSON.parse(JSON.stringify({ ...d, motivo: d.motivo.trim() || 'Descuento' }));
      await updateDoc(doc(db, 'ninos', nino.id), { descuento: v, actualizadoEn: ahoraIso() });
      toast(v ? 'Descuento guardado. Aplica desde el próximo ciclo.' : 'Descuento eliminado');
      onCerrar();
    } catch (e) { toast(mensajeError(e), 'error'); }
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Descuento" sub="Se aplica a los cobros que se generen desde ahora.">
      <EditorDescuento valor={d} onCambio={setD} />
      <div className="flex gap-2"><Boton variante="secundario" className="flex-1" onClick={() => guardar(true)}>Quitar</Boton><Boton className="flex-1" onClick={() => guardar()}>Guardar</Boton></div>
    </Hoja>
  );
}

function HojaCobro({ abierta, nino, onCerrar }: { abierta: boolean; nino: Nino; onCerrar: () => void }) {
  const toast = useToast();
  const [dia, setDia] = useState(String(diaCobroDe(nino)));
  async function guardar() {
    const n = Number(dia);
    if (!(n >= 1 && n <= 31)) return toast('Escribe un día entre 1 y 31', 'error');
    await updateDoc(doc(db, 'ninos', nino.id), { diaCobro: n, actualizadoEn: ahoraIso() });
    toast(`Día de cobro: ${n}. Aplica desde el próximo ciclo.`);
    onCerrar();
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Día de cobro" sub="Por defecto es el día de la inscripción. Si el mes no tiene ese día, se cobra el último día del mes.">
      <Campo inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value.replace(/\D/g, ''))} />
      <Boton onClick={guardar}>Guardar</Boton>
    </Hoja>
  );
}

function HojaEstado({ abierta, nino, onCerrar }: { abierta: boolean; nino: Nino; onCerrar: () => void }) {
  const toast = useToast();
  const { usuario } = useSesion();
  const config = useConfiguracion();
  const { catPorId } = useEntrenador();
  const [motivo, setMotivo] = useState('Retiro voluntario');
  async function inactivar() {
    try {
      await updateDoc(doc(db, 'ninos', nino.id), { estado: 'inactivo', motivoInactivacion: motivo, fechaInactivacion: hoy(), actualizadoEn: ahoraIso() });
      toast(`${nino.nombres} quedó inactivo. Ya no se generarán cobros.`);
      onCerrar();
    } catch (e) { toast(mensajeError(e), 'error'); }
  }
  async function reactivar() {
    try {
      await updateDoc(doc(db, 'ninos', nino.id), { estado: 'activo', motivoInactivacion: null, fechaInactivacion: null, actualizadoEn: ahoraIso() });
      const c = catPorId.get(nino.categoriaId ?? '');
      if (c) await asegurarPagoVigente({ ...nino, estado: 'activo' }, c, config, usuario!.uid);
      toast(`${nino.nombres} está activo de nuevo`);
      onCerrar();
    } catch (e) { toast(mensajeError(e), 'error'); }
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={nino.estado === 'activo' ? 'Inactivar' : 'Reactivar'}>
      {nino.estado === 'activo' ? (<>
        <Selector value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          {['Retiro voluntario', 'Cambio de escuela', 'Cumplió la edad máxima', 'Otro'].map((m) => <option key={m}>{m}</option>)}
        </Selector>
        <div className="text-xs text-tenue">No aparecerá en la asistencia ni generará cobros. La familia conserva el acceso de solo lectura.</div>
        <Boton variante="peligro" onClick={inactivar}>Inactivar</Boton>
      </>) : (<>
        <div className="text-sm text-suave">Volverá a la lista de asistencia de su categoría y se generará el cobro del ciclo vigente.</div>
        <Boton onClick={reactivar}>Reactivar</Boton>
      </>)}
    </Hoja>
  );
}

function HojaDocumento({ abierta, nino, onCerrar }: { abierta: boolean; nino: Nino; onCerrar: () => void }) {
  const toast = useToast();
  const [tipo, setTipo] = useState<Documento['tipo']>('Certificado médico');
  const [archivo, setArchivo] = useState<File>();
  const [subiendo, setSubiendo] = useState(false);
  async function subir() {
    if (!archivo) return;
    setSubiendo(true);
    try {
      const ruta = await subirArchivo(`ninos/${nino.id}/documentos/${tipo.split(' ')[0].toLowerCase()}-${Date.now()}.${extension(archivo)}`, archivo);
      await updateDoc(doc(db, 'ninos', nino.id), { documentos: [...nino.documentos, { tipo, nombre: archivo.name, ruta, fecha: hoy() }], actualizadoEn: ahoraIso() });
      toast('Documento subido');
      setArchivo(undefined);
      onCerrar();
    } catch (e) { toast(mensajeError(e), 'error'); }
    setSubiendo(false);
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Subir documento">
      <Selector value={tipo} onChange={(e) => setTipo(e.target.value as Documento['tipo'])}>{['Identidad', 'Carné de seguro', 'Certificado médico', 'Otro'].map((t) => <option key={t}>{t}</option>)}</Selector>
      <SelectorArchivo etiqueta="Archivo (foto o PDF)" archivo={archivo} onCambio={setArchivo} />
      <Boton onClick={subir} cargando={subiendo} disabled={!archivo}>Subir</Boton>
    </Hoja>
  );
}

/* ───────── Asistencia y pagos del niño ───────── */

function AsistenciaNino() {
  const { asistencias } = useFamilia();
  const r = resumirAsistencia(asistencias.map((a) => a.estado));
  const ult90 = resumirAsistencia(asistencias.filter((a) => a.fecha >= (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().slice(0, 10); })()).map((a) => a.estado));
  if (!asistencias.length) return <Vacio titulo="Sin asistencia registrada" />;
  return (<>
    {[['Total', r], ['Últimos 3 meses', ult90]].map(([t, x]) => {
      const res = x as typeof r;
      return (
        <Tarjeta key={t as string} className="gap-2.5">
          <Kicker>{t as string} · {res.total} sesiones</Kicker>
          {res.indicadores.map((i) => (
            <div key={i.estado} className="flex items-center gap-3 text-sm"><span className="w-16">{i.etiqueta}</span><div className="flex-1"><Barra pct={i.porcentaje} color={COLOR_ASISTENCIA[i.estado]} alto={6} /></div><span className="w-20 text-right text-tenue">{i.cantidad} · {Math.round(i.porcentaje)} %</span></div>
          ))}
        </Tarjeta>
      );
    })}
    <div className="flex flex-col gap-2">
      {[...asistencias].reverse().slice(0, 30).map((a) => (
        <div key={a.id} className="flex items-center gap-3 rounded-2xl px-4 py-2.5 bg-sup border border-white/[0.07] text-sm">
          <span className="w-20 text-tenue">{fechaCorta(a.fecha)}</span>
          <span className="flex-1 truncate">{a.tipoSesion === 'control' ? 'Control' : 'Entrenamiento'}{a.observacion ? ` · ${a.observacion}` : ''}</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: alfa(COLOR_ASISTENCIA[a.estado], 0.15), color: COLOR_ASISTENCIA[a.estado] }}>{ETIQUETA_ASISTENCIA[a.estado]}</span>
        </div>
      ))}
    </div>
  </>);
}

function PagosNino() {
  const { pagos } = useFamilia();
  const nav = useNavigate();
  if (!pagos.length) return <Vacio titulo="Sin cobros" />;
  const pend = pagos.filter((p) => ['pendiente', 'vencido'].includes(estadoEn(p, hoy())));
  return (<>
    {pend.length > 0 && <Aviso tono="alerta">Debe {pend.length} {pend.length === 1 ? 'mes' : 'meses'}: {cop(pend.reduce((a, p) => a + p.valorAPagar, 0))}</Aviso>}
    <Tarjeta className="gap-1">
      {[...pagos].reverse().map((p) => {
        const e = estadoEn(p, hoy());
        return (
          <button key={p.id} onClick={() => nav(`/e/pagos?mes=${p.periodo}&nino=${p.ninoId}`)} className="flex items-center gap-3 py-2.5 border-0 border-t border-white/[0.06] bg-transparent text-texto text-left cursor-pointer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex-1"><div className="text-sm font-semibold">{nombreMes(p.periodo, true)}</div><div className="text-xs text-tenue">{e === 'pagado' ? `Pagado ${fechaCorta(p.fechaPago)} · ${p.medioPago ?? ''}` : `Vence ${fechaCorta(p.fechaVencimiento)}`}</div></div>
            <span className="text-sm font-bold">{cop(p.valorAPagar)}</span>
            <span className="w-[84px] text-center py-1 rounded-full text-[11px] font-bold" style={{ background: alfa(COLOR_PAGO[e], 0.15), color: COLOR_PAGO[e] }}>{ETIQUETA_PAGO[e]}</span>
          </button>
        );
      })}
    </Tarjeta>
  </>);
}

/* ───────── Informe PDF ───────── */

function HojaInforme({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const toast = useToast();
  const { nino, categorias, mediciones, resultados, asistencias, pruebas } = useFamilia();
  const [desde, setDesde] = useState(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); });
  const [hasta, setHasta] = useState(hoy());
  const [comentario, setComentario] = useState('');
  const [generando, setGenerando] = useState(false);
  if (!nino) return null;
  async function generar() {
    setGenerando(true);
    try {
      const { generarInforme, descargarBlob } = await import('../../pdf/informe');
      descargarBlob(await generarInforme({ nino: nino!, categoria: categorias.get(nino!.categoriaId ?? ''), mediciones, resultados, asistencias, pruebas, desde, hasta, comentario }), `informe-${nino!.nombres.toLowerCase()}-${hoy()}.pdf`);
      onCerrar();
    } catch (e) { toast(mensajeError(e), 'error'); }
    setGenerando(false);
  }
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Informe PDF" sub={`${nino.nombres} ${nino.apellidos}`}>
      <div className="grid grid-cols-2 gap-2.5">
        <Etiqueta texto="Desde"><Campo type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></Etiqueta>
        <Etiqueta texto="Hasta"><Campo type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></Etiqueta>
      </div>
      <Etiqueta texto="Comentario general (opcional)"><AreaTexto value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej. Sofía ha mostrado un gran avance en su equilibrio…" /></Etiqueta>
      <Boton onClick={generar} cargando={generando} icono={<FilePdf weight="bold" />}>Descargar PDF</Boton>
    </Hoja>
  );
}

// Utilidad usada al vincular un acudiente desde el formulario del niño
export async function sincronizarAcudientes(ninoId: string, acudientesIds: string[]) {
  const b = writeBatch(db);
  for (const col of ['asistencias', 'medicionesFisicas', 'pagos', 'resultadosPruebas', 'confirmacionesEvento', 'solicitudesCambio']) {
    const docs = await getDocs(query(collection(db, col), where('ninoId', '==', ninoId)));
    docs.forEach((d) => b.update(d.ref, { acudientesIds }));
  }
  await b.commit();
}
