// Gráficas SVG del prototipo: línea con franja de referencia, IMC con bandas OMS y radar.
import { FAMILIAS, type Familia } from '@pa/shared';
import { COLOR } from './base';

interface Punto { x: string; v: number }

function escala(valores: number[], extra: number[] = []) {
  const todos = [...valores, ...extra];
  let lo = Math.min(...todos), hi = Math.max(...todos);
  if (lo === hi) { lo -= 1; hi += 1; }
  const m = (hi - lo) * 0.15;
  return { lo: lo - m, hi: hi + m };
}

/** Línea de progreso con la franja de referencia (detalle de prueba). */
export function GraficaLinea({ puntos, franja, alto = 130 }: { puntos: Punto[]; franja?: [number, number] | null; alto?: number }) {
  if (puntos.length === 0) return null;
  const W = 320;
  const { lo, hi } = escala(puntos.map((p) => p.v), franja ? [...franja] : []);
  const y = (v: number) => Math.round((alto - 10 - ((v - lo) / (hi - lo)) * (alto - 20)) * 10) / 10;
  const x = (i: number) => (puntos.length === 1 ? W / 2 : 20 + (i * (W - 40)) / (puntos.length - 1));
  const d = 'M' + puntos.map((p, i) => `${x(i)} ${y(p.v)}`).join(' L');
  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${W} ${alto}`} width="100%" className="block overflow-visible">
        {franja && <rect x="0" y={y(franja[1])} width={W} height={Math.max(4, y(franja[0]) - y(franja[1]))} fill="rgba(79,123,255,0.14)" rx="6" />}
        <path d={d} fill="none" stroke={COLOR.verde} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {puntos.map((p, i) => i === puntos.length - 1
          ? <circle key={i} cx={x(i)} cy={y(p.v)} r="6" fill={COLOR.verde} />
          : <circle key={i} cx={x(i)} cy={y(p.v)} r="5" fill="#0A0D12" stroke={COLOR.verde} strokeWidth="3" />)}
      </svg>
      <div className="flex justify-between text-[11px] text-tenue">{puntos.map((p, i) => <span key={i}>{p.x}</span>)}</div>
    </div>
  );
}

/** Evolución del IMC con bandas OMS (P3–P15 · P15–P85 · P85–P97) y línea P50. */
export function GraficaImc({ puntos, curvas, alto = 150 }: { puntos: Punto[]; curvas: { p3: number; p15: number; p50: number; p85: number; p97: number } | null; alto?: number }) {
  if (puntos.length === 0) return null;
  const W = 320;
  const extra = curvas ? [curvas.p3, curvas.p97] : [];
  const { lo, hi } = escala(puntos.map((p) => p.v), extra);
  const y = (v: number) => Math.round((alto - 10 - ((v - lo) / (hi - lo)) * (alto - 20)) * 10) / 10;
  const x = (i: number) => (puntos.length === 1 ? W / 2 : 20 + (i * (W - 40)) / (puntos.length - 1));
  const d = 'M' + puntos.map((p, i) => `${x(i)} ${y(p.v)}`).join(' L');
  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${W} ${alto}`} width="100%" className="block overflow-visible">
        {curvas && (<>
          <rect x="0" y={y(curvas.p97)} width={W} height={y(curvas.p85) - y(curvas.p97)} fill="rgba(245,165,36,0.10)" />
          <rect x="0" y={y(curvas.p85)} width={W} height={y(curvas.p15) - y(curvas.p85)} fill="rgba(61,220,106,0.12)" />
          <rect x="0" y={y(curvas.p15)} width={W} height={y(curvas.p3) - y(curvas.p15)} fill="rgba(245,165,36,0.10)" />
          <line x1="0" x2={W} y1={y(curvas.p50)} y2={y(curvas.p50)} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 4" />
        </>)}
        <path d={d} fill="none" stroke={COLOR.verde} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {puntos.map((p, i) => i === puntos.length - 1
          ? <circle key={i} cx={x(i)} cy={y(p.v)} r="6" fill={COLOR.verde} />
          : <circle key={i} cx={x(i)} cy={y(p.v)} r="5" fill="#0A0D12" stroke={COLOR.verde} strokeWidth="3" />)}
      </svg>
      <div className="flex justify-between text-[11px] text-tenue">{puntos.map((p, i) => <span key={i}>{p.x}</span>)}</div>
      {curvas && (
        <div className="flex gap-3.5 text-[11px] text-tenue flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'rgba(61,220,106,0.35)' }} />P15–P85 esperado</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'rgba(245,165,36,0.35)' }} />P3–P15 · P85–P97</span>
          <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed border-white/50" />P50</span>
        </div>
      )}
    </div>
  );
}

/** Radar de 4 familias (arriba Locomoción, derecha Equilibrio, abajo Manos, izquierda Pies). */
export function Radar({ perfil }: { perfil: Record<Familia, number | null> }) {
  const cx0 = 120, cy0 = 100, R = 80;
  const v = (f: Familia) => (perfil[f] ?? 0) / 100;
  const poly = (k: number) => `${cx0},${cy0 - R * k} ${cx0 + R * k},${cy0} ${cx0},${cy0 + R * k} ${cx0 - R * k},${cy0}`;
  const datos = `${cx0},${cy0 - R * v('locomocion')} ${cx0 + R * v('equilibrio')},${cy0} ${cx0},${cy0 + R * v('manipulacion_manos')} ${cx0 - R * v('manipulacion_pies')},${cy0}`;
  const et = (f: Familia) => perfil[f] ?? '—';
  const nombre = (f: Familia) => FAMILIAS.find((x) => x.id === f)!.corto;
  return (
    <div className="relative w-[300px] max-w-full h-[250px] self-center">
      <svg viewBox="0 0 240 200" width="100%" height="250" className="block">
        {[0.25, 0.5, 0.75, 1].map((k) => <polygon key={k} points={poly(k)} fill="none" stroke={k === 1 ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)'} />)}
        <line x1="120" y1="20" x2="120" y2="180" stroke="rgba(255,255,255,0.08)" />
        <line x1="40" y1="100" x2="200" y2="100" stroke="rgba(255,255,255,0.08)" />
        <polygon points={datos} fill="rgba(61,220,106,0.22)" stroke={COLOR.verde} strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <div className="absolute top-0 inset-x-0 text-center text-xs text-suave">{nombre('locomocion')} <b className="text-verde">{et('locomocion')}</b></div>
      <div className="absolute bottom-0 inset-x-0 text-center text-xs text-suave">{nombre('manipulacion_manos')} <b className="text-verde">{et('manipulacion_manos')}</b></div>
      <div className="absolute top-[112px] -right-2 text-xs text-suave text-right">{nombre('equilibrio')}<br /><b className="text-verde">{et('equilibrio')}</b></div>
      <div className="absolute top-[112px] -left-2 text-xs text-suave">{nombre('manipulacion_pies')}<br /><b className="text-verde">{et('manipulacion_pies')}</b></div>
    </div>
  );
}
