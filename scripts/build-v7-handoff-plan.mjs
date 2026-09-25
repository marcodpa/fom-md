import fs from 'node:fs'
import path from 'node:path'

const base = 'output/laminas-secciones-v7'
const manifest = JSON.parse(fs.readFileSync(`${base}/manifest.json`, 'utf8'))
const gallery = fs.readFileSync(`${base}/index.html`, 'utf8')
const selected = JSON.parse(gallery.match(/const jobs=(\[.*?\]);/s)[1])
const routes = ['/', '/plataforma', '/app', '/funciones', '/seguridad', '/areas', '/quienes-somos', '/que-ofrecemos', '/beneficios', '/preguntas-frecuentes', '/contacto']
const planPath = 'output/plan-implementacion-v7.json'
const previous = fs.existsSync(planPath) ? JSON.parse(fs.readFileSync(planPath, 'utf8')) : []
const relative = value => value.replaceAll('\\', '/').replace(/^.*?\/fom\//, '')
const plan = selected.map(job => {
  const entry = manifest.find(item => item.page === job.page && item.id === job.id)
  if (!entry || entry.file !== job.file) throw new Error(`Gallery/manifest mismatch: ${job.page}/${job.id}`)
  const image = `${base}/${job.file}`
  if (!fs.existsSync(image)) throw new Error(`Missing image: ${image}`)
  const prior = previous.find(item => item.page === job.page && item.id === job.id)
  return {
    page: job.page, pageName: job.pageName, route: routes[Number(job.page.slice(0, 2)) - 1], id: job.id,
    title: job.title, image,
    status: prior?.status ?? (job.page === '01-inicio' ? 'implemented-awaiting-user-review' : 'pending'),
    implementation: prior?.implementation ?? (job.page === '01-inicio' ? 'src/pages/HomeV7.jsx' : null),
    evidence: prior?.evidence ?? [],
    note: prior?.note ?? null,
    content: entry.content, guide: entry.guide,
    realScreenshots: (entry.refs || []).map(relative).filter(ref => ref.startsWith('src/assets/marketing/real/')),
  }
})
if (plan.length !== 90) throw new Error(`Expected 90 sections; found ${plan.length}`)
for (const item of plan) for (const ref of item.realScreenshots) if (!fs.existsSync(ref)) throw new Error(`Missing original screenshot: ${ref}`)
fs.writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n')
const groups = Object.groupBy(plan, item => item.page)
let md = '# Plan de implementación v7 — las 90 secciones\n\n'
md += 'Leer primero [CONTINUAR-REDISENO.md](../CONTINUAR-REDISENO.md). Fuente: selección de la galería y manifest.json, verificados entre sí.\n\n'
md += 'Estado: las once páginas implementadas y pendientes de revisión final del usuario. Las diez páginas nuevas siguen sus láminas y después recibieron la «segunda pasada» web pedida por el usuario (ver V7-METODO.md): algunas láminas se unieron en recorridos o se convirtieron en secciones sin foto. Actualizar `plan-implementacion-v7.json` conforme se implementa y regenerar con `node scripts/build-v7-handoff-plan.mjs`; el script conserva estado, implementación y evidencia existentes. No marcar terminada una sección por tener su PNG.\n\n'
md += '| Página | Ruta | Secciones |\n| --- | --- | --- |\n'
for (const items of Object.values(groups)) md += `| ${items[0].pageName} | \`${items[0].route}\` | ${items.length} |\n`
for (const items of Object.values(groups)) {
  md += `\n## ${items[0].pageName} — ${items[0].route}\n\n`
  md += '| ID | Sección | Imagen seleccionada | Estado |\n| --- | --- | --- | --- |\n'
  for (const item of items) {
    const link = path.posix.relative('output', item.image)
    md += `| ${item.id} | ${item.title.replaceAll('|', '\\|')} | [${path.posix.basename(item.image)}](${link}) | ${item.status} |\n`
  }
}
md += '\n## Criterio para cerrar cada página\n\n- Todas las secciones implementadas y vinculadas a su imagen exacta.\n- Fotografías sin texto web incrustado; pantallas originales superpuestas.\n- Contenido factual completo; controles HTML funcionales.\n- Evidencia visual por sección en escritorio y móvil, sin cortes ni desbordamientos.\n- Rutas, header, footer, formularios y FAQs revisados.\n- Compilación y pruebas correctas; cambios guardados en Git.\n'
fs.writeFileSync('output/PLAN-IMPLEMENTACION-V7.md', md)
console.log(`Verified ${plan.length} sections, ${Object.keys(groups).length} pages, ${plan.filter(item => item.image.endsWith('-v2.png')).length} selected revisions.`)
