import type { Icon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cx } from './base';

export function Logo({ tam = 26, conPunto = true }: { tam?: number; conPunto?: boolean }) {
  const punto = Math.round(tam * 0.34);
  return (
    <div className="flex items-end gap-1 titulo" style={{ fontSize: tam, lineHeight: 0.92, fontWeight: 900 }}>
      <div>Pequeños<br />Atletas</div>
      {conPunto && <div className="shrink-0 rounded-full bg-verde" style={{ width: punto, height: punto, marginBottom: tam * 0.15, boxShadow: `0 0 ${punto * 1.5}px #3DDC6A` }} />}
    </div>
  );
}

/** Columna principal tipo app móvil, centrada en pantallas grandes, con los halos del prototipo. */
export function Marco({ children, ancho = 'normal' }: { children: ReactNode; ancho?: 'normal' | 'amplio' }) {
  return (
    <div className="min-h-dvh flex justify-center bg-exterior">
      <div className={cx('relative w-full min-h-dvh bg-fondo overflow-x-clip', ancho === 'amplio' ? 'max-w-[960px]' : 'max-w-[480px]')}>
        <div className="pointer-events-none absolute -top-[180px] -right-[160px] w-[460px] h-[460px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(31,79,216,0.38),rgba(31,79,216,0) 68%)' }} />
        <div className="pointer-events-none fixed -bottom-[200px] -left-[180px] w-[420px] h-[420px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(61,220,106,0.10),rgba(61,220,106,0) 68%)' }} />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

/** Contenido de una pantalla con el espaciado del prototipo. */
export function Pantalla({ children, className, conNav = true }: { children: ReactNode; className?: string; conNav?: boolean }) {
  return (
    <div className={cx('px-5 pt-[max(28px,env(safe-area-inset-top))] flex flex-col gap-4', conNav ? 'pb-nav' : 'pb-10', className)}>
      {children}
    </div>
  );
}

export interface ItemNav { a: string; etiqueta: string; icono: Icon; fin?: boolean; insignia?: number }

export function BarraNav({ items }: { items: ItemNav[] }) {
  return (
    <div className="fixed left-0 right-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 flex justify-center px-3 pointer-events-none">
      <nav className="pointer-events-auto w-full max-w-[456px] h-[70px] rounded-[35px] bg-[rgba(18,22,32,0.94)] border border-white/[0.08] backdrop-blur-[14px] flex items-center justify-around px-1.5">
        {items.map(({ a, etiqueta, icono: I, fin, insignia }) => (
          <NavLink key={a} to={a} end={fin}
            className={({ isActive }) => cx('h-[54px] min-w-[54px] px-3 rounded-[27px] flex items-center gap-[7px] no-underline relative',
              isActive ? 'bg-verde text-tinta' : 'bg-transparent text-tenue')}>
            {({ isActive }) => (<>
              <I size={21} weight={isActive ? 'fill' : 'bold'} />
              {isActive && <span className="text-[13px] font-extrabold">{etiqueta}</span>}
              {!!insignia && !isActive && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-verde" />}
            </>)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
