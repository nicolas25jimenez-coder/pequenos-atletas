// Historial de mediciones y pruebas: panel del grupo con gráficas y, al tocar a un niño, su historial.
import { useMemo, useState } from 'react';
import { fechaCorta, num, type MedicionFisica, type ResultadoPrueba } from '@pa/shared';
import { useColeccion } from '../../lib/datos';
import { Aviso, Etiqueta, Kicker, Selector, Tarjeta, Vacio, Volver } from '../../ui/base';
import { GraficaLinea } from '../../ui/graficas';
import { Pantalla } from '../../ui/marco';
import { iniNino, nombreNino, useEntrenador } from './contexto';

interface Punto { ninoId: string; fecha: string; v: number }

const FISICAS: Record<string, { nombre: string; unidad: string; valor: (m: MedicionFisica) => number }> = {
  imc: { nombre: 'IMC', unidad: 'kg/m²', valor: (m) => m.imc },
  talla: { nombre: 'Talla', unidad: 'cm', valor: (m) => m.tallaCm },
  peso: { nombre: 'Peso', unidad: 'kg', valor: (m) => m.pesoKg },
};

const promedio = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function HistorialMediciones() {
  const { activos, categorias, pruebas } = useEntrenador();
  const med = useColeccion<MedicionFisica>('medicionesFisicas');
  const res = useColeccion<ResultadoPrueba>('resultadosPruebas');
  const catsActivas = categorias.filter((c) => c.activa);
  const [cat, setCat] = useState(catsActivas[0]?.id ?? '');
  const [metrica, setMetrica] = useState('todas');
  const [ninoId, setNinoId] = useState<string | null>(null);

  const kids = useMemo(() => activos.filter((n) => n.categoriaId === cat), [activos, cat]);
  const ids = useMemo(() => new Set(kids.map((k) => k.id)), [kids]);
  const pruebasActivas = pruebas.filter((p) => p.activa);

  /** Valores (uno por niño y fecha) de una medida. */
  const puntos = (m: string): Punto[] => {
    if (FISICAS[m]) return med.datos.filter((x) => ids.has(x.ninoId)).map((x) => ({ ninoId: x.ninoId, fecha: x.fecha, v: FISICAS[m].valor(x) }));
    const pid = m.replace('prueba:', '');
    return res.datos.filter((r) => ids.has(r.ninoId) && r.pruebaId === pid && r.valorFinal !== null && !r.noRealizada)
      .map((r) => ({ ninoId: r.ninoId, fecha: r.fecha, v: r.valorFinal as number }));
  };
  const info = (m: string) => {
    if (FISICAS[m]) return { nombre: FISICAS[m].nombre, unidad: FISICAS[m].unidad };
    const p = pruebas.find((x) => `prueba:${x.id}` === m);
    return { nombre: p?.nombre ?? 'Prueba', unidad: p?.unidad || (p?.escalaCualitativa ? 'nivel' : '') };
  };
  /** Promedio del grupo por fecha, de más antigua a más reciente (últimas 8). */
  const serieGrupo = (ps: Punto[]) => {
    const porFecha = new Map<string, number[]>();
    for (const p of ps) porFecha.set(p.fecha, [...(porFecha.get(p.fecha) ?? []), p.v]);
    return [...porFecha.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([f, vs]) => ({ x: fechaCorta(f), v: Math.round(promedio(vs) * 100) / 100 }));
  };

  const cargando = med.cargando || res.cargando;
  const nino = ninoId ? kids.find((k) => k.id === ninoId) : null;

  const encabezado = (
    <>
      <Volver a="/e/mas">Más</Volver>
      <div className="titulo text-[28px]">Mediciones</div>
      <div className="text-[13px] text-tenue">Historial de tallas, pesos y pruebas. Para medir, ve a Niños → Medir.</div>
      <div className="grid grid-cols-2 gap-2.5">
        <Etiqueta texto="Categoría"><Selector value={cat} onChange={(e) => { setCat(e.target.value); setNinoId(null); }}>{catsActivas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Selector></Etiqueta>
        <Etiqueta texto="Qué ver">
          <Selector value={metrica} onChange={(e) => { setMetrica(e.target.value); setNinoId(null); }}>
            <option value="todas">Todas</option>
            <optgroup label="Físico">{Object.entries(FISICAS).map(([k, v]) => <option key={k} value={k}>{v.nombre}</option>)}</optgroup>
            <optgroup label="Pruebas">{pruebasActivas.map((p) => <option key={p.id} value={`prueba:${p.id}`}>{p.nombre}</option>)}</optgroup>
          </Selector>
        </Etiqueta>
      </div>
    </>
  );

  if (!catsActivas.length) return <Pantalla>{encabezado}<Vacio titulo="No hay categorías activas" /></Pantalla>;
  if (cargando) return <Pantalla>{encabezado}<div className="text-sm text-tenue">Cargando…</div></Pantalla>;
  if (!kids.length) return <Pantalla>{encabezado}<Aviso>No hay niños activos en esta categoría.</Aviso></Pantalla>;

  // Todas: tarjetas con la gráfica del grupo por cada medida que tenga datos
  if (metrica === 'todas') {
    const claves = [...Object.keys(FISICAS), ...pruebasActivas.map((p) => `prueba:${p.id}`)];
    const conDatos = claves.map((k) => ({ k, ps: puntos(k) })).filter((x) => x.ps.length);
    return (
      <Pantalla>
        {encabezado}
        {!conDatos.length && <Vacio titulo="Aún no hay mediciones" texto="Cuando midas o registres pruebas, aparecerán aquí." />}
        {conDatos.map(({ k, ps }) => {
          const { nombre, unidad } = info(k);
          const serie = serieGrupo(ps);
          return (
            <Tarjeta key={k} onClick={() => setMetrica(k)} className="gap-2">
              <div className="flex justify-between items-baseline"><Kicker>{nombre}</Kicker><span className="text-xs text-tenue">{new Set(ps.map((p) => p.ninoId)).size} niños · promedio por fecha</span></div>
              <GraficaLinea puntos={serie} alto={90} />
              <div className="text-xs text-suave">Último promedio: <b className="text-texto">{num(serie[serie.length - 1].v)} {unidad}</b></div>
            </Tarjeta>
          );
        })}
      </Pantalla>
    );
  }

  const { nombre, unidad } = info(metrica);
  const ps = puntos(metrica);

  // Historial de un niño
  if (nino) {
    const suyos = ps.filter((p) => p.ninoId === nino.id).sort((a, b) => a.fecha.localeCompare(b.fecha));
    return (
      <Pantalla>
        {encabezado}
        <button onClick={() => setNinoId(null)} className="self-start text-sm text-verde font-semibold bg-transparent border-0 p-0 cursor-pointer">← Volver al grupo</button>
        <Tarjeta className="gap-3">
          <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-[14px] bg-[#1F2638] flex items-center justify-center text-xs font-extrabold">{iniNino(nino)}</span><div><div className="text-[17px] font-bold">{nombreNino(nino)}</div><div className="text-xs text-tenue">{nombre}</div></div></div>
          {suyos.length ? <GraficaLinea puntos={suyos.slice(-8).map((p) => ({ x: fechaCorta(p.fecha), v: p.v }))} /> : <div className="text-sm text-tenue">Sin datos de {nombre.toLowerCase()} todavía.</div>}
        </Tarjeta>
        {[...suyos].reverse().map((p, i) => (
          <div key={i} className="flex justify-between rounded-[16px] px-4 py-3 bg-sup border border-white/[0.07] text-sm"><span>{fechaCorta(p.fecha)}</span><b>{num(p.v)} {unidad}</b></div>
        ))}
      </Pantalla>
    );
  }

  // Panel del grupo para una medida
  const ultimo = new Map<string, Punto>();
  for (const p of [...ps].sort((a, b) => a.fecha.localeCompare(b.fecha))) ultimo.set(p.ninoId, p);
  const actuales = [...ultimo.values()].map((p) => p.v);
  return (
    <Pantalla>
      {encabezado}
      <Tarjeta className="gap-3">
        <Kicker>{nombre} · promedio del grupo</Kicker>
        {ps.length ? <GraficaLinea puntos={serieGrupo(ps)} /> : <div className="text-sm text-tenue">Aún no hay datos de {nombre.toLowerCase()} en esta categoría.</div>}
        {actuales.length > 0 && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['Promedio', promedio(actuales)], ['Mínimo', Math.min(...actuales)], ['Máximo', Math.max(...actuales)]].map(([t, v]) => (
              <div key={t as string} className="rounded-[14px] bg-white/[0.04] py-2"><div className="text-[11px] text-tenue">{t as string}</div><div className="text-[15px] font-bold">{num(v as number)}</div></div>
            ))}
          </div>
        )}
      </Tarjeta>
      <Kicker>Niños · toca uno para ver su historial</Kicker>
      {kids.map((k) => {
        const u = ultimo.get(k.id);
        const n = ps.filter((p) => p.ninoId === k.id).length;
        return (
          <button key={k.id} onClick={() => setNinoId(k.id)} className="flex items-center gap-3 rounded-[20px] px-4 py-3 bg-sup border border-white/[0.07] text-texto text-left cursor-pointer hover:bg-suph">
            <span className="w-10 h-10 rounded-[14px] bg-[#1F2638] flex items-center justify-center text-xs font-extrabold shrink-0">{iniNino(k)}</span>
            <span className="flex-1 text-[15px] font-bold">{nombreNino(k)}</span>
            <span className="text-right text-sm">{u ? <><b>{num(u.v)} {unidad}</b><br /><span className="text-xs text-tenue">{n} {n === 1 ? 'registro' : 'registros'}</span></> : <span className="text-xs text-tenue">Sin datos</span>}</span>
          </button>
        );
      })}
    </Pantalla>
  );
}
