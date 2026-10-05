/** Métricas derivadas de registros autorizados, sin convertir ausencias en ceros. */
export function numeroValido(valor) {
  return valor !== null && valor !== undefined && valor !== '' && Number.isFinite(Number(valor))
}

export function calcularReporte(d, dias, areaId = '', ahora = Date.now()) {
  const unidades = d.vehiculos
  const ids = new Set(unidades.map(v => v.id))
  const corte = ahora - dias * 86400000
  const odts = d.odts.filter(o => ids.has(o.vehiculoId) && new Date(o.creadaEn).getTime() >= corte && new Date(o.creadaEn).getTime() <= ahora)
  const cerradas = odts.filter(o => o.estado === 'cerrada')
  const conCosto = cerradas.filter(o => numeroValido(o.costo))
  const conConductor = unidades.filter(v => v.conductorPrincipalId).length
  const falla = new Map()
  const estados = new Map()
  odts.forEach(o => {
    falla.set(o.tipoFalla || 'otro', (falla.get(o.tipoFalla || 'otro') || 0) + 1)
    estados.set(o.estado || 'sin_dato', (estados.get(o.estado || 'sin_dato') || 0) + 1)
  })
  const enMarcha = unidades.filter(v => v.estadoMarcha === 'en_marcha').length
  const detenidas = unidades.filter(v => v.estadoMarcha === 'parada').length
  return {
    enMarcha, detenidas, sinDato: unidades.length - enMarcha - detenidas,
    kmTotal: unidades.length && unidades.every(v => numeroValido(v.km)) ? unidades.reduce((s, v) => s + Number(v.km), 0) : null,
    indice: unidades.length && unidades.every(v => numeroValido(v.indiceSeguro) && Number(v.indiceSeguro) >= 0 && Number(v.indiceSeguro) <= 100) ? Math.round(unidades.reduce((s, v) => s + Number(v.indiceSeguro), 0) / unidades.length) : null,
    odts, abiertas: odts.filter(o => o.estado === 'abierta').length,
    enRevision: odts.filter(o => o.estado === 'en_revision').length,
    cerradas: cerradas.length, conCosto: conCosto.length,
    costoOdts: conCosto.length ? conCosto.reduce((s, o) => s + Number(o.costo), 0) : null,
    fallas: [...falla].map(([clave, valor]) => ({ clave, valor })).sort((a, b) => b.valor - a.valor),
    estados: [...estados].map(([clave, valor]) => ({ clave, valor })),
    conConductor, identificacion: unidades.length ? Math.round(conConductor / unidades.length * 100) : null,
    eventos: d.eventos.filter(e => ids.has(e.vehiculoId)).length,
    conductores: areaId ? d.conductores.filter(p => unidades.some(v => v.conductorPrincipalId === p.id) || ids.has(typeof p.unidad === 'string' ? p.unidad : p.unidad?.id)) : d.conductores,
  }
}

export function crearCsv(filas) {
  return '\ufeff' + filas.map(fila => fila.map(valor => {
    let texto = String(valor ?? '')
    // Excel interpreta fórmulas incluso cuando la celda está entre comillas.
    if (/^\s*[=+@-]/.test(texto) && !numeroValido(valor)) texto = "'" + texto
    return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }).join(';')).join('\r\n')
}
