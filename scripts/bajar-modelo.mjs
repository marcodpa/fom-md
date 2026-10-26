// ============================================================
// EL PROGRAMA QUE QUITA EL FONDO DE LA FOTO DEL VEHÍCULO (T-179)
// ------------------------------------------------------------
// La web quita el fondo en el propio navegador con IS-Net «uso general» (DIS,
// Apache-2.0) sobre onnxruntime-web (MIT). Ninguno de los dos pesados va en git:
//
//   public/modelos/isnet-fp16.onnx   el modelo, 86 MB (pesos a media precisión)
//   public/ort/ort-wasm-simd-threaded.asyncify.{wasm,mjs}   el motor, 27 MB
//
// Este script los deja en su sitio y comprueba que son los buenos:
//
//   node scripts/bajar-modelo.mjs              baja y prepara lo que falte
//   node scripts/bajar-modelo.mjs --comprobar  solo revisa (lo usa `npm run build`)
//
// El modelo se baja de su origen oficial (las publicaciones de rembg, que lo
// distribuyen en ONNX con la misma licencia), se comprueba su SHA-256, se pasa
// a media precisión (scripts/onnx-media-precision.mjs) y se comprueba el
// resultado. El motor se copia de node_modules/onnxruntime-web (versión fijada
// en package.json): lo que se publica es exactamente lo que instala npm.
//
// Huellas SHA-256 anotadas el 26 oct 2026 (T-179):
//   isnet-general-use.onnx (oficial, 178.648.008 bytes)
//     60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a
//   isnet-fp16.onnx (resultado, 90.650.345 bytes)
//     fbb5c080bf4f5c87f9a18e6b2ff68755bf330c48391ef5cd24f7f1d112fa1bca
// Si alguna no coincide, el script se detiene y no deja nada a medias.
// ============================================================

import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { aMediaPrecision } from './onnx-media-precision.mjs'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))

export const ORIGEN = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx'
export const SHA_ORIGEN = '60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a'
export const SHA_MODELO = 'fbb5c080bf4f5c87f9a18e6b2ff68755bf330c48391ef5cd24f7f1d112fa1bca'

const MODELO = join(RAIZ, 'public/modelos/isnet-fp16.onnx')
const MOTOR_ORIGEN = join(RAIZ, 'node_modules/onnxruntime-web/dist')
const MOTOR_DESTINO = join(RAIZ, 'public/ort')
// Solo el motor con WebGPU (y WASM de respaldo): es el que carga `onnxruntime-web/webgpu`.
const MOTOR = ['ort-wasm-simd-threaded.asyncify.wasm', 'ort-wasm-simd-threaded.asyncify.mjs']

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`

function huella(ruta) {
  return new Promise((listo, fallo) => {
    const h = createHash('sha256')
    createReadStream(ruta).on('data', (d) => h.update(d)).on('end', () => listo(h.digest('hex'))).on('error', fallo)
  })
}

/** Lo que falta o está mal, en frases cortas. Vacío si todo está en su sitio. */
export async function revisar() {
  const problemas = []
  if (!existsSync(MODELO)) problemas.push('falta public/modelos/isnet-fp16.onnx')
  else if ((await huella(MODELO)) !== SHA_MODELO) problemas.push('public/modelos/isnet-fp16.onnx no es el esperado (huella distinta)')
  for (const archivo of MOTOR) {
    const destino = join(MOTOR_DESTINO, archivo)
    if (!existsSync(destino)) { problemas.push(`falta public/ort/${archivo}`); continue }
    const origen = join(MOTOR_ORIGEN, archivo)
    // Tras actualizar onnxruntime-web, la copia vieja ya no casa con el código: hay que volver a copiarla.
    if (existsSync(origen) && (await huella(origen)) !== (await huella(destino))) {
      problemas.push(`public/ort/${archivo} no es de la versión instalada de onnxruntime-web`)
    }
  }
  return problemas
}

async function bajar(url, destino) {
  const r = await fetch(url, { redirect: 'follow' })
  if (!r.ok || !r.body) throw new Error(`No se pudo bajar el modelo (${r.status} ${r.statusText}).`)
  const total = Number(r.headers.get('content-length')) || 0
  const salida = createWriteStream(destino)
  let llevado = 0
  let ultimo = 0
  for await (const trozo of r.body) {
    llevado += trozo.length
    if (!salida.write(trozo)) await new Promise((s) => salida.once('drain', s))
    if (Date.now() - ultimo > 1000) {
      ultimo = Date.now()
      process.stdout.write(`\r  bajando ${mb(llevado)}${total ? ` de ${mb(total)}` : ''}   `)
    }
  }
  await new Promise((listo, fallo) => salida.end((e) => (e ? fallo(e) : listo())))
  process.stdout.write(`\r  bajado ${mb(llevado)}                    \n`)
}

async function prepararModelo() {
  if (existsSync(MODELO) && (await huella(MODELO)) === SHA_MODELO) {
    console.log('El modelo ya está en public/modelos/ y es el bueno.')
    return
  }
  const temporal = join(tmpdir(), `fom-isnet-general-use-${process.pid}.onnx`)
  try {
    console.log(`Bajando IS-Net uso general de ${ORIGEN}`)
    await bajar(ORIGEN, temporal)
    const h = await huella(temporal)
    if (h !== SHA_ORIGEN) throw new Error(`El archivo bajado no es el esperado.\n  huella: ${h}\n  debía:  ${SHA_ORIGEN}`)
    console.log('Huella del original correcta. Pasando los pesos a media precisión…')
    const { bytes, convertidos } = aMediaPrecision(readFileSync(temporal))
    const hm = createHash('sha256').update(bytes).digest('hex')
    if (hm !== SHA_MODELO) throw new Error(`El modelo convertido no es el esperado.\n  huella: ${hm}\n  debía:  ${SHA_MODELO}`)
    mkdirSync(join(RAIZ, 'public/modelos'), { recursive: true })
    writeFileSync(`${MODELO}.parcial`, bytes)
    renameSync(`${MODELO}.parcial`, MODELO)
    console.log(`Listo: public/modelos/isnet-fp16.onnx (${mb(bytes.length)}, ${convertidos} pesos convertidos).`)
  } finally {
    if (existsSync(temporal)) unlinkSync(temporal)
  }
}

function copiarMotor() {
  if (!existsSync(MOTOR_ORIGEN)) throw new Error('Falta node_modules/onnxruntime-web: corre `npm install` primero.')
  mkdirSync(MOTOR_DESTINO, { recursive: true })
  for (const archivo of MOTOR) {
    writeFileSync(join(MOTOR_DESTINO, archivo), readFileSync(join(MOTOR_ORIGEN, archivo)))
    console.log(`Motor copiado: public/ort/${archivo} (${mb(statSync(join(MOTOR_DESTINO, archivo)).size)})`)
  }
}

const mismo = (a, b) => resolve(a).toLowerCase() === resolve(b).toLowerCase()
const directo = Boolean(process.argv[1]) && mismo(fileURLToPath(import.meta.url), process.argv[1])
if (directo) {
  try {
    if (process.argv.includes('--comprobar')) {
      const problemas = await revisar()
      if (problemas.length) {
        console.error('\nNo se puede compilar la web: falta el programa que quita el fondo de las fotos.')
        for (const p of problemas) console.error(`  - ${p}`)
        console.error('\nCórrelo una vez (baja ~180 MB y deja 113 MB en public/):\n  node scripts/bajar-modelo.mjs\n')
        process.exit(1)
      }
      console.log('Quitador de fondo: modelo y motor en su sitio.')
    } else {
      await prepararModelo()
      copiarMotor()
      const problemas = await revisar()
      if (problemas.length) throw new Error(problemas.join('; '))
      console.log('Todo en su sitio.')
    }
  } catch (e) {
    console.error(`\n${e.message}\n`)
    process.exit(1)
  }
}
