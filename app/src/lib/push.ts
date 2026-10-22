// Registro del dispositivo para notificaciones push (FCM). Solo funciona con un
// proyecto real de Firebase y la clave VAPID configurada (ver README).
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app, db } from './firebase';
import { usaEmuladores, VAPID_KEY } from './config';

export const pushDisponible = () => !usaEmuladores && !!VAPID_KEY && 'Notification' in window;

export async function activarPush(uid: string): Promise<'ok' | 'denegado' | 'no-disponible'> {
  if (!pushDisponible() || !(await isSupported())) return 'no-disponible';
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return 'denegado';
  const reg = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (token) await updateDoc(doc(db, 'usuarios', uid), { fcmTokens: arrayUnion(token) });
  return 'ok';
}

/** Muestra un aviso cuando llega un push con la app abierta. */
export async function escucharPush(mostrar: (titulo: string, cuerpo: string) => void) {
  if (!pushDisponible() || !(await isSupported())) return;
  onMessage(getMessaging(app), (p) => mostrar(p.data?.titulo ?? 'Pequeños Atletas', p.data?.cuerpo ?? ''));
}
