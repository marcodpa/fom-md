// ============================================================
// PESOS A MEDIA PRECISIÓN (T-179)
// ------------------------------------------------------------
// Guarda los pesos grandes de un modelo ONNX en float16 (la mitad de bytes) y
// antepone un nodo `Cast` que los vuelve a float32 al cargar: el cálculo sigue
// en float32, así que el recorte sale prácticamente igual y la descarga baja de
// 179 MB a 86 MB. Es lo mismo que hacía `herr/pesos16.py` en la prueba T-172,
// pero en JavaScript puro (sin Python ni el paquete `onnx`): se recorre el
// protobuf a mano porque solo hacen falta cuatro campos.
//
// Formato (onnx.proto): ModelProto.graph = 7; GraphProto.node = 1,
// .initializer = 5, .input = 11; TensorProto.dims = 1, .data_type = 2,
// .float_data = 4, .name = 8, .raw_data = 9, .data_location = 14.
// ============================================================

const FLOAT = 1
const FLOAT16 = 10
/** Los pesos pequeños (sesgos, escalas) se quedan en float32: no ahorran nada. */
const MINIMO = 1024

// --- Leer protobuf -----------------------------------------------------------

function leerVarint(b, i) {
  let valor = 0
  let mult = 1
  for (;;) {
    if (i >= b.length) throw new Error('Modelo ONNX cortado.')
    const byte = b[i++]
    valor += (byte & 0x7f) * mult
    if (byte < 0x80) return [valor, i]
    mult *= 128
  }
}

/** Cada campo del mensaje, en orden: { campo, tipo, inicio, fin, valor | datos }. */
function campos(b) {
  const lista = []
  let i = 0
  while (i < b.length) {
    const inicio = i
    let clave
    ;[clave, i] = leerVarint(b, i)
    const campo = Math.floor(clave / 8)
    const tipo = clave & 7
    const c = { campo, tipo, inicio }
    if (tipo === 0) [c.valor, i] = leerVarint(b, i)
    else if (tipo === 1) i += 8
    else if (tipo === 5) i += 4
    else if (tipo === 2) {
      let largo
      ;[largo, i] = leerVarint(b, i)
      c.datos = b.subarray(i, i + largo)
      i += largo
    } else throw new Error(`Tipo de campo ${tipo} no esperado en el modelo.`)
    if (i > b.length) throw new Error('Modelo ONNX cortado.')
    c.fin = i
    lista.push(c)
  }
  return lista
}

// --- Escribir protobuf -------------------------------------------------------

function varint(n) {
  const salida = []
  while (n >= 128) {
    salida.push((n % 128) | 0x80)
    n = Math.floor(n / 128)
  }
  salida.push(n)
  return Uint8Array.from(salida)
}
const texto = (s) => new TextEncoder().encode(s)
const campoVarint = (campo, n) => [varint(campo * 8), varint(n)]
const campoBytes = (campo, datos) => [varint(campo * 8 + 2), varint(datos.length), datos]

function unir(partes) {
  const total = partes.reduce((s, p) => s + p.length, 0)
  const salida = new Uint8Array(total)
  let i = 0
  for (const p of partes) {
    salida.set(p, i)
    i += p.length
  }
  return salida
}

// --- float32 → float16 (redondeo al par más cercano, como numpy) -------------

const f32 = new Float32Array(1)
const u32 = new Uint32Array(f32.buffer)

export function aFloat16(x) {
  f32[0] = x
  const bits = u32[0]
  const signo = (bits >>> 16) & 0x8000
  const exp = (bits >>> 23) & 0xff
  let mant = bits & 0x7fffff
  if (exp === 0xff) return signo | 0x7c00 | (mant ? 0x200 : 0) // infinito o NaN
  const e = exp - 127 + 15
  if (e >= 0x1f) return signo | 0x7c00 // demasiado grande: infinito
  if (e <= 0) {
    // Subnormal en float16 (o cero si es aún más pequeño).
    if (e < -10) return signo
    mant |= 0x800000
    const corrimiento = 14 - e
    let h = mant >>> corrimiento
    const resto = mant & ((1 << corrimiento) - 1)
    const mitad = 1 << (corrimiento - 1)
    if (resto > mitad || (resto === mitad && (h & 1))) h += 1
    return signo | h
  }
  let h = (e << 10) | (mant >>> 13)
  const resto = mant & 0x1fff
  // Si el redondeo desborda la mantisa, el acarreo sube el exponente (y llega a infinito si toca).
  if (resto > 0x1000 || (resto === 0x1000 && (h & 1))) h += 1
  return signo | h
}

// --- Conversión ---------------------------------------------------------------

/** Si el tensor es un peso float32 grande, lo devuelve en float16; si no, `null`. */
function tensorAMedia(datos) {
  const cs = campos(datos)
  const tipo = cs.find((c) => c.campo === 2)?.valor
  if (tipo !== FLOAT) return null
  if (cs.some((c) => c.campo === 14 && c.valor === 1)) return null // pesos en archivo aparte: no se tocan
  const dims = []
  for (const c of cs.filter((x) => x.campo === 1)) {
    if (c.tipo === 0) dims.push(c.valor)
    else for (let i = 0; i < c.datos.length;) { let d; [d, i] = leerVarint(c.datos, i); dims.push(d) }
  }
  const cuantos = dims.reduce((a, d) => a * d, 1)
  if (cuantos <= MINIMO) return null
  const nombre = new TextDecoder().decode(cs.find((c) => c.campo === 8)?.datos ?? new Uint8Array())
  const crudo = cs.find((c) => c.campo === 9)?.datos
  const flotantes = cs.find((c) => c.campo === 4 && c.tipo === 2)?.datos
  const fuente = crudo?.length ? crudo : flotantes
  if (!fuente || fuente.length !== cuantos * 4) return null
  // Copia alineada: los datos dentro del archivo pueden empezar en cualquier byte.
  const valores = new Float32Array(new Uint8Array(fuente).buffer)
  const medias = new Uint8Array(cuantos * 2)
  const vista = new DataView(medias.buffer)
  for (let i = 0; i < cuantos; i++) vista.setUint16(i * 2, aFloat16(valores[i]), true)
  const nuevo = unir([
    ...dims.flatMap((d) => campoVarint(1, d)),
    ...campoVarint(2, FLOAT16),
    ...campoBytes(8, texto(`${nombre}_f16`)),
    ...campoBytes(9, medias),
  ])
  return { nombre, nuevo }
}

/** Nodo `Cast(nombre_f16) → nombre` en float32. */
function nodoCast(nombre) {
  const atributo = unir([...campoBytes(1, texto('to')), ...campoVarint(3, FLOAT), ...campoVarint(20, 2 /* INT */)])
  return unir([
    ...campoBytes(1, texto(`${nombre}_f16`)),
    ...campoBytes(2, texto(nombre)),
    ...campoBytes(4, texto('Cast')),
    ...campoBytes(5, atributo),
  ])
}

function grafoAMedia(grafo) {
  const cs = campos(grafo)
  const convertidos = new Set()
  const partes = []
  for (const c of cs) {
    if (c.campo === 5 && c.tipo === 2) {
      const r = tensorAMedia(c.datos)
      if (r) {
        convertidos.add(r.nombre)
        partes.push(campoBytes(5, r.nuevo))
        continue
      }
    }
    partes.push([grafo.subarray(c.inicio, c.fin)])
  }
  // Los modelos viejos listan los pesos también como entradas del grafo: esas sobran.
  const final = []
  for (let k = 0; k < cs.length; k++) {
    const c = cs[k]
    if (c.campo === 11 && c.tipo === 2) {
      const nombre = campos(c.datos).find((x) => x.campo === 1)?.datos
      if (nombre && convertidos.has(new TextDecoder().decode(nombre))) continue
    }
    final.push(...partes[k])
  }
  // Los Cast van primero: los nodos deben estar en orden y los pesos se usan desde el principio.
  const casts = [...convertidos].flatMap((n) => campoBytes(1, nodoCast(n)))
  return { grafo: unir([...casts, ...final]), convertidos: convertidos.size }
}

/** El modelo ONNX (bytes) con sus pesos grandes en float16. Devuelve `{ bytes, convertidos }`. */
export function aMediaPrecision(modelo) {
  // Un Buffer de Node se ve como Uint8Array normal: su `slice` no copia y confundiría las cuentas.
  const b = ArrayBuffer.isView(modelo) ? new Uint8Array(modelo.buffer, modelo.byteOffset, modelo.byteLength) : new Uint8Array(modelo)
  const partes = []
  let convertidos = 0
  for (const c of campos(b)) {
    if (c.campo === 7 && c.tipo === 2) {
      const r = grafoAMedia(c.datos)
      convertidos += r.convertidos
      partes.push(...campoBytes(7, r.grafo))
    } else partes.push(b.subarray(c.inicio, c.fin))
  }
  if (!convertidos) throw new Error('El modelo no tiene pesos float32 que convertir.')
  return { bytes: unir(partes), convertidos }
}
