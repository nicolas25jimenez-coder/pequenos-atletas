// Catálogo base de pruebas motrices (SPEC §7.3). Formación multidisciplinar 4–6 años.
// ⚠️ Las referencias son PROVISIONALES (tomadas del prototipo). El entrenador debe
// validarlas o reemplazarlas desde Catálogo de pruebas.
import type { Familia, Prueba } from './tipos';

export const FAMILIAS: { id: Familia; nombre: string; corto: string }[] = [
  { id: 'locomocion', nombre: 'Locomoción', corto: 'Locomoción' },
  { id: 'equilibrio', nombre: 'Equilibrio y control corporal', corto: 'Equilibrio' },
  { id: 'manipulacion_manos', nombre: 'Manipulación · manos', corto: 'Manos' },
  { id: 'manipulacion_pies', nombre: 'Manipulación · pies', corto: 'Pies' },
];

export const ESCALA_CUALITATIVA = ['Por mejorar', 'En proceso', 'Logrado'];

type Base = Omit<Prueba, 'esDelCatalogoBase' | 'activa' | 'referencias' | 'materiales' | 'intentos' | 'agregacion'> &
  Partial<Pick<Prueba, 'materiales' | 'intentos' | 'agregacion'>> & { ref?: [number, number] };

const P: Base[] = [
  // A. Locomoción
  { id: 'vel10', nombre: 'Carrera de velocidad 10 m', familia: 'locomocion', capacidad: 'Velocidad', tipoResultado: 'tiempo', unidad: 's', mejorEs: 'menor', ref: [2.8, 3.4],
    deportesRelacionados: ['Atletismo', 'Fútbol', 'Baloncesto'], materiales: '2 conos, cronómetro',
    objetivo: 'Mide la rapidez para desplazarse en línea recta y reaccionar a una señal.',
    protocolo: 'Sale de pie detrás de la línea. A la señal corre 10 m hasta el cono final. Se cronometran 2 intentos y se guarda el mejor.' },
  { id: 'zig', nombre: 'Carrera en zigzag (conos)', familia: 'locomocion', capacidad: 'Agilidad', tipoResultado: 'tiempo', unidad: 's', mejorEs: 'menor', ref: [8.5, 10],
    deportesRelacionados: ['Fútbol', 'Baloncesto', 'Tenis', 'Rugby'], materiales: '5 conos, cronómetro',
    objetivo: 'Mide la agilidad para cambiar de dirección rápido sin perder el control.',
    protocolo: 'Recorre 5 conos separados 2 m en zigzag, ida y vuelta, lo más rápido posible sin tumbarlos.' },
  { id: 'salto', nombre: 'Salto largo con pies juntos', familia: 'locomocion', capacidad: 'Fuerza', tipoResultado: 'distancia', unidad: 'cm', mejorEs: 'mayor', ref: [75, 100],
    deportesRelacionados: ['Atletismo', 'Voleibol', 'Baloncesto'], materiales: 'Cinta métrica, línea de salida',
    objetivo: 'Evalúa la potencia de las piernas y la coordinación del impulso con los brazos.',
    protocolo: 'Desde la línea, con los pies juntos, balancea los brazos y salta hacia adelante. Se mide desde la línea hasta el talón más cercano.' },
  { id: 'patacoja', nombre: 'Saltos en un pie (pata coja)', familia: 'locomocion', capacidad: 'Coordinación', tipoResultado: 'repeticiones', unidad: 'saltos', mejorEs: 'mayor',
    deportesRelacionados: ['Atletismo', 'Danza', 'Patinaje'], materiales: 'Espacio libre de 5 m',
    objetivo: 'Mide la coordinación y la fuerza al saltar sobre una sola pierna.',
    protocolo: 'Salta seguido sobre su pie preferido sin apoyar el otro. Se cuentan los saltos consecutivos.' },
  { id: 'lateral', nombre: 'Saltos laterales (15 s)', familia: 'locomocion', capacidad: 'Coordinación', tipoResultado: 'repeticiones', unidad: 'saltos', mejorEs: 'mayor',
    deportesRelacionados: ['Tenis', 'Baloncesto', 'Deportes de raqueta'], materiales: 'Línea en el piso o cuerda, cronómetro',
    objetivo: 'Evalúa la coordinación y el ritmo al saltar de lado a lado.',
    protocolo: 'Con los pies juntos salta de un lado a otro de una línea durante 15 segundos. Se cuentan los saltos válidos.' },
  { id: 'galope', nombre: 'Galope / desplazamiento lateral', familia: 'locomocion', capacidad: 'Coordinación', tipoResultado: 'cualitativa', unidad: '', mejorEs: 'mayor',
    deportesRelacionados: ['Baloncesto', 'Tenis', 'Artes marciales'], materiales: '2 conos a 6 m',
    objetivo: 'Evalúa el patrón de desplazamiento lateral y su coordinación.',
    protocolo: 'Se desplaza de lado entre dos conos sin cruzar los pies, mirando al frente. Se observa con la escala Logrado / En proceso / Por mejorar.' },
  // B. Equilibrio y control corporal
  { id: 'equi', nombre: 'Equilibrio en un pie', familia: 'equilibrio', capacidad: 'Equilibrio', tipoResultado: 'tiempo', unidad: 's', mejorEs: 'mayor', ref: [5, 12], maximo: 30,
    deportesRelacionados: ['Gimnasia', 'Patinaje', 'Artes marciales'], materiales: 'Cronómetro',
    objetivo: 'Mide cuánto tiempo mantiene el equilibrio sobre un pie.',
    protocolo: 'Con las manos en la cintura levanta un pie. Se cronometra hasta que apoya el pie o suelta las manos (máximo 30 s).' },
  { id: 'viga', nombre: 'Caminar sobre una línea/viga', familia: 'equilibrio', capacidad: 'Equilibrio', tipoResultado: 'repeticiones', unidad: 'pasos', mejorEs: 'mayor', ref: [6, 10], maximo: 10,
    deportesRelacionados: ['Gimnasia', 'Escalada', 'Patinaje'], materiales: 'Viga baja o línea de 3 m',
    objetivo: 'Evalúa el control del cuerpo mientras se desplaza por una superficie estrecha.',
    protocolo: 'Camina sobre una viga baja poniendo un pie delante del otro. Se cuentan los pasos sin salirse (máximo 10).' },
  { id: 'rollo', nombre: 'Rollo adelante', familia: 'equilibrio', capacidad: 'Coordinación', tipoResultado: 'cualitativa', unidad: '', mejorEs: 'mayor', intentos: 1,
    deportesRelacionados: ['Gimnasia', 'Judo', 'Natación'], materiales: 'Colchoneta',
    objetivo: 'Evalúa la conciencia corporal y la coordinación al girar.',
    protocolo: 'Desde cuclillas apoya las manos, mete la cabeza y rueda sobre la espalda hasta quedar de pie. Se observa con la escala Logrado / En proceso / Por mejorar.' },
  { id: 'flex', nombre: 'Flexibilidad (sentado y alcanzar)', familia: 'equilibrio', capacidad: 'Flexibilidad', tipoResultado: 'distancia', unidad: 'cm', mejorEs: 'mayor',
    deportesRelacionados: ['Gimnasia', 'Danza', 'Natación'], materiales: 'Cajón de flexibilidad o regla',
    objetivo: 'Mide la flexibilidad de la espalda y de la parte posterior de las piernas.',
    protocolo: 'Sentado con las piernas estiradas, lleva las manos hacia adelante lo más lejos posible sin doblar las rodillas. Se mide la distancia alcanzada.' },
  // C. Manipulación · manos
  { id: 'lanzdist', nombre: 'Lanzamiento de pelota por encima del hombro', familia: 'manipulacion_manos', capacidad: 'Fuerza', tipoResultado: 'distancia', unidad: 'm', mejorEs: 'mayor',
    deportesRelacionados: ['Béisbol', 'Atletismo', 'Balonmano'], materiales: 'Pelota de tenis, cinta métrica',
    objetivo: 'Evalúa la técnica y la fuerza para lanzar un objeto.',
    protocolo: 'De pie detrás de la línea lanza una pelota pequeña por encima del hombro lo más lejos posible. Se mide hasta el primer bote.' },
  { id: 'lanz', nombre: 'Lanzamiento a un objetivo', familia: 'manipulacion_manos', capacidad: 'Precisión', tipoResultado: 'aciertos', unidad: '/5', mejorEs: 'mayor', ref: [2, 4], maximo: 5, intentos: 1,
    deportesRelacionados: ['Baloncesto', 'Balonmano', 'Béisbol'], materiales: '5 pelotas pequeñas, aro',
    objetivo: 'Mide la precisión al lanzar.',
    protocolo: 'Lanza 5 pelotas pequeñas a un aro ubicado a 3 m. Se cuentan los aciertos.' },
  { id: 'recep', nombre: 'Recepción de pelota', familia: 'manipulacion_manos', capacidad: 'Coordinación', tipoResultado: 'aciertos', unidad: '/5', mejorEs: 'mayor', ref: [2, 4], maximo: 5, intentos: 1,
    deportesRelacionados: ['Baloncesto', 'Voleibol', 'Béisbol'], materiales: 'Pelota mediana',
    objetivo: 'Evalúa la capacidad de atrapar un balón lanzado.',
    protocolo: 'El entrenador lanza 5 veces una pelota mediana desde 3 m. Se cuentan las recepciones limpias.' },
  { id: 'bote', nombre: 'Bote de balón con la mano', familia: 'manipulacion_manos', capacidad: 'Coordinación', tipoResultado: 'repeticiones', unidad: 'botes', mejorEs: 'mayor',
    deportesRelacionados: ['Baloncesto', 'Balonmano'], materiales: 'Balón de baloncesto mini',
    objetivo: 'Evalúa el control del balón y la coordinación mano-vista.',
    protocolo: 'Bota el balón con una mano sin perder el control. Se cuentan los botes seguidos.' },
  { id: 'raqueta', nombre: 'Golpeo con raqueta/paleta', familia: 'manipulacion_manos', capacidad: 'Coordinación', tipoResultado: 'repeticiones', unidad: 'golpes', mejorEs: 'mayor',
    deportesRelacionados: ['Tenis', 'Bádminton', 'Béisbol', 'Hockey'], materiales: 'Paleta y globo o pelota liviana',
    objetivo: 'Evalúa la coordinación para golpear un objeto con un implemento.',
    protocolo: 'Golpea hacia arriba un globo o pelota liviana con la paleta sin dejarlo caer. Se cuentan los golpes seguidos.' },
  // D. Manipulación · pies
  { id: 'cond', nombre: 'Conducción de balón entre conos', familia: 'manipulacion_pies', capacidad: 'Coordinación', tipoResultado: 'tiempo', unidad: 's', mejorEs: 'menor', ref: [10, 13],
    deportesRelacionados: ['Fútbol', 'Fútbol de salón'], materiales: 'Balón, 5 conos, cronómetro',
    objetivo: 'Evalúa el control del balón en movimiento.',
    protocolo: 'Conduce el balón con el pie entre 5 conos y regresa. Se cronometra el recorrido.' },
  { id: 'patear', nombre: 'Patear a un objetivo', familia: 'manipulacion_pies', capacidad: 'Precisión', tipoResultado: 'aciertos', unidad: '/5', mejorEs: 'mayor', ref: [2, 4], maximo: 5, intentos: 1,
    deportesRelacionados: ['Fútbol', 'Rugby'], materiales: '5 balones, portería pequeña',
    objetivo: 'Mide la precisión y la coordinación al patear.',
    protocolo: 'Patea 5 balones hacia una portería pequeña a 4 m. Se cuentan los aciertos.' },
];

export const CATALOGO_BASE: Prueba[] = P.map(({ ref, ...p }) => ({
  materiales: '',
  intentos: p.tipoResultado === 'cualitativa' ? 1 : 2,
  agregacion: 'mejor',
  ...p,
  ...(p.tipoResultado === 'cualitativa' ? { escalaCualitativa: ESCALA_CUALITATIVA } : {}),
  referencias: ref ? [{ edadMin: 4, edadMax: 6, sexo: 'todos', valorBajo: ref[0], valorAlto: ref[1] }] : [],
  esDelCatalogoBase: true,
  activa: true,
}));

export const TIPOS_RESULTADO: { id: Prueba['tipoResultado']; nombre: string; unidad: string; mejorEs: Prueba['mejorEs'] }[] = [
  { id: 'tiempo', nombre: 'Tiempo', unidad: 's', mejorEs: 'menor' },
  { id: 'distancia', nombre: 'Distancia', unidad: 'cm', mejorEs: 'mayor' },
  { id: 'repeticiones', nombre: 'Repeticiones', unidad: 'reps', mejorEs: 'mayor' },
  { id: 'aciertos', nombre: 'Aciertos', unidad: '/5', mejorEs: 'mayor' },
  { id: 'cualitativa', nombre: 'Cualitativa', unidad: '', mejorEs: 'mayor' },
];
