import {
  CaretRight, FirstAidKit, FlagPennant, Heartbeat, IdentificationCard, LockSimple, Phone, SealCheck, FileText,
} from '@phosphor-icons/react';
import { addDoc, collection } from 'firebase/firestore';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ahoraIso, curvasPercentiles, DIAS, edadAnios, edadMesesExacta, edadTexto, ETIQUETA_COMPARACION, FAMILIAS, fechaCorta,
  formatoValor, hora12, iniciales, notaPerfil, perfilMultidisciplinar, referenciaTabla, tendencia, clasificarImc,
  type Categoria, type Nino, type Prueba, type ResultadoPrueba,
} from '@pa/shared';
import { db } from '../../lib/firebase';
import { useSesion } from '../../lib/sesion';
import { urlArchivo } from '../../lib/archivos';
import { COLOR_COMPARACION, COLOR_CUALITATIVA, COLOR_IMC, COLOR_TENDENCIA } from '../../lib/estilos';
import { mensajeError } from '../../lib/errores';
import { Aviso, Avatar, Boton, Campo, Fila, Hoja, Kicker, Punto, Segmentado, Tarjeta, Vacio, useToast } from '../../ui/base';
import { GraficaImc, Radar } from '../../ui/graficas';
import { Pantalla } from '../../ui/marco';
import { SelectorMini, useFamilia } from './familia';
import { Historial } from './Historial';
import { useFoto } from '../comun/useFoto';

type Tab = 'datos' | 'fisico' | 'pruebas' | 'historial';

export function MiHijo() {
  const { tab = 'datos' } = useParams();
  const nav = useNavigate();
  const { nino, categorias } = useFamilia();
  const foto = useFoto(nino?.fotoRuta);
  if (!nino) return null;
  const cat = nino.categoriaId ? categorias.get(nino.categoriaId) : undefined;

  return (
    <Pantalla className="gap-[18px]">
      <div className="flex items-center gap-4">
        <div className="w-[76px] h-[76px] rounded-3xl shrink-0 border-2 border-verde overflow-hidden flex items-center justify-center rayado font-mono text-[10px] text-apagado">
          {foto ? <img src={foto} alt="" className="w-full h-full object-cover" /> : 'foto'}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="titulo text-[26px]">{nino.nombres}</div>
          <div className="text-[13px] text-suave">{edadTexto(nino.fechaNacimiento)}</div>
          {cat && <span className="self-start px-2.5 py-1 rounded-full bg-azul/[0.16] text-azul-claro text-xs font-bold">Categoría {cat.nombre}</span>}
          {nino.estado === 'inactivo' && <span className="self-start px-2.5 py-1 rounded-full bg-white/10 text-gris text-xs font-bold">Inactivo · solo lectura</span>}
        </div>
        <div className="ml-auto"><SelectorMini /></div>
      </div>
      <Segmentado<Tab> valor={tab as Tab} onCambio={(t) => nav(t === 'datos' ? '/p/hijo' : `/p/hijo/${t}`, { replace: true })}
        opciones={[{ id: 'datos', etiqueta: 'Datos' }, { id: 'fisico', etiqueta: 'Físico' }, { id: 'pruebas', etiqueta: 'Pruebas' }, { id: 'historial', etiqueta: 'Historial' }]} />
      {tab === 'datos' && <Datos nino={nino} cat={cat} />}
      {tab === 'fisico' && <Fisico nino={nino} />}
      {tab === 'pruebas' && <Pruebas nino={nino} />}
      {tab === 'historial' && <Historial />}
    </Pantalla>
  );
}

/* ───────── Datos ───────── */

interface CampoEditable { campo: string; etiqueta: string; valor: string }
interface Seccion { id: string; titulo: string; icono: ReactNode; filas: { k: string; v: ReactNode }[]; bloqueada?: boolean; editables?: CampoEditable[] }

function Datos({ nino, cat }: { nino: Nino; cat?: Categoria }) {
  const { solicitudesCambio } = useFamilia();
  const [hoja, setHoja] = useState<Seccion | null>(null);
  const pendientes = new Set(solicitudesCambio.filter((s) => s.estado === 'pendiente').map((s) => s.seccion));
  const ic = (I: typeof Phone) => <I weight="bold" size={15} className="text-azul" />;
  const horario = cat?.horarios.map((h) => `${DIAS[h.diaSemana - 1].slice(0, 3)} ${hora12(h.horaInicio)} – ${hora12(h.horaFin)}`).join(' · ');
  const s = nino.salud, seg = nino.seguroMedico;
  const cons = nino.consentimientos;
  const txtCons = (c: { autorizado: boolean; fecha: string }) => (c.autorizado ? `Autorizado · ${fechaCorta(c.fecha)}` : 'No autorizado');
  const emergencia = nino.contactos.find((c) => c.esEmergencia);
  const recogen = nino.contactos.filter((c) => c.puedeRecoger).map((c) => `${c.nombre} (${c.parentesco})`).join(', ');
  const editable = nino.estado === 'activo';

  const secciones: Seccion[] = [
    { id: 'Categoría', titulo: 'Categoría', icono: ic(FlagPennant), bloqueada: true, filas: [
      { k: 'Categoría', v: cat?.nombre ?? '—' }, { k: 'Horario', v: horario ?? '—' }, { k: 'Lugar', v: cat?.horarios[0]?.lugar ?? '—' }, { k: 'Inscrito desde', v: fechaCorta(nino.fechaInscripcion) },
    ] },
    { id: 'Datos personales', titulo: 'Datos personales', icono: ic(IdentificationCard), filas: [
      { k: 'Nombre', v: `${nino.nombres} ${nino.apellidos}` }, { k: 'Nacimiento', v: fechaCorta(nino.fechaNacimiento) },
      { k: 'Documento', v: `${nino.tipoDocumento} ${nino.numeroDocumento}` }, { k: 'Talla uniforme', v: nino.tallaUniforme },
    ], editables: [
      { campo: 'nombres', etiqueta: 'Nombres', valor: nino.nombres }, { campo: 'apellidos', etiqueta: 'Apellidos', valor: nino.apellidos },
      { campo: 'numeroDocumento', etiqueta: 'Número de documento', valor: nino.numeroDocumento }, { campo: 'tallaUniforme', etiqueta: 'Talla de uniforme', valor: nino.tallaUniforme },
    ] },
    { id: 'Acudientes y contactos', titulo: 'Acudientes y contactos', icono: ic(Phone), filas: [
      ...nino.acudientes.map((a) => ({ k: 'Acudiente', v: `${a.nombre} (${a.parentesco})` })),
      ...nino.contactos.map((c) => ({ k: c.nombre.split(' ')[0], v: c.telefono })),
      { k: 'Emergencia', v: emergencia ? `${emergencia.nombre} · ${emergencia.telefono}` : '—' },
      { k: 'Pueden recogerlo', v: recogen || '—' },
    ], editables: nino.contactos.map((c, i) => ({ campo: `contactos.${i}.telefono`, etiqueta: `Teléfono de ${c.nombre}`, valor: c.telefono })) },
    { id: 'Salud', titulo: 'Salud', icono: ic(Heartbeat), filas: [
      { k: 'Tipo de sangre', v: s.tipoSangre }, { k: 'Alergias', v: s.alergias }, { k: 'Condiciones', v: s.condicionesMedicas },
      { k: 'Medicamentos', v: s.medicamentos }, { k: 'Restricciones', v: s.restriccionesActividad },
    ], editables: [
      { campo: 'salud.tipoSangre', etiqueta: 'Tipo de sangre', valor: s.tipoSangre }, { campo: 'salud.alergias', etiqueta: 'Alergias', valor: s.alergias },
      { campo: 'salud.condicionesMedicas', etiqueta: 'Condiciones médicas', valor: s.condicionesMedicas }, { campo: 'salud.medicamentos', etiqueta: 'Medicamentos', valor: s.medicamentos },
      { campo: 'salud.restriccionesActividad', etiqueta: 'Restricciones de actividad', valor: s.restriccionesActividad },
    ] },
    { id: 'Seguro médico', titulo: 'Seguro médico', icono: ic(FirstAidKit), filas: [
      { k: 'Tipo', v: seg.tipo }, { k: 'Entidad', v: seg.entidad }, { k: 'Afiliación', v: seg.numeroAfiliacion }, ...(seg.telefonoEntidad ? [{ k: 'Teléfono', v: seg.telefonoEntidad }] : []),
    ], editables: [
      { campo: 'seguroMedico.entidad', etiqueta: 'Entidad', valor: seg.entidad }, { campo: 'seguroMedico.numeroAfiliacion', etiqueta: 'Número de afiliación', valor: seg.numeroAfiliacion },
    ] },
    { id: 'Consentimientos', titulo: 'Consentimientos', icono: ic(SealCheck), bloqueada: false, filas: [
      { k: 'Tratamiento de datos', v: txtCons(cons.tratamientoDatos) }, { k: 'Uso de imagen', v: txtCons(cons.usoImagen) }, { k: 'Actividad física', v: txtCons(cons.actividadFisica) },
    ], editables: [{ campo: 'consentimientos.usoImagen.autorizado', etiqueta: 'Autorización de uso de imagen (Sí / No)', valor: cons.usoImagen.autorizado ? 'Sí' : 'No' }] },
  ];

  return (<>
    {secciones.map((sec) => (
      <Tarjeta key={sec.id}>
        <div className="flex justify-between items-center gap-2">
          <Kicker icono={sec.icono}>{sec.titulo}</Kicker>
          {sec.bloqueada && <span className="flex items-center gap-1 text-xs text-tenue"><LockSimple weight="bold" />Lo asigna el entrenador</span>}
          {!sec.bloqueada && sec.editables && editable && (pendientes.has(sec.id)
            ? <span className="px-2.5 py-1 rounded-full bg-ambar/15 text-ambar text-xs font-bold">Cambio pendiente</span>
            : <button onClick={() => setHoja(sec)} className="bg-transparent border-0 text-verde font-bold text-[13px] cursor-pointer p-0">Solicitar cambio</button>)}
        </div>
        {sec.filas.map((f, i) => <Fila key={i} k={f.k} v={f.v} />)}
      </Tarjeta>
    ))}
    <Documentos nino={nino} />
    <SolicitarCambio seccion={hoja} nino={nino} onCerrar={() => setHoja(null)} />
  </>);
}

function Documentos({ nino }: { nino: Nino }) {
  const toast = useToast();
  if (!nino.documentos.length) return null;
  async function abrir(ruta: string) {
    try { window.open(await urlArchivo(ruta), '_blank'); } catch (e) { toast(mensajeError(e), 'error'); }
  }
  return (
    <Tarjeta>
      <Kicker icono={<FileText weight="bold" size={15} className="text-azul" />}>Documentos</Kicker>
      {nino.documentos.map((d) => (
        <button key={d.ruta} onClick={() => abrir(d.ruta)} className="flex justify-between items-center bg-transparent border-0 text-texto text-sm cursor-pointer p-0 text-left">
          <span><span className="font-semibold">{d.tipo}</span><br /><span className="text-xs text-tenue">{d.nombre} · {fechaCorta(d.fecha)}</span></span>
          <CaretRight weight="bold" className="text-apagado" />
        </button>
      ))}
    </Tarjeta>
  );
}

function SolicitarCambio({ seccion, nino, onCerrar }: { seccion: Seccion | null; nino: Nino; onCerrar: () => void }) {
  const { perfil, usuario } = useSesion();
  const toast = useToast();
  const [i, setI] = useState(0);
  const [valor, setValor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const campo = seccion?.editables?.[i];

  async function enviar() {
    if (!seccion || !campo || !valor.trim() || !usuario) return;
    setEnviando(true);
    try {
      await addDoc(collection(db, 'solicitudesCambio'), {
        ninoId: nino.id, acudientesIds: nino.acudientesIds, solicitadoPor: usuario.uid,
        solicitadoPorNombre: `${perfil?.nombres} ${perfil?.apellidos}`, seccion: seccion.id, campo: campo.campo, etiqueta: campo.etiqueta,
        valorActual: campo.valor, valorPropuesto: valor.trim(), estado: 'pendiente',
        creadoEn: ahoraIso(), actualizadoEn: ahoraIso(), creadoPor: usuario.uid,
      });
      toast('Solicitud enviada. Te avisaremos cuando el entrenador la revise.');
      setValor(''); setI(0); onCerrar();
    } catch (e) { toast(mensajeError(e), 'error'); }
    setEnviando(false);
  }

  return (
    <Hoja abierta={!!seccion} onCerrar={() => { setValor(''); setI(0); onCerrar(); }} titulo="Solicitar cambio" sub={`${seccion?.titulo} · ${nino.nombres}`}>
      {seccion?.editables && seccion.editables.length > 1 && (
        <select className="campo" value={i} onChange={(e) => { setI(Number(e.target.value)); setValor(''); }}>
          {seccion.editables.map((c, j) => <option key={c.campo} value={j}>{c.etiqueta}</option>)}
        </select>
      )}
      <div className="flex flex-col gap-1 px-3.5 py-3 rounded-2xl bg-sup2">
        <span className="text-[11px] text-tenue tracking-[0.1em] uppercase font-bold">Valor actual</span>
        <span className="text-sm">{campo?.valor || '—'}</span>
      </div>
      <Campo value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Escribe el valor propuesto" className="!bg-campo !border-azul" autoFocus />
      <div className="text-xs text-tenue leading-snug">El dato no cambia hasta que el entrenador lo apruebe. Te avisaremos con una notificación.</div>
      <div className="flex gap-2">
        <Boton variante="secundario" className="flex-1" onClick={onCerrar}>Cancelar</Boton>
        <Boton className="flex-[1.4]" onClick={enviar} cargando={enviando} disabled={!valor.trim()}>Enviar solicitud</Boton>
      </div>
    </Hoja>
  );
}

/* ───────── Físico ───────── */

function Fisico({ nino }: { nino: Nino }) {
  const { mediciones } = useFamilia();
  if (!mediciones.length) return <Vacio titulo="Sin mediciones todavía" texto="El entrenador registra talla y peso en los días de control." />;
  const ultima = mediciones[mediciones.length - 1];
  const edad = edadMesesExacta(nino.fechaNacimiento, ultima.fecha);
  const clasif = ultima.zScoreImc !== null ? clasificarImc(ultima.zScoreImc, edad) : null;
  const curvas = curvasPercentiles(nino.sexo, edad);
  const color = clasif ? COLOR_IMC[clasif.nivel] : '#8C95A8';
  const mes = (f: string) => ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][Number(f.slice(5, 7)) - 1];
  const nf = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 });

  return (<>
    <Tarjeta className="rounded-4xl p-5 gap-4">
      <div className="flex justify-between items-center"><span className="kicker">Última medición</span><span className="text-xs text-tenue">{fechaCorta(ultima.fecha)}</span></div>
      <div className="grid grid-cols-3 gap-2.5">
        <div className="flex flex-col gap-0.5"><span className="text-[28px] font-extrabold">{nf(ultima.tallaCm)}</span><span className="text-xs text-tenue">Talla · cm</span></div>
        <div className="flex flex-col gap-0.5"><span className="text-[28px] font-extrabold">{nf(ultima.pesoKg)}</span><span className="text-xs text-tenue">Peso · kg</span></div>
        <div className="flex flex-col gap-0.5"><span className="text-[28px] font-extrabold" style={{ color }}>{nf(ultima.imc)}</span><span className="text-xs text-tenue">IMC</span></div>
      </div>
      {clasif && ultima.percentilImc !== null && (
        <div className="flex items-center gap-3 p-3.5 rounded-[18px]" style={{ background: `${color}1A` }}>
          <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-extrabold text-[13px]" style={{ border: `3px solid ${color}`, color }}>P{Math.round(ultima.percentilImc)}</div>
          <div className="text-sm leading-snug font-semibold">{clasif.amable}<br /><span className="text-xs font-normal text-tenue">Percentil {referenciaTabla(edad, nino.sexo)}</span></div>
        </div>
      )}
    </Tarjeta>
    <Tarjeta className="rounded-4xl p-5">
      <span className="kicker">Evolución del IMC</span>
      <GraficaImc puntos={mediciones.map((m) => ({ x: mes(m.fecha), v: m.imc }))} curvas={curvas} />
    </Tarjeta>
    <Tarjeta className="gap-1">
      <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] kicker pb-2" style={{ letterSpacing: '0.1em' }}><span>Fecha</span><span>Talla</span><span>Peso</span><span>IMC</span></div>
      {[...mediciones].reverse().map((m) => (
        <div key={m.id} className="grid grid-cols-[1.3fr_1fr_1fr_1fr] text-sm py-2 border-t border-white/[0.06]">
          <span className="text-suave">{fechaCorta(m.fecha)}</span><span>{nf(m.tallaCm)}</span><span>{nf(m.pesoKg)}</span><span className="font-bold">{nf(m.imc)}</span>
        </div>
      ))}
    </Tarjeta>
    <div className="text-xs text-tenue leading-normal pretty px-1">Esta información es orientativa y no reemplaza la valoración del pediatra.</div>
  </>);
}

/* ───────── Pruebas ───────── */

export interface ResumenPrueba { p: Prueba; ultimo: ResultadoPrueba; anterior?: ResultadoPrueba; historial: ResultadoPrueba[] }

export function usarResumenPruebas(resultados: ResultadoPrueba[], pruebas: Map<string, Prueba>): ResumenPrueba[] {
  return useMemo(() => {
    const por = new Map<string, ResultadoPrueba[]>();
    for (const r of resultados) if (!r.noRealizada && r.valorFinal !== null) (por.get(r.pruebaId) ?? por.set(r.pruebaId, []).get(r.pruebaId)!).push(r);
    const out: ResumenPrueba[] = [];
    for (const [id, hist] of por) {
      const p = pruebas.get(id);
      if (!p) continue;
      out.push({ p, ultimo: hist[hist.length - 1], anterior: hist[hist.length - 2], historial: hist });
    }
    return out;
  }, [resultados, pruebas]);
}

export function comparacionDe(r: ResultadoPrueba, p: Prueba): { texto: string; color: string } {
  if (p.tipoResultado === 'cualitativa') {
    const i = r.valorFinal ?? 0;
    return { texto: p.escalaCualitativa?.[i] ?? '—', color: COLOR_CUALITATIVA[Math.min(2, Math.round((i / Math.max(1, (p.escalaCualitativa?.length ?? 3) - 1)) * 2))] };
  }
  if (!r.comparacionReferencia) return { texto: 'Sin referencia', color: '#8C95A8' };
  return { texto: ETIQUETA_COMPARACION[r.comparacionReferencia], color: COLOR_COMPARACION[r.comparacionReferencia] };
}

export function tendenciaDe(p: Prueba, ant: ResultadoPrueba | undefined, ult: ResultadoPrueba) {
  if (!ant || ant.valorFinal === null || ult.valorFinal === null) return null;
  const t = tendencia(p, ant.valorFinal, ult.valorFinal);
  const s = t.direccion === 'igual' ? '=' : `${t.direccion === 'mejor' ? '↑' : '↓'}${p.tipoResultado === 'cualitativa' ? '' : ' ' + t.diferencia.toLocaleString('es-CO')}`;
  return { ...t, simbolo: s, color: COLOR_TENDENCIA[t.direccion] };
}

function Pruebas({ nino }: { nino: Nino }) {
  const nav = useNavigate();
  const { resultados, pruebas } = useFamilia();
  const resumen = usarResumenPruebas(resultados, pruebas);
  const ultimaFecha = resultados.length ? resultados[resultados.length - 1].fecha : null;
  const perfil = perfilMultidisciplinar(resultados, pruebas, edadAnios(nino.fechaNacimiento, ultimaFecha ?? undefined), nino.sexo);
  if (!resumen.length) return <Vacio titulo="Aún no hay pruebas" texto="Los resultados aparecen aquí después de cada día de control." />;

  return (<>
    <Tarjeta className="rounded-4xl p-5 gap-1.5">
      <span className="kicker">Perfil multidisciplinar</span>
      <Radar perfil={perfil} />
      <div className="text-[13px] text-suave leading-snug pretty">{notaPerfil(perfil)}</div>
    </Tarjeta>
    {FAMILIAS.map((f) => {
      const tests = resumen.filter((r) => r.p.familia === f.id);
      if (!tests.length) return null;
      return (
        <div key={f.id} className="flex flex-col gap-2">
          <div className="flex justify-between items-baseline px-1 pt-1">
            <span className="titulo text-base" style={{ fontWeight: 800 }}>{f.nombre}</span>
            <span className="text-xs text-tenue">{tests.length} {tests.length === 1 ? 'prueba' : 'pruebas'}</span>
          </div>
          {tests.map(({ p, ultimo, anterior }) => {
            const c = comparacionDe(ultimo, p);
            const t = tendenciaDe(p, anterior, ultimo);
            return (
              <button key={p.id} onClick={() => nav(`/p/prueba/${p.id}`)} className="flex items-center gap-3 text-left cursor-pointer rounded-[20px] px-4 py-3.5 bg-sup border border-white/[0.07] text-texto hover:bg-suph">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-sm font-semibold leading-tight">{p.nombre}</span>
                  <Punto color={c.color}>{c.texto}</Punto>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-lg font-extrabold">{formatoValor(p, ultimo.valorFinal)} <span className="text-xs font-medium text-tenue">{p.tipoResultado === 'cualitativa' ? '' : p.unidad}</span></span>
                  {t && <span className="text-xs font-bold" style={{ color: t.color }}>{t.simbolo}</span>}
                </div>
                <CaretRight weight="bold" className="text-apagado" />
              </button>
            );
          })}
        </div>
      );
    })}
    <Aviso>Las referencias por edad son orientativas. Cada niño tiene su propio ritmo de desarrollo.</Aviso>
  </>);
}

export function AvatarNino({ nino, tam = 40 }: { nino: Nino; tam?: number }) {
  return <Avatar ini={iniciales(nino.nombres, nino.apellidos)} tam={tam} />;
}
