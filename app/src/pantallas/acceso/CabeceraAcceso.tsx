import type { ReactNode } from 'react';
import { Logo } from '../../ui/marco';

/** Cabecera con la franja diagonal y espacio para la foto de la cancha (login/registro). */
export function CabeceraAcceso({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="relative h-[300px] shrink-0 rayado" style={{ clipPath: 'polygon(0 0,100% 0,100% 78%,0 100%)' }}>
        <div className="absolute left-6 bottom-24 font-mono text-[11px] text-apagado tracking-wide">foto: niños entrenando en la cancha</div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(10,13,18,0) 40%,rgba(10,13,18,0.9))' }} />
        <div className="absolute top-[62px] left-6"><Logo tam={18} /></div>
      </div>
      <div className="px-6 pb-10 -mt-[34px] relative flex flex-col gap-[18px]">{children}</div>
    </div>
  );
}
