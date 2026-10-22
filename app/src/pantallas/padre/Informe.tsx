import { FilePdf } from '@phosphor-icons/react';
import { useState } from 'react';
import { hoy, sumarDias } from '@pa/shared';
import { mensajeError } from '../../lib/errores';
import { Boton, Campo, Etiqueta, Tarjeta, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useFamilia } from './familia';

export function Informe() {
  const toast = useToast();
  const { nino, categorias, mediciones, resultados, asistencias, pruebas } = useFamilia();
  const [desde, setDesde] = useState(sumarDias(hoy(), -365));
  const [hasta, setHasta] = useState(hoy());
  const [generando, setGenerando] = useState(false);
  if (!nino) return null;

  async function generar() {
    setGenerando(true);
    try {
      const { generarInforme, descargarBlob } = await import('../../pdf/informe');
      const blob = await generarInforme({ nino: nino!, categoria: categorias.get(nino!.categoriaId ?? ''), mediciones, resultados, asistencias, pruebas, desde, hasta });
      descargarBlob(blob, `informe-${nino!.nombres.toLowerCase()}-${hoy()}.pdf`);
    } catch (e) { toast(mensajeError(e), 'error'); }
    setGenerando(false);
  }

  return (
    <Pantalla>
      <Volver a="/p/mas">Más</Volver>
      <div className="titulo text-[30px]">Informe de {nino.nombres}</div>
      <div className="text-sm text-suave leading-normal pretty">Un PDF con su perfil físico, los resultados de las pruebas comparados con la evaluación anterior y la asistencia del periodo.</div>
      <Tarjeta className="gap-3.5">
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Desde"><Campo type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} /></Etiqueta>
          <Etiqueta texto="Hasta"><Campo type="date" value={hasta} min={desde} max={hoy()} onChange={(e) => setHasta(e.target.value)} /></Etiqueta>
        </div>
        <Boton alto="lg" onClick={generar} cargando={generando} icono={<FilePdf weight="bold" size={20} />}>Descargar PDF</Boton>
      </Tarjeta>
    </Pantalla>
  );
}
