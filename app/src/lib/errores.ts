const MENSAJES: Record<string, string> = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/user-not-found': 'No hay una cuenta con ese correo.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión.',
  'auth/weak-password': 'La contraseña debe tener al menos 8 caracteres.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  'permission-denied': 'No tienes permiso para hacer esto.',
  'unavailable': 'Sin conexión con el servidor. Inténtalo de nuevo.',
};

export function mensajeError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  return MENSAJES[code] ?? (e as Error)?.message ?? 'Ocurrió un error inesperado.';
}
