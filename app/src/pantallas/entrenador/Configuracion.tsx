// Configuración de la escuela (RF-E44, RF-E45).
import { Lightning } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import type { Configuracion as TConfig } from '@pa/shared';
import { guardar as guardarDoc, useConfiguracion } from '../../lib/datos';
import { supabase } from '../../lib/supabase';
import { usaEmuladores } from '../../lib/config';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, Etiqueta, Kicker, Tarjeta, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';

export function Configuracion() {
  const toast = useToast();
  const actual = useConfiguracion();
  const [c, setC] = useState<TConfig>(actual);
  const [tallas, setTallas] = useState(actual.tallasUniforme.join(', '));
  const [guardando, setGuardando] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  useEffect(() => { setC(actual); setTallas(actual.tallasUniforme.join(', ')); }, [JSON.stringify(actual)]); // eslint-disable-line react-hooks/exhaustive-deps
  const num = (k: keyof TConfig) => (e: { target: { value: string } }) => setC({ ...c, [k]: Number(e.target.value.replace(/\D/g, '')) });

  async function guardar() {
    setGuardando(true);
    try {
      await guardarDoc('configuracion', { ...c, id: 'general', telefonoWhatsApp: c.telefonoWhatsApp.replace(/\D/g, ''), tallasUniforme: tallas.split(',').map((t) => t.trim()).filter(Boolean) });
      toast('Configuración guardada');
    } catch (e) { toast(mensajeError(e), 'error'); }
    setGuardando(false);
  }
  async function ejecutar() {
    setEjecutando(true);
    try {
      const { data: ses } = await supabase.auth.getSession();
      const resp = await fetch('/.netlify/functions/ejecutar-tareas', { method: 'POST', headers: { Authorization: `Bearer ${ses.session?.access_token ?? ''}` } });
      if (resp.status === 404) throw new Error('Las tareas automáticas todavía no están disponibles en esta versión de la app.');
      if (!resp.ok) throw new Error(`No se pudieron ejecutar las tareas (error ${resp.status}).`);
      const r = (await resp.json()) as Record<string, number>;
      toast(`Listo: ${r.creados} cobros nuevos, ${r.vencidos} vencidos, ${(r.previos ?? 0) + (r.delMes ?? 0) + (r.vencidos ?? 0)} recordatorios de pago, ${(r.eventos ?? 0) + (r.confirmar ?? 0)} de eventos.`);
    } catch (e) { toast(mensajeError(e), 'error'); }
    setEjecutando(false);
  }

  return (
    <Pantalla>
      <Volver a="/e/mas">Más</Volver>
      <div className="titulo text-[30px]">Configuración</div>
      <Tarjeta className="gap-3">
        <Kicker>Escuela</Kicker>
        <Etiqueta texto="Nombre"><Campo value={c.nombreEscuela} onChange={(e) => setC({ ...c, nombreEscuela: e.target.value })} /></Etiqueta>
        <Etiqueta texto="WhatsApp del entrenador" ayuda="Con indicativo, sin +. Ej. 573004128890"><Campo inputMode="numeric" value={c.telefonoWhatsApp} onChange={(e) => setC({ ...c, telefonoWhatsApp: e.target.value })} /></Etiqueta>
        <Etiqueta texto="Correo de contacto"><Campo type="email" value={c.correoContacto} onChange={(e) => setC({ ...c, correoContacto: e.target.value })} /></Etiqueta>
        <Etiqueta texto="Tallas de uniforme (separadas por coma)"><Campo value={tallas} onChange={(e) => setTallas(e.target.value)} /></Etiqueta>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Pagos y recordatorios</Kicker>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Días de gracia" ayuda="Del día de cobro al vencimiento"><Campo inputMode="numeric" value={c.diasGracia} onChange={num('diasGracia')} /></Etiqueta>
          <Etiqueta texto="Aviso previo (días)" ayuda="Antes del día de cobro"><Campo inputMode="numeric" value={c.diasRecordatorioPrevio} onChange={num('diasRecordatorioPrevio')} /></Etiqueta>
          <Etiqueta texto="Repetir si vencido (días)" ayuda="0 = no repetir"><Campo inputMode="numeric" value={c.recordarVencidosCadaDias} onChange={num('recordarVencidosCadaDias')} /></Etiqueta>
          <Etiqueta texto="Umbral de faltas (%)" ayuda="Para el reporte de asistencia"><Campo inputMode="numeric" value={c.umbralFaltas} onChange={num('umbralFaltas')} /></Etiqueta>
        </div>
        <div className="text-xs text-tenue">Los recordatorios se envían a las 7:00 a.m. Las notificaciones no salen entre las 9:00 p.m. y las 6:00 a.m.</div>
      </Tarjeta>
      <Boton alto="lg" onClick={guardar} cargando={guardando}>Guardar</Boton>
      <Tarjeta className="gap-3">
        <Kicker>Tareas automáticas</Kicker>
        <div className="text-[13px] text-suave">Cada noche se generan los cobros y se marcan los vencidos; cada mañana se envían los recordatorios. Puedes ejecutarlas ahora.</div>
        {usaEmuladores && <Aviso>En el modo de prueba local las tareas no corren solas: usa este botón para simularlas.</Aviso>}
        <Boton variante="secundario" icono={<Lightning weight="bold" />} onClick={ejecutar} cargando={ejecutando}>Ejecutar tareas de hoy</Boton>
      </Tarjeta>
    </Pantalla>
  );
}
