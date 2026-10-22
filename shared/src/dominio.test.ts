import { describe, expect, it } from 'vitest';
import {
  avisoPrevio, CATALOGO_BASE, clasificarImc, comparar, construirPago, edadMeses, edadMesesExacta, edadTexto,
  estadoEn, evaluarImc, fechaCobro, lms, periodoVigente, perfilMultidisciplinar, recordatorioDelDia,
  resumirAsistencia, tendencia, valorFinal, zScoreImc,
} from './index';

describe('fechas', () => {
  it('calcula la edad en años y meses', () => {
    expect(edadTexto('2021-08-14', '2026-10-22')).toBe('5 años 2 meses');
    expect(edadMeses('2022-03-02', '2026-10-22')).toBe(55);
  });
});

describe('IMC OMS (SPEC §7.4)', () => {
  it('usa los valores LMS publicados por la OMS', () => {
    // anthro (2006), niños, 1826 días (60 meses): L -0.6889 M 15.1917 S 0.08699
    const [L, M, S] = lms('M', 60)!;
    expect(L).toBeCloseTo(-0.6889, 4);
    expect(M).toBeCloseTo(15.1917, 4);
    expect(S).toBeCloseTo(0.08699, 5);
    // anthroplus (2007), niñas, 61 meses: L -0.8886 M 15.2441 S 0.09692
    expect(lms('F', 61)).toEqual([-0.8886, 15.2441, 0.09692]);
  });

  it('CA-06: niña de 5 años 2 meses, 110 cm, 19 kg → IMC 15,7 con OMS 2007', () => {
    const edad = edadMesesExacta('2021-08-14', '2026-10-22');
    expect(edad).toBeGreaterThan(60);
    const r = evaluarImc(19, 110, 'F', edad);
    expect(r.imc).toBe(15.7);
    expect(r.zScore).not.toBeNull();
    expect(r.clasificacion!.tecnica).toBe('Adecuado');
    expect(r.percentil!).toBeGreaterThan(15);
    expect(r.percentil!).toBeLessThan(85);
  });

  it('z-score en la mediana es 0 y el ajuste de ±3 DE es continuo', () => {
    const [, M] = lms('M', 48)!;
    expect(zScoreImc(M, 'M', 48)).toBeCloseTo(0, 2);
    expect(zScoreImc(30, 'M', 48)!).toBeGreaterThan(3);
  });

  it('clasifica distinto antes y después de los 5 años', () => {
    expect(clasificarImc(1.5, 48).tecnica).toBe('Riesgo de sobrepeso');
    expect(clasificarImc(1.5, 66).tecnica).toBe('Sobrepeso');
    expect(clasificarImc(2.5, 66).tecnica).toBe('Obesidad');
    expect(clasificarImc(0, 66).amable).toBe('Dentro del rango esperado para su edad');
  });

  it('fuera del rango de la tabla no clasifica', () => {
    expect(evaluarImc(10, 80, 'M', 12).clasificacion).toBeNull();
  });
});

describe('pagos (SPEC §7.2)', () => {
  it('CA-02: inscrito el 31 de enero cobra el último día de febrero', () => {
    expect(fechaCobro(31, '2026-02')).toBe('2026-02-28');
    expect(fechaCobro(31, '2028-02')).toBe('2028-02-29');
    expect(fechaCobro(31, '2026-04')).toBe('2026-04-30');
  });

  it('determina el periodo vigente', () => {
    expect(periodoVigente(12, '2026-10-22')).toBe('2026-10');
    expect(periodoVigente(25, '2026-10-22')).toBe('2026-09');
  });

  it('construye el pago con descuento y vencimiento', () => {
    const p = construirPago({ ninoId: 'n1', acudientesIds: ['u1'], categoriaId: 'c1', diaCobro: 18, valorMensual: 130000,
      descuento: { tipo: 'porcentaje', valor: 10, motivo: 'Descuento hermanos' } }, '2026-10', { diasGracia: 5 });
    expect(p.valorAPagar).toBe(117000);
    expect(p.fechaInicioCiclo).toBe('2026-10-18');
    expect(p.fechaVencimiento).toBe('2026-10-23');
    expect(estadoEn(p, '2026-10-23')).toBe('pendiente');
    expect(estadoEn(p, '2026-10-24')).toBe('vencido');
  });

  it('ignora descuentos vencidos', () => {
    const p = construirPago({ ninoId: 'n', acudientesIds: [], categoriaId: 'c', diaCobro: 1, valorMensual: 100000,
      descuento: { tipo: 'valor', valor: 20000, motivo: 'Beca', vigenteHasta: '2026-01-31' } }, '2026-03', { diasGracia: 5 });
    expect(p.valorAPagar).toBe(100000);
  });

  it('programa los recordatorios', () => {
    const p = { estado: 'pendiente' as const, fechaInicioCiclo: '2026-10-18', fechaVencimiento: '2026-10-23' };
    const cfg = { recordarVencidosCadaDias: 3 };
    expect(recordatorioDelDia(p, '2026-10-18', cfg)).toBe('pago_mes');
    expect(recordatorioDelDia(p, '2026-10-20', cfg)).toBeNull();
    expect(recordatorioDelDia(p, '2026-10-24', cfg)).toBe('pago_vencido');
    expect(recordatorioDelDia(p, '2026-10-27', cfg)).toBe('pago_vencido');
    expect(recordatorioDelDia({ ...p, estado: 'pagado' }, '2026-10-18', cfg)).toBeNull();
    expect(avisoPrevio(18, '2026-11-15', 3)).toBe('2026-11');
    expect(avisoPrevio(31, '2026-02-25', 3)).toBe('2026-02');
  });
});

describe('asistencia (SPEC §7.5)', () => {
  it('cuatro indicadores independientes que suman 100 %', () => {
    const r = resumirAsistencia(['asistio', 'asistio', 'retardo', 'excusa', 'falto', 'asistio']);
    expect(r.total).toBe(6);
    const suma = r.indicadores.reduce((a, i) => a + i.porcentaje, 0);
    expect(Math.round(suma * 10) / 10).toBe(100);
    expect(r.indicadores.find((i) => i.estado === 'asistio')!.cantidad).toBe(3);
  });

  it('sin sesiones da 0 en todos', () => {
    expect(resumirAsistencia([]).indicadores.every((i) => i.porcentaje === 0)).toBe(true);
  });
});

describe('pruebas (SPEC §7.6)', () => {
  const vel = CATALOGO_BASE.find((p) => p.id === 'vel10')!;
  const salto = CATALOGO_BASE.find((p) => p.id === 'salto')!;

  it('el catálogo tiene las 17 pruebas en 4 familias', () => {
    expect(CATALOGO_BASE).toHaveLength(17);
    expect(new Set(CATALOGO_BASE.map((p) => p.familia)).size).toBe(4);
  });

  it('compara según mejorEs', () => {
    expect(comparar(vel, 2.6, 5, 'F')).toBe('por_encima');
    expect(comparar(vel, 3.0, 5, 'F')).toBe('esperado');
    expect(comparar(vel, 3.8, 5, 'F')).toBe('por_debajo');
    expect(comparar(salto, 110, 5, 'M')).toBe('por_encima');
    expect(comparar(salto, 110, 8, 'M')).toBeNull();
  });

  it('elige el mejor intento y calcula la tendencia', () => {
    expect(valorFinal(vel, [3.2, 2.96])).toBe(2.96);
    expect(valorFinal(salto, [81, 92])).toBe(92);
    expect(tendencia(vel, 3.18, 2.96)).toEqual({ direccion: 'mejor', diferencia: 0.22 });
    expect(tendencia(salto, 92, 81).direccion).toBe('peor');
  });

  it('arma el perfil multidisciplinar', () => {
    const mapa = new Map(CATALOGO_BASE.map((p) => [p.id, p]));
    const perfil = perfilMultidisciplinar([
      { pruebaId: 'salto', fecha: '2026-09-08', valorFinal: 92, noRealizada: null },
      { pruebaId: 'equi', fecha: '2026-09-08', valorFinal: 14, noRealizada: null },
    ], mapa, 5, 'F');
    expect(perfil.locomocion).toBeGreaterThan(50);
    expect(perfil.equilibrio).toBeGreaterThan(70);
    expect(perfil.manipulacion_pies).toBeNull();
  });
});
