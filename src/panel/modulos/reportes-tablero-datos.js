/**
 * TABLERO de Reportes (T-88): lo que reemplaza a «En pocas palabras». Solo
 * funciones puras sobre el modelo de armarModelo(): la app (T-89) las copia
 * tal cual y dibuja lo mismo. Nada se pide al servidor y nada se inventa: si
 * un dato no llega, el gráfico sale vacío con su frase.
 */
import { CATEGORIAS, cifrasDe, dineroVE, diasDeVentana, esProducto, grupoOdt, numeroValido, numeroVE, porScore, papelesPersona, tonoScore } from './reportes-datos.js'

const DIA = 86400000
const inicioDia = fecha => { const d = new Date(fecha); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
const plural = (n, uno, varios) => `${numeroVE(n)} ${n === 1 ? uno : varios}`

/**
 * Una cifra por día de la ventana [desde, hasta): `items` son { fecha, valor }.
 * Lo que cae fuera de la ventana no se cuenta.
 */
export function serieDiaria(items, desde, hasta) {
  const dias = diasDeVentana(desde, hasta)
  const base = inicioDia(desde)
  const serie = Array.from({ length: Math.max(0, dias) }, () => 0)
  for (const { fecha, valor = 1 } of items) {
    const t = Date.parse(fecha)
    if (!Number.isFinite(t) || t < new Date(desde).getTime() || t >= new Date(hasta).getTime()) continue
    // Math.round y no floor: un día con cambio de hora dura 23 o 25 horas.
    const i = Math.round((inicioDia(t) - base) / DIA)
    if (i >= 0 && i < serie.length) serie[i] += numeroValido(valor) ? Number(valor) : 0
  }
  return serie
}

/** Sin línea si no hay al menos dos días o si todo el período vale cero: una raya plana no dice nada. */
const conLinea = serie => (serie.length >= 2 && serie.some(x => x > 0) ? serie : null)

/**
 * Series por día de las cifras que tienen fecha de cada registro. Solo tres:
 * ODT del período (fecha de creación), eventos de alerta (fecha del evento) y
 * costo en ODT resueltas (por día de creación de la ODT). Km, eventos por
 * 100 km y gasto llegan como total del período: sin línea.
 */
export function seriesDe(formato, m, ventana) {
  const { act } = m
  const serie = items => conLinea(serieDiaria(items, ventana.desde, ventana.hasta))
  if (formato === 'vehiculos') return { odt: serie(act.odts.map(o => ({ fecha: o.creadaEn }))) }
  if (formato === 'estadistico') return { alertas: serie(act.eventosLista.map(e => ({ fecha: e.creadaEn }))) }
  if (formato === 'costos') {
    return { odtCosto: serie(act.odts.filter(o => grupoOdt(o.estado) === 'resuelta' && numeroValido(o.costo)).map(o => ({ fecha: o.creadaEn, valor: Number(o.costo) }))) }
  }
  return {}
}

// ============================================================
// GRÁFICOS — dos por pestaña. Forma común:
// { clave, titulo, tipo: 'columnas' | 'barrasH' | 'apilada', ahora, partes:
//   [{ clave, etiqueta, valor, texto, tono, detalle? }], total, vacio, pie }
// `tono`: 'ok' verde · 'warn' ámbar · 'bad' rojo · 'azul' · 'gris' · 'vacio'.
// `vacio` es la frase cuando no hay nada que dibujar (si no, null).
// ============================================================
const grafico = g => ({ ahora: false, total: g.partes.reduce((s, p) => s + (numeroValido(p.valor) ? Number(p.valor) : 0), 0), vacio: null, pie: '', ...g })
const parte = (clave, etiqueta, valor, tono, texto) => ({ clave, etiqueta, valor, tono, texto: texto ?? numeroVE(valor) })

/**
 * Estado de una unidad para «Unidades ahora». La falta de señal manda (misma
 * regla que estadoUnidad.js: `conectado === false`); después, la marcha.
 */
export function marchaAhora(v) {
  if (v.conectado === false) return 'sin_senal'
  if (v.estadoMarcha === 'en_marcha') return 'en_marcha'
  if (v.estadoMarcha === 'parada') return 'parada'
  return 'sin_dato'
}

/** Índice seguro por rangos: < 60, 60–79 y 80–100. Sin índice no entra en ninguno. */
export function rangoIndice(n) {
  if (!numeroValido(n) || n < 0 || n > 100) return null
  return n < 60 ? 'bajo' : n < 80 ? 'medio' : 'alto'
}

/** Los dos gráficos de la pestaña. `nombre` es nombrarPeriodo(periodo). */
export function graficosDe(formato, m, nombre) {
  const { act, ant, alcance } = m
  if (formato === 'usuarios') {
    const conIndice = m.filasP.filter(p => rangoIndice(p.indice))
    const cuenta = r => conIndice.filter(p => rangoIndice(p.indice) === r).length
    const sinIndice = m.filasP.length - conIndice.length
    const papeles = alcance.personas.map(p => papelesPersona(p).estado).filter(Boolean)
    const papel = e => papeles.filter(x => x === e).length
    const sinPapeles = alcance.personas.length - papeles.length
    return [
      grafico({
        clave: 'indice', titulo: 'Índice seguro', tipo: 'columnas', ahora: true,
        partes: [parte('bajo', 'Menos de 60', cuenta('bajo'), 'bad'), parte('medio', '60 a 79', cuenta('medio'), 'warn'), parte('alto', '80 a 100', cuenta('alto'), 'ok')],
        vacio: conIndice.length ? null : 'Ningún conductor de este alcance tiene índice todavía.',
        pie: `${plural(conIndice.length, 'conductor', 'conductores')} con índice${sinIndice ? ` · ${numeroVE(sinIndice)} sin dato` : ''}`,
      }),
      grafico({
        clave: 'documentos', titulo: 'Documentos', tipo: 'apilada', ahora: true,
        partes: [parte('al_dia', 'Al día', papel('al_dia'), 'ok'), parte('por_vencer', 'Por vencer', papel('por_vencer'), 'warn'), parte('vencido', 'Vencidos', papel('vencido'), 'bad')],
        vacio: papeles.length ? null : 'Ningún conductor de este alcance tiene documentos con fecha.',
        pie: `${plural(papeles.length, 'conductor', 'conductores')} con documentos con fecha${sinPapeles ? ` · ${numeroVE(sinPapeles)} sin dato` : ''}`,
      }),
    ]
  }
  if (formato === 'costos') {
    const sinCostos = 'El servidor todavía no entrega los costos de operación.'
    return [
      grafico({
        clave: 'categorias', titulo: 'Gasto por categoría', tipo: 'barrasH',
        // Con su % del gasto y si es producto (P) o servicio (S), como la tarjeta que había abajo.
        partes: (act.porCategoria || []).map(x => ({ ...parte(x.categoria, CATEGORIAS[x.categoria] || x.categoria, x.monto, 'azul', dineroVE(x.monto)), detalle: `${act.gasto ? Math.round(x.monto / act.gasto * 100) : 0} % · ${esProducto(x.categoria) ? 'P' : 'S'}` })),
        vacio: act.gasto == null ? sinCostos : act.porCategoria?.length ? null : 'No hay gastos registrados en este período.',
        pie: 'Toda la empresa · USD · P = producto, S = servicio',
      }),
      // El servidor da el gasto de una ventana entera, no por semana ni por
      // mes: lo honesto es el período anterior al lado de este.
      grafico({
        clave: 'tiempo', titulo: 'Gasto en el tiempo', tipo: 'columnas',
        partes: [
          { ...parte('anterior', 'Período anterior', ant.gasto, 'gris', dineroVE(ant.gasto)), detalle: nombre.anteriorFechas },
          { ...parte('actual', 'Este período', act.gasto, 'azul', dineroVE(act.gasto)), detalle: nombre.fechas },
        ],
        vacio: act.gasto == null ? sinCostos : null,
        pie: 'El servidor entrega el gasto de cada período, no por semana.',
      }),
    ]
  }
  if (formato === 'estadistico') {
    const tipos = act.eventosPorClave
    const otros = tipos.slice(6).reduce((s, e) => s + e.valor, 0)
    const top = (act.manejo || []).filter(x => x.eventosPor100 != null).sort(porScore).slice(0, 5)
    return [
      grafico({
        clave: 'eventos', titulo: 'Eventos por tipo', tipo: 'barrasH',
        partes: [...tipos.slice(0, 6).map(e => parte(e.clave, e.nombre, e.valor, 'azul')), ...(otros ? [parte('otros', 'Otros', otros, 'gris')] : [])],
        vacio: tipos.length ? null : 'Sin eventos de alerta en este período.',
        pie: `${plural(act.eventos, 'evento', 'eventos')} de alerta del período`,
      }),
      grafico({
        clave: 'top', titulo: 'Conductores con más eventos por 100 km', tipo: 'barrasH',
        partes: top.map(x => parte(x.id, x.nombre || 'Sin nombre', x.eventosPor100, tonoScore(x.eventosPor100), numeroVE(x.eventosPor100, 2))),
        vacio: act.manejo == null ? 'El servidor no entregó km ni eventos de manejo de este período.' : top.length ? null : 'Ningún conductor recorrió km en este período.',
        pie: 'Los 5 más altos · óptimo menos de 1,5',
      }),
    ]
  }
  const unidades = alcance.unidades.map(marchaAhora)
  const estado = e => unidades.filter(x => x === e).length
  const sinDato = estado('sin_dato')
  const otrasOdt = act.odts.length - act.abiertas - act.revision - act.resueltas
  return [
    grafico({
      clave: 'odt', titulo: 'ODT por estado', tipo: 'columnas',
      partes: [parte('abierta', 'Abiertas', act.abiertas, 'warn'), parte('revision', 'En revisión', act.revision, 'azul'), parte('resuelta', 'Resueltas', act.resueltas, 'ok')],
      vacio: act.odts.length ? null : 'No se crearon ODT en este período.',
      pie: `${plural(act.odts.length, 'ODT creada', 'ODT creadas')} del ${nombre.fechas}${otrasOdt > 0 ? ` · ${numeroVE(otrasOdt)} en otro estado` : ''}`,
    }),
    grafico({
      clave: 'unidades', titulo: 'Unidades ahora', tipo: 'apilada', ahora: true,
      partes: [parte('en_marcha', 'En marcha', estado('en_marcha'), 'ok'), parte('parada', 'Detenidas', estado('parada'), 'warn'), parte('sin_senal', 'Sin señal', estado('sin_senal'), 'gris'), ...(sinDato ? [parte('sin_dato', 'Sin dato', sinDato, 'vacio')] : [])],
      vacio: unidades.length ? null : 'No hay unidades en este alcance.',
      pie: plural(unidades.length, 'unidad', 'unidades'),
    }),
  ]
}

// ============================================================
// CHIPS DE ATENCIÓN — lo que antes era el «aviso» de la frase. Cada chip
// lleva a dónde arreglarlo: `ir` es { ruta } (otra pantalla) o { tabla: true }
// (la tabla de abajo con el filtro «Piden atención»).
// ============================================================
const chip = (clave, n, uno, varios, tono, ir) => (n > 0 ? { clave, texto: plural(n, uno, varios), tono, ir } : null)
const TABLA = { tabla: true }

export function chipsDe(formato, m) {
  const { act, vista } = m
  let lista
  if (formato === 'usuarios') {
    lista = [
      chip('vencidos', vista.papelesVencidos, 'papel vencido', 'papeles vencidos', 'bad', TABLA),
      chip('porVencer', vista.papelesPorVencer, 'papel por vencer', 'papeles por vencer', 'warn', TABLA),
      chip('sinConductor', vista.sinConductor, 'unidad sin conductor', 'unidades sin conductor', 'warn', { ruta: '/panel/flota' }),
      chip('atencion', m.filasP.filter(p => p.atencion).length, 'persona pide atención', 'personas piden atención', 'info', TABLA),
    ]
  } else if (formato === 'costos') {
    lista = [chip('sinCosto', act.resueltas - act.conCosto, 'ODT resuelta sin costo', 'ODT resueltas sin costo', 'warn', TABLA)]
  } else if (formato === 'estadistico') {
    const altos = (act.manejo || []).filter(x => x.eventosPor100 != null && x.eventosPor100 >= 1.5)
    lista = [chip('altos', altos.length, 'conductor pasa de 1,5', 'conductores pasan de 1,5', altos.some(x => x.eventosPor100 >= 3.5) ? 'bad' : 'warn', TABLA)]
  } else {
    lista = [
      chip('sinResolver', act.sinResolver, 'ODT sin resolver', 'ODT sin resolver', 'warn', { ruta: '/panel/mantenimiento' }),
      chip('vencidos', vista.conPapelesVencidos, 'unidad con papeles vencidos', 'unidades con papeles vencidos', 'bad', TABLA),
      chip('sinConductor', vista.sinConductor, 'unidad sin conductor', 'unidades sin conductor', 'warn', { ruta: '/panel/flota' }),
      chip('atencion', m.filasU.filter(f => f.atencion).length, 'unidad pide atención', 'unidades piden atención', 'info', TABLA),
    ]
  }
  return lista.filter(Boolean)
}

/** Todo el tablero de una pestaña: 4 cifras (con su línea si hay datos por día), 2 gráficos y los chips. */
export function tableroDe(formato, m, periodo, nombre) {
  const series = seriesDe(formato, m, periodo)
  return {
    cifras: cifrasDe(formato, m).map(c => ({ ...c, serie: series[c.clave] || null })),
    graficos: graficosDe(formato, m, nombre),
    chips: chipsDe(formato, m),
  }
}

/** Texto para compartir sin la frase: las 4 cifras en una línea. */
export const textoCifras = cifras => cifras.map(c => `${c.etiqueta}: ${c.valor}${c.unidad ? ` ${c.unidad}` : ''}`).join(' · ')
