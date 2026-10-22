// Datos de ejemplo en Supabase (basados en el prototipo de design/). Borra y recrea las cuentas de demo.
// Uso: con app/.env.local completo (incluida SUPABASE_SERVICE_ROLE_KEY) → npm run seed
//
// Cuentas de prueba (contraseña de todas: Atletas2026):
//   Entrenador: entrenador@pequenosatletas.co
//   Acudiente:  carolina.rojas@ejemplo.co   (Sofía y Andrés)
//   Acudiente:  jorge.rojas@ejemplo.co      (segundo acudiente de Sofía y Andrés)
//   Acudiente con inscripción pendiente: maria.forero@ejemplo.co
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  CATALOGO_BASE, CONFIG_POR_DEFECTO, construirPago, diaSemana, edadAnios, edadMesesExacta, evaluarImc, comparar,
  fechaCobro, hoy, periodoVigente, sumarDias, sumarMeses, valorFinal,
  type Asistencia, type Categoria, type EstadoAsistencia, type Nino, type Pago, type ResultadoPrueba, type Sesion, type Sexo,
} from '../shared/src/index';

config({ path: 'app/.env.local' });
const URL = process.env.VITE_SUPABASE_URL;
const CLAVE_SECRETA = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !CLAVE_SECRETA) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en app/.env.local');
  process.exit(1);
}
const CLAVE = 'Atletas2026';
const supabase = createClient(URL, CLAVE_SECRETA, { auth: { persistSession: false, autoRefreshToken: false } });

// Colección de la app → tabla de Supabase (en orden de inserción, por las llaves foráneas).
const TABLAS: Record<string, string> = {
  usuarios: 'usuarios', configuracion: 'configuracion', categorias: 'categorias', pruebas: 'pruebas',
  plantillasControl: 'plantillas_control', mediosPago: 'medios_pago', ninos: 'ninos', sesiones: 'sesiones',
  asistencias: 'asistencias', medicionesFisicas: 'mediciones_fisicas', resultadosPruebas: 'resultados_pruebas',
  pagos: 'pagos', eventos: 'eventos', confirmacionesEvento: 'confirmaciones_evento', anuncios: 'anuncios',
  solicitudesCambio: 'solicitudes_cambio', invitaciones: 'invitaciones', notificaciones: 'notificaciones',
};

// Las cuentas se identifican en el código con un alias ('carolina'); en Supabase son uuid.
const uuids = new Map<string, string>();

// PRNG determinista para que los datos sean siempre iguales.
let semilla = 20261022;
const azar = () => { semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const entre = (a: number, b: number, dec = 2) => Math.round((a + azar() * (b - a)) * 10 ** dec) / 10 ** dec;

const HOY = hoy();
const T = `${HOY}T08:00:00-05:00`;
const aud = (uid = 'entrenador') => ({ creadoEn: T, actualizadoEn: T, creadoPor: uid });

// Se acumulan los documentos y se escriben al final, ordenados por tabla.
const filas: { coleccion: string; id: string; datos: Record<string, unknown> }[] = [];
function set(ruta: string, datos: object) {
  const [coleccion, id] = ruta.split('/');
  filas.push({ coleccion, id, datos: JSON.parse(JSON.stringify(datos)) });
}

/** Cambia los alias de cuentas por sus uuid en todo el objeto (menos el campo `rol`). */
function conUuids(v: unknown, clave = ''): unknown {
  if (typeof v === 'string') return clave !== 'rol' && uuids.has(v) ? uuids.get(v) : v;
  if (Array.isArray(v)) return v.map((x) => conUuids(x));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, conUuids(x, k)]));
  return v;
}

async function limpiar() {
  for (const t of [...Object.values(TABLAS)].reverse()) {
    const { error } = await supabase.from(t).delete().not('id', 'is', null);
    if (error) throw new Error(`No pude vaciar ${t}: ${error.message}`);
  }
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith('@ejemplo.co') || u.email === 'entrenador@pequenosatletas.co') await supabase.auth.admin.deleteUser(u.id);
  }
}

async function usuario(alias: string, correo: string, nombres: string, apellidos: string, rol: 'padre' | 'entrenador', extra: object = {}) {
  const { data, error } = await supabase.auth.admin.createUser({ email: correo, password: CLAVE, email_confirm: true, user_metadata: { nombre: `${nombres} ${apellidos}` } });
  if (error || !data.user) throw new Error(`No pude crear ${correo}: ${error?.message}`);
  uuids.set(alias, data.user.id);
  set(`usuarios/${alias}`, {
    rol, estado: 'activo', nombres, apellidos, correo, telefono: '+573105550100', tipoDocumento: 'CC',
    numeroDocumento: String(Math.floor(entre(10000000, 99999999, 0))),
    preferenciasNotificacion: { pagoRegistrado: true, inasistencia: true, resultados: true, eventos: true, solicitudes: true },
    aceptoTerminos: { fecha: T, version: CONFIG_POR_DEFECTO.versionTerminos },
    ...aud(alias), ...extra,
  });
}

// ───────── Categorías ─────────
const CATEGORIAS: Categoria[] = [
  { id: 'cachorro', nombre: 'Cachorro', descripcion: 'Niños y niñas de 5 años. Juegos de locomoción, equilibrio y manejo de balón.', rangoEdad: { min: 5, max: 5 },
    horarios: [{ diaSemana: 2, horaInicio: '15:00', horaFin: '16:00', lugar: 'Parque El Virrey' }, { diaSemana: 4, horaInicio: '15:00', horaFin: '16:00', lugar: 'Parque El Virrey' }],
    valorMensual: 120000, cupoMaximo: 12, color: '#3DDC6A', activa: true },
  { id: 'fiera', nombre: 'Fiera', descripcion: 'Niños y niñas de 4 años. Iniciación al movimiento a través del juego.', rangoEdad: { min: 4, max: 4 },
    horarios: [{ diaSemana: 2, horaInicio: '16:15', horaFin: '17:15', lugar: 'Parque El Virrey' }, { diaSemana: 4, horaInicio: '16:15', horaFin: '17:15', lugar: 'Parque El Virrey' }],
    valorMensual: 130000, cupoMaximo: 12, color: '#4F7BFF', activa: true },
  { id: 'leones', nombre: 'Leones', descripcion: 'Niños y niñas de 6 años. Circuitos predeportivos y juegos de equipo.', rangoEdad: { min: 6, max: 6 },
    horarios: [{ diaSemana: 6, horaInicio: '09:00', horaFin: '10:30', lugar: 'Parque El Virrey' }],
    valorMensual: 140000, cupoMaximo: 14, color: '#F5A524', activa: true },
];

// ───────── Niños ─────────
interface DefNino { id: string; nombres: string; apellidos: string; sexo: Sexo; nacimiento: string; cat: string; inscripcion: string; padre: string; alergias?: string; condicion?: string; talla: string; sinImagen?: boolean }
const NINOS: DefNino[] = [
  { id: 'sofia', nombres: 'Sofía', apellidos: 'Rojas Méndez', sexo: 'F', nacimiento: '2021-08-14', cat: 'cachorro', inscripcion: '2026-02-12', padre: 'carolina', talla: '6' },
  { id: 'emilio', nombres: 'Emilio', apellidos: 'Prieto Salas', sexo: 'M', nacimiento: '2021-05-03', cat: 'cachorro', inscripcion: '2026-02-03', padre: 'p_emilio', talla: '6' },
  { id: 'luciana', nombres: 'Luciana', apellidos: 'Gómez Ruiz', sexo: 'F', nacimiento: '2021-03-21', cat: 'cachorro', inscripcion: '2026-02-20', padre: 'p_luciana', condicion: 'Asma · inhalador en el bolso', talla: '6' },
  { id: 'tomas', nombres: 'Tomás', apellidos: 'Vargas León', sexo: 'M', nacimiento: '2021-07-09', cat: 'cachorro', inscripcion: '2026-03-05', padre: 'p_tomas', talla: '6', sinImagen: true },
  { id: 'mariana', nombres: 'Mariana', apellidos: 'Cruz Díaz', sexo: 'F', nacimiento: '2021-01-30', cat: 'cachorro', inscripcion: '2026-01-31', padre: 'p_mariana', talla: '6' },
  { id: 'jacobo', nombres: 'Jacobo', apellidos: 'León Ríos', sexo: 'M', nacimiento: '2021-10-11', cat: 'cachorro', inscripcion: '2026-02-15', padre: 'p_jacobo', talla: '6' },
  { id: 'sara', nombres: 'Sara', apellidos: 'Pinzón Mora', sexo: 'F', nacimiento: '2021-06-18', cat: 'cachorro', inscripcion: '2026-03-10', padre: 'p_sara', talla: '6' },
  { id: 'andres', nombres: 'Andrés', apellidos: 'Rojas Méndez', sexo: 'M', nacimiento: '2022-03-02', cat: 'fiera', inscripcion: '2026-03-18', padre: 'carolina', alergias: 'Penicilina', talla: '4' },
  { id: 'julian', nombres: 'Julián', apellidos: 'Moreno Gil', sexo: 'M', nacimiento: '2022-01-25', cat: 'fiera', inscripcion: '2026-02-08', padre: 'p_julian', alergias: 'Maní', talla: '4' },
  { id: 'valentina', nombres: 'Valentina', apellidos: 'Suárez Peña', sexo: 'F', nacimiento: '2022-05-14', cat: 'fiera', inscripcion: '2026-02-25', padre: 'p_valentina', talla: '4' },
  { id: 'samuel', nombres: 'Samuel', apellidos: 'Ortiz Vega', sexo: 'M', nacimiento: '2022-02-07', cat: 'fiera', inscripcion: '2026-03-01', padre: 'p_samuel', talla: '4' },
  { id: 'isabella', nombres: 'Isabella', apellidos: 'Torres Lara', sexo: 'F', nacimiento: '2022-04-28', cat: 'fiera', inscripcion: '2026-02-11', padre: 'p_isabella', talla: '4' },
  { id: 'martin', nombres: 'Martín', apellidos: 'Herrera Cano', sexo: 'M', nacimiento: '2022-06-02', cat: 'fiera', inscripcion: '2026-04-06', padre: 'p_martin', talla: '4' },
  { id: 'antonia', nombres: 'Antonia', apellidos: 'Beltrán Silva', sexo: 'F', nacimiento: '2022-03-19', cat: 'fiera', inscripcion: '2026-02-28', padre: 'p_antonia', talla: '4' },
  { id: 'nicolas_b', nombres: 'Nicolás', apellidos: 'Bermúdez Rey', sexo: 'M', nacimiento: '2020-09-05', cat: 'leones', inscripcion: '2026-02-07', padre: 'p_nicolas_b', talla: '8' },
  { id: 'emma', nombres: 'Emma', apellidos: 'Castro Niño', sexo: 'F', nacimiento: '2020-07-22', cat: 'leones', inscripcion: '2026-02-14', padre: 'p_emma', talla: '8' },
  { id: 'daniel', nombres: 'Daniel', apellidos: 'Acosta Pardo', sexo: 'M', nacimiento: '2020-11-12', cat: 'leones', inscripcion: '2026-03-21', padre: 'p_daniel', talla: '8' },
];

// Historial del prototipo para Sofía y Andrés en los 3 días de control.
const HIST: Record<string, Record<string, number[]>> = {
  sofia: { vel10: [3.42, 3.18, 2.96], zig: [10.4, 9.6, 9.1], salto: [72, 81, 92], equi: [6, 9, 14], viga: [5, 7, 8], rollo: [0, 1, 2], recep: [1, 2, 3], lanz: [2, 2, 2], cond: [14.2, 13.1, 12.4], patear: [1, 1, 2] },
  andres: { vel10: [3.6, 3.3, 3.05], zig: [10.9, 9.8, 9.3], salto: [70, 78, 85], equi: [3, 4, 6], viga: [3, 5, 6], rollo: [0, 1, 1], recep: [1, 2, 2], lanz: [1, 2, 3], cond: [13.5, 12, 11.2], patear: [2, 3, 4] },
};
const OBS: Record<string, Record<string, string[]>> = {
  sofia: { salto: ['Le cuesta coordinar los brazos.', 'Mejor impulso, sigue cayendo con un pie.', '¡Excelente aterrizaje con ambos pies!'], equi: ['Se distrae con facilidad.', 'Más concentrada.', 'Muy estable, mira al frente.'] },
  andres: { equi: ['Le cuesta mantener la postura.', 'Va mejorando.', 'Ya aguanta más, sigue practicando en casa.'], patear: ['Patea con la punta.', 'Usa el empeine.', 'Muy preciso con la pierna derecha.'] },
};
const MEDIDAS: Record<string, [number, number][]> = {
  sofia: [[107.2, 18.1], [108.6, 18.4], [110, 19]],
  andres: [[101.5, 16], [103, 16.6], [104.2, 17.4]],
};
const PRUEBAS_CONTROL = ['vel10', 'zig', 'salto', 'equi', 'viga', 'rollo', 'recep', 'lanz', 'cond', 'patear'];

async function main() {
  console.log('Limpiando datos anteriores…');
  await limpiar();

  console.log('Creando cuentas…');
  await usuario('entrenador', 'entrenador@pequenosatletas.co', 'Nicolás', 'Jiménez', 'entrenador', { telefono: '+573004128890' });
  await usuario('carolina', 'carolina.rojas@ejemplo.co', 'Carolina', 'Rojas', 'padre', { parentesco: 'Madre', telefono: '+573105550148' });
  await usuario('jorge', 'jorge.rojas@ejemplo.co', 'Jorge', 'Rojas', 'padre', { parentesco: 'Padre', telefono: '+573105550192' });
  await usuario('maria', 'maria.forero@ejemplo.co', 'María', 'Forero', 'padre', { parentesco: 'Madre', telefono: '+573125550111' });
  await usuario('hernan', 'hernan.nino@ejemplo.co', 'Hernán', 'Niño', 'padre', { parentesco: 'Padre', telefono: '+573135550122' });
  for (const n of NINOS.filter((x) => x.padre.startsWith('p_'))) {
    await usuario(n.padre, `acudiente.${n.id}@ejemplo.co`, 'Acudiente de', n.nombres, 'padre', { parentesco: 'Madre' });
  }

  console.log('Configuración, categorías, pruebas y medios de pago…');
  set('configuracion/general', CONFIG_POR_DEFECTO);
  for (const c of CATEGORIAS) set(`categorias/${c.id}`, { ...c, ...aud() });
  for (const p of CATALOGO_BASE) set(`pruebas/${p.id}`, { ...p, ...aud() });
  set('plantillasControl/trimestral', { nombre: 'Evaluación trimestral', pruebasIds: ['vel10', 'salto', 'equi', 'recep'], ...aud() });
  set('plantillasControl/completa', { nombre: 'Evaluación completa', pruebasIds: PRUEBAS_CONTROL, ...aud() });
  const medios = [
    { id: 'nequi', nombre: 'Nequi', iniciales: 'N', color: '#5B2A86', titular: 'Nicolás Jiménez', numero: '300 412 8890', copiable: true, instrucciones: 'Escribe el nombre del niño en el mensaje.' },
    { id: 'daviplata', nombre: 'Daviplata', iniciales: 'D', color: '#B4202A', titular: 'Nicolás Jiménez', numero: '300 412 8890', copiable: true },
    { id: 'bancolombia', nombre: 'Bancolombia · Ahorros', iniciales: 'B', color: '#B8860B', titular: 'Nicolás Jiménez · CC 80.123.456', numero: '236-458912-07', tipoCuenta: 'Ahorros', copiable: true },
    { id: 'efectivo', nombre: 'Efectivo', iniciales: '$', color: '#2A3142', titular: 'Entrégalo al entrenador antes de la sesión', numero: 'En la cancha', copiable: false },
  ];
  medios.forEach((m, i) => set(`mediosPago/${m.id}`, { ...m, activo: true, orden: i }));

  console.log('Niños…');
  const acudientes = (n: DefNino) => n.padre === 'carolina' ? ['carolina', 'jorge'] : [n.padre];
  const ninos: Nino[] = [];
  for (const n of NINOS) {
    const esRojas = n.padre === 'carolina';
    const nino: Nino = {
      id: n.id, nombres: n.nombres, apellidos: n.apellidos, fechaNacimiento: n.nacimiento, sexo: n.sexo,
      tipoDocumento: n.cat === 'leones' ? 'TI' : 'RC', numeroDocumento: `1.019.${String(Math.floor(entre(100, 999, 0)))}.${String(Math.floor(entre(100, 999, 0)))}`,
      tallaUniforme: n.talla, categoriaId: n.cat, acudientesIds: acudientes(n),
      acudientes: esRojas
        ? [{ usuarioId: 'carolina', nombre: 'Carolina Rojas', parentesco: 'Madre', esPrincipal: true }, { usuarioId: 'jorge', nombre: 'Jorge Rojas', parentesco: 'Padre', esPrincipal: false }]
        : [{ usuarioId: n.padre, nombre: `Acudiente de ${n.nombres}`, parentesco: 'Madre', esPrincipal: true }],
      contactos: esRojas
        ? [{ nombre: 'Carolina Rojas', parentesco: 'Madre', telefono: '+57 310 555 0148', esEmergencia: false, puedeRecoger: true },
           { nombre: 'Jorge Rojas', parentesco: 'Padre', telefono: '+57 310 555 0192', esEmergencia: true, puedeRecoger: true },
           { nombre: 'Marta Méndez', parentesco: 'Abuela', telefono: '+57 311 555 0177', esEmergencia: false, puedeRecoger: true }]
        : [{ nombre: `Acudiente de ${n.nombres}`, parentesco: 'Madre', telefono: '+57 310 555 0100', esEmergencia: true, puedeRecoger: true }],
      seguroMedico: { tipo: 'EPS', entidad: esRojas ? 'Sanitas EPS' : 'Compensar EPS', numeroAfiliacion: n.id === 'sofia' ? '4410229871' : n.id === 'andres' ? '4410229902' : String(Math.floor(entre(1e9, 9e9, 0))) },
      salud: { tipoSangre: 'O+', alergias: n.alergias ?? 'Ninguna', condicionesMedicas: n.condicion ?? 'Ninguna', medicamentos: n.condicion ? 'Salbutamol (inhalador)' : 'Ninguno', restriccionesActividad: 'Ninguna' },
      documentos: [],
      consentimientos: {
        tratamientoDatos: { autorizado: true, fecha: n.inscripcion, version: '2026-10', firmante: 'Acudiente principal' },
        usoImagen: { autorizado: !n.sinImagen, fecha: n.inscripcion, version: '2026-10', firmante: 'Acudiente principal' },
        actividadFisica: { autorizado: true, fecha: n.inscripcion, version: '2026-10', firmante: 'Acudiente principal' },
      },
      fechaInscripcion: n.inscripcion,
      descuento: esRojas ? { tipo: 'porcentaje', valor: 10, motivo: 'Descuento hermanos' } : null,
      estado: 'activo',
      historialCategorias: [{ categoriaId: n.cat, desde: n.inscripcion }],
      ...aud(),
    };
    ninos.push(nino);
    set(`ninos/${n.id}`, nino);
  }

  // Inscripciones pendientes (RF-E04)
  const pendiente = (id: string, nombres: string, apellidos: string, sexo: Sexo, nac: string, padre: string, nombrePadre: string): Nino => ({
    id, nombres, apellidos, fechaNacimiento: nac, sexo, tipoDocumento: 'RC', numeroDocumento: `1.020.${Math.floor(entre(100, 999, 0))}.${Math.floor(entre(100, 999, 0))}`,
    tallaUniforme: '4', acudientesIds: [padre], acudientes: [{ usuarioId: padre, nombre: nombrePadre, parentesco: 'Madre', esPrincipal: true }],
    contactos: [{ nombre: nombrePadre, parentesco: 'Madre', telefono: '+57 312 555 0111', esEmergencia: true, puedeRecoger: true }],
    seguroMedico: { tipo: 'EPS', entidad: 'Sura EPS', numeroAfiliacion: '7712004561' },
    salud: { tipoSangre: 'A+', alergias: 'Ninguna', condicionesMedicas: 'Ninguna', medicamentos: 'Ninguno', restriccionesActividad: 'Ninguna' },
    documentos: [],
    consentimientos: {
      tratamientoDatos: { autorizado: true, fecha: HOY, version: '2026-10', firmante: nombrePadre },
      usoImagen: { autorizado: true, fecha: HOY, version: '2026-10', firmante: nombrePadre },
      actividadFisica: { autorizado: true, fecha: HOY, version: '2026-10', firmante: nombrePadre },
    },
    estado: 'pendiente_aprobacion', ...aud(padre),
  });
  set('ninos/lucia', pendiente('lucia', 'Lucía', 'Forero Gil', 'F', '2022-02-10', 'maria', 'María Forero'));
  set('ninos/gabriel', pendiente('gabriel', 'Gabriel', 'Niño Ardila', 'M', '2021-09-01', 'hernan', 'Hernán Niño'));

  console.log('Sesiones, asistencia, mediciones y resultados…');
  const inicio = sumarDias(HOY, -230);
  const CONTROLES = [sumarDias(HOY, -226), sumarDias(HOY, -128), sumarDias(HOY, -44)];
  const ajusteControl = (f: string, dias: number[]) => {
    // mueve cada control al día de entrenamiento más cercano de la categoría
    let x = f; for (let i = 0; i < 7 && !dias.includes(diaSemana(x)); i++) x = sumarDias(x, 1);
    return x;
  };
  const cancelada = sumarDias(HOY, -9);
  let numSesion = 0;
  for (const c of CATEGORIAS) {
    const dias = c.horarios.map((h) => h.diaSemana);
    const fechasControl = CONTROLES.map((f) => ajusteControl(f, dias));
    const delCat = ninos.filter((n) => n.categoriaId === c.id);
    for (let f = inicio; f <= sumarDias(HOY, 21); f = sumarDias(f, 1)) {
      const esHoy = f === HOY;
      if (!dias.includes(diaSemana(f)) && !(esHoy && c.id !== 'leones')) continue;
      const h = c.horarios.find((x) => x.diaSemana === diaSemana(f)) ?? c.horarios[0];
      const iControl = fechasControl.indexOf(f);
      const esControl = iControl >= 0 || (esHoy && c.id === 'fiera');
      const pasada = f < HOY;
      const esCancelada = (f === cancelada || ajusteControl(cancelada, dias) === f) && pasada && iControl < 0;
      const id = `${c.id}_${f}`;
      numSesion++;
      const sesion: Sesion = {
        id, tipo: esControl ? 'control' : 'entrenamiento', categoriaId: c.id, fecha: f, horaInicio: h.horaInicio, horaFin: h.horaFin, lugar: h.lugar,
        tema: esControl ? (esHoy ? 'Pruebas de velocidad, salto, equilibrio y recepción' : 'Evaluación de habilidades motrices')
          : ['Saltos y aterrizajes seguros', 'Juegos de persecución', 'Equilibrio en circuitos', 'Lanzar y atrapar', 'Conducción con los pies', 'Ritmo y coordinación'][numSesion % 6],
        pruebasSeleccionadas: esControl ? (esHoy ? ['vel10', 'salto', 'equi', 'recep'] : PRUEBAS_CONTROL) : [],
        estado: esCancelada ? 'cancelada' : pasada ? 'realizada' : 'programada',
        ...(esCancelada ? { motivoCancelacion: 'Cancelada por lluvia' } : {}),
        asistenciaGuardada: pasada && !esCancelada, resultadosGuardados: pasada && esControl,
        ...aud(),
      };
      set(`sesiones/${id}`, sesion);
      if (!pasada || esCancelada) continue;

      for (const n of delCat) {
        if (n.fechaInscripcion! > f) continue;
        const r = azar();
        const estado: EstadoAsistencia = r < 0.8 ? 'asistio' : r < 0.87 ? 'retardo' : r < 0.93 ? 'excusa' : 'falto';
        const a: Asistencia = {
          id: `${id}_${n.id}`, sesionId: id, ninoId: n.id, acudientesIds: n.acudientesIds, categoriaId: c.id, fecha: f, tipoSesion: sesion.tipo, estado,
          ...(estado === 'retardo' ? { minutosRetardo: 10, observacion: 'Llegó 10 min tarde' } : estado === 'excusa' ? { observacion: 'Cita médica' } : estado === 'falto' ? { observacion: 'Sin aviso' } : {}),
          historialCambios: [{ estadoAnterior: null, estadoNuevo: estado, fecha: `${f}T17:00:00-05:00`, usuarioId: 'entrenador' }],
          ...aud(),
        };
        set(`asistencias/${a.id}`, a);

        if (iControl >= 0 && estado !== 'falto' && estado !== 'excusa') {
          // Medición física
          const [talla, peso] = MEDIDAS[n.id]?.[iControl] ?? [Math.round((95 + edadAnios(n.fechaNacimiento, f) * 6 + iControl * 1.4 + entre(-3, 3)) * 10) / 10, Math.round((14 + edadAnios(n.fechaNacimiento, f) * 1.4 + iControl * 0.4 + entre(-1.2, 1.5)) * 10) / 10];
          const em = edadMesesExacta(n.fechaNacimiento, f);
          const ev = evaluarImc(peso, talla, n.sexo, em);
          set(`medicionesFisicas/${id}_${n.id}`, {
            ninoId: n.id, acudientesIds: n.acudientesIds, sesionId: id, fecha: f, tallaCm: talla, pesoKg: peso, imc: ev.imc, edadMeses: Math.floor(em),
            zScoreImc: ev.zScore, percentilImc: ev.percentil, clasificacionImc: ev.clasificacion?.tecnica ?? null, ...aud(),
          });
          // Resultados de pruebas
          for (const pid of PRUEBAS_CONTROL) {
            const p = CATALOGO_BASE.find((x) => x.id === pid)!;
            let v: number;
            if (HIST[n.id]) v = HIST[n.id][pid][iControl];
            else if (p.tipoResultado === 'cualitativa') v = Math.min(2, Math.floor(azar() * 2) + (iControl > 0 ? 1 : 0));
            else {
              const ref = p.referencias[0];
              const lo = ref ? ref.valorBajo : 5, hi = ref ? ref.valorAlto : 10;
              const mejora = (p.mejorEs === 'menor' ? -1 : 1) * (hi - lo) * 0.18 * iControl;
              v = p.tipoResultado === 'aciertos' ? Math.max(0, Math.min(5, Math.round(entre(lo - 1, hi, 0) + iControl * 0.5)))
                : Math.round((entre(lo - (hi - lo) * 0.4, hi) + mejora + (c.id === 'leones' ? (p.mejorEs === 'menor' ? -0.3 : 6) : 0)) * 100) / 100;
            }
            const intentos = p.intentos > 1 && p.tipoResultado !== 'aciertos'
              ? [Math.round((v + (p.mejorEs === 'menor' ? 0.2 : -2) * (azar() + 0.1)) * 100) / 100, v]
              : [v];
            const final = valorFinal(p, intentos)!;
            const res: ResultadoPrueba = {
              id: `${id}_${n.id}_${pid}`, sesionId: id, ninoId: n.id, acudientesIds: n.acudientesIds, pruebaId: pid, fecha: f,
              intentos, valorFinal: final, comparacionReferencia: comparar(p, final, edadAnios(n.fechaNacimiento, f), n.sexo),
              ...(OBS[n.id]?.[pid] ? { observacion: OBS[n.id][pid][iControl] } : {}),
              medios: [], noRealizada: null, ...aud(),
            };
            set(`resultadosPruebas/${res.id}`, res);
          }
        }
      }
    }
  }

  console.log('Pagos…');
  for (const n of ninos) {
    const cat = CATEGORIAS.find((c) => c.id === n.categoriaId)!;
    const dia = Number(n.fechaInscripcion!.slice(8, 10));
    const actual = periodoVigente(dia, HOY);
    for (let per = n.fechaInscripcion!.slice(0, 7); per <= actual; per = sumarMeses(per, 1)) {
      const p = construirPago({ ninoId: n.id, acudientesIds: n.acudientesIds, categoriaId: cat.id, diaCobro: dia, valorMensual: cat.valorMensual, descuento: n.descuento }, per, CONFIG_POR_DEFECTO) as Pago;
      const esActual = per === actual;
      const vacaciones = per.endsWith('-07') && (n.id === 'sofia' || n.id === 'andres');
      if (vacaciones) Object.assign(p, { estado: 'congelado', motivoEstado: 'Vacaciones' });
      else if (!esActual || n.id === 'sofia' || ['emilio', 'mariana', 'valentina', 'samuel', 'nicolas_b', 'emma'].includes(n.id)) {
        Object.assign(p, { estado: 'pagado', fechaPago: sumarDias(p.fechaInicioCiclo, Math.floor(entre(0, 4, 0))), medioPago: ['Nequi', 'Daviplata', 'Bancolombia', 'Efectivo'][Math.floor(azar() * 4)] });
      } else if (p.fechaVencimiento < HOY) {
        p.estado = 'vencido';
      }
      set(`pagos/${p.id}`, { ...p, ...aud() });
    }
    // Asegura que el pago de Andrés quede pendiente y venza pronto, como en el prototipo.
    if (n.id === 'andres') {
      const per = actual;
      set(`pagos/andres_${per}`, {
        ...construirPago({ ninoId: n.id, acudientesIds: n.acudientesIds, categoriaId: cat.id, diaCobro: dia, valorMensual: cat.valorMensual, descuento: n.descuento }, per, CONFIG_POR_DEFECTO),
        fechaInicioCiclo: fechaCobro(dia, per), ...aud(),
      });
    }
  }

  console.log('Eventos, anuncios, solicitudes y notificaciones…');
  set(`eventos/control_hoy`, {
    tipo: 'control', titulo: 'Evaluación de habilidades · Fiera', descripcion: 'Día de control: velocidad, salto, equilibrio y recepción. Ven con ropa cómoda y agua.',
    lugar: 'Parque El Virrey', ubicacionMapsUrl: 'https://maps.google.com/?q=Parque+El+Virrey+Bogota',
    fechaInicio: `${HOY}T16:15:00-05:00`, fechaFin: `${HOY}T17:15:00-05:00`, categoriasIds: ['fiera'], requiereConfirmacion: false, recordatorios: [1], sesionId: `fiera_${HOY}`, ...aud(),
  });
  const halloween = sumarDias(HOY, 9);
  set('eventos/halloween', {
    tipo: 'actividad_especial', titulo: 'Halloween deportivo', descripcion: 'Pueden venir disfrazados. Haremos circuitos y juegos para todas las categorías.',
    lugar: 'Parque El Virrey', ubicacionMapsUrl: 'https://maps.google.com/?q=Parque+El+Virrey+Bogota',
    fechaInicio: `${halloween}T09:00:00-05:00`, fechaFin: `${halloween}T11:00:00-05:00`, categoriasIds: 'todas', requiereConfirmacion: true,
    fechaLimiteConfirmacion: `${sumarDias(halloween, -2)}T23:59:00-05:00`, costo: 0, recordatorios: [7, 1], ...aud(),
  });
  const festival = sumarDias(HOY, 23);
  set('eventos/festival', {
    tipo: 'torneo', titulo: 'Festival Infantil Pequeños Atletas', descripcion: 'Encuentro predeportivo con otras escuelas: relevos, saltos y juegos con balón. Incluye refrigerio y medalla.',
    lugar: 'Coliseo El Salitre', ubicacionMapsUrl: 'https://maps.google.com/?q=Coliseo+El+Salitre+Bogota',
    fechaInicio: `${festival}T08:00:00-05:00`, fechaFin: `${festival}T12:00:00-05:00`, categoriasIds: 'todas', requiereConfirmacion: true,
    fechaLimiteConfirmacion: `${sumarDias(festival, -7)}T23:59:00-05:00`, costo: 25000, recordatorios: [7, 1], ...aud(),
  });
  // Confirmaciones del festival (algunas)
  ninos.slice(2, 14).forEach((n, i) => set(`confirmacionesEvento/festival_${n.id}`, {
    eventoId: 'festival', ninoId: n.id, acudientesIds: n.acudientesIds, respuesta: i % 5 === 4 ? 'no_asistira' : 'asistira', respondidoPor: n.acudientesIds[0], fecha: T, ...aud(n.acudientesIds[0]),
  }));

  set('anuncios/halloween', {
    titulo: `Halloween deportivo, ${halloween.slice(8, 10)}/${halloween.slice(5, 7)}`, mensaje: 'Pueden venir disfrazados. Haremos circuitos y juegos para todas las categorías. Confirma la asistencia en Eventos.',
    destinatarios: { tipo: 'todas' }, fijado: true, fechaPublicacion: `${sumarDias(HOY, -2)}T10:00:00-05:00`, enviarPush: true, ...aud(),
  });
  set('anuncios/hidratacion', {
    titulo: 'Recuerden la hidratación', mensaje: 'Envíen siempre un termo con agua marcado con el nombre del niño. Con el sol de estos días es muy importante.',
    destinatarios: { tipo: 'todas' }, fijado: false, fechaPublicacion: `${sumarDias(HOY, -12)}T09:00:00-05:00`, enviarPush: false, ...aud(),
  });

  set('solicitudesCambio/tel_carolina', {
    ninoId: 'sofia', acudientesIds: ['carolina', 'jorge'], solicitadoPor: 'carolina', solicitadoPorNombre: 'Carolina Rojas',
    seccion: 'Acudientes y contactos', campo: 'contactos.0.telefono', etiqueta: 'Teléfono de Carolina Rojas',
    valorActual: '+57 310 555 0148', valorPropuesto: '+57 320 555 0148', estado: 'pendiente', ...aud('carolina'),
  });

  const notis = [
    { tipo: 'pago_mes', titulo: 'Pago de octubre · Andrés', cuerpo: 'Hoy inicia el periodo de pago de Andrés. Toca para ver los medios de pago.', enlace: '/p/pagos?nino=andres', dias: -4 },
    { tipo: 'resultados', titulo: '¡Nuevos resultados de Sofía!', cuerpo: 'Ya están los resultados del día de control. Mira su progreso.', enlace: '/p/hijo/pruebas?nino=sofia', dias: -44 },
    { tipo: 'anuncio', titulo: 'Halloween deportivo', cuerpo: 'Pueden venir disfrazados. Confirma la asistencia en Eventos.', enlace: '/p/eventos', dias: -2 },
  ];
  notis.forEach((x, i) => set(`notificaciones/seed_${i}`, { usuarioId: 'carolina', tipo: x.tipo, titulo: x.titulo, cuerpo: x.cuerpo, enlace: x.enlace, leida: i === 1, fecha: `${sumarDias(HOY, x.dias)}T07:00:00-05:00` }));

  console.log(`Escribiendo ${filas.length} registros…`);
  for (const [coleccion, tabla] of Object.entries(TABLAS)) {
    // Si un documento se escribió dos veces, queda el último (como en Firestore).
    const ultimos = new Map(filas.filter((f) => f.coleccion === coleccion).map((f) => [f.id, f]));
    const delaTabla = [...ultimos.values()].map((f) => ({
      id: uuids.get(f.id) ?? f.id,
      datos: conUuids(f.datos) as Record<string, unknown>,
    }));
    for (let i = 0; i < delaTabla.length; i += 400) {
      const { error } = await supabase.from(tabla).upsert(delaTabla.slice(i, i + 400));
      if (error) throw new Error(`Error en ${tabla}: ${error.message}`);
    }
  }
  console.log('Listo ✅  Cuentas de prueba: ver comentario al inicio de scripts/seed.ts');
}

main().catch((e) => { console.error(e); process.exit(1); });
