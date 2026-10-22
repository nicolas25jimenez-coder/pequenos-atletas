import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../ui/marco';

export function Splash({ auto = false }: { auto?: boolean }) {
  const nav = useNavigate();
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => nav('/ingresar'), 2200);
    return () => clearTimeout(t);
  }, [auto, nav]);

  return (
    <div onClick={() => auto && nav('/ingresar')}
      className="min-h-dvh flex flex-col justify-between px-7 pt-[120px] pb-16 cursor-pointer"
      style={{ background: 'radial-gradient(120% 60% at 80% 40%,rgba(31,79,216,0.35),rgba(10,13,18,0) 60%)' }}>
      <Logo tam={44} />
      <div className="titulo flex flex-col gap-0.5 text-[46px]">
        <div>Juega.</div><div>Progresa.</div><div className="text-verde">Crece.</div>
      </div>
      <div className="flex justify-between items-center text-[13px] text-tenue">
        <span>Formación multidisciplinar · 4–6 años</span>
        <span className="flex gap-[5px]"><span className="w-[22px] h-1 rounded-sm bg-verde" /><span className="w-2 h-1 rounded-sm bg-[#2A3142]" /></span>
      </div>
    </div>
  );
}
