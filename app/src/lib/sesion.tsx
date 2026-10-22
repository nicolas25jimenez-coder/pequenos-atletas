import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Usuario } from '@pa/shared';
import { auth, db } from './firebase';

interface Sesion {
  usuario: User | null;
  perfil: Usuario | null;
  cargando: boolean;
  salir: () => Promise<void>;
}

const Ctx = createContext<Sesion>({ usuario: null, perfil: null, cargando: true, salir: async () => {} });

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUsuario(u);
    if (!u) { setPerfil(null); setCargando(false); }
  }), []);

  useEffect(() => {
    if (!usuario) return;
    setCargando(true);
    return onSnapshot(doc(db, 'usuarios', usuario.uid), (s) => {
      setPerfil(s.exists() ? ({ id: s.id, ...s.data() } as Usuario) : null);
      setCargando(false);
    }, () => setCargando(false));
  }, [usuario]);

  return (
    <Ctx.Provider value={{ usuario, perfil, cargando, salir: () => signOut(auth) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSesion = () => useContext(Ctx);
