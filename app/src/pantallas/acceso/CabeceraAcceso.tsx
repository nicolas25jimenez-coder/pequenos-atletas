import type { ReactNode } from 'react';

/** Cabecera de ingreso/registro: franja diagonal con el logo de Pequeños Atletas. */
export function CabeceraAcceso({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="relative h-[300px] shrink-0" style={{ clipPath: 'polygon(0 0,100% 0,100% 78%,0 100%)', background: 'radial-gradient(70% 90% at 50% 38%,rgba(31,79,216,0.30),rgba(10,13,18,0) 70%)' }}>
        <img src="/logo.png" alt="Pequeños Atletas" width={170} height={170} className="absolute left-1/2 top-[48px] -translate-x-1/2 w-[170px] h-[170px] drop-shadow-[0_12px_30px_rgba(31,79,216,0.45)]" />
      </div>
      <div className="px-6 pb-10 -mt-[34px] relative flex flex-col gap-[18px]">{children}</div>
    </div>
  );
}
