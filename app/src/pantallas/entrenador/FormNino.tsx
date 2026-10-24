// Crear (RF-E05) o editar (RF-E07) un niño directamente desde el entrenador.
import { Plus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ahoraIso, edadTexto, hoy, normalizarCorreo, type Contacto, type Nino, type Salud, type SeguroMedico, type Sexo,
} from '@pa/shared';
import { actualizar, guardar as guardarDoc, idNuevo, limpio, useConfiguracion } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, Casilla, Etiqueta, Kicker, Selector, Tarjeta, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useEntrenador } from './contexto';
import { asegurarPagoVigente } from './acciones';

export function FormNino() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const config = useConfiguracion();
  const { porId, categorias, catPorId } = useEntrenador();
  const actual = id ? porId.get(id) : undefined;

  const [b, setB] = useState({
    nombres: actual?.nombres ?? '', apellidos: actual?.apellidos ?? '', fechaNacimiento: actual?.fechaNacimiento ?? '', sexo: (actual?.sexo ?? '') as Sexo | '',
    tipoDocumento: actual?.tipoDocumento ?? 'RC', numeroDocumento: actual?.numeroDocumento ?? '', tallaUniforme: actual?.tallaUniforme ?? config.tallasUniforme[0], tallaCalzado: actual?.tallaCalzado ?? '',
    categoriaId: actual?.categoriaId ?? categorias[0]?.id ?? '', fechaInscripcion: actual?.fechaInscripcion ?? hoy(),
  });
  const [contactos, setContactos] = useState<Contacto[]>(actual?.contactos ?? [{ nombre: '', parentesco: 'Madre', telefono: '', esEmergencia: true, puedeRecoger: true }]);
  const [seguro, setSeguro] = useState<SeguroMedico>(actual?.seguroMedico ?? { tipo: 'EPS', entidad: '', numeroAfiliacion: '' });
  const [salud, setSalud] = useState<Salud>(actual?.salud ?? { tipoSangre: 'O+', alergias: 'Ninguna', condicionesMedicas: 'Ninguna', medicamentos: 'Ninguno', restriccionesActividad: 'Ninguna' });
  const [cons, setCons] = useState({ datos: actual?.consentimientos.tratamientoDatos.autorizado ?? false, imagen: actual?.consentimientos.usoImagen.autorizado ?? false, actividad: actual?.consentimientos.actividadFisica.autorizado ?? false });
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k: keyof typeof b) => (e: { target: { value: string } }) => setB({ ...b, [k]: e.target.value });

  async function guardar() {
    setError('');
    if (!b.nombres.trim() || !b.apellidos.trim() || !b.fechaNacimiento || !b.sexo || !b.numeroDocumento.trim()) return setError('Completa nombre, nacimiento, sexo y documento.');
    if (!actual && !b.categoriaId) return setError('Asigna una categoría.');
    if (contactos.some((c) => !c.nombre.trim() || !c.telefono.trim())) return setError('Completa nombre y teléfono de cada contacto.');
    if (!actual && (!cons.datos || !cons.actividad)) return setError('Para crear el niño necesitas la autorización de datos y de actividad física (firmada en papel o confirmada por el acudiente).');
    setGuardando(true);
    try {
      const t = ahoraIso();
      const c = (autorizado: boolean, previo?: { autorizado: boolean; fecha: string; version: string; firmante: string }) =>
        previo && previo.autorizado === autorizado ? previo : { autorizado, fecha: hoy(), version: config.versionTerminos, firmante: 'Registrado por el entrenador' };
      const comun = {
        nombres: b.nombres.trim(), apellidos: b.apellidos.trim(), fechaNacimiento: b.fechaNacimiento, sexo: b.sexo as Sexo,
        tipoDocumento: b.tipoDocumento, numeroDocumento: b.numeroDocumento.trim(), tallaUniforme: b.tallaUniforme, tallaCalzado: b.tallaCalzado,
        contactos, seguroMedico: seguro, salud,
        consentimientos: {
          tratamientoDatos: c(cons.datos, actual?.consentimientos.tratamientoDatos), usoImagen: c(cons.imagen, actual?.consentimientos.usoImagen),
          actividadFisica: c(cons.actividad, actual?.consentimientos.actividadFisica),
        },
        actualizadoEn: t,
      };
      if (actual) {
        await actualizar('ninos', actual.id, limpio(comun));
        toast('Datos actualizados');
        nav(`/e/nino/${actual.id}`, { replace: true });
      } else {
        const nid = idNuevo('ninos');
        const nino: Omit<Nino, 'id'> = limpio({
          ...comun, acudientesIds: [], acudientes: [], documentos: [], categoriaId: b.categoriaId, fechaInscripcion: b.fechaInscripcion,
          estado: 'activo' as const, historialCategorias: [{ categoriaId: b.categoriaId, desde: b.fechaInscripcion }], descuento: null,
          creadoEn: t, creadoPor: usuario!.uid,
        });
        await guardarDoc('ninos', { ...nino, id: nid });
        await asegurarPagoVigente({ ...nino, id: nid }, catPorId.get(b.categoriaId)!, config, usuario!.uid);
        if (correo.includes('@')) {
          await guardarDoc('invitaciones', { id: idNuevo('invitaciones'), correo: normalizarCorreo(correo), ninosIds: [nid], parentesco: contactos[0]?.parentesco || 'Otro', invitadoPor: usuario!.uid, estado: 'pendiente', creadoEn: t, actualizadoEn: t, creadoPor: usuario!.uid });
        }
        toast(`${nino.nombres} fue creado${correo.includes('@') ? '. Quedará vinculado cuando el acudiente se registre con ese correo.' : ''}`);
        nav(`/e/nino/${nid}`, { replace: true });
      }
    } catch (e) { setError(mensajeError(e)); }
    setGuardando(false);
  }

  return (
    <Pantalla>
      <Volver>Volver</Volver>
      <div className="titulo text-[28px]">{actual ? `Editar a ${actual.nombres}` : 'Nuevo niño'}</div>
      {!actual && <Aviso>Úsalo si la familia no puede registrarse sola. Si escribes el correo del acudiente, podrá ver el perfil cuando cree su cuenta con ese correo.</Aviso>}
      <Tarjeta className="gap-3">
        <Kicker>Datos del niño</Kicker>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Nombres"><Campo value={b.nombres} onChange={set('nombres')} /></Etiqueta>
          <Etiqueta texto="Apellidos"><Campo value={b.apellidos} onChange={set('apellidos')} /></Etiqueta>
          <Etiqueta texto="Nacimiento" ayuda={b.fechaNacimiento ? edadTexto(b.fechaNacimiento) : undefined}><Campo type="date" value={b.fechaNacimiento} onChange={set('fechaNacimiento')} /></Etiqueta>
          <Etiqueta texto="Sexo"><Selector value={b.sexo} onChange={set('sexo')}><option value="">—</option><option value="F">Femenino</option><option value="M">Masculino</option></Selector></Etiqueta>
          <Etiqueta texto="Tipo doc."><Selector value={b.tipoDocumento} onChange={set('tipoDocumento')}>{['RC', 'NUIP', 'TI', 'PA', 'PPT'].map((x) => <option key={x}>{x}</option>)}</Selector></Etiqueta>
          <Etiqueta texto="Número"><Campo value={b.numeroDocumento} onChange={set('numeroDocumento')} /></Etiqueta>
          <Etiqueta texto="Talla uniforme"><Selector value={b.tallaUniforme} onChange={set('tallaUniforme')}>{config.tallasUniforme.map((x) => <option key={x}>{x}</option>)}</Selector></Etiqueta>
          <Etiqueta texto="Calzado"><Campo value={b.tallaCalzado} onChange={set('tallaCalzado')} /></Etiqueta>
          {!actual && <>
            <Etiqueta texto="Categoría"><Selector value={b.categoriaId} onChange={set('categoriaId')}>{categorias.filter((c) => c.activa).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Selector></Etiqueta>
            <Etiqueta texto="Inscripción"><Campo type="date" value={b.fechaInscripcion} onChange={set('fechaInscripcion')} /></Etiqueta>
            <Etiqueta texto="Correo del acudiente (opcional)" className="col-span-2"><Campo type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} /></Etiqueta>
          </>}
        </div>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Contactos</Kicker>
        {contactos.map((c, i) => (
          <div key={i} className="flex flex-col gap-2 pb-3 border-b border-white/[0.06]">
            <div className="flex gap-2"><Campo placeholder="Nombre" value={c.nombre} onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} />
              {contactos.length > 1 && <button onClick={() => setContactos(contactos.filter((_, j) => j !== i))} className="bg-transparent border-0 text-rojo cursor-pointer px-2" aria-label="Quitar"><Trash weight="bold" /></button>}</div>
            <div className="grid grid-cols-2 gap-2">
              <Campo placeholder="Parentesco" value={c.parentesco} onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, parentesco: e.target.value } : x)))} />
              <Campo placeholder="Teléfono" value={c.telefono} onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, telefono: e.target.value } : x)))} />
            </div>
            <div className="flex gap-4">
              <Casilla activo={c.esEmergencia} onCambio={(v) => setContactos(contactos.map((x, j) => (j === i ? { ...x, esEmergencia: v } : x)))}>Emergencia</Casilla>
              <Casilla activo={c.puedeRecoger} onCambio={(v) => setContactos(contactos.map((x, j) => (j === i ? { ...x, puedeRecoger: v } : x)))}>Puede recoger</Casilla>
            </div>
          </div>
        ))}
        <Boton variante="punteado" className="h-11" icono={<Plus weight="bold" />} onClick={() => setContactos([...contactos, { nombre: '', parentesco: '', telefono: '', esEmergencia: false, puedeRecoger: false }])}>Agregar contacto</Boton>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Seguro médico</Kicker>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Tipo"><Selector value={seguro.tipo} onChange={(e) => setSeguro({ ...seguro, tipo: e.target.value as SeguroMedico['tipo'] })}>{['EPS', 'Prepagada', 'Póliza estudiantil', 'Otro'].map((x) => <option key={x}>{x}</option>)}</Selector></Etiqueta>
          <Etiqueta texto="Entidad"><Campo value={seguro.entidad} onChange={(e) => setSeguro({ ...seguro, entidad: e.target.value })} /></Etiqueta>
          <Etiqueta texto="Afiliación"><Campo value={seguro.numeroAfiliacion} onChange={(e) => setSeguro({ ...seguro, numeroAfiliacion: e.target.value })} /></Etiqueta>
          <Etiqueta texto="Teléfono"><Campo value={seguro.telefonoEntidad ?? ''} onChange={(e) => setSeguro({ ...seguro, telefonoEntidad: e.target.value })} /></Etiqueta>
        </div>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Salud</Kicker>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Sangre"><Selector value={salud.tipoSangre} onChange={(e) => setSalud({ ...salud, tipoSangre: e.target.value })}>{['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'No sé'].map((x) => <option key={x}>{x}</option>)}</Selector></Etiqueta>
          <Etiqueta texto="Alergias"><Campo value={salud.alergias} onChange={(e) => setSalud({ ...salud, alergias: e.target.value })} /></Etiqueta>
          <Etiqueta texto="Condiciones"><Campo value={salud.condicionesMedicas} onChange={(e) => setSalud({ ...salud, condicionesMedicas: e.target.value })} /></Etiqueta>
          <Etiqueta texto="Medicamentos"><Campo value={salud.medicamentos} onChange={(e) => setSalud({ ...salud, medicamentos: e.target.value })} /></Etiqueta>
          <Etiqueta texto="Restricciones" className="col-span-2"><Campo value={salud.restriccionesActividad} onChange={(e) => setSalud({ ...salud, restriccionesActividad: e.target.value })} /></Etiqueta>
        </div>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Autorizaciones</Kicker>
        <Casilla activo={cons.datos} onCambio={(v) => setCons({ ...cons, datos: v })}>Tratamiento de datos</Casilla>
        <Casilla activo={cons.actividad} onCambio={(v) => setCons({ ...cons, actividad: v })}>Actividad física</Casilla>
        <Casilla activo={cons.imagen} onCambio={(v) => setCons({ ...cons, imagen: v })}>Uso de imagen (fotos y videos)</Casilla>
      </Tarjeta>
      {error && <Aviso tono="error">{error}</Aviso>}
      <Boton alto="lg" onClick={guardar} cargando={guardando}>{actual ? 'Guardar cambios' : 'Crear niño'}</Boton>
    </Pantalla>
  );
}
