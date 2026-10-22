import { Component, type ReactNode } from 'react';

/** Muestra un mensaje amable si una pantalla falla, en vez de dejarla en blanco. */
export class LimiteError extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error(error); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-dvh flex items-center justify-center bg-fondo px-6">
        <div className="max-w-sm flex flex-col gap-4 text-center">
          <div className="titulo text-[26px]">Algo salió <span className="text-verde">mal.</span></div>
          <p className="text-sm text-suave">Ocurrió un error inesperado. Vuelve a cargar la app; si se repite, avísale al entrenador.</p>
          <button onClick={() => location.reload()} className="h-12 rounded-full bg-verde text-tinta font-extrabold border-0 cursor-pointer">Volver a cargar</button>
        </div>
      </div>
    );
  }
}
