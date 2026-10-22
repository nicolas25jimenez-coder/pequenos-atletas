import { Copy, WhatsappLogo } from '@phosphor-icons/react';
import {
  cop, diaCobroDe, diaMes, enlaceWhatsApp, estadoEn, fechaCobro, fechaCorta, hoy, nombreMes, sumarMeses, diferenciaDias,
  type MedioPago, type Pago,
} from '@pa/shared';
import { useColeccion, useConfiguracion } from '../../lib/datos';
import { COLOR_PAGO } from '../../lib/estilos';
import { alfa, Encabezado, Tarjeta, Vacio, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useFoto } from '../comun/useFoto';
import { SelectorMini, useFamilia } from './familia';
import { ESTADO_PAGO_PADRE, pagoActual } from './util';

export function Pagos() {
  const toast = useToast();
  const config = useConfiguracion();
  const { nino, categorias, pagos } = useFamilia();
  const medios = useColeccion<MedioPago>('mediosPago', [['activo', '==', true]]);
  if (!nino) return null;
  const cat = nino.categoriaId ? categorias.get(nino.categoriaId) : undefined;
  const actual = pagoActual(pagos);
  const historial = [...pagos].reverse().slice(actual ? 1 : 0).map((p) => ({ ...p, estado: estadoEn(p, hoy()) }));
  const lista = [...medios.datos].sort((a, b) => a.orden - b.orden);
  const qrs = lista.filter((m) => m.qrRuta);

  async function copiar(m: MedioPago) {
    try { await navigator.clipboard.writeText(m.numero.replace(/\s/g, '')); toast(`Número de ${m.nombre.split(' ')[0]} copiado`); }
    catch { toast(`Número: ${m.numero}`); }
  }

  return (
    <Pantalla>
      <Encabezado titulo="Pagos" derecha={<SelectorMini />} />
      {!actual ? <Vacio titulo="Aún no hay cobros" texto="El primer cobro se genera cuando el entrenador aprueba la inscripción." /> : (
        <Tarjeta className="rounded-4xl p-[22px] gap-3.5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[5px]" style={{ background: COLOR_PAGO[actual.estado] }} />
          <div className="flex justify-between items-center">
            <span className="kicker">{nino.nombres} · {nombreMes(actual.periodo)}</span>
            <EstadoPildora p={actual} />
          </div>
          <div className="text-[40px] font-[850] tracking-tight leading-none">{cop(actual.valorAPagar)}</div>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><span className="text-tenue">Mensualidad {cat?.nombre ?? ''}</span><span>{cop(actual.valorBase)}</span></div>
            {actual.descuento > 0 && <div className="flex justify-between"><span className="text-tenue">{actual.descuentoMotivo ?? 'Descuento'}</span><span className="text-verde">− {cop(actual.descuento)}</span></div>}
            {actual.ajusteManual && <div className="flex justify-between"><span className="text-tenue">Ajuste: {actual.ajusteManual.motivo}</span><span>{cop(actual.ajusteManual.valorNuevo)}</span></div>}
            <div className="flex justify-between"><span className="text-tenue">Ciclo / vencimiento</span><span>{diaMes(actual.fechaInicioCiclo)} → {diaMes(actual.fechaVencimiento)}</span></div>
          </div>
          <div className="text-[13px] text-suave px-3.5 py-3 rounded-[14px] bg-sup2 leading-snug">{nota(actual, diaCobroDe(nino))}</div>
        </Tarjeta>
      )}

      <div className="flex flex-col gap-2">
        <span className="kicker px-1">Medios de pago</span>
        {lista.map((m) => (
          <div key={m.id} className="flex items-center gap-3.5 rounded-[20px] px-4 py-3.5 bg-sup border border-white/[0.07]">
            <div className="w-11 h-11 rounded-[14px] shrink-0 flex items-center justify-center font-[850] text-[15px]" style={{ background: m.color }}>{m.iniciales}</div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-sm font-bold">{m.nombre}</span>
              <span className="text-sm tabular">{m.numero}</span>
              <span className="text-xs text-tenue">{m.titular}</span>
              {m.instrucciones && <span className="text-xs text-tenue">{m.instrucciones}</span>}
            </div>
            {m.copiable && (
              <button onClick={() => copiar(m)} className="h-[38px] px-3.5 rounded-full border border-white/[0.14] bg-transparent text-texto text-[13px] font-semibold cursor-pointer flex items-center gap-1.5 hover:bg-white/5">
                <Copy weight="bold" />Copiar
              </button>
            )}
          </div>
        ))}
        {qrs.map((m) => <QrMedio key={m.id} medio={m} />)}
      </div>

      {actual && (actual.estado === 'pendiente' || actual.estado === 'vencido') && (
        <a href={enlaceWhatsApp(config.telefonoWhatsApp, `Hola profe Nicolás, ya realicé el pago de ${nombreMes(actual.periodo).toLowerCase()} de ${nino.nombres} ${nino.apellidos.split(' ')[0]} por ${cop(actual.valorAPagar)}. `)}
          target="_blank" rel="noreferrer"
          className="h-[58px] rounded-full bg-verde text-tinta font-extrabold text-[15px] flex items-center justify-center gap-2 no-underline">
          <WhatsappLogo size={20} weight="bold" />Ya pagué, avisar al entrenador
        </a>
      )}

      {historial.length > 0 && (
        <Tarjeta className="gap-1">
          <span className="kicker pb-1.5">Historial</span>
          {historial.map((h) => (
            <div key={h.id} className="flex items-center gap-3 py-2.5 border-t border-white/[0.06]">
              <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-semibold">{nombreMes(h.periodo, true)}</span>
                <span className="text-xs text-tenue truncate">{meta(h)}</span>
              </div>
              <span className="text-sm font-bold">{h.estado === 'congelado' || h.estado === 'exonerado' ? '—' : cop(h.valorAPagar)}</span>
              <span className="w-[84px] text-center py-1 rounded-full text-[11px] font-bold" style={{ background: alfa(COLOR_PAGO[h.estado], 0.15), color: COLOR_PAGO[h.estado] }}>{ETIQUETA[h.estado]}</span>
            </div>
          ))}
        </Tarjeta>
      )}
    </Pantalla>
  );
}

const ETIQUETA: Record<Pago['estado'], string> = { pagado: 'Pagado', pendiente: 'Pendiente', vencido: 'Vencido', exonerado: 'Exonerado', congelado: 'Congelado' };

function meta(p: Pago) {
  if (p.estado === 'pagado') return `Pagado ${p.fechaPago ? diaMes(p.fechaPago) : ''}${p.medioPago ? ` · ${p.medioPago}` : ''}`;
  if (p.estado === 'congelado' || p.estado === 'exonerado') return p.motivoEstado ?? ETIQUETA[p.estado];
  return `Venció el ${fechaCorta(p.fechaVencimiento)}`;
}

function nota(p: Pago, diaCobro: number) {
  const proximo = fechaCorta(fechaCobro(diaCobro, sumarMeses(p.periodo, 1)));
  if (p.estado === 'pagado') return `Pagado el ${fechaCorta(p.fechaPago)}${p.medioPago ? ` por ${p.medioPago}` : ''}. Próximo cobro: ${proximo}.`;
  if (p.estado === 'congelado') return `Este mes está congelado${p.motivoEstado ? ` (${p.motivoEstado})` : ''}. Próximo cobro: ${proximo}.`;
  if (p.estado === 'exonerado') return `Este mes no tiene cobro${p.motivoEstado ? ` (${p.motivoEstado})` : ''}. Próximo cobro: ${proximo}.`;
  const d = diferenciaDias(hoy(), p.fechaVencimiento);
  if (d < 0) return `Venció el ${fechaCorta(p.fechaVencimiento)}. Paga por cualquiera de los medios de abajo y avísale al entrenador.`;
  const cuando = d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`;
  return `Vence ${cuando}, ${fechaCorta(p.fechaVencimiento)}. Paga por cualquiera de los medios de abajo y avísale al entrenador.`;
}

function EstadoPildora({ p }: { p: Pago }) {
  const c = COLOR_PAGO[p.estado];
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: alfa(c, 0.15), color: c }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />{ESTADO_PAGO_PADRE[p.estado]}
    </span>
  );
}

function QrMedio({ medio }: { medio: MedioPago }) {
  const url = useFoto(medio.qrRuta);
  return (
    <div className="flex gap-3.5 items-center rounded-[20px] px-4 py-3.5 bg-sup border border-white/[0.07]">
      {url ? <img src={url} alt={`QR ${medio.nombre}`} className="w-[84px] h-[84px] rounded-xl bg-white object-contain" /> : <div className="w-[84px] h-[84px] rounded-xl bg-sup2" />}
      <div className="text-[13px] text-suave leading-snug">Escanea el código QR de {medio.nombre} desde la app de tu banco. Escribe el nombre del niño en la referencia.</div>
    </div>
  );
}
