import { useEffect, useState } from 'react';
import { urlArchivo } from '../../lib/archivos';

/** URL de descarga de una foto en Storage (o null si no hay / falla). */
export function useFoto(ruta?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    setUrl(null);
    if (ruta) urlArchivo(ruta).then((u) => vivo && setUrl(u)).catch(() => {});
    return () => { vivo = false; };
  }, [ruta]);
  return url;
}
