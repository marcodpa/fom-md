// Section-by-section screenshots of a v7 route, for comparison with its slides.
// Drives a local Chrome through the DevTools protocol (no extra dependencies).
//
// node scripts/v7-shots.mjs <route> <outDir> [--width 1672] [--height 941] [--mobile] [--scroll <y>]
//
// Writes <outDir>/<nn>.png for every top-level <section>/<footer> in <main>, plus
// report.json with each section's box and the page's horizontal overflow.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const args = process.argv.slice(2)
// Routes may be given without the leading slash ("plataforma"), so Git Bash does not rewrite them.
const route = '/' + (args[0] || '').replace(/^\/+/, '')
const out = args[1] || join(tmpdir(), 'v7-shots')
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i > -1 ? args[i + 1] : fallback }
const mobile = args.includes('--mobile')
const width = Number(opt('width', mobile ? 390 : 1672))
const height = Number(opt('height', mobile ? 844 : 941))
const base = opt('base', 'http://127.0.0.1:5174')
const chromePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync)
if (!chromePath) throw new Error('No se encontró Chrome/Edge')
mkdirSync(out, { recursive: true })

const port = 9300 + Math.floor(Math.random() * 500)
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), `v7-chrome-${port}`)}`, 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200)
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page') } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0
const pending = new Map()
ws.addEventListener('message', e => { const msg = JSON.parse(e.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) } })
const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, m => m.error ? reject(new Error(m.error.message)) : resolve(m.result)); ws.send(JSON.stringify({ id: n, method, params })) })
const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value

try {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
  await send('Page.navigate', { url: base + route })
  await sleep(2500)
  const at = opt('scroll', null)
  if (at !== null) {
    // One live viewport (motion on) at a scroll position, e.g. to review section seams.
    await evaluate(`scrollTo(0, ${Number(at)})`)
    await sleep(2600)
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(out, `scroll-${at}.png`), Buffer.from(data, 'base64'))
    console.log(join(out, `scroll-${at}.png`))
    process.exit(0)
  }
  // Force lazy photos to load, then wait for fonts and images.
  await evaluate(`(async()=>{document.querySelectorAll('vite-error-overlay').forEach(e=>e.remove());document.documentElement.classList.add('v7-static');document.querySelectorAll('.v7-section').forEach(s=>s.classList.add('is-in'));document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager');await document.fonts.ready;await Promise.all([...document.images].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));await Promise.all([...document.images].map(i=>i.decode().catch(()=>0)));return true})()`)
  await sleep(800)
  const boxes = await evaluate(`[...document.querySelectorAll('main > section, main > footer, main > header, #contenido > section, #contenido > footer')].filter((e,i,a)=>a.indexOf(e)===i).map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.className.split(' ').slice(-1)[0],y:r.top+scrollY,h:r.height}})`)
  const overflow = await evaluate('document.documentElement.scrollWidth - innerWidth')
  const report = { route, width, height, overflow, sections: [] }
  for (const [index, box] of boxes.entries()) {
    const name = String(index + 1).padStart(2, '0')
    // The fixed header belongs to the first frame only, as in the slides.
    await evaluate(`scrollTo(0, ${box.y});document.querySelector('.m-header')?.style.setProperty('visibility', '${index ? 'hidden' : 'visible'}')`)
    await sleep(400)
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: box.y, width, height: Math.max(1, box.h), scale: 1 } })
    writeFileSync(join(out, `${name}.png`), Buffer.from(data, 'base64'))
    report.sections.push({ file: `${name}.png`, ...box })
  }
  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 1))
  console.log(JSON.stringify({ out, overflow, sections: report.sections.map(s => `${s.file} ${s.id} ${Math.round(s.h)}px`) }))
} finally {
  ws.close()
  chrome.kill()
}
