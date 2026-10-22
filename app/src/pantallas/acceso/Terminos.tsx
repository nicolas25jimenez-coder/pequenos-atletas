import { Aviso, Volver } from '../../ui/base';
import { Pantalla } from '../../ui/marco';

// ⚠️ Plantilla PENDIENTE DE REVISIÓN POR UN ABOGADO (SPEC Q3). No es un texto legal definitivo.
export function Terminos() {
  return (
    <Pantalla conNav={false}>
      <Volver>Volver</Volver>
      <div className="titulo text-[26px]">Términos y política de datos</div>
      <Aviso tono="alerta">Borrador para revisión de un abogado. Versión 2026-10.</Aviso>
      <div className="flex flex-col gap-4 text-sm text-suave leading-relaxed pretty">
        <section className="flex flex-col gap-1.5">
          <h2 className="kicker">1. Responsable del tratamiento</h2>
          <p>Pequeños Atletas, escuela de formación deportiva dirigida por Nicolás Jiménez (Colombia). Contacto: contacto@pequenosatletas.co.</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h2 className="kicker">2. Datos que tratamos</h2>
          <p>Datos del acudiente (nombre, documento, correo, teléfono) y del niño o niña: identificación, fecha de nacimiento, talla de uniforme, contactos de emergencia, seguro médico, información de salud (alergias, condiciones, medicamentos), medidas físicas, resultados de pruebas motrices, asistencia, pagos y, si se autoriza, fotos y videos de las actividades.</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h2 className="kicker">3. Datos sensibles y de menores</h2>
          <p>Los datos de salud y los datos de niños y niñas son sensibles (Ley 1581 de 2012 y Decreto 1377 de 2013). Se tratan únicamente con la autorización previa, expresa e informada del representante legal, respetando el interés superior del menor. Ningún otro acudiente puede ver la información de su hijo.</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h2 className="kicker">4. Finalidades</h2>
          <p>Gestionar la inscripción, la seguridad durante los entrenamientos, el seguimiento del desarrollo motriz, la asistencia, el cobro de mensualidades y la comunicación con la familia.</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h2 className="kicker">5. Uso de imagen</h2>
          <p>La autorización de uso de imagen es independiente y opcional. Sin ella no se cargan fotos ni videos del niño en la app.</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h2 className="kicker">6. Derechos del titular</h2>
          <p>Puedes conocer, actualizar, rectificar y solicitar la supresión de los datos, así como revocar la autorización, escribiendo al correo de contacto o desde la opción “Mi cuenta” de la app.</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h2 className="kicker">7. Conservación</h2>
          <p>Cuando un niño se retira, su perfil se inactiva y se conserva el historial en modo de solo lectura para la familia, salvo que se solicite la supresión.</p>
        </section>
      </div>
    </Pantalla>
  );
}
