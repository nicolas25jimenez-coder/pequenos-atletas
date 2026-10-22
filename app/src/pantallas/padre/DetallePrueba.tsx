import { Play, Target } from '@phosphor-icons/react';
import { useParams } from 'react-router-dom';
import { edadAnios, FAMILIAS, fechaCorta, formatoValor, referenciaPara, type Medio } from '@pa/shared';
import { alfa, Tarjeta, Vacio, Volver } from '../../ui/base';
import { GraficaLinea } from '../../ui/graficas';
import { Pantalla } from '../../ui/marco';
import { useFoto } from '../comun/useFoto';
import { useFamilia } from './familia';
import { comparacionDe, tendenciaDe, usarResumenPruebas } from './MiHijo';

const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function DetallePrueba() {
  const { pruebaId } = useParams();
  const { nino, resultados, pruebas, rutas } = useFamilia();
  const resumen = usarResumenPruebas(resultados, pruebas).find((r) => r.p.id === pruebaId);
  if (!nino) return null;
  if (!resumen) return <Pantalla><Volver a={rutas.pruebas}>Pruebas de {nino.nombres}</Volver><Vacio titulo="Sin resultados para esta prueba" /></Pantalla>;

  const { p, ultimo, anterior, historial } = resumen;
  const fam = FAMILIAS.find((f) => f.id === p.familia)!;
  const cmp = comparacionDe(ultimo, p);
  const t = tendenciaDe(p, anterior, ultimo);
  const ref = referenciaPara(p, edadAnios(nino.fechaNacimiento, ultimo.fecha), nino.sexo);
  const unidad = p.tipoResultado === 'cualitativa' ? '' : p.unidad;
  const nf = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
  const textoTendencia = !t ? 'Primera evaluación' : t.direccion === 'igual' ? 'Igual que la evaluación anterior'
    : p.tipoResultado === 'cualitativa' ? (t.direccion === 'mejor' ? 'Mejoró respecto a la evaluación anterior' : 'Bajó respecto a la evaluación anterior')
    : `${t.direccion === 'mejor' ? 'Mejoró' : 'Bajó'} ${nf(t.diferencia)} ${unidad} respecto a ${MES[Number(anterior!.fecha.slice(5, 7)) - 1].toLowerCase()}`;

  return (
    <Pantalla>
      <Volver a={rutas.pruebas}>Pruebas de {nino.nombres}</Volver>
      <div className="flex flex-col gap-2">
        <span className="kicker" style={{ color: '#4F7BFF', letterSpacing: '0.14em' }}>{fam.corto} · {p.capacidad}</span>
        <div className="titulo text-[26px] balance" style={{ lineHeight: 1.02 }}>{p.nombre}</div>
      </div>

      <div className="flex items-stretch gap-3">
        <Tarjeta className="flex-1 gap-1.5">
          <span className="kicker">Resultado · {fechaCorta(ultimo.fecha)}</span>
          <span className="text-[38px] font-[850] leading-none">{formatoValor(p, ultimo.valorFinal)} <span className="text-[15px] font-medium text-tenue">{unidad}</span></span>
          <span className="text-[13px] font-bold" style={{ color: t?.color ?? '#8C95A8' }}>{textoTendencia}</span>
        </Tarjeta>
        <div className="w-[118px] shrink-0 rounded-3xl p-4 flex flex-col justify-between gap-2" style={{ background: alfa(cmp.color, 0.14) }}>
          <Target weight="bold" size={22} style={{ color: cmp.color }} />
          <span className="text-[15px] font-extrabold leading-tight" style={{ color: cmp.color }}>{cmp.texto}</span>
          <span className="text-[11px] text-suave">{ref ? `Ref. ${nf(ref.valorBajo)}–${nf(ref.valorAlto)} ${unidad}` : p.tipoResultado === 'cualitativa' ? 'Escala de observación' : 'Sin referencia aún'}</span>
        </div>
      </div>

      {historial.length > 0 && (
        <Tarjeta className="gap-2.5">
          <div className="flex justify-between"><span className="kicker">Progreso</span><span className="text-[11px] text-tenue">{p.tipoResultado === 'cualitativa' ? '' : p.mejorEs === 'menor' ? 'Menos es mejor' : 'Más es mejor'}</span></div>
          <GraficaLinea puntos={historial.map((r) => ({ x: MES[Number(r.fecha.slice(5, 7)) - 1], v: r.valorFinal! }))} franja={ref ? [ref.valorBajo, ref.valorAlto] : null} />
          {ref && <div className="flex items-center gap-1.5 text-[11px] text-tenue"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'rgba(79,123,255,0.4)' }} />Franja de referencia para su edad</div>}
        </Tarjeta>
      )}

      <div className="flex flex-col gap-2 px-1">
        <span className="kicker">Qué mide y por qué</span>
        <div className="text-[15px] leading-normal pretty">{p.objetivo}</div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="text-xs text-tenue self-center">Prepara para</span>
          {p.deportesRelacionados.map((d) => <span key={d} className="px-[11px] py-[5px] rounded-full border border-verde/40 text-verde text-xs font-semibold">{d}</span>)}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-1">
        <span className="kicker">Cómo se realiza</span>
        <div className="text-sm leading-normal text-suave pretty">{p.protocolo}</div>
        {p.materiales && <div className="text-xs text-tenue">Materiales: {p.materiales}</div>}
        {p.mediaEjemploUrl ? (
          p.mediaEjemploUrl.match(/\.(mp4|webm|mov)(\?|$)/i)
            ? <video src={p.mediaEjemploUrl} controls className="w-full rounded-[20px] mt-1" />
            : <a href={p.mediaEjemploUrl} target="_blank" rel="noreferrer" className="h-[170px] rounded-[20px] mt-1 rayado flex items-center justify-center gap-2.5 font-mono text-[11px] text-suave no-underline">
                <span className="w-11 h-11 rounded-full bg-white/[0.08] flex items-center justify-center text-texto"><Play weight="fill" size={18} /></span>Ver video de ejemplo
              </a>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="kicker px-1">Historial</span>
        {[...historial].reverse().map((r) => {
          const c = comparacionDe(r, p);
          return (
            <div key={r.id} className="rounded-[20px] px-4 py-3.5 bg-sup border border-white/[0.07] flex flex-col gap-1.5">
              <div className="flex justify-between items-center"><span className="text-[13px] text-tenue">{fechaCorta(r.fecha)}</span><span className="text-base font-extrabold">{formatoValor(p, r.valorFinal)} {unidad}</span></div>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: c.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />{c.texto}</span>
              {r.intentos.length > 1 && <div className="text-xs text-tenue">Intentos: {r.intentos.map(nf).join(' · ')}</div>}
              {r.observacion && <div className="text-[13px] text-suave leading-snug">“{r.observacion}”</div>}
              {r.medios.length > 0 && <div className="flex gap-2 flex-wrap">{r.medios.map((m) => <Miniatura key={m.ruta} medio={m} />)}</div>}
            </div>
          );
        })}
      </div>
    </Pantalla>
  );
}

function Miniatura({ medio }: { medio: Medio }) {
  const url = useFoto(medio.ruta);
  if (!url) return <div className="w-20 h-20 rounded-xl rayado" />;
  return medio.tipo === 'video'
    ? <video src={url} controls className="w-40 h-24 rounded-xl object-cover" />
    : <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="w-20 h-20 rounded-xl object-cover" /></a>;
}
