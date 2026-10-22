import type { Evento } from '@pa/shared';

/** Convierte '2026-10-31T09:00:00-05:00' a formato UTC de iCalendar. */
function aUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export function generarIcs(e: Evento): string {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pequeños Atletas//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@pequenosatletas`,
    `DTSTAMP:${aUtc(new Date().toISOString())}`,
    `DTSTART:${aUtc(e.fechaInicio)}`,
    `DTEND:${aUtc(e.fechaFin)}`,
    `SUMMARY:${esc(e.titulo)}`,
    `DESCRIPTION:${esc(e.descripcion ?? '')}`,
    `LOCATION:${esc(e.lugar)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.titulo)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export function descargarIcs(e: Evento) {
  const url = URL.createObjectURL(new Blob([generarIcs(e)], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${e.titulo.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
