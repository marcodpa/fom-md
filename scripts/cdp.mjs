// Minimal Chrome DevTools helper shared by the panel scripts (no extra dependencies).
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export const sleep = ms => new Promise(r => setTimeout(r, ms))

export async function abrirChrome({ width = 1920, height = 1080 } = {}) {
  const chromePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].find(existsSync)
  if (!chromePath) throw new Error('No se encontró Chrome/Edge')
  const port = 9300 + Math.floor(Math.random() * 500)
  const chrome = spawn(chromePath, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), `panel-chrome-${port}`)}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' })
  let target
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200)
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page') } catch {}
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise(r => ws.addEventListener('open', r, { once: true }))
  let id = 0
  const pending = new Map()
  const listeners = []
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) } else if (msg.method) listeners.forEach(l => l(msg))
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id
    pending.set(n, m => m.error ? reject(new Error(m.error.message)) : resolve(m.result))
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed')
    return r.result.value
  }
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
  /** Records the page through the screencast; returns stop() -> [{file, t}] with frames written to `dir`. */
  const grabar = async dir => {
    const { mkdirSync, writeFileSync } = await import('node:fs')
    mkdirSync(dir, { recursive: true })
    const frames = []
    listeners.push(m => {
      if (m.method !== 'Page.screencastFrame') return
      const { data, metadata, sessionId } = m.params
      const file = join(dir, String(frames.length).padStart(6, '0') + '.jpg')
      writeFileSync(file, Buffer.from(data, 'base64'))
      frames.push({ file, t: metadata.timestamp })
      send('Page.screencastFrameAck', { sessionId }).catch(() => {})
    })
    await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: width, maxHeight: height, everyNthFrame: 1 })
    return async () => { await send('Page.stopScreencast'); return frames }
  }
  return { send, evaluate, on: fn => listeners.push(fn), grabar, close: () => { ws.close(); chrome.kill() } }
}
