import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { build } from 'vite'
import {
  aFormato,
  agruparEnLineas,
  analizarHoja,
  armarMapa,
  buscarReglas,
  codigoDe,
  elementosDeHoja,
  estiloHojaEmpresa,
  htmlHojaEmpresa,
  limpiarPregunta,
  maquetarTabla,
  muestraDeInspeccion,
  palabrasDePdf,
  papelDe,
  problemasDeLaHoja,
  sobreHoja,
} from '../src/panel/datos/hojaEmpresa.js'
import { armarPlanillas } from '../src/panel/datos/planillaInspeccion.js'

// ============================================================
// La hoja de tu empresa: de la planilla en blanco a la plantilla y de vuelta
// ------------------------------------------------------------
// 1. Se lee la tabla: rayas, líneas, encabezado (SÍ / NO / OBS. o una sola
//    columna), filas de preguntas y espacios de unidad, fecha, firma…
// 2. Lo elegido se vuelve plantilla (como los formatos listos) y mapa.
// 3. Al imprimir, cada respuesta cae en su casilla; lo que no tiene sitio
//    no se pierde. Varias inspecciones = varias páginas.
// 4. Los almacenes (local y Cloudinary) guardan y leen sin subir nada real.
// Las palabras llegan como las da el OCR: { texto, x0, y0, x1, y1 } en px.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')

/** Una palabra (o un texto corrido) en px, de 10 px por letra y 20 de alto. */
/** Una altura en px de la hoja de 1400 px, como fracción redondeada (como la guarda el mapa). */
const enFraccion = (y) => Math.round((y / 1400) * 10000) / 10000
const pal = (texto, x0, y0, alto = 20) => ({ texto, x0, y0, x1: x0 + texto.length * 10, y1: y0 + alto })
/** Un texto partido en palabras con su sitio, como lo daría el OCR. */
function frase(texto, x0, y0) {
  const ps = []
  let x = x0
  for (const t of texto.split(' ')) { ps.push(pal(t, x, y0)); x += t.length * 10 + 6 }
  return ps
}

/**
 * Una hoja típica de cliente, 1000 × 1400 px, con rayas:
 *   Unidad: ____   Fecha: ____
 *   Conductor: ____
 *   | N° | ASPECTO A VERIFICAR | SI | NO | OBS | OBSERVACIONES |
 *   | 1  | Luces delanteras …  |    |    |     |               |  …
 *   Firma del conductor: ____
 */
function hojaCliente() {
  const palabras = [
    ...frase('Unidad:', 60, 60), ...frase('Fecha:', 600, 60),
    ...frase('Conductor:', 60, 110),
    ...frase('N°', 70, 215), ...frase('ASPECTO A VERIFICAR', 150, 215),
    pal('SI', 615, 215), pal('NO', 675, 215), pal('OBS', 725, 215), pal('OBSERVACIONES', 790, 215),
  ]
  const preguntas = ['Luces delanteras funcionan', 'Nivel de aceite correcto', '¿El freno de mano sostiene la unidad?', 'Extintor cargado y vigente']
  const filas = [200, 250]
  preguntas.forEach((t, i) => {
    const y = 250 + i * 60
    palabras.push(pal(String(i + 1), 75, y + 20), ...frase(t, 150, y + 20))
    filas.push(y + 60)
  })
  palabras.push(...frase('Firma del conductor:', 60, 560))
  const h = filas.map((y) => ({ y, x0: 50, x1: 950, banda: null }))
  const v = [50, 130, 590, 650, 710, 770, 950].map((x) => ({ x, y0: 200, y1: 490, banda: null }))
  return { ancho: 1000, alto: 1400, palabras, reglas: { h, v } }
}

test('limpiar la pregunta: fuera número, viñeta y basura del OCR; el resto, tal cual', () => {
  assert.equal(limpiarPregunta('1. Luces delanteras funcionan'), 'Luces delanteras funcionan')
  assert.equal(limpiarPregunta('[2) El conductor se encuentra'), 'El conductor se encuentra')
  assert.equal(limpiarPregunta('A o El conductor conoce de antemano'), 'El conductor conoce de antemano')
  assert.equal(limpiarPregunta('® Se ha implementado un plan'), 'Se ha implementado un plan')
  assert.equal(limpiarPregunta('• Nivel de aceite   correcto .'), 'Nivel de aceite correcto.')
  assert.equal(limpiarPregunta('Revisión de la verifica- ción previa'), 'Revisión de la verificación previa')
  assert.equal(limpiarPregunta('¿El freno de mano sostiene?'), '¿El freno de mano sostiene?')
  assert.equal(limpiarPregunta('A los ocupantes se les explicó la ruta'), 'A los ocupantes se les explicó la ruta')
})

test('rayas de la tabla: las finas cuentan; un bloque de color con letras no inventa columnas', () => {
  const ancho = 400
  const alto = 400
  const gris = new Uint8Array(ancho * alto).fill(255)
  const pintar = (x0, y0, x1, y1, v = 0) => { for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) gris[y * ancho + x] = v }
  pintar(20, 100, 380, 101) // raya horizontal
  pintar(20, 300, 380, 301)
  pintar(20, 100, 21, 301) // rayas verticales
  pintar(200, 100, 201, 301)
  pintar(379, 100, 380, 301)
  pintar(20, 20, 380, 80, 60) // bloque de color (encabezado)…
  for (let x = 40; x < 360; x += 23) pintar(x, 30, x + 2, 70, 255) // …con letras blancas
  const r = buscarReglas(gris, ancho, alto, { minLargoV: 0.1 })
  assert.deepEqual(r.h.filter((h) => !h.banda).map((h) => h.y), [100.5, 300.5])
  assert.deepEqual(r.h.filter((h) => h.banda).map((h) => h.y), [20, 80], 'los dos bordes de fuera del bloque')
  assert.deepEqual(r.v.filter((v) => !v.banda).map((v) => v.x), [20.5, 200.5, 379.5], 'ninguna raya falsa dentro del bloque de color')
  assert.ok(r.v.filter((v) => v.banda).every((v) => v.y1 <= 80), 'los bordes del bloque no bajan a la tabla')
})

test('líneas: dos columnas a la misma altura no se mezclan', () => {
  const ls = agruparEnLineas([...frase('El conductor está', 20, 100), ...frase('– está bien descansado', 300, 101)], { v: [{ x: 280, y0: 0, y1: 500 }] })
  assert.deepEqual(ls.map((l) => l.texto), ['El conductor está', 'está bien descansado'])
  const juntas = agruparEnLineas([pal('físicas,', 20, 100, 18), pal('está', 110, 98, 15), pal('y', 160, 104, 15)])
  assert.deepEqual(juntas.map((l) => l.texto), ['físicas, está y'])
})

test('hoja con SÍ / NO / OBS. y rayas: preguntas, columnas, notas y espacios', () => {
  const p = analizarHoja([hojaCliente()])
  assert.deepEqual(p.preguntas.filter((q) => q.esPregunta).map((q) => q.texto), [
    'Luces delanteras funcionan', 'Nivel de aceite correcto', '¿El freno de mano sostiene la unidad?', 'Extintor cargado y vigente',
  ])
  assert.equal(p.grupos.length, 1)
  const g = p.grupos[0]
  assert.equal(g.modo, 'columnas')
  // Cada columna en el centro de su celda, en fracciones de la página.
  assert.equal(g.x.conforme, 0.62)
  assert.equal(g.x.falla, 0.68)
  assert.equal(g.x.observacion, 0.74)
  assert.deepEqual(g.notas, { x0: 0.77, x1: 0.95 })
  // La fila de cada pregunta: el centro entre sus rayas.
  assert.deepEqual(p.preguntas.map((q) => q.y), [280, 340, 400, 460].map(enFraccion))
  // «N°» es el número, no la columna NO.
  assert.ok(!Object.values(g.x).includes(0.09))
  assert.ok(p.campos.unidad && p.campos.fecha && p.campos.conductor && p.campos.firma)
  assert.ok(p.campos.unidad.x > 0.13 && Math.abs(p.campos.unidad.y - 70 / 1400) < 0.001, 'a la derecha de «Unidad:»')
  assert.equal(p.campos.observaciones, undefined, '«OBSERVACIONES» del encabezado es la columna de notas')
  assert.deepEqual(p.avisos, [])
})

test('hoja sin rayas, numerada, con una sola columna «Verificador» y títulos de sección', () => {
  const palabras = [
    ...frase('Verificador', 820, 100),
    ...frase('LUCES', 60, 160),
    ...frase('1. Luces de freno y de', 60, 200), ...frase('retroceso funcionan', 80, 225),
    ...frase('2. Direccionales funcionan', 60, 270),
    ...frase('MOTOR', 60, 330),
    ...frase('3. Nivel de aceite del motor', 60, 370),
    ...frase('HE CONFIRMADO:', 60, 420),
  ]
  const p = analizarHoja([{ ancho: 1000, alto: 1400, palabras, reglas: { h: [], v: [] } }])
  const g = p.grupos[0]
  assert.equal(g.modo, 'unica')
  const si = p.preguntas.filter((q) => q.esPregunta)
  assert.deepEqual(si.map((q) => q.texto), ['Luces de freno y de retroceso funcionan', 'Direccionales funcionan', 'Nivel de aceite del motor'])
  assert.deepEqual(si.map((q) => q.categoria), ['LUCES', 'LUCES', 'MOTOR'])
  const no = p.preguntas.filter((q) => !q.esPregunta).map((q) => q.texto)
  assert.ok(no.includes('HE CONFIRMADO:') && no.includes('LUCES'))
})

test('hoja escrita toda en MAYÚSCULAS: cada renglón sigue siendo una pregunta', () => {
  const palabras = [
    pal('SI', 700, 100), pal('NO', 780, 100),
    ...frase('LUCES DELANTERAS', 60, 160), ...frase('FRENOS DE SERVICIO', 60, 220), ...frase('NIVEL DE ACEITE', 60, 280), ...frase('CINTURONES', 60, 340),
  ]
  const p = analizarHoja([{ ancho: 1000, alto: 1400, palabras, reglas: {} }])
  assert.deepEqual(p.preguntas.filter((q) => q.esPregunta).map((q) => q.texto), ['LUCES DELANTERAS', 'FRENOS DE SERVICIO', 'NIVEL DE ACEITE', 'CINTURONES'])
})

test('sin encabezado reconocible: se supone una columna a la derecha y se avisa', () => {
  const p = analizarHoja([{ ancho: 1000, alto: 1400, palabras: [...frase('1. Revisar llantas', 60, 200), ...frase('2. Revisar frenos', 60, 260)], reglas: {} }])
  assert.equal(p.grupos[0].supuesto, true)
  assert.match(p.avisos[0], /No encontramos las columnas/u)
  assert.equal(p.preguntas.filter((q) => q.esPregunta).length, 2)
})

test('Excel: la tabla se maqueta con sus rayas y se lee igual que una foto', () => {
  const filas = [
    ['Unidad / placa:', '', 'Fecha:', '', ''],
    ['N°', 'ASPECTO A VERIFICAR', 'SI', 'NO', 'OBSERVACIONES'],
    ['', 'LUCES', '', '', ''],
    ['1', 'Luces delanteras (altas y bajas) funcionan', '', '', ''],
    ['2', 'Luces de freno funcionan', '', '', ''],
    ['Firma del conductor:', '', '', '', ''],
  ]
  const paginas = maquetarTabla(filas, { anchos: [6, 48, 5, 5, 30], combinadas: [{ s: { r: 2, c: 1 }, e: { r: 2, c: 4 } }] })
  assert.equal(paginas.length, 1)
  assert.equal(paginas[0].reglas.v.length, 6)
  // «Unidad / placa:» no cabe en la columna del número: se desborda sobre la vacía de al lado, como en Excel.
  const unidad = paginas[0].celdas.find((c) => c.renglones[0] === 'Unidad / placa:')
  assert.ok(unidad.ancho > 600)
  const p = analizarHoja(paginas)
  assert.deepEqual(p.preguntas.filter((q) => q.esPregunta).map((q) => [q.texto, q.categoria]), [
    ['Luces delanteras (altas y bajas) funcionan', 'LUCES'], ['Luces de freno funcionan', 'LUCES'],
  ])
  assert.equal(p.grupos[0].modo, 'columnas')
  assert.ok(p.grupos[0].notas)
  assert.ok(p.campos.unidad && p.campos.fecha && p.campos.firma)
})

test('PDF con texto: cada texto cae en su píxel', () => {
  // Página de 600 × 800 puntos dibujada a escala 2 (la vista voltea el eje y).
  const vista = [2, 0, 0, -2, 0, 1600]
  const [w] = palabrasDePdf([{ str: 'Luces', transform: [10, 0, 0, 10, 100, 700], width: 30, height: 10 }, { str: '  ' }], vista, 2)
  assert.equal(w.texto, 'Luces')
  assert.equal(w.x0, 200)
  assert.equal(w.x1, 260)
  assert.equal(w.y1, 200 + 4)
  assert.equal(w.y0, 200 - 16)
})

test('el papel sale de la proporción de la página', () => {
  assert.deepEqual(papelDe(1240, 1754), { papel: 'a4', orientacion: 'vertical' })
  assert.deepEqual(papelDe(1275, 1650), { papel: 'carta', orientacion: 'vertical' })
  assert.deepEqual(papelDe(1754, 1240), { papel: 'a4', orientacion: 'horizontal' })
  assert.equal(papelDe(1275, 2100).papel, 'oficio')
})

test('de la propuesta a la plantilla: solo las marcadas, texto tal cual, críticas y detalle', () => {
  const p = analizarHoja([hojaCliente()])
  p.preguntas[1].critica = true
  p.preguntas[2].detalle = 'Probar en una pendiente.'
  const f = aFormato({ codigo: 'Chequeo Diario', nombre: 'Chequeo diario', version: 2, preguntas: p.preguntas })
  assert.equal(f.code, 'chequeo-diario')
  assert.equal(f.version, 2)
  assert.deepEqual(f.items.map((i) => i.code), ['chequeo-diario.01', 'chequeo-diario.02', 'chequeo-diario.03', 'chequeo-diario.04'])
  assert.equal(f.items[2].name, '¿El freno de mano sostiene la unidad?')
  assert.equal(f.items[1].isCritical, true)
  assert.equal(f.items[2].helpText, 'Probar en una pendiente.')
  assert.equal(f.items[0].helpText, undefined)
  assert.ok(f.items.every((i) => i.category === 'General' && i.vehicleTypes.length === 0))
  assert.equal(codigoDe('  Inspección Pre-Uso #3 '), 'inspeccion-pre-uso-3')
})

test('lo que impide guardar se dice en llano', () => {
  const base = { codigo: 'x1', nombre: 'Hoja', version: 1 }
  assert.deepEqual(problemasDeLaHoja({ ...base, preguntas: [{ texto: 'Frenos', esPregunta: true }] }), [])
  assert.match(problemasDeLaHoja({ ...base, preguntas: [] })[0], /al menos una pregunta/u)
  const dobles = problemasDeLaHoja({ ...base, preguntas: [{ texto: 'Frenos.', esPregunta: true }, { texto: 'frenos', esPregunta: true }] })
  assert.match(dobles[0], /dicen lo mismo/u)
  assert.match(problemasDeLaHoja({ ...base, preguntas: [{ texto: 'a'.repeat(161), esPregunta: true }] })[0], /160/u)
  assert.equal(problemasDeLaHoja({ codigo: '', nombre: '', version: 0, preguntas: [{ texto: 'Frenos', esPregunta: true }] }).length, 3)
})

/** El mapa de la hoja de cliente, con su plantilla. */
function mapaCliente({ sinObs = false, sinNotas = false, conObservaciones = false } = {}) {
  const p = analizarHoja([hojaCliente()])
  if (sinObs) delete p.grupos[0].x.observacion
  if (sinNotas) p.grupos[0].notas = null
  if (conObservaciones) p.campos.observaciones = { pagina: 0, x: 0.05, y: 0.45, ancho: 0.5, alto: 0.03 }
  const formato = aFormato({ codigo: 'chequeo', nombre: 'Chequeo', version: 1, preguntas: p.preguntas })
  return armarMapa({ propuesta: p, formato })
}

test('el mapa guarda solo lo que se imprime, en fracciones', () => {
  const m = mapaCliente()
  assert.equal(m.formato, 1)
  assert.equal(m.codigo, 'chequeo')
  assert.equal(m.preguntas.length, 4)
  assert.equal(m.preguntas[0].codigo, 'chequeo.01')
  assert.equal(m.grupos.length, 1)
  assert.equal(m.papel, 'a4')
  for (const c of Object.values(m.campos)) for (const v of [c.x, c.y]) assert.ok(v >= 0 && v <= 1)
})

const respuestas = [
  { nombre: 'Luces delanteras funcionan', estado: 'conforme', nota: '' },
  { nombre: 'nivel de aceite  correcto', estado: 'falla', nota: 'Bajo el mínimo' },
  { nombre: '¿El freno de mano sostiene la unidad?', estado: 'observacion', nota: 'Algo flojo' },
  { nombre: 'Algo que no está en la hoja', estado: 'falla', nota: '' },
]
const inspeccion = { unidad: 'Camión 12 · ABC-123', conductor: 'Ana Pérez', fecha: '2026-10-23', respuestas }

test('colocar las marcas: cada X en la columna de su respuesta y a la altura de su fila', () => {
  const m = mapaCliente()
  const els = elementosDeHoja(m, inspeccion)
  const marcas = els.filter((e) => e.tipo === 'marca')
  assert.deepEqual(marcas.map((e) => [e.x, e.y, e.texto]), [[0.62, enFraccion(280), 'X'], [0.68, enFraccion(340), 'X'], [0.74, enFraccion(400), 'X']])
  // La nota va en la columna de notas, en su fila.
  const notas = els.filter((e) => e.nota)
  assert.deepEqual(notas.map((e) => [e.texto, e.y]), [['Bajo el mínimo', enFraccion(340)], ['Algo flojo', enFraccion(400)]])
  assert.ok(notas.every((e) => e.x > 0.77 && e.x + e.ancho < 0.95))
  // Unidad, fecha (legible) y conductor en sus espacios.
  const txt = Object.fromEntries(els.filter((e) => e.campo).map((e) => [e.campo, e.texto]))
  assert.deepEqual(txt, { unidad: 'Camión 12 · ABC-123', fecha: '23/10/2026', conductor: 'Ana Pérez' })
  // Lo que no está en la hoja no se pierde: va a una franja al pie.
  const pie = els.find((e) => e.tipo === 'pie')
  assert.match(pie.texto, /Algo que no está en la hoja: NO/u)
})

test('sin columna OBS.: la observación se marca en SÍ y su nota va a observaciones', () => {
  const m = mapaCliente({ sinObs: true, sinNotas: true, conObservaciones: true })
  const els = elementosDeHoja(m, inspeccion)
  const obs = els.find((e) => e.tipo === 'marca' && e.estado === 'observacion')
  assert.equal(obs.x, 0.62)
  const caja = els.find((e) => e.campo === 'observaciones')
  assert.equal(caja.texto, '2. Bajo el mínimo\n3. Algo flojo\nOtras respuestas: Algo que no está en la hoja: NO')
  assert.ok(!els.some((e) => e.tipo === 'pie'))
})

test('una sola columna: se escribe SÍ, OBS. o NO, y con ✓ si se eligió', () => {
  const m = mapaCliente()
  m.grupos[0] = { ...m.grupos[0], modo: 'unica', x: { unica: 0.7 } }
  const marcas = elementosDeHoja(m, inspeccion).filter((e) => e.tipo === 'marca')
  assert.deepEqual(marcas.map((e) => e.texto), ['SÍ', 'NO', 'OBS.'])
  assert.ok(marcas.every((e) => e.x === 0.7 && e.palabra))
  const conCheck = { ...mapaCliente(), marca: 'check' }
  assert.equal(elementosDeHoja(conCheck, inspeccion).find((e) => e.tipo === 'marca').texto, '✓')
})

test('la página impresa: la hoja a página completa, las marcas encima y su @page sin márgenes', () => {
  const m = mapaCliente()
  const html = htmlHojaEmpresa({ mapa: m, paginas: ['https://ejemplo/hoja-1.jpg'] }, inspeccion)
  assert.equal((html.match(/class="he-pagina"/gu) ?? []).length, 1)
  assert.match(html, /page:he-a4-v;width:210mm/u)
  assert.match(html, /<img class="he-fondo" alt="" src="https:\/\/ejemplo\/hoja-1.jpg" \/>/u)
  assert.match(html, /left:62%;top:20%/u)
  assert.match(html, /Ana Pérez/u)
  assert.doesNotMatch(htmlHojaEmpresa({ mapa: m, paginas: ['x'] }, { ...inspeccion, conductor: '<b>x</b>' }), /<b>x<\/b>/u)
  assert.match(estiloHojaEmpresa(), /@page he-carta-v \{ size: 215.9mm 279.4mm; margin: 0; \}/u)
  // La muestra de «Imprimir una de prueba» trae una observación y una falla.
  const muestra = muestraDeInspeccion(m, new Date(2026, 9, 23))
  assert.deepEqual(muestra.respuestas.map((r) => r.estado), ['conforme', 'conforme', 'observacion', 'falla'])
  assert.equal(muestra.fecha, '2026-10-23')
})

test('imprimir varias: la que tiene hoja sale sobre ella, la otra con la planilla de siempre', async () => {
  const m = mapaCliente()
  const lista = [
    { id: 'a', plantilla: 'Chequeo', vehiculoNombre: 'Camión 12', conductorNombre: 'Ana', fecha: '2026-10-23' },
    { id: 'b', plantilla: 'Chequeo', vehiculoNombre: 'Camión 14', conductorNombre: 'Luis', fecha: '2026-10-22' },
    { id: 'c', plantilla: 'Otra', vehiculoNombre: 'Moto 3', conductorNombre: 'Eva', fecha: '2026-10-22' },
  ]
  const pedidas = []
  const html = await armarPlanillas(lista, {
    leerRespuestas: async () => respuestas.map((r) => ({ ...r, estadoItem: r.estado })),
    leerHoja: async (formato) => { pedidas.push(formato); return formato === 'Chequeo' ? { mapa: m, paginas: ['hoja.jpg'] } : null },
    sobreHoja: sobreHoja(),
  })
  assert.deepEqual(pedidas, ['Chequeo', 'Otra'], 'una lectura por formato')
  assert.equal((html.match(/class="he-pagina"/gu) ?? []).length, 2)
  assert.equal((html.match(/<section class="hoja">/gu) ?? []).length, 1)
  assert.match(html, /@page he-carta-v/u)
  // Sin hoja guardada, todo como siempre.
  const comoSiempre = await armarPlanillas(lista.slice(0, 1), { leerRespuestas: async () => [], leerHoja: async () => null, sobreHoja: sobreHoja() })
  assert.doesNotMatch(comoSiempre, /he-pagina|@page he-/u)
  // Si leer la hoja falla, sale la planilla de siempre.
  const conError = await armarPlanillas(lista.slice(0, 1), { leerRespuestas: async () => [], leerHoja: async () => { throw new Error('sin red') }, sobreHoja: sobreHoja() })
  assert.match(conError, /<section class="hoja">/u)
})

// --- Almacenes ---------------------------------------------------------------

function localStorageEnMemoria() {
  const datos = new Map()
  return { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)), removeItem: (k) => datos.delete(k), datos }
}

let modulo = null
async function cargarAlmacenes() {
  if (modulo) return modulo
  globalThis.localStorage = localStorageEnMemoria()
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify('') },
    build: { write: false, lib: { entry: join(raiz, 'src/panel/datos/hojasEmpresa.js'), formats: ['es'], fileName: 'm' } },
  })
  modulo = await import('data:text/javascript;base64,' + Buffer.from(salida[0].output[0].code).toString('base64'))
  return modulo
}

test('almacén local (demo): guarda la hoja y la encuentra por código y versión', async () => {
  const { crearAlmacenLocal, plantillaDeNombre } = await cargarAlmacenes()
  const ls = localStorageEnMemoria()
  const a = crearAlmacenLocal(ls)
  const mapa = mapaCliente()
  assert.deepEqual(await a.guardar({ empresa: 'emp-1', codigo: 'chequeo', version: 1, nombre: 'Chequeo', paginas: ['data:image/jpeg;base64,AAA'], mapa }), { donde: 'local', provisional: false })
  const leida = await a.leer({ empresa: 'emp-1', codigo: 'chequeo', version: 1 })
  assert.deepEqual(leida.mapa, mapa)
  assert.equal(await a.leer({ empresa: 'emp-2', codigo: 'chequeo', version: 1 }), null, 'cada empresa la suya')
  assert.deepEqual(a.indice('emp-1').map((e) => [e.codigo, e.version]), [['chequeo', 1]])
  const lleno = crearAlmacenLocal({ getItem: () => null, setItem: () => { throw new Error('QuotaExceeded') } })
  await assert.rejects(lleno.guardar({ empresa: 'e', codigo: 'c', version: 1, nombre: 'n', paginas: ['x'], mapa }), /No cabe la hoja/u)
  // Para imprimir se elige la publicada y, entre iguales, la versión más alta.
  const lista = [{ nombre: 'Chequeo', codigo: 'chequeo', version: 3, estado: 'borrador' }, { nombre: 'Chequeo', codigo: 'chequeo', version: 2, estado: 'publicada' }, { nombre: 'Chequeo', codigo: 'chequeo', version: 1, estado: 'archivada' }]
  assert.equal(plantillaDeNombre(lista, 'Chequeo').version, 2)
})

/** Cloudinary simulado: imágenes por `subir`, mapa raw por `pedir`. Nada sale a la red. */
function nubeSimulada({ rawPermitido = true } = {}) {
  const raw = new Map()
  const llamadas = []
  const pedir = async (url, opts = {}) => {
    llamadas.push([opts.method || 'GET', url])
    if (opts.method === 'POST') {
      if (!rawPermitido) return new Response(JSON.stringify({ error: { message: 'Upload preset does not allow raw' } }), { status: 400 })
      const id = opts.body.get('public_id')
      raw.set(`https://res.cloudinary.com/nube/raw/upload/${id}`, await opts.body.get('file').text())
      return new Response(JSON.stringify({ public_id: id }), { status: 200 })
    }
    const hay = raw.get(url)
    return new Response(hay ?? 'no', { status: hay ? 200 : 404 })
  }
  let n = 0
  const subidas = []
  const subir = async (archivo, { publicId }) => { n += 1; subidas.push(publicId); return `https://res.cloudinary.com/nube/image/upload/${publicId}/${n}` }
  const vigente = async (base) => `${base}/${n}`
  return { pedir, subir, vigente, raw, llamadas, subidas }
}

test('almacén Cloudinary: cada página en fom/hoja/<empresa>/<codigo>-v<version>/<n> y el mapa como raw', async () => {
  const { crearAlmacenCloudinary, crearAlmacenLocal } = await cargarAlmacenes()
  const s = nubeSimulada()
  const local = crearAlmacenLocal(localStorageEnMemoria())
  const a = crearAlmacenCloudinary({ nube: 'nube', preset: 'sin-firma', ...s, local, urlImagen: (id) => `img:${id}`, archivo: async (x) => x })
  const mapa = mapaCliente()
  const r = await a.guardar({ empresa: 'emp 1', codigo: 'chequeo', version: 1, nombre: 'Chequeo', paginas: ['p1', 'p2'], mapa })
  assert.deepEqual(r, { donde: 'cloudinary', provisional: false })
  assert.deepEqual(s.subidas, ['fom/hoja/emp-1/chequeo-v1', 'fom/hoja/emp-1/chequeo-v1'])
  assert.deepEqual([...s.raw.keys()], ['https://res.cloudinary.com/nube/raw/upload/fom/hoja/emp-1/chequeo-v1/mapa/1.json'])
  const leida = await a.leer({ empresa: 'emp 1', codigo: 'chequeo', version: 1 })
  assert.deepEqual(leida.paginas, ['img:fom/hoja/emp-1/chequeo-v1/1', 'img:fom/hoja/emp-1/chequeo-v1/2'])
  assert.equal(leida.mapa.preguntas.length, 4)
  // Volver a guardar no pisa nada: el mapa siguiente es el 2.
  await a.guardar({ empresa: 'emp 1', codigo: 'chequeo', version: 1, nombre: 'Chequeo', paginas: ['p1'], mapa })
  assert.ok(s.raw.has('https://res.cloudinary.com/nube/raw/upload/fom/hoja/emp-1/chequeo-v1/mapa/2.json'))
})

test('almacén Cloudinary sin raw: las imágenes suben y el mapa queda aquí, provisional', async () => {
  const { crearAlmacenCloudinary, crearAlmacenLocal } = await cargarAlmacenes()
  const s = nubeSimulada({ rawPermitido: false })
  const local = crearAlmacenLocal(localStorageEnMemoria())
  const a = crearAlmacenCloudinary({ nube: 'nube', preset: 'sin-firma', ...s, local, urlImagen: (id) => `img:${id}`, archivo: async (x) => x })
  const r = await a.guardar({ empresa: 'e', codigo: 'chequeo', version: 1, nombre: 'Chequeo', paginas: ['p1'], mapa: mapaCliente() })
  assert.equal(r.provisional, true)
  assert.match(r.motivo, /does not allow raw/u)
  const leida = await a.leer({ empresa: 'e', codigo: 'chequeo', version: 1 })
  assert.equal(leida.provisional, true)
  assert.deepEqual(leida.paginas, ['img:fom/hoja/e/chequeo-v1/1'])
})
