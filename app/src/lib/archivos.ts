// Archivos en Supabase Storage. Las rutas son del estilo 'ninos/{ninoId}/foto.jpg':
// el primer tramo es el bucket (ninos, resultados, publico) y el resto es el nombre del objeto.
import { supabase, traducirError } from './supabase';

const VIDA_URL_S = 3600; // las URLs firmadas duran 1 hora
const cache = new Map<string, { url: string; vence: number }>();
const pendientes = new Map<string, Promise<string>>();

function partir(ruta: string): { bucket: string; objeto: string } {
  const i = ruta.indexOf('/');
  if (i <= 0 || i === ruta.length - 1) throw new Error('Ruta de archivo no válida.');
  return { bucket: ruta.slice(0, i), objeto: ruta.slice(i + 1) };
}

/** URL firmada (temporal) para ver un archivo. Se guarda en memoria y se renueva antes de vencer. */
export async function urlArchivo(ruta: string): Promise<string> {
  const c = cache.get(ruta);
  if (c && c.vence > Date.now()) return c.url;
  const en = pendientes.get(ruta);
  if (en) return en;
  const p = (async () => {
    const { bucket, objeto } = partir(ruta);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objeto, VIDA_URL_S);
    if (error) throw traducirError(error);
    cache.set(ruta, { url: data.signedUrl, vence: Date.now() + (VIDA_URL_S - 300) * 1000 });
    return data.signedUrl;
  })().finally(() => pendientes.delete(ruta));
  pendientes.set(ruta, p);
  return p;
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

/** Sube (o reemplaza) un archivo en la ruta indicada. Las imágenes se comprimen antes. Devuelve la ruta. */
export async function subirArchivo(ruta: string, archivo: File, maxMb = 5): Promise<string> {
  const datos = await comprimir(archivo);
  if (datos.size > maxMb * 1024 * 1024) throw new Error(`El archivo supera ${maxMb} MB.`);
  const tipo = datos instanceof File ? datos.type : 'image/jpeg';
  const { bucket, objeto } = partir(ruta);
  const { error } = await supabase.storage.from(bucket).upload(objeto, datos, { contentType: tipo || undefined, upsert: true });
  if (error) throw traducirError(error);
  cache.delete(ruta);
  return ruta;
}

/** Borra un archivo. */
export async function borrarArchivo(ruta: string): Promise<void> {
  const { bucket, objeto } = partir(ruta);
  const { error } = await supabase.storage.from(bucket).remove([objeto]);
  if (error) throw traducirError(error);
  cache.delete(ruta);
}

export function extension(archivo: File): string {
  if (archivo.type.startsWith('image/')) return archivo.type === 'image/gif' ? 'gif' : 'jpg';
  return archivo.name.split('.').pop()?.toLowerCase() ?? 'bin';
}
