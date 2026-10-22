// Gestión de pagos (RF-E32 a RF-E35, RF-E33b).
import { CaretLeft, CaretRight, CreditCard, WhatsappLogo } from '@phosphor-icons/react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ahoraIso, cop, enlaceWhatsApp, ETIQUETA_PAGO, estadoEn, fechaCorta, hoy, nombreMes, sumarMeses, diferenciaDias,
  type EstadoPago, type MedioPago, type Pago,
} from '@pa/shared';
import { useColeccion } from '../../lib/datos';
import { db } from '../../lib/firebase';
import { COLOR_PAGO } from '../../lib/estilos';
import { mensajeError } from '../../lib/errores';
import { alfa, Boton, Campo, Chips, Encabezado, Etiqueta, Hoja, Segmentado, Selector, Tarjeta, Vacio, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { nombreNino, useEntrenador } from './contexto';

type Filtro = 'todos' | 'porCobrar' | EstadoPago;

export function PagosEntrenador() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { porId, categorias } = useEntrenador();
  const [mes, setMes] = useState(params.get('mes') ?? hoy().slice(0, 7));
  const [filtro, setFiltro] = useState<Filtro>((params.get('estado') as Filtro) ?? 'todos');
  const [cat, setCat] = useState('todas');
  const [sel, setSel] = useState<Pago | null>(null);
  const soloVencidos = filtro === 'vencido' && !params.get('mes');
  const pagos = useColeccion<Pago>('pagos', soloVencidos ? [['estado', 'in', ['pendiente', 'vencido']]] : [['periodo', '==', mes]]);

  const lista = useMemo(() => pagos.datos.map((p) => ({ ...p, estado: estadoEn(p, hoy()) }))
    .filter((p) => (soloVencidos ? p.estado === 'vencido' : true))
    .filter((p) => cat === 'todas' || p.categoriaId === cat)
    .sort((a, b) => a.fechaInicioCiclo.localeCompare(b.fechaInicioCiclo)), [pagos.datos, cat, soloVencidos]);
  const visibles = lista.filter((p) => filtro === 'todos' || (filtro === 'porCobrar' ? p.estado === 'pendiente' || p.estado === 'vencido' : p.estado === filtro));

  useEffect(() => {
    const n = params.get('nino');
    if (n && !sel) { const p = lista.find((x) => x.ninoId === n); if (p) setSel(p); }
  }, [lista]); // eslint-disable-line react-hooks/exhaustive-deps

  const cobrables = lista.filter((p) => p.estado !== 'congelado' && p.estado !== 'exonerado');
  const esperado = cobrables.reduce((a, p) => a + p.valorAPagar, 0);
  const recaudado = lista.filter((p) => p.estado === 'pagado').reduce((a, p) => a + p.valorAPagar, 0);

  return (
    <Pantalla>
      <Encabezado titulo="Pagos" derecha={<Boton alto="sm" variante="secundario" icono={<CreditCard weight="bold" />} onClick={() => nav('/e/medios-pago')}>Medios</Boton>} />
      {!soloVencidos && (
        <div className="flex items-center justify-between">
          <button onClick={() => setMes(sumarMeses(mes, -1))} className="w-10 h-10 rounded-full bg-sup border border-white/10 text-texto cursor-pointer flex items-center justify-center"><CaretLeft weight="bold" /></button>
          <span className="font-bold text-lg">{nombreMes(mes, true)}</span>
          <button onClick={() => setMes(sumarMeses(mes, 1))} className="w-10 h-10 rounded-full bg-sup border border-white/10 text-texto cursor-pointer flex items-center justify-center"><CaretRight weight="bold" /></button>
        </div>
      )}
      {soloVencidos && <Segmentado valor="v" onCambio={() => { setFiltro('todos'); nav('/e/pagos', { replace: true }); }} opciones={[{ id: 'v', etiqueta: 'Todos los vencidos' }, { id: 'm', etiqueta: 'Ver por mes' }]} />}
      <div className="grid grid-cols-3 gap-2">
        <Tarjeta className="p-3.5 gap-1 rounded-[20px]"><span className="kicker">Esperado</span><span className="text-base font-extrabold">{cop(esperado)}</span></Tarjeta>
        <Tarjeta className="p-3.5 gap-1 rounded-[20px]"><span className="kicker">Recaudado</span><span className="text-base font-extrabold text-verde">{cop(recaudado)}</span></Tarjeta>
        <Tarjeta className="p-3.5 gap-1 rounded-[20px]"><span className="kicker">Por cobrar</span><span className="text-base font-extrabold text-ambar">{cop(esperado - recaudado)}</span></Tarjeta>
      </div>
      <Chips<Filtro> valor={filtro} onCambio={setFiltro} opciones={[
        { id: 'todos', etiqueta: `Todos (${lista.length})` }, { id: 'porCobrar', etiqueta: 'Por cobrar' }, { id: 'vencido', etiqueta: 'Vencidos' },
        { id: 'pagado', etiqueta: 'Pagados' }, { id: 'congelado', etiqueta: 'Congelados' }, { id: 'exonerado', etiqueta: 'Exonerados' },
      ]} />
      <Selector value={cat} onChange={(e) => setCat(e.target.value)}><option value="todas">Todas las categorías</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Selector>
      {!pagos.cargando && !visibles.length && <Vacio titulo="No hay cobros con ese filtro" />}
      <div className="flex flex-col gap-2">
        {visibles.map((p) => {
          const n = porId.get(p.ninoId);
          const c = COLOR_PAGO[p.estado];
          const atraso = p.estado === 'vencido' ? diferenciaDias(p.fechaVencimiento, hoy()) : 0;
          return (
            <button key={p.id} onClick={() => setSel(p)} className="flex items-center gap-3 rounded-[20px] px-4 py-3 bg-sup border border-white/[0.07] text-texto text-left cursor-pointer hover:bg-suph">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{n ? nombreNino(n) : p.ninoId}{soloVencidos ? ` · ${nombreMes(p.periodo)}` : ''}</div>
                <div className="text-xs text-tenue">{p.estado === 'pagado' ? `Pagado ${fechaCorta(p.fechaPago)} · ${p.medioPago ?? ''}` : p.estado === 'vencido' ? `Vencido hace ${atraso} ${atraso === 1 ? 'día' : 'días'}` : p.estado === 'pendiente' ? `Vence ${fechaCorta(p.fechaVencimiento)}` : p.motivoEstado ?? ''}</div>
              </div>
              <span className="text-sm font-bold">{cop(p.valorAPagar)}</span>
              <span className="w-[84px] text-center py-1 rounded-full text-[11px] font-bold" style={{ background: alfa(c, 0.15), color: c }}>{ETIQUETA_PAGO[p.estado]}</span>
            </button>
          );
        })}
      </div>
      <HojaPago pago={sel} onCerrar={() => setSel(null)} />
    </Pantalla>
  );
}

type Accion = 'pagar' | 'exonerar' | 'congelar' | 'ajustar' | null;

function HojaPago({ pago, onCerrar }: { pago: Pago | null; onCerrar: () => void }) {
  const toast = useToast();
  const { porId } = useEntrenador();
  const medios = useColeccion<MedioPago>('mediosPago');
  const [accion, setAccion] = useState<Accion>(null);
  const [f, setF] = useState({ fecha: hoy(), medio: '', referencia: '', nota: '', motivo: '', valor: '' });
  useEffect(() => { setAccion(null); setF({ fecha: hoy(), medio: '', referencia: '', nota: '', motivo: '', valor: pago ? String(pago.valorAPagar) : '' }); }, [pago]);
  if (!pago) return null;
  const n = porId.get(pago.ninoId);
  const ref = doc(db, 'pagos', pago.id);
  const abierto = pago.estado === 'pendiente' || pago.estado === 'vencido';

  async function ejecutar(cambios: Record<string, unknown>, msj: string) {
    try { await updateDoc(ref, { ...cambios, actualizadoEn: ahoraIso() }); toast(msj); onCerrar(); }
    catch (e) { toast(mensajeError(e), 'error'); }
  }
  async function recordar() {
    if (!n) return;
    try {
      await Promise.all(pago!.acudientesIds.map((u) => addDoc(collection(db, 'notificaciones'), {
        usuarioId: u, tipo: 'pago_vencido', titulo: `Recordatorio de pago · ${n.nombres}`,
        cuerpo: `Tienes pendiente el pago de ${nombreMes(pago!.periodo).toLowerCase()} por ${cop(pago!.valorAPagar)}. Si ya pagaste, avísale al entrenador.`,
        enlace: `/p/pagos?nino=${n.id}`, leida: false, fecha: ahoraIso(),
      })));
      toast('Recordatorio enviado a la app de los acudientes');
    } catch (e) { toast(mensajeError(e), 'error'); }
  }
  const tel = n?.contactos[0]?.telefono.replace(/\D/g, '') ?? '';

  return (
    <Hoja abierta onCerrar={onCerrar} titulo={n ? nombreNino(n) : 'Pago'} sub={`${nombreMes(pago.periodo, true)} · ${cop(pago.valorAPagar)} · ${ETIQUETA_PAGO[pago.estado]}`}>
      <div className="text-[13px] text-suave leading-normal">
        Ciclo {fechaCorta(pago.fechaInicioCiclo)} → vence {fechaCorta(pago.fechaVencimiento)}<br />
        Base {cop(pago.valorBase)}{pago.descuento ? ` − ${cop(pago.descuento)} (${pago.descuentoMotivo})` : ''}
        {pago.ajusteManual && <><br />Ajuste: {cop(pago.ajusteManual.valorAnterior)} → {cop(pago.ajusteManual.valorNuevo)} ({pago.ajusteManual.motivo})</>}
        {pago.notas && <><br />Nota: {pago.notas}</>}
      </div>
      {!accion && (<>
        {abierto && <Boton onClick={() => setAccion('pagar')}>Marcar como pagado</Boton>}
        {abierto && <div className="grid grid-cols-3 gap-2">
          <Boton variante="secundario" className="text-[13px] px-2" onClick={() => setAccion('ajustar')}>Ajustar</Boton>
          <Boton variante="secundario" className="text-[13px] px-2" onClick={() => setAccion('congelar')}>Congelar</Boton>
          <Boton variante="secundario" className="text-[13px] px-2" onClick={() => setAccion('exonerar')}>Exonerar</Boton>
        </div>}
        {abierto && <div className="grid grid-cols-2 gap-2">
          <Boton variante="secundario" className="text-[13px]" onClick={recordar}>Recordar en la app</Boton>
          <a href={tel ? enlaceWhatsApp(tel.startsWith('57') ? tel : `57${tel}`, `Hola, te recuerdo el pago de ${nombreMes(pago.periodo).toLowerCase()} de ${n?.nombres} por ${cop(pago.valorAPagar)}. ¡Gracias!`) : undefined} target="_blank" rel="noreferrer"
            className="h-12 rounded-full border border-white/[0.14] text-texto text-[13px] font-semibold flex items-center justify-center gap-1.5 no-underline"><WhatsappLogo weight="bold" />WhatsApp</a>
        </div>}
        {!abierto && <Boton variante="secundario" onClick={() => ejecutar({ estado: 'pendiente', fechaPago: null, medioPago: null, referencia: null, motivoEstado: null }, 'Pago devuelto a pendiente')}>Deshacer ({ETIQUETA_PAGO[pago.estado].toLowerCase()} → pendiente)</Boton>}
      </>)}
      {accion === 'pagar' && (<>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Fecha de pago"><Campo type="date" value={f.fecha} max={hoy()} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Etiqueta>
          <Etiqueta texto="Medio"><Selector value={f.medio} onChange={(e) => setF({ ...f, medio: e.target.value })}><option value="">Seleccionar</option>{medios.datos.map((m) => <option key={m.id} value={m.nombre.split(' ')[0]}>{m.nombre}</option>)}</Selector></Etiqueta>
          <Etiqueta texto="Referencia (opcional)" className="col-span-2"><Campo value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} /></Etiqueta>
          <Etiqueta texto="Nota (opcional)" className="col-span-2"><Campo value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} /></Etiqueta>
        </div>
        <Boton disabled={!f.medio} onClick={() => ejecutar({ estado: 'pagado', fechaPago: f.fecha, medioPago: f.medio, referencia: f.referencia, ...(f.nota ? { notas: f.nota } : {}) }, 'Pago registrado. Se avisó a la familia.')}>Confirmar pago</Boton>
      </>)}
      {(accion === 'exonerar' || accion === 'congelar') && (<>
        <Campo value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder={accion === 'congelar' ? 'Motivo (ej. vacaciones, incapacidad)' : 'Motivo (ej. beca, cortesía)'} />
        <div className="text-xs text-tenue">{accion === 'congelar' ? 'No se cobra este mes ni se envían recordatorios.' : 'Este mes queda sin cobro.'}</div>
        <Boton disabled={!f.motivo.trim()} onClick={() => ejecutar({ estado: accion === 'congelar' ? 'congelado' : 'exonerado', motivoEstado: f.motivo.trim() }, accion === 'congelar' ? 'Mes congelado' : 'Mes exonerado')}>{accion === 'congelar' ? 'Congelar' : 'Exonerar'}</Boton>
      </>)}
      {accion === 'ajustar' && (<>
        <div className="grid grid-cols-2 gap-2.5">
          <Etiqueta texto="Nuevo valor"><Campo inputMode="numeric" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value.replace(/\D/g, '') })} /></Etiqueta>
          <Etiqueta texto="Motivo"><Campo value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Ej. prorrateo" /></Etiqueta>
        </div>
        <Boton disabled={!f.valor || !f.motivo.trim()} onClick={() => ejecutar({ valorAPagar: Number(f.valor), ajusteManual: { valorAnterior: pago.ajusteManual?.valorAnterior ?? pago.valorAPagar, valorNuevo: Number(f.valor), motivo: f.motivo.trim(), fecha: hoy() } }, 'Valor ajustado')}>Guardar ajuste</Boton>
      </>)}
      {accion && <Boton variante="fantasma" className="self-center text-tenue" onClick={() => setAccion(null)}>Volver</Boton>}
    </Hoja>
  );
}
