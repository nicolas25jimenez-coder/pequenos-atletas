// Kit de UI replicado del prototipo (design/Pequenos Atletas App.dc.html).
import { CaretLeft, CheckCircle, WarningCircle, X } from '@phosphor-icons/react';
import {
  Children, cloneElement, createContext, isValidElement, useCallback, useContext, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDialogo } from './foco';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const COLOR = {
  verde: '#3DDC6A', azul: '#4F7BFF', marca: '#1F4FD8', ambar: '#F5A524', rojo: '#E5484D',
  cielo: '#3E9BFF', gris: '#9AA4B2', texto: '#F2F4F8', tenue: '#8C95A8', apagado: '#808A9E', tinta: '#06210F',
};

export function alfa(hex: string, a: number) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

/* ───────── Botones ───────── */

type Variante = 'primario' | 'secundario' | 'claro' | 'peligro' | 'fantasma' | 'punteado';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-verde text-tinta font-extrabold hover:bg-verde-hover border-0',
  secundario: 'bg-transparent border border-white/[0.14] text-texto font-semibold hover:bg-white/5',
  claro: 'bg-texto text-fondo font-extrabold border-0 hover:bg-white',
  peligro: 'bg-rojo text-white font-extrabold border-0 hover:brightness-110',
  // El ::after agranda el área táctil a 44 px o más sin mover nada.
  fantasma: 'bg-transparent border-0 text-verde font-bold p-0 h-auto relative after:content-[""] after:absolute after:-inset-y-3 after:inset-x-0',
  punteado: 'rounded-2xl border border-dashed border-verde/50 bg-verde/[0.06] text-verde font-bold',
};

interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  alto?: 'sm' | 'md' | 'lg';
  icono?: ReactNode;
  bloque?: boolean;
  cargando?: boolean;
}

export function Boton({ variante = 'primario', alto = 'md', icono, bloque, cargando, className, children, disabled, ...p }: PropsBoton) {
  const h = variante === 'fantasma' ? '' : alto === 'lg' ? 'h-[58px] text-[15px] px-6' : alto === 'sm' ? 'h-11 text-[13px] px-[14px]' : 'h-12 text-sm px-5';
  return (
    <button
      {...p}
      disabled={disabled || cargando}
      className={cx('inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        variante !== 'punteado' && variante !== 'fantasma' && 'rounded-full', h, VARIANTES[variante], bloque && 'w-full', className)}
    >
      {cargando ? <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : icono}
      {children}
    </button>
  );
}

export function BotonIcono({ children, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className={cx('w-11 h-11 rounded-full bg-sup border border-white/[0.08] text-texto flex items-center justify-center cursor-pointer relative shrink-0 hover:bg-suph', className)}>
      {children}
    </button>
  );
}

export function Volver({ a, children }: { a?: string; children: ReactNode }) {
  const nav = useNavigate();
  return (
    <button onClick={() => (a ? nav(a) : nav(-1))} className="self-start flex items-center gap-1.5 h-11 pl-2.5 pr-3.5 rounded-full bg-sup border border-white/[0.08] text-texto text-[13px] font-semibold cursor-pointer">
      <CaretLeft weight="bold" /><span className="whitespace-nowrap">{children}</span>
    </button>
  );
}

/* ───────── Superficies y texto ───────── */

export function Tarjeta({ children, className, onClick, como }: { children: ReactNode; className?: string; onClick?: () => void; como?: string }) {
  const cls = cx('tarjeta p-[18px] flex flex-col gap-3 text-texto text-left', onClick || como ? 'cursor-pointer hover:bg-suph transition-colors' : '', className);
  if (como) return <Link to={como} className={cx(cls, 'no-underline')}>{children}</Link>;
  if (onClick) return <button onClick={onClick} className={cls}>{children}</button>;
  return <div className={cls}>{children}</div>;
}

export function Kicker({ children, icono, className, color }: { children: ReactNode; icono?: ReactNode; className?: string; color?: string }) {
  return <span className={cx('kicker flex items-center gap-2', className)} style={color ? { color } : undefined}>{icono}{children}</span>;
}

export function Titulo({ children, tam = 30, className }: { children: ReactNode; tam?: number; className?: string }) {
  return <div className={cx('titulo', className)} style={{ fontSize: tam }}>{children}</div>;
}

export function Encabezado({ titulo, sub, derecha }: { titulo: ReactNode; sub?: ReactNode; derecha?: ReactNode }) {
  return (
    <div className="flex justify-between items-end gap-3">
      <div className="flex flex-col gap-1 min-w-0">
        {sub && <span className="text-xs text-tenue">{sub}</span>}
        <Titulo>{titulo}</Titulo>
      </div>
      {derecha}
    </div>
  );
}

export function Fila({ k, v, className }: { k: ReactNode; v: ReactNode; className?: string }) {
  return (
    <div className={cx('flex justify-between gap-4 text-sm leading-snug', className)}>
      <span className="text-tenue shrink-0">{k}</span>
      <span className="text-right font-semibold min-w-0 break-words">{v}</span>
    </div>
  );
}

export function Pildora({ color, children, punto = true, className }: { color: string; children: ReactNode; punto?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap self-start', className)} style={{ background: alfa(color, 0.15), color }}>
      {punto && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

export function Punto({ color, children }: { color: string; children: ReactNode }) {
  return <span className="flex items-center gap-1.5 text-xs" style={{ color }}><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />{children}</span>;
}

export function Avatar({ ini, tam = 44, fondo = COLOR.marca, color = COLOR.texto, redondo = true, borde, foto }: { ini: string; tam?: number; fondo?: string; color?: string; redondo?: boolean; borde?: string; foto?: string | null }) {
  return (
    <span
      className="flex items-center justify-center font-extrabold shrink-0 overflow-hidden"
      style={{ width: tam, height: tam, borderRadius: redondo ? '50%' : tam * 0.32, background: fondo, color, fontSize: Math.max(12, tam * 0.3), border: borde ? `2px solid ${borde}` : undefined }}
    >
      {foto ? <img src={foto} alt="" className="w-full h-full object-cover" /> : ini}
    </span>
  );
}

export function Barra({ pct, color, alto = 4 }: { pct: number; color: string; alto?: number }) {
  return <div className="rounded-sm bg-linea overflow-hidden" style={{ height: alto }}><div className="h-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} /></div>;
}

export function Vacio({ icono, titulo, texto, accion }: { icono?: ReactNode; titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="tarjeta p-6 flex flex-col items-center text-center gap-2">
      {icono && <span className="text-3xl text-tenue">{icono}</span>}
      <span className="font-bold">{titulo}</span>
      {texto && <span className="text-sm text-tenue pretty">{texto}</span>}
      {accion}
    </div>
  );
}

/** Indicador de carga. role="status": los lectores de pantalla anuncian el texto. */
export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-16 text-tenue text-sm">
      <span aria-hidden="true" className="w-5 h-5 rounded-full border-2 border-verde border-t-transparent animate-spin" />{texto}
    </div>
  );
}

/** Bloque gris animado para tarjetas y textos que aún cargan. */
export function Esqueleto({ alto = 16, ancho = '100%', className }: { alto?: number | string; ancho?: number | string; className?: string }) {
  return <div aria-hidden="true" className={cx('esqueleto', className)} style={{ height: alto, width: ancho }} />;
}

/** Lista de tarjetas-esqueleto mientras cargan los datos. */
export function EsqueletoLista({ filas = 3, alto = 76, texto = 'Cargando…' }: { filas?: number; alto?: number; texto?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-solo">{texto}</span>
      {Array.from({ length: filas }, (_, i) => <Esqueleto key={i} alto={alto} className="!rounded-3xl" />)}
    </div>
  );
}

/** Aviso amable cuando algo no cargó. Úsalo con `Estado.error` de lib/datos.ts. */
export function ErrorCarga({ mensaje, onReintentar }: { mensaje?: string | null; onReintentar: () => void }) {
  return (
    <div role="alert" className="tarjeta p-6 flex flex-col items-center text-center gap-3">
      <WarningCircle weight="bold" size={32} aria-hidden="true" style={{ color: COLOR.ambar }} />
      <span className="font-bold">No pudimos cargar esto</span>
      <span className="text-sm text-tenue pretty">{mensaje || 'Revisa tu conexión a internet e inténtalo de nuevo.'}</span>
      <Boton variante="secundario" alto="sm" onClick={onReintentar}>Reintentar</Boton>
    </div>
  );
}

export function Aviso({ tono = 'info', children }: { tono?: 'info' | 'alerta' | 'error' | 'exito'; children: ReactNode }) {
  const c = tono === 'alerta' ? COLOR.ambar : tono === 'error' ? COLOR.rojo : tono === 'exito' ? COLOR.verde : COLOR.azul;
  return <div role={tono === 'error' ? 'alert' : undefined} className="text-[13px] leading-snug px-3.5 py-3 rounded-2xl flex gap-2.5 items-start" style={{ background: alfa(c, 0.1), color: tono === 'info' ? '#C9CFDB' : c }}>
    <WarningCircle weight="bold" aria-hidden="true" className="shrink-0 mt-0.5" style={{ color: c }} /><div className="min-w-0">{children}</div>
  </div>;
}

/* ───────── Pestañas segmentadas ───────── */

export function Segmentado<T extends string>({ opciones, valor, onCambio, alto = 44 }: { opciones: { id: T; etiqueta: ReactNode }[]; valor: T; onCambio: (v: T) => void; alto?: number }) {
  return (
    <div role="group" className="flex gap-1 bg-pista p-[5px] rounded-full border border-white/[0.07]">
      {opciones.map((o) => (
        <button key={o.id} type="button" aria-pressed={valor === o.id} onClick={() => onCambio(o.id)}
          className={cx('flex-1 rounded-full border-0 text-sm font-bold cursor-pointer px-2 whitespace-nowrap', valor === o.id ? 'bg-verde text-tinta' : 'bg-transparent text-tenue')}
          style={{ height: alto }}>
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({ opciones, valor, onCambio }: { opciones: { id: T; etiqueta: ReactNode }[]; valor: T | T[]; onCambio: (v: T) => void }) {
  const activo = (id: T) => (Array.isArray(valor) ? valor.includes(id) : valor === id);
  return (
    <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 pb-0.5">
      {opciones.map((o) => (
        <button key={o.id} type="button" aria-pressed={activo(o.id)} onClick={() => onCambio(o.id)}
          className={cx('shrink-0 h-11 px-3.5 rounded-full text-[13px] font-bold cursor-pointer whitespace-nowrap border',
            activo(o.id) ? 'bg-verde text-tinta border-verde' : 'bg-sup text-suave border-white/10')}>
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

/* ───────── Formularios ───────── */

/** Etiqueta visible enlazada al campo (id automático), con `ayuda` y `error` opcionales. */
export function Etiqueta({ texto, children, ayuda, error, className }: { texto: string; children: ReactNode; ayuda?: string; error?: string | null; className?: string }) {
  const id = useId();
  const idAyuda = `${id}-ayuda`, idError = `${id}-error`;
  const hijo = Children.count(children) === 1 ? Children.toArray(children)[0] : null;
  const esCampo = isValidElement(hijo) && (hijo.type === Campo || hijo.type === Selector || hijo.type === AreaTexto || hijo.type === 'input' || hijo.type === 'select' || hijo.type === 'textarea');
  const describe = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(' ') || undefined;
  const textoEtiqueta = <span className="text-xs font-bold text-tenue tracking-wide">{texto}</span>;
  const pie = (<>
    {ayuda && <span id={idAyuda} className="text-xs text-apagado leading-snug">{ayuda}</span>}
    {error && <span id={idError} role="alert" className="text-xs font-semibold text-rojo-claro leading-snug">{error}</span>}
  </>);
  if (esCampo && isValidElement(hijo)) {
    const props = hijo.props as { id?: string };
    const idCampo = props.id ?? id;
    return (
      <div className={cx('flex flex-col gap-1.5 min-w-0', className)}>
        <label htmlFor={idCampo} className="flex">{textoEtiqueta}</label>
        {cloneElement(hijo as ReactElement<Record<string, unknown>>, { id: idCampo, 'aria-invalid': error ? true : undefined, 'aria-describedby': describe })}
        {pie}
      </div>
    );
  }
  // Contenido que no es un campo simple (chips, grupos...): la etiqueta envuelve todo, como antes.
  return (
    <label className={cx('flex flex-col gap-1.5 min-w-0', className)}>
      {textoEtiqueta}
      {children}
      {pie}
    </label>
  );
}

export function Campo({ icono, className, ...p }: InputHTMLAttributes<HTMLInputElement> & { icono?: ReactNode }) {
  if (!icono) return <input {...p} className={cx('campo', className)} />;
  return (
    <div className={cx('campo-icono flex items-center gap-3 h-14 px-[18px] rounded-[18px] bg-sup border border-white/[0.08] focus-within:border-azul focus-within:outline focus-within:outline-2 focus-within:outline-verde', className)}>
      <span aria-hidden="true" className="text-azul text-[19px] flex">{icono}</span>
      <input {...p} className="flex-1 bg-transparent border-0 outline-none text-texto text-[15px] min-w-0" />
    </div>
  );
}

export function Selector({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cx('campo', className)}>{children}</select>;
}

export function AreaTexto({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx('campo', className)} />;
}

export function Interruptor({ activo, onCambio, children }: { activo: boolean; onCambio: (v: boolean) => void; children?: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={activo} onClick={() => onCambio(!activo)} className="flex items-center gap-2.5 min-h-11 bg-transparent border-0 text-suave text-[13px] cursor-pointer p-0 text-left">
      <span className="w-9 h-[22px] rounded-[11px] relative block shrink-0 transition-colors" style={{ background: activo ? COLOR.verde : '#2A3142' }}>
        <span className="absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all" style={{ left: activo ? 17 : 3 }} />
      </span>
      {children}
    </button>
  );
}

export function Casilla({ activo, onCambio, children }: { activo: boolean; onCambio: (v: boolean) => void; children: ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={activo} onClick={() => onCambio(!activo)} className="flex gap-3 items-center min-h-11 text-left bg-transparent border-0 text-suave text-[13px] leading-snug cursor-pointer p-0">
      <span className="w-[22px] h-[22px] shrink-0 rounded-[7px] flex items-center justify-center text-tinta"
        style={{ border: `1.5px solid ${activo ? COLOR.verde : '#3A4256'}`, background: activo ? COLOR.verde : 'transparent' }}>
        {activo && <svg width="13" height="13" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" d="M40 144l56 56L216 72" /></svg>}
      </span>
      <span className="min-w-0">{children}</span>
    </button>
  );
}

/* ───────── Hoja inferior ───────── */

/** Modal tipo hoja inferior. Accesible: role=dialog, foco atrapado, Escape cierra y devuelve el foco al cerrar. */
export function Hoja({ abierta, onCerrar, titulo, sub, children }: { abierta: boolean; onCerrar: () => void; titulo: string; sub?: ReactNode; children: ReactNode }) {
  const idTitulo = useId();
  const caja = useRef<HTMLDivElement>(null);
  useDialogo(abierta, caja, onCerrar);
  if (!abierta) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-center">
      <div onClick={onCerrar} aria-hidden="true" className="absolute inset-0 bg-black/60" />
      <div ref={caja} role="dialog" aria-modal="true" aria-labelledby={idTitulo} tabIndex={-1}
        className="absolute bottom-0 w-full max-w-[480px] max-h-[88dvh] overflow-y-auto rounded-t-5xl bg-sup border-t border-white/10 px-[22px] pt-3.5 pb-[calc(34px+env(safe-area-inset-bottom))] flex flex-col gap-3.5 outline-none">
        <div aria-hidden="true" className="w-10 h-[5px] rounded bg-[#2A3142] self-center shrink-0" />
        <div className="flex justify-between items-start gap-3">
          <div className="flex flex-col gap-1.5"><Titulo tam={22}><span id={idTitulo}>{titulo}</span></Titulo>{sub && <div className="text-[13px] text-tenue">{sub}</div>}</div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="text-tenue bg-transparent border-0 cursor-pointer w-11 h-11 -mt-2 -mr-3 flex items-center justify-center shrink-0 rounded-full"><X weight="bold" size={20} aria-hidden="true" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Diálogo para confirmar una acción (reemplaza a confirm() del navegador). El foco inicial queda en "Cancelar". */
export function Confirmar({ abierta, titulo, texto, textoConfirmar = 'Confirmar', tono = 'normal', cargando, onConfirmar, onCancelar }: {
  abierta: boolean; titulo: string; texto?: ReactNode; textoConfirmar?: string; tono?: 'peligro' | 'normal'; cargando?: boolean;
  onConfirmar: () => void; onCancelar: () => void;
}) {
  const idTitulo = useId(), idTexto = useId();
  const caja = useRef<HTMLDivElement>(null);
  useDialogo(abierta, caja, () => { if (!cargando) onCancelar(); });
  if (!abierta) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
      <div onClick={() => { if (!cargando) onCancelar(); }} aria-hidden="true" className="absolute inset-0 bg-black/70" />
      <div ref={caja} role="alertdialog" aria-modal="true" aria-labelledby={idTitulo} aria-describedby={texto ? idTexto : undefined} tabIndex={-1}
        className="relative w-full max-w-[400px] rounded-[28px] bg-sup border border-white/10 p-6 flex flex-col gap-4 outline-none shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <div id={idTitulo} className="titulo" style={{ fontSize: 20 }}>{titulo}</div>
        {texto && <div id={idTexto} className="text-sm text-suave leading-snug pretty">{texto}</div>}
        <div className="flex flex-col-reverse gap-2.5">
          <Boton data-foco-inicial="" variante="secundario" bloque disabled={cargando} onClick={onCancelar}>Cancelar</Boton>
          <Boton variante={tono === 'peligro' ? 'peligro' : 'primario'} bloque cargando={cargando} onClick={onConfirmar}>{textoConfirmar}</Boton>
        </div>
      </div>
    </div>
  );
}

/* ───────── Toast ───────── */

const ToastCtx = createContext<(t: string, tipo?: 'ok' | 'error') => void>(() => {});

/** Avisos breves. Las zonas "en vivo" siempre existen para que el lector de pantalla anuncie el texto nuevo. */
export function ProveedorToast({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const mostrar = useCallback((texto: string, tipo: 'ok' | 'error' = 'ok') => {
    clearTimeout(timer.current);
    setT({ texto, tipo });
    timer.current = setTimeout(() => setT(null), tipo === 'error' ? 5000 : 3200);
  }, []);
  const caja = (tipo: 'ok' | 'error') => t && t.tipo === tipo && (
    <div className="w-full max-w-[440px] rounded-[20px] px-4 py-3.5 bg-texto text-fondo text-sm font-semibold leading-snug flex gap-2.5 items-start shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
      {tipo === 'ok'
        ? <CheckCircle weight="fill" size={20} aria-hidden="true" className="shrink-0" color="#1E8A39" />
        : <WarningCircle weight="fill" size={20} aria-hidden="true" className="shrink-0" color={COLOR.rojo} />}
      {t.texto}
    </div>
  );
  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      <div className="fixed left-0 right-0 top-[max(16px,env(safe-area-inset-top))] z-[70] flex flex-col items-center px-5 pointer-events-none">
        <div role="status" aria-live="polite" className="w-full flex justify-center">{caja('ok')}</div>
        <div role="alert" className="w-full flex justify-center">{caja('error')}</div>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
