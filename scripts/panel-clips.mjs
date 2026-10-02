// Graba CLIPS limpios del panel (modo demostración, cuenta del supervisor) para el video de Remotion.
// Cada clip sale como MP4 sin rótulos (solo cursor y clic) más un JSON con «marcas»: el momento y el
// rectángulo en pantalla de los elementos importantes, para que Remotion los señale con exactitud.
//
//   node scripts/panel-clips.mjs <carpetaSalida> [nombre1 nombre2 …]     (sin nombres: todos)
//
// Necesita el servidor de demostración:  npx vite --mode demo --host 127.0.0.1 --port 5191
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { abrirChrome, sleep } from './cdp.mjs'
import { GUIONES } from './panel-clips-guion.mjs'

const salida = resolve(process.argv[2] || 'clips')
const pedidos = process.argv.slice(3)
const base = process.env.PANEL_BASE || 'http://127.0.0.1:5191'
mkdirSync(salida, { recursive: true })

const OVERLAY = `(() => {
  if (document.getElementById('v-ov')) return
  const css = document.createElement('style')
  css.textContent = \`
  #v-cursor{position:fixed;left:960px;top:540px;width:34px;height:34px;z-index:2147483647;pointer-events:none;transition:left .8s cubic-bezier(.45,.05,.2,1),top .8s cubic-bezier(.45,.05,.2,1);filter:drop-shadow(0 4px 6px #0009)}
  #v-ripple{position:fixed;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid #349bfa;z-index:2147483646;pointer-events:none;opacity:0}
  #v-ripple.go{animation:vr .55s ease-out}
  @keyframes vr{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(3.2)}}\`
  document.head.appendChild(css)
  const w = document.createElement('div'); w.id = 'v-ov'
  w.innerHTML = '<div id="v-ripple"></div><svg id="v-cursor" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.6 14.8 L11.8 21.6 L14.6 20.3 L11.4 13.6 L17.8 13.4 Z" fill="#fff" stroke="#0b1824" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  document.body.appendChild(w)
})()`

async function grabar(nombre, guion) {
  const dir = join(salida, '_frames-' + nombre)
  rmSync(dir, { recursive: true, force: true })
  const b = await abrirChrome({ width: 1920, height: 1080 })
  const ev = b.evaluate
  const marcas = []
  let parar
  let t0 = 0
  try {
    // Entrar (salvo el clip del acceso, que empieza en la pantalla de login).
    if (guion.inicio === '/entrar') {
      await b.send('Page.navigate', { url: base + '/entrar' })
      await sleep(3500)
    } else {
      await b.send('Page.navigate', { url: base + '/entrar' }); await sleep(3000)
      await ev(`[...document.querySelectorAll('button')].find(x=>/Rellenar/i.test(x.innerText))?.click()`); await sleep(400)
      await ev(`document.querySelector('button[type=submit]')?.click()`); await sleep(3500)
      await b.send('Page.navigate', { url: base + (guion.inicio || '/panel') }); await sleep(guion.esperaInicial ?? 4500)
    }
    await ev(OVERLAY)

    const colapsar = `const colapsar = s => s.split(String.fromCharCode(10)).join(' ').split(String.fromCharCode(32)).filter(Boolean).join(' ')`
    const hallar = (text, scope = 'main') => ev(`(() => {
      ${colapsar}
      const norm = s => colapsar(s).trim().toLowerCase()
      const q = ${JSON.stringify(text)}.toLowerCase()
      const side = document.querySelector('aside')
      const sel = ${JSON.stringify(scope)} === 'row' ? 'tr,li,a,[role=button]' : 'a,button,[role=tab],label,summary'
      const nodes = [...document.querySelectorAll(sel)].filter(n => ${JSON.stringify(scope)} === 'side' ? side?.contains(n) : ${JSON.stringify(scope)} === 'any' ? true : !side?.contains(n))
      const txt = n => norm(n.innerText || n.getAttribute('aria-label') || '')
      const vis = n => { const r = n.getBoundingClientRect(); return r.width > 4 && r.height > 4 }
      const ok = nodes.filter(vis)
      const hit = ok.find(n => txt(n) === q) || ok.filter(n => txt(n).startsWith(q)).sort((a, b) => txt(a).length - txt(b).length)[0] || ok.filter(n => txt(n).includes(q)).sort((a, b) => txt(a).length - txt(b).length)[0]
      if (!hit) return null
      hit.scrollIntoView({ block: 'nearest' })
      const r = hit.getBoundingClientRect()
      return { x: Math.round(r.left + Math.min(r.width / 2, 140)), y: Math.round(r.top + r.height / 2), rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } }
    })()`)
    const rectDe = (selector) => ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } })()`)

    const p = {
      b, ev, sleep,
      esperar: (ms) => sleep(ms),
      mover: async (x, y, ms = 800) => { await ev(`(()=>{const c=document.getElementById('v-cursor');c.style.left=${x - 6}+'px';c.style.top=${y - 3}+'px'})()`); await sleep(ms) },
      async clic(text, scope = 'main', espera = 700) {
        const h = await hallar(text, scope)
        if (!h) { console.log('   (no encontrado)', text); return false }
        await p.mover(h.x, h.y)
        await ev(`(()=>{const r=document.getElementById('v-ripple');r.style.left=${h.x}+'px';r.style.top=${h.y}+'px';r.classList.remove('go');void r.offsetWidth;r.classList.add('go')})()`)
        await sleep(120)
        for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x: h.x, y: h.y, button: 'left', clickCount: 1 })
        await sleep(espera)
        return true
      },
      async clicEn(x, y, espera = 700) {
        await p.mover(x, y)
        await ev(`(()=>{const r=document.getElementById('v-ripple');r.style.left=${x}+'px';r.style.top=${y}+'px';r.classList.remove('go');void r.offsetWidth;r.classList.add('go')})()`)
        await sleep(120)
        for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })
        await sleep(espera)
      },
      async clicSel(selector, espera = 700) {
        const r = await rectDe(selector)
        if (!r) { console.log('   (no encontrado)', selector); return false }
        await p.clicEn(r.x + Math.min(r.w / 2, 160), r.y + r.h / 2, espera)
        return true
      },
      async escribir(texto, ms = 160) { for (const ch of texto) { await b.send('Input.insertText', { text: ch }); await sleep(ms) } },
      async tecla(key, ms = 700) {
        await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: key === 'Escape' ? 27 : 13 })
        await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: key === 'Escape' ? 27 : 13 })
        await sleep(ms)
      },
      async borrar(n, ms = 90) {
        for (let i = 0; i < n; i++) {
          await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 })
          await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 })
          await sleep(ms)
        }
      },
      /** Punto de pantalla a una fracción del trazo de un viaje (la línea invisible ancha que recibe el cursor). */
      puntoDeViaje: (indice, fraccion) => ev(`(()=>{const ps=[...document.querySelectorAll('path.leaflet-interactive')].filter(x=>x.getAttribute('stroke-width')==='24'&&x.getTotalLength()>50);const q=ps[${indice}]||ps.at(-1);if(!q)return null;const len=q.getTotalLength();const pt=q.getPointAtLength(len*${fraccion});const m=q.getScreenCTM();return {x:Math.round(pt.x*m.a+m.e),y:Math.round(pt.y*m.d+m.f)}})()`),
      async rueda(x, y, deltaY, veces = 1, ms = 450) {
        await p.mover(x, y, 600)
        for (let i = 0; i < veces; i++) { await b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY }); await sleep(ms) }
      },
      async pasar(x, y, ms = 600) { await p.mover(x, y, ms); await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await sleep(ms) },
      async desplazar(dy, ms = 2200) {
        await ev(`(async () => {
          const cands = [...document.querySelectorAll('main, .pnl-main, .pnl-contenido, body')]
          const el = cands.find(e => e.scrollHeight > e.clientHeight + 60 && getComputedStyle(e).overflowY !== 'visible') || document.scrollingElement
          const t0 = performance.now(), y0 = el.scrollTop
          await new Promise(res => { const f = n => { const k = Math.min(1, (n - t0) / ${ms}); el.scrollTop = y0 + ${dy} * (k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2); k < 1 ? requestAnimationFrame(f) : res() }; requestAnimationFrame(f) })
        })()`)
      },
      alTope: () => ev(`(()=>{const cands=[...document.querySelectorAll('main,.pnl-main,.pnl-contenido,body')];const el=cands.find(e=>e.scrollHeight>e.clientHeight+60&&getComputedStyle(e).overflowY!=='visible')||document.scrollingElement;el.scrollTop=0})()`),
      /** Anota «ahora» y el rectángulo de un elemento (por selector CSS o por texto). */
      async marcar(nombreMarca, selectorOTexto, scope = 'main') {
        let rect = await rectDe(selectorOTexto)
        if (!rect) rect = (await hallar(selectorOTexto, scope))?.rect ?? null
        marcas.push({ t: +((Date.now() - t0) / 1000).toFixed(2), nombre: nombreMarca, rect })
        if (!rect) console.log('   (marca sin elemento)', nombreMarca)
      },
      async abrirMenu() {
        const m = await ev(`(()=>{const x=document.querySelector('[aria-controls="panel-navigation"]');if(!x)return null;const r=x.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()`)
        if (m) await p.clicEn(m.x, m.y, 900)
      },
      async irA(texto) { // navegación por la barra lateral (abre el menú si está plegado)
        if (!(await hallar(texto, 'side'))) await p.abrirMenu()
        return p.clic(texto, 'side', 1200)
      },
    }

    parar = await b.grabar(dir)
    t0 = Date.now()
    await guion.hacer(p)
    await sleep(500)
  } finally {
    const frames = parar ? await parar() : []
    b.close()
    if (frames.length) {
      const lista = frames.map((f, i) => `file '${f.file.replace(/\\/g, '/')}'\nduration ${Math.max(0.001, (frames[i + 1] ? frames[i + 1].t - f.t : 1)).toFixed(4)}`).join('\n') + `\nfile '${frames.at(-1).file.replace(/\\/g, '/')}'\n`
      writeFileSync(join(dir, 'frames.txt'), lista)
      const mp4 = join(salida, nombre + '.mp4')
      const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dir, 'frames.txt'), '-vf', 'fps=30,scale=1920:1080:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-movflags', '+faststart', mp4], { encoding: 'utf8' })
      const dur = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' }).stdout.trim()
      writeFileSync(join(salida, nombre + '.json'), JSON.stringify({ nombre, duracion: Number(dur), marcas }, null, 1))
      console.log(r.status === 0 ? `✔ ${nombre}  ${Number(dur).toFixed(1)} s  ${frames.length} fotogramas  ${marcas.length} marcas` : 'ffmpeg: ' + r.stderr)
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

const nombres = pedidos.length ? pedidos : Object.keys(GUIONES)
for (const n of nombres) {
  if (!GUIONES[n]) { console.log('no existe el guion', n); continue }
  console.log('→ grabando', n)
  await grabar(n, GUIONES[n])
}
