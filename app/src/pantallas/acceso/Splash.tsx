import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Splash({ auto = false }: { auto?: boolean }) {
  const nav = useNavigate();
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => nav('/ingresar'), 2200);
    return () => clearTimeout(t);
  }, [auto, nav]);

  return (
    <div onClick={() => auto && nav('/ingresar')}
      className="min-h-dvh flex flex-col items-center justify-center gap-8 px-7 pb-16 cursor-pointer text-center"
      style={{ background: 'radial-gradient(100% 55% at 50% 38%,rgba(31,79,216,0.35),rgba(10,13,18,0) 65%)' }}>
      <img src="/logo.png" alt="Pequeños Atletas" width={220} height={220} className="w-[220px] h-[220px] drop-shadow-[0_16px_40px_rgba(31,79,216,0.5)]" />
      <div className="titulo flex flex-col text-[21px] leading-tight whitespace-nowrap">
        <div>Juega, Aprende y</div><div className="text-verde">Diviértete</div>
      </div>
      <div className="flex flex-col items-center gap-3 text-[13px] text-tenue">
        <span>Formación multidisciplinar · 4–6 años</span>
        <span className="flex gap-[5px]"><span className="w-[22px] h-1 rounded-sm bg-verde" /><span className="w-2 h-1 rounded-sm bg-[#2A3142]" /></span>
      </div>
    </div>
  );
}
