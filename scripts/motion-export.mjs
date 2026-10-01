// Render the FOM motion loop (/motion?export=1) to frames and, unless --stills, to an MP4.
// The piece is scrubbed deterministically (one GSAP timeline), so the video is frame-exact.
//
//   node scripts/motion-export.mjs [outDir] [--fps 30] [--scale 1.5] [--stills 0.5,2.6,...] [--base http://127.0.0.1:5174]
//
// scale 1.5 → 1080×1920. Needs Chrome/Edge and (for the MP4) ffmpeg on the PATH.
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const args = process.argv.slice(2)
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i > -1 ? args[i + 1] : fallback }
const out = args[0] && !args[0].startsWith('--') ? args[0] : 'output/motion'
const fps = Number(opt('fps', 30)), scale = Number(opt('scale', 1.5)), base = opt('base', 'http://127.0.0.1:5174')
const stills = opt('stills', null)?.split(',').map(Number)
const DURATION = 12.6
const chromePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
if (!chromePath) throw new Error('No se encontró Chrome/Edge')
const frames = join(out, 'frames')
rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true })

const port = 9800 + Math.floor(Math.random() * 300)
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), `motion-chrome-${port}`)}`, 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let target
for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page') } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r, { once: true }))
let id = 0; const pending = new Map()
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, m => m.error ? rej(new Error(m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: n, method, params })) })
const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 720, height: 1280, deviceScaleFactor: scale, mobile: false })
  await send('Page.navigate', { url: `${base}/motion?export=1` })
  for (let i = 0; i < 60 && !(await evaluate('window.__fomLoopReady === true')); i++) await sleep(250)
  await evaluate('document.fonts.ready.then(() => true)')
  await sleep(500)
  const times = stills ?? Array.from({ length: Math.round(DURATION * fps) }, (_, i) => i / fps)
  for (const [i, t] of times.entries()) {
    await evaluate(`window.__fomSeek(${t})`)
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(frames, stills ? `t${String(t).replace('.', '_')}.png` : `f${String(i).padStart(4, '0')}.png`), Buffer.from(data, 'base64'))
  }
  console.log(`${times.length} fotogramas en ${frames}`)
} finally { ws.close(); chrome.kill() }

if (!stills) {
  const mp4 = join(out, 'fom-loop.mp4')
  const r = spawnSync('ffmpeg', ['-y', '-framerate', String(fps), '-i', join(frames, 'f%04d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: 'inherit' })
  if (r.status === 0) { rmSync(frames, { recursive: true, force: true }); console.log(`Video: ${mp4}`) }
}
