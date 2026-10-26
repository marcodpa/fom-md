import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'vite'
import { aFloat16, aMediaPrecision } from '../scripts/onnx-media-precision.mjs'
import { AVISOS, LIENZO, caja, encaje, limpiar, normalizar, revisar } from '../src/panel/quitador/mascara.js'
import {
  configurarCloudinary, etiquetas, ids, olvidarFotos, quitarFondoDisponible, subirRecorte, urlDe,
} from '../src/panel/datos/cloudinary.js'

// ============================================================
// T-179: quitar el fondo de la foto del vehículo en el navegador
//  · el modelo pasa a media precisión sin Python (scripts/onnx-media-precision.mjs);
//  · la máscara: se queda la unidad, avisos de foto mala, lienzo 8:5 como el catálogo;
//  · el recorte se guarda en fom/vehiculo-sin-fondo/<id>/<n> (mismo n que la original);
//  · se muestra el recorte de la foto VIGENTE, si no la foto, si no el catálogo;
//  · nada pide ya el recorte de pago de Cloudinary;
//  · el modelo y el motor no van en git y la compilación los exige.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const ruta = (r) => join(raiz, r).replace(/\\/g, '/')
const leer = (r) => readFileSync(join(raiz, r), 'utf8')

// --- Un ONNX de juguete, escrito a mano -----------------------------------------

function varint(n) {
  const s = []
  while (n >= 128) { s.push((n % 128) | 0x80); n = Math.floor(n / 128) }
  s.push(n)
  return Buffer.from(s)
}
const bytes = (campo, datos) => Buffer.concat([varint(campo * 8 + 2), varint(datos.length), Buffer.from(datos)])
const numero = (campo, n) => Buffer.concat([varint(campo * 8), varint(n)])
function tensor(nombre, dims, valores) {
  const raw = Buffer.from(new Float32Array(valores).buffer)
  return Buffer.concat([...dims.map((d) => numero(1, d)), numero(2, 1), bytes(8, nombre), bytes(9, raw)])
}
function leerCampos(b) {
  const lista = []
  let i = 0
  const v = () => { let x = 0, m = 1; for (;;) { const c = b[i++]; x += (c & 0x7f) * m; if (c < 0x80) return x; m *= 128 } }
  while (i < b.length) {
    const k = v(); const campo = Math.floor(k / 8); const tipo = k & 7
    if (tipo === 0) lista.push({ campo, valor: v() })
    else { const n = v(); lista.push({ campo, datos: b.subarray(i, i + n) }); i += n }
  }
  return lista
}
const txt = (d) => Buffer.from(d).toString('utf8')

test('media precisión: los pesos grandes pasan a float16 con su Cast y lo demás queda igual', () => {
  const grande = Array.from({ length: 2048 }, (_, i) => (i - 1024) / 256)
  const grafo = Buffer.concat([
    bytes(1, Buffer.concat([bytes(1, 'x'), bytes(1, 'w'), bytes(2, 'y'), bytes(4, 'MatMul')])),
    bytes(5, tensor('w', [2, 1024], grande)),
    bytes(5, tensor('b', [4], [1, 2, 3, 4])),
    bytes(11, bytes(1, 'x')),
    bytes(11, bytes(1, 'w')), // modelo viejo: el peso listado también como entrada
  ])
  const modelo = Buffer.concat([numero(1, 7), bytes(7, grafo), bytes(8, Buffer.concat([numero(2, 13)]))])
  const { bytes: salida, convertidos } = aMediaPrecision(modelo)
  assert.equal(convertidos, 1)
  const top = leerCampos(Buffer.from(salida))
  assert.deepEqual(top.map((c) => c.campo), [1, 7, 8], 'el resto del modelo (versión, opset) sigue igual y en su orden')
  const g = leerCampos(top[1].datos)
  // Primero el Cast, luego el nodo original.
  const nodos = g.filter((c) => c.campo === 1).map((c) => leerCampos(c.datos))
  assert.equal(nodos.length, 2)
  assert.deepEqual(nodos[0].filter((c) => c.campo !== 5).map((c) => txt(c.datos)), ['w_f16', 'w', 'Cast'])
  const atributo = leerCampos(nodos[0].find((c) => c.campo === 5).datos)
  assert.equal(txt(atributo.find((c) => c.campo === 1).datos), 'to')
  assert.equal(atributo.find((c) => c.campo === 3).valor, 1, 'vuelve a float32')
  assert.equal(txt(nodos[1].find((c) => c.campo === 4).datos), 'MatMul')
  // El peso grande en float16 (2 bytes por valor) y el pequeño intacto.
  const pesos = g.filter((c) => c.campo === 5).map((c) => leerCampos(c.datos))
  const w = pesos.find((t) => txt(t.find((c) => c.campo === 8).datos) === 'w_f16')
  assert.equal(w.find((c) => c.campo === 2).valor, 10)
  assert.deepEqual(w.filter((c) => c.campo === 1).map((c) => c.valor), [2, 1024])
  const raw = w.find((c) => c.campo === 9).datos
  assert.equal(raw.length, 2048 * 2)
  assert.equal(raw.readUInt16LE(1024 * 2), 0x0000) // 0
  assert.equal(raw.readUInt16LE(1280 * 2), 0x3c00) // 1
  const b = pesos.find((t) => txt(t.find((c) => c.campo === 8).datos) === 'b')
  assert.equal(b.find((c) => c.campo === 2).valor, 1)
  // La entrada que era el peso sobra (si no, el grafo tendría dos fuentes para «w»).
  assert.deepEqual(g.filter((c) => c.campo === 11).map((c) => txt(leerCampos(c.datos)[0].datos)), ['x'])
  // Siempre el mismo resultado: la huella anotada en bajar-modelo.mjs se puede comprobar.
  assert.deepEqual(aMediaPrecision(modelo).bytes, salida)
})

test('float16 redondea como numpy (al par más cercano)', () => {
  assert.equal(aFloat16(1), 0x3c00)
  assert.equal(aFloat16(-2), 0xc000)
  assert.equal(aFloat16(65504), 0x7bff)
  assert.equal(aFloat16(65520), 0x7c00) // ya no cabe: infinito
  assert.equal(aFloat16(1 + 2 ** -11), 0x3c00) // empate: al par
  assert.equal(aFloat16(1 + 3 * 2 ** -11), 0x3c02)
  assert.equal(aFloat16(2 ** -24), 0x0001) // el subnormal más pequeño
  assert.equal(aFloat16(1e-9), 0)
  assert.equal(aFloat16(NaN) & 0x7c00, 0x7c00)
})

// --- La máscara -----------------------------------------------------------------

/** Máscara n×n con rectángulos llenos: [x0, y0, x1, y1). */
function mascara(n, ...rects) {
  const m = new Float32Array(n * n)
  for (const [x0, y0, x1, y1] of rects) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * n + x] = 1
  return m
}

test('limpiar deja solo la unidad (la mancha más grande) con su borde suave', () => {
  const n = 64
  const m = mascara(n, [10, 20, 50, 50], [2, 2, 6, 6]) // la unidad y una persona suelta
  m[20 * n + 9] = 0.3 // borde suave pegado a la unidad
  const { cobertura } = limpiar(m, n)
  assert.equal(m[3 * n + 3], 0, 'lo suelto se borra')
  assert.equal(m[30 * n + 30], 1)
  assert.equal(m[20 * n + 9], Math.fround(0.3), 'el borde suave junto a la unidad se queda')
  assert.ok(Math.abs(cobertura - (40 * 30) / (n * n)) < 1e-9)
})

test('avisos de foto mala: casi vacía, casi toda la foto y cortada por 3 bordes', () => {
  const n = 100
  assert.deepEqual(revisar(mascara(n, [30, 40, 70, 70]), n, 0.12), [])
  assert.deepEqual(revisar(mascara(n, [45, 45, 50, 50]), n, 0.0025), ['vacia'])
  assert.deepEqual(revisar(mascara(n, [0, 0, 100, 100]), n, 1), ['toda', 'cortada'])
  assert.deepEqual(revisar(mascara(n, [0, 20, 100, 100]), n, 0.5), ['cortada'], 'izquierda, derecha y abajo')
  assert.deepEqual(revisar(mascara(n, [0, 30, 100, 80]), n, 0.5), [], 'solo dos bordes: una unidad larga de lado está bien')
  for (const clave of ['vacia', 'toda', 'cortada']) assert.match(AVISOS[clave], /\.$/u)
})

test('normalizar, caja y encaje: la unidad entera, centrada y con el suelo al 92 % (como el catálogo)', () => {
  assert.deepEqual([...normalizar(new Float32Array([2, 4, 6]))], [0, 0.5, 1])
  const n = 50
  assert.deepEqual(caja(mascara(n, [10, 5, 40, 30]), n), { x0: 10, y0: 5, x1: 40, y1: 30 })
  assert.equal(caja(new Float32Array(n * n), n), null)
  // Una camioneta ancha (3:1.4) llena el ancho útil; un camión alto, el alto útil.
  const ancha = encaje(300, 140)
  assert.equal(Math.round(ancha.ancho), Math.round(LIENZO.ancho * 0.92))
  assert.equal(ancha.y + ancha.alto, LIENZO.alto * 0.92)
  assert.equal(Math.round(ancha.x * 2 + ancha.ancho), LIENZO.ancho)
  const alto = encaje(100, 120)
  assert.equal(Math.round(alto.alto), Math.round(LIENZO.alto * (0.92 - 0.06)))
  assert.equal(LIENZO.ancho / LIENZO.alto, 8 / 5)
})

// --- Cloudinary: el recorte -------------------------------------------------------

function nubeFalsa(existentes = []) {
  const hay = new Set(existentes)
  const subidas = []
  const original = globalThis.fetch
  globalThis.fetch = async (url, op = {}) => {
    const u = String(url)
    if (op.method === 'HEAD') return { ok: hay.has(u.split('/image/upload/')[1].split('?')[0]) }
    if (u.endsWith('/image/upload')) {
      const id = op.body.get('public_id')
      subidas.push({ id, tags: op.body.get('tags'), archivo: op.body.get('file') })
      if (hay.has(id)) return { ok: true, json: async () => ({ existing: true, secure_url: `https://x/${id}` }) }
      hay.add(id)
      return { ok: true, json: async () => ({ secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${id}.webp` }) }
    }
    throw new Error(`llamada inesperada: ${u}`)
  }
  return { hay, subidas, restaurar: () => { globalThis.fetch = original } }
}

test('el recorte se guarda con el MISMO número que la original y su propia etiqueta', async (t) => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  olvidarFotos()
  const nube = nubeFalsa()
  t.after(nube.restaurar)
  const recorte = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' })
  assert.equal(await subirRecorte(recorte, { vehiculoId: 'v7', n: 3, titulo: 'A12BC3D' }), 'fom/vehiculo-sin-fondo/v7/3')
  assert.equal(nube.subidas[0].id, 'fom/vehiculo-sin-fondo/v7/3')
  assert.equal(nube.subidas[0].tags, 'fom_vehiculo_sin_fondo_v7')
  assert.notEqual(nube.subidas[0].tags, etiquetas.vehiculo('v7'), 'no se mezcla con las fotos de la unidad')
  assert.equal(nube.subidas[0].archivo.type, 'image/webp')
  // Sin firma no se reemplaza: si ya había, se dice claro.
  await assert.rejects(subirRecorte(recorte, { vehiculoId: 'v7', n: 3 }), /ya tenía su versión sin fondo/)
  await assert.rejects(subirRecorte(recorte, { vehiculoId: 'v7' }), /de qué foto/)
  assert.equal(ids.vehiculoSinFondo('v7'), 'fom/vehiculo-sin-fondo/v7')
})

test('ya no se pide el recorte de pago de Cloudinary (e_background_removal)', () => {
  configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  assert.equal(quitarFondoDisponible(), false)
  assert.doesNotMatch(urlDe('fom/vehiculo/v1/2', 900, 600, { sinFondo: true }), /background_removal/)
  for (const archivo of ['src/panel/datos/cloudinary.js', 'src/panel/comp/FotoUnidad.jsx', 'src/panel/comp/MiniFoto.jsx']) {
    assert.doesNotMatch(leer(archivo).replace(/^\s*\/\/.*$/gmu, ''), /e_background_removal|VITE_CLOUDINARY_SIN_FONDO/u, archivo)
  }
})

// --- Qué foto se muestra ------------------------------------------------------------

const ENTRADA = 'virtual:prueba-foto-vehiculo'
async function fotoVehiculoCompilado() {
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    plugins: [{
      name: 'entrada-prueba',
      resolveId: (id) => (id.endsWith(ENTRADA) ? '\0' + ENTRADA : null),
      load: (id) => (id === '\0' + ENTRADA
        ? `export * from '${ruta('src/panel/datos/fotoVehiculo.js')}'
           export { configurarCloudinary } from '${ruta('src/panel/datos/cloudinary.js')}'`
        : null),
    }],
    build: { write: false, minify: false, lib: { entry: ENTRADA, formats: ['es'], fileName: 'prueba' } },
  })
  const codigo = salida[0].output.find((o) => o.type === 'chunk').code
  return import('data:text/javascript;base64,' + Buffer.from(`${codigo}\n// ${Math.random()}`).toString('base64'))
}

test('se muestra el recorte de la foto VIGENTE; uno de una foto vieja no cuenta', async (t) => {
  const m = await fotoVehiculoCompilado()
  m.configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  m.olvidarRecortes()
  // v1: dos fotos y el recorte de la 2. v2: tres fotos, recorte solo de la 1 (luego subió otras sin recortar).
  const nube = nubeFalsa(['fom/vehiculo/v1/1', 'fom/vehiculo/v1/2', 'fom/vehiculo-sin-fondo/v1/2',
    'fom/vehiculo/v2/1', 'fom/vehiculo/v2/2', 'fom/vehiculo/v2/3', 'fom/vehiculo-sin-fondo/v2/1'])
  t.after(nube.restaurar)
  assert.deepEqual(await m.buscarFotos('v1'), { original: 'fom/vehiculo/v1/2', recorte: 'fom/vehiculo-sin-fondo/v1/2' })
  assert.deepEqual(await m.buscarFotos('v2'), { original: 'fom/vehiculo/v2/3', recorte: null })
  assert.deepEqual(await m.buscarFotos('v3'), { original: null, recorte: null })
  assert.equal(await m.buscarRecorte('v1'), 'fom/vehiculo-sin-fondo/v1/2')

  // Al aceptar el recorte de la foto 3 de v2, pasa a mostrarse.
  await m.guardarRecorte(new Blob([new Uint8Array([9])], { type: 'image/webp' }), { vehiculoId: 'v2', n: 3 })
  assert.equal(await m.buscarRecorte('v2'), 'fom/vehiculo-sin-fondo/v2/3')
})

test('el orden: recorte, foto normal, catálogo por marca y modelo, silueta', async () => {
  const m = await fotoVehiculoCompilado()
  m.configurarCloudinary({ nube: 'demo', preset: 'sin_firma' })
  const catalogo = (marca, modelo, tipo) => (marca === 'Toyota' && /hilux/i.test(modelo)
    ? { url: '/assets/toyota-hilux.png', silueta: false }
    : { url: `/assets/silueta-${tipo || 'camioneta'}.png`, silueta: true })
  const hilux = { marca: 'Toyota', modelo: 'Hilux 4x4', tipo: 'camioneta' }
  const ambos = { original: 'fom/vehiculo/v1/2', recorte: 'fom/vehiculo-sin-fondo/v1/2' }

  const r = m.elegirFoto(ambos, hilux, { catalogo })
  assert.equal(r.tipo, 'recorte')
  assert.match(r.url, /\/f_auto,q_auto,w_800,c_limit\/fom\/vehiculo-sin-fondo\/v1\/2\?v=/)
  assert.equal(m.elegirFoto({ original: ambos.original }, hilux, { catalogo }).tipo, 'foto')
  // En «Mi unidad» solo valen fotos sin fondo: la foto normal no cuenta.
  assert.deepEqual(m.elegirFoto({ original: ambos.original }, hilux, { catalogo, conFotoNormal: false }),
    { tipo: 'catalogo', id: null, url: '/assets/toyota-hilux.png' })
  assert.deepEqual(m.elegirFoto({}, { marca: 'Iveco', modelo: 'Daily', tipo: 'camion' }, { catalogo }),
    { tipo: 'silueta', id: null, url: '/assets/silueta-camion.png' })
  assert.equal(m.elegirFoto({}, hilux).tipo, null, 'sin catálogo, nada')
})

// --- El modelo y el motor fuera de git, y exigidos al compilar --------------------

test('el modelo y el motor no van en git y `npm run build` los exige', () => {
  const ignorados = leer('.gitignore')
  assert.match(ignorados, /^public\/modelos\/$/mu)
  assert.match(ignorados, /^public\/ort\/$/mu)
  const paquete = JSON.parse(leer('package.json'))
  assert.equal(paquete.scripts.prebuild, 'node scripts/bajar-modelo.mjs --comprobar')
  assert.match(paquete.dependencies['onnxruntime-web'], /^1\.30\.0$/)
  const script = leer('scripts/bajar-modelo.mjs')
  assert.match(script, /https:\/\/github\.com\/danielgatis\/rembg\/releases\/download\/v0\.0\.0\/isnet-general-use\.onnx/)
  assert.match(script, /SHA_ORIGEN = '[0-9a-f]{64}'/)
  assert.match(script, /SHA_MODELO = '[0-9a-f]{64}'/)
  // El trabajador pide justo esos archivos, y versionados con la huella y la versión del motor.
  const trabajador = leer('src/panel/quitador/quitarFondo.worker.js')
  const huella = script.match(/SHA_MODELO = '([0-9a-f]{8})/)[1]
  assert.match(trabajador, new RegExp(`modelos/isnet-fp16\\.onnx\\?v=${huella}`))
  assert.match(trabajador, /ort\/ort-wasm-simd-threaded\.asyncify\.wasm\?v=1\.30\.0/)
  // Sin COOP/COEP: un solo hilo de WASM.
  assert.match(trabajador, /numThreads = 1/)
  assert.match(leer('LICENCIAS-TERCEROS.md'), /Apache-2\.0[\s\S]*DIS5K[\s\S]*onnxruntime-web[\s\S]*MIT/)
})
