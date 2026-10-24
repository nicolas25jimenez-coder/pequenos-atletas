// Bandeja de inscripciones y aprobación con asignación de categoría (RF-E04).
import { CaretRight, Check, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ahoraIso, cop, edadAnios, edadTexto, fechaCorta, hoy, valorDescuento, type Descuento, type Documento } from '@pa/shared';
import { actualizar, useConfiguracion } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { urlArchivo } from '../../lib/archivos';
import { mensajeError } from '../../lib/errores';
import { Aviso, Avatar, Boton, Campo, Etiqueta, Fila, Hoja, Kicker, Selector, Tarjeta, Titulo, Vacio, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useFoto } from '../comun/useFoto';
import { iniNino, useEntrenador } from './contexto';
import { asegurarPagoVigente } from './acciones';
import { EditorDescuento } from './FichaNino';

export function Inscripciones() {
  const nav = useNavigate();
  const { ninos } = useEntrenador();
  const pend = ninos.filter((n) => n.estado === 'pendiente_aprobacion').sort((a, b) => (a.creadoEn ?? '').localeCompare(b.creadoEn ?? ''));
  return (
    <Pantalla>
      <Volver a="/e">Hoy</Volver>
      <Titulo>Inscripciones</Titulo>
      {!pend.length && <Vacio titulo="No hay inscripciones pendientes" texto="Cuando una familia inscriba a su hijo, aparecerá aquí." />}
      {pend.map((n) => (
        <button key={n.id} onClick={() => nav(`/e/inscripciones/${n.id}`)} className="flex items-center gap-3 rounded-[20px] px-4 py-3 bg-sup border border-white/[0.07] text-texto text-left cursor-pointer hover:bg-suph">
          <Avatar ini={iniNino(n)} tam={42} redondo={false} fondo="#1F2638" />
          <div className="flex-1 min-w-0"><div className="text-[15px] font-bold">{n.nombres} {n.apellidos}</div><div className="text-xs text-tenue">{edadTexto(n.fechaNacimiento)} · {n.acudientes[0]?.nombre} · {fechaCorta(n.creadoEn?.slice(0, 10))}</div></div>
          <CaretRight weight="bold" className="text-apagado" />
        </button>
      ))}
    </Pantalla>
  );
}

export function RevisarInscripcion() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const config = useConfiguracion();
  const { porId, categorias, catPorId, activos } = useEntrenador();
  const n = porId.get(id ?? '');
  const foto = useFoto(n?.fotoRuta);
  const edad = n ? edadAnios(n.fechaNacimiento) : 0;
  const sugerida = categorias.find((c) => c.activa && edad >= c.rangoEdad.min && edad <= c.rangoEdad.max);
  const [cat, setCat] = useState(sugerida?.id ?? categorias[0]?.id ?? '');
  const [fecha, setFecha] = useState(hoy());
  const [desc, setDesc] = useState<Descuento | null>(null);
  const [rechazar, setRechazar] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  if (!n) return <Pantalla><Volver a="/e/inscripciones">Inscripciones</Volver><Vacio titulo="Inscripción no encontrada" /></Pantalla>;
  if (n.estado !== 'pendiente_aprobacion') return <Pantalla><Volver a="/e/inscripciones">Inscripciones</Volver><Aviso>Esta inscripción ya fue {n.estado === 'activo' ? 'aprobada' : 'resuelta'}.</Aviso><Boton onClick={() => nav(`/e/nino/${n.id}`)}>Ver ficha</Boton></Pantalla>;
  const c = catPorId.get(cat);
  const ocupados = activos.filter((x) => x.categoriaId === cat).length;
  const valorDesc = c && desc?.valor ? valorDescuento(c.valorMensual, desc) : 0;

  async function aprobar() {
    if (!c || !usuario) return;
    setOcupado(true);
    try {
      const datos = {
        estado: 'activo' as const, categoriaId: cat, fechaInscripcion: fecha, historialCategorias: [{ categoriaId: cat, desde: fecha }],
        descuento: desc?.valor ? JSON.parse(JSON.stringify({ ...desc, motivo: desc.motivo || 'Descuento' })) : null, actualizadoEn: ahoraIso(),
      };
      await actualizar('ninos', n!.id, datos);
      await asegurarPagoVigente({ ...n!, ...datos }, c, config, usuario.uid);
      toast(`${n!.nombres} aprobado en ${c.nombre}. Se avisó a la familia.`);
      nav(`/e/nino/${n!.id}`, { replace: true });
    } catch (e) { toast(mensajeError(e), 'error'); }
    setOcupado(false);
  }
  async function confirmarRechazo() {
    try {
      await actualizar('ninos', n!.id, { estado: 'rechazado', motivoRechazo: motivo.trim(), actualizadoEn: ahoraIso() });
      toast('Inscripción rechazada. Se avisó a la familia.');
      nav('/e/inscripciones', { replace: true });
    } catch (e) { toast(mensajeError(e), 'error'); }
  }
  async function verDoc(d: Documento) { try { window.open(await urlArchivo(d.ruta), '_blank'); } catch (e) { toast(mensajeError(e), 'error'); } }

  return (
    <Pantalla>
      <Volver a="/e/inscripciones">Inscripciones</Volver>
      <div className="flex items-center gap-4">
        <div className="w-[76px] h-[76px] rounded-3xl overflow-hidden border-2 border-ambar rayado flex items-center justify-center shrink-0">{foto ? <img src={foto} alt="" className="w-full h-full object-cover" /> : <Avatar ini={iniNino(n)} tam={56} fondo="transparent" />}</div>
        <div><div className="titulo text-[24px]">{n.nombres} {n.apellidos}</div><div className="text-[13px] text-suave">{edadTexto(n.fechaNacimiento)} · {n.sexo === 'F' ? 'Niña' : 'Niño'} · {fechaCorta(n.fechaNacimiento)}</div></div>
      </div>
      <Tarjeta>
        <Kicker>Datos enviados</Kicker>
        <Fila k="Documento" v={`${n.tipoDocumento} ${n.numeroDocumento}`} />
        <Fila k="Talla uniforme" v={n.tallaUniforme} />
        <Fila k="Acudiente" v={n.acudientes.map((a) => `${a.nombre} (${a.parentesco})`).join(', ')} />
        {n.contactos.map((x, i) => <Fila key={i} k={x.nombre} v={`${x.telefono}${x.esEmergencia ? ' · emergencia' : ''}`} />)}
        <Fila k="Seguro" v={`${n.seguroMedico.tipo} ${n.seguroMedico.entidad} · ${n.seguroMedico.numeroAfiliacion}`} />
        <Fila k="Sangre" v={n.salud.tipoSangre} /><Fila k="Alergias" v={n.salud.alergias} /><Fila k="Condiciones" v={n.salud.condicionesMedicas} />
        <Fila k="Medicamentos" v={n.salud.medicamentos} /><Fila k="Restricciones" v={n.salud.restriccionesActividad} />
        <Fila k="Uso de imagen" v={n.consentimientos.usoImagen.autorizado ? 'Autorizado' : 'No autorizado'} />
        {n.documentos.map((d) => <Fila key={d.ruta} k={d.tipo} v={<button className="bg-transparent border-0 text-azul cursor-pointer p-0" onClick={() => verDoc(d)}>Ver</button>} />)}
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Aprobación</Kicker>
        <Etiqueta texto="Categoría" ayuda={sugerida ? `Sugerida por edad: ${sugerida.nombre}` : 'Ninguna categoría coincide con su edad'}>
          <Selector value={cat} onChange={(e) => setCat(e.target.value)}>{categorias.filter((x) => x.activa).map((x) => <option key={x.id} value={x.id}>{x.nombre} · {x.rangoEdad.min}–{x.rangoEdad.max} años · {cop(x.valorMensual)}</option>)}</Selector>
        </Etiqueta>
        {c?.cupoMaximo && ocupados >= c.cupoMaximo && <Aviso tono="alerta">{c.nombre} ya tiene {ocupados} niños (cupo {c.cupoMaximo}).</Aviso>}
        <Etiqueta texto="Fecha de inscripción" ayuda="Define el día de cobro mensual."><Campo type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Etiqueta>
        <span className="text-xs font-bold text-tenue">Descuento (opcional)</span>
        <EditorDescuento valor={desc} onCambio={setDesc} />
        {c && <div className="text-sm">Mensualidad: <b>{cop(c.valorMensual - valorDesc)}</b>{valorDesc ? <span className="text-tenue"> ({cop(c.valorMensual)} − {cop(valorDesc)})</span> : null}</div>}
      </Tarjeta>
      <div className="flex gap-2">
        <Boton variante="secundario" className="flex-1 !text-rojo" icono={<X weight="bold" />} onClick={() => setRechazar(true)}>Rechazar</Boton>
        <Boton className="flex-[1.6]" alto="lg" icono={<Check weight="bold" />} onClick={aprobar} cargando={ocupado}>Aprobar</Boton>
      </div>
      <Hoja abierta={rechazar} onCerrar={() => setRechazar(false)} titulo="Rechazar inscripción" sub="La familia verá el motivo.">
        <Campo value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. No hay cupo en este momento" />
        <Boton variante="peligro" onClick={confirmarRechazo}>Rechazar</Boton>
      </Hoja>
    </Pantalla>
  );
}
