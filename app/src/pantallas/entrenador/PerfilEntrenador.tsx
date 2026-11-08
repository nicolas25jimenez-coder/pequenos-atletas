// Perfil profesional del entrenador: lo edita él y lo ven los padres (Más → Conoce a tu entrenador).
import { Camera } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { ahoraIso, iniciales } from '@pa/shared';
import { guardar, useDocumento } from '../../lib/datos';
import { subirArchivo } from '../../lib/archivos';
import { mensajeError } from '../../lib/errores';
import { useSesion } from '../../lib/sesion';
import { AreaTexto, Aviso, Avatar, Boton, Campo, COLOR, Etiqueta, Kicker, Tarjeta, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useFoto } from '../comun/useFoto';

export interface PerfilProfesional {
  id: string;
  nombre?: string;
  titulo?: string; // ej. "Entrenador de iniciación deportiva"
  ciudad?: string;
  sobreMi?: string;
  estudios?: string;
  experiencia?: string;
  habilidades?: string;
  fotoRuta?: string;
  actualizadoEn?: string;
}

export const RUTA_PERFIL = 'configuracion/perfilEntrenador';

/** Perfil que ven los padres. */
export function VistaPerfil({ perfil, nombre }: { perfil: PerfilProfesional | null; nombre: string }) {
  const foto = useFoto(perfil?.fotoRuta);
  const bloques: [string, string | undefined][] = [['Sobre mí', perfil?.sobreMi], ['Estudios', perfil?.estudios], ['Experiencia laboral', perfil?.experiencia], ['Habilidades blandas', perfil?.habilidades]];
  const hay = bloques.some(([, t]) => t?.trim());
  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar ini={iniciales(nombre, '')} tam={84} fondo={COLOR.verde} color={COLOR.tinta} redondo foto={foto} />
        <div className="flex flex-col gap-1 min-w-0">
          <div className="titulo text-[24px]">{nombre}</div>
          <div className="text-[13px] text-suave">{perfil?.titulo || 'Entrenador'}</div>
          {perfil?.ciudad && <div className="text-xs text-tenue">{perfil.ciudad}</div>}
        </div>
      </div>
      {!hay && <Aviso>El entrenador aún no ha completado su perfil.</Aviso>}
      {bloques.filter(([, t]) => t?.trim()).map(([t, texto]) => (
        <Tarjeta key={t} className="gap-2"><Kicker>{t}</Kicker><div className="text-sm text-suave whitespace-pre-line">{texto}</div></Tarjeta>
      ))}
    </>
  );
}

export function PerfilEntrenador() {
  const toast = useToast();
  const { perfil: cuenta } = useSesion();
  const doc = useDocumento<PerfilProfesional>(RUTA_PERFIL);
  const [f, setF] = useState<PerfilProfesional>({ id: 'perfilEntrenador' });
  const [listo, setListo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const entrada = useRef<HTMLInputElement>(null);
  const foto = useFoto(f.fotoRuta);

  useEffect(() => {
    if (!doc.cargando && !listo) { setF({ ...(doc.datos ?? {}), id: 'perfilEntrenador' }); setListo(true); }
  }, [doc.cargando, doc.datos, listo]);

  const set = (k: keyof PerfilProfesional) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function guardarTodo(datos: PerfilProfesional) {
    await guardar('configuracion', { ...datos, id: 'perfilEntrenador', nombre: `${cuenta?.nombres ?? ''} ${cuenta?.apellidos ?? ''}`.trim(), actualizadoEn: ahoraIso() });
  }

  async function cambiarFoto(archivo?: File) {
    if (!archivo) return;
    setSubiendo(true); setError('');
    try {
      const ruta = await subirArchivo('publico/entrenador/foto.jpg', archivo);
      const nuevo = { ...f, fotoRuta: ruta };
      setF(nuevo);
      await guardarTodo(nuevo);
      toast('Foto actualizada');
    } catch (e) { setError(mensajeError(e)); }
    setSubiendo(false);
  }

  async function enviar() {
    setGuardando(true); setError('');
    try { await guardarTodo(f); toast('Perfil guardado. Los padres ya lo ven.'); }
    catch (e) { setError(mensajeError(e)); }
    setGuardando(false);
  }

  const nombre = `${cuenta?.nombres ?? ''} ${cuenta?.apellidos ?? ''}`.trim();
  return (
    <Pantalla>
      <Volver a="/e/mas">Más</Volver>
      <div className="titulo text-[28px]">Mi perfil</div>
      <div className="text-[13px] text-tenue">Los padres ven esta información en Más → Conoce a tu entrenador.</div>
      <div className="flex items-center gap-4">
        <Avatar ini={iniciales(cuenta?.nombres ?? '', cuenta?.apellidos)} tam={84} fondo={COLOR.verde} color={COLOR.tinta} foto={foto} />
        <div className="flex flex-col gap-2">
          <div className="text-[17px] font-bold">{nombre}</div>
          <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={(e) => { cambiarFoto(e.target.files?.[0]); e.target.value = ''; }} />
          <Boton alto="sm" variante="secundario" icono={<Camera weight="bold" />} cargando={subiendo} onClick={() => entrada.current?.click()}>{f.fotoRuta ? 'Cambiar foto' : 'Subir foto'}</Boton>
        </div>
      </div>
      <Tarjeta className="gap-3">
        <Kicker>Información básica</Kicker>
        <Etiqueta texto="Cargo o título"><Campo value={f.titulo ?? ''} onChange={set('titulo')} placeholder="Ej. Entrenador de iniciación deportiva" /></Etiqueta>
        <Etiqueta texto="Ciudad"><Campo value={f.ciudad ?? ''} onChange={set('ciudad')} placeholder="Ej. Bogotá" /></Etiqueta>
        <Etiqueta texto="Sobre mí"><AreaTexto rows={3} value={f.sobreMi ?? ''} onChange={set('sobreMi')} placeholder="Cuéntales a los papás quién eres y cómo trabajas con los niños." /></Etiqueta>
      </Tarjeta>
      <Tarjeta className="gap-3">
        <Kicker>Perfil profesional</Kicker>
        <Etiqueta texto="Estudios"><AreaTexto rows={3} value={f.estudios ?? ''} onChange={set('estudios')} placeholder="Una línea por estudio. Ej. Profesional en Ciencias del Deporte, 2026" /></Etiqueta>
        <Etiqueta texto="Experiencia laboral"><AreaTexto rows={3} value={f.experiencia ?? ''} onChange={set('experiencia')} placeholder="Una línea por experiencia." /></Etiqueta>
        <Etiqueta texto="Habilidades blandas"><AreaTexto rows={3} value={f.habilidades ?? ''} onChange={set('habilidades')} placeholder="Ej. Paciencia, comunicación con las familias, liderazgo" /></Etiqueta>
      </Tarjeta>
      {error && <Aviso tono="error">{error}</Aviso>}
      <Boton alto="lg" onClick={enviar} cargando={guardando} disabled={!listo}>Guardar perfil</Boton>
    </Pantalla>
  );
}
