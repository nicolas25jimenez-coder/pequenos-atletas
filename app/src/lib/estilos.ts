import type { EstadoAsistencia, EstadoPago, NivelImc } from '@pa/shared';
import type { Comparacion } from '@pa/shared';
import { COLOR } from '../ui/base';

export const COLOR_ASISTENCIA: Record<EstadoAsistencia | 'cancelada', string> = {
  asistio: COLOR.verde, retardo: COLOR.ambar, excusa: COLOR.cielo, falto: COLOR.rojo, cancelada: COLOR.gris,
};

export const COLOR_PAGO: Record<EstadoPago, string> = {
  pagado: COLOR.verde, pendiente: COLOR.ambar, vencido: COLOR.rojo, exonerado: COLOR.azul, congelado: COLOR.gris,
};

export const COLOR_COMPARACION: Record<Comparacion, string> = {
  por_encima: COLOR.verde, esperado: COLOR.azul, por_debajo: COLOR.ambar,
};

export const COLOR_CUALITATIVA = [COLOR.ambar, COLOR.azul, COLOR.verde];

export const COLOR_IMC: Record<NivelImc, string> = { adecuado: COLOR.verde, leve: COLOR.ambar, alerta: COLOR.rojo };

export const COLOR_TENDENCIA = { mejor: COLOR.verde, peor: COLOR.ambar, igual: COLOR.tenue };
