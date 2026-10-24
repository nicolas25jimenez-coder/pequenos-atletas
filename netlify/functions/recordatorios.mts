// Tarea programada: 07:00 hora de Bogotá (12:00 UTC). Recordatorios de pago y eventos, resumen al entrenador.
import { tareasMatutinas } from './lib.mts';

export default async () => {
  const r = await tareasMatutinas();
  console.log('recordatorios', JSON.stringify(r));
};

export const config = { schedule: '0 12 * * *' };
