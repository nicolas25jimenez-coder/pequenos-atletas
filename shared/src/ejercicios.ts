// Repositorio de ejercicios para casa (niños de 4 a 6 años, espacio máx. 20 m², material básico) y sesiones remotas.
import type { Auditoria } from './tipos';

export type TipoEjercicio = 'locomocion' | 'coordinativo' | 'manipulacion';
export type SubtipoManipulacion = 'manos' | 'pies';
export type TipoCarga = 'repeticiones' | 'tiempo';

export const TIPOS_EJERCICIO: { id: TipoEjercicio; nombre: string; detalle: string }[] = [
  { id: 'locomocion', nombre: 'Locomoción', detalle: 'Desplazarse: correr, saltar, reptar, gatear.' },
  { id: 'coordinativo', nombre: 'Coordinativo', detalle: 'Equilibrio, ritmo y coordinación de brazos y piernas.' },
  { id: 'manipulacion', nombre: 'Manipulación', detalle: 'Lanzar, atrapar, botar y patear (manos o pies).' },
];

/** Nivel 1 = predeterminado. A mayor número, más adaptado (más fácil). */
export const NIVELES_VARIANTE = [
  { nivel: 1, nombre: 'Predeterminado' },
  { nivel: 2, nombre: 'Adaptación ligera' },
  { nivel: 3, nombre: 'Adaptación media' },
  { nivel: 4, nombre: 'Adaptación alta' },
] as const;

export interface VarianteEjercicio { nivel: number; descripcion: string }

export interface CargaEjercicio {
  series: number;
  tipo: TipoCarga;
  valor: number; // repeticiones o segundos por serie
  recuperacionS: number; // descanso entre series, en segundos
}

export interface Ejercicio extends Auditoria {
  id: string;
  nombre: string;
  tipo: TipoEjercicio;
  subtipo?: SubtipoManipulacion;
  descripcion: string;
  videoUrl?: string;
  puntosClave: string[];
  carga: CargaEjercicio; // dosificación sugerida
  variantes: VarianteEjercicio[]; // 4 niveles
  espacio: string;
  materiales: string;
  esBase: boolean;
}

export const nombreTipo = (e: Pick<Ejercicio, 'tipo' | 'subtipo'>) =>
  `${TIPOS_EJERCICIO.find((t) => t.id === e.tipo)?.nombre ?? e.tipo}${e.tipo === 'manipulacion' && e.subtipo ? ` · ${e.subtipo === 'pies' ? 'pies' : 'manos'}` : ''}`;

export const textoCarga = (c: { series: number; tipo: TipoCarga; valor: number; recuperacionS: number }) =>
  `${c.series} ${c.series === 1 ? 'serie' : 'series'} de ${c.valor} ${c.tipo === 'tiempo' ? 's' : c.valor === 1 ? 'repetición' : 'repeticiones'} · descanso ${c.recuperacionS} s`;

/** Copia del ejercicio dentro de una sesión remota (los padres no leen el repositorio). */
export interface EjercicioAsignado {
  ejercicioId: string;
  nombre: string;
  tipoTexto: string;
  descripcion: string;
  videoUrl?: string;
  puntosClave: string[];
  espacio: string;
  materiales: string;
  nivel: number;
  nivelNombre: string;
  varianteDescripcion: string;
  carga: CargaEjercicio;
  video?: { ruta: string; duracionS: number; subidoEn: string } | null;
  feedback?: string;
  feedbackEn?: string;
}

export type EstadoRemota = 'enviada' | 'entregada' | 'revisada';

export interface SesionRemota extends Auditoria {
  id: string;
  ninoId: string;
  acudientesIds: string[];
  categoriaId: string;
  sesionId?: string;
  fecha: string; // fecha de envío YYYY-MM-DD
  enviadaEn: string; // ISO
  objetivo: string;
  ejercicios: EjercicioAsignado[];
  estado: EstadoRemota;
}

export const ETIQUETA_REMOTA: Record<EstadoRemota, string> = { enviada: 'Enviada', entregada: 'Con videos', revisada: 'Revisada' };

export const MAX_VIDEO_S = 30;

const nivelNombre = (n: number) => NIVELES_VARIANTE.find((x) => x.nivel === n)?.nombre ?? `Nivel ${n}`;

export function asignarEjercicio(e: Ejercicio, nivel: number, carga: CargaEjercicio): EjercicioAsignado {
  return {
    ejercicioId: e.id, nombre: e.nombre, tipoTexto: nombreTipo(e), descripcion: e.descripcion, videoUrl: e.videoUrl,
    puntosClave: e.puntosClave, espacio: e.espacio, materiales: e.materiales, nivel, nivelNombre: nivelNombre(nivel),
    varianteDescripcion: e.variantes.find((v) => v.nivel === nivel)?.descripcion ?? '', carga, video: null,
  };
}

/** Estado según los videos y comentarios de una sesión remota. */
export function estadoRemota(ejercicios: EjercicioAsignado[]): EstadoRemota {
  const con = ejercicios.filter((e) => e.video);
  if (!con.length) return 'enviada';
  return con.every((e) => (e.feedback ?? '').trim()) ? 'revisada' : 'entregada';
}

type Base = Omit<Ejercicio, 'esBase' | 'variantes'> & { v: [string, string, string, string] };

const B: Base[] = [
  // ---- Locomoción ----
  { id: 'ej_zigzag', nombre: 'Zigzag entre cojines', tipo: 'locomocion', espacio: 'Pasillo o sala de 4 × 2 m', materiales: '5 cojines o zapatos',
    descripcion: 'Coloca 5 cojines en fila, separados un paso grande. El niño corre en zigzag entre ellos hasta el final y regresa caminando.',
    puntosClave: ['Mirar hacia adelante, no al piso.', 'Brazos doblados que se mueven al correr.', 'No tumbar los cojines.'],
    carga: { series: 3, tipo: 'repeticiones', valor: 2, recuperacionS: 30 },
    v: ['Corre en zigzag ida y vuelta sin tumbar cojines.', 'Camina rápido en zigzag y corre solo la vuelta.', 'Camina en zigzag y separa más los cojines.', 'Camina en línea recta y rodea solo 2 cojines, con la mano de un adulto si hace falta.'] },
  { id: 'ej_rana', nombre: 'Saltos de rana sobre la línea', tipo: 'locomocion', espacio: 'Un espacio de 3 × 2 m', materiales: 'Cinta, cuerda o toalla enrollada',
    descripcion: 'Pon una línea en el piso. El niño salta como rana con los dos pies juntos, de un lado al otro de la línea, avanzando a lo largo de ella.',
    puntosClave: ['Doblar rodillas antes de saltar.', 'Caer con los dos pies a la vez y rodillas suaves.', 'Impulsar los brazos hacia adelante.'],
    carga: { series: 3, tipo: 'tiempo', valor: 15, recuperacionS: 30 },
    v: ['Salta con pies juntos de lado a lado de la línea sin parar.', 'Salta con pausa corta entre saltos.', 'Salta hacia adelante sobre la cuerda en el piso (sin lado a lado).', 'Hace pasos largos por encima de la línea, sin saltar, con apoyo de un adulto.'] },
  { id: 'ej_animales', nombre: 'Caminata de animales', tipo: 'locomocion', espacio: 'Sala de 4 × 3 m', materiales: 'Ninguno (tapete opcional)',
    descripcion: 'El niño recorre 4 metros imitando un animal: oso (manos y pies), cangrejo (de espaldas) o cocodrilo (arrastrándose).',
    puntosClave: ['Mantener la cabeza arriba.', 'Mover brazo y pierna contrarios.', 'Ir despacio y con control.'],
    carga: { series: 3, tipo: 'repeticiones', valor: 2, recuperacionS: 40 },
    v: ['Recorre 4 m como oso y como cangrejo.', 'Recorre 3 m como oso.', 'Gatea 3 m (rodillas y manos).', 'Se arrastra 2 m sobre el tapete imitando un cocodrilo.'] },
  // ---- Coordinativo ----
  { id: 'ej_linea', nombre: 'Caminar sobre la línea', tipo: 'coordinativo', espacio: 'Pasillo de 3 m', materiales: 'Cinta pegada al piso',
    descripcion: 'Pega una línea de 3 m. El niño camina sobre ella poniendo un pie delante del otro, con los brazos abiertos, y regresa de espaldas.',
    puntosClave: ['Pie delante del otro (talón con punta).', 'Brazos abiertos para equilibrarse.', 'Mirar al frente.'],
    carga: { series: 3, tipo: 'repeticiones', valor: 2, recuperacionS: 30 },
    v: ['Camina adelante y regresa de espaldas sin salirse.', 'Camina adelante y regresa de frente.', 'Camina con un pie en la línea y otro al lado.', 'Camina con la mano de un adulto, cerca de la línea (línea ancha de 20 cm).'] },
  { id: 'ej_rayuela', nombre: 'Rayuela de ritmo', tipo: 'coordinativo', espacio: 'Un espacio de 3 × 1 m', materiales: '6 hojas de papel o cintas',
    descripcion: 'Pon las hojas en el piso formando un camino. El niño salta siguiendo el patrón: 1 pie, 2 pies, 1 pie, 2 pies.',
    puntosClave: ['Caer sobre la punta del pie.', 'Mantener el ritmo (decir "uno, dos").', 'Aterrizar sin perder el equilibrio.'],
    carga: { series: 4, tipo: 'repeticiones', valor: 1, recuperacionS: 30 },
    v: ['Repite el patrón completo de 1 pie y 2 pies sin parar.', 'Hace el patrón con una pausa en cada hoja.', 'Salta solo con 2 pies en todas las hojas.', 'Camina pisando cada hoja, con apoyo de un adulto.'] },
  { id: 'ej_espejo', nombre: 'Espejo cruzado', tipo: 'coordinativo', espacio: 'Un espacio de 2 × 2 m', materiales: 'Ninguno',
    descripcion: 'El adulto hace movimientos y el niño los copia como espejo: tocar la rodilla derecha con la mano izquierda, palmada y giro, etc.',
    puntosClave: ['Cruzar la mitad del cuerpo.', 'Seguir el ritmo del adulto.', 'Movimientos claros y lentos al comienzo.'],
    carga: { series: 3, tipo: 'tiempo', valor: 20, recuperacionS: 30 },
    v: ['Copia 4 movimientos cruzados seguidos.', 'Copia 3 movimientos cruzados con pausa.', 'Copia movimientos sin cruzar (mano y rodilla del mismo lado).', 'Copia solo 2 movimientos simples, con ayuda del adulto guiando el brazo.'] },
  // ---- Manipulación ----
  { id: 'ej_balde', nombre: 'Lanzar al balde', tipo: 'manipulacion', subtipo: 'manos', espacio: 'Un espacio de 3 × 2 m', materiales: 'Balde o caja, 5 pelotas de medias',
    descripcion: 'Con un balde a 2 m, el niño lanza 5 pelotas de medias por encima del hombro intentando meterlas.',
    puntosClave: ['Poner el pie contrario al brazo adelante.', 'Mirar el balde antes de lanzar.', 'Seguir el brazo hacia abajo al soltar.'],
    carga: { series: 3, tipo: 'repeticiones', valor: 5, recuperacionS: 30 },
    v: ['Lanza 5 pelotas desde 2 m con una mano.', 'Lanza desde 1,5 m.', 'Lanza desde 1 m con las dos manos.', 'Deja caer la pelota dentro del balde estando a 50 cm.'] },
  { id: 'ej_globo', nombre: 'Atrapar el globo', tipo: 'manipulacion', subtipo: 'manos', espacio: 'Sala de 3 × 3 m', materiales: 'Globo o pelota liviana',
    descripcion: 'El adulto lanza un globo suave hacia arriba y el niño lo atrapa con las dos manos antes de que caiga.',
    puntosClave: ['Manos abiertas al frente, pulgares juntos.', 'Seguir el globo con la mirada.', 'Atrapar con las manos, no con el pecho.'],
    carga: { series: 3, tipo: 'repeticiones', valor: 6, recuperacionS: 30 },
    v: ['Atrapa el globo lanzado por el adulto a 2 m.', 'Atrapa el globo a 1,5 m.', 'Lanza el globo hacia arriba él mismo y lo atrapa.', 'Golpea el globo hacia arriba con las dos manos, sin atraparlo.'] },
  { id: 'ej_pase_pie', nombre: 'Pase y control con el pie', tipo: 'manipulacion', subtipo: 'pies', espacio: 'Pasillo de 4 m junto a una pared', materiales: 'Balón liviano, pared',
    descripcion: 'El niño patea suavemente un balón contra la pared desde 2 m, lo detiene con la planta del pie cuando regresa y repite.',
    puntosClave: ['Pie de apoyo al lado del balón.', 'Patear con el empeine o el interior del pie.', 'Detener el balón con la planta, sin pisarlo con fuerza.'],
    carga: { series: 3, tipo: 'repeticiones', valor: 6, recuperacionS: 30 },
    v: ['Patea y detiene el balón 6 veces seguidas.', 'Patea y lo recoge con las manos cada vez.', 'Patea el balón quieto contra la pared desde 1 m.', 'Empuja el balón con el pie hacia un adulto sentado frente a él.'] },
];

export const EJERCICIOS_BASE: Ejercicio[] = B.map(({ v, ...e }) => ({
  ...e, esBase: true, variantes: v.map((descripcion, i) => ({ nivel: i + 1, descripcion })),
}));
