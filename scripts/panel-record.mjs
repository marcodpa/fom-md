// Records the DEMO dashboard as a supervisor of a company (localhost, project demo account),
// with a visible cursor and explanatory captions, then encodes an MP4.
// Needs the demo server:  npx vite --mode demo --host 127.0.0.1 --port 5191
// node scripts/panel-record.mjs <outDir> [out.mp4]
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { abrirChrome, sleep } from './cdp.mjs'

const dir = resolve(process.argv[2])
const salida = resolve(process.argv[3] || join(dir, 'panel.mp4'))
const base = 'http://127.0.0.1:5191'
rmSync(join(dir, 'frames'), { recursive: true, force: true })
mkdirSync(dir, { recursive: true })

const b = await abrirChrome({ width: 1920, height: 1080 })
const ev = b.evaluate

const OVERLAY = `(() => {
  if (document.getElementById('v-ov')) return
  const css = document.createElement('style')
  css.textContent = \`
  #v-cursor{position:fixed;left:960px;top:540px;width:34px;height:34px;z-index:2147483647;pointer-events:none;transition:left .9s cubic-bezier(.45,.05,.2,1),top .9s cubic-bezier(.45,.05,.2,1);filter:drop-shadow(0 4px 6px #0009)}
  #v-ripple{position:fixed;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid #349bfa;z-index:2147483646;pointer-events:none;opacity:0}
  #v-ripple.go{animation:vr .55s ease-out}
  @keyframes vr{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(3.2)}}
  #v-cap{position:fixed;left:50%;bottom:44px;transform:translate(-50%,20px);max-width:1180px;z-index:2147483645;pointer-events:none;opacity:0;transition:opacity .45s,transform .45s;
    background:linear-gradient(180deg,#0e1c29ee,#08121cee);border:1px solid #349bfa66;border-radius:18px;padding:18px 30px;color:#f3f7fc;font:600 30px/1.25 'Spline Sans',system-ui,sans-serif;letter-spacing:-.02em;box-shadow:0 24px 60px -20px #000;text-align:center}
  #v-cap small{display:block;margin-top:6px;font:400 20px/1.4 'Spline Sans',system-ui,sans-serif;color:#bccbdc;letter-spacing:0}
  #v-cap.on{opacity:1;transform:translate(-50%,0)}
  #v-card{position:fixed;inset:0;z-index:2147483644;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px;
    background:radial-gradient(900px 600px at 70% 20%,#12304d,transparent 70%),#071019;color:#f3f7fc;font-family:'Spline Sans',system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .6s}
  #v-card.on{opacity:1}
  #v-card b{font-size:96px;letter-spacing:-.04em;line-height:1.05;font-weight:600}
  #v-card span{font-size:34px;color:#bccbdc;max-width:1200px}
  #v-card i{font-style:normal;color:#349bfa}
  \`
  document.head.appendChild(css)
  const w = document.createElement('div'); w.id = 'v-ov'
  w.innerHTML = '<div id="v-card"></div><div id="v-cap"></div><div id="v-ripple"></div><svg id="v-cursor" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.6 14.8 L11.8 21.6 L14.6 20.3 L11.4 13.6 L17.8 13.4 Z" fill="#fff" stroke="#0b1824" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  document.body.appendChild(w)
})()`

const caption = async (t, sub = '') => {
  await ev(`(()=>{const c=document.getElementById('v-cap');c.innerHTML=${JSON.stringify(t)}+${JSON.stringify(sub ? '<small>' + sub + '</small>' : '')};c.classList.add('on')})()`)
}
const quitarCaption = () => ev(`document.getElementById('v-cap')?.classList.remove('on')`)
const tarjeta = async (html, on = true) => ev(`(()=>{const c=document.getElementById('v-card');${on ? `c.innerHTML=${JSON.stringify(html)};` : ''}c.classList.toggle('on',${on})})()`)

/** Finds a control by visible text: exact match first, scoped to the sidebar ("side"), the page ("main") or table rows ("row"). */
const hallar = (text, scope = 'main') => ev(`(() => {
  const colapsar = s => s.split(String.fromCharCode(10)).join(' ').split(String.fromCharCode(32)).filter(Boolean).join(' ')
  const norm = s => colapsar(s).trim().toLowerCase()
  const q = ${JSON.stringify(text)}.toLowerCase()
  const side = document.querySelector('aside')
  const sel = ${JSON.stringify(scope)} === 'row' ? 'tr,li,a' : 'a,button,[role=tab],label'
  const nodes = [...document.querySelectorAll(sel)].filter(n => ${JSON.stringify(scope)} === 'side' ? side?.contains(n) : !side?.contains(n))
  const txt = n => norm(n.innerText || '')
  const vis = n => { const r = n.getBoundingClientRect(); return r.width > 4 && r.height > 4 }
  const ok = nodes.filter(vis)
  const hit = ok.find(n => txt(n) === q) || ok.filter(n => txt(n).startsWith(q)).sort((a, b) => txt(a).length - txt(b).length)[0] || ok.filter(n => txt(n).includes(q)).sort((a, b) => txt(a).length - txt(b).length)[0]
  if (!hit) return null
  hit.scrollIntoView({ block: 'center' })
  const r = hit.getBoundingClientRect()
  return { x: Math.round(r.left + Math.min(r.width / 2, 140)), y: Math.round(r.top + r.height / 2) }
})()`)

const mover = async (x, y, ms = 900) => {
  await ev(`(()=>{const c=document.getElementById('v-cursor');c.style.left=${x - 6}+'px';c.style.top=${y - 3}+'px'})()`)
  await sleep(ms)
}
const clic = async (text, scope = 'main') => {
  let p = await hallar(text, scope)
  if (!p && scope === 'side') {
    // On the map the sidebar is collapsed: open it with the hamburger button first.
    const m = await ev(`(()=>{const x=document.querySelector('[aria-controls="panel-navigation"]');if(!x)return null;const r=x.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()`)
    if (m) {
      await mover(m.x, m.y, 700)
      for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x: m.x, y: m.y, button: 'left', clickCount: 1 })
      await sleep(900)
      p = await hallar(text, scope)
    }
  }
  if (!p) { console.log('  (no encontrado)', text, '|', await ev(`[...document.querySelectorAll('a,button,[role=tab]')].map(n=>(n.innerText||'').trim().split(String.fromCharCode(10)).join(' ')).filter(Boolean).slice(0,40).join(' ; ')`)); return false }
  await mover(p.x, p.y)
  await ev(`(()=>{const r=document.getElementById('v-ripple');r.style.left=${p.x}+'px';r.style.top=${p.y}+'px';r.classList.remove('go');void r.offsetWidth;r.classList.add('go')})()`)
  await sleep(120)
  // Real mouse events so React handlers and the router react like a person's click.
  for (const type of ['mousePressed', 'mouseReleased']) {
    await b.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 })
  }
  await sleep(500)
  console.log('  clic', text, '->', await ev('location.pathname'))
  return true
}
/** Smooth scroll of whichever container scrolls the dashboard. */
const desplazar = async (dy, ms = 2400) => {
  await ev(`(async () => {
    const cands = [...document.querySelectorAll('main, .pnl-main, .pnl-contenido, body')]
    const el = cands.find(e => e.scrollHeight > e.clientHeight + 60 && getComputedStyle(e).overflowY !== 'visible') || document.scrollingElement
    const t0 = performance.now(), y0 = el.scrollTop
    await new Promise(res => { const f = n => { const k = Math.min(1, (n - t0) / ${ms}); el.scrollTop = y0 + ${dy} * (k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2); k < 1 ? requestAnimationFrame(f) : res() }; requestAnimationFrame(f) })
  })()`)
}
const alTope = () => ev(`(()=>{const cands=[...document.querySelectorAll('main,.pnl-main,.pnl-contenido,body')];const el=cands.find(e=>e.scrollHeight>e.clientHeight+60&&getComputedStyle(e).overflowY!=='visible')||document.scrollingElement;el.scrollTop=0})()`)

let parar
try {
  await b.send('Page.navigate', { url: base + '/entrar' })
  await sleep(3500)
  await ev(OVERLAY)
  parar = await b.grabar(join(dir, 'frames'))
  const t0 = Date.now()

  // ── Apertura ────────────────────────────────────────────────
  await tarjeta('<b>El panel <i>FOM</i></b><span>Así supervisa una empresa su flota y a sus conductores, paso a paso.</span>')
  await sleep(3600)
  await tarjeta('', false)
  await sleep(700)

  // ── 0 · Entrar ──────────────────────────────────────────────
  await caption('Yeison es supervisor de Transporte Lago Sur', 'Entra al panel con su cuenta de empresa.')
  await sleep(2200)
  await clic('Rellenar')
  await sleep(700)
  await clic('Entrar')
  await sleep(4200)
  await ev(OVERLAY)

  // ── 1 · Centro de control ───────────────────────────────────
  await clic('Centro de control', 'side')
  await sleep(2500)
  await caption('Centro de control', 'Dónde está cada unidad, en vivo y en un solo mapa.')
  await sleep(3200)
  await clic('En marcha')
  await caption('Filtra por estado', 'Solo las unidades en marcha… o las detenidas.')
  await sleep(2400)
  await clic('Detenidas')
  await sleep(2200)
  await clic('Todas')
  await sleep(1200)
  await caption('Busca por placa, alias o conductor')
  const buscar = await ev(`(()=>{const i=document.querySelector('input[type=search],input[placeholder*="Placa"]');if(!i)return null;const r=i.getBoundingClientRect();return {x:Math.round(r.left+120),y:Math.round(r.top+r.height/2)}})()`)
  if (buscar) {
    await mover(buscar.x, buscar.y)
    await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: buscar.x, y: buscar.y, button: 'left', clickCount: 1 })
    await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: buscar.x, y: buscar.y, button: 'left', clickCount: 1 })
    for (const ch of 'Unidad 0') { await b.send('Input.insertText', { text: ch }); await sleep(180) }
    await sleep(2200)
  }

  // ── 2 · Resumen ─────────────────────────────────────────────
  await clic('Resumen', 'side')
  await sleep(1500)
  await caption('Resumen', 'Toda la operación de la empresa en una pantalla.')
  await sleep(3800)
  await desplazar(520, 2200)
  await caption('Flota, órdenes de trabajo y alertas al día', 'Inspecciones de hoy, mantenimiento y documentos por vencer.')
  await sleep(3400)
  await alTope()

  // ── 3 · Alertas ─────────────────────────────────────────────
  await clic('Alertas', 'side')
  await sleep(1500)
  await caption('Alertas', 'Excesos de velocidad, órdenes nuevas y revisiones pendientes.')
  await sleep(4000)
  await clic('Eventos de manejo')
  await caption('Eventos de manejo', 'Frenadas, aceleraciones y excesos de cada conductor.')
  await sleep(4200)

  // ── 4 · Vehículos ───────────────────────────────────────────
  await clic('Vehículos', 'side')
  await sleep(1600)
  await caption('Vehículos', 'Toda la flota en una tabla: estado, papeles y responsable.')
  await sleep(3600)
  await clic('Requieren atención')
  await caption('Lo que requiere atención', 'Papeles vencidos o unidades sin responsable.')
  await sleep(3200)
  await clic('Todas')
  await sleep(600)
  await clic('Unidad 01', 'row')
  await sleep(2200)
  await caption('Expediente de la unidad', 'Historial, documentos, mantenimiento y recorridos de una sola unidad.')
  await sleep(3600)
  await desplazar(560, 2400)
  await sleep(2600)
  await alTope()

  // ── 5 · Mantenimiento ───────────────────────────────────────
  await clic('Mantenimiento', 'side')
  await sleep(1600)
  await caption('Mantenimiento', 'Las órdenes de trabajo en un tablero: abiertas, en revisión y en taller.')
  await sleep(4200)
  await clic('Lista')
  await caption('También en lista', 'Con costos acumulados por orden.')
  await sleep(3400)

  // ── 6 · Inspecciones ────────────────────────────────────────
  await clic('Inspecciones', 'side')
  await sleep(1600)
  await caption('Inspecciones', 'Qué unidades se revisaron hoy, cuáles faltan y qué es lo que más falla.')
  await sleep(4400)
  await desplazar(380, 1800)
  await sleep(1800)
  await alTope()

  // ── 7 · Documentos ──────────────────────────────────────────
  await clic('Documentos', 'side')
  await sleep(1600)
  await caption('Documentos', 'Pólizas, certificados y licencias, con su fecha de vencimiento.')
  await sleep(4200)
  await caption('Atención inmediata', 'Lo vencido primero, y los vencimientos de los próximos seis meses.')
  await sleep(3600)

  // ── 8 · Gente ───────────────────────────────────────────────
  await clic('Gente', 'side')
  await sleep(1600)
  await caption('Gente', 'Los conductores y supervisores de la empresa, con su estado.')
  await sleep(3600)
  await clic('Conductores')
  await caption('Filtra por rol', 'Conductores, supervisores o personas de la empresa.')
  await sleep(3200)
  await desplazar(380, 2000)
  await sleep(1600)
  await alTope()

  // ── 9 · Reportes ────────────────────────────────────────────
  await clic('Reportes', 'side')
  await sleep(1600)
  await caption('Reportes', 'Kilómetros, órdenes de trabajo y el índice de manejo de toda la flota.')
  await sleep(3800)
  await clic('90 días')
  await caption('Cambia el período', 'Este mes, 90 días o el año. Exporta a CSV o PDF.')
  await sleep(3400)
  await desplazar(1100, 3200)
  await caption('Costos y desglose por vehículo', 'En qué se gasta y qué unidad rinde más.')
  await sleep(3800)
  await desplazar(700, 2600)
  await sleep(2400)

  // ── Cierre ──────────────────────────────────────────────────
  await quitarCaption()
  await sleep(500)
  await tarjeta('<b>Toda tu flota,<br><i>bajo control.</i></b><span>FOM · fom.md</span>')
  await sleep(4200)
  console.log('grabado', ((Date.now() - t0) / 1000).toFixed(1), 's')
} finally {
  const frames = parar ? await parar() : []
  b.close()
  if (frames.length) {
    const lista = frames.map((f, i) => `file '${f.file.replace(/\\/g, '/')}'\nduration ${Math.max(0.001, (frames[i + 1] ? frames[i + 1].t - f.t : 1)).toFixed(4)}`).join('\n') + `\nfile '${frames.at(-1).file.replace(/\\/g, '/')}'\n`
    writeFileSync(join(dir, 'frames.txt'), lista)
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dir, 'frames.txt'), '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', salida], { encoding: 'utf8' })
    console.log(r.status === 0 ? 'video ' + salida : r.stderr, frames.length + ' fotogramas')
  }
}
