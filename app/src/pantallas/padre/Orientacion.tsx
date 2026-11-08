// Orientación médica: el acudiente ve a quién llamar y los datos de salud de su hijo. Cada uso queda registrado
// para que el entrenador sepa quién la usó y con qué frecuencia.
import { FirstAid, Phone, WhatsappLogo } from '@phosphor-icons/react';
import { useState } from 'react';
import { ahoraIso, enlaceWhatsApp } from '@pa/shared';
import { crear, idNuevo, useConfiguracion } from '../../lib/datos';
import { mensajeError } from '../../lib/errores';
import { useSesion } from '../../lib/sesion';
import { Aviso, Boton, COLOR, Etiqueta, Kicker, Selector, Tarjeta, Volver } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useFamilia } from './familia';

export interface OrientacionMedica {
  id: string;
  ninoId: string;
  acudientesIds: string[];
  usuarioId: string;
  motivo: string;
  fecha: string; // ISO con hora
}

const MOTIVOS = ['Golpe o caída', 'Fiebre o malestar', 'Alergia o reacción', 'Dolor', 'Otro'];

export function Orientacion() {
  const { usuario } = useSesion();
  const config = useConfiguracion();
  const { ninos, nino, elegir } = useFamilia();
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState('');

  async function pedir() {
    if (!nino || !usuario) return;
    setEnviando(true); setError('');
    try {
      const o: OrientacionMedica = { id: idNuevo('orientacionesMedicas'), ninoId: nino.id, acudientesIds: nino.acudientesIds, usuarioId: usuario.uid, motivo, fecha: ahoraIso() };
      await crear('orientacionesMedicas', o);
      setHecho(true);
    } catch (e) { setError(mensajeError(e)); }
    setEnviando(false);
  }

  const sinDato = (v?: string) => !v || !v.trim() || /^(ningun[oa]?|no|n\/a|-)$/i.test(v.trim());
  const fila = (t: string, v?: string) => (
    <div className="flex justify-between gap-4 text-sm"><span className="text-tenue">{t}</span><span className="text-right font-semibold">{sinDato(v) ? 'Ninguna registrada' : v}</span></div>
  );

  return (
    <Pantalla>
      <Volver a="/p/mas">Más</Volver>
      <div className="titulo text-[28px]">Orientación médica</div>
      <Aviso tono="alerta">Si es una emergencia grave, llama primero al <b>123</b>. Esta pantalla no reemplaza a un médico.</Aviso>
      {ninos.length > 1 && (
        <Etiqueta texto="¿Para quién?"><Selector value={nino?.id ?? ''} onChange={(e) => { elegir(e.target.value); setHecho(false); }}>{ninos.map((n) => <option key={n.id} value={n.id}>{n.nombres}</option>)}</Selector></Etiqueta>
      )}
      {!nino ? <Aviso>No encontramos a tu hijo.</Aviso> : !hecho ? (
        <Tarjeta className="gap-3">
          <Kicker icono={<FirstAid size={18} weight="bold" />} color={COLOR.rojo}>¿Qué pasó con {nino.nombres}?</Kicker>
          <div className="flex gap-2 flex-wrap">
            {MOTIVOS.map((m) => (
              <button key={m} onClick={() => setMotivo(m)} className={`px-3.5 py-2 rounded-full text-sm font-semibold border cursor-pointer ${motivo === m ? 'bg-rojo/20 border-rojo text-texto' : 'bg-sup border-white/10 text-suave'}`}>{m}</button>
            ))}
          </div>
          {error && <Aviso tono="error">{error}</Aviso>}
          <Boton alto="lg" icono={<FirstAid weight="bold" />} cargando={enviando} onClick={pedir}>Ver orientación</Boton>
          <div className="text-xs text-tenue">Al continuar, el entrenador recibe un aviso de que usaste esta ayuda.</div>
        </Tarjeta>
      ) : (<>
        <div className="grid grid-cols-2 gap-2">
          <a href="tel:123" className="no-underline"><Boton alto="lg" icono={<Phone weight="bold" />} className="w-full">Llamar al 123</Boton></a>
          <a href={enlaceWhatsApp(config.telefonoWhatsApp, `Hola profe, necesito orientación por ${nino.nombres}: ${motivo}. `)} target="_blank" rel="noreferrer" className="no-underline"><Boton alto="lg" variante="secundario" icono={<WhatsappLogo weight="bold" />} className="w-full">Escribir al profe</Boton></a>
        </div>
        <Tarjeta className="gap-2.5">
          <Kicker>Datos de salud de {nino.nombres}</Kicker>
          {fila('Tipo de sangre', nino.salud.tipoSangre)}
          {fila('Alergias', nino.salud.alergias)}
          {fila('Condiciones médicas', nino.salud.condicionesMedicas)}
          {fila('Medicamentos', nino.salud.medicamentos)}
        </Tarjeta>
        <Tarjeta className="gap-2.5">
          <Kicker>Seguro médico</Kicker>
          {fila('Entidad', nino.seguroMedico?.entidad)}
          {fila('Afiliación', nino.seguroMedico?.numeroAfiliacion)}
          {nino.seguroMedico?.telefonoEntidad && <a href={`tel:${nino.seguroMedico.telefonoEntidad.replace(/\D/g, '')}`} className="text-sm text-verde font-semibold no-underline">Llamar a {nino.seguroMedico.entidad}: {nino.seguroMedico.telefonoEntidad}</a>}
        </Tarjeta>
        {nino.contactos.filter((c) => c.telefono).length > 0 && (
          <Tarjeta className="gap-2.5">
            <Kicker>Contactos de emergencia</Kicker>
            {nino.contactos.filter((c) => c.telefono).map((c, i) => (
              <a key={i} href={`tel:${c.telefono.replace(/\D/g, '')}`} className="flex justify-between text-sm no-underline text-texto"><span>{c.nombre} <span className="text-tenue">· {c.parentesco}</span></span><b className="text-verde">{c.telefono}</b></a>
            ))}
          </Tarjeta>
        )}
        <Boton variante="secundario" onClick={() => setHecho(false)}>Volver</Boton>
      </>)}
    </Pantalla>
  );
}
