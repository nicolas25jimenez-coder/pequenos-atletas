// Registro de talla y peso, individual o en lote por categoría (RF-E09, RF-E26).
import { doc, writeBatch } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ahoraIso, edadMesesExacta, evaluarImc, hoy, num, type MedicionFisica, type Sesion } from '@pa/shared';
import { useColeccion, useDocumento } from '../../lib/datos';
import { db } from '../../lib/firebase';
import { useSesion } from '../../lib/sesion';
import { COLOR_IMC } from '../../lib/estilos';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, Etiqueta, Selector, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { iniNino, nombreNino, useEntrenador } from './contexto';

export function Mediciones() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const { usuario } = useSesion();
  const { activos, categorias, porId } = useEntrenador();
  const sesion = useDocumento<Sesion>(id ? `sesiones/${id}` : null);
  const soloNino = params.get('nino');
  const [cat, setCat] = useState(params.get('categoria') ?? categorias[0]?.id ?? '');
  const [fecha, setFecha] = useState(hoy());
  const [valores, setValores] = useState<Record<string, { t: string; p: string }>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (sesion.datos) { setCat(sesion.datos.categoriaId); setFecha(sesion.datos.fecha); } }, [sesion.datos]);
  const kids = useMemo(() => (soloNino ? [porId.get(soloNino)!].filter(Boolean) : activos.filter((n) => n.categoriaId === cat)), [soloNino, porId, activos, cat]);
  const previas = useColeccion<MedicionFisica>('medicionesFisicas', [['fecha', '==', fecha]]);
  useEffect(() => {
    const v: Record<string, { t: string; p: string }> = {};
    for (const m of previas.datos) v[m.ninoId] = { t: String(m.tallaCm).replace('.', ','), p: String(m.pesoKg).replace('.', ',') };
    setValores((x) => ({ ...v, ...x }));
  }, [previas.datos]);

  const n = (s?: string) => Number((s ?? '').replace(',', '.'));
  const filas = kids.map((k) => {
    const v = valores[k.id] ?? { t: '', p: '' };
    const ok = n(v.t) > 50 && n(v.t) < 200 && n(v.p) > 5 && n(v.p) < 80;
    const ev = ok ? evaluarImc(n(v.p), n(v.t), k.sexo, edadMesesExacta(k.fechaNacimiento, fecha)) : null;
    return { k, v, ok, ev, parcial: (v.t || v.p) && !ok };
  });
  const listas = filas.filter((f) => f.ok);

  async function guardar() {
    if (!usuario) return;
    setGuardando(true);
    try {
      const b = writeBatch(db);
      const t = ahoraIso();
      for (const { k, v, ev } of listas) {
        const em = edadMesesExacta(k.fechaNacimiento, fecha);
        const m: Omit<MedicionFisica, 'id'> = {
          ninoId: k.id, acudientesIds: k.acudientesIds, ...(id ? { sesionId: id } : {}), fecha, tallaCm: n(v.t), pesoKg: n(v.p),
          imc: ev!.imc, edadMeses: Math.floor(em), zScoreImc: ev!.zScore, percentilImc: ev!.percentil, clasificacionImc: ev!.clasificacion?.tecnica ?? null,
          creadoEn: t, actualizadoEn: t, creadoPor: usuario.uid,
        };
        b.set(doc(db, 'medicionesFisicas', `${id ?? `med_${fecha}`}_${k.id}`), m);
      }
      await b.commit();
      toast(`${listas.length} ${listas.length === 1 ? 'medición guardada' : 'mediciones guardadas'}`);
      nav(-1);
    } catch (e) { toast(mensajeError(e), 'error'); }
    setGuardando(false);
  }

  return (
    <Pantalla>
      <Volver>Volver</Volver>
      <div className="titulo text-[28px]">Mediciones</div>
      {!id && !soloNino && (
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Categoría"><Selector value={cat} onChange={(e) => setCat(e.target.value)}>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Selector></Etiqueta>
          <Etiqueta texto="Fecha"><Campo type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} /></Etiqueta>
        </div>
      )}
      {soloNino && <Etiqueta texto="Fecha"><Campo type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} /></Etiqueta>}
      <div className="text-[13px] text-tenue">Talla en cm y peso en kg. El IMC y su clasificación OMS se calculan solos.</div>
      {filas.map(({ k, v, ev, parcial }) => (
        <div key={k.id} className="rounded-[22px] p-3 bg-sup border border-white/[0.07] flex flex-col gap-2.5">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-[14px] bg-[#1F2638] flex items-center justify-center text-xs font-extrabold shrink-0">{iniNino(k)}</span>
            <span className="flex-1 text-[15px] font-bold">{nombreNino(k)}</span>
            {ev && <span className="text-right text-xs leading-tight"><b className="text-base" style={{ color: ev.clasificacion ? COLOR_IMC[ev.clasificacion.nivel] : undefined }}>IMC {num(ev.imc)}</b><br /><span className="text-tenue">{ev.clasificacion?.tecnica ?? 'Fuera de tabla'}{ev.percentil !== null ? ` · P${Math.round(ev.percentil)}` : ''}</span></span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Campo inputMode="decimal" placeholder="Talla cm" value={v.t} onChange={(e) => setValores({ ...valores, [k.id]: { ...v, t: e.target.value.replace(/[^\d,.]/g, '') } })} />
            <Campo inputMode="decimal" placeholder="Peso kg" value={v.p} onChange={(e) => setValores({ ...valores, [k.id]: { ...v, p: e.target.value.replace(/[^\d,.]/g, '') } })} />
          </div>
          {parcial && <span className="text-xs text-ambar">Revisa los valores (talla 50–200 cm, peso 5–80 kg).</span>}
        </div>
      ))}
      {!kids.length && <Aviso>No hay niños activos en esta categoría.</Aviso>}
      <Boton alto="lg" onClick={guardar} cargando={guardando} disabled={!listas.length}>Guardar {listas.length || ''} {listas.length === 1 ? 'medición' : 'mediciones'}</Boton>
    </Pantalla>
  );
}
