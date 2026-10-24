import { useState } from 'react';
import { ahoraIso, type PreferenciasNotificacion } from '@pa/shared';
import { actualizar, guardar, idNuevo } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import { Boton, Campo, Etiqueta, Hoja, Interruptor, Kicker, Selector, Tarjeta, Volver, useToast, AreaTexto } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useFamilia } from './familia';

const PREFS: { k: keyof PreferenciasNotificacion; t: string }[] = [
  { k: 'inasistencia', t: 'Cuando mi hijo falta a una sesión' },
  { k: 'resultados', t: 'Nuevos resultados de pruebas' },
  { k: 'eventos', t: 'Recordatorios de eventos' },
  { k: 'pagoRegistrado', t: 'Confirmación de pago registrado' },
  { k: 'solicitudes', t: 'Respuesta a mis solicitudes de cambio' },
];

export function Cuenta() {
  const { perfil, usuario } = useSesion();
  const toast = useToast();
  const { ninos } = useFamilia();
  const [nombres, setNombres] = useState(perfil?.nombres ?? '');
  const [apellidos, setApellidos] = useState(perfil?.apellidos ?? '');
  const [telefono, setTelefono] = useState(perfil?.telefono ?? '');
  const [guardando, setGuardando] = useState(false);
  const [hoja, setHoja] = useState<'retiro' | 'supresion' | null>(null);
  const prefs = { pagoRegistrado: true, inasistencia: true, resultados: true, eventos: true, solicitudes: true, ...perfil?.preferenciasNotificacion };

  if (!perfil || !usuario) return null;

  async function guardar() {
    setGuardando(true);
    try { await actualizar('usuarios', usuario!.uid, { nombres: nombres.trim(), apellidos: apellidos.trim(), telefono: telefono.trim(), actualizadoEn: ahoraIso() }); toast('Datos actualizados'); }
    catch (e) { toast(mensajeError(e), 'error'); }
    setGuardando(false);
  }
  async function pref(k: keyof PreferenciasNotificacion, v: boolean) {
    await actualizar('usuarios', usuario!.uid, { [`preferenciasNotificacion.${k}`]: v });
  }

  return (
    <Pantalla>
      <Volver a="/p/mas">Más</Volver>
      <div className="titulo text-[30px]">Mi cuenta</div>
      <Tarjeta className="gap-3.5">
        <Kicker>Mis datos</Kicker>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Nombres"><Campo value={nombres} onChange={(e) => setNombres(e.target.value)} /></Etiqueta>
          <Etiqueta texto="Apellidos"><Campo value={apellidos} onChange={(e) => setApellidos(e.target.value)} /></Etiqueta>
          <Etiqueta texto="Teléfono" className="col-span-2"><Campo value={telefono} onChange={(e) => setTelefono(e.target.value)} type="tel" /></Etiqueta>
          <Etiqueta texto="Correo" className="col-span-2" ayuda="Para cambiar el correo escríbele al entrenador."><Campo value={perfil.correo} disabled /></Etiqueta>
        </div>
        <Boton onClick={guardar} cargando={guardando}>Guardar</Boton>
      </Tarjeta>
      <Tarjeta className="gap-3.5">
        <Kicker>Notificaciones</Kicker>
        {PREFS.map((p) => <Interruptor key={p.k} activo={prefs[p.k]} onCambio={(v) => pref(p.k, v)}>{p.t}</Interruptor>)}
        <div className="text-xs text-tenue leading-snug">Los recordatorios de pago, los anuncios y las cancelaciones siempre se envían.</div>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Privacidad y retiro</Kicker>
        <Boton variante="secundario" onClick={() => setHoja('retiro')} disabled={!ninos.some((n) => n.estado === 'activo')}>Solicitar retiro de un hijo</Boton>
        <Boton variante="secundario" onClick={() => setHoja('supresion')} disabled={!ninos.length}>Solicitar eliminación de mis datos</Boton>
        <div className="text-xs text-tenue leading-snug">Derechos de habeas data (Ley 1581 de 2012). El entrenador procesa la solicitud y te responde.</div>
      </Tarjeta>
      <SolicitudEspecial tipo={hoja} onCerrar={() => setHoja(null)} />
    </Pantalla>
  );
}

function SolicitudEspecial({ tipo, onCerrar }: { tipo: 'retiro' | 'supresion' | null; onCerrar: () => void }) {
  const { perfil, usuario } = useSesion();
  const { ninos } = useFamilia();
  const toast = useToast();
  const activos = ninos.filter((n) => tipo === 'supresion' || n.estado === 'activo');
  const [ninoId, setNinoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const nino = activos.find((n) => n.id === ninoId) ?? activos[0];

  async function enviar() {
    if (!nino || !usuario) return;
    setEnviando(true);
    try {
      await guardar('solicitudesCambio', {
        id: idNuevo('solicitudesCambio'), ninoId: nino.id, acudientesIds: nino.acudientesIds, solicitadoPor: usuario.uid, solicitadoPorNombre: `${perfil?.nombres} ${perfil?.apellidos}`,
        seccion: tipo === 'retiro' ? 'Retiro' : 'Habeas data', campo: tipo === 'retiro' ? '__retiro' : '__supresion',
        etiqueta: tipo === 'retiro' ? `Retiro de ${nino.nombres}` : 'Eliminación de datos personales',
        valorActual: nino.estado, valorPropuesto: motivo.trim() || (tipo === 'retiro' ? 'Retiro voluntario' : 'Supresión solicitada'),
        estado: 'pendiente', creadoEn: ahoraIso(), actualizadoEn: ahoraIso(), creadoPor: usuario.uid,
      });
      toast('Solicitud enviada al entrenador.');
      setMotivo(''); onCerrar();
    } catch (e) { toast(mensajeError(e), 'error'); }
    setEnviando(false);
  }

  return (
    <Hoja abierta={!!tipo} onCerrar={onCerrar} titulo={tipo === 'retiro' ? 'Solicitar retiro' : 'Eliminar mis datos'}>
      {activos.length > 1 && (
        <Etiqueta texto={tipo === 'retiro' ? 'Hijo' : 'Datos relacionados con'}>
          <Selector value={nino?.id} onChange={(e) => setNinoId(e.target.value)}>{activos.map((n) => <option key={n.id} value={n.id}>{n.nombres} {n.apellidos}</option>)}</Selector>
        </Etiqueta>
      )}
      <Etiqueta texto="Motivo (opcional)"><AreaTexto value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={tipo === 'retiro' ? 'Ej. cambio de horario, cambio de ciudad…' : 'Cuéntanos qué datos quieres eliminar'} /></Etiqueta>
      {tipo === 'retiro' && <div className="text-xs text-tenue leading-snug">Al retirarse, el perfil se inactiva, no se generan más cobros y conservas el acceso de solo lectura al historial.</div>}
      <Boton onClick={enviar} cargando={enviando} variante={tipo === 'supresion' ? 'peligro' : 'primario'}>Enviar solicitud</Boton>
    </Hoja>
  );
}
