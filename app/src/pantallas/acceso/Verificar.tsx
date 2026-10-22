import { EnvelopeOpen } from '@phosphor-icons/react';
import { useState } from 'react';
import { reenviarVerificacion, useSesion } from '../../lib/sesion';
import { mensajeError } from '../../lib/errores';
import { Boton, useToast } from '../../ui/base';
import { Logo, Pantalla } from '../../ui/marco';

export function Verificar() {
  const { usuario, salir, refrescar } = useSesion();
  const toast = useToast();
  const [revisando, setRevisando] = useState(false);

  async function yaVerifique() {
    setRevisando(true);
    try {
      await refrescar(); // si el correo ya está verificado, la app entra sola
      toast('Aún no vemos la verificación. Abre el enlace del correo.', 'error');
    } catch (e) { toast(mensajeError(e), 'error'); }
    setRevisando(false);
  }

  async function reenviar() {
    try { await reenviarVerificacion(usuario?.email ?? ''); toast('Te enviamos un nuevo correo de verificación.'); }
    catch (e) { toast(mensajeError(e), 'error'); }
  }

  return (
    <Pantalla conNav={false} className="pt-16 gap-6">
      <Logo tam={18} />
      <div className="w-16 h-16 rounded-3xl bg-verde/10 text-verde flex items-center justify-center"><EnvelopeOpen size={32} weight="bold" /></div>
      <div className="titulo text-[30px]">Verifica tu<br /><span className="text-verde">correo.</span></div>
      <p className="text-[15px] text-suave leading-normal pretty">
        Te enviamos un enlace a <b className="text-texto">{usuario?.email}</b>. Ábrelo para activar tu cuenta y luego vuelve aquí.
      </p>
      <div className="flex flex-col gap-2.5">
        <Boton alto="lg" onClick={yaVerifique} cargando={revisando}>Ya verifiqué mi correo</Boton>
        <Boton variante="secundario" onClick={reenviar}>Reenviar correo</Boton>
        <Boton variante="fantasma" className="self-center mt-2 text-tenue" onClick={salir}>Cerrar sesión</Boton>
      </div>
    </Pantalla>
  );
}
