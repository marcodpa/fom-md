// Generate or edit an image with the OpenAI Images API (gpt-image-1).
// The key is read from OPENAI_API_KEY in .env (never committed) or the environment.
//
//   node scripts/openai-image.mjs "<prompt>" <out.png> [--ref imagen.png ...] [--size 1536x1024] [--quality high]
//
// Without --ref it creates a new image; with --ref it edits/uses those images as reference
// (e.g. a slide whose web text must be removed while keeping the photo identical).
// Each call is billed by OpenAI to the account that owns the key.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { basename, extname } from 'node:path'

const env = existsSync('.env') ? Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^["']|["']$/g, '')])) : {}
const key = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY
if (!key) { console.error('Falta OPENAI_API_KEY en .env'); process.exit(1) }

const args = process.argv.slice(2)
const [prompt, out] = args
if (!prompt || !out) { console.error('Uso: node scripts/openai-image.mjs "<prompt>" <salida.png> [--ref img ...] [--size 1536x1024] [--quality high]'); process.exit(1) }
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i > -1 ? args[i + 1] : fallback }
const refs = args.flatMap((a, i) => a === '--ref' ? [args[i + 1]] : [])
const size = opt('size', '1536x1024')
const quality = opt('quality', 'high')
const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

let response
if (refs.length) {
  const form = new FormData()
  form.append('model', 'gpt-image-1')
  form.append('prompt', prompt)
  form.append('size', size)
  form.append('quality', quality)
  for (const ref of refs) form.append('image[]', new Blob([readFileSync(ref)], { type: types[extname(ref).toLowerCase()] || 'image/png' }), basename(ref))
  response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form })
} else {
  response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size, quality }),
  })
}
const json = await response.json()
if (!response.ok) { console.error('Error de OpenAI:', json.error?.message || response.status); process.exit(1) }
writeFileSync(out, Buffer.from(json.data[0].b64_json, 'base64'))
console.log(`Imagen guardada en ${out}`)
