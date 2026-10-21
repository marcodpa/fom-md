/** Métricas derivadas de registros autorizados, sin convertir ausencias en ceros. */
import { etiqueta, estadoDocumento } from '../datos/catalogos.js'

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
  return '﻿' + filas.map(fila => fila.map(valor => {
    let texto = String(valor ?? '')
    // Excel interpreta fórmulas incluso cuando la celda está entre comillas.
    if (/^\s*[=+@-]/.test(texto) && !numeroValido(valor)) texto = "'" + texto
    return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }).join(';')).join('\r\n')
}

// ============================================================
// FORMATO es-VE — miles con punto y decimales con coma. Se arma a mano y no
// con toLocaleString: el resultado depende del ICU del navegador y en 'es' un
// número de cuatro cifras sale sin punto («1234»).
// ============================================================

export function numeroVE(n, decimales = 0) {
  if (!numeroValido(n)) return '—'
  const v = Number(n)
  const [entero, fraccion] = Math.abs(v).toFixed(decimales).split('.')
  const signo = v < 0 && Number(Math.abs(v).toFixed(decimales)) !== 0 ? '-' : ''
  return signo + entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraccion ? `,${fraccion}` : '')
}

/** Hasta `maximo` decimales, sin ceros de relleno: 8 → «8», 4,70 → «4,7». */
export function numeroCorto(n, maximo = 1) {
  if (!numeroValido(n)) return '—'
  const texto = numeroVE(n, maximo)
  return texto.includes(',') ? texto.replace(/0+$/, '').replace(/,$/, '') : texto
}

export const kmVE = n => numeroValido(n) ? `${numeroVE(Math.round(Number(n)))} km` : '—'
export function dineroVE(n, decimales = 0) {
  if (!numeroValido(n)) return '—'
  return `${Number(n) < 0 ? '-' : ''}$${numeroVE(Math.abs(Number(n)), decimales)}`
}
export const porcentajeVE = (n, decimales = 0) => numeroValido(n) ? `${numeroVE(n, decimales)} %` : '—'

/** «2 d 6 h» · «5 h» · «40 min». */
export function duracionHoras(horas) {
  if (!numeroValido(horas)) return '—'
  const min = Math.max(0, Math.round(Number(horas) * 60))
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.floor(h / 24)
  return h % 24 ? `${d} d ${h % 24} h` : `${d} d`
}

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const mayuscula = t => t.charAt(0).toUpperCase() + t.slice(1)
const dos = n => String(n).padStart(2, '0')

/** «20 oct» · con año: «20 oct 2026». */
export function fechaCortaVE(fecha, conAnio = false) {
  const d = new Date(fecha)
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}${conAnio ? ` ${d.getFullYear()}` : ''}`
}
/** «20 oct 2026, 09:42» (24 horas, como el pie del informe). */
export function fechaHoraVE(fecha) {
  const d = new Date(fecha)
  return `${fechaCortaVE(d, true)}, ${dos(d.getHours())}:${dos(d.getMinutes())}`
}
export const horaVE = fecha => { const d = new Date(fecha); return `${dos(d.getHours())}:${dos(d.getMinutes())}` }

// ============================================================
// PERÍODO — «Mes actual» o «Personalizado» por meses. Las ventanas son
// [desde, hasta): el fin no se incluye. El período anterior tiene la misma
// forma: el mismo tramo del mes pasado hasta la misma hora, o los mismos meses
// justo antes. Si el rango llega al mes en curso, el anterior se recorta a la
// misma duración: comparar 20 días con 31 inventaría una caída.
// ============================================================

const DIA = 86400000
export const claveMes = fecha => { const d = new Date(fecha); return `${d.getFullYear()}-${dos(d.getMonth() + 1)}` }
const deClave = clave => { const [a, m] = String(clave).split('-').map(Number); return new Date(a, m - 1, 1) }
const etiquetaMes = d => `${mayuscula(MESES[d.getMonth()])} ${d.getFullYear()}`

/** Los últimos `cuantos` meses (el actual primero), para elegir «Desde» y «Hasta». */
export function mesesDisponibles(ahora = new Date(), cuantos = 13) {
  const hoy = new Date(ahora)
  return Array.from({ length: cuantos }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    return { clave: claveMes(d), etiqueta: etiquetaMes(d) }
  })
}

/** Rango por defecto del personalizado: los tres meses completos anteriores. */
export function rangoPorDefecto(ahora = new Date()) {
  const hoy = new Date(ahora)
  return { desdeMes: claveMes(new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1)), hastaMes: claveMes(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)) }
}

export function crearPeriodo({ tipo = 'mes', desdeMes, hastaMes } = {}, ahora = new Date()) {
  const hoy = new Date(ahora)
  if (tipo !== 'personalizado' || !desdeMes || !hastaMes) {
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    const antDesde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    // Mismo tramo del mes pasado: del 1 al mismo día y hora de hoy, sin pasarse de su último día.
    const mismaHora = new Date(antDesde.getFullYear(), antDesde.getMonth(), hoy.getDate(), hoy.getHours(), hoy.getMinutes(), hoy.getSeconds(), hoy.getMilliseconds())
    const antHasta = new Date(Math.min(mismaHora.getTime(), desde.getTime()))
    return { tipo: 'mes', clave: `mes-${claveMes(hoy)}`, desde, hasta: hoy, meses: 1, recortado: false, anterior: { desde: antDesde, hasta: antHasta } }
  }
  let [a, b] = [deClave(desdeMes), deClave(hastaMes)]
  if (a > b) [a, b] = [b, a]
  const meses = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1
  const fin = new Date(b.getFullYear(), b.getMonth() + 1, 1)
  const recortado = fin > hoy
  const hasta = recortado ? hoy : fin
  const antDesde = new Date(a.getFullYear(), a.getMonth() - meses, 1)
  // Con el mes en curso adentro, el anterior dura lo mismo que lo que va del período (como «Mes actual»).
  const antHasta = recortado ? new Date(Math.min(antDesde.getTime() + (hasta - a), a.getTime())) : a
  return {
    tipo: 'personalizado', clave: `per-${claveMes(a)}-${claveMes(b)}`, desde: a, hasta, meses, recortado,
    anterior: { desde: antDesde, hasta: antHasta },
  }
}

/** Último día incluido de una ventana [desde, hasta). */
const ultimoDia = hasta => new Date(new Date(hasta).getTime() - 1)
const inicioDia = fecha => { const d = new Date(fecha); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
/** Días de calendario que toca la ventana [desde, hasta): 1–20 oct son 20, julio a septiembre son 92. */
export const diasDeVentana = (desde, hasta) => Math.round((inicioDia(ultimoDia(hasta)) - inicioDia(desde)) / DIA) + 1

/** «1–20 oct» · «19 sep – 18 oct 2026» · con año al final si se pide. */
export function rangoFechas(desde, hasta, conAnio = true) {
  const a = new Date(desde)
  const b = ultimoDia(hasta)
  const anio = conAnio ? ` ${b.getFullYear()}` : ''
  if (a.getFullYear() !== b.getFullYear()) return `${fechaCortaVE(a, true)} – ${fechaCortaVE(b, true)}`
  if (a.getMonth() === b.getMonth()) return a.getDate() === b.getDate() ? `${fechaCortaVE(a)}${anio}` : `${a.getDate()}–${b.getDate()} ${MESES_CORTOS[b.getMonth()]}${anio}`
  return `${fechaCortaVE(a)} – ${fechaCortaVE(b)}${anio}`
}

/** «julio – septiembre 2026» · «agosto 2026» · «noviembre 2025 – enero 2026». */
function rangoMeses(desde, hasta) {
  const a = new Date(desde)
  const b = ultimoDia(hasta)
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return `${MESES[a.getMonth()]} ${a.getFullYear()}`
  if (a.getFullYear() === b.getFullYear()) return `${MESES[a.getMonth()]} – ${MESES[b.getMonth()]} ${b.getFullYear()}`
  return `${MESES[a.getMonth()]} ${a.getFullYear()} – ${MESES[b.getMonth()]} ${b.getFullYear()}`
}

/** Cómo se nombra el período en pantalla y en el PDF. */
export function nombrarPeriodo(p) {
  const fin = ultimoDia(p.hasta)
  if (p.tipo === 'mes') {
    const mes = `${mayuscula(MESES[p.desde.getMonth()])} de ${p.desde.getFullYear()}`
    const anterior = rangoFechas(p.anterior.desde, p.anterior.hasta, false)
    return {
      corto: mes,
      largo: `${mes}, del 1 al ${fin.getDate()}`,
      fechas: rangoFechas(p.desde, p.hasta),
      anterior,
      anteriorFechas: rangoFechas(p.anterior.desde, p.anterior.hasta),
      // «Se compara con …»: el mes pasado se corta a la misma hora que hoy.
      comparaCon: `el ${anterior}, hasta la misma hora`,
      // «… un 8 % más que del 1 al 20 de septiembre»
      queAnterior: `del 1 al ${ultimoDia(p.anterior.hasta).getDate()} de ${MESES[p.anterior.desde.getMonth()]}`,
      dias: diasDeVentana(p.desde, p.hasta),
      diasAnterior: diasDeVentana(p.anterior.desde, p.anterior.hasta),
    }
  }
  const meses = rangoMeses(p.desde, p.hasta)
  const a = p.anterior.desde
  const b = ultimoDia(p.anterior.hasta)
  const dias = diasDeVentana(p.desde, p.hasta)
  if (p.recortado) {
    // El anterior no son meses enteros: se nombra con sus fechas y se dice por qué.
    const fechas = rangoFechas(p.anterior.desde, p.anterior.hasta)
    return {
      corto: mayuscula(meses), largo: mayuscula(meses), fechas: rangoFechas(p.desde, p.hasta),
      anterior: fechas, anteriorFechas: fechas,
      comparaCon: `el ${fechas}: los mismos ${dias} días, porque ${MESES[fin.getMonth()]} aún no termina`,
      queAnterior: `del ${fechaCortaVE(a, a.getFullYear() !== b.getFullYear())} al ${fechaCortaVE(b, true)}`,
      dias, diasAnterior: diasDeVentana(p.anterior.desde, p.anterior.hasta),
    }
  }
  const anteriores = rangoMeses(p.anterior.desde, p.anterior.hasta)
  return {
    corto: mayuscula(meses), largo: mayuscula(meses), fechas: rangoFechas(p.desde, p.hasta),
    anterior: anteriores, anteriorFechas: rangoFechas(p.anterior.desde, p.anterior.hasta),
    comparaCon: anteriores,
    queAnterior: p.meses === 1 ? `en ${anteriores}` : a.getFullYear() === b.getFullYear() ? `entre ${MESES[a.getMonth()]} y ${MESES[b.getMonth()]} de ${b.getFullYear()}` : `entre ${MESES[a.getMonth()]} de ${a.getFullYear()} y ${MESES[b.getMonth()]} de ${b.getFullYear()}`,
    dias, diasAnterior: diasDeVentana(p.anterior.desde, p.anterior.hasta),
  }
}

// ============================================================
// VENTANAS — los servicios de costos y de manejo cuentan «desde hace N días
// hasta hoy». Una ventana [a, b) sale de restar dos lecturas: desde(a) menos
// desde(b). Así el período anterior se pide con los MISMOS servicios, en
// paralelo y con un número fijo de lecturas (como mucho tres).
// ============================================================

/** Inicios de las lecturas «desde X» que hacen falta (los que caen hoy o después no se piden: valen cero). */
export function cortesDelPeriodo(p, ahora = Date.now()) {
  return [...new Set([p.anterior.desde, p.anterior.hasta, p.desde, p.hasta].map(d => new Date(d).getTime()).filter(t => t < ahora))].sort((a, b) => a - b)
}
/** Días exactos (con fracción) desde un corte hasta ahora: los servicios que filtran en el navegador. */
export const diasDesde = (t, ahora = Date.now()) => (ahora - t) / DIA
/** Días enteros para el servidor (cuenta días de calendario hasta hoy). */
export const diasServidor = (t, ahora = Date.now()) => Math.max(1, Math.ceil(diasDesde(t, ahora)))

/**
 * La ventana [desde, hasta) a partir de las lecturas por corte. `null` si
 * falta alguna lectura: sin ella la resta inventaría un número.
 */
export function enVentana(porCorte, desde, hasta, ahora, restar) {
  const a = porCorte.get(new Date(desde).getTime())
  if (a == null) return null
  if (new Date(hasta).getTime() >= ahora) return restar(a, null)
  const b = porCorte.get(new Date(hasta).getTime())
  return b == null ? null : restar(a, b)
}

const num = v => (numeroValido(v) ? Number(v) : 0)
const centavos = n => Math.round(n * 100) / 100
const dosDecimales = n => Math.round(n * 100) / 100

export function restarCostos(a, b) {
  if (!a) return null
  const cats = new Map()
  for (const x of a.porCategoria || []) cats.set(x.categoria, (cats.get(x.categoria) || 0) + num(x.monto))
  for (const x of b?.porCategoria || []) cats.set(x.categoria, (cats.get(x.categoria) || 0) - num(x.monto))
  return {
    total: centavos(num(a.total) - num(b?.total)),
    movimientos: Math.max(0, num(a.movimientos) - num(b?.movimientos)),
    porCategoria: [...cats].map(([categoria, monto]) => ({ categoria, monto: centavos(monto) })).filter(x => x.monto > 0).sort((x, y) => y.monto - x.monto),
  }
}

/** Ranking de manejo por conductor en la ventana. El índice solo vale si la ventana llega a hoy (no se resta). */
export function restarManejo(a, b) {
  if (!Array.isArray(a)) return null
  const previo = new Map((b || []).map(x => [x.id, x]))
  return a.map(x => {
    const y = previo.get(x.id)
    const resta = campo => Math.max(0, num(x[campo]) - num(y?.[campo]))
    const km = resta('km')
    const frenadas = resta('frenadas')
    const aceleraciones = resta('aceleraciones')
    const excesos = resta('excesos')
    const eventos = frenadas + aceleraciones + excesos
    return {
      id: x.id, nombre: x.nombre, km, frenadas, aceleraciones, excesos, eventos,
      eventosPor100: km > 0 ? dosDecimales(eventos / km * 100) : null,
      indice: b ? null : (numeroValido(x.indice) ? Number(x.indice) : null),
    }
  }).filter(x => x.km > 0 || x.eventos > 0)
}

// ============================================================
// ODT con 3 estados visibles (Abierta / En revisión / Resuelta). Solo para
// mostrar: mismos grupos que historial-odt.js.
// ============================================================
const REVISION = ['en_revision', 'aprobada', 'asignada', 'en_ejecucion', 'pausada', 'en_calidad']
export function grupoOdt(estado) {
  if (estado === 'abierta') return 'abierta'
  if (REVISION.includes(estado)) return 'revision'
  if (estado === 'cerrada' || estado === 'cancelada') return 'resuelta'
  return 'otro'
}
export const ETIQUETA_GRUPO = { abierta: 'Abierta', revision: 'En revisión', resuelta: 'Resuelta', otro: 'Otro estado' }

const PRODUCTOS = new Set(['combustible', 'repuestos', 'neumaticos', 'lubricantes'])
export const CATEGORIAS = { combustible: 'Combustible', repuestos: 'Repuestos', neumaticos: 'Neumáticos', lubricantes: 'Lubricantes', mano_obra: 'Mano de obra', preventivo: 'Mantenimiento preventivo', correctivo: 'Mantenimiento correctivo', peajes: 'Peajes', seguros: 'Seguros' }
export const esProducto = categoria => PRODUCTOS.has(categoria)
export const etiquetaFalla = clave => clave === 'preventiva' ? 'Preventivo' : etiqueta('tipo_falla', clave) || 'Otro'

// ============================================================
// ALCANCE — toda la empresa, un área o los que yo elija. Todo se filtra en el
// navegador: cambiar de alcance no vuelve a pedir nada al servidor.
// ============================================================
const unidadDePersona = p => (typeof p?.unidad === 'string' ? p.unidad : p?.unidad?.id) || null

export function resolverAlcance(d, alcance = {}, formato = 'vehiculos') {
  const vehiculos = d.vehiculos || []
  const personas = d.conductores || []
  const tipo = alcance.tipo || 'empresa'
  let unidades = vehiculos
  let gente = personas
  let personasIds = null
  if (tipo === 'area' && alcance.areaId) {
    unidades = vehiculos.filter(v => v.areaId === alcance.areaId)
  } else if (tipo === 'elegidos' && formato === 'usuarios') {
    const elegidas = new Set(alcance.personas || [])
    gente = personas.filter(p => elegidas.has(p.id))
    const suyas = new Set(gente.map(unidadDePersona).filter(Boolean))
    unidades = vehiculos.filter(v => suyas.has(v.id) || elegidas.has(v.conductorPrincipalId))
    personasIds = elegidas
  } else if (tipo === 'elegidos') {
    const elegidas = new Set(alcance.vehiculos || [])
    unidades = vehiculos.filter(v => elegidas.has(v.id))
  }
  const ids = new Set(unidades.map(v => v.id))
  if (tipo !== 'empresa' && !personasIds) {
    gente = personas.filter(p => ids.has(unidadDePersona(p)) || unidades.some(v => v.conductorPrincipalId === p.id))
    personasIds = new Set([...gente.map(p => p.id), ...unidades.map(v => v.conductorPrincipalId).filter(Boolean)])
  }
  return { tipo, ids, personasIds, unidades, personas: gente }
}

/**
 * Alcance al pasar de un formato a otro. «Los que yo elija» son unidades en
 * Vehículos y Estadístico y personas en Usuarios: al cruzar de un lado al otro
 * la lista ya no sirve y se vuelve a «Toda la empresa» (como en la app).
 */
export function alcanceAlCambiar(alcance, de, a) {
  if (alcance?.tipo === 'elegidos' && (de === 'usuarios') !== (a === 'usuarios')) return { tipo: 'empresa' }
  return alcance
}

// ============================================================
// MÉTRICAS DE UNA VENTANA
// ============================================================
export function metricasDe(d, ventana, alcance, manejo, costos) {
  const t0 = new Date(ventana.desde).getTime()
  const t1 = new Date(ventana.hasta).getTime()
  const dentro = iso => { const t = Date.parse(iso); return t >= t0 && t < t1 }
  const odts = (d.odts || []).filter(o => alcance.ids.has(o.vehiculoId) && dentro(o.creadaEn))
  const grupo = g => odts.filter(o => grupoOdt(o.estado) === g)
  const resueltas = grupo('resuelta')
  const conCosto = resueltas.filter(o => numeroValido(o.costo))
  const tiempos = resueltas.filter(o => o.resueltaEn).map(o => (Date.parse(o.resueltaEn) - Date.parse(o.creadaEn)) / 3600000).filter(h => Number.isFinite(h) && h >= 0)
  const fallas = new Map()
  odts.forEach(o => { const k = o.tipoFalla || (o.tipo === 'preventiva' ? 'preventiva' : 'otro'); fallas.set(k, (fallas.get(k) || 0) + 1) })
  const eventos = (d.eventos || []).filter(e => alcance.ids.has(e.vehiculoId) && dentro(e.creadaEn))
  const porClave = new Map()
  eventos.forEach(e => porClave.set(e.clave || 'otro', { clave: e.clave || 'otro', nombre: e.nombre || 'Otro', valor: (porClave.get(e.clave || 'otro')?.valor || 0) + 1 }))
  const conductores = manejo ? manejo.filter(x => !alcance.personasIds || alcance.personasIds.has(x.id)) : null
  const conKm = conductores?.length ? conductores : null
  const km = conKm ? conKm.reduce((s, x) => s + x.km, 0) : null
  const eventosManejo = conKm ? conKm.reduce((s, x) => s + x.eventos, 0) : null
  const gasto = costos ? costos.total : null
  const productos = costos ? centavos(costos.porCategoria.filter(x => esProducto(x.categoria)).reduce((s, x) => s + x.monto, 0)) : null
  return {
    odts,
    abiertas: grupo('abierta').length, revision: grupo('revision').length, resueltas: resueltas.length,
    sinResolver: grupo('abierta').length + grupo('revision').length,
    conCosto: conCosto.length,
    costoResueltas: conCosto.length ? centavos(conCosto.reduce((s, o) => s + Number(o.costo), 0)) : null,
    resolucionHoras: tiempos.length ? tiempos.reduce((s, h) => s + h, 0) / tiempos.length : null,
    fallas: [...fallas].map(([clave, valor]) => ({ clave, etiqueta: etiquetaFalla(clave), valor })).sort((a, b) => b.valor - a.valor),
    eventos: eventos.length, eventosLista: eventos,
    eventosPorClave: [...porClave.values()].sort((a, b) => b.valor - a.valor),
    manejo: conductores,
    km, eventosManejo,
    eventosPor100: km > 0 ? dosDecimales(eventosManejo / km * 100) : null,
    gasto, movimientos: costos ? costos.movimientos : null,
    porCategoria: costos ? costos.porCategoria : null,
    productos, servicios: costos ? centavos(gasto - productos) : null,
    // El gasto es de toda la empresa: dividirlo entre los km de un área daría un número falso.
    costoPorKm: gasto != null && km > 0 && !alcance.personasIds ? gasto / km : null,
  }
}

// ============================================================
// VISTA ACTUAL y filas de las tablas
// ============================================================
export function papelesUnidad(v) {
  if (v.docsVencidos > 0) return { estado: 'vencido', texto: v.docsVencidos === 1 ? '1 vencido' : `${v.docsVencidos} vencidos` }
  if (v.docsVencidos == null || v.docsPorVencer == null) return { estado: null, texto: 'Sin dato' }
  if (v.docsPorVencer > 0) return { estado: 'por_vencer', texto: `${v.docsPorVencer} por vencer` }
  return { estado: 'al_dia', texto: 'Al día' }
}

export function papelesPersona(p, hoy = new Date()) {
  let estado = p.licenciaEstado ?? null
  let vence = p.licenciaVence ?? null
  if (!estado && p.licenciaVence) estado = estadoDocumento(p.licenciaVence, hoy)
  if (!estado && numeroValido(p.documentoDias)) { estado = p.documentoDias < 0 ? 'vencido' : p.documentoDias <= 30 ? 'por_vencer' : 'vigente'; vence = p.documentoVence }
  if (!estado) return { estado: null, texto: 'Sin dato' }
  if (estado === 'vencido') return { estado, texto: 'Vencido' }
  if (estado === 'por_vencer') return { estado, texto: vence ? `Vence ${fechaCortaVE(vence)}` : 'Por vencer' }
  return { estado: 'al_dia', texto: 'Al día' }
}

const indiceValido = v => numeroValido(v) && Number(v) >= 0 && Number(v) <= 100
export const tonoIndice = n => !indiceValido(n) ? null : n >= 85 ? 'ok' : n >= 70 ? 'warn' : 'bad'
export const tonoScore = n => !numeroValido(n) ? null : n < 1.5 ? 'ok' : n < 3.5 ? 'warn' : 'bad'
export const resultadoDe = tono => ({ ok: 'Conforme', warn: 'Alerta', bad: 'Atención' })[tono] || 'Sin dato'

export function vistaActual(unidades, personas) {
  const enMarcha = unidades.filter(v => v.estadoMarcha === 'en_marcha').length
  const detenidas = unidades.filter(v => v.estadoMarcha === 'parada').length
  const conIndice = unidades.filter(v => indiceValido(v.indiceSeguro))
  const conConductor = unidades.filter(v => v.conductorPrincipalId).length
  const papeles = personas.map(p => papelesPersona(p)).filter(x => x.estado)
  return {
    total: unidades.length, enMarcha, detenidas, sinDato: unidades.length - enMarcha - detenidas,
    // Promedio solo si TODAS tienen índice: con huecos no se afirma un número.
    indice: unidades.length && conIndice.length === unidades.length ? Math.round(conIndice.reduce((s, v) => s + Number(v.indiceSeguro), 0) / conIndice.length) : null,
    odometros: unidades.length && unidades.every(v => numeroValido(v.km)) ? unidades.reduce((s, v) => s + Number(v.km), 0) : null,
    conConductor, sinConductor: unidades.length - conConductor,
    identificacion: unidades.length ? Math.round(conConductor / unidades.length * 100) : null,
    conPapelesVencidos: unidades.filter(v => v.docsVencidos > 0).length,
    personas: personas.length,
    papelesAlDia: papeles.length ? Math.round(papeles.filter(x => x.estado === 'al_dia').length / papeles.length * 100) : null,
    papelesVencidos: papeles.filter(x => x.estado === 'vencido').length,
    papelesPorVencer: papeles.filter(x => x.estado === 'por_vencer').length,
  }
}

export function filasUnidades(unidades, act) {
  return unidades.map(v => {
    const odts = act.odts.filter(o => o.vehiculoId === v.id)
    const sinResolver = odts.filter(o => ['abierta', 'revision'].includes(grupoOdt(o.estado))).length
    const papeles = papelesUnidad(v)
    const motivos = []
    if (tonoIndice(v.indiceSeguro) === 'bad') motivos.push('Índice bajo')
    if (papeles.estado === 'vencido') motivos.push('Papeles vencidos')
    if (!v.conductorPrincipalId) motivos.push('Sin conductor')
    if (sinResolver) motivos.push('ODT sin resolver')
    const resueltas = odts.filter(o => grupoOdt(o.estado) === 'resuelta')
    const conCosto = resueltas.filter(o => numeroValido(o.costo))
    return {
      id: v.id, v, papeles, motivos, atencion: motivos.length > 0,
      eventos: act.eventosLista.filter(e => e.vehiculoId === v.id).length,
      odts: odts.length, sinResolver, resueltas: resueltas.length, conCosto: conCosto.length,
      costo: conCosto.length ? centavos(conCosto.reduce((s, o) => s + Number(o.costo), 0)) : null,
    }
  }).sort((a, b) => b.motivos.length - a.motivos.length || String(a.v.alias).localeCompare(String(b.v.alias), 'es', { numeric: true }))
}

export function filasPersonas(personas, unidades, act) {
  const porId = new Map(unidades.map(v => [v.id, v]))
  const manejo = new Map((act.manejo || []).map(x => [x.id, x]))
  const filas = personas.map(p => {
    const v = porId.get(unidadDePersona(p)) || unidades.find(u => u.conductorPrincipalId === p.id) || null
    const m = manejo.get(p.id) || null
    manejo.delete(p.id)
    // Sin ranking del servidor se cuentan los eventos de alerta que traen al conductor (solo la semilla los trae).
    const suyos = act.eventosLista.filter(e => e.conductorId && e.conductorId === p.id)
    const cuenta = clave => suyos.filter(e => e.clave === clave).length
    const desglose = m ? { excesos: m.excesos, frenadas: m.frenadas, aceleraciones: m.aceleraciones } : suyos.length ? { excesos: cuenta('exceso_velocidad'), frenadas: cuenta('frenada_brusca'), aceleraciones: cuenta('aceleracion_brusca') } : null
    return fila(p.id, p.nombre, v, p, m, desglose, act.odts.filter(o => o.creadorId === p.id).length)
  })
  // Quien manejó en el período y no está en la lista de conductores también cuenta.
  for (const m of manejo.values()) filas.push(fila(m.id, m.nombre, null, null, m, { excesos: m.excesos, frenadas: m.frenadas, aceleraciones: m.aceleraciones }, null))
  return filas.sort((a, b) => b.motivos.length - a.motivos.length || (b.km ?? -1) - (a.km ?? -1) || a.nombre.localeCompare(b.nombre, 'es'))
}

function fila(id, nombre, v, p, m, desglose, odts) {
  const papeles = p ? papelesPersona(p) : { estado: null, texto: 'Sin dato' }
  const indice = indiceValido(p?.indiceSeguro) ? Number(p.indiceSeguro) : m?.indice ?? null
  const motivos = []
  if (papeles.estado === 'vencido' || papeles.estado === 'por_vencer') motivos.push(papeles.estado === 'vencido' ? 'Papeles vencidos' : 'Papeles por vencer')
  if (tonoIndice(indice) === 'bad') motivos.push('Índice bajo')
  if (m && tonoScore(m.eventosPor100) !== 'ok' && m.eventosPor100 != null) motivos.push('Muchos eventos')
  return {
    id, nombre: nombre || 'Sin nombre', unidad: v ? v.alias : (p?.unidadAlias || null), area: v?.areaNombre || null,
    km: m ? m.km : null, eventosPor100: m ? m.eventosPor100 : null, desglose, odts, indice, papeles, motivos, atencion: motivos.length > 0,
    // La calificación del servidor acompaña al índice solo cuando el índice es el suyo (pastilla igual a la del Resumen).
    rating: indiceValido(p?.indiceSeguro) ? null : m?.rating ?? null,
  }
}

// ============================================================
// COMPARACIÓN con el período anterior
// ============================================================
/**
 * `mejor`: 'sube' | 'baja' | null (sin juicio, p. ej. km). `modo`: 'pct' |
 * 'abs' | 'puntos'. Devuelve null si falta cualquiera de los dos valores.
 */
export function comparar(actual, anterior, { mejor = null, modo = 'pct', decimales = 0, prefijo = '' } = {}) {
  if (!numeroValido(actual) || !numeroValido(anterior)) return null
  const a = Number(actual)
  const b = Number(anterior)
  const dif = a - b
  const enPct = modo === 'pct' && b !== 0
  // Igual es lo que se vería igual: en porcentaje, menos de 0,05 %.
  const igual = enPct ? Math.round(Math.abs(dif / b * 1000)) === 0 : Math.abs(dif) < 0.5 / 10 ** decimales
  const sube = dif > 0
  const sentido = sube ? 'más' : 'menos'
  let texto
  if (igual) texto = 'sin cambio'
  else if (enPct) texto = `${textoPct(dif / b * 100)} ${sentido}`
  else if (modo === 'puntos') {
    const n = Math.abs(dif)
    texto = `${numeroCorto(n, decimales)} ${Math.round(n) === 1 ? 'punto' : 'puntos'} ${sentido}`
  } else texto = `${prefijo}${numeroVE(Math.abs(dif), decimales)} ${sentido}`
  return {
    direccion: igual ? 'igual' : sube ? 'sube' : 'baja',
    flecha: igual ? '=' : sube ? '▲' : '▼',
    texto,
    tono: igual || !mejor ? 'neutro' : (mejor === 'sube') === sube ? 'bien' : 'mal',
    pct: b !== 0 ? dif / b * 100 : null,
  }
}

/** Como en la app: un decimal por debajo del 10 % («8,3 %») y entero desde el 10 % («12 %»). */
export function textoPct(pct) {
  const p = Math.abs(Number(pct))
  return `${numeroVE(p, Math.round(p * 10) / 10 < 10 ? 1 : 0)} %`
}

/** «un 8,3 % más» / «un 3,0 % menos» / «lo mismo» para la frase. */
function enFrase(cmp) {
  if (!cmp) return null
  if (cmp.direccion === 'igual') return 'lo mismo'
  return cmp.pct != null ? `un ${textoPct(cmp.pct)} ${cmp.direccion === 'sube' ? 'más' : 'menos'}` : null
}

/** «▲ 8,3 % más» · «sin cambio»: la comparación escrita igual en pantalla, PDF y app. */
export const textoCmp = cmp => !cmp ? '' : cmp.direccion === 'igual' ? 'sin cambio' : `${cmp.flecha} ${cmp.texto}`

/** Orden del score por conductor, el mismo en pantalla y PDF: primero el más alto; sin km, al final. */
export const porScore = (a, b) => (b.eventosPor100 ?? -1) - (a.eventosPor100 ?? -1) || (b.km ?? -1) - (a.km ?? -1)

// ============================================================
// FORMATOS, CIFRAS Y FRASE
// ============================================================
export const FORMATOS = [
  { id: 'vehiculos', nombre: 'Vehículos', frase: 'Km, índice, eventos y ODT por unidad.', titulo: 'Reporte de vehículos', codigo: 'FOM-REP-03' },
  { id: 'usuarios', nombre: 'Usuarios', frase: 'Km, ODT y eventos por persona.', titulo: 'Reporte de usuarios', codigo: 'FOM-REP-04' },
  { id: 'costos', nombre: 'Costos', frase: 'Gasto por categoría, producto y servicio.', titulo: 'Costos y gastos', codigo: 'FOM-REP-02' },
  { id: 'estadistico', nombre: 'Estadístico', frase: 'Indicadores y distancias de la flota.', titulo: 'Informe estadístico de conducción', codigo: 'FOM-REP-01' },
]
export const COMPLETO = { id: 'completo', nombre: 'Reporte completo', frase: 'Los cuatro formatos en un solo PDF.', titulo: 'Informe de gestión de flota' }
export const formatoPorId = id => FORMATOS.find(f => f.id === id) || (id === 'completo' ? COMPLETO : FORMATOS[0])

const cifra = (c) => ({ unidad: '', pista: '', tono: null, cmp: null, antes: null, ahora: false, nota: '', ...c })

/** Las 4 cifras de arriba del tablero de cada formato (y de la portada del PDF). */
export function cifrasDe(formato, m) {
  const { act, ant, vista } = m
  const km = cifra({
    clave: 'km', etiqueta: formato === 'usuarios' ? 'Km con conductor' : 'Km recorridos',
    valor: numeroVE(act.km == null ? null : Math.round(act.km)), unidad: act.km == null ? '' : 'km',
    cmp: comparar(act.km, ant.km, { modo: 'pct' }), antes: ant.km == null ? null : `antes ${kmVE(ant.km)}`,
    // La web no tiene km por unidad: los km salen del score de manejo de cada conductor identificado.
    nota: act.km == null ? 'El servidor no entregó km del período' : formato === 'usuarios' ? '' : 'suma de los conductores identificados',
  })
  const ev100 = cifra({
    clave: 'ev100', etiqueta: 'Eventos por 100 km', pista: 'óptimo < 1,5',
    valor: numeroVE(act.eventosPor100, 2), tono: tonoScore(act.eventosPor100),
    cmp: comparar(act.eventosPor100, ant.eventosPor100, { mejor: 'baja', modo: 'abs', decimales: 2 }),
    antes: ant.eventosPor100 == null ? null : `antes ${numeroVE(ant.eventosPor100, 2)}`,
    nota: act.eventosPor100 == null ? 'Sin km del período no se calcula' : '',
  })
  const indice = cifra({ clave: 'indice', etiqueta: 'Índice seguro prom.', pista: '100 = perfecto', valor: numeroVE(vista.indice), unidad: vista.indice == null ? '' : '/ 100', tono: tonoIndice(vista.indice), ahora: true })
  const ident = cifra({ clave: 'ident', etiqueta: 'Identificación de conductores', valor: numeroVE(vista.identificacion), unidad: vista.identificacion == null ? '' : '%', tono: vista.identificacion == null ? null : vista.identificacion >= 85 ? 'ok' : vista.identificacion >= 70 ? 'warn' : 'bad', ahora: true, nota: `${vista.conConductor} de ${vista.total} unidades` })
  // Mismas cuatro cifras y en el mismo orden que la app, pestaña por pestaña.
  if (formato === 'usuarios') {
    return [km, indice, ev100, cifra({ clave: 'papeles', etiqueta: 'Documentos al día', valor: numeroVE(vista.papelesAlDia), unidad: vista.papelesAlDia == null ? '' : '%', tono: vista.papelesVencidos ? 'bad' : vista.papelesPorVencer ? 'warn' : null, ahora: true, nota: vista.papelesAlDia == null ? 'Sin documentos con fecha' : vista.papelesVencidos ? `${vista.papelesVencidos} vencidos` : '' })]
  }
  if (formato === 'costos') {
    return [
      cifra({ clave: 'gasto', etiqueta: 'Gasto del período', valor: dineroVE(act.gasto), cmp: comparar(act.gasto, ant.gasto, { mejor: 'baja' }), antes: ant.gasto == null ? null : `antes ${dineroVE(ant.gasto)}`, nota: act.gasto == null ? 'Costos no disponibles' : '' }),
      cifra({ clave: 'mov', etiqueta: 'Gastos registrados', valor: numeroVE(act.movimientos), cmp: comparar(act.movimientos, ant.movimientos, { modo: 'abs' }), antes: ant.movimientos == null ? null : `antes ${numeroVE(ant.movimientos)}`, nota: act.movimientos == null ? 'Costos no disponibles' : '' }),
      cifra({ clave: 'costoKm', etiqueta: 'Costo por km', valor: act.costoPorKm == null ? '—' : dineroVE(act.costoPorKm, 3), cmp: comparar(act.costoPorKm, ant.costoPorKm, { mejor: 'baja', modo: 'abs', decimales: 3, prefijo: '$' }), antes: ant.costoPorKm == null ? null : `antes ${dineroVE(ant.costoPorKm, 3)}`, nota: act.costoPorKm == null ? 'Hace falta gasto y km del período' : '' }),
      cifra({ clave: 'odtCosto', etiqueta: 'Costo en ODT resueltas', valor: dineroVE(act.costoResueltas), cmp: comparar(act.costoResueltas, ant.costoResueltas, { mejor: 'baja' }), antes: ant.costoResueltas == null ? null : `antes ${dineroVE(ant.costoResueltas)}`, nota: `${act.conCosto} de ${act.resueltas} resueltas con costo` }),
    ]
  }
  if (formato === 'estadistico') {
    return [
      cifra({ clave: 'alertas', etiqueta: 'Eventos de alerta', valor: numeroVE(act.eventos), cmp: comparar(act.eventos, ant.eventos, { mejor: 'baja', modo: 'abs' }), antes: `antes ${numeroVE(ant.eventos)}` }),
      ev100,
      // La web solo tiene km por conductor (score de manejo); km por unidad pediría una consulta por cada unidad.
      cifra({ clave: 'conKm', etiqueta: 'Unidades con km', valor: '—', nota: 'La web no recibe km por unidad' }),
      ident,
    ]
  }
  return [km, indice, ev100, cifra({
    clave: 'odt', etiqueta: 'ODT del período', valor: numeroVE(act.odts.length), tono: act.sinResolver ? 'warn' : null,
    cmp: comparar(act.odts.length, ant.odts.length, { mejor: 'baja', modo: 'abs' }), antes: `antes ${numeroVE(ant.odts.length)}`,
    nota: `${act.sinResolver} sin resolver`,
  })]
}

/** La frase de la antigua franja «En pocas palabras»: { texto, aviso }. Desde T-88 no sale en pantalla ni en el PDF (la reemplazan el tablero y sus chips); se deja por sus pruebas. */
export function fraseDe(formato, m, nombre) {
  const { act, ant, vista, filasU } = m
  const que = nombre.queAnterior
  const kmCmp = enFrase(comparar(act.km, ant.km))
  if (formato === 'usuarios') {
    const quienes = (act.manejo || []).length
    const texto = act.km != null
      ? `${quienes} ${quienes === 1 ? 'conductor recorrió' : 'conductores recorrieron'} ${kmVE(act.km)}${kmCmp ? `, ${kmCmp} que ${que}` : ''}.`
      : `${vista.personas} ${vista.personas === 1 ? 'conductor' : 'conductores'} en este alcance; ${vista.conConductor} de ${vista.total} unidades tienen conductor.`
    const aviso = vista.papelesVencidos || vista.papelesPorVencer
      ? [vista.papelesVencidos && `${vista.papelesVencidos === 1 ? 'Un papel ya venció' : `${vista.papelesVencidos} papeles ya vencieron`}`, vista.papelesPorVencer && `${vista.papelesPorVencer} por vencer`].filter(Boolean).join(' y ') + '.'
      : vista.sinConductor ? `${vista.sinConductor} ${vista.sinConductor === 1 ? 'unidad sigue' : 'unidades siguen'} sin conductor.` : ''
    return { texto, aviso }
  }
  if (formato === 'costos') {
    if (act.gasto == null) return { texto: `Los costos de operación no están disponibles en el servidor. El costo registrado en ODT resueltas fue ${dineroVE(act.costoResueltas)}.`, aviso: '' }
    const cmp = enFrase(comparar(act.gasto, ant.gasto))
    const mayor = act.porCategoria?.[0]
    return { texto: `La flota gastó ${dineroVE(act.gasto)}${cmp ? `, ${cmp} que ${que}` : ''}.`, aviso: mayor ? `${CATEGORIAS[mayor.categoria] || mayor.categoria} fue el mayor gasto (${dineroVE(mayor.monto)}).` : '' }
  }
  if (formato === 'estadistico') {
    if (act.eventosPor100 == null) return { texto: `El servidor aún no entrega km ni eventos de manejo de este período: el score no se califica. Hubo ${numeroVE(act.eventos)} eventos de alerta.`, aviso: '' }
    const altos = (act.manejo || []).filter(x => x.eventosPor100 != null && x.eventosPor100 >= 1.5).length
    return {
      texto: `El score de conducción fue ${numeroVE(act.eventosPor100, 2)} eventos por cada 100 km${ant.eventosPor100 != null ? ` (antes ${numeroVE(ant.eventosPor100, 2)})` : ''}.`,
      aviso: altos ? `${altos} ${altos === 1 ? 'conductor pasa' : 'conductores pasan'} de 1,5.` : '',
    }
  }
  const texto = act.km != null
    ? `Las ${vista.total} unidades recorrieron ${kmVE(act.km)}${kmCmp ? `, ${kmCmp} que ${que}` : ''}.`
    : `${vista.total} ${vista.total === 1 ? 'unidad' : 'unidades'} en este alcance, ${vista.enMarcha} en marcha ahora. Se crearon ${act.odts.length} ODT (antes ${ant.odts.length}).`
  let aviso = ''
  if (act.sinResolver) {
    const porUnidad = (filasU || []).filter(f => f.sinResolver).sort((a, b) => b.sinResolver - a.sinResolver)
    const top = porUnidad[0]
    aviso = `${act.sinResolver} ODT ${act.sinResolver === 1 ? 'sigue' : 'siguen'} sin resolver${top && top.sinResolver > 1 ? `, ${top.sinResolver} de ellas en la ${top.v.alias}` : ''}.`
  }
  return { texto, aviso }
}

/**
 * Todo lo que piden la pantalla y el PDF para un alcance, ya calculado.
 * `d` trae las listas crudas y las lecturas de costos y manejo por ventana.
 */
export function armarModelo(d, periodo, alcanceElegido, formato) {
  const alcance = resolverAlcance(d, alcanceElegido, formato)
  const act = metricasDe(d, periodo, alcance, d.manejo?.actual ?? null, d.costos?.actual ?? null)
  const ant = metricasDe(d, periodo.anterior, alcance, d.manejo?.anterior ?? null, d.costos?.anterior ?? null)
  const vista = vistaActual(alcance.unidades, alcance.personas)
  const filasU = filasUnidades(alcance.unidades, act)
  // Sin resolver de cualquier fecha (vista actual): la más antigua puede venir de antes del período.
  const pendientes = (d.odts || []).filter(o => alcance.ids.has(o.vehiculoId) && ['abierta', 'revision'].includes(grupoOdt(o.estado)) && Number.isFinite(Date.parse(o.creadaEn)))
    .sort((a, b) => Date.parse(a.creadaEn) - Date.parse(b.creadaEn))
  return { alcance, act, ant, vista, filasU, pendientes, filasP: filasPersonas(alcance.personas, alcance.unidades, act) }
}
