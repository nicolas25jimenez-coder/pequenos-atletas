import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { firebaseConfig, usaEmuladores } from './config';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// La caché local permite consultar y registrar asistencia con mala señal en la cancha.
export const db = initializeFirestore(app, { localCache: persistentLocalCache(), ignoreUndefinedProperties: true });
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

if (usaEmuladores) {
  const host = location.hostname;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
  connectFunctionsEmulator(functions, host, 5001);
}
