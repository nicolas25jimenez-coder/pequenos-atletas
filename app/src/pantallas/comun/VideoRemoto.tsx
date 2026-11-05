// Reproductor de un video privado (URL firmada) de una sesión remota.
import { useEffect, useState } from 'react';
import { urlArchivo } from '../../lib/archivos';

export function VideoRemoto({ ruta }: { ruta: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    setUrl(null); setError(false);
    urlArchivo(ruta).then((u) => vivo && setUrl(u)).catch(() => vivo && setError(true));
    return () => { vivo = false; };
  }, [ruta]);
  if (error) return <div className="text-xs text-rojo">No se pudo cargar el video.</div>;
  if (!url) return <div className="h-40 rounded-2xl bg-white/[0.04] animate-pulse" aria-label="Cargando video" />;
  return <video src={url} controls playsInline preload="metadata" className="w-full max-h-[360px] rounded-2xl bg-black" />;
}
