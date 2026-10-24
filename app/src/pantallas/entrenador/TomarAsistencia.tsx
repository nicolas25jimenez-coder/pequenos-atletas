// Toma de asistencia (RF-E19 a RF-E23), diseño del prototipo "ENTRENADOR · ASISTENCIA".
import { ChatCircleText, Checks, Warning } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ahoraIso, ESTADOS_ASISTENCIA, ETIQUETA_ASISTENCIA, fechaChip, hora12, hoy,
  type Asistencia, type EstadoAsistencia, type Nino, type Sesion,
} from '@pa/shared';
import { lote, useColeccion, useDocumento } from '../../lib/datos';
import { useSesion } from '../../lib/sesion';
import { COLOR_ASISTENCIA } from '../../lib/estilos';
import { mensajeError } from '../../lib/errores';
import { alfa, AreaTexto, Boton, Campo, Cargando, COLOR, Etiqueta, Hoja, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { alertaSalud, iniNino, nombreNino, useEntrenador } from './contexto';

interface Marca { estado: EstadoAsistencia; observacion: string; minutosRetardo?: number }

export function TomarAsistencia() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { activos, porId, catPorId } = useEntrenador();
  const { datos: s, cargando } = useDocumento<Sesion>(`sesiones/${id}`);
  const previas = useColeccion<Asistencia>('asistencias', [['sesionId', '==', id]]);
  const [marcas, setMarcas] = useState<Record<string, Marca>>({});
  const [cargadas, setCargadas] = useState(false);
  const [obs, setObs] = useState<Nino | null>(null);
  const [guardando, setGuardando] = useState(false);

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

  if (cargando || !cargadas) return <Cargando />;
  if (!s) return null;
  const cat = catPorId.get(s.categoriaId);
  const marcados = kids.filter((n) => marcas[n.id]).length;
  const completo = marcados === kids.length && kids.length > 0;
  const conteo = ESTADOS_ASISTENCIA.map((e) => ({ e, n: kids.filter((k) => marcas[k.id]?.estado === e).length }));

  const marcar = (nid: string, estado: EstadoAsistencia) => setMarcas((m) => ({ ...m, [nid]: { ...(m[nid] ?? { observacion: '' }), estado } }));
  const todos = () => setMarcas((m) => Object.fromEntries(kids.map((k) => [k.id, m[k.id] ?? { estado: 'asistio' as const, observacion: '' }])));

  async function guardar() {
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
      const faltas = kids.filter((k) => marcas[k.id].estado === 'falto').length;
      toast(cambios ? `Asistencia guardada y publicada${faltas ? `. Se avisó a ${faltas} ${faltas === 1 ? 'familia' : 'familias'} por inasistencia` : ''}.` : 'No había cambios.');
      nav(`/e/sesion/${s.id}`);
    } catch (e) { toast(mensajeError(e), 'error'); }
    setGuardando(false);
  }

  return (
    <Pantalla className="gap-3.5 pb-[220px]">
      <Volver a={`/e/sesion/${s.id}`}>{cat?.nombre}</Volver>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-tenue">{fechaChip(s.fecha)} · {hora12(s.horaInicio)} · {s.tipo === 'control' ? 'Día de control' : 'Entrenamiento'}</span>
        <div className="titulo text-[30px]">Asistencia</div>
      </div>
      <Boton variante="punteado" className="h-12 text-sm" icono={<Checks weight="bold" />} onClick={todos}>Marcar todos como Asistió</Boton>
      {kids.map((n) => {
        const m = marcas[n.id];
        const alerta = alertaSalud(n);
        return (
          <div key={n.id} className="rounded-[22px] p-3 bg-sup flex flex-col gap-2.5" style={{ border: `1px solid ${m ? alfa(COLOR_ASISTENCIA[m.estado], 0.45) : 'rgba(255,255,255,0.07)'}` }}>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-[14px] shrink-0 bg-[#1F2638] flex items-center justify-center text-xs font-extrabold">{iniNino(n)}</span>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] font-bold">{nombreNino(n)}</span>
                {alerta && <span className="flex items-center gap-1 text-xs text-ambar"><Warning weight="bold" className="shrink-0" /><span className="truncate">{alerta}</span></span>}
                {m?.observacion && <span className="text-xs text-tenue truncate">“{m.observacion}”</span>}
              </div>
              <button onClick={() => setObs(n)} className="w-9 h-9 rounded-full bg-transparent border border-white/10 text-tenue cursor-pointer flex items-center justify-center" aria-label="Observación"><ChatCircleText weight="bold" /></button>
              <span className="text-xs font-bold w-14 text-right" style={{ color: m ? COLOR_ASISTENCIA[m.estado] : COLOR.tenue }}>{m ? ETIQUETA_ASISTENCIA[m.estado] : 'Sin marcar'}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {ESTADOS_ASISTENCIA.map((e) => {
                const on = m?.estado === e;
                const c = COLOR_ASISTENCIA[e];
                return (
                  <button key={e} onClick={() => marcar(n.id, e)} className="h-[46px] rounded-[14px] text-xs font-extrabold cursor-pointer"
                    style={{ background: on ? c : 'transparent', color: on ? (e === 'falto' ? '#fff' : COLOR.tinta) : '#C9CFDB', border: `1px solid ${on ? c : 'rgba(255,255,255,0.1)'}` }}>
                    {ETIQUETA_ASISTENCIA[e]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="fixed left-0 right-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-20 flex justify-center px-3 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[456px] rounded-3xl py-3 pr-3 pl-[18px] bg-[rgba(20,25,36,0.96)] border border-white/10 flex items-center gap-3 backdrop-blur-md">
          <div className="flex-1 flex gap-2.5 text-[13px] font-bold flex-wrap">
            {conteo.map(({ e, n }) => <span key={e} style={{ color: COLOR_ASISTENCIA[e] }}>{n} {ETIQUETA_ASISTENCIA[e]}</span>)}
          </div>
          <Boton onClick={guardar} cargando={guardando} disabled={!completo} className="text-[13px] px-5">{completo ? 'Guardar' : `${marcados}/${kids.length}`}</Boton>
        </div>
      </div>

      <HojaObservacion nino={obs} marca={obs ? marcas[obs.id] : undefined} onCerrar={() => setObs(null)}
        onGuardar={(m) => { if (obs) setMarcas((x) => ({ ...x, [obs.id]: m })); setObs(null); }} />
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
      <AreaTexto value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej. cita médica, llegó con el papá…" />
      {marca?.estado === 'retardo' && <Etiqueta texto="Minutos de retardo"><Campo inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} /></Etiqueta>}
      <Boton onClick={() => onGuardar({ estado: marca?.estado ?? 'asistio', observacion: texto, ...(min ? { minutosRetardo: Number(min) } : {}) })}>Listo</Boton>
    </Hoja>
  );
}
