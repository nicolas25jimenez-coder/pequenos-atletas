export const cop = (n: number) => '$ ' + Math.round(n).toLocaleString('es-CO');

export const num = (n: number, decimales = 1) => n.toLocaleString('es-CO', { maximumFractionDigits: decimales });

export const iniciales = (nombres: string, apellidos = '') =>
  ((nombres.trim()[0] ?? '') + (apellidos.trim()[0] ?? '')).toUpperCase();

export const nombreCorto = (nombres: string, apellidos = '') =>
  `${nombres.trim().split(/\s+/)[0]} ${apellidos.trim().split(/\s+/)[0] ?? ''}`.trim();

/** Enlace de WhatsApp con mensaje. `telefono` solo con dígitos e indicativo (57…). */
export const enlaceWhatsApp = (telefono: string, mensaje: string) =>
  `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;

export const normalizarCorreo = (c: string) => c.trim().toLowerCase();
