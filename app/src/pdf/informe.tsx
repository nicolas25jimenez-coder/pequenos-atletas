// Informe PDF de progreso por niño (SPEC §8.6). Se genera en el navegador.
import { Document, Page, Path, Rect, StyleSheet, Svg, Text, View, Circle, pdf } from '@react-pdf/renderer';
import {
  edadAnios, edadMesesExacta, edadTexto, ETIQUETA_COMPARACION, FAMILIAS, fechaCorta, formatoValor, hoy, num,
  perfilMultidisciplinar, referenciaTabla, resumirAsistencia, tendencia, clasificarImc,
  type Asistencia, type Categoria, type MedicionFisica, type Nino, type Prueba, type ResultadoPrueba,
} from '@pa/shared';

export interface DatosInforme {
  nino: Nino;
  categoria?: Categoria;
  mediciones: MedicionFisica[];
  resultados: ResultadoPrueba[];
  asistencias: Asistencia[];
  pruebas: Map<string, Prueba>;
  desde: string;
  hasta: string;
  comentario?: string;
}

const C = { marca: '#1F4FD8', verde: '#1E8A39', verdeClaro: '#3DDC6A', texto: '#1B2333', tenue: '#6B7385', linea: '#E3E7EF', fondo: '#F6F8FC', ambar: '#B7791F', rojo: '#C53030' };

const s = StyleSheet.create({
  pagina: { padding: 36, fontSize: 10, color: C.texto, fontFamily: 'Helvetica' },
  cab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `3 solid ${C.marca}`, paddingBottom: 10, marginBottom: 16 },
  logo: { fontSize: 18, fontFamily: 'Helvetica-BoldOblique', color: C.marca, textTransform: 'uppercase' },
  punto: { color: C.verdeClaro },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.marca, textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  fila: { flexDirection: 'row', borderBottom: `1 solid ${C.linea}`, paddingVertical: 4 },
  celda: { flex: 1 },
  tenue: { color: C.tenue },
  bold: { fontFamily: 'Helvetica-Bold' },
  caja: { backgroundColor: C.fondo, borderRadius: 6, padding: 10, marginBottom: 6 },
  pie: { position: 'absolute', bottom: 20, left: 36, right: 36, fontSize: 8, color: C.tenue, textAlign: 'center' },
});

function Linea({ valores }: { valores: number[] }) {
  if (valores.length < 2) return null;
  const W = 240, H = 60;
  const lo = Math.min(...valores) - 0.5, hi = Math.max(...valores) + 0.5;
  const x = (i: number) => 10 + (i * (W - 20)) / (valores.length - 1);
  const y = (v: number) => H - 8 - ((v - lo) / (hi - lo)) * (H - 16);
  const d = 'M' + valores.map((v, i) => `${x(i)} ${y(v)}`).join(' L');
  return (
    <Svg width={W} height={H}>
      <Rect x={0} y={0} width={W} height={H} fill={C.fondo} rx={4} />
      <Path d={d} stroke={C.verde} strokeWidth={2} fill="none" />
      {valores.map((v, i) => <Circle key={i} cx={x(i)} cy={y(v)} r={3} fill={C.verde} />)}
    </Svg>
  );
}

function Informe({ d }: { d: DatosInforme }) {
  const { nino, categoria } = d;
  const med = d.mediciones.filter((m) => m.fecha >= d.desde && m.fecha <= d.hasta);
  const res = d.resultados.filter((r) => r.fecha >= d.desde && r.fecha <= d.hasta && !r.noRealizada && r.valorFinal !== null);
  const asis = d.asistencias.filter((a) => a.fecha >= d.desde && a.fecha <= d.hasta);
  const resumen = resumirAsistencia(asis.map((a) => a.estado));
  const ultima = med[med.length - 1];
  const em = ultima ? edadMesesExacta(nino.fechaNacimiento, ultima.fecha) : 0;
  const clasif = ultima?.zScoreImc != null ? clasificarImc(ultima.zScoreImc, em) : null;

  // Última evaluación vs. la anterior
  const fechas = [...new Set(res.map((r) => r.fecha))].sort();
  const fUlt = fechas[fechas.length - 1];
  const filas = res.filter((r) => r.fecha === fUlt).map((r) => {
    const p = d.pruebas.get(r.pruebaId)!;
    const prev = d.resultados.filter((x) => x.pruebaId === r.pruebaId && x.fecha < r.fecha && x.valorFinal !== null && !x.noRealizada).pop();
    const t = prev && p.tipoResultado !== 'cualitativa' ? tendencia(p, prev.valorFinal!, r.valorFinal!) : null;
    return { p, r, prev, t };
  }).filter((x) => x.p);
  const perfil = perfilMultidisciplinar(res, d.pruebas, edadAnios(nino.fechaNacimiento, fUlt ?? hoy()), nino.sexo);

  return (
    <Document title={`Informe ${nino.nombres} ${nino.apellidos}`} author="Pequeños Atletas">
      <Page size="A4" style={s.pagina}>
        <View style={s.cab}>
          <View><Text style={s.logo}>Pequeños Atletas<Text style={s.punto}> ●</Text></Text><Text style={s.tenue}>Informe de progreso</Text></View>
          <View style={{ alignItems: 'flex-end' }}><Text>{fechaCorta(hoy())}</Text><Text style={s.tenue}>Periodo: {fechaCorta(d.desde)} – {fechaCorta(d.hasta)}</Text></View>
        </View>

        <View style={[s.caja, { flexDirection: 'row', justifyContent: 'space-between' }]}>
          <View>
            <Text style={[s.bold, { fontSize: 16 }]}>{nino.nombres} {nino.apellidos}</Text>
            <Text style={s.tenue}>{edadTexto(nino.fechaNacimiento)} · Nacimiento {fechaCorta(nino.fechaNacimiento)} · {nino.tipoDocumento} {nino.numeroDocumento}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.bold}>Categoría {categoria?.nombre ?? '—'}</Text>
            <Text style={s.tenue}>Inscrito desde {fechaCorta(nino.fechaInscripcion)}</Text>
          </View>
        </View>

        <Text style={s.h2}>Perfil físico</Text>
        {ultima ? (
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text>Talla: <Text style={s.bold}>{num(ultima.tallaCm)} cm</Text>   Peso: <Text style={s.bold}>{num(ultima.pesoKg)} kg</Text>   IMC: <Text style={s.bold}>{num(ultima.imc)}</Text></Text>
              {clasif && <Text style={{ marginTop: 4 }}>{clasif.amable}{ultima.percentilImc != null ? ` (percentil ${Math.round(ultima.percentilImc)}, ${referenciaTabla(em, nino.sexo)})` : ''}.</Text>}
              <Text style={[s.tenue, { marginTop: 4, fontSize: 8 }]}>Orientativo: no reemplaza la valoración del pediatra.</Text>
            </View>
            <View><Text style={[s.tenue, { fontSize: 8, marginBottom: 2 }]}>Evolución del IMC</Text><Linea valores={med.map((m) => m.imc)} /></View>
          </View>
        ) : <Text style={s.tenue}>Sin mediciones en el periodo.</Text>}

        <Text style={s.h2}>Pruebas motrices {fUlt ? `· control del ${fechaCorta(fUlt)}` : ''}</Text>
        {filas.length ? (<>
          <View style={[s.fila, s.bold]}><Text style={{ flex: 2.4 }}>Prueba</Text><Text style={s.celda}>Anterior</Text><Text style={s.celda}>Actual</Text><Text style={s.celda}>Cambio</Text><Text style={s.celda}>Referencia</Text></View>
          {filas.map(({ p, r, prev, t }) => (
            <View key={p.id} style={s.fila} wrap={false}>
              <Text style={{ flex: 2.4 }}>{p.nombre}</Text>
              <Text style={s.celda}>{prev ? `${formatoValor(p, prev.valorFinal)} ${p.tipoResultado === 'cualitativa' ? '' : p.unidad}` : '—'}</Text>
              <Text style={[s.celda, s.bold]}>{formatoValor(p, r.valorFinal)} {p.tipoResultado === 'cualitativa' ? '' : p.unidad}</Text>
              <Text style={[s.celda, { color: t?.direccion === 'mejor' ? C.verde : t?.direccion === 'peor' ? C.ambar : C.tenue }]}>{t ? (t.direccion === 'igual' ? '=' : `${t.direccion === 'mejor' ? '+' : '−'} ${num(t.diferencia, 2)}`) : '—'}</Text>
              <Text style={s.celda}>{r.comparacionReferencia ? ETIQUETA_COMPARACION[r.comparacionReferencia] : '—'}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {FAMILIAS.map((f) => (
              <View key={f.id} style={[s.caja, { flex: 1, alignItems: 'center' }]}>
                <Text style={[s.bold, { fontSize: 14, color: C.verde }]}>{perfil[f.id] ?? '—'}</Text><Text style={[s.tenue, { fontSize: 8 }]}>{f.corto}</Text>
              </View>
            ))}
          </View>
          {filas.some((x) => x.r.observacion) && (<>
            <Text style={[s.bold, { marginTop: 6 }]}>Observaciones del entrenador</Text>
            {filas.filter((x) => x.r.observacion).map(({ p, r }) => <Text key={p.id} style={{ marginTop: 2 }}>• {p.nombre}: “{r.observacion}”</Text>)}
          </>)}
        </>) : <Text style={s.tenue}>Sin pruebas en el periodo.</Text>}

        <Text style={s.h2}>Asistencia · {resumen.total} sesiones</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {resumen.indicadores.map((i) => (
            <View key={i.estado} style={[s.caja, { flex: 1 }]}>
              <Text style={[s.bold, { fontSize: 14 }]}>{num(i.porcentaje)} %</Text>
              <Text style={s.tenue}>{i.etiqueta} · {i.cantidad}</Text>
            </View>
          ))}
        </View>

        {d.comentario?.trim() && (<>
          <Text style={s.h2}>Comentario del entrenador</Text>
          <View style={s.caja}><Text style={{ lineHeight: 1.4 }}>{d.comentario.trim()}</Text></View>
        </>)}

        <Text style={s.pie} fixed>Pequeños Atletas · formación multidisciplinar y predeportiva 4–6 años · Documento con datos de un menor: compártelo solo con quien sea necesario.</Text>
      </Page>
    </Document>
  );
}

export async function generarInforme(d: DatosInforme): Promise<Blob> {
  return pdf(<Informe d={d} />).toBlob();
}

export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
