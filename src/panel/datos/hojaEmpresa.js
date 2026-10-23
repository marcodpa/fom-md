// ============================================================
// LA HOJA DE TU EMPRESA (lógica pura)
// ------------------------------------------------------------
// Cada empresa tiene su planilla de inspección en papel. Se sube en blanco
// (foto, escaneo, PDF o Excel); de ahí salen las preguntas TAL COMO ESTÁN
// ESCRITAS y un «mapa» de dónde va cada respuesta. Al imprimir una
// inspección, la hoja sale con las marcas puestas en su sitio.
//
// Aquí vive todo lo que no necesita el navegador:
//  · encontrar las reglas (líneas) de la tabla en la imagen;
//  · agrupar las palabras leídas en líneas;
//  · detectar el encabezado de las respuestas: columnas SÍ / NO / OBS. (o
//    B / R / M), o una sola columna donde se escribe la respuesta
//    («Verificador», «Resultado»…);
//  · las filas de preguntas y los espacios de unidad, fecha, conductor,
//    observaciones y firma;
//  · convertir lo elegido en una plantilla de inspección y en el mapa;
//  · colocar las respuestas de una inspección sobre la hoja e imprimirla.
//
// Medidas: lo leído llega en PÍXELES de cada página; el mapa guarda
// FRACCIONES (0–1) del ancho y del alto, para imprimir igual en cualquier
// tamaño de papel.
//
// Sin importaciones a propósito: lo prueba `node --test` tal cual.
// ============================================================

/** Versión del formato del mapa: si cambia su forma, se sabe qué se guardó. */
export const VERSION_MAPA = 1

/** Los campos sueltos de la hoja, en el orden en que se piden. */
export const CAMPOS = ['unidad', 'fecha', 'conductor', 'observaciones', 'firma']
export const NOMBRE_CAMPO = {
  unidad: 'Unidad / placa',
  fecha: 'Fecha',
  conductor: 'Conductor',
  observaciones: 'Observaciones',
  firma: 'Firma',
}

/** Papeles conocidos, en milímetros (ancho × alto en vertical). */
export const PAPELES = {
  a4: { nombre: 'A4', mm: [210, 297] },
  carta: { nombre: 'Carta', mm: [215.9, 279.4] },
  oficio: { nombre: 'Oficio', mm: [215.9, 355.6] },
}

// --- Texto ----------------------------------------------------------------

/** Sin acentos ni mayúsculas, para comparar lo que se lee. */
export const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase()
const ficha = (t) => plano(t).replace(/[^a-z0-9/]+/gu, '')
const letras = (t) => (String(t ?? '').match(/\p{L}/gu) ?? []).length
const mediana = (xs) => {
  if (!xs.length) return 0
  const o = [...xs].sort((a, b) => a - b)
  return o[Math.floor(o.length / 2)]
}

/** Llave para cruzar una respuesta con su pregunta por el texto: sin acentos, mayúsculas ni espacios de más. */
export const llavePregunta = (t) => plano(t).replace(/[^a-z0-9]+/gu, ' ').trim()

// «1.», «1)», «(1)», «1-», «a)», viñetas…
const NUMERACION = /^\s*(?:\(?\d{1,3}\s*[.)\]:\-–]?|[•·▪●○◦\-–—*]|[a-z]\))\s+/iu

/**
 * El texto de una pregunta como está en la hoja, sin lo que no es suyo: el
 * número o la viñeta del principio, la basura del lector (el círculo del
 * número leído como «@» o «©»), los cortes de palabra con guion al final de
 * la línea y los espacios de más. Nada más se toca.
 */
export function limpiarPregunta(texto) {
  let t = String(texto ?? '').replace(/\s+/gu, ' ').trim()
  // Palabra cortada al final de una línea: «verifica- ción» → «verificación».
  t = t.replace(/(\p{Ll})[-‐] (\p{Ll})/gu, '$1$2')
  for (let vuelta = 0; vuelta < 3; vuelta += 1) {
    const antes = t
    t = t.replace(/^[^\p{L}\p{N}¿¡«"(]+/u, '')
    t = t.replace(NUMERACION, '')
    // Un signo suelto antes de una mayúscula («o Se ha…», «® El…»): era el círculo del número.
    // Una frase de verdad no empieza así («A los…» sigue en minúscula).
    t = t.replace(/^(?:\S\s+)+(?=\p{Lu}\p{Ll})/u, '')
    t = t.replace(/^\d{1,3}\s+(?=\p{L})/u, '')
    if (t === antes) break
  }
  return t.replace(/\s+([.,;:])/gu, '$1').trim()
}

/** Une las líneas de una celda en un texto: respeta el corte con guion. */
function unirLineas(lineas) {
  return lineas.map((l) => l.texto.trim()).filter(Boolean).join(' ')
}

const esMayusculas = (t) => letras(t) >= 3 && t === t.toLocaleUpperCase('es') && t !== t.toLocaleLowerCase('es')

// --- Reglas de la tabla ---------------------------------------------------

/**
 * La luminosidad por debajo de la cual un punto es tinta: un poco por debajo
 * del papel (el 90 % más claro), para que un escaneo grisáceo no se lea
 * entero como tinta.
 */
export function umbralDeTinta(gris) {
  const hist = new Uint32Array(256)
  const paso = Math.max(1, Math.floor(gris.length / 200000))
  let n = 0
  for (let i = 0; i < gris.length; i += paso) { hist[gris[i]] += 1; n += 1 }
  let acum = 0
  let papel = 255
  for (let v = 0; v < 256; v += 1) {
    acum += hist[v]
    if (acum >= n * 0.9) { papel = v; break }
  }
  return Math.max(60, Math.round(papel * 0.78))
}

/** Las corridas de tinta de una tira de al menos `minimo` puntos, tolerando huecos de `hueco` (un escaneo corta las rayas). */
function corridas(leer, largo, umbral, hueco, minimo) {
  const salida = []
  let inicio = -1
  let ultimo = -1
  for (let i = 0; i < largo; i += 1) {
    if (leer(i) >= umbral) continue
    if (inicio < 0 || i - ultimo > hueco + 1) {
      if (inicio >= 0 && ultimo - inicio + 1 >= minimo) salida.push({ a: inicio, b: ultimo })
      inicio = i
    }
    ultimo = i
  }
  if (inicio >= 0 && ultimo - inicio + 1 >= minimo) salida.push({ a: inicio, b: ultimo })
  return salida
}

/**
 * Junta las corridas de tiras vecinas que van a la par: una raya gruesa son
 * varias tiras; un bloque de color, muchas. Del bloque cuentan sus bordes.
 */
function agruparTiras(tiras, grosorMax) {
  const grupos = []
  for (const t of tiras) {
    const g = grupos.find((x) => {
      const u = x.at(-1)
      return u.i === t.i - 1 && Math.min(u.b, t.b) - Math.max(u.a, t.a) >= Math.min(u.b - u.a, t.b - t.a) * 0.5
    })
    if (g) g.push(t)
    else grupos.push([t])
  }
  const reglas = []
  for (const g of grupos) {
    const a = g[0]
    const b = g.at(-1)
    if (g.length <= grosorMax) {
      reglas.push({ pos: (a.i + b.i) / 2, a: Math.min(...g.map((x) => x.a)), b: Math.max(...g.map((x) => x.b)), banda: null, grosor: g.length })
    } else {
      const id = `${a.i}-${b.i}`
      reglas.push({ pos: a.i, a: a.a, b: a.b, banda: id, lado: -1 })
      reglas.push({ pos: b.i, a: b.a, b: b.b, banda: id, lado: 1 })
    }
  }
  return reglas
}

/**
 * Las rayas de la tabla en una imagen en grises (`gris`: un byte por punto,
 * fila por fila). Horizontales: corridas de tinta de al menos el 20 % del
 * ancho; verticales: de al menos el 6 % del alto. El texto no llega a eso.
 * Devuelve { h: [{ y, x0, x1, banda }], v: [{ x, y0, y1, banda }] } en píxeles.
 */
export function buscarReglas(gris, ancho, alto, opciones = {}) {
  const umbral = opciones.umbral ?? umbralDeTinta(gris)
  const hueco = opciones.hueco ?? 2
  const grosorMax = Math.max(4, Math.round(Math.max(ancho, alto) * 0.003))
  const minH = Math.max(12, Math.round(ancho * (opciones.minLargoH ?? 0.2)))
  const minV = Math.max(12, Math.round(alto * (opciones.minLargoV ?? 0.06)))
  const filas = []
  for (let y = 0; y < alto; y += 1) {
    const base = y * ancho
    for (const c of corridas((x) => gris[base + x], ancho, umbral, hueco, minH)) filas.push({ i: y, ...c })
  }
  const columnas = []
  for (let x = 0; x < ancho; x += 1) {
    for (const c of corridas((y) => gris[y * ancho + x], alto, umbral, hueco, minV)) columnas.push({ i: x, ...c })
  }
  // Dentro de un bloque de color (texto blanco sobre fondo oscuro) las letras parten el bloque en
  // rayas falsas. Una raya de verdad tiene papel a los dos lados; el borde de un bloque, por fuera.
  const tinta = (x, y) => x >= 0 && y >= 0 && x < ancho && y < alto && gris[y * ancho + x] < umbral
  const clara = (r, punto) => {
    const d = (r.banda ? 2 : Math.ceil((r.grosor ?? 1) / 2) + 2)
    let oscuro = 0
    const n = 24
    for (let k = 0; k < n; k += 1) {
      const t = Math.round(r.a + ((r.b - r.a) * k) / (n - 1))
      const fuera = r.banda ? punto(t, Math.round(r.pos) + r.lado * d) : punto(t, Math.round(r.pos) - d) && punto(t, Math.round(r.pos) + d)
      if (fuera) oscuro += 1
    }
    return oscuro <= n * 0.5
  }
  const h = agruparTiras(filas, grosorMax).filter((r) => clara(r, (x, y) => tinta(x, y)))
  const v = agruparTiras(columnas, grosorMax).filter((r) => clara(r, (y, x) => tinta(x, y)))
  return {
    h: h.map((r) => ({ y: r.pos, x0: r.a, x1: r.b, banda: r.banda, ...(r.banda ? { lado: r.lado } : {}) })).sort((p, q) => p.y - q.y),
    v: v.map((r) => ({ x: r.pos, y0: r.a, y1: r.b, banda: r.banda })).sort((p, q) => p.x - q.x),
  }
}

// --- Palabras y líneas ----------------------------------------------------

/**
 * Agrupa las palabras de UNA página en líneas: mismas alturas, y cortadas
 * donde hay una raya vertical de la tabla o un hueco grande (otra columna).
 * Cada palabra: { texto, x0, y0, x1, y1 } en píxeles.
 */
export function agruparEnLineas(palabras, reglas = {}) {
  const verticales = reglas.v ?? []
  const ps = (palabras ?? [])
    // Una raya de la tabla leída como letra («|», «[»…) no es texto.
    .filter((p) => String(p.texto ?? '').trim() && !/^[|¦[\]{}_—–-]+$/u.test(String(p.texto).trim()) && p.x1 > p.x0 && p.y1 > p.y0)
    .map((p) => ({ ...p, texto: String(p.texto).trim(), yc: (p.y0 + p.y1) / 2, h: p.y1 - p.y0 }))
    .sort((a, b) => a.yc - b.yc)
  const cerca = (b, p) => Math.abs(b.yc - p.yc) <= Math.min(b.h, p.h) * 0.55
  const sumar = (b, qs) => {
    b.ps.push(...qs)
    b.yc = b.ps.reduce((s, q) => s + q.yc, 0) / b.ps.length
    b.h = mediana(b.ps.map((q) => q.h))
  }
  let bandas = []
  for (const p of ps) {
    // La banda más cercana (no la primera que sirva): dos columnas de la tabla a la misma altura
    // no deben repartirse las palabras de un mismo renglón.
    let destino = null
    for (let k = bandas.length - 1; k >= Math.max(0, bandas.length - 12); k -= 1) {
      const b = bandas[k]
      if (cerca(b, p) && (!destino || Math.abs(b.yc - p.yc) < Math.abs(destino.yc - p.yc))) destino = b
    }
    if (destino) sumar(destino, [p])
    else bandas.push({ yc: p.yc, h: p.h, ps: [p] })
  }
  // Dos bandas que quedaron a la misma altura son una sola.
  bandas.sort((a, b) => a.yc - b.yc)
  bandas = bandas.reduce((acc, b) => {
    const u = acc.at(-1)
    if (u && cerca(u, b)) sumar(u, b.ps)
    else acc.push(b)
    return acc
  }, [])
  const lineas = []
  for (const b of bandas) {
    const orden = [...b.ps].sort((x, y) => x.x0 - y.x0)
    let actual = [orden[0]]
    const corta = (a, c) => {
      if (c.x0 - a.x1 > b.h * 1.6) return true
      const yc = (a.yc + c.yc) / 2
      return verticales.some((r) => r.x > (a.x0 + a.x1) / 2 && r.x < (c.x0 + c.x1) / 2 && r.y0 <= yc && r.y1 >= yc)
    }
    for (let i = 1; i < orden.length; i += 1) {
      if (corta(orden[i - 1], orden[i])) { lineas.push(lineaDe(actual)); actual = [] }
      actual.push(orden[i])
    }
    lineas.push(lineaDe(actual))
  }
  return lineas.sort((a, b) => a.yc - b.yc || a.x0 - b.x0)
}

function lineaDe(ps) {
  const x0 = Math.min(...ps.map((p) => p.x0))
  const x1 = Math.max(...ps.map((p) => p.x1))
  const y0 = Math.min(...ps.map((p) => p.y0))
  const y1 = Math.max(...ps.map((p) => p.y1))
  return { texto: ps.map((p) => p.texto).join(' '), palabras: ps, x0, x1, y0, y1, xc: (x0 + x1) / 2, yc: (y0 + y1) / 2, h: y1 - y0 }
}

// --- Encabezado de las respuestas ----------------------------------------

/** Lo que dice el encabezado de cada columna de marcas. */
const MARCAS = {
  conforme: new Set(['si', 's', 'c', 'cumple', 'conforme', 'ok', 'b', 'bueno', 'bien', 'yes', 'bueno/a']),
  falla: new Set(['no', 'n', 'nc', 'n/c', 'nocumple', 'noconforme', 'm', 'malo', 'mal']),
  observacion: new Set(['obs', 'ob', 'observ', 'r', 'regular', 'observacion']),
  na: new Set(['na', 'n/a', 'noaplica']),
}
const tipoDeMarca = (t) => Object.keys(MARCAS).find((k) => MARCAS[k].has(t)) ?? null

/** Una sola columna donde se escribe la respuesta. */
const UNICA = /^(verificador|verificacion|resultado|estado|condicion|evaluacion|chequeo|check|cumple\s*\?)/u
/** Una columna para escribir notas. */
const NOTAS = /^(observaciones|comentarios|notas|novedades)\b/u
/** Lo que corta la tabla de preguntas por abajo. */
const PIE = /^(firma|firmas|signatura|nombre y firma|elaborado|revisado|aprobado|detengase|observaciones generales|observaciones\s*:)/u
/** Encabezados de la columna de preguntas que no son una categoría. */
const GENERICO = /^(item|items|n|no|nro|n°|descripcion|aspecto|aspectos|elemento|elementos|concepto|puntos?|revision|preguntas?|actividad|confirme|verifique|he confirmado)/u

/** Las marcas que hay en una línea del encabezado, o [] si la línea no es eso. */
function marcasDeLinea(l) {
  // «N°», «Nº», «No.», «#» encabezan la columna del número, no la del NO.
  if (/^\s*(n\s*[°º.]|#|nro\b|num)/iu.test(l.texto)) return []
  const entera = tipoDeMarca(ficha(l.texto))
  if (entera && entera !== 'na') return [{ tipo: entera, x0: l.x0, x1: l.x1, y0: l.y0, y1: l.y1, xc: l.xc, yc: l.yc, linea: l }]
  if (l.palabras.length > 4) return []
  const tipos = l.palabras.map((p) => tipoDeMarca(ficha(p.texto)))
  if (tipos.some((t) => !t)) return []
  return l.palabras.map((p, i) => ({ tipo: tipos[i], x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1, xc: (p.x0 + p.x1) / 2, yc: (p.y0 + p.y1) / 2, linea: l }))
    .filter((m) => m.tipo !== 'na')
}

/** La celda (entre dos rayas verticales) que contiene un punto, o null. */
function celdaDe(x, y, verticales, anchoMax) {
  const cruzan = verticales.filter((r) => r.y0 <= y + 2 && r.y1 >= y - 2)
  const izq = cruzan.filter((r) => r.x < x).sort((a, b) => b.x - a.x)[0]
  const der = cruzan.filter((r) => r.x > x).sort((a, b) => a.x - b.x)[0]
  if (!izq || !der || der.x - izq.x > anchoMax) return null
  return { x0: izq.x, x1: der.x }
}

/**
 * Los encabezados de respuesta de una página. Puede haber varios (una tabla
 * por sección): cada uno manda sobre las filas que tiene debajo.
 */
function buscarEncabezados(lineas, reglas, ancho, alto, hAlto) {
  const hits = []
  for (const l of lineas) {
    // Las respuestas se marcan a la derecha de las preguntas: lo de la izquierda no es encabezado de marcas.
    const marcas = marcasDeLinea(l).filter((m) => m.xc > ancho * 0.3)
    if (marcas.length) { hits.push(...marcas); continue }
    // La columna donde se escribe la respuesta está a la derecha de la tabla: así no se confunde con
    // una pregunta que empieza por «Condiciones…» ni con la etiqueta «Resultado» de la cabecera.
    const p = plano(l.texto).trim()
    if (l.xc < ancho * 0.55) continue
    if (p.length <= 40 && UNICA.test(p)) hits.push({ tipo: 'unica', x0: l.x0, x1: l.x1, y0: l.y0, y1: l.y1, xc: l.xc, yc: l.yc, linea: l })
    else if (p.length <= 30 && NOTAS.test(p)) hits.push({ tipo: 'notas', x0: l.x0, x1: l.x1, y0: l.y0, y1: l.y1, xc: l.xc, yc: l.yc, linea: l })
  }
  hits.sort((a, b) => a.yc - b.yc)
  const grupos = []
  for (const h of hits) {
    const g = grupos.at(-1)
    if (g && h.yc - g.at(-1).yc <= hAlto * 2.2) g.push(h)
    else grupos.push([h])
  }
  const encabezados = []
  for (const g of grupos) {
    const tipos = new Set(g.map((h) => h.tipo))
    const modo = tipos.has('conforme') && tipos.has('falla') ? 'columnas' : tipos.has('unica') ? 'unica' : null
    if (!modo) continue
    const usadas = g.filter((h) => (modo === 'columnas' ? h.tipo !== 'unica' : h.tipo === 'unica' || h.tipo === 'notas'))
    const x = {}
    let notas = null
    let izquierda = Infinity
    const yUltimo = Math.max(...g.map((h) => h.y1))
    for (const h of usadas) {
      // En un encabezado de color no se ven las rayas: se toma la celda de la fila de abajo.
      const celda = celdaDe(h.xc, h.yc, reglas.v, ancho * 0.4) ?? celdaDe(h.xc, yUltimo + hAlto * 3, reglas.v, ancho * 0.4)
      const x0 = celda?.x0 ?? h.x0 - hAlto * 0.6
      const x1 = celda?.x1 ?? h.x1 + hAlto * 0.6
      if (h.tipo === 'notas') {
        // «Observación» angosta entre SÍ y NO es una marca; ancha, es para escribir.
        if (modo === 'columnas' && x1 - x0 < ancho * 0.1 && !x.observacion) x.observacion = (x0 + x1) / 2
        else if (!notas) notas = { x0, x1 }
      } else if (x[h.tipo] == null) x[h.tipo] = (x0 + x1) / 2
      izquierda = Math.min(izquierda, x0)
    }
    if (modo === 'columnas' && x.observacion == null && tipos.has('observacion')) {
      const o = g.find((h) => h.tipo === 'observacion')
      x.observacion = o.xc
    }
    const yIni = Math.min(...g.map((h) => h.y0))
    const yUlt = Math.max(...g.map((h) => h.y1))
    // El encabezado termina en la primera raya debajo de sus títulos; sin rayas, una línea más abajo.
    const raya = (reglas.h ?? []).filter((r) => r.y > yUlt - 1 && r.y < yUlt + alto * 0.08 && r.x0 <= izquierda && r.x1 >= izquierda)
      .sort((a, b) => a.y - b.y)[0]
    encabezados.push({ modo, x, notas, yIni, yFin: raya ? raya.y : yUlt + hAlto * 0.4, izquierda, titulos: g.map((h) => h.linea) })
  }
  return encabezados
}

// --- Filas de preguntas ---------------------------------------------------

/** Las columnas de texto a la izquierda de las respuestas: la de las preguntas y la del detalle. */
function columnaDePreguntas(lineas, reglas, ancho, yIni, yFin, izquierda) {
  const alto = yFin - yIni
  const xs = (reglas.v ?? [])
    .filter((r) => r.x < izquierda - 2 && Math.min(r.y1, yFin) - Math.max(r.y0, yIni) >= alto * 0.6)
    .map((r) => r.x)
    .sort((a, b) => a - b)
  const conLetras = lineas.filter((l) => letras(l.texto) >= 2)
  if (xs.length) {
    const bordes = [-Infinity, ...xs, izquierda]
    const celdas = []
    for (let i = 0; i < bordes.length - 1; i += 1) {
      const a = bordes[i]
      const b = bordes[i + 1]
      celdas.push({ a, b, n: conLetras.filter((l) => l.xc > a && l.xc < b).length })
    }
    const max = Math.max(...celdas.map((c) => c.n))
    const elegida = celdas.find((c) => c.n > 0 && c.n >= max * 0.3)
    if (elegida) return { a: elegida.a, b: elegida.b }
  }
  if (!conLetras.length) return { a: -Infinity, b: izquierda }
  const minX = Math.min(...conLetras.map((l) => l.x0))
  // Sin rayas: la columna de preguntas es la que empieza más a la izquierda; lo que empieza bastante más a la derecha es detalle.
  const otras = conLetras.filter((l) => l.x0 > minX + ancho * 0.08).map((l) => l.x0)
  return { a: -Infinity, b: otras.length >= 2 ? Math.min(...otras) - 1 : izquierda }
}

const empiezaConNumero = (t) => /^\s*\(?\d{1,3}\s*[.)\]:\-–]?\s+\S/u.test(t) || /^\s*[•·▪●\-–—*]\s+\S/u.test(t)

/** Corta las líneas de la columna de preguntas en filas: por las rayas, por la numeración o por los huecos. */
function filasDePreguntas(lineasPregunta, reglas, yIni, yFin, columna, izquierda, hAlto, todoMayusculas = false) {
  const ordenadas = [...lineasPregunta].sort((a, b) => a.yc - b.yc)
  if (!ordenadas.length) return []
  const xRef = Number.isFinite(columna.a) ? columna.a : Math.min(...ordenadas.map((l) => l.x0))
  const rayas = (reglas.h ?? [])
    .filter((r) => r.y > yIni - 3 && r.y < yFin + 3 && r.x0 <= xRef + hAlto * 2 && r.x1 >= Math.min(izquierda, columna.b) - hAlto)
    .map((r) => r.y)
    .sort((a, b) => a - b)
  const numeradas = ordenadas.filter((l) => empiezaConNumero(l.texto)).length >= 2
  // Un título de sección («MOTOR») o una etiqueta («HE CONFIRMADO:») va sola: no es la continuación de la pregunta de arriba.
  const suelta = (l) => (!todoMayusculas && esMayusculas(l.texto) && l.texto.length <= 40) || /:\s*$/u.test(l.texto)
  const porNumeracion = (ls) => {
    const filas = []
    let cerrada = true
    for (const l of ls) {
      if (cerrada || empiezaConNumero(l.texto) || suelta(l)) filas.push([l])
      else filas.at(-1).push(l)
      cerrada = suelta(l)
    }
    return filas
  }
  const filas = []
  if (rayas.length >= 2) {
    const cortes = [...new Set([yIni, ...rayas, yFin].map((y) => Math.round(y)))].sort((a, b) => a - b)
    for (let i = 0; i < cortes.length - 1; i += 1) {
      const a = cortes[i]
      const b = cortes[i + 1]
      if (b - a < hAlto * 0.6) continue
      const dentro = ordenadas.filter((l) => l.yc > a && l.yc < b)
      if (!dentro.length) continue
      const partes = numeradas && dentro.filter((l) => empiezaConNumero(l.texto)).length >= 2 ? porNumeracion(dentro) : [dentro]
      if (partes.length === 1) filas.push({ lineas: dentro, y0: a, y1: b })
      else partes.forEach((p) => filas.push({ lineas: p, y0: Math.min(...p.map((l) => l.y0)), y1: Math.max(...p.map((l) => l.y1)) }))
    }
    return filas
  }
  const grupos = numeradas ? porNumeracion(ordenadas) : []
  if (!numeradas) {
    for (const l of ordenadas) {
      const prev = grupos.at(-1)?.at(-1)
      if (!prev || l.y0 - prev.y1 > hAlto * 0.7 || suelta(l) || suelta(prev)) grupos.push([l])
      else grupos.at(-1).push(l)
    }
  }
  for (const g of grupos) filas.push({ lineas: g, y0: Math.min(...g.map((l) => l.y0)), y1: Math.max(...g.map((l) => l.y1)) })
  return filas
}

// --- Espacios sueltos: unidad, fecha, conductor, observaciones, firma ----

const ETIQUETA = {
  unidad: /^(unidad|n[°º]?\s*de\s*unidad|vehiculo|placa|equipo|camion|matricula|ficha)\b/u,
  fecha: /^fecha\b/u,
  conductor: /^(conductor|chofer|operador|nombre del conductor|conducido por)\b/u,
  observaciones: /^(observaciones|observacion|comentarios|novedades)\b/u,
  firma: /^(firma|signatura|firmado)\b/u,
}

/** Dónde se escribe lo de una etiqueta: a su derecha si hay sitio; si no, en la celda de abajo; si no, justo debajo. */
function lugarDeCampo(campo, l, lineas, reglas, ancho, alto, hAlto) {
  const verticales = reglas.v ?? []
  const vecina = lineas.filter((o) => o !== l && Math.abs(o.yc - l.yc) < hAlto * 0.6 && o.x0 > l.x1).sort((a, b) => a.x0 - b.x0)[0]
  const raya = verticales.filter((r) => r.x > l.x1 + 2 && r.y0 <= l.yc && r.y1 >= l.yc).sort((a, b) => a.x - b.x)[0]
  const tope = Math.min(vecina?.x0 ?? ancho * 0.97, raya?.x ?? ancho * 0.97)
  const derecha = tope - l.x1
  const debajo = (() => {
    const hs = (reglas.h ?? []).filter((r) => r.x0 <= l.xc && r.x1 >= l.xc).sort((a, b) => a.y - b.y)
    const r1 = hs.find((r) => r.y > l.y1 - 2 && r.y < l.y1 + hAlto * 2.5)
    // Si debajo empieza un bloque de color, ahí no se escribe.
    if (!r1 || r1.lado === -1) return null
    const r2 = hs.find((r) => r.y > r1.y + hAlto && !(r1.banda && r.banda === r1.banda))
    if (!r2 || r2.y - r1.y > alto * 0.12) return null
    // La celda de abajo no puede tener ya texto: sería otra cosa.
    if (lineas.some((o) => o.yc > r1.y && o.yc < r2.y && o.x1 > l.x0 - hAlto && o.x0 < l.x1 + hAlto * 4)) return null
    const celda = celdaDe(l.xc, (r1.y + r2.y) / 2, verticales, ancho * 0.6)
    return { x: (celda?.x0 ?? l.x0 - hAlto * 0.3) + hAlto * 0.4, y: (r1.y + r2.y) / 2, ancho: celda ? celda.x1 - celda.x0 - hAlto * 0.8 : ancho * 0.25, alto: r2.y - r1.y }
  })()
  const aLaDerecha = { x: l.x1 + hAlto * 0.5, y: l.yc, ancho: Math.min(derecha - hAlto, ancho * 0.4), alto: hAlto * 2.2 }
  // «Fecha: | ______ |»: la etiqueta en su celda y el espacio en la celda vacía de al lado.
  const celdaVecina = (() => {
    if (!raya || (vecina && vecina.x0 < raya.x)) return null
    const otra = verticales.filter((r) => r.x > raya.x + 2 && r.y0 <= l.yc && r.y1 >= l.yc).sort((a, b) => a.x - b.x)[0]
    const fin = otra?.x ?? ancho * 0.97
    if (fin - raya.x < ancho * 0.08) return null
    if (lineas.some((o) => Math.abs(o.yc - l.yc) < hAlto * 0.6 && o.xc > raya.x && o.xc < fin)) return null
    return { x: raya.x + hAlto * 0.5, y: l.yc, ancho: Math.min(fin - raya.x - hAlto, ancho * 0.4), alto: hAlto * 2.2 }
  })()
  if (campo === 'firma' && debajo) return debajo
  if (derecha >= ancho * 0.12) return aLaDerecha
  if (celdaVecina) return celdaVecina
  if (debajo) return debajo
  return { x: l.x0, y: l.y1 + hAlto * 0.9, ancho: ancho * 0.25, alto: hAlto * 2.2 }
}

// --- La página entera -----------------------------------------------------

/**
 * Lee UNA página: { ancho, alto, palabras, reglas } en píxeles.
 * Devuelve encabezados, filas de preguntas y espacios, todavía en píxeles.
 */
export function analizarPagina({ ancho, alto, palabras, reglas = { h: [], v: [] } }) {
  const r = { h: reglas.h ?? [], v: reglas.v ?? [] }
  const lineas = agruparEnLineas(palabras, r)
  const hAlto = mediana(lineas.map((l) => l.h)) || alto * 0.012
  let encabezados = buscarEncabezados(lineas, r, ancho, alto, hAlto)
  const supuesto = !encabezados.length
  if (supuesto) {
    // Sin encabezado reconocible: se supone una columna a la derecha y el supervisor la pone donde va.
    encabezados = [{ modo: 'unica', x: { unica: ancho * 0.9 }, notas: null, yIni: 0, yFin: 0, izquierda: ancho * 0.82, titulos: [], supuesto: true }]
  }
  const titulos = new Set(encabezados.flatMap((e) => e.titulos))
  const grupos = []
  const preguntas = []
  encabezados.forEach((e, k) => {
    const siguiente = encabezados[k + 1]?.yIni ?? alto
    const pie = lineas.find((l) => l.y0 > e.yFin && l.yc < siguiente && PIE.test(plano(l.texto).trim()) && !titulos.has(l))
    const yCorte = Math.min(siguiente, pie ? pie.y0 - 1 : alto)
    const region = lineas.filter((l) => l.yc > e.yFin && l.yc < yCorte && l.x1 <= e.izquierda + hAlto * 0.5 && !titulos.has(l))
    const columna = columnaDePreguntas(region, r, ancho, e.yFin, yCorte, e.izquierda)
    const deTexto = region.filter((l) => l.xc > columna.a && l.xc < columna.b && !/^\s*\(?\d{1,3}[.)]?\s*$/u.test(l.texto))
    const detalle = region.filter((l) => l.xc >= columna.b && letras(l.texto) >= 3)
    // La categoría inicial: lo que dice el encabezado sobre la columna de preguntas, si no es genérico.
    const tituloIzq = lineas.filter((l) => Math.abs(l.yc - (e.titulos[0]?.yc ?? -1e9)) < hAlto && l.x1 < e.izquierda && !titulos.has(l))[0]
    let categoria = tituloIzq && esMayusculas(tituloIzq.texto) && !GENERICO.test(plano(tituloIzq.texto)) && tituloIzq.texto.length <= 40 ? limpiarPregunta(tituloIzq.texto) : ''
    const id = `g${grupos.length + 1}`
    grupos.push({ id, modo: e.modo, x: e.x, notas: e.notas, y0: e.yFin, y1: yCorte, supuesto: Boolean(e.supuesto) })
    // Hay hojas escritas enteras en MAYÚSCULAS: ahí la mayúscula no distingue un título de sección.
    const todoMayusculas = deTexto.length >= 3 && deTexto.filter((l) => esMayusculas(l.texto)).length >= deTexto.length * 0.6
    const filas = filasDePreguntas(deTexto, r, e.yFin, yCorte, columna, e.izquierda, hAlto, todoMayusculas)
    filas.forEach((f, i) => {
      const texto = limpiarPregunta(unirLineas(f.lineas))
      const siguienteY0 = filas[i + 1]?.y0 ?? yCorte
      const det = detalle.filter((l) => l.yc >= f.y0 - 1 && l.yc < Math.max(f.y1, Math.min(siguienteY0, f.y1 + hAlto * 3)))
      const titulo = !todoMayusculas && esMayusculas(texto) && texto.length <= 40 && f.lineas.length === 1 && !det.length
      const etiqueta = /:\s*$/u.test(texto) && texto.length <= 40
      if (titulo && !etiqueta) categoria = texto.replace(/:$/u, '')
      preguntas.push({
        grupo: id,
        texto,
        detalle: det.map((l) => l.texto.trim()).join('\n'),
        categoria: titulo ? '' : categoria,
        esPregunta: letras(texto) >= 4 && !titulo && !etiqueta,
        y: (f.y0 + f.y1) / 2,
        y0: f.y0,
        y1: f.y1,
      })
    })
  })
  const campos = {}
  for (const l of lineas) {
    if (titulos.has(l)) continue
    const p = plano(l.texto).trim()
    for (const c of CAMPOS) {
      if (campos[c] || !ETIQUETA[c].test(p)) continue
      // «Observaciones» como encabezado de columna ya es la columna de notas.
      if (c === 'observaciones' && grupos.some((g) => g.notas && l.xc > g.notas.x0 && l.xc < g.notas.x1)) continue
      campos[c] = lugarDeCampo(c, l, lineas, r, ancho, alto, hAlto)
      break
    }
  }
  return { lineas, grupos, preguntas, campos, supuesto, hAlto }
}

const rel = (v, total) => Math.round((v / total) * 10000) / 10000
const relX = (x, ancho) => (x == null ? null : rel(x, ancho))

/**
 * Lee la hoja entera: [{ ancho, alto, palabras, reglas }] por página, en
 * píxeles. Devuelve la propuesta en fracciones de página:
 *  · grupos: cada encabezado de respuestas (modo «columnas» con x de SÍ, NO
 *    y OBS., o «unica» con la x donde se escribe), y su columna de notas;
 *  · preguntas: texto como está, detalle, categoría, si parece pregunta, y
 *    la altura de su fila;
 *  · campos: dónde van unidad, fecha, conductor, observaciones y firma.
 */
export function analizarHoja(paginas) {
  const salida = { paginas: [], grupos: [], preguntas: [], campos: {}, avisos: [], titulo: '' }
  let sinEncabezado = 0
  paginas.forEach((pag, n) => {
    const { ancho, alto } = pag
    salida.paginas.push({ ancho, alto })
    const r = analizarPagina(pag)
    if (r.supuesto) sinEncabezado += 1
    // El nombre que propone la hoja: el texto más grande de la parte de arriba de la primera página.
    if (n === 0) {
      const arriba = r.lineas.filter((l) => l.y1 < alto * 0.3 && letras(l.texto) >= 4)
      const grande = arriba.sort((a, b) => b.h - a.h)[0]
      if (grande && grande.h >= r.hAlto * 1.4) salida.titulo = limpiarPregunta(grande.texto)
    }
    const ids = new Map()
    for (const g of r.grupos) {
      const id = `g${salida.grupos.length + 1}`
      ids.set(g.id, id)
      const x = {}
      for (const [k, v] of Object.entries(g.x)) if (v != null) x[k] = relX(v, ancho)
      salida.grupos.push({
        id, pagina: n, modo: g.modo, x,
        notas: g.notas ? { x0: rel(g.notas.x0, ancho), x1: rel(g.notas.x1, ancho) } : null,
        y0: rel(g.y0, alto), y1: rel(g.y1, alto), supuesto: g.supuesto,
      })
    }
    for (const p of r.preguntas) {
      if (!p.texto) continue
      salida.preguntas.push({
        id: `p${salida.preguntas.length + 1}`, pagina: n, grupo: ids.get(p.grupo), texto: p.texto, detalle: p.detalle,
        categoria: p.categoria, critica: false, esPregunta: p.esPregunta,
        y: rel(p.y, alto), y0: rel(p.y0, alto), y1: rel(p.y1, alto),
      })
    }
    for (const c of CAMPOS) {
      const lugar = r.campos[c]
      if (!lugar || salida.campos[c]) continue
      salida.campos[c] = { pagina: n, x: rel(lugar.x, ancho), y: rel(lugar.y, alto), ancho: rel(Math.max(lugar.ancho, ancho * 0.08), ancho), alto: rel(lugar.alto, alto) }
    }
  })
  if (sinEncabezado === paginas.length) salida.avisos.push('No encontramos las columnas de respuesta (SÍ / NO / OBS.). Pusimos una a la derecha: muévela a su sitio.')
  if (!salida.preguntas.some((p) => p.esPregunta)) salida.avisos.push('No encontramos preguntas en la hoja. Revisa que la imagen se vea derecha y nítida, o escríbelas tú.')
  return salida
}

// --- Papel ----------------------------------------------------------------

/** El papel más parecido a la proporción de la página, y si va vertical u horizontal. */
export function papelDe(ancho, alto) {
  const r = Math.max(ancho, alto) / Math.min(ancho, alto)
  let mejor = 'a4'
  for (const [k, p] of Object.entries(PAPELES)) {
    const rp = p.mm[1] / p.mm[0]
    const rm = PAPELES[mejor].mm[1] / PAPELES[mejor].mm[0]
    if (Math.abs(rp - r) < Math.abs(rm - r)) mejor = k
  }
  return { papel: mejor, orientacion: ancho > alto ? 'horizontal' : 'vertical' }
}

// --- De la propuesta a la plantilla y al mapa ----------------------------

/** Un código válido para el servidor: minúsculas, sin acentos, letras, números, puntos y guiones. */
export function codigoDe(texto) {
  return plano(texto).trim().replace(/[^a-z0-9._-]+/gu, '-').replace(/^[^a-z0-9]+/u, '').replace(/-+$/u, '').slice(0, 40)
}

/** Lo que impide guardar la plantilla, en palabras sencillas; [] si se puede. */
export function problemasDeLaHoja({ codigo, nombre, version, preguntas }) {
  const p = []
  if (!codigoDe(codigo) || codigoDe(codigo).length < 2) p.push('Ponle un código a la plantilla (por ejemplo «inspeccion-diaria»).')
  if (String(nombre ?? '').trim().length < 2) p.push('Ponle un nombre a la plantilla.')
  if (!Number.isInteger(Number(version)) || Number(version) < 1) p.push('La versión debe ser un número entero desde 1.')
  const elegidas = (preguntas ?? []).filter((q) => q.esPregunta)
  if (!elegidas.length) p.push('Marca al menos una pregunta.')
  const vistas = new Map()
  elegidas.forEach((q, i) => {
    const t = String(q.texto ?? '').trim()
    if (t.length < 2) p.push(`La pregunta ${i + 1} está vacía.`)
    // Los mismos límites que el servidor: 160 letras la pregunta, 1000 su detalle.
    if (t.length > 160) p.push(`La pregunta ${i + 1} es muy larga (más de 160 letras): pasa una parte al detalle.`)
    if (String(q.detalle ?? '').trim().length > 1000) p.push(`El detalle de la pregunta ${i + 1} pasa de 1000 letras: acórtalo.`)
    const k = llavePregunta(t)
    if (k && vistas.has(k)) p.push(`Las preguntas ${vistas.get(k) + 1} y ${i + 1} dicen lo mismo: cada pregunta debe ser distinta para saber dónde va su marca.`)
    else vistas.set(k, i)
  })
  return p
}

/**
 * Las preguntas elegidas como formato de inspección (la forma que publica
 * el panel, como los formatos listos): code, version, name, items…
 */
export function aFormato({ codigo, nombre, version = 1, descripcion = '', preguntas }) {
  const code = codigoDe(codigo)
  const items = (preguntas ?? []).filter((q) => q.esPregunta).map((q, i) => ({
    code: `${code}.${String(i + 1).padStart(2, '0')}`,
    category: String(q.categoria ?? '').trim() || 'General',
    name: String(q.texto).trim(),
    isCritical: Boolean(q.critica),
    ...(String(q.detalle ?? '').trim() ? { helpText: String(q.detalle).trim() } : {}),
    vehicleTypes: [],
    displayOrder: i + 1,
  }))
  return {
    code,
    version: Number(version),
    name: String(nombre).trim(),
    description: descripcion || 'Hoja de inspección de la empresa, tal como está en papel.',
    items,
  }
}

/**
 * El mapa que se guarda con la hoja: dónde va cada marca y cada dato, en
 * fracciones de página. Solo lo que se usa al imprimir.
 */
export function armarMapa({ propuesta, formato, marca = 'x' }) {
  const elegidas = propuesta.preguntas.filter((q) => q.esPregunta)
  const usados = new Set(elegidas.map((q) => q.grupo))
  const p0 = propuesta.paginas[0] ?? { ancho: 1, alto: 1.414 }
  // Todo en 0–1: al leerlo se descarta el mapa que se sale (ver validarMapa); un arrastre al borde no debe tumbarlo.
  const campos = {}
  for (const c of CAMPOS) {
    const l = propuesta.campos?.[c]
    if (l) campos[c] = { pagina: l.pagina, x: aFraccion(l.x), y: aFraccion(l.y), ancho: aFraccion(l.ancho), alto: aFraccion(l.alto) }
  }
  const xs = (x) => Object.fromEntries(Object.entries(x ?? {}).filter(([k, v]) => COLUMNAS.has(k) && v != null).map(([k, v]) => [k, aFraccion(v)]))
  return {
    formato: VERSION_MAPA,
    codigo: formato.code,
    version: formato.version,
    nombre: formato.name,
    ...papelDe(p0.ancho, p0.alto),
    marca: marca === 'check' ? 'check' : 'x',
    paginas: propuesta.paginas.map(({ ancho, alto }) => ({ ancho, alto })),
    grupos: propuesta.grupos.filter((g) => usados.has(g.id)).map(({ id, pagina, modo, x, notas }) => ({
      id, pagina, modo, x: xs(x), notas: notas ? { x0: aFraccion(notas.x0), x1: aFraccion(notas.x1) } : null,
    })),
    preguntas: elegidas.map((q, i) => ({ codigo: formato.items[i]?.code, nombre: formato.items[i]?.name ?? q.texto, grupo: q.grupo, pagina: q.pagina, y: aFraccion(q.y) })),
    campos,
  }
}

// --- El mapa guardado no es de fiar ----------------------------------------
// Un mapa puede llegar tocado (almacenamiento del navegador, un archivo
// cambiado por otro…). Antes de imprimir se revisa entero y se copia solo lo
// que se conoce: si algo no cuadra, la hoja se descarta y la inspección sale
// con la planilla de siempre. Nada de él llega al HTML sin pasar por aquí.

const COLUMNAS = new Set(['conforme', 'falla', 'observacion', 'unica'])
const MODOS = new Set(['columnas', 'unica'])
/** Topes del mapa: holgados para una hoja real (se leen 6 páginas como mucho), cortos para uno inflado. */
export const TOPES_MAPA = { paginas: 12, grupos: 60, preguntas: 400, texto: 500, codigo: 60, nombre: 120 }

function aFraccion(v) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : v
}
const esFraccion = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
const esMedida = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 50000
const esEntero = (v, min, max) => Number.isInteger(v) && v >= min && v <= max
const esTexto = (t, max, min = 0) => typeof t === 'string' && t.length >= min && t.length <= max
const esObjeto = (o) => Boolean(o) && typeof o === 'object' && !Array.isArray(o)
const tiene = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

/**
 * El mapa revisado: una copia con solo lo conocido, o null si algo no cuadra
 * (papel u orientación desconocidos, números fuera de 0–1, listas o textos de
 * más, páginas que no existen…).
 */
export function validarMapa(m) {
  try {
    if (!esObjeto(m) || m.formato !== VERSION_MAPA) return null
    if (typeof m.papel !== 'string' || !tiene(PAPELES, m.papel)) return null
    if (m.orientacion !== 'vertical' && m.orientacion !== 'horizontal') return null
    if (m.marca !== 'x' && m.marca !== 'check') return null
    if (!esTexto(m.codigo, TOPES_MAPA.codigo, 1) || !esTexto(m.nombre, TOPES_MAPA.nombre, 1) || !esEntero(m.version, 1, 1e6)) return null
    if (!Array.isArray(m.paginas) || !m.paginas.length || m.paginas.length > TOPES_MAPA.paginas) return null
    const paginas = []
    for (const p of m.paginas) {
      if (!esObjeto(p) || !esMedida(p.ancho) || !esMedida(p.alto)) return null
      paginas.push({ ancho: p.ancho, alto: p.alto })
    }
    const esPagina = (n) => esEntero(n, 0, paginas.length - 1)
    if (!Array.isArray(m.grupos) || m.grupos.length > TOPES_MAPA.grupos) return null
    const grupos = []
    for (const g of m.grupos) {
      if (!esObjeto(g) || !esTexto(g.id, 40, 1) || !esPagina(g.pagina) || !MODOS.has(g.modo) || !esObjeto(g.x)) return null
      const x = {}
      for (const [k, v] of Object.entries(g.x)) {
        if (!COLUMNAS.has(k) || !esFraccion(v)) return null
        x[k] = v
      }
      let notas = null
      if (g.notas != null) {
        if (!esObjeto(g.notas) || !esFraccion(g.notas.x0) || !esFraccion(g.notas.x1) || g.notas.x0 > g.notas.x1) return null
        notas = { x0: g.notas.x0, x1: g.notas.x1 }
      }
      grupos.push({ id: g.id, pagina: g.pagina, modo: g.modo, x, notas })
    }
    if (!Array.isArray(m.preguntas) || m.preguntas.length > TOPES_MAPA.preguntas) return null
    const preguntas = []
    for (const p of m.preguntas) {
      // Sin grupo es posible (pregunta añadida a mano sin columnas): su respuesta va a «sin lugar».
      if (!esObjeto(p) || !esTexto(p.nombre, TOPES_MAPA.texto, 1) || (p.grupo != null && !esTexto(p.grupo, 40)) || !esPagina(p.pagina) || !esFraccion(p.y)) return null
      if (p.codigo != null && !esTexto(p.codigo, TOPES_MAPA.codigo)) return null
      preguntas.push({ codigo: p.codigo ?? undefined, nombre: p.nombre, grupo: p.grupo ?? undefined, pagina: p.pagina, y: p.y })
    }
    const campos = {}
    if (m.campos != null) {
      if (!esObjeto(m.campos)) return null
      for (const [c, l] of Object.entries(m.campos)) {
        if (!CAMPOS.includes(c)) return null
        if (!esObjeto(l) || !esPagina(l.pagina) || ![l.x, l.y, l.ancho].every(esFraccion) || (l.alto != null && !esFraccion(l.alto))) return null
        campos[c] = { pagina: l.pagina, x: l.x, y: l.y, ancho: l.ancho, ...(l.alto != null ? { alto: l.alto } : {}) }
      }
    }
    const limpio = { formato: VERSION_MAPA, codigo: m.codigo, version: m.version, nombre: m.nombre, papel: m.papel, orientacion: m.orientacion, marca: m.marca, paginas, grupos, preguntas, campos }
    if (m.imagenes != null) {
      // Las imágenes subidas a Cloudinary (public_id), una por página.
      if (!Array.isArray(m.imagenes) || m.imagenes.length > paginas.length || !m.imagenes.every((i) => esTexto(i, 300, 1) && /^[\w./-]+$/u.test(i))) return null
      limpio.imagenes = [...m.imagenes]
    }
    return limpio
  } catch {
    return null
  }
}

/** Una imagen de página que se puede poner en la hoja: de Cloudinary o una imagen incrustada. Nada más. */
export function esImagenDeHoja(url) {
  return typeof url === 'string' && (
    /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/[\w,./:%?=-]+$/u.test(url)
    || /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/u.test(url))
}

/**
 * La hoja guardada lista para imprimir ({ mapa, paginas, … } con el mapa
 * revisado y una imagen válida por página), o null si no se puede usar.
 */
export function hojaValida(guardada) {
  if (!esObjeto(guardada)) return null
  const mapa = validarMapa(guardada.mapa)
  const paginas = guardada.paginas
  if (!mapa || !Array.isArray(paginas) || paginas.length !== mapa.paginas.length || !paginas.every(esImagenDeHoja)) return null
  return { mapa, paginas: [...paginas], provisional: Boolean(guardada.provisional), ...(guardada.guardadaEn ? { guardadaEn: String(guardada.guardadaEn) } : {}) }
}

// --- De la inspección a la hoja impresa ----------------------------------

const PALABRA = { conforme: 'SÍ', observacion: 'OBS.', falla: 'NO' }

/** AAAA-MM-DD → DD/MM/AAAA. */
function fechaLegible(iso) {
  const [a, m, d] = String(iso ?? '').split('-')
  return d && m && a ? `${d.slice(0, 2)}/${m}/${a}` : String(iso ?? '')
}

/**
 * Lo que se escribe sobre la hoja para UNA inspección (`h`, la forma de
 * planillaInspeccion.hojaDe): una lista de elementos con su página y su
 * sitio en fracciones.
 *  · tipo «marca»: la X (o ✓) en la columna de su respuesta, o la palabra
 *    SÍ / OBS. / NO en la columna única;
 *  · tipo «texto»: unidad, fecha, conductor, observaciones y notas;
 *  · tipo «firma»: la imagen de la firma, si la inspección la trae.
 * Las respuestas que no encuentran su pregunta en la hoja no se pierden: van
 * a observaciones o, si no hay ese espacio, a una franja al pie.
 */
export function elementosDeHoja(mapa, h) {
  const grupos = new Map((mapa.grupos ?? []).map((g) => [g.id, g]))
  const porNombre = new Map((mapa.preguntas ?? []).map((p, i) => [llavePregunta(p.nombre), { ...p, n: i + 1 }]))
  const els = []
  const notasSueltas = []
  const sinLugar = []
  for (const r of h.respuestas ?? []) {
    const p = porNombre.get(llavePregunta(r.nombre))
    const g = p && grupos.get(p.grupo)
    if (!p || !g) { sinLugar.push(r); continue }
    let xMarca = null
    if (g.modo === 'unica') {
      xMarca = g.x?.unica
      if (xMarca != null && PALABRA[r.estado]) els.push({ tipo: 'marca', pagina: p.pagina, x: xMarca, y: p.y, texto: PALABRA[r.estado], estado: r.estado, palabra: true })
    } else {
      // Sin columna de observación, la observación se marca en SÍ (la unidad sale) y la nota lo explica.
      xMarca = (g.x && COLUMNAS.has(r.estado) ? g.x[r.estado] : null) ?? (r.estado === 'observacion' ? g.x?.conforme : null)
      if (xMarca != null) els.push({ tipo: 'marca', pagina: p.pagina, x: xMarca, y: p.y, texto: mapa.marca === 'check' ? '✓' : 'X', estado: r.estado })
      else if (PALABRA[r.estado]) sinLugar.push(r)
    }
    if (!r.nota) continue
    if (g.notas) els.push({ tipo: 'texto', pagina: p.pagina, x: g.notas.x0 + 0.004, y: p.y, ancho: g.notas.x1 - g.notas.x0 - 0.008, texto: r.nota, nota: true })
    else if (mapa.campos?.observaciones) notasSueltas.push(`${p.n}. ${r.nota}`)
    else if (xMarca != null) els.push({ tipo: 'texto', pagina: p.pagina, x: xMarca - 0.05, y: p.y + 0.014, ancho: 0.1, texto: r.nota, nota: true, centrado: true })
  }
  const otras = sinLugar.map((r) => `${r.nombre}: ${PALABRA[r.estado] ?? '—'}${r.nota ? ` (${r.nota})` : ''}`)
  const c = mapa.campos ?? {}
  const datos = { unidad: h.unidad, fecha: fechaLegible(h.fecha), conductor: h.conductor }
  for (const k of ['unidad', 'fecha', 'conductor']) {
    const v = String(datos[k] ?? '').trim()
    if (c[k] && v && v !== '—') els.push({ tipo: 'texto', pagina: c[k].pagina, x: c[k].x, y: c[k].y, ancho: c[k].ancho, texto: v, campo: k })
  }
  const obs = [...notasSueltas, ...(otras.length ? [`Otras respuestas: ${otras.join(' · ')}`] : [])]
  if (c.observaciones && obs.length) els.push({ tipo: 'texto', pagina: c.observaciones.pagina, x: c.observaciones.x, y: c.observaciones.y, ancho: c.observaciones.ancho, texto: obs.join('\n'), campo: 'observaciones', varias: true })
  else if (otras.length) els.push({ tipo: 'pie', pagina: (mapa.paginas?.length ?? 1) - 1, texto: `Respuestas sin lugar en esta hoja: ${otras.join(' · ')}` })
  if (c.firma && h.firma) els.push({ tipo: 'firma', pagina: c.firma.pagina, x: c.firma.x, y: c.firma.y, ancho: c.firma.ancho, alto: c.firma.alto, url: h.firma })
  return els
}

const escHtml = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const pct = (v) => `${Math.round(v * 100000) / 1000}%`

/**
 * El nombre de la página de impresión para un papel y una orientación (cada
 * uno su @page). Va dentro de un `style`: solo papeles conocidos, nunca el
 * texto que traiga el mapa.
 */
const nombrePagina = (papel, orientacion) => `he-${tiene(PAPELES, papel) ? papel : 'a4'}-${orientacion === 'horizontal' ? 'h' : 'v'}`

/** Medidas del papel en mm según la orientación. */
function medidas(papel, orientacion) {
  const [a, b] = (PAPELES[papel] ?? PAPELES.a4).mm
  return orientacion === 'horizontal' ? [b, a] : [a, b]
}

/** Tamaño de letra (mm) para que un texto quepa en su ancho: se achica hasta un mínimo legible. */
function letraQueCabe(texto, anchoMm, base = 3.2, minimo = 1.9) {
  const n = Math.max(1, String(texto).length)
  return Math.max(minimo, Math.min(base, anchoMm / (n * 0.55)))
}

/**
 * Las páginas de UNA inspección impresas sobre la hoja de la empresa.
 * `guardada` = { mapa, paginas: [url de la imagen de cada página] }.
 */
export function htmlHojaEmpresa(guardada, h) {
  // Se imprime solo la copia revisada: lo que traiga de más el mapa no llega al HTML.
  const hoja = hojaValida(guardada)
  if (!hoja) return ''
  const { mapa } = hoja
  const [anchoMm, altoMm] = medidas(mapa.papel, mapa.orientacion)
  const els = elementosDeHoja(mapa, h)
  return (mapa.paginas ?? []).map((pag, n) => {
    // El lienzo toma la proporción de la imagen y cabe entero en el papel: las fracciones caen donde deben.
    const proporcion = pag.alto / pag.ancho
    const w = Math.min(anchoMm, altoMm / proporcion)
    const hh = w * proporcion
    const propios = els.filter((e) => e.pagina === n)
    const piezas = propios.map((e) => {
      if (e.tipo === 'marca') {
        const tam = e.palabra ? 3.4 : 4.6
        return `<span class="he-marca he-${escHtml(e.estado)}${e.palabra ? ' he-palabra' : ''}" style="left:${pct(e.x)};top:${pct(e.y)};font-size:${tam}mm">${escHtml(e.texto)}</span>`
      }
      if (e.tipo === 'firma') {
        return `<img class="he-firma" alt="" src="${escHtml(e.url)}" style="left:${pct(e.x)};top:${pct(e.y)};width:${pct(e.ancho)};height:${pct(e.alto ?? 0.04)}" />`
      }
      if (e.tipo === 'pie') return `<p class="he-pie">${escHtml(e.texto)}</p>`
      const ancho = Math.max(0.04, e.ancho ?? 0.25)
      const tam = e.varias ? Math.max(1.9, Math.min(2.8, letraQueCabe(e.texto, ancho * w * 2.4))) : letraQueCabe(e.texto, ancho * w, e.nota ? 2.4 : 3.2, e.nota ? 1.7 : 1.9)
      const clase = `he-texto${e.nota ? ' he-nota' : ''}${e.centrado ? ' he-centrado' : ''}${e.varias ? ' he-varias' : ''}`
      return `<span class="${clase}" style="left:${pct(e.x)};top:${pct(e.y)};width:${pct(ancho)};font-size:${tam.toFixed(2)}mm">${escHtml(e.texto)}</span>`
    }).join('')
    return `<section class="he-pagina" style="page:${nombrePagina(mapa.papel, mapa.orientacion)};width:${anchoMm}mm;height:${altoMm - 0.4}mm">
      <div class="he-lienzo" style="width:${w.toFixed(2)}mm;height:${hh.toFixed(2)}mm">
        <img class="he-fondo" alt="" src="${escHtml(hoja.paginas[n])}" />${piezas}
      </div>
    </section>`
  }).join('')
}

/** El estilo de las páginas sobre la hoja: sin márgenes (la hoja ya trae los suyos) y tinta azul de bolígrafo. */
export function estiloHojaEmpresa() {
  const paginas = []
  for (const papel of Object.keys(PAPELES)) {
    for (const o of ['vertical', 'horizontal']) {
      const [a, b] = medidas(papel, o)
      paginas.push(`@page ${nombrePagina(papel, o)} { size: ${a}mm ${b}mm; margin: 0; }`)
    }
  }
  return `${paginas.join('\n')}
  .he-pagina { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;
               break-after: page; page-break-after: always; margin: 0; background: #fff; }
  .he-pagina:last-child { break-after: auto; page-break-after: auto; }
  .he-lienzo { position: relative; }
  .he-fondo { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .he-marca { position: absolute; transform: translate(-50%, -50%); font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
              font-weight: 700; color: #1b2f8f; line-height: 1; white-space: nowrap; }
  .he-marca.he-palabra { font-family: Helvetica, Arial, sans-serif; letter-spacing: .2px; }
  .he-marca.he-falla { color: #b3141d; }
  .he-texto { position: absolute; transform: translateY(-50%); font-family: Helvetica, Arial, sans-serif; color: #1b2f8f;
              line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .he-texto.he-nota { white-space: normal; transform: translateY(-15%); max-height: 3.5em; }
  .he-texto.he-varias { white-space: pre-line; transform: translateY(-0.6em); max-height: 6em; }
  .he-texto.he-centrado { text-align: center; }
  .he-firma { position: absolute; transform: translateY(-50%); object-fit: contain; object-position: left center; }
  .he-pie { position: absolute; left: 4%; right: 4%; bottom: 0.6%; margin: 0; font: 7pt Helvetica, Arial, sans-serif;
            color: #8a1c1c; background: rgba(255,255,255,.92); padding: 2px 4px; border-top: 1px solid #c9cedb; }`
}

// --- PDF con texto y Excel: de lo que traen a palabras con posición -------

/** Multiplica dos transformaciones afines [a, b, c, d, e, f]. */
function componer(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ]
}

/**
 * Los textos de una página de PDF (los `items` de pdf.js) como palabras en
 * píxeles de la imagen de esa página. `transformacion` es la de la vista
 * (viewport.transform) y `escala` la misma con la que se dibujó.
 */
export function palabrasDePdf(items, transformacion, escala) {
  const salida = []
  for (const it of items ?? []) {
    const texto = String(it.str ?? '')
    if (!texto.trim()) continue
    const m = componer(transformacion, it.transform)
    const altoLetra = Math.hypot(m[2], m[3]) || (it.height ?? 0) * escala
    const ancho = (it.width ?? 0) * escala
    const x0 = m[4]
    const base = m[5]
    salida.push({ texto: texto.trim(), x0, x1: x0 + Math.max(ancho, altoLetra * 0.3), y0: base - altoLetra * 0.8, y1: base + altoLetra * 0.2 })
  }
  return salida
}

/** Parte un texto en renglones de a lo sumo `max` letras, sin cortar palabras (salvo las que no caben). */
export function partirTexto(texto, max) {
  const renglones = []
  for (const parrafo of String(texto ?? '').split(/\r?\n/u)) {
    let actual = ''
    for (const palabra of parrafo.split(/\s+/u).filter(Boolean)) {
      if (!actual) actual = palabra
      else if ((actual + ' ' + palabra).length <= max) actual += ' ' + palabra
      else { renglones.push(actual); actual = palabra }
      while (actual.length > max) { renglones.push(actual.slice(0, max)); actual = actual.slice(max) }
    }
    if (actual) renglones.push(actual)
  }
  return renglones
}

/** Lo más que se lee de un Excel: una planilla real cabe de sobra. */
export const TOPES_TABLA = { filas: 400, columnas: 40, combinadas: 2000 }

/**
 * El rango de la hoja de Excel que se lee (`!ref` decodificado: { s, e } con
 * r y c desde 0), recortado a TOPES_TABLA desde su esquina. `recortado` dice
 * si se dejó algo fuera.
 */
export function rangoRecortado(rango, topes = TOPES_TABLA) {
  const s = { r: Math.max(0, Number(rango?.s?.r) || 0), c: Math.max(0, Number(rango?.s?.c) || 0) }
  const e = { r: Math.max(s.r, Number(rango?.e?.r) || 0), c: Math.max(s.c, Number(rango?.e?.c) || 0) }
  const corte = { r: Math.min(e.r, s.r + topes.filas - 1), c: Math.min(e.c, s.c + topes.columnas - 1) }
  return { s, e: corte, recortado: corte.r < e.r || corte.c < e.c }
}

/**
 * Arma la hoja de impresión a partir de la tabla de un Excel: cada celda en
 * su sitio, con sus renglones, en páginas A4 a 200 ppp. Devuelve por página
 * las celdas (para dibujarlas), las palabras y las rayas (para leerla igual
 * que una foto, pero sin adivinar nada).
 * `filas`: matriz de textos; `anchos`: ancho de cada columna en caracteres.
 */
export function maquetarTabla(filas, { anchos = [], combinadas: todasCombinadas = [], ancho = 1654, alto = 2339, margen = 90, letra = 24 } = {}) {
  // Un Excel con el rango inflado (formato aplicado hasta la fila un millón) no debe colgar la página.
  const limpias = []
  const origen = Array.isArray(filas) ? filas : []
  for (let r = 0; r < Math.min(origen.length, TOPES_TABLA.filas); r += 1) {
    const f = Array.isArray(origen[r]) ? origen[r] : []
    const fila = []
    for (let c = 0; c < Math.min(f.length, TOPES_TABLA.columnas); c += 1) fila.push(String(f[c] ?? '').trim())
    limpias.push(fila)
  }
  while (limpias.length && limpias.at(-1).every((c) => !c)) limpias.pop()
  // Con un bucle y no Math.max(...lista): con muchas filas, esparcirla revienta la pila.
  let nCols = 0
  for (const f of limpias) {
    let n = f.length
    while (n && !f[n - 1]) n -= 1
    if (n > nCols) nCols = n
  }
  if (!nCols) return []
  const nFilas = limpias.length
  // Las celdas combinadas, recortadas a la tabla que se dibuja.
  const combinadas = []
  for (const m of Array.isArray(todasCombinadas) ? todasCombinadas : []) {
    if (combinadas.length >= TOPES_TABLA.combinadas) break
    if (!(m?.s?.r < nFilas && m?.s?.c < nCols && m.s.r >= 0 && m.s.c >= 0)) continue
    combinadas.push({ s: { r: m.s.r, c: m.s.c }, e: { r: Math.min(nFilas - 1, Math.max(m.s.r, m.e?.r ?? m.s.r)), c: Math.min(nCols - 1, Math.max(m.s.c, m.e?.c ?? m.s.c)) } })
  }
  const combinadaEn = (r, c) => (combinadas ?? []).some((m) => r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c)
  const chars = Array.from({ length: nCols }, (_, c) => {
    const pedido = Number(anchos[c]) || 0
    // Sin ancho guardado, cuenta el texto que tiene que caber en la columna: no el de una celda
    // combinada ni el que en Excel se desborda sobre las celdas vacías de al lado.
    const propios = limpias.filter((f, r) => f[c] && !combinadaEn(r, c) && (c === nCols - 1 || f[c + 1])).map((f) => f[c].length)
    const contenido = propios.length ? propios.reduce((a, b) => Math.max(a, b), 2) : 8
    return Math.max(3, Math.min(60, pedido || contenido))
  })
  const util = ancho - margen * 2
  const total = chars.reduce((s, x) => s + x, 0)
  const xs = [margen]
  chars.forEach((w) => xs.push(xs.at(-1) + (w / total) * util))
  const tapadas = new Set()
  const extension = new Map()
  for (const m of combinadas ?? []) {
    extension.set(`${m.s.r}:${m.s.c}`, m)
    for (let r = m.s.r; r <= m.e.r; r += 1) for (let c = m.s.c; c <= m.e.c; c += 1) if (r !== m.s.r || c !== m.s.c) tapadas.add(`${r}:${c}`)
  }
  const anchoLetra = letra * 0.56
  const renglon = letra * 1.3
  const relleno = letra * 0.45
  const paginas = []
  let pag = null
  let y = margen
  const nueva = () => {
    pag = { ancho, alto, celdas: [], palabras: [], reglas: { h: [], v: [] }, yIni: margen }
    paginas.push(pag)
    y = margen
  }
  nueva()
  limpias.forEach((fila, r) => {
    const celdas = []
    for (let c = 0; c < nCols; c += 1) {
      if (tapadas.has(`${r}:${c}`)) continue
      const m = extension.get(`${r}:${c}`)
      let cFin = m ? Math.min(nCols - 1, m.e.c) : c
      // Como en Excel: un texto largo se desborda sobre las celdas vacías de su derecha.
      const libre = (k) => k < nCols && !fila[k] && !tapadas.has(`${r}:${k}`) && !extension.has(`${r}:${k}`)
      if (!m && fila[c]) {
        while (fila[c].length * anchoLetra > xs[cFin + 1] - xs[c] - relleno * 2 && libre(cFin + 1)) cFin += 1
      }
      const x0 = xs[c]
      const x1 = xs[cFin + 1]
      const saltar = cFin - c
      const renglones = partirTexto(fila[c] ?? '', Math.max(1, Math.floor((x1 - x0 - relleno * 2) / anchoLetra)))
      celdas.push({ x0, x1, renglones, columna: c })
      c += m ? 0 : saltar
    }
    const altoFila = Math.max(1, ...celdas.map((c) => c.renglones.length)) * renglon + relleno * 2
    if (y + altoFila > alto - margen && pag.celdas.length) nueva()
    pag.reglas.h.push({ y, x0: margen, x1: ancho - margen, banda: null })
    for (const c of celdas) {
      pag.celdas.push({ x: c.x0, y, ancho: c.x1 - c.x0, alto: altoFila, renglones: c.renglones, fila: r, columna: c.columna })
      c.renglones.forEach((t, k) => {
        const ty = y + relleno + k * renglon
        pag.palabras.push({ texto: t, x0: c.x0 + relleno, x1: c.x0 + relleno + t.length * anchoLetra * 0.9, y0: ty, y1: ty + letra })
      })
    }
    y += altoFila
    pag.yFin = y
  })
  for (const p of paginas) {
    p.reglas.h.push({ y: p.yFin, x0: margen, x1: ancho - margen, banda: null })
    for (const x of xs) p.reglas.v.push({ x, y0: p.yIni, y1: p.yFin, banda: null })
  }
  return paginas
}

/**
 * Una inspección de muestra para «Imprimir una de prueba»: casi todo SÍ,
 * una observación y una falla con su nota, para ver cada marca en su sitio.
 */
export function muestraDeInspeccion(mapa, hoy = new Date()) {
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  return {
    id: 'muestra',
    formato: mapa.nombre,
    unidad: 'Unidad de prueba · ABC-123',
    conductor: 'Nombre del conductor',
    fecha,
    respuestas: (mapa.preguntas ?? []).map((p, i) => ({
      itemId: null,
      nombre: p.nombre,
      estado: i === 2 ? 'observacion' : i === 3 ? 'falla' : 'conforme',
      nota: i === 2 ? 'Ejemplo de observación' : i === 3 ? 'Ejemplo de falla' : '',
    })),
  }
}

/** Lo que necesita planillaInspeccion.htmlPlanillas para imprimir sobre la hoja. */
export const sobreHoja = () => ({ pintar: htmlHojaEmpresa, estilo: estiloHojaEmpresa(), admite: (g) => Boolean(hojaValida(g)) })
