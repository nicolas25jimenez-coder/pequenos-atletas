// Solicitudes de cambio de los acudientes (RF-E13), retiro (RF-P34) y habeas data (RF-P35).
import { ArrowRight } from '@phosphor-icons/react';
import { useState } from 'react';
import { ahoraIso, fechaCorta, hoy, type SolicitudCambio } from '@pa/shared';
import { actualizar, lote, useColeccion } from '../../lib/datos';
import { mensajeError } from '../../lib/errores';
import { Aviso, Boton, Campo, Hoja, Segmentado, Tarjeta, Titulo, Vacio, Volver, useToast, Kicker } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { nombreNino, useEntrenador } from './contexto';
import { asignarRuta } from './acciones';

export function Solicitudes() {
  const [vista, setVista] = useState<'pendiente' | 'resueltas'>('pendiente');
  const { datos } = useColeccion<SolicitudCambio>('solicitudesCambio');
  const { porId } = useEntrenador();
  const [sel, setSel] = useState<SolicitudCambio | null>(null);
  const lista = datos.filter((s) => (vista === 'pendiente' ? s.estado === 'pendiente' : s.estado !== 'pendiente'))
    .sort((a, b) => (b.creadoEn ?? '').localeCompare(a.creadoEn ?? ''));
  return (
    <Pantalla>
      <Volver a="/e">Hoy</Volver>
      <Titulo>Solicitudes</Titulo>
      <Segmentado valor={vista} onCambio={setVista} opciones={[{ id: 'pendiente', etiqueta: `Pendientes (${datos.filter((s) => s.estado === 'pendiente').length})` }, { id: 'resueltas', etiqueta: 'Resueltas' }]} />
      {!lista.length && <Vacio titulo={vista === 'pendiente' ? 'No hay solicitudes pendientes' : 'Sin solicitudes resueltas'} />}
      {lista.map((s) => {
        const n = porId.get(s.ninoId);
        const especial = s.campo.startsWith('__');
        return (
          <Tarjeta key={s.id} onClick={s.estado === 'pendiente' ? () => setSel(s) : undefined} className="gap-2">
            <div className="flex justify-between items-center"><Kicker>{s.seccion} · {n ? nombreNino(n) : ''}</Kicker><span className="text-[11px] text-tenue">{fechaCorta(s.creadoEn?.slice(0, 10))}</span></div>
            <div className="text-sm font-bold">{s.etiqueta}</div>
            {especial ? <div className="text-[13px] text-suave">{s.valorPropuesto}</div> : (
              <div className="flex items-center gap-2 text-[13px] flex-wrap"><span className="text-tenue line-through">{s.valorActual || '—'}</span><ArrowRight className="text-tenue" /><span className="text-verde font-semibold">{s.valorPropuesto}</span></div>
            )}
            <div className="text-xs text-tenue">Por {s.solicitadoPorNombre}{s.estado !== 'pendiente' ? ` · ${s.estado === 'aprobado' ? 'Aprobada' : 'Rechazada'}${s.comentarioEntrenador ? ` · ${s.comentarioEntrenador}` : ''}` : ''}</div>
          </Tarjeta>
        );
      })}
      <Resolver s={sel} onCerrar={() => setSel(null)} />
    </Pantalla>
  );
}

function Resolver({ s, onCerrar }: { s: SolicitudCambio | null; onCerrar: () => void }) {
  const toast = useToast();
  const { porId } = useEntrenador();
  const [comentario, setComentario] = useState('');
  const [ocupado, setOcupado] = useState(false);
  if (!s) return null;
  const n = porId.get(s.ninoId);
  const esRetiro = s.campo === '__retiro', esSupresion = s.campo === '__supresion';

  async function resolver(aprobar: boolean) {
    if (!n || !s) return;
    setOcupado(true);
    try {
      const b = lote();
      const t = ahoraIso();
      if (aprobar && esRetiro) {
        b.actualizar('ninos', n.id, { estado: 'inactivo', motivoInactivacion: s.valorPropuesto || 'Retiro voluntario', fechaInactivacion: hoy(), actualizadoEn: t });
      } else if (aprobar && !esSupresion) {
        let valor: unknown = s.valorPropuesto;
        if (s.campo.endsWith('.autorizado')) valor = /^s[ií]/i.test(s.valorPropuesto.trim());
        const raiz = s.campo.split('.')[0];
        const actualizado = asignarRuta(n, s.campo, valor) as unknown as Record<string, unknown>;
        b.actualizar('ninos', n.id, { [raiz]: actualizado[raiz], actualizadoEn: t });
      }
      b.actualizar('solicitudesCambio', s!.id, { estado: aprobar ? 'aprobado' : 'rechazado', comentarioEntrenador: comentario.trim(), fechaResolucion: t, actualizadoEn: t });
      await b.confirmar();
      toast(aprobar ? (esSupresion ? 'Marcada como atendida. Recuerda eliminar los datos solicitados.' : 'Cambio aprobado y aplicado') : 'Solicitud rechazada');
      setComentario('');
      onCerrar();
    } catch (e) { toast(mensajeError(e), 'error'); }
    setOcupado(false);
  }

  return (
    <Hoja abierta={!!s} onCerrar={onCerrar} titulo={esRetiro ? 'Retiro' : esSupresion ? 'Habeas data' : 'Revisar cambio'} sub={`${s.etiqueta} · ${s.solicitadoPorNombre}`}>
      {!esRetiro && !esSupresion && (
        <div className="grid grid-cols-2 gap-2">
          <div className="px-3.5 py-3 rounded-2xl bg-sup2"><div className="kicker">Actual</div><div className="text-sm mt-1">{s.valorActual || '—'}</div></div>
          <div className="px-3.5 py-3 rounded-2xl bg-verde/10"><div className="kicker" style={{ color: '#3DDC6A' }}>Propuesto</div><div className="text-sm mt-1">{s.valorPropuesto}</div></div>
        </div>
      )}
      {esRetiro && <Aviso>Al aprobar, {n?.nombres} quedará inactivo (motivo: {s.valorPropuesto}). La familia conserva acceso de solo lectura.</Aviso>}
      {esSupresion && <Aviso tono="alerta">Solicitud de eliminación de datos: “{s.valorPropuesto}”. Revisa qué se debe borrar y respóndele a la familia. Tienes un plazo legal de 15 días hábiles.</Aviso>}
      <Campo value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentario para la familia (opcional)" />
      <div className="flex gap-2">
        <Boton variante="secundario" className="flex-1" onClick={() => resolver(false)} disabled={ocupado}>Rechazar</Boton>
        <Boton className="flex-1" onClick={() => resolver(true)} cargando={ocupado}>{esSupresion ? 'Marcar atendida' : 'Aprobar'}</Boton>
      </div>
    </Hoja>
  );
}

export async function marcarLeida(id: string) { await actualizar('notificaciones', id, { leida: true }); }
