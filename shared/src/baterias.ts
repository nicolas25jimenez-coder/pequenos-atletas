// Repositorio de pruebas: baterías TGMD-3 y MOBAK-KG (protocolos resumidos).
// MOBAK-KG: Herrmann et al., manual 3.ª ed. (zenodo.org/records/3774438), 8 tareas, 0-2 puntos por tarea.
// TGMD-3: Ulrich (2019). Los criterios están RESUMIDOS con palabras propias (el manual tiene derechos de autor):
// el entrenador debe confirmarlos con el manual original antes de usarlos como evaluación oficial.
import type { Familia, Prueba } from './tipos';

export type BateriaId = 'mobak' | 'tgmd3';

export interface TareaBateria {
  id: string; // id de la prueba en el catálogo (pruebas/<id>)
  nombre: string;
  area: string; // área o subprueba dentro de la batería
  familia: Familia;
  capacidad: string;
  evalua: string; // aspecto que se evalúa
  descripcion: string; // descripción textual de la tarea
  materiales: string;
  montaje?: string;
  criterios: string[]; // criterios de ejecución correcta (TGMD-3) o de acierto (MOBAK)
  maximo: number; // puntaje máximo que se registra
  medida: string; // unidad de medida, en palabras sencillas
  busquedaVideo: string; // texto para buscar un video de ejemplo
}

export interface Bateria {
  id: BateriaId;
  nombre: string;
  siglas: string;
  edades: string;
  resumen: string;
  fuente: string;
  areas: { id: string; nombre: string; detalle: string }[];
  tareas: TareaBateria[];
}

const TGMD_MEDIDA = 'Ejecución correcta (1) o por corregir (0) en cada criterio, en 2 intentos. Se registra la suma de criterios logrados.';

export const BATERIAS: Bateria[] = [
  {
    id: 'tgmd3', nombre: 'Test de Desarrollo Motor Grueso', siglas: 'TGMD-3', edades: '3 a 10 años',
    resumen: 'Evalúa cómo se hace el movimiento (no qué tan lejos ni qué tan rápido). Cada habilidad tiene unos criterios; se marca 1 si se ve y 0 si no, en 2 intentos.',
    fuente: 'Ulrich, D. A. (2019). Test of Gross Motor Development, 3rd ed. Resumen propio de los criterios: confirmar con el manual.',
    areas: [
      { id: 'locomotoras', nombre: 'Habilidades locomotoras', detalle: 'Desplazamientos: correr, galopar, saltar y deslizarse.' },
      { id: 'balon', nombre: 'Habilidades con balón', detalle: 'Golpear, botar, atrapar, patear y lanzar.' },
    ],
    tareas: [
      { id: 'tgmd_correr', nombre: 'Correr', area: 'locomotoras', familia: 'locomocion', capacidad: 'Coordinación', evalua: 'Patrón de carrera: braceo, fase de vuelo y apoyo.',
        descripcion: 'El niño corre a toda velocidad entre dos líneas separadas unos 15 m, con espacio de frenado al final.', materiales: '2 conos, cinta, espacio de 15 m o más',
        criterios: ['Los brazos se doblan y se mueven contrarios a las piernas.', 'Hay un momento en que los dos pies están en el aire.', 'El pie apoya sobre la punta o el talón y en línea estrecha (no plano).', 'La pierna de atrás se dobla cerca de 90° (talón hacia los glúteos).'], maximo: 8, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 run skill demonstration' },
      { id: 'tgmd_galopar', nombre: 'Galopar', area: 'locomotoras', familia: 'locomocion', capacidad: 'Coordinación', evalua: 'Patrón de galope: paso y arrastre con un pie siempre adelante.',
        descripcion: 'Galopa en línea recta unos 8 m, lo más fluido posible, con el mismo pie adelante.', materiales: '2 conos, cinta, espacio de 8 m',
        criterios: ['Brazos doblados y levantados a la altura de la cintura.', 'Da un paso adelante con un pie y el otro pie llega junto o detrás.', 'Hay un momento en que ambos pies están en el aire.', 'Mantiene el ritmo durante 4 galopes seguidos.'], maximo: 8, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 gallop skill demonstration' },
      { id: 'tgmd_saltar_pie', nombre: 'Saltar en un pie (hop)', area: 'locomotoras', familia: 'locomocion', capacidad: 'Fuerza', evalua: 'Salto repetido sobre una sola pierna.',
        descripcion: 'Salta sobre su pie preferido 4 veces seguidas y luego sobre el otro pie, 4 veces seguidas.', materiales: 'Espacio libre, cinta',
        criterios: ['La pierna que no apoya se dobla y se balancea hacia adelante como un péndulo.', 'El pie de la pierna libre se queda detrás del cuerpo.', 'Los brazos se doblan y se balancean hacia adelante al despegar.', 'Salta 4 veces seguidas con el pie preferido.', 'Salta 4 veces seguidas con el otro pie.'], maximo: 10, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 hop skill demonstration' },
      { id: 'tgmd_salto_largo', nombre: 'Salto horizontal', area: 'locomotoras', familia: 'locomocion', capacidad: 'Fuerza', evalua: 'Coordinación de brazos y piernas en el salto largo.',
        descripcion: 'Salta lo más lejos que pueda con los dos pies desde una línea.', materiales: 'Cinta de piso, espacio libre',
        criterios: ['Antes de saltar dobla las rodillas y los brazos hacia atrás.', 'Los brazos se estiran con fuerza hacia adelante y arriba.', 'Despega y cae con los dos pies a la vez.', 'Los brazos bajan con fuerza al caer.'], maximo: 8, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 horizontal jump demonstration' },
      { id: 'tgmd_deslizarse', nombre: 'Deslizarse lateral', area: 'locomotoras', familia: 'locomocion', capacidad: 'Agilidad', evalua: 'Desplazamiento lateral con paso y arrastre.',
        descripcion: 'Se desliza de lado a lo largo de unos 8 m, primero hacia un lado y luego hacia el otro.', materiales: '2 conos, cinta, espacio de 8 m',
        criterios: ['El cuerpo queda de lado, con los hombros alineados con la línea.', 'Da un paso lateral y el otro pie se desliza hasta quedar junto al primero.', 'Hace al menos 4 pasos continuos hacia la derecha.', 'Hace al menos 4 pasos continuos hacia la izquierda.'], maximo: 8, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 slide skill demonstration' },
      { id: 'tgmd_golpeo_dos_manos', nombre: 'Golpeo con dos manos (bate)', area: 'balon', familia: 'manipulacion_manos', capacidad: 'Coordinación', evalua: 'Rotación del cuerpo y transferencia de peso al golpear.',
        descripcion: 'Golpea con un bate una pelota quieta sobre un tee, a la altura de la cintura.', materiales: 'Bate liviano, tee, pelota blanda, pared o red',
        criterios: ['La mano dominante agarra el bate por encima de la otra.', 'El costado no dominante queda hacia adelante, pies paralelos.', 'Rota la cadera y el tronco al golpear.', 'Pasa el peso al pie de adelante.', 'El bate golpea la pelota.'], maximo: 10, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 two hand strike demonstration' },
      { id: 'tgmd_golpeo_una_mano', nombre: 'Golpeo con una mano (paleta)', area: 'balon', familia: 'manipulacion_manos', capacidad: 'Coordinación', evalua: 'Golpeo de derecha con paleta o raqueta.',
        descripcion: 'Golpea una pelota (que rebota una vez) con una paleta, hacia una pared.', materiales: 'Paleta corta, pelota de espuma, pared',
        criterios: ['Agarra la paleta con la palma, como un saludo de manos.', 'Se pone de lado respecto al objetivo.', 'Da un paso con el pie contrario a la mano que golpea.', 'Golpea la pelota hacia adelante y la manda hacia la pared.'], maximo: 8, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 forehand strike demonstration' },
      { id: 'tgmd_botar', nombre: 'Botar el balón (sin moverse)', area: 'balon', familia: 'manipulacion_manos', capacidad: 'Coordinación', evalua: 'Control del balón con una mano.',
        descripcion: 'Bota el balón 4 veces seguidas con una mano sin mover los pies y sin perder el control.', materiales: 'Balón de 20 cm aprox., superficie dura',
        criterios: ['Toca el balón con una mano a la altura de la cintura.', 'Empuja el balón con las yemas de los dedos (no lo golpea con la palma).', 'Mantiene el control del balón 4 botes seguidos sin mover los pies.'], maximo: 6, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 stationary dribble demonstration' },
      { id: 'tgmd_atrapar', nombre: 'Atrapar con dos manos', area: 'balon', familia: 'manipulacion_manos', capacidad: 'Coordinación', evalua: 'Preparación y recepción del balón sin ayuda del pecho.',
        descripcion: 'Atrapa una pelota lanzada suavemente desde unos 5 m, con un solo bote opcional según el manual.', materiales: 'Pelota de 20 cm aprox., 2 líneas a 5 m',
        criterios: ['Se prepara con las manos al frente y los codos doblados.', 'Estira los brazos para recibir la pelota.', 'Atrapa la pelota solo con las manos.'], maximo: 6, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 two hand catch demonstration' },
      { id: 'tgmd_patear', nombre: 'Patear', area: 'balon', familia: 'manipulacion_pies', capacidad: 'Fuerza', evalua: 'Carrera de aproximación, golpeo y seguimiento.',
        descripcion: 'Corre hacia un balón quieto y lo patea con fuerza hacia una pared a unos 6 m.', materiales: 'Balón, pared, conos, cinta',
        criterios: ['Se acerca al balón con una carrera rápida y continua.', 'Da un paso largo o salta justo antes del golpeo.', 'El pie de apoyo queda al lado o un poco detrás del balón.', 'Patea con el empeine o el interior del pie.'], maximo: 8, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 kick demonstration' },
      { id: 'tgmd_lanzar_arriba', nombre: 'Lanzar por encima del hombro', area: 'balon', familia: 'manipulacion_manos', capacidad: 'Fuerza', evalua: 'Preparación, rotación y seguimiento del lanzamiento.',
        descripcion: 'Lanza con una mano por encima del hombro una pelota pequeña hacia una pared a unos 6 m.', materiales: 'Pelota pequeña, pared, cinta',
        criterios: ['Hace un movimiento de preparación hacia atrás con la mano y el brazo.', 'Rota la cadera y los hombros hasta quedar de lado.', 'Da un paso con el pie contrario al brazo que lanza.', 'La mano sigue el movimiento hacia abajo, cruzando el cuerpo.'], maximo: 8, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 overhand throw demonstration' },
      { id: 'tgmd_lanzar_abajo', nombre: 'Lanzar por debajo', area: 'balon', familia: 'manipulacion_manos', capacidad: 'Precisión', evalua: 'Lanzamiento de abajo hacia adelante con control.',
        descripcion: 'Lanza con una mano, de abajo hacia adelante, una pelota hacia una pared a unos 6 m.', materiales: 'Pelota blanda, pared, cinta',
        criterios: ['La mano preferida se balancea hacia atrás, por detrás del tronco.', 'Da un paso con el pie contrario a la mano que lanza.', 'Suelta la pelota cerca de la altura de la rodilla.', 'La mano sigue el movimiento hacia adelante y arriba.'], maximo: 8, medida: TGMD_MEDIDA, busquedaVideo: 'TGMD-3 underhand throw demonstration' },
    ],
  },
  {
    id: 'mobak', nombre: 'Competencias motrices básicas en kínder', siglas: 'MOBAK-KG', edades: '4 a 6 años',
    resumen: '8 tareas cortas en dos áreas. Cada tarea da 0, 1 o 2 puntos (máximo 8 por área). Lanzar y atrapar: 6 intentos. Las demás tareas: 2 intentos, cada uno aprobado o fallado.',
    fuente: 'Herrmann, C. et al. MOBAK-KG: manual del test, 3.ª ed. (Universidad de Educación de Zúrich). zenodo.org/records/3774437',
    areas: [
      { id: 'objetos', nombre: 'Manipulación de objetos', detalle: 'Lanzar, atrapar, botar y conducir con el pie. Máximo 8 puntos.' },
      { id: 'cuerpo', nombre: 'Locomoción y control del cuerpo', detalle: 'Equilibrar, rodar, saltar y correr. Máximo 8 puntos.' },
    ],
    tareas: [
      { id: 'mobak_lanzar', nombre: 'Lanzar', area: 'objetos', familia: 'manipulacion_manos', capacidad: 'Precisión', evalua: 'Acertar a un blanco con un balón.',
        descripcion: 'Desde detrás de la línea lanza 6 pelotas contra un blanco en la pared. Cada acierto cuenta un punto.',
        montaje: 'Blanco redondo (40 cm) con el borde inferior a 1,1 m de altura. Línea a 1,5 m de la pared (con la parte del medio del cajón de salto sobre la línea).',
        materiales: '6 pelotas de lanzamiento (65 mm, 80 g), blanco redondo de 40 cm, sección media de cajón, cinta',
        criterios: ['El niño se queda detrás de la línea.', 'Pegarle al blanco cuenta un acierto.', 'Puede lanzar como quiera (también se permite empujar la pelota).'], maximo: 6, medida: 'Aciertos de 6 intentos. 0-2 aciertos = 0 puntos · 3-4 = 1 punto · 5-6 = 2 puntos.', busquedaVideo: 'MOBAK-KG throwing test' },
      { id: 'mobak_atrapar', nombre: 'Atrapar', area: 'objetos', familia: 'manipulacion_manos', capacidad: 'Coordinación', evalua: 'Atrapar un balón después de un bote.',
        descripcion: 'El evaluador lanza el balón contra el piso para que rebote hasta unos 1,1 m. El niño lo atrapa después del bote. 6 intentos.',
        montaje: 'Dos líneas separadas 1,5 m entre el evaluador y el niño; marca en el centro a 0,75 m. Un palo marca la altura de 1,1 m.',
        materiales: 'Balón de baloncesto talla 3, un palo, cinta',
        criterios: ['El balón se atrapa después del bote.', 'Se atrapa con las palmas de las manos.', 'No vale atraparlo contra el pecho.'], maximo: 6, medida: 'Atrapadas de 6 intentos. 0-2 = 0 puntos · 3-4 = 1 punto · 5-6 = 2 puntos.', busquedaVideo: 'MOBAK-KG catching test' },
      { id: 'mobak_botar', nombre: 'Botar', area: 'objetos', familia: 'manipulacion_manos', capacidad: 'Coordinación', evalua: 'Botar y atrapar el balón de forma continua.',
        descripcion: 'Bota el balón con las dos manos y lo atrapa, sin perderlo. Se permiten hasta 10 botes por intento; 2 intentos.',
        montaje: 'Una cruz de cinta en el piso, en un espacio abierto.', materiales: 'Balón de voleibol talla 5, cinta',
        criterios: ['Al menos 5 botes seguidos sin error desde el comienzo.', 'No pierde el balón.', 'Empuja el balón con el antebrazo (no lo suelta).', 'Bota con ritmo, máximo 1 s entre botes.', 'Atrapa con las palmas a la altura de la que lo soltó.'], maximo: 2, medida: 'Intentos aprobados (0, 1 o 2) = puntos directamente.', busquedaVideo: 'MOBAK-KG bouncing test' },
      { id: 'mobak_conducir', nombre: 'Conducir con el pie (dribbling)', area: 'objetos', familia: 'manipulacion_pies', capacidad: 'Coordinación', evalua: 'Conducir el balón con los pies por un pasillo.',
        descripcion: 'Conduce el balón con los pies rodeando dos secciones de cajón por un pasillo hasta la meta. No importa la rapidez, sino hacerlo sin errores. 2 intentos.',
        montaje: 'Pasillo de 2,8 × 9 m con conos en las esquinas; cajones puestos de lado a los 3 m y a los 6 m.', materiales: 'Balón de futsal talla 4, 4 conos, 2 secciones de cajón, cinta',
        criterios: ['Avanza de forma fluida y continua (sin parar más de 1 s).', 'No toca el balón con las manos.', 'Ni el niño ni el balón salen del pasillo.', 'No toca las marcas laterales ni los cajones.'], maximo: 2, medida: 'Intentos aprobados (0, 1 o 2) = puntos directamente.', busquedaVideo: 'MOBAK-KG dribbling test' },
      { id: 'mobak_equilibrio', nombre: 'Equilibrio', area: 'cuerpo', familia: 'equilibrio', capacidad: 'Equilibrio', evalua: 'Equilibrio dinámico hacia adelante y hacia atrás.',
        descripcion: 'Camina sobre un banco largo volteado: hacia adelante hasta la segunda marca, la toca y regresa caminando hacia atrás. 2 intentos.',
        montaje: 'Banco largo boca abajo, con un extremo contra la pared; 3 m marcados en el centro.', materiales: 'Banco largo (38 cm de alto, mínimo 3,2 m), cinta',
        criterios: ['No se detiene (más de 1 s) y se ve el movimiento fluido.', 'Toca la marca.', 'No sale del banco.', 'Va de frente (no de lado), con la cadera perpendicular al banco.', 'No vale poner un pie junto al otro paso a paso.'], maximo: 2, medida: 'Intentos aprobados (0, 1 o 2) = puntos directamente.', busquedaVideo: 'MOBAK-KG balancing test' },
      { id: 'mobak_rodar', nombre: 'Rodar', area: 'cuerpo', familia: 'equilibrio', capacidad: 'Coordinación', evalua: 'Rollo adelante fluido hasta quedar de pie.',
        descripcion: 'Desde en cuclillas sobre la sección del cajón hace un rollo adelante por el plano inclinado y queda de pie, todo en un solo movimiento. 2 intentos.',
        montaje: 'Dos colchonetas sobre un trampolín formando un plano inclinado; delante, una sección superior de cajón.', materiales: '2 colchonetas, trampolín, sección de cajón',
        criterios: ['El movimiento es fluido, sin interrupciones.', 'Rueda recto con la espalda redonda, sobre la nuca.', 'No rueda de lado ni sobre el hombro.', 'No se levanta con las piernas cruzadas.', 'Puede apoyar las manos al levantarse; si hay que intervenir, el intento falla.'], maximo: 2, medida: 'Intentos aprobados (0, 1 o 2) = puntos directamente.', busquedaVideo: 'MOBAK-KG rolling test' },
      { id: 'mobak_saltar', nombre: 'Saltar en un pie', area: 'cuerpo', familia: 'locomocion', capacidad: 'Fuerza', evalua: 'Saltos continuos hacia adelante sobre una pierna.',
        descripcion: 'Parte con los dos pies detrás de la línea y salta en un pie hasta la línea final; da la vuelta y regresa saltando con el otro pie. 2 intentos.',
        montaje: 'Dos líneas a 3 m de distancia marcadas con cinta y conos.', materiales: '4 conos, cinta',
        criterios: ['Salta sin detenerse más de 1 s.', 'Mantiene el salto sobre una sola pierna toda la distancia.', 'Puede apoyar los dos pies un momento al girar.', 'Elige libremente con qué pierna empieza; cambia de pierna al regresar.'], maximo: 2, medida: 'Intentos aprobados (0, 1 o 2) = puntos directamente.', busquedaVideo: 'MOBAK-KG jumping test' },
      { id: 'mobak_correr', nombre: 'Correr (adelante y atrás)', area: 'cuerpo', familia: 'locomocion', capacidad: 'Agilidad', evalua: 'Correr hacia adelante y hacia atrás con control.',
        descripcion: 'Corre hacia adelante hasta tocar la pared, luego corre hacia atrás hasta tocar la línea de salida y repite todo una vez más. Eso cuenta como un intento. 2 intentos.',
        montaje: 'Pasillo de 0,6 × 4 m perpendicular a la pared, con conos y cinta.', materiales: '6 conos, cinta',
        criterios: ['Pasos continuos, sin interrupciones, dos veces ida y vuelta.', 'No toca los conos ni las líneas laterales.', 'Toca la pared y la línea de salida.', 'La cadera se mantiene perpendicular a la dirección de la carrera.'], maximo: 2, medida: 'Intentos aprobados (0, 1 o 2) = puntos directamente.', busquedaVideo: 'MOBAK-KG running test' },
    ],
  },
];

export const bateriaPorId = (id?: string) => BATERIAS.find((b) => b.id === id);
export const tareaPorId = (id?: string) => {
  for (const b of BATERIAS) { const t = b.tareas.find((x) => x.id === id); if (t) return { bateria: b, tarea: t }; }
  return undefined;
};

/** Convierte las tareas de las baterías en pruebas del catálogo, para poder usarlas en sesiones de control. */
export function pruebasDeBaterias(): Prueba[] {
  return BATERIAS.flatMap((b) => b.tareas.map((t): Prueba => ({
    id: t.id, nombre: `${b.siglas} · ${t.nombre}`, familia: t.familia, capacidad: t.capacidad, objetivo: t.evalua,
    protocolo: t.descripcion, materiales: t.materiales, deportesRelacionados: [], tipoResultado: 'aciertos', unidad: `/${t.maximo}`,
    mejorEs: 'mayor', intentos: 1, agregacion: 'mejor', maximo: t.maximo, referencias: [], esDelCatalogoBase: true, activa: true,
    bateria: b.id,
  })));
}

/** Media, mediana y moda de una lista de valores (la moda devuelve todos los empatados). */
export function estadisticas(valores: number[]): { n: number; media: number; mediana: number; moda: number[] } | null {
  if (!valores.length) return null;
  const r = (x: number) => Math.round(x * 100) / 100;
  const orden = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  const mediana = orden.length % 2 ? orden[mitad] : (orden[mitad - 1] + orden[mitad]) / 2;
  const cuenta = new Map<number, number>();
  for (const v of orden) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  const max = Math.max(...cuenta.values());
  const moda = max === 1 && orden.length > 1 ? [] : [...cuenta].filter(([, c]) => c === max).map(([v]) => v);
  return { n: orden.length, media: r(orden.reduce((a, b) => a + b, 0) / orden.length), mediana: r(mediana), moda };
}
