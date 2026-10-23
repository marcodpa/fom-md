// ============================================================
// LEER LA HOJA: de un archivo (PDF, foto o Excel) a páginas con palabras
// ------------------------------------------------------------
// Todo pasa en el navegador: la hoja NO se manda a ningún servicio de fuera.
//  · PDF con texto: pdf.js da cada texto con su posición exacta.
//  · PDF escaneado o foto: se lee con tesseract.js (OCR en español). Si está
//    un poco torcida, se endereza sola; si está de lado, se gira con los
//    botones antes de leer.
//  · Excel: SheetJS lee las celdas y la hoja de impresión se dibuja a partir
//    de la tabla (así se sabe dónde quedó cada cosa sin adivinar).
// Las tres librerías se cargan solo al usar esta función (import dinámico):
// el panel no pesa más. Lo único que se descarga de fuera es el diccionario
// del español del lector, la primera vez (queda guardado en el navegador).
//
// Cada página sale como { ancho, alto, imagen, palabras, reglas }: palabras
// y reglas en píxeles de la imagen leída; `imagen` es la que se guarda.
// ============================================================
import { buscarReglas, maquetarTabla, palabrasDePdf } from './hojaEmpresa'

/** Ancho al que se lee cada página (OCR y rayas): A4 a unos 240 ppp. */
const ANCHO_LECTURA = 2000
/** Ancho de la imagen que se guarda e imprime: A4 a unos 200 ppp. */
const ANCHO_GUARDADO = 1700
const MAX_PAGINAS = 6
const MAX_MB = 25

/** pdf | imagen | excel | heic | null */
export function tipoDeArchivo(archivo) {
  const n = String(archivo?.name ?? '').toLowerCase()
  const t = String(archivo?.type ?? '')
  if (t === 'application/pdf' || n.endsWith('.pdf')) return 'pdf'
  if (/spreadsheetml|ms-excel|opendocument\.spreadsheet/u.test(t) || /\.(xlsx|xls|ods)$/u.test(n)) return 'excel'
  if (/heic|heif/u.test(t) || /\.hei[cf]$/u.test(n)) return 'heic'
  if (/^image\/(jpeg|png|webp|gif|bmp)$/u.test(t) || /\.(jpe?g|png|webp|bmp)$/u.test(n)) return 'imagen'
  return null
}

/** Qué le pasa al archivo, en palabras sencillas; null si se puede leer. */
export function problemaDeArchivo(archivo) {
  if (!archivo) return 'No hay archivo.'
  const tipo = tipoDeArchivo(archivo)
  if (tipo === 'heic') return `«${archivo.name}» es una foto HEIC del iPhone: guárdala como JPG (o compártela «como JPG») y vuelve a subirla.`
  if (!tipo) return `«${archivo.name}» no es un PDF, una foto (JPG o PNG) ni un Excel (.xlsx).`
  if (archivo.size > MAX_MB * 1024 * 1024) return `«${archivo.name}» pesa más de ${MAX_MB} MB.`
  return null
}

// --- Lienzos -----------------------------------------------------------------

function lienzo(ancho, alto) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(ancho))
  c.height = Math.max(1, Math.round(alto))
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  return c
}

/** La imagen (o lo que se pueda dibujar) en un lienzo de `ancho` px, girada `giro` grados (múltiplo de 90). */
function aLienzo(fuente, anchoFuente, altoFuente, ancho, giro = 0) {
  const g = ((giro % 360) + 360) % 360
  const lado = g === 90 || g === 270
  const w0 = lado ? altoFuente : anchoFuente
  const h0 = lado ? anchoFuente : altoFuente
  const escala = ancho / w0
  const c = lienzo(w0 * escala, h0 * escala)
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate((g * Math.PI) / 180)
  const w = anchoFuente * escala
  const h = altoFuente * escala
  ctx.drawImage(fuente, -w / 2, -h / 2, w, h)
  return c
}

/** Un byte de gris por punto: lo que necesita buscarReglas. */
function grisDe(c) {
  const { data } = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height)
  const g = new Uint8Array(c.width * c.height)
  for (let i = 0, j = 0; j < g.length; i += 4, j += 1) g[j] = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8
  return g
}

/** La imagen que se guarda: JPEG liviano del ancho de guardado. */
function aJpeg(c) {
  const salida = c.width > ANCHO_GUARDADO ? aLienzo(c, c.width, c.height, ANCHO_GUARDADO) : c
  return salida.toDataURL('image/jpeg', 0.85)
}

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo abrir la imagen. Prueba con un JPG o PNG.'))
    img.src = src
  })
}

/** La foto como imagen del navegador (respeta la orientación de la cámara). */
export async function abrirFoto(archivo) {
  const url = URL.createObjectURL(archivo)
  try {
    const img = await cargarImagen(url)
    return { img, ancho: img.naturalWidth, alto: img.naturalHeight }
  } finally {
    // La imagen ya está decodificada: la dirección temporal sobra.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

// --- OCR ---------------------------------------------------------------------

const absoluta = (url) => new URL(url, globalThis.location?.href ?? 'http://localhost/').href

/** El lector de texto (OCR) en español, servido desde la propia web salvo el diccionario. */
async function crearLector(alAvanzar) {
  const [{ createWorker }, trabajador, nucleo] = await Promise.all([
    import('tesseract.js'),
    import('tesseract.js/dist/worker.min.js?url'),
    import('tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'),
  ])
  return createWorker('spa', 1, {
    workerPath: absoluta(trabajador.default),
    corePath: absoluta(nucleo.default),
    logger: (m) => {
      if (m.status === 'recognizing text') alAvanzar?.({ texto: 'Leyendo el texto de la hoja…', avance: m.progress })
      else if (/loading|initializ/u.test(m.status ?? '')) alAvanzar?.({ texto: 'Preparando el lector de texto (la primera vez tarda un poco)…', avance: m.progress })
    },
  })
}

/** Las palabras que leyó el OCR, con su caja. */
function palabrasDeOcr(data) {
  const salida = []
  for (const b of data.blocks ?? []) {
    for (const p of b.paragraphs ?? []) {
      for (const l of p.lines ?? []) {
        for (const w of l.words ?? []) {
          const texto = String(w.text ?? '').trim()
          if (!texto || w.confidence < 20) continue
          salida.push({ texto, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1, confianza: w.confidence })
        }
      }
    }
  }
  return salida
}

/**
 * Lee un lienzo con el OCR. Si la hoja estaba un poco torcida, el lector la
 * endereza y se usa la enderezada (las cajas corresponden a esa).
 */
async function leerLienzo(lector, c, avisos) {
  const { data } = await lector.recognize(c, { rotateAuto: true }, { blocks: true, imageColor: true })
  let pagina = c
  const giro = Number(data.rotateRadians) || 0
  if (Math.abs(giro) >= 0.005 && data.imageColor) {
    const img = await cargarImagen(data.imageColor)
    pagina = aLienzo(img, img.naturalWidth, img.naturalHeight, img.naturalWidth)
  }
  if (Math.abs(giro) > 0.12) avisos.add('La hoja estaba bastante torcida y la enderezamos. Si algo no cuadra, sube el escaneo derecho.')
  const palabras = palabrasDeOcr(data)
  const confianza = palabras.length ? palabras.reduce((s, p) => s + p.confianza, 0) / palabras.length : 0
  if (palabras.length < 15) avisos.add('Casi no se pudo leer texto. Si la foto está de lado, gírala; si está borrosa u oscura, sube un escaneo o una foto más nítida.')
  else if (confianza < 60) avisos.add('Parte del texto se leyó con dificultad (foto borrosa, oscura o letra a mano): revisa bien cada pregunta.')
  return { lienzo: pagina, palabras }
}

function paginaDe(c, palabras, reglas) {
  return { ancho: c.width, alto: c.height, imagen: aJpeg(c), palabras, reglas: reglas ?? buscarReglas(grisDe(c), c.width, c.height) }
}

// --- Cada tipo de archivo -------------------------------------------------

async function leerPdf(archivo, alAvanzar, avisos) {
  alAvanzar?.({ texto: 'Abriendo el PDF…' })
  const [pdfjs, trabajador] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjs.GlobalWorkerOptions.workerSrc = trabajador.default
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) }).promise
  if (doc.numPages > MAX_PAGINAS) avisos.add(`El PDF tiene ${doc.numPages} páginas: se usan las primeras ${MAX_PAGINAS}.`)
  const paginas = []
  let lector = null
  let origen = 'pdf-texto'
  try {
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGINAS); n += 1) {
      alAvanzar?.({ texto: `Leyendo la página ${n} de ${Math.min(doc.numPages, MAX_PAGINAS)}…` })
      const pagina = await doc.getPage(n)
      const escala = ANCHO_LECTURA / pagina.getViewport({ scale: 1 }).width
      const vista = pagina.getViewport({ scale: escala })
      const c = lienzo(vista.width, vista.height)
      await pagina.render({ canvas: c, canvasContext: c.getContext('2d'), viewport: vista, background: '#ffffff' }).promise
      const texto = await pagina.getTextContent()
      const palabras = palabrasDePdf(texto.items, vista.transform, escala)
      const conLetras = palabras.reduce((s, p) => s + (p.texto.match(/\p{L}/gu) ?? []).length, 0)
      if (conLetras >= 30) {
        paginas.push(paginaDe(c, palabras))
        continue
      }
      // PDF escaneado: es una foto dentro de un PDF, se lee con el OCR.
      origen = 'ocr'
      lector ??= await crearLector(alAvanzar)
      const r = await leerLienzo(lector, c, avisos)
      paginas.push(paginaDe(r.lienzo, r.palabras))
    }
  } finally {
    await lector?.terminate()
    doc.destroy?.()
  }
  return { origen, paginas }
}

async function leerFoto(archivo, { giro = 0, alAvanzar }, avisos) {
  alAvanzar?.({ texto: 'Abriendo la foto…' })
  const { img, ancho, alto } = await abrirFoto(archivo)
  // Se lee a buen tamaño: el OCR falla con letra muy chica y no gana nada con fotos enormes.
  const lado = giro % 180 !== 0
  const anchoFinal = Math.min(ANCHO_LECTURA, Math.max(1600, (lado ? alto : ancho) * 1))
  const c = aLienzo(img, ancho, alto, anchoFinal, giro)
  const lector = await crearLector(alAvanzar)
  try {
    const r = await leerLienzo(lector, c, avisos)
    return { origen: 'ocr', paginas: [paginaDe(r.lienzo, r.palabras)] }
  } finally {
    await lector.terminate()
  }
}

/** Dibuja una página armada desde el Excel: celdas con su borde y sus renglones. */
function dibujarTabla(p, letra = 24) {
  const c = lienzo(p.ancho, p.alto)
  const ctx = c.getContext('2d')
  ctx.strokeStyle = '#3a4252'
  ctx.lineWidth = 2
  ctx.fillStyle = '#10131a'
  ctx.font = `${letra}px Arial, Helvetica, sans-serif`
  ctx.textBaseline = 'top'
  for (const celda of p.celdas) {
    ctx.strokeRect(celda.x, celda.y, celda.ancho, celda.alto)
    celda.renglones.forEach((t, k) => ctx.fillText(t, celda.x + letra * 0.45, celda.y + letra * 0.45 + k * letra * 1.3, celda.ancho - letra * 0.9))
  }
  return c
}

async function leerExcel(archivo, alAvanzar, avisos) {
  alAvanzar?.({ texto: 'Abriendo el Excel…' })
  const XLSX = await import('xlsx')
  // `cellStyles` hace falta para leer el ancho de las columnas.
  const libro = XLSX.read(new Uint8Array(await archivo.arrayBuffer()), { type: 'array', cellStyles: true })
  const nombre = libro.SheetNames.find((n) => libro.Sheets[n]?.['!ref']) ?? libro.SheetNames[0]
  const hoja = libro.Sheets[nombre]
  if (!hoja?.['!ref']) throw new Error('El Excel no tiene datos.')
  if (libro.SheetNames.length > 1) avisos.add(`El Excel tiene varias hojas: se usa «${nombre}».`)
  const rango = XLSX.utils.decode_range(hoja['!ref'])
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', raw: false, blankrows: true })
  const anchos = (hoja['!cols'] ?? []).slice(rango.s.c).map((c) => c?.wch ?? (c?.wpx ? c.wpx / 7 : 0))
  const combinadas = (hoja['!merges'] ?? []).map((m) => ({
    s: { r: m.s.r - rango.s.r, c: m.s.c - rango.s.c },
    e: { r: m.e.r - rango.s.r, c: m.e.c - rango.s.c },
  }))
  const paginas = maquetarTabla(filas, { anchos, combinadas })
  if (!paginas.length) throw new Error('El Excel no tiene datos.')
  if (paginas.length > MAX_PAGINAS) avisos.add(`La tabla ocupa ${paginas.length} páginas: se usan las primeras ${MAX_PAGINAS}.`)
  return {
    origen: 'excel',
    paginas: paginas.slice(0, MAX_PAGINAS).map((p) => {
      const c = dibujarTabla(p)
      return { ancho: p.ancho, alto: p.alto, imagen: aJpeg(c), palabras: p.palabras, reglas: p.reglas }
    }),
  }
}

/**
 * Lee el archivo entero. `giro` (0, 90, 180, 270) solo cuenta para fotos.
 * `alAvanzar({ texto, avance })` cuenta por dónde va.
 * Devuelve { origen: 'pdf-texto' | 'ocr' | 'excel', paginas, avisos }.
 */
export async function leerArchivo(archivo, { giro = 0, alAvanzar } = {}) {
  const mal = problemaDeArchivo(archivo)
  if (mal) throw new Error(mal)
  const avisos = new Set()
  const tipo = tipoDeArchivo(archivo)
  const r = tipo === 'pdf' ? await leerPdf(archivo, alAvanzar, avisos)
    : tipo === 'excel' ? await leerExcel(archivo, alAvanzar, avisos)
      : await leerFoto(archivo, { giro, alAvanzar }, avisos)
  return { ...r, avisos: [...avisos] }
}
