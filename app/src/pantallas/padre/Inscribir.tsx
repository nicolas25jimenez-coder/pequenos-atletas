// Asistente de inscripción en 7 pasos (RF-P06 a RF-P09).
import { Camera, Check, FilePlus, Plus, Trash } from '@phosphor-icons/react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ahoraIso, edadTexto, hoy, type Contacto, type Documento, type Nino, type SeguroMedico, type Salud, type Sexo,
} from '@pa/shared';
import { db } from '../../lib/firebase';
import { useConfiguracion, idNuevo } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { extension, subirArchivo } from '../../lib/archivos';
import { mensajeError } from '../../lib/errores';
import { AreaTexto, Aviso, Boton, Campo, Casilla, COLOR, Etiqueta, Selector, Tarjeta, Volver, useToast, cx } from '../../ui/base';
import { Pantalla } from '../../ui/marco';

const PASOS = ['Niño', 'Uniforme', 'Contactos', 'Seguro', 'Salud', 'Documentos', 'Autorizaciones'];
const SANGRE = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'No sé'];

interface Archivos { foto?: File; carnet?: File; identidad?: File; certificado?: File }

export function Inscribir() {
  const nav = useNavigate();
  const toast = useToast();
  const config = useConfiguracion();
  const { perfil, usuario } = useSesion();
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [archivos, setArchivos] = useState<Archivos>({});

  const [nino, setNino] = useState({ nombres: '', apellidos: '', fechaNacimiento: '', sexo: '' as Sexo | '', tipoDocumento: 'RC', numeroDocumento: '', tallaUniforme: '', tallaCalzado: '' });
  const [contactos, setContactos] = useState<Contacto[]>([
    { nombre: `${perfil?.nombres ?? ''} ${perfil?.apellidos ?? ''}`.trim(), parentesco: perfil?.parentesco ?? 'Madre', telefono: perfil?.telefono ?? '', esEmergencia: true, puedeRecoger: true },
  ]);
  const [seguro, setSeguro] = useState<SeguroMedico>({ tipo: 'EPS', entidad: '', numeroAfiliacion: '', telefonoEntidad: '' });
  const [salud, setSalud] = useState<Salud>({ tipoSangre: '', alergias: '', condicionesMedicas: '', medicamentos: '', restriccionesActividad: '', observaciones: '' });
  const [cons, setCons] = useState({ datos: false, imagen: null as boolean | null, actividad: false });

  const setN = (k: keyof typeof nino) => (e: { target: { value: string } }) => setNino({ ...nino, [k]: e.target.value });

  function validar(): string {
    if (paso === 0) {
      if (!nino.nombres.trim() || !nino.apellidos.trim()) return 'Escribe el nombre completo del niño.';
      if (!nino.fechaNacimiento || nino.fechaNacimiento > hoy()) return 'Escribe una fecha de nacimiento válida.';
      if (!nino.sexo) return 'Selecciona el sexo (se usa para las tablas de crecimiento de la OMS).';
      if (!nino.numeroDocumento.trim()) return 'Escribe el número de documento.';
    }
    if (paso === 1 && !nino.tallaUniforme) return 'Selecciona la talla de uniforme.';
    if (paso === 2) {
      if (contactos.some((c) => !c.nombre.trim() || !c.telefono.trim())) return 'Completa el nombre y teléfono de cada contacto.';
      if (!contactos.some((c) => c.esEmergencia)) return 'Marca al menos un contacto de emergencia.';
    }
    if (paso === 3 && (!seguro.entidad.trim() || !seguro.numeroAfiliacion.trim())) return 'Completa la entidad y el número de afiliación.';
    if (paso === 4 && !salud.tipoSangre) return 'Selecciona el tipo de sangre (o "No sé").';
    if (paso === 6) {
      if (!cons.datos || !cons.actividad) return 'Las autorizaciones de tratamiento de datos y de actividad física son necesarias para la inscripción.';
      if (cons.imagen === null) return 'Indica si autorizas o no el uso de imagen.';
    }
    return '';
  }

  function siguiente() {
    const e = validar();
    setError(e);
    if (e) return;
    if (paso < PASOS.length - 1) { setPaso(paso + 1); window.scrollTo(0, 0); } else enviar();
  }

  async function enviar() {
    if (!usuario) return;
    setEnviando(true);
    try {
      const id = idNuevo('ninos');
      const t = ahoraIso();
      const firmante = `${perfil?.nombres} ${perfil?.apellidos}`;
      const c = (autorizado: boolean) => ({ autorizado, fecha: hoy(), version: config.versionTerminos, firmante });
      const datos: Omit<Nino, 'id'> = {
        nombres: nino.nombres.trim(), apellidos: nino.apellidos.trim(), fechaNacimiento: nino.fechaNacimiento, sexo: nino.sexo as Sexo,
        tipoDocumento: nino.tipoDocumento, numeroDocumento: nino.numeroDocumento.trim(), tallaUniforme: nino.tallaUniforme,
        ...(nino.tallaCalzado ? { tallaCalzado: nino.tallaCalzado } : {}),
        acudientesIds: [usuario.uid],
        acudientes: [{ usuarioId: usuario.uid, nombre: firmante, parentesco: perfil?.parentesco ?? 'Otro', esPrincipal: true }],
        contactos: contactos.map((x) => ({ ...x, nombre: x.nombre.trim(), telefono: x.telefono.trim() })),
        seguroMedico: { ...seguro, entidad: seguro.entidad.trim(), numeroAfiliacion: seguro.numeroAfiliacion.trim() },
        salud: {
          tipoSangre: salud.tipoSangre, alergias: salud.alergias.trim() || 'Ninguna', condicionesMedicas: salud.condicionesMedicas.trim() || 'Ninguna',
          medicamentos: salud.medicamentos.trim() || 'Ninguno', restriccionesActividad: salud.restriccionesActividad.trim() || 'Ninguna', observaciones: salud.observaciones?.trim() ?? '',
        },
        documentos: [],
        consentimientos: { tratamientoDatos: c(cons.datos), usoImagen: c(!!cons.imagen), actividadFisica: c(cons.actividad) },
        estado: 'pendiente_aprobacion',
        creadoEn: t, actualizadoEn: t, creadoPor: usuario.uid,
      };
      await setDoc(doc(db, 'ninos', id), datos);

      // Archivos (las reglas los permiten mientras la inscripción está pendiente)
      const cambios: Partial<Nino> = {};
      const docs: Documento[] = [];
      if (archivos.foto) cambios.fotoRuta = await subirArchivo(`ninos/${id}/foto.jpg`, archivos.foto);
      const sube = async (f: File | undefined, tipo: Documento['tipo'], clave: string) => {
        if (!f) return;
        const ruta = await subirArchivo(`ninos/${id}/documentos/${clave}-${Date.now()}.${extension(f)}`, f);
        docs.push({ tipo, nombre: f.name, ruta, fecha: hoy() });
      };
      await sube(archivos.identidad, 'Identidad', 'identidad');
      await sube(archivos.carnet, 'Carné de seguro', 'carnet');
      await sube(archivos.certificado, 'Certificado médico', 'certificado');
      if (docs.length) cambios.documentos = docs;
      if (Object.keys(cambios).length) await updateDoc(doc(db, 'ninos', id), { ...cambios, actualizadoEn: ahoraIso() });

      toast(`Inscripción de ${datos.nombres} enviada. El entrenador la revisará pronto.`);
      nav('/p', { replace: true });
    } catch (e) {
      setError(mensajeError(e));
    }
    setEnviando(false);
  }

  return (
    <Pantalla conNav={false} className="pb-12">
      <Volver a={paso === 0 ? undefined : undefined}>{paso === 0 ? 'Cancelar' : 'Salir'}</Volver>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-tenue">Paso {paso + 1} de {PASOS.length}</span>
        <div className="titulo text-[28px]">Inscripción · <span className="text-verde">{PASOS[paso]}</span></div>
      </div>
      <div className="flex gap-1">{PASOS.map((_, i) => <span key={i} className="flex-1 h-1 rounded-sm" style={{ background: i <= paso ? COLOR.verde : '#2A3142' }} />)}</div>

      {paso === 0 && (
        <div className="flex flex-col gap-3">
          <SelectorFoto archivo={archivos.foto} onCambio={(f) => setArchivos({ ...archivos, foto: f })} />
          <div className="grid grid-cols-2 gap-2.5">
            <Etiqueta texto="Nombres"><Campo value={nino.nombres} onChange={setN('nombres')} /></Etiqueta>
            <Etiqueta texto="Apellidos"><Campo value={nino.apellidos} onChange={setN('apellidos')} /></Etiqueta>
            <Etiqueta texto="Fecha de nacimiento" ayuda={nino.fechaNacimiento ? edadTexto(nino.fechaNacimiento) : undefined}>
              <Campo type="date" value={nino.fechaNacimiento} max={hoy()} onChange={setN('fechaNacimiento')} />
            </Etiqueta>
            <Etiqueta texto="Sexo">
              <Selector value={nino.sexo} onChange={setN('sexo')}><option value="">Seleccionar</option><option value="F">Femenino</option><option value="M">Masculino</option></Selector>
            </Etiqueta>
            <Etiqueta texto="Tipo de documento">
              <Selector value={nino.tipoDocumento} onChange={setN('tipoDocumento')}><option value="RC">Registro civil</option><option value="NUIP">NUIP</option><option value="TI">Tarjeta de identidad</option><option value="PA">Pasaporte</option><option value="PPT">PPT</option></Selector>
            </Etiqueta>
            <Etiqueta texto="Número"><Campo value={nino.numeroDocumento} onChange={setN('numeroDocumento')} inputMode="numeric" /></Etiqueta>
          </div>
        </div>
      )}

      {paso === 1 && (
        <div className="flex flex-col gap-3">
          <Etiqueta texto="Talla de uniforme">
            <div className="grid grid-cols-4 gap-2">
              {config.tallasUniforme.map((t) => (
                <button key={t} onClick={() => setNino({ ...nino, tallaUniforme: t })}
                  className={cx('h-14 rounded-2xl text-lg font-extrabold cursor-pointer border', nino.tallaUniforme === t ? 'bg-verde text-tinta border-verde' : 'bg-sup text-texto border-white/10')}>{t}</button>
              ))}
            </div>
          </Etiqueta>
          <Etiqueta texto="Talla de calzado (opcional)"><Campo value={nino.tallaCalzado} onChange={setN('tallaCalzado')} inputMode="numeric" placeholder="Ej. 28" /></Etiqueta>
        </div>
      )}

      {paso === 2 && (
        <div className="flex flex-col gap-3">
          <div className="text-[13px] text-suave">Agrega a los acudientes, el contacto de emergencia y las personas autorizadas para recoger al niño.</div>
          {contactos.map((c, i) => (
            <Tarjeta key={i} className="gap-2.5">
              <div className="flex justify-between items-center"><span className="kicker">Contacto {i + 1}</span>
                {contactos.length > 1 && <button onClick={() => setContactos(contactos.filter((_, j) => j !== i))} className="bg-transparent border-0 text-rojo cursor-pointer p-1" aria-label="Quitar"><Trash weight="bold" /></button>}
              </div>
              <Campo placeholder="Nombre completo" value={c.nombre} onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} />
              <div className="grid grid-cols-2 gap-2.5">
                <Campo placeholder="Parentesco" value={c.parentesco} onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, parentesco: e.target.value } : x)))} />
                <Campo placeholder="Teléfono" type="tel" value={c.telefono} onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, telefono: e.target.value } : x)))} />
              </div>
              <Casilla activo={c.esEmergencia} onCambio={(v) => setContactos(contactos.map((x, j) => (j === i ? { ...x, esEmergencia: v } : x)))}>Contacto de emergencia</Casilla>
              <Casilla activo={c.puedeRecoger} onCambio={(v) => setContactos(contactos.map((x, j) => (j === i ? { ...x, puedeRecoger: v } : x)))}>Puede recoger al niño</Casilla>
            </Tarjeta>
          ))}
          <Boton variante="punteado" alto="md" icono={<Plus weight="bold" />} className="h-12"
            onClick={() => setContactos([...contactos, { nombre: '', parentesco: '', telefono: '', esEmergencia: false, puedeRecoger: false }])}>Agregar contacto</Boton>
        </div>
      )}

      {paso === 3 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            <Etiqueta texto="Tipo">
              <Selector value={seguro.tipo} onChange={(e) => setSeguro({ ...seguro, tipo: e.target.value as SeguroMedico['tipo'] })}>
                <option>EPS</option><option>Prepagada</option><option>Póliza estudiantil</option><option>Otro</option>
              </Selector>
            </Etiqueta>
            <Etiqueta texto="Entidad"><Campo value={seguro.entidad} onChange={(e) => setSeguro({ ...seguro, entidad: e.target.value })} placeholder="Ej. Sanitas EPS" /></Etiqueta>
            <Etiqueta texto="Número de afiliación"><Campo value={seguro.numeroAfiliacion} onChange={(e) => setSeguro({ ...seguro, numeroAfiliacion: e.target.value })} /></Etiqueta>
            <Etiqueta texto="Teléfono de la entidad"><Campo value={seguro.telefonoEntidad} onChange={(e) => setSeguro({ ...seguro, telefonoEntidad: e.target.value })} type="tel" placeholder="Opcional" /></Etiqueta>
          </div>
          <SelectorArchivo etiqueta="Foto del carné (opcional)" archivo={archivos.carnet} onCambio={(f) => setArchivos({ ...archivos, carnet: f })} />
        </div>
      )}

      {paso === 4 && (
        <div className="flex flex-col gap-3">
          <Etiqueta texto="Tipo de sangre">
            <div className="grid grid-cols-5 gap-2">
              {SANGRE.map((s) => (
                <button key={s} onClick={() => setSalud({ ...salud, tipoSangre: s })}
                  className={cx('h-12 rounded-2xl text-sm font-extrabold cursor-pointer border', salud.tipoSangre === s ? 'bg-verde text-tinta border-verde' : 'bg-sup text-texto border-white/10', s === 'No sé' && 'col-span-2')}>{s}</button>
              ))}
            </div>
          </Etiqueta>
          <Etiqueta texto="Alergias"><Campo value={salud.alergias} onChange={(e) => setSalud({ ...salud, alergias: e.target.value })} placeholder="Ninguna" /></Etiqueta>
          <Etiqueta texto="Condiciones médicas"><Campo value={salud.condicionesMedicas} onChange={(e) => setSalud({ ...salud, condicionesMedicas: e.target.value })} placeholder="Ninguna (ej. asma)" /></Etiqueta>
          <Etiqueta texto="Medicamentos"><Campo value={salud.medicamentos} onChange={(e) => setSalud({ ...salud, medicamentos: e.target.value })} placeholder="Ninguno" /></Etiqueta>
          <Etiqueta texto="Restricciones de actividad física"><Campo value={salud.restriccionesActividad} onChange={(e) => setSalud({ ...salud, restriccionesActividad: e.target.value })} placeholder="Ninguna" /></Etiqueta>
          <Etiqueta texto="Observaciones"><AreaTexto value={salud.observaciones} onChange={(e) => setSalud({ ...salud, observaciones: e.target.value })} placeholder="Algo más que el entrenador deba saber" /></Etiqueta>
        </div>
      )}

      {paso === 5 && (
        <div className="flex flex-col gap-3">
          <div className="text-[13px] text-suave">Puedes subir los documentos ahora o entregarlos después al entrenador. Fotos o PDF, máximo 5 MB.</div>
          <SelectorArchivo etiqueta="Documento de identidad del niño" archivo={archivos.identidad} onCambio={(f) => setArchivos({ ...archivos, identidad: f })} />
          <SelectorArchivo etiqueta="Certificado médico" archivo={archivos.certificado} onCambio={(f) => setArchivos({ ...archivos, certificado: f })} />
        </div>
      )}

      {paso === 6 && (
        <div className="flex flex-col gap-3.5">
          <Tarjeta className="gap-3">
            <Casilla activo={cons.datos} onCambio={(v) => setCons({ ...cons, datos: v })}>
              <b className="text-texto">Tratamiento de datos (obligatorio).</b> Como representante legal autorizo el tratamiento de los datos personales y de salud de mi hijo conforme a la Ley 1581 de 2012 y la <a href="/terminos" target="_blank" className="text-azul">política de datos</a>.
            </Casilla>
            <Casilla activo={cons.actividad} onCambio={(v) => setCons({ ...cons, actividad: v })}>
              <b className="text-texto">Actividad física (obligatorio).</b> Autorizo a mi hijo a participar en las actividades deportivas y declaro que la información de salud es verdadera.
            </Casilla>
          </Tarjeta>
          <Tarjeta className="gap-3">
            <div className="text-sm"><b>Uso de imagen (opcional).</b> <span className="text-suave">¿Autorizas tomar fotos y videos de tu hijo durante las pruebas para mostrar su progreso en la app?</span></div>
            <div className="grid grid-cols-2 gap-2">
              <Boton variante={cons.imagen === true ? 'primario' : 'secundario'} onClick={() => setCons({ ...cons, imagen: true })}>Sí, autorizo</Boton>
              <Boton variante={cons.imagen === false ? 'claro' : 'secundario'} onClick={() => setCons({ ...cons, imagen: false })}>No autorizo</Boton>
            </div>
          </Tarjeta>
          <Resumen>
            <b>{nino.nombres} {nino.apellidos}</b> · {nino.fechaNacimiento && edadTexto(nino.fechaNacimiento)} · Talla {nino.tallaUniforme}<br />
            {contactos.length} contacto(s) · {seguro.tipo} {seguro.entidad} · Sangre {salud.tipoSangre}
          </Resumen>
        </div>
      )}

      {error && <Aviso tono="error">{error}</Aviso>}
      <div className="flex gap-2">
        {paso > 0 && <Boton variante="secundario" className="flex-1" onClick={() => { setError(''); setPaso(paso - 1); }}>Atrás</Boton>}
        <Boton className="flex-[1.6]" alto="lg" onClick={siguiente} cargando={enviando} icono={paso === PASOS.length - 1 ? <Check weight="bold" /> : undefined}>
          {paso === PASOS.length - 1 ? 'Enviar inscripción' : 'Continuar'}
        </Boton>
      </div>
    </Pantalla>
  );
}

function Resumen({ children }: { children: ReactNode }) {
  return <div className="text-[13px] text-suave leading-normal px-3.5 py-3 rounded-2xl bg-sup2">{children}</div>;
}

function SelectorFoto({ archivo, onCambio }: { archivo?: File; onCambio: (f?: File) => void }) {
  const url = archivo ? URL.createObjectURL(archivo) : null;
  return (
    <label className="flex items-center gap-4 cursor-pointer">
      <span className="w-[76px] h-[76px] rounded-3xl border-2 border-dashed border-verde/60 overflow-hidden flex items-center justify-center text-verde shrink-0">
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <Camera size={26} weight="bold" />}
      </span>
      <span className="text-sm"><b>Foto del niño</b><br /><span className="text-tenue text-[13px]">Opcional · para que el entrenador lo identifique</span></span>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => onCambio(e.target.files?.[0])} />
    </label>
  );
}

export function SelectorArchivo({ etiqueta, archivo, onCambio, aceptar = 'image/*,application/pdf' }: { etiqueta: string; archivo?: File; onCambio: (f?: File) => void; aceptar?: string }) {
  return (
    <label className="flex items-center gap-3 px-4 py-3.5 rounded-[20px] bg-sup border border-dashed border-white/15 cursor-pointer">
      <span className="w-10 h-10 rounded-[14px] bg-azul/15 text-azul flex items-center justify-center shrink-0">{archivo ? <Check weight="bold" size={20} /> : <FilePlus weight="bold" size={20} />}</span>
      <span className="flex-1 min-w-0"><span className="text-sm font-semibold block">{etiqueta}</span><span className="text-xs text-tenue truncate block">{archivo ? archivo.name : 'Toca para elegir un archivo'}</span></span>
      <input type="file" accept={aceptar} className="hidden" onChange={(e) => onCambio(e.target.files?.[0])} />
    </label>
  );
}
