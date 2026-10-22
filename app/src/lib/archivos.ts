import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

const cache = new Map<string, string>();

export async function urlArchivo(ruta: string): Promise<string> {
  if (cache.has(ruta)) return cache.get(ruta)!;
  const url = await getDownloadURL(ref(storage, ruta));
  cache.set(ruta, url);
  return url;
}

/** Reduce imágenes a máx. 1600 px y ~1 MB (RNF-12). Otros archivos se suben tal cual. */
export async function comprimir(archivo: File, maxLado = 1600, calidad = 0.82): Promise<Blob> {
  if (!archivo.type.startsWith('image/') || archivo.type === 'image/gif') return archivo;
  const bmp = await createImageBitmap(archivo);
  const k = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob((b) => ok(b ?? archivo), 'image/jpeg', calidad));
}

export async function subirArchivo(ruta: string, archivo: File, maxMb = 5): Promise<string> {
  const datos = await comprimir(archivo);
  if (datos.size > maxMb * 1024 * 1024) throw new Error(`El archivo supera ${maxMb} MB.`);
  const tipo = datos instanceof File ? datos.type : 'image/jpeg';
  await uploadBytes(ref(storage, ruta), datos, { contentType: tipo });
  return ruta;
}

export function extension(archivo: File): string {
  if (archivo.type.startsWith('image/')) return archivo.type === 'image/gif' ? 'gif' : 'jpg';
  return archivo.name.split('.').pop()?.toLowerCase() ?? 'bin';
}
