import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'

const release = process.argv[2] || '20260929-dashboard'
const previous = process.argv[3] || '20260928-web-update'
if (![release, previous].every(v => /^[a-z0-9-]+$/.test(v))) throw new Error('Nombre de versión inválido')
const dir = resolve(`ops/deploy-${release}`)
const key = join(process.env.TEMP, 'fom-deploy-key')
const before = execFileSync('ssh', ['-i', key, '-o', 'BatchMode=yes', 'fomadmin@10.20.30.10', 'cat /etc/nginx/sites-available/fom-mobile.conf'], { encoding: 'utf8' })
const oldRoot = `root /var/www/fom-web/releases/${previous};`
if (before.split(oldRoot).length !== 2) throw new Error('La raíz activa cambió; revisar antes de preparar.')
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'fom-mobile.before.conf'), before)
writeFileSync(join(dir, 'fom-mobile.after.conf'), before.replace(oldRoot, `root /var/www/fom-web/releases/${release};`))
let script = readFileSync('ops/deploy-20260928-web-update/activate-publication.sh', 'utf8')
script = script.replaceAll('20260928-web-update', release)
script = script.replace(/test "\$current" = [a-f0-9]{64}/, `test "$current" = ${createHash('sha256').update(before).digest('hex')}`)
script = script.replace('# Publish the v7 React build (2026-09-25). Only the web root changes.', '# Dashboard verified build, 2026-09-29. Only the web root changes.')
writeFileSync(join(dir, 'activate-publication.sh'), script.replaceAll('\r\n', '\n'))
cpSync('dist', join(dir, 'dist'), { recursive: true })
const lines = []
function walk(relative) {
 for (const entry of readdirSync(join(dir, relative), { withFileTypes: true })) {
  const path = `${relative}/${entry.name}`
  if (entry.isDirectory()) walk(path)
  else lines.push(`${createHash('sha256').update(readFileSync(join(dir, path))).digest('hex')}  ${path}`)
 }
}
walk('dist')
for (const name of ['activate-publication.sh', 'fom-mobile.after.conf']) lines.push(`${createHash('sha256').update(readFileSync(join(dir, name))).digest('hex')}  ${name}`)
writeFileSync(join(dir, 'SHA256SUMS'), lines.sort().join('\n') + '\n')
console.log(`Preparado: ${lines.length} archivos verificados. Referrer-Policy conservada.`)
