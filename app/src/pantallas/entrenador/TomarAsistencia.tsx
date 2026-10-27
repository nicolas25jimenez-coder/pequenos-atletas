// Toma de asistencia (RF-E19 a RF-E23), diseño del prototipo "ENTRENADOR · ASISTENCIA".
// Pensada para usarse en la cancha, con prisa y con una mano: botones altos, deshacer y confirmación en cambios importantes.
import { ArrowUUpLeft, CaretLeft, ChatCircleText, Check, Checks, Warning } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ahoraIso, ESTADOS_ASISTENCIA, ETIQUETA_ASISTENCIA, fechaChip, hora12, hoy,
  type Asistencia, type EstadoAsistencia, type Nino, type Sesion,
} from '@pa/shared';
import { lote, useColeccion, useDocumento } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { COLOR_ASISTENCIA } from '../../lib/estilos';
import { mensajeError } from '../../lib/errores';
import { alfa, AreaTexto, Boton, Campo, COLOR, Confirmar, EsqueletoLista, ErrorCarga, Etiqueta, Hoja, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { alertaSalud, iniNino, nombreNino, useEntrenador } from './contexto';

interface Marca { estado: EstadoAsistencia; observacion: string; minutosRetardo?: number }

export function TomarAsistencia() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { activos, porId, catPorId } = useEntrenador();
  const existente = useDocumento<Sesion>(`sesiones/${id}`);
  const { datos: s, cargando } = existente;
  const previas = useColeccion<Asistencia>('asistencias', [['sesionId', '==', id]]);
  const [marcas, setMarcas] = useState<Record<string, Marca>>({});
  const [cargadas, setCargadas] = useState(false);
  const [obs, setObs] = useState<Nino | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);
  const [confirmarSalir, setConfirmarSalir] = useState(false);
  // Aviso "Marcado: … · Deshacer": guarda la marca anterior para restaurarla.
  const [deshacer, setDeshacer] = useState<{ nid: string; texto: string; antes?: Marca } | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(temporizador.current), []);

  useEffect(() => {
    if (previas.cargando || cargadas) return;
    setMarcas(Object.fromEntries(previas.datos.map((a) => [a.ninoId, { estado: a.estado, observacion: a.observacion ?? '', minutosRetardo: a.minutosRetardo }])));
    setCargadas(true);
  }, [previas.cargando, previas.datos, cargadas]);

  const kids = useMemo(() => {
    if (!s) return [];
    const ids = new Set([...activos.filter((n) => n.categoriaId === s.categoriaId && (n.fechaInscripcion ?? '') <= s.fecha).map((n) => n.id), ...previas.datos.map((a) => a.ninoId)]);
    return [...ids].map((x) => porId.get(x)).filter(Boolean) as Nino[];
  }, [s, activos, previas.datos, porId]);

  // ¿Hay marcas distintas a lo ya guardado? Sirve para avisar antes de salir.
  const sucio = useMemo(() => {
    const claves = new Set([...Object.keys(marcas), ...previas.datos.map((a) => a.ninoId)]);
    return [...claves].some((k) => {
      const m = marcas[k];
      const p = previas.datos.find((a) => a.ninoId === k);
      if (!m || !p) return !!m !== !!p;
      return m.estado !== p.estado || m.observacion !== (p.observacion ?? '') || m.minutosRetardo !== p.minutosRetardo;
    });
  }, [marcas, previas.datos]);

  useEffect(() => {
    if (!sucio) return;
    const f = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [sucio]);

  const marcar = useCallback((nid: string, estado: EstadoAsistencia) => {
    setMarcas((m) => ({ ...m, [nid]: { ...(m[nid] ?? { observacion: '' }), estado } }));
    setDeshacer({ nid, texto: `Marcado: ${ETIQUETA_ASISTENCIA[estado]}`, antes: marcas[nid] });
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setDeshacer(null), 5000);
  }, [marcas]);

  function quitarMarca() {
    if (!deshacer) return;
    const { nid, antes } = deshacer;
    setMarcas((m) => {
      const { [nid]: _quitada, ...resto } = m;
      return antes ? { ...resto, [nid]: antes } : resto;
    });
    clearTimeout(temporizador.current);
    setDeshacer(null);
  }

  if (cargando || previas.cargando || (!cargadas && !previas.error)) {
    return <Pantalla><EsqueletoLista filas={5} alto={110} texto="Cargando la lista de niños…" /></Pantalla>;
  }
  if (previas.error || existente.error) {
    return <Pantalla><ErrorCarga mensaje={previas.error ?? existente.error} onReintentar={() => location.reload()} /></Pantalla>;
  }
  if (!s) return <Pantalla><ErrorCarga mensaje="No encontramos esta sesión." onReintentar={() => nav('/e/sesiones')} /></Pantalla>;

  const cat = catPorId.get(s.categoriaId);
  const marcados = kids.filter((n) => marcas[n.id]).length;
  const completo = marcados === kids.length && kids.length > 0;
  const conteo = ESTADOS_ASISTENCIA.map((e) => ({ e, n: kids.filter((k) => marcas[k.id]?.estado === e).length }));
  const faltas = kids.filter((k) => marcas[k.id]?.estado === 'falto').length;
  // Cambios importantes: hay faltas, o se editan marcas de una asistencia ya guardada.
  const pedirConfirmacion = faltas > 0 || (!!s.asistenciaGuardada && sucio);

  const todos = () => setMarcas((m) => Object.fromEntries(kids.map((k) => [k.id, m[k.id] ?? { estado: 'asistio' as const, observacion: '' }])));

  function intentarGuardar() {
    if (!completo) return;
    if (pedirConfirmacion) setConfirmarGuardar(true); else void guardar();
  }

  async function guardar() {
    setConfirmarGuardar(false);
    if (!completo || !usuario || !s) return;
    setGuardando(true);
    try {
      const b = lote();
      const t = ahoraIso();
      let cambios = 0;
      for (const n of kids) {
        const m = marcas[n.id];
        const previa = previas.datos.find((a) => a.ninoId === n.id);
        if (previa && previa.estado === m.estado && (previa.observacion ?? '') === m.observacion && previa.minutosRetardo === m.minutosRetardo) continue;
        const a: Asistencia = {
          id: `${s.id}_${n.id}`, sesionId: s.id, ninoId: n.id, acudientesIds: n.acudientesIds, categoriaId: s.categoriaId, fecha: s.fecha, tipoSesion: s.tipo,
          estado: m.estado, observacion: m.observacion.trim(), ...(m.estado === 'retardo' && m.minutosRetardo ? { minutosRetardo: m.minutosRetardo } : {}),
          historialCambios: [...(previa?.historialCambios ?? []), ...(previa?.estado !== m.estado ? [{ estadoAnterior: previa?.estado ?? null, estadoNuevo: m.estado, fecha: t, usuarioId: usuario.uid }] : [])],
          creadoEn: previa?.creadoEn ?? t, actualizadoEn: t, creadoPor: previa?.creadoPor ?? usuario.uid,
        };
        b.guardar('asistencias', a);
        cambios++;
      }
      b.actualizar('sesiones', s.id, { asistenciaGuardada: true, ...(s.fecha <= hoy() ? { estado: 'realizada' } : {}), actualizadoEn: t });
      await b.confirmar();
      toast(cambios ? `Asistencia guardada y publicada${faltas ? `. Se avisó a ${faltas} ${faltas === 1 ? 'familia' : 'familias'} por inasistencia` : ''}.` : 'No había cambios.');
      // Ya está guardado: se sale sin preguntar.
      setMarcas({});
      nav(`/e/sesion/${s.id}`, { replace: true });
      return;
    } catch (e) { toast(mensajeError(e), 'error'); }
    setGuardando(false);
  }

  const salir = () => { if (sucio) setConfirmarSalir(true); else nav(`/e/sesion/${s.id}`); };

  return (
    <Pantalla className="gap-3.5 pb-[260px]">
      <button onClick={salir} className="self-start flex items-center gap-1.5 h-11 pl-2.5 pr-3.5 rounded-full bg-sup border border-white/[0.08] text-texto text-[13px] font-semibold cursor-pointer">
        <CaretLeft weight="bold" /><span className="whitespace-nowrap">{cat?.nombre ?? 'Volver'}</span>
      </button>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-tenue">{fechaChip(s.fecha)} · {hora12(s.horaInicio)} · {s.tipo === 'control' ? 'Día de control' : 'Entrenamiento'}</span>
        <div className="titulo text-[30px]">Asistencia</div>
      </div>
      <Boton variante="punteado" className="h-14 text-sm" icono={<Checks weight="bold" size={20} />} onClick={todos}>Marcar todos como Asistió</Boton>
      {kids.map((n) => {
        const m = marcas[n.id];
        const alerta = alertaSalud(n);
        return (
          <div key={n.id} className="rounded-[22px] p-3 bg-sup flex flex-col gap-2.5" style={{ border: `1px solid ${m ? alfa(COLOR_ASISTENCIA[m.estado], 0.45) : 'rgba(255,255,255,0.07)'}` }}>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-[14px] shrink-0 bg-[#1F2638] flex items-center justify-center text-xs font-extrabold">{iniNino(n)}</span>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{nombreNino(n)}</span>
                <span className="text-xs font-bold" style={{ color: m ? COLOR_ASISTENCIA[m.estado] : COLOR.tenue }}>{m ? ETIQUETA_ASISTENCIA[m.estado] : 'Sin marcar'}</span>
                {m?.observacion && <span className="text-xs text-tenue truncate">“{m.observacion}”</span>}
              </div>
              <button onClick={() => setObs(n)} className="w-11 h-11 rounded-full bg-transparent border border-white/10 text-tenue cursor-pointer flex items-center justify-center shrink-0" aria-label={`Observación de ${nombreNino(n)}`}><ChatCircleText weight="bold" size={20} /></button>
            </div>
            {alerta && (
              <div className="flex items-start gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold leading-snug text-ambar" style={{ background: alfa(COLOR.ambar, 0.12) }}>
                <Warning weight="bold" size={16} className="shrink-0 mt-px" aria-hidden="true" /><span>Alerta de salud: {alerta}</span>
              </div>
            )}
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={`Asistencia de ${nombreNino(n)}`}>
              {ESTADOS_ASISTENCIA.map((e) => {
                const on = m?.estado === e;
                const c = COLOR_ASISTENCIA[e];
                return (
                  <button key={e} onClick={() => marcar(n.id, e)} aria-pressed={on}
                    className="h-14 min-w-0 rounded-[14px] text-sm font-extrabold cursor-pointer flex items-center justify-center gap-1 px-0.5"
                    style={{ background: on ? c : 'transparent', color: on ? (e === 'falto' ? '#fff' : COLOR.tinta) : '#C9CFDB', border: `1px solid ${on ? c : 'rgba(255,255,255,0.1)'}` }}>
                    {on && <Check weight="bold" size={14} aria-hidden="true" className="shrink-0" />}
                    <span className="truncate">{ETIQUETA_ASISTENCIA[e]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="fixed left-0 right-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-20 flex flex-col items-center gap-2 px-3 pointer-events-none">
        {deshacer && (
          <div role="status" className="pointer-events-auto w-full max-w-[456px] rounded-2xl pl-4 pr-1.5 bg-texto text-fondo flex items-center justify-between gap-2 shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
            <span className="text-sm font-semibold py-3 min-w-0 truncate">{deshacer.texto}{porId.get(deshacer.nid) ? ` · ${nombreNino(porId.get(deshacer.nid)!)}` : ''}</span>
            <button onClick={quitarMarca} className="h-11 px-3 rounded-xl bg-transparent border-0 text-marca text-sm font-extrabold cursor-pointer flex items-center gap-1.5 shrink-0">
              <ArrowUUpLeft weight="bold" size={16} aria-hidden="true" />Deshacer
            </button>
          </div>
        )}
        <div className="pointer-events-auto w-full max-w-[456px] rounded-3xl py-3 pr-3 pl-[18px] bg-[rgba(20,25,36,0.96)] border border-white/10 flex items-center gap-3 backdrop-blur-md">
          <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs font-bold">
            {conteo.map(({ e, n }) => <span key={e} style={{ color: COLOR_ASISTENCIA[e] }}>{n} {ETIQUETA_ASISTENCIA[e]}</span>)}
          </div>
          <Boton onClick={intentarGuardar} cargando={guardando} disabled={!completo} className="h-14 min-w-[116px] px-5 text-sm">
            {completo ? 'Guardar' : `Faltan ${kids.length - marcados}`}
          </Boton>
        </div>
      </div>

      <HojaObservacion nino={obs} marca={obs ? marcas[obs.id] : undefined} onCerrar={() => setObs(null)}
        onGuardar={(m) => { if (obs) setMarcas((x) => ({ ...x, [obs.id]: m })); setObs(null); }} />

      <Confirmar abierta={confirmarGuardar} titulo={s.asistenciaGuardada ? 'Guardar los cambios' : 'Guardar la asistencia'}
        texto={<>
          {faltas > 0 && <>Hay <b>{faltas}</b> {faltas === 1 ? 'falta' : 'faltas'}: se avisará a {faltas === 1 ? 'la familia' : 'las familias'}. </>}
          {s.asistenciaGuardada && 'Esta asistencia ya estaba guardada y las familias verán los cambios.'}
        </>}
        textoConfirmar="Sí, guardar" cargando={guardando} onConfirmar={guardar} onCancelar={() => setConfirmarGuardar(false)} />
      <Confirmar abierta={confirmarSalir} titulo="Salir sin guardar" tono="peligro" textoConfirmar="Salir sin guardar"
        texto="Tienes marcas que no se han guardado. Si sales se pierden."
        onConfirmar={() => { setConfirmarSalir(false); nav(`/e/sesion/${s.id}`); }} onCancelar={() => setConfirmarSalir(false)} />
    </Pantalla>
  );
}

function HojaObservacion({ nino, marca, onCerrar, onGuardar }: { nino: Nino | null; marca?: Marca; onCerrar: () => void; onGuardar: (m: Marca) => void }) {
  const [texto, setTexto] = useState('');
  const [min, setMin] = useState('');
  useEffect(() => { setTexto(marca?.observacion ?? ''); setMin(marca?.minutosRetardo ? String(marca.minutosRetardo) : ''); }, [nino, marca]);
  if (!nino) return null;
  return (
    <Hoja abierta={!!nino} onCerrar={onCerrar} titulo="Observación" sub={`${nombreNino(nino)} · la ven los acudientes`}>
      <AreaTexto value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej. cita médica, llegó con el papá…" aria-label="Observación" />
      {marca?.estado === 'retardo' && <Etiqueta texto="Minutos de retardo"><Campo inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} /></Etiqueta>}
      <Boton onClick={() => onGuardar({ estado: marca?.estado ?? 'asistio', observacion: texto, ...(min ? { minutosRetardo: Number(min) } : {}) })}>Listo</Boton>
    </Hoja>
  );
}
