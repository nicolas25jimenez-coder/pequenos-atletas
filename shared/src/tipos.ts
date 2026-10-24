// Modelo de datos (SPEC §4). Las fechas sin hora se guardan como 'YYYY-MM-DD'
// y las fechas con hora como ISO 8601 con zona (-05:00, America/Bogota).

export type Rol = 'padre' | 'entrenador';
export type Sexo = 'M' | 'F';
export type Parentesco = 'Madre' | 'Padre' | 'Abuelo/a' | 'Tío/a' | 'Otro';

export interface Auditoria {
  creadoEn?: string;
  actualizadoEn?: string;
  creadoPor?: string;
}

export interface PreferenciasNotificacion {
  pagoRegistrado: boolean;
  inasistencia: boolean;
  resultados: boolean;
  eventos: boolean;
  solicitudes: boolean;
}

export interface Usuario extends Auditoria {
  id: string;
  rol: Rol;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  parentesco?: Parentesco;
  preferenciasNotificacion?: PreferenciasNotificacion;
  aceptoTerminos?: { fecha: string; version: string };
  estado: 'activo' | 'bloqueado';
}

export interface Contacto {
  nombre: string;
  parentesco: string;
  telefono: string;
  esEmergencia: boolean;
  puedeRecoger: boolean;
}

export interface SeguroMedico {
  tipo: 'EPS' | 'Prepagada' | 'Póliza estudiantil' | 'Otro';
  entidad: string;
  numeroAfiliacion: string;
  telefonoEntidad?: string;
  carnetUrl?: string;
}

export interface Salud {
  tipoSangre: string;
  alergias: string;
  condicionesMedicas: string;
  medicamentos: string;
  restriccionesActividad: string;
  observaciones?: string;
}

export interface Documento {
  tipo: 'Identidad' | 'Carné de seguro' | 'Certificado médico' | 'Otro';
  nombre: string;
  ruta: string; // ruta en Storage
  fecha: string;
  vence?: string;
}

export interface Consentimiento {
  autorizado: boolean;
  fecha: string;
  version: string;
  firmante: string;
}

export interface Consentimientos {
  tratamientoDatos: Consentimiento;
  usoImagen: Consentimiento;
  actividadFisica: Consentimiento;
}

export interface Descuento {
  tipo: 'porcentaje' | 'valor';
  valor: number;
  motivo: string;
  vigenteHasta?: string;
}

export type EstadoNino = 'pendiente_aprobacion' | 'activo' | 'inactivo' | 'rechazado';

export interface Nino extends Auditoria {
  id: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: Sexo;
  tipoDocumento: string;
  numeroDocumento: string;
  fotoRuta?: string;
  tallaUniforme: string;
  tallaCalzado?: string;
  categoriaId?: string;
  acudientesIds: string[];
  acudientes: { usuarioId: string; nombre: string; parentesco: string; esPrincipal: boolean }[];
  contactos: Contacto[];
  seguroMedico: SeguroMedico;
  salud: Salud;
  documentos: Documento[];
  consentimientos: Consentimientos;
  fechaInscripcion?: string;
  diaCobro?: number; // por defecto el día de fechaInscripcion; el entrenador puede moverlo
  descuento?: Descuento | null;
  estado: EstadoNino;
  motivoRechazo?: string;
  motivoInactivacion?: string;
  fechaInactivacion?: string;
  historialCategorias?: { categoriaId: string; desde: string }[];
}

export interface Horario {
  diaSemana: number; // 1 = lunes … 7 = domingo
  horaInicio: string; // 'HH:mm'
  horaFin: string;
  lugar: string;
}

export interface Categoria extends Auditoria {
  id: string;
  nombre: string;
  descripcion: string;
  rangoEdad: { min: number; max: number };
  horarios: Horario[];
  valorMensual: number;
  cupoMaximo?: number;
  color: string;
  activa: boolean;
}

export interface MedicionFisica extends Auditoria {
  id: string;
  ninoId: string;
  acudientesIds: string[];
  sesionId?: string;
  fecha: string;
  tallaCm: number;
  pesoKg: number;
  imc: number;
  edadMeses: number;
  zScoreImc: number | null;
  percentilImc: number | null;
  clasificacionImc: string | null;
  observaciones?: string;
}

export type Familia = 'locomocion' | 'equilibrio' | 'manipulacion_manos' | 'manipulacion_pies';
export type TipoResultado = 'tiempo' | 'distancia' | 'repeticiones' | 'aciertos' | 'cualitativa';

export interface Referencia {
  edadMin: number; // años
  edadMax: number;
  sexo: Sexo | 'todos';
  valorBajo: number;
  valorAlto: number;
}

export interface Prueba extends Auditoria {
  id: string;
  nombre: string;
  familia: Familia;
  capacidad: string;
  objetivo: string;
  protocolo: string;
  materiales: string;
  deportesRelacionados: string[];
  tipoResultado: TipoResultado;
  unidad: string;
  mejorEs: 'mayor' | 'menor';
  intentos: number;
  agregacion: 'mejor' | 'promedio';
  maximo?: number; // ej. 5 aciertos, 30 s
  escalaCualitativa?: string[];
  referencias: Referencia[];
  mediaEjemploUrl?: string;
  esDelCatalogoBase: boolean;
  activa: boolean;
}

export interface PlantillaControl extends Auditoria {
  id: string;
  nombre: string;
  pruebasIds: string[];
}

export type TipoSesion = 'entrenamiento' | 'control';
export type EstadoSesion = 'programada' | 'realizada' | 'cancelada';

export interface Sesion extends Auditoria {
  id: string;
  tipo: TipoSesion;
  categoriaId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  tema?: string;
  pruebasSeleccionadas: string[];
  notasGenerales?: string;
  estado: EstadoSesion;
  motivoCancelacion?: string;
  asistenciaGuardada?: boolean;
  resultadosGuardados?: boolean;
}

export type EstadoAsistencia = 'asistio' | 'falto' | 'excusa' | 'retardo';

export interface CambioAsistencia {
  estadoAnterior: EstadoAsistencia | null;
  estadoNuevo: EstadoAsistencia;
  fecha: string;
  usuarioId: string;
}

export interface Asistencia extends Auditoria {
  id: string; // `${sesionId}_${ninoId}`
  sesionId: string;
  ninoId: string;
  acudientesIds: string[];
  categoriaId: string;
  fecha: string;
  tipoSesion: TipoSesion;
  estado: EstadoAsistencia;
  minutosRetardo?: number;
  observacion?: string;
  historialCambios: CambioAsistencia[];
}

export interface Medio {
  tipo: 'foto' | 'video';
  ruta: string;
}

export interface ResultadoPrueba extends Auditoria {
  id: string; // `${sesionId}_${ninoId}_${pruebaId}`
  sesionId: string;
  ninoId: string;
  acudientesIds: string[];
  pruebaId: string;
  fecha: string;
  intentos: number[];
  valorFinal: number | null; // para cualitativa: índice en la escala
  comparacionReferencia: 'por_debajo' | 'esperado' | 'por_encima' | null;
  observacion?: string;
  medios: Medio[];
  noRealizada?: { motivo: string } | null;
}

export type EstadoPago = 'pendiente' | 'pagado' | 'vencido' | 'exonerado' | 'congelado';

export interface Pago extends Auditoria {
  id: string; // `${ninoId}_${periodo}`
  ninoId: string;
  acudientesIds: string[];
  categoriaId: string;
  periodo: string; // 'YYYY-MM'
  fechaInicioCiclo: string;
  fechaVencimiento: string;
  valorBase: number;
  descuento: number;
  descuentoMotivo?: string;
  valorAPagar: number;
  ajusteManual?: { valorAnterior: number; valorNuevo: number; motivo: string; fecha: string } | null;
  estado: EstadoPago;
  fechaPago?: string;
  medioPago?: string;
  referencia?: string;
  notas?: string;
  motivoEstado?: string;
  recordatoriosEnviados: string[];
}

export interface MedioPago {
  id: string;
  nombre: string;
  iniciales: string;
  color: string;
  titular: string;
  numero: string;
  tipoCuenta?: string;
  qrRuta?: string;
  instrucciones?: string;
  copiable: boolean;
  activo: boolean;
  orden: number;
}

export type TipoEvento = 'control' | 'torneo' | 'actividad_especial';

export interface Evento extends Auditoria {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  descripcion: string;
  lugar: string;
  ubicacionMapsUrl?: string;
  fechaInicio: string; // ISO con hora
  fechaFin: string;
  categoriasIds: string[] | 'todas';
  requiereConfirmacion: boolean;
  fechaLimiteConfirmacion?: string;
  costo?: number;
  recordatorios: number[]; // días antes
  recordatoriosEnviados?: number[];
  sesionId?: string;
}

export type RespuestaEvento = 'asistira' | 'no_asistira';

export interface ConfirmacionEvento extends Auditoria {
  id: string; // `${eventoId}_${ninoId}`
  eventoId: string;
  ninoId: string;
  acudientesIds: string[];
  respuesta: RespuestaEvento;
  respondidoPor: string;
  fecha: string;
  comentario?: string;
}

export interface Anuncio extends Auditoria {
  id: string;
  titulo: string;
  mensaje: string;
  destinatarios: { tipo: 'todas' } | { tipo: 'categorias'; ids: string[] } | { tipo: 'ninos'; ids: string[] };
  imagenRuta?: string;
  fijado: boolean;
  fechaPublicacion: string;
  fechaExpiracion?: string;
  enviarPush: boolean;
}

export interface SolicitudCambio extends Auditoria {
  id: string;
  ninoId: string;
  acudientesIds: string[];
  solicitadoPor: string;
  solicitadoPorNombre: string;
  seccion: string;
  campo: string; // ruta del campo, ej. 'salud.alergias'
  etiqueta: string;
  valorActual: string;
  valorPropuesto: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  comentarioEntrenador?: string;
  fechaResolucion?: string;
}

export interface Invitacion extends Auditoria {
  id: string;
  correo: string;
  ninosIds: string[];
  parentesco: string;
  invitadoPor: string;
  estado: 'pendiente' | 'aceptada';
}

export type TipoNotificacion =
  | 'pago_proximo' | 'pago_mes' | 'pago_vencido' | 'pago_registrado'
  | 'inasistencia' | 'resultados' | 'evento_proximo' | 'confirmar_evento'
  | 'anuncio' | 'sesion_cancelada' | 'inscripcion_resuelta' | 'solicitud_resuelta'
  | 'nueva_inscripcion' | 'nueva_solicitud' | 'resumen_vencidos';

export interface Notificacion {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  enlace?: string; // ruta dentro de la app
  leida: boolean;
  fecha: string;
}

export interface Configuracion {
  nombreEscuela: string;
  telefonoWhatsApp: string; // solo dígitos con indicativo, ej. 573004128890
  correoContacto: string;
  diasGracia: number;
  diasRecordatorioPrevio: number;
  recordarVencidosCadaDias: number; // 0 = no repetir
  horaEnvioNotificaciones: string; // 'HH:mm'
  umbralFaltas: number; // % para el reporte de asistencia baja
  tallasUniforme: string[];
  versionTerminos: string;
}

export const CONFIG_POR_DEFECTO: Configuracion = {
  nombreEscuela: 'Pequeños Atletas',
  telefonoWhatsApp: '573004128890',
  correoContacto: 'contacto@pequenosatletas.co',
  diasGracia: 5,
  diasRecordatorioPrevio: 3,
  recordarVencidosCadaDias: 3,
  horaEnvioNotificaciones: '07:00',
  umbralFaltas: 40,
  tallasUniforme: ['4', '6', '8', '10', '12', 'XS', 'S'],
  versionTerminos: '2026-10',
};
