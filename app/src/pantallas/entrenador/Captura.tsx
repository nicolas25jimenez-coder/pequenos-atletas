// Captura de resultados del día de control (RF-E24 a RF-E29), diseño "ENTRENADOR · CAPTURA".
import { ArrowCounterClockwise, ArrowRight, Camera, ChatCircleText, Play, Stop, Warning } from '@phosphor-icons/react';
import { doc, writeBatch } from 'firebase/firestore';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ahoraIso, comparar, edadAnios, formatoValor, hora12, valorFinal,
  type Asistencia, type Medio, type Nino, type Prueba, type ResultadoPrueba, type Sesion,
} from '@pa/shared';
import { useColeccion, useDocumento } from '../../lib/datos';
import { db } from '../../lib/firebase';
import { useSesion } from '../../lib/sesion';
import { subirArchivo } from '../../lib/archivos';
import { mensajeError } from '../../lib/errores';
import { AreaTexto, Aviso, Boton, Cargando, COLOR, Hoja, Segmentado, Volver, useToast, cx } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { alertaSalud, iniNino, nombreNino, useEntrenador } from './contexto';

interface Celda { intentos: number[]; noRealizada?: string; observacion?: string; medios: Medio[] }
type Datos = Record<string, Record<string, Celda>>; // pruebaId → ninoId → celda
type Modo = 'prueba' | 'nino';

const vacia = (): Celda => ({ intentos: [], medios: [] });

export function Captura() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { activos, pruebaPorId, catPorId } = useEntrenador();
  const { datos: s, cargando } = useDocumento<Sesion>(`sesiones/${id}`);
  const previos = useColeccion<ResultadoPrueba>('resultadosPruebas', [['sesionId', '==', id]]);
  const asis = useColeccion<Asistencia>('asistencias', [['sesionId', '==', id]]);
  const [datos, setDatos] = useState<Datos>({});
  const [listo, setListo] = useState(false);
  const [modo, setModo] = useState<Modo>('prueba');
  const [iP, setIP] = useState(0);
  const [iN, setIN] = useState(0);
  const [hoja, setHoja] = useState<'nr' | 'obs' | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (previos.cargando || listo) return;
    const d: Datos = {};
    for (const r of previos.datos) (d[r.pruebaId] ??= {})[r.ninoId] = { intentos: r.intentos, noRealizada: r.noRealizada?.motivo, observacion: r.observacion, medios: r.medios ?? [] };
    setDatos(d);
    setListo(true);
  }, [previos.cargando, previos.datos, listo]);

  const pruebas = useMemo(() => (s?.pruebasSeleccionadas ?? []).map((p) => pruebaPorId.get(p)).filter(Boolean) as Prueba[], [s, pruebaPorId]);
  const kids = useMemo(() => {
    if (!s) return [];
    const presentes = new Set(asis.datos.filter((a) => a.estado === 'asistio' || a.estado === 'retardo').map((a) => a.ninoId));
    const base = activos.filter((n) => n.categoriaId === s.categoriaId);
    return asis.datos.length ? base.filter((n) => presentes.has(n.id)) : base;
  }, [s, activos, asis.datos]);

  if (cargando || !listo) return <Cargando />;
  if (!s) return null;
  if (!pruebas.length) return <Pantalla><Volver a={`/e/sesion/${id}`}>Sesión</Volver><Aviso>Esta sesión no tiene pruebas seleccionadas. Edita la sesión para elegirlas.</Aviso></Pantalla>;
  if (!kids.length) return <Pantalla><Volver a={`/e/sesion/${id}`}>Sesión</Volver><Aviso>No hay niños presentes en esta sesión.</Aviso></Pantalla>;

  const p = pruebas[Math.min(iP, pruebas.length - 1)];
  const n = kids[Math.min(iN, kids.length - 1)];
  const celda = datos[p.id]?.[n.id] ?? vacia();
  const set = (c: Celda) => setDatos((d) => ({ ...d, [p.id]: { ...(d[p.id] ?? {}), [n.id]: c } }));
  const total = pruebas.length * kids.length;
  const hechos = pruebas.reduce((a, pr) => a + kids.filter((k) => { const c = datos[pr.id]?.[k.id]; return c && (c.intentos.length || c.noRealizada); }).length, 0);
  const lleno = celda.intentos.length >= p.intentos;
  const final = valorFinal(p, celda.intentos);

  function agregar(v: number) {
    if (lleno) { toast(`Ya tiene ${p.intentos} ${p.intentos === 1 ? 'intento' : 'intentos'}. Pasa al siguiente.`, 'error'); return; }
    set({ ...celda, intentos: [...celda.intentos, v], noRealizada: undefined });
  }
  function siguiente() {
    if (modo === 'prueba') {
      if (iN < kids.length - 1) setIN(iN + 1);
      else if (iP < pruebas.length - 1) { setIP(iP + 1); setIN(0); }
    } else {
      if (iP < pruebas.length - 1) setIP(iP + 1);
      else if (iN < kids.length - 1) { setIN(iN + 1); setIP(0); }
    }
  }
  const ultimo = modo === 'prueba' ? iN === kids.length - 1 && iP === pruebas.length - 1 : iP === pruebas.length - 1 && iN === kids.length - 1;
  const etiquetaSig = ultimo ? 'Último' : modo === 'prueba' ? (iN < kids.length - 1 ? `Siguiente: ${kids[iN + 1].nombres}` : `Siguiente prueba`) : (iP < pruebas.length - 1 ? 'Siguiente prueba' : `Siguiente: ${kids[iN + 1]?.nombres}`);

  async function guardar() {
    if (!usuario || !s) return;
    setGuardando(true);
    try {
      const b = writeBatch(db);
      const t = ahoraIso();
      let n2 = 0;
      for (const pr of pruebas) for (const k of kids) {
        const c = datos[pr.id]?.[k.id];
        if (!c || (!c.intentos.length && !c.noRealizada)) continue;
        const vf = c.noRealizada ? null : valorFinal(pr, c.intentos);
        const previo = previos.datos.find((r) => r.pruebaId === pr.id && r.ninoId === k.id);
        const r: Omit<ResultadoPrueba, 'id'> = {
          sesionId: s.id, ninoId: k.id, acudientesIds: k.acudientesIds, pruebaId: pr.id, fecha: s.fecha,
          intentos: c.noRealizada ? [] : c.intentos, valorFinal: vf,
          comparacionReferencia: vf === null ? null : comparar(pr, vf, edadAnios(k.fechaNacimiento, s.fecha), k.sexo),
          observacion: c.observacion?.trim() ?? '', medios: c.medios, noRealizada: c.noRealizada ? { motivo: c.noRealizada } : null,
          creadoEn: previo?.creadoEn ?? t, actualizadoEn: t, creadoPor: previo?.creadoPor ?? usuario.uid,
        };
        b.set(doc(db, 'resultadosPruebas', `${s.id}_${k.id}_${pr.id}`), r);
        n2++;
      }
      b.update(doc(db, 'sesiones', s.id), { resultadosGuardados: true, actualizadoEn: t });
      await b.commit();
      toast(`${n2} resultados guardados y publicados. Se avisó a los acudientes.`);
      nav(`/e/sesion/${s.id}`);
    } catch (e) { toast(mensajeError(e), 'error'); }
    setGuardando(false);
  }

  const alerta = alertaSalud(n);

  return (
    <Pantalla className="gap-3.5">
      <Volver a={`/e/sesion/${s.id}`}>Sesión</Volver>
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1"><span className="text-xs text-tenue">Día de control · {catPorId.get(s.categoriaId)?.nombre} · {hora12(s.horaInicio)}</span>
          <div className="titulo text-[28px]">{modo === 'prueba' ? 'Por prueba' : 'Por niño'}</div></div>
        <span className="text-xs text-tenue">{hechos}/{total} registrados</span>
      </div>
      <Segmentado<Modo> valor={modo} onCambio={setModo} alto={36} opciones={[{ id: 'prueba', etiqueta: 'Por prueba' }, { id: 'nino', etiqueta: 'Por niño' }]} />

      <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5">
        {pruebas.map((x, i) => {
          const on = i === iP;
          const completa = kids.every((k) => { const c = datos[x.id]?.[k.id]; return c && (c.intentos.length || c.noRealizada); });
          return <button key={x.id} onClick={() => setIP(i)} className="shrink-0 h-10 px-3.5 rounded-full text-[13px] font-bold cursor-pointer whitespace-nowrap"
            style={{ background: on ? COLOR.verde : '#141924', color: on ? COLOR.tinta : completa ? COLOR.verde : '#C9CFDB', border: `1px solid ${on ? COLOR.verde : completa ? 'rgba(61,220,106,0.4)' : 'rgba(255,255,255,0.1)'}` }}>{x.nombre.replace(/\(.*\)/, '').trim()}</button>;
        })}
      </div>
      <div className="flex gap-1.5 items-center flex-wrap">
        {kids.map((k, i) => {
          const on = i === iN;
          const c = datos[p.id]?.[k.id];
          const hecho = c && (c.intentos.length || c.noRealizada);
          return <button key={k.id} onClick={() => setIN(i)} title={nombreNino(k)} className="flex-1 min-w-[38px] h-[38px] rounded-xl text-[11px] font-extrabold cursor-pointer"
            style={{ background: on ? COLOR.marca : hecho ? 'rgba(61,220,106,0.12)' : '#141924', color: on ? COLOR.texto : hecho ? COLOR.verde : '#8C95A8', border: `1.5px solid ${on ? COLOR.azul : hecho ? 'rgba(61,220,106,0.4)' : 'rgba(255,255,255,0.08)'}` }}>{iniNino(k)}</button>;
        })}
      </div>

      <div className="rounded-[30px] p-[22px] border border-white/[0.08] flex flex-col gap-4" style={{ background: 'linear-gradient(160deg,#1A2236,#121722)' }}>
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-marca flex items-center justify-center font-extrabold text-sm">{iniNino(n)}</span>
          <div className="flex-1 flex flex-col gap-0.5 min-w-0"><span className="text-lg font-extrabold">{nombreNino(n)}</span><span className="text-xs text-tenue">{p.nombre} · {etiquetaUnidad(p)}</span></div>
          {alerta && <span title={alerta}><Warning weight="bold" size={20} className="text-ambar" /></span>}
        </div>
        {celda.noRealizada ? (
          <div className="text-center text-suave py-6">No realizó · {celda.noRealizada}</div>
        ) : p.tipoResultado === 'tiempo' ? <Cronometro key={`${p.id}-${n.id}`} onListo={agregar} deshabilitado={lleno} maximo={p.maximo} />
          : p.tipoResultado === 'aciertos' ? <Aciertos max={p.maximo ?? 5} onElegir={agregar} />
          : p.tipoResultado === 'cualitativa' ? <Escala p={p} valor={celda.intentos[0]} onElegir={(v) => set({ ...celda, intentos: [v], noRealizada: undefined })} />
          : <Teclado key={`${p.id}-${n.id}`} unidad={p.unidad} decimales={p.unidad === 'm'} onAgregar={agregar} />}

        <div className={cx('grid gap-2', p.intentos > 1 ? 'grid-cols-3' : 'grid-cols-2')}>
          {Array.from({ length: p.intentos }, (_, i) => (
            <div key={i} className="rounded-2xl px-3 py-2.5 bg-white/[0.04] flex flex-col gap-0.5"><span className="text-[11px] text-tenue">{p.intentos > 1 ? `Intento ${i + 1}` : 'Resultado'}</span>
              <span className="text-[17px] font-extrabold">{celda.intentos[i] !== undefined ? formatoValor(p, celda.intentos[i]) : '—'}</span></div>
          ))}
          {p.intentos > 1 && <div className="rounded-2xl px-3 py-2.5 bg-verde/[0.12] flex flex-col gap-0.5"><span className="text-[11px] text-verde">{p.agregacion === 'promedio' ? 'Promedio' : 'Mejor'}</span><span className="text-[17px] font-extrabold text-verde">{formatoValor(p, final)}</span></div>}
          {p.intentos === 1 && <button onClick={() => setHoja('obs')} className="rounded-2xl px-3 py-2.5 bg-white/[0.04] flex items-center gap-2 text-suave text-xs border-0 cursor-pointer text-left"><ChatCircleText weight="bold" size={18} />{celda.observacion ? 'Editar nota' : 'Agregar nota'}</button>}
        </div>
        {celda.observacion && <div className="text-[13px] text-suave">“{celda.observacion}”</div>}
        <div className="flex gap-2">
          <Boton variante="secundario" className="text-[13px] px-4 text-suave" onClick={() => (celda.noRealizada ? set({ ...celda, noRealizada: undefined }) : setHoja('nr'))}>{celda.noRealizada ? 'Sí realizó' : 'No realizó'}</Boton>
          <Boton variante="secundario" className="px-4" aria-label="Deshacer" onClick={() => set({ ...celda, intentos: celda.intentos.slice(0, -1) })}><ArrowCounterClockwise weight="bold" /></Boton>
          {p.intentos > 1 && <Boton variante="secundario" className="px-4" aria-label="Nota y fotos" onClick={() => setHoja('obs')}><ChatCircleText weight="bold" /></Boton>}
          <Boton variante="claro" className="flex-1 text-sm" onClick={siguiente} disabled={ultimo}>{etiquetaSig}<ArrowRight weight="bold" /></Boton>
        </div>
      </div>
      <Boton alto="lg" onClick={guardar} cargando={guardando} disabled={!hechos} className="tracking-[0.04em]">Guardar y publicar resultados</Boton>
      <div className="text-xs text-tenue text-center leading-normal">Al guardar se publica al instante y se avisa a los acudientes.</div>

      <Hoja abierta={hoja === 'nr'} onCerrar={() => setHoja(null)} titulo="No realizó" sub={`${nombreNino(n)} · ${p.nombre}`}>
        {['Ausente', 'Lesión o molestia', 'No quiso participar', 'Otro'].map((m) => <Boton key={m} variante="secundario" onClick={() => { set({ ...celda, intentos: [], noRealizada: m }); setHoja(null); }}>{m}</Boton>)}
      </Hoja>
      <HojaNota abierta={hoja === 'obs'} nino={n} prueba={p} sesionId={s.id} celda={celda} onCerrar={() => setHoja(null)} onCambio={set} />
    </Pantalla>
  );
}

function etiquetaUnidad(p: Prueba) {
  if (p.tipoResultado === 'cualitativa') return 'escala de observación';
  if (p.tipoResultado === 'aciertos') return `aciertos de ${p.maximo ?? 5}`;
  return `${p.unidad} · ${p.intentos} ${p.intentos === 1 ? 'intento' : 'intentos'} · ${p.mejorEs === 'menor' ? 'menos es mejor' : 'más es mejor'}`;
}

function Cronometro({ onListo, deshabilitado, maximo }: { onListo: (v: number) => void; deshabilitado: boolean; maximo?: number }) {
  const [corriendo, setCorriendo] = useState(false);
  const [ms, setMs] = useState(0);
  const t0 = useRef(0);
  const raf = useRef(0);
  const [manual, setManual] = useState(false);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    if (corriendo && maximo && ms >= maximo * 1000) detener();
  }, [ms]); // eslint-disable-line react-hooks/exhaustive-deps

  function iniciar() {
    if (deshabilitado) return;
    t0.current = performance.now();
    setCorriendo(true);
    const tick = () => { setMs(performance.now() - t0.current); raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
  }
  function detener() {
    cancelAnimationFrame(raf.current);
    setCorriendo(false);
    const v = Math.round((performance.now() - t0.current) / 10) / 100;
    const final = maximo ? Math.min(v, maximo) : v;
    setMs(final * 1000);
    onListo(final);
  }
  if (manual) return (<><Teclado unidad="s" decimales onAgregar={onListo} /><button onClick={() => setManual(false)} className="bg-transparent border-0 text-azul text-[13px] cursor-pointer">Usar cronómetro</button></>);
  return (<>
    <div className="text-center font-[850] text-[76px] leading-none tracking-tight tabular" style={{ fontStretch: '110%', color: corriendo ? COLOR.verde : COLOR.texto }}>
      {(ms / 1000).toFixed(2).replace('.', ',')}<span className="text-2xl text-tenue"> s</span>
    </div>
    <button onClick={corriendo ? detener : iniciar} disabled={deshabilitado && !corriendo}
      className="h-[72px] rounded-full border-0 text-lg font-[850] tracking-[0.08em] uppercase cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
      style={{ background: corriendo ? COLOR.rojo : COLOR.verde, color: corriendo ? '#fff' : COLOR.tinta }}>
      {corriendo ? <Stop weight="fill" size={22} /> : <Play weight="fill" size={22} />}{corriendo ? 'Detener' : 'Iniciar'}
    </button>
    <button onClick={() => setManual(true)} className="bg-transparent border-0 text-azul text-[13px] cursor-pointer">Escribir el tiempo a mano</button>
  </>);
}

function Teclado({ unidad, decimales, onAgregar }: { unidad: string; decimales?: boolean; onAgregar: (v: number) => void }) {
  const [v, setV] = useState('');
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimales ? ',' : '', '0', '⌫'];
  const pulsar = (k: string) => {
    if (k === '⌫') setV(v.slice(0, -1));
    else if (k === ',') { if (!v.includes(',')) setV((v || '0') + ','); }
    else if (k && v.replace(',', '').length < 5) setV(v + k);
  };
  return (<>
    <div className="text-center font-[850] text-[64px] leading-none tabular">{v || '0'}<span className="text-[22px] text-tenue"> {unidad}</span></div>
    <div className="grid grid-cols-3 gap-2">
      {teclas.map((k, i) => k ? <button key={i} onClick={() => pulsar(k)} className="h-[52px] rounded-2xl border-0 text-xl font-bold cursor-pointer bg-sup2 text-texto active:scale-95">{k}</button> : <span key={i} />)}
    </div>
    <Boton onClick={() => { const n = Number(v.replace(',', '.')); if (v && !isNaN(n)) { onAgregar(n); setV(''); } }} disabled={!v}>Agregar intento</Boton>
  </>);
}

function Aciertos({ max, onElegir }: { max: number; onElegir: (v: number) => void }) {
  return (<>
    <div className="text-[13px] text-suave text-center">Aciertos de {max} intentos</div>
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${max + 1}, 1fr)` }}>
      {Array.from({ length: max + 1 }, (_, i) => <button key={i} onClick={() => onElegir(i)} className="aspect-square rounded-2xl border border-white/10 bg-sup2 text-texto text-[22px] font-[850] cursor-pointer hover:bg-verde hover:text-tinta">{i}</button>)}
    </div>
  </>);
}

function Escala({ p, valor, onElegir }: { p: Prueba; valor?: number; onElegir: (v: number) => void }) {
  const escala = p.escalaCualitativa ?? ['Por mejorar', 'En proceso', 'Logrado'];
  const colores = [COLOR.ambar, COLOR.azul, COLOR.verde];
  return (
    <div className="flex flex-col gap-2">
      {escala.map((e, i) => {
        const c = colores[Math.round((i / Math.max(1, escala.length - 1)) * 2)];
        const on = valor === i;
        return <button key={e} onClick={() => onElegir(i)} className="h-14 rounded-2xl text-base font-extrabold cursor-pointer"
          style={{ background: on ? c : 'transparent', color: on ? COLOR.tinta : c, border: `1.5px solid ${c}` }}>{e}</button>;
      })}
    </div>
  );
}

function HojaNota({ abierta, nino, prueba, sesionId, celda, onCerrar, onCambio }: { abierta: boolean; nino: Nino; prueba: Prueba; sesionId: string; celda: Celda; onCerrar: () => void; onCambio: (c: Celda) => void }) {
  const toast = useToast();
  const [texto, setTexto] = useState(celda.observacion ?? '');
  const [subiendo, setSubiendo] = useState(false);
  useEffect(() => { if (abierta) setTexto(celda.observacion ?? ''); }, [abierta]); // eslint-disable-line react-hooks/exhaustive-deps
  const permitido = nino.consentimientos.usoImagen.autorizado;

  async function subir(f?: File) {
    if (!f) return;
    setSubiendo(true);
    try {
      const video = f.type.startsWith('video/');
      const ruta = await subirArchivo(`resultados/${nino.id}/${sesionId}-${prueba.id}-${Date.now()}.${video ? f.name.split('.').pop() : 'jpg'}`, f, video ? 20 : 5);
      onCambio({ ...celda, observacion: texto, medios: [...celda.medios, { tipo: video ? 'video' : 'foto', ruta }] });
      toast(video ? 'Video agregado' : 'Foto agregada');
    } catch (e) { toast(mensajeError(e), 'error'); }
    setSubiendo(false);
  }

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Nota del entrenador" sub={`${nombreNino(nino)} · ${prueba.nombre} · la ven los acudientes`}>
      <AreaTexto value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej. ¡Excelente aterrizaje con ambos pies!" />
      {permitido ? (
        <label className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-white/15 cursor-pointer text-sm">
          <Camera weight="bold" size={20} className="text-azul" />{subiendo ? 'Subiendo…' : `Agregar foto o video (${celda.medios.length})`}
          <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => subir(e.target.files?.[0])} />
        </label>
      ) : <Aviso tono="alerta">La familia no autorizó el uso de imagen: no se pueden adjuntar fotos ni videos.</Aviso>}
      <Boton onClick={() => { onCambio({ ...celda, observacion: texto }); onCerrar(); }}>Guardar nota</Boton>
    </Hoja>
  );
}
