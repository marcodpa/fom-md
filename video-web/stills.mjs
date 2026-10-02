// Saca varios fotogramas sueltos de una composición con UN solo empaquetado (más rápido que un `still` por cada uno).
//   node stills.mjs <ComposicionId> <carpeta> 100 540 1200 …
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [id, dir, ...frames] = process.argv.slice(2)
mkdirSync(dir, { recursive: true })
const serveUrl = await bundle({ entryPoint: resolve(process.env.ENTRADA || 'src/indexPanel.tsx') })
const composition = await selectComposition({ serveUrl, id })
console.log(id, composition.durationInFrames, 'fotogramas')
for (const f of frames) {
  const output = join(dir, `f${String(f).padStart(5, '0')}.jpg`)
  await renderStill({ composition, serveUrl, output, frame: Number(f), imageFormat: 'jpeg', jpegQuality: 85 })
  console.log('ok', f)
}
