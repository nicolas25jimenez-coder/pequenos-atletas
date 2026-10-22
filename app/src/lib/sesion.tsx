// Sesión del usuario (Supabase Auth) y su perfil en la tabla `usuarios`.
import type { User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ahoraIso, CONFIG_POR_DEFECTO, normalizarCorreo, type Parentesco, type Usuario } from '@pa/shared';
import { configurado } from './config';
import { guardar, obtener, useDocumento } from './datos';
import { fijarRecordar, supabase, traducirError } from './supabase';

/** Usuario de la sesión. Mantiene la forma que tenía con Firebase (uid, email, emailVerified). */
export interface UsuarioSesion {
  id: string;
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
  /** Datos guardados al registrarse (el perfil pendiente de crear, si aún no se pudo crear). */
  metadata: Record<string, unknown>;
}

interface Sesion {
  usuario: UsuarioSesion | null;
  perfil: Usuario | null;
  cargando: boolean;
  salir: () => Promise<void>;
  /** Vuelve a pedir el usuario al servidor (por ejemplo, tras verificar el correo). */
  refrescar: () => Promise<void>;
}

const Ctx = createContext<Sesion>({ usuario: null, perfil: null, cargando: true, salir: async () => {}, refrescar: async () => {} });

function aUsuario(u: User | null | undefined): UsuarioSesion | null {
  if (!u) return null;
  return { id: u.id, uid: u.id, email: u.email ?? undefined, emailVerified: !!u.email_confirmed_at, metadata: u.user_metadata ?? {} };
}
const mismo = (a: UsuarioSesion | null, b: UsuarioSesion | null) =>
  a === b || (!!a && !!b && a.id === b.id && a.email === b.email && a.emailVerified === b.emailVerified && JSON.stringify(a.metadata) === JSON.stringify(b.metadata));

// ---------------------------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------------------------

const creando = new Map<string, Promise<void>>();

/** Crea el perfil en `usuarios` si no existe, usando los datos guardados al registrarse. Evita duplicar la llamada. */
export function asegurarPerfil(u: UsuarioSesion): Promise<void> {
  const ya = creando.get(u.id);
  if (ya) return ya;
  const p = (async () => {
    if (await obtener('usuarios', u.id)) return;
    const meta = u.metadata.perfil as Omit<Usuario, 'id'> | undefined;
    if (!meta) return; // cuenta sin datos de registro (por ejemplo, creada a mano): no hay qué crear
    await guardar('usuarios', { ...meta, id: u.id, rol: 'padre', estado: 'activo', correo: normalizarCorreo(u.email ?? meta.correo), creadoPor: u.id });
  })().finally(() => creando.delete(u.id));
  creando.set(u.id, p);
  return p;
}

// ---------------------------------------------------------------------------------------------
// Proveedor
// ---------------------------------------------------------------------------------------------

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [authLista, setAuthLista] = useState(!configurado);
  const [creandoPerfil, setCreandoPerfil] = useState(false);

  useEffect(() => {
    if (!configurado) return;
    let vivo = true;
    const poner = (u: User | null | undefined) => { const n = aUsuario(u); setUsuario((p) => (mismo(p, n) ? p : n)); setAuthLista(true); };
    supabase.auth.getSession().then(({ data }) => { if (vivo) poner(data.session?.user); }).catch(() => { if (vivo) setAuthLista(true); });
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => { if (vivo) poner(sesion?.user); });
    return () => { vivo = false; data.subscription.unsubscribe(); };
  }, []);

  // Perfil en tiempo real
  const { datos: perfil, cargando: cargandoPerfil } = useDocumento<Usuario>(usuario ? `usuarios/${usuario.id}` : null);

  // Si hay sesión pero no hay perfil (la cuenta se confirmó por correo después de registrarse), se crea ahora.
  // Se intenta una sola vez por usuario para no repetir si el servidor lo rechaza.
  const intentado = useRef<string | null>(null);
  useEffect(() => {
    if (!usuario || cargandoPerfil || perfil || !usuario.metadata.perfil || intentado.current === usuario.id) return;
    intentado.current = usuario.id;
    setCreandoPerfil(true);
    asegurarPerfil(usuario)
      .catch((e) => console.error(e))
      .finally(() => setTimeout(() => setCreandoPerfil(false), 1500)); // da tiempo a que llegue el perfil nuevo
  }, [usuario, cargandoPerfil, perfil]);
  useEffect(() => { if (perfil) setCreandoPerfil(false); }, [perfil]);

  const salir = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const refrescar = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const n = aUsuario(data.user);
    setUsuario((p) => (mismo(p, n) ? p : n));
  }, []);

  const cargando = !authLista || (!!usuario && (cargandoPerfil || creandoPerfil));
  const valor = useMemo(() => ({ usuario, perfil, cargando, salir, refrescar }), [usuario, perfil, cargando, salir, refrescar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useSesion = () => useContext(Ctx);

// ---------------------------------------------------------------------------------------------
// Acciones de acceso (las usan las pantallas de Ingresar, Registro, Verificar, Recuperar y NuevaClave)
// ---------------------------------------------------------------------------------------------

/** Inicia sesión. `recordar` decide si la sesión sobrevive al cerrar el navegador. */
export async function ingresar(correo: string, clave: string, recordar: boolean): Promise<void> {
  fijarRecordar(recordar);
  const { error } = await supabase.auth.signInWithPassword({ email: normalizarCorreo(correo), password: clave });
  if (error) throw traducirError(error);
}

export interface DatosRegistro {
  correo: string;
  clave: string;
  nombres: string;
  apellidos: string;
  /** Ya normalizado, por ejemplo +573105550148. */
  telefono: string;
  parentesco: Parentesco;
  tipoDocumento: string;
  numeroDocumento: string;
}

/**
 * Crea la cuenta y el perfil de acudiente. Devuelve { conSesion: false } si Supabase exige confirmar el correo
 * antes de entrar (en ese caso el perfil se crea en el primer inicio de sesión, con los datos guardados aquí).
 */
export async function registrar(d: DatosRegistro): Promise<{ conSesion: boolean }> {
  const correo = normalizarCorreo(d.correo);
  const t = ahoraIso();
  const perfil: Omit<Usuario, 'id'> = {
    rol: 'padre', estado: 'activo',
    nombres: d.nombres.trim(), apellidos: d.apellidos.trim(), correo, telefono: d.telefono,
    parentesco: d.parentesco, tipoDocumento: d.tipoDocumento, numeroDocumento: d.numeroDocumento.trim(),
    aceptoTerminos: { fecha: t, version: CONFIG_POR_DEFECTO.versionTerminos },
    preferenciasNotificacion: { pagoRegistrado: true, inasistencia: true, resultados: true, eventos: true, solicitudes: true },
    creadoEn: t, actualizadoEn: t,
  };
  const { data, error } = await supabase.auth.signUp({
    email: correo, password: d.clave,
    options: { data: { perfil, nombre: `${perfil.nombres} ${perfil.apellidos}`.trim() }, emailRedirectTo: location.origin },
  });
  if (error) throw traducirError(error);
  // Con la confirmación de correo activa, un correo ya registrado no da error: devuelve un usuario sin identidades.
  if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error('Ya existe una cuenta con ese correo. Inicia sesión.');
  if (data.session && data.user) {
    try { await asegurarPerfil(aUsuario(data.user)!); }
    catch (e) { await supabase.auth.signOut(); throw traducirError(e); }
    return { conSesion: true };
  }
  return { conSesion: false };
}

/** Reenvía el correo de verificación al correo indicado. */
export async function reenviarVerificacion(correo: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: 'signup', email: correo, options: { emailRedirectTo: location.origin } });
  if (error) throw traducirError(error);
}

/** Envía el correo con el enlace para crear una nueva contraseña (lleva a /nueva-clave). */
export async function recuperarClave(correo: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(normalizarCorreo(correo), { redirectTo: `${location.origin}/nueva-clave` });
  if (error) throw traducirError(error);
}

/** Cambia la contraseña de la sesión actual (la que abre el enlace de recuperación). */
export async function actualizarClave(nueva: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) throw traducirError(error);
}
