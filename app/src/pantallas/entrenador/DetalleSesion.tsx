import { CheckCircle, PencilSimple, Ruler, Timer, XCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ahoraIso, ETIQUETA_ASISTENCIA, fechaLarga, hora12, resumirAsistencia, type Asistencia, type ResultadoPrueba, type Sesion } from '@pa/shared';
import { actualizar, useColeccion, useDocumento } from '../../lib/datos';
import { COLOR_ASISTENCIA } from '../../lib/estilos';
import { mensajeError } from '../../lib/errores';
import { alfa, Aviso, Boton, Campo, Cargando, Fila, Hoja, Kicker, Tarjeta, Volver, useToast } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { alertaSalud, nombreNino, useEntrenador } from './contexto';

export function DetalleSesion() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { catPorId, activos, porId, pruebaPorId } = useEntrenador();
  const { datos: s, cargando } = useDocumento<Sesion>(`sesiones/${id}`);
  const asis = useColeccion<Asistencia>('asistencias', [['sesionId', '==', id]]);
  const res = useColeccion<ResultadoPrueba>('resultadosPruebas', [['sesionId', '==', id]]);
  const [cancelar, setCancelar] = useState(false);
  const [motivo, setMotivo] = useState('');

  if (cargando) return <Cargando />;
  if (!s) return <Pantalla><Volver a="/e/sesiones">Sesiones</Volver><Aviso tono="error">La sesión no existe.</Aviso></Pantalla>;
  const cat = catPorId.get(s.categoriaId);
  const kids = activos.filter((n) => n.categoriaId === s.categoriaId);
  const control = s.tipo === 'control';
  const resumen = resumirAsistencia(asis.datos.map((a) => a.estado));
  const conAlerta = kids.filter((n) => alertaSalud(n));

  async function confirmarCancelacion() {
    try {
      await actualizar('sesiones', s!.id, { estado: 'cancelada', motivoCancelacion: motivo.trim() || 'Cancelada', actualizadoEn: ahoraIso() });
      toast('Sesión cancelada. Se avisó a los acudientes.');
      setCancelar(false);
    } catch (e) { toast(mensajeError(e), 'error'); }
  }
  async function reactivar() {
    await actualizar('sesiones', s!.id, { estado: 'programada', motivoCancelacion: undefined, actualizadoEn: ahoraIso() });
    toast('Sesión reactivada');
  }

  return (
    <Pantalla>
      <Volver a="/e/sesiones">Sesiones</Volver>
      <div className="flex flex-col gap-1.5">
        <span className="kicker" style={{ color: control ? '#4F7BFF' : undefined }}>{control ? 'Día de control' : 'Entrenamiento'}{s.estado === 'cancelada' ? ' · cancelada' : ''}</span>
        <div className="titulo text-[30px]">{cat?.nombre}</div>
        <div className="text-sm text-suave">{fechaLarga(s.fecha, true)} · {hora12(s.horaInicio)} – {hora12(s.horaFin)}</div>
      </div>
      <Tarjeta>
        <Fila k="Lugar" v={s.lugar} />
        {s.tema && <Fila k="Tema" v={s.tema} />}
        <Fila k="Niños" v={kids.length} />
        {s.notasGenerales && <Fila k="Notas" v={s.notasGenerales} />}
        {s.motivoCancelacion && s.estado === 'cancelada' && <Fila k="Motivo" v={s.motivoCancelacion} />}
      </Tarjeta>

      {s.estado !== 'cancelada' && (
        <div className="flex flex-col gap-2">
          <Boton alto="lg" icono={<CheckCircle weight="bold" size={20} />} onClick={() => nav(`/e/sesion/${s.id}/asistencia`)}>{s.asistenciaGuardada ? 'Ver o editar asistencia' : 'Tomar asistencia'}</Boton>
          {control && <Boton alto="lg" variante="claro" icono={<Timer weight="bold" size={20} />} onClick={() => nav(`/e/sesion/${s.id}/captura`)}>{s.resultadosGuardados ? 'Ver o editar resultados' : 'Registrar pruebas'}</Boton>}
          <Boton variante="secundario" icono={<Ruler weight="bold" />} onClick={() => nav(`/e/sesion/${s.id}/mediciones`)}>Mediciones físicas (talla y peso)</Boton>
        </div>
      )}

      {conAlerta.length > 0 && (
        <Aviso tono="alerta">
          <b>Alertas de salud</b>
          {conAlerta.map((n) => <div key={n.id}>{nombreNino(n)}: {alertaSalud(n)}</div>)}
        </Aviso>
      )}

      {asis.datos.length > 0 && (
        <Tarjeta className="gap-2.5">
          <Kicker>Asistencia · {asis.datos.length} registrados</Kicker>
          <div className="grid grid-cols-4 gap-2">
            {resumen.indicadores.map((i) => <div key={i.estado} className="flex flex-col"><span className="text-xl font-extrabold" style={{ color: COLOR_ASISTENCIA[i.estado] }}>{i.cantidad}</span><span className="text-[11px] text-tenue">{i.etiqueta}</span></div>)}
          </div>
          {asis.datos.filter((a) => a.estado !== 'asistio').map((a) => {
            const n = porId.get(a.ninoId);
            return <div key={a.id} className="flex justify-between text-[13px]"><span>{n ? nombreNino(n) : a.ninoId}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: alfa(COLOR_ASISTENCIA[a.estado], 0.15), color: COLOR_ASISTENCIA[a.estado] }}>{ETIQUETA_ASISTENCIA[a.estado]}</span></div>;
          })}
        </Tarjeta>
      )}

      {control && (
        <Tarjeta className="gap-2">
          <Kicker>Pruebas · {res.datos.length} resultados</Kicker>
          {s.pruebasSeleccionadas.map((pid) => {
            const n = res.datos.filter((r) => r.pruebaId === pid && !r.noRealizada).length;
            return <Fila key={pid} k={pruebaPorId.get(pid)?.nombre ?? pid} v={`${n}/${kids.length}`} />;
          })}
        </Tarjeta>
      )}

      <div className="flex gap-2">
        <Boton variante="secundario" className="flex-1" icono={<PencilSimple weight="bold" />} onClick={() => nav(`/e/sesion/${s.id}/editar`)}>Editar</Boton>
        {s.estado === 'cancelada'
          ? <Boton variante="secundario" className="flex-1" onClick={reactivar}>Reactivar</Boton>
          : <Boton variante="secundario" className="flex-1 !text-rojo" icono={<XCircle weight="bold" />} onClick={() => setCancelar(true)}>Cancelar sesión</Boton>}
      </div>

      <Hoja abierta={cancelar} onCerrar={() => setCancelar(false)} titulo="Cancelar sesión" sub="Se avisará a los acudientes de la categoría.">
        <Campo value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (ej. lluvia)" />
        <Boton variante="peligro" onClick={confirmarCancelacion}>Cancelar sesión y avisar</Boton>
      </Hoja>
    </Pantalla>
  );
}
