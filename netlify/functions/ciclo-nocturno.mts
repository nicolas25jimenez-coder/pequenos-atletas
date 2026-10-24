// Tarea programada: 00:05 hora de Bogotá (05:05 UTC). Genera cobros del ciclo y marca vencidos.
import { tareasNocturnas } from './lib.mts';

export default async () => {
  const r = await tareasNocturnas();
  console.log('ciclo-nocturno', JSON.stringify(r));
};

export const config = { schedule: '5 5 * * *' };
