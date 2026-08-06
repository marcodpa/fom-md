/**
 * Informe estadístico en el FORMATO DE LA PREDEFINIDA (D2/D3), modelado sobre
 * los informes reales Samfor→Chevron ("INFORME ESTADISTICO SIRCOP", junio 2026:
 * Oficina / Termoeléctrica / Desmalezado) y mejorado con lo que la app ya sabe:
 *
 *  - El semáforo (verde/amarillo/rojo) se aplica EN VIVO sobre cada indicador,
 *    no como texto explicativo aparte.
 *  - El "% de registro de conductores" (que en los informes reales daba 0.00%)
 *    sale de la titularidad + identificación por PIN del sistema (§3.5): cada
 *    kilómetro tiene un responsable, y el "SIN IDENTIFICAR" desaparece a medida
 *    que se asignan principales.
 *  - Se genera por empresa o POR ÁREA/CONTRATO, igual que los informes reales.
 *
 * TODO API: GET /empresas/:companyId/reporte-formato?area=... (y exportación a
 * PDF/correo desde el backend, que es como hoy viaja el informe).
 */

import type {
  FormatoPredefFilaAlertas,
  FormatoPredefFilaConductor,
  FormatoPredefFilaUnidad,
  FormatoPredefIndicador,
  FormatoPredefReporte,
  ScoreRange,
} from '@/types';

import { getAreas } from './asignacionService';
import { getCompanyBrandById } from './brandService';
import { getEmpresasAsignadasA, getReporte, periodoMesActual } from './companyService';
import { fakeNetwork } from './network';
import { getNombreConductor } from './userService';

/** Semáforo del score de conducción (eventos por 100 km; óptimo < 1.5). */
function rangoScore(score: number): ScoreRange {
  if (score < 1.5) return 'verde';
  if (score < 3.5) return 'amarillo';
  return 'rojo';
}

/** Semáforo del % de identificación de conductores (óptimo >= 85%). */
function rangoIdentificacion(pct: number): ScoreRange {
  if (pct >= 85) return 'verde';
  if (pct >= 50) return 'amarillo';
  return 'rojo';
}

/** Interpretación textual, calcada del tono del informe real. */
function interpretacionScore(rango: ScoreRange): string {
  if (rango === 'verde')
    return 'La organización cumple las políticas de manejo establecidas dentro de los niveles óptimos.';
  if (rango === 'amarillo')
    return 'La organización cumple en líneas generales las políticas de manejo, quedando espacio de mejora para alcanzar los niveles óptimos.';
  return 'Los índices están por debajo de los parámetros aceptables. Se sugiere reforzar las políticas de manejo y revisar en detalle los casos a mejorar.';
}

function interpretacionIdentificacion(rango: ScoreRange): string {
  if (rango === 'verde')
    return 'Los conductores se identifican correctamente: los datos por chofer reflejan la realidad.';
  if (rango === 'amarillo')
    return 'Identificación parcial: asigna el conductor principal (o su PIN) en las unidades restantes.';
  return 'Identificación insuficiente. Asigna conductores principales y PIN de secundarios para que cada kilómetro tenga responsable.';
}

/**
 * Genera el informe en formato de la predefinida para una empresa, opcionalmente
 * limitado a un ÁREA/contrato (así viajan los informes reales).
 */
export async function getReporteFormatoPredefinida(
  companyId: string,
  areaId?: string | null,
): Promise<FormatoPredefReporte> {
  const periodo = periodoMesActual();
  const [reporte, areas, brand] = await Promise.all([
    getReporte({ companyId, tipo: 'general', periodo }),
    getAreas(companyId),
    getCompanyBrandById(companyId),
  ]);

  // Predefinida cuyo formato se usa (ej. Chevron). Derivada de la asignación.
  const asignadasAChevron = await getEmpresasAsignadasA(['chevron']);
  const usaChevron = asignadasAChevron.some((c) => c.id === companyId);
  const predefinidaNombre = usaChevron ? 'Chevron' : 'Predefinida';

  const area = areaId ? (areas.find((a) => a.id === areaId) ?? null) : null;
  const filas = area
    ? reporte.porVehiculo.filter((r) => r.vehicle.areaId === area.id)
    : reporte.porVehiculo;

  // ── DISTANCIAS RECORRIDAS (actual + acumulado 6 meses, mock determinista). ──
  const distancias: FormatoPredefFilaUnidad[] = filas
    .map((r) => ({
      unidadLabel: r.vehicle.alias ?? r.vehicle.numero,
      placa: r.vehicle.placa,
      recorridoActual: r.km,
      recorridoU6m: Math.round(r.km * 5.6),
    }))
    .sort((a, b) => a.recorridoActual - b.recorridoActual);

  // ── Cuadro de resumen por conductor (identificado = tiene principal). ──
  const conductores: FormatoPredefFilaConductor[] = [];
  let kmSinIdentificar = 0;
  let eventosSinIdentificar = 0;
  for (const r of filas) {
    const eventos = r.excesosVelocidad + r.frenadasBruscas + r.aceleracionesBruscas;
    const principal = r.vehicle.conductorPrincipalId
      ? getNombreConductor(r.vehicle.conductorPrincipalId)
      : undefined;
    if (!principal) {
      kmSinIdentificar += r.km;
      eventosSinIdentificar += eventos;
      continue;
    }
    conductores.push({
      conductor: principal,
      identificado: true,
      km: r.km,
      horas: Math.round(r.km / 38),
      aceleraciones: r.aceleracionesBruscas,
      frenadas: r.frenadasBruscas,
      excesos: r.excesosVelocidad,
      velocidadMax: Math.min(78 + r.excesosVelocidad * 3, 124),
      score: r.km > 0 ? Math.round((eventos / (r.km / 100)) * 100) / 100 : 0,
    });
  }
  if (kmSinIdentificar > 0) {
    conductores.push({
      conductor: 'Sin identificar',
      identificado: false,
      km: kmSinIdentificar,
      horas: Math.round(kmSinIdentificar / 38),
      aceleraciones: eventosSinIdentificar, // agregado, como en el informe real
      frenadas: 0,
      excesos: 0,
      velocidadMax: 0,
      score:
        kmSinIdentificar > 0
          ? Math.round((eventosSinIdentificar / (kmSinIdentificar / 100)) * 100) / 100
          : 0,
    });
  }
  conductores.sort((a, b) => b.km - a.km);

  // ── Indicadores generales con semáforo. ──
  const kmTotal = filas.reduce((a, r) => a + r.km, 0);
  const eventosTotal = filas.reduce(
    (a, r) => a + r.excesosVelocidad + r.frenadasBruscas + r.aceleracionesBruscas,
    0,
  );
  const scoreGeneral = kmTotal > 0 ? Math.round((eventosTotal / (kmTotal / 100)) * 100) / 100 : 0;
  const identificadas = filas.filter((r) => r.vehicle.conductorPrincipalId).length;
  const pctIdentificacion = filas.length > 0 ? Math.round((identificadas / filas.length) * 1000) / 10 : 0;
  const rScore = rangoScore(scoreGeneral);
  const rIdent = rangoIdentificacion(pctIdentificacion);
  const indicadores: FormatoPredefIndicador[] = [
    {
      nombre: 'Score general de conducción',
      valor: scoreGeneral.toFixed(2),
      optimo: '< 1.5',
      rango: rScore,
      interpretacion: interpretacionScore(rScore),
    },
    {
      nombre: '% de registro de conductores',
      valor: `${pctIdentificacion.toFixed(1)}%`,
      optimo: '≥ 85%',
      rango: rIdent,
      interpretacion: interpretacionIdentificacion(rIdent),
    },
  ];

  // ── Alertas por vehículo por cada 100 km. ──
  const alertasPorVehiculo: FormatoPredefFilaAlertas[] = filas
    .map((r) => {
      const eventos = r.excesosVelocidad + r.frenadasBruscas + r.aceleracionesBruscas;
      const alertas100km = r.km > 0 ? Math.round((eventos / (r.km / 100)) * 100) / 100 : 0;
      return {
        unidadLabel: r.vehicle.alias ?? r.vehicle.numero,
        alertas100km,
        rango: rangoScore(alertas100km),
      };
    })
    .sort((a, b) => b.alertas100km - a.alertas100km);

  return fakeNetwork({
    companyId,
    companyNombre: brand?.name ?? companyId,
    predefinidaNombre,
    areaNombre: area?.nombre ?? null,
    periodo: periodo.label,
    indicadores,
    distancias,
    conductores,
    alertasPorVehiculo,
  });
}
