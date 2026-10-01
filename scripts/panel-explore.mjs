// Logs into the DEMO panel (localhost, project demo account) and dumps nav + a screenshot per module.
// node scripts/panel-explore.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { abrirChrome, sleep } from './cdp.mjs'

const out = process.argv[2]
const base = 'http://127.0.0.1:5191'
mkdirSync(out, { recursive: true })
const b = await abrirChrome()
const shot = async name => writeFileSync(join(out, name + '.png'), Buffer.from((await b.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
try {
  await b.send('Page.navigate', { url: base + '/entrar' })
  await sleep(3500)
  console.log(await b.evaluate(`[...document.querySelectorAll('button')].map(x=>x.innerText.trim()).join(' | ')`))
  await b.evaluate(`[...document.querySelectorAll('button')].find(x=>/Rellenar/i.test(x.innerText))?.click()`)
  await sleep(500)
  await b.evaluate(`document.querySelector('button[type=submit]')?.click()`)
  await sleep(4000)
  console.log(await b.evaluate('location.pathname'))
  await shot('00-inicio')
  for (const r of ['', 'alertas', 'flota', 'seguridad', 'jornadas', 'mantenimiento', 'mantenimiento/planes', 'inspecciones', 'inspecciones/programa', 'documentos', 'personal', 'reportes']) {
    await b.send('Page.navigate', { url: base + '/panel/' + r })
    await sleep(3500)
    await shot((r || 'resumen').replace('/', '-'))
    console.log(r || 'resumen', await b.evaluate('location.pathname'))
  }
} finally { b.close() }
