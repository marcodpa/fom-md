// Chrome/Edge SIN VENTANA a 390 × 844 (3x) con la app de la demo, manejado por una pequeña API
// local, para sacar las capturas de la app real (T-147).
//
//   node tools/app-demo-api/capturar.mjs          (control en http://localhost:8791)
//
// Lo que hace aparte del navegador: desvía las fotos de «Cloudinary» (nube fom-demo, que no
// existe) al servidor falso, y corta cualquier otra petición a Cloudinary: nada sale a la nube
// real. Sin dependencias: habla DevTools por WebSocket, como scripts/cdp.mjs.
//
// Órdenes (GET salvo /eval, que es POST con la expresión en el cuerpo):
//   /ir?url=…            abre una dirección (relativa a la app: /login, /, /orden?id=…)
//   /eval                evalúa JS en la página y devuelve el valor
//   /tocar?texto=…[&n=0] pulsa el elemento visible cuyo texto es exactamente ése
//   /tocarxy?x=…&y=…     pulsa en un punto (px CSS)
//   /escribir?texto=…    escribe en el campo con foco
//   /tecla?k=Enter
//   /tam?alto=844        cambia el alto de la ventana (para capturas largas)
//   /foto?archivo=…      guarda PNG (3x) de lo que se ve
//   /consola             lo último que escribió la página en la consola
//   /cerrar              cierra el navegador y este proceso
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const APP = process.env.APP_URL ?? 'http://localhost:8098'
const API = process.env.API ?? 'http://localhost:8790'
const CONTROL = Number(process.env.PUERTO_CONTROL ?? 8791)
const ANCHO = 390
let alto = 844
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const ruta = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
if (!ruta) throw new Error('No se encontró Chrome ni Edge')
const puertoCdp = 9400 + Math.floor(Math.random() * 400)
const perfil = join(tmpdir(), 'fom-app-demo-chrome')
const chrome = spawn(ruta, [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${puertoCdp}`, `--user-data-dir=${perfil}`, `--window-size=${ANCHO},${alto}`, 'about:blank',
], { stdio: 'ignore' })

let pagina
for (let i = 0; i < 60 && !pagina; i++) {
  await sleep(250)
  try {
    pagina = (await (await fetch(`http://127.0.0.1:${puertoCdp}/json`)).json()).find((t) => t.type === 'page')
  } catch {
    /* todavía arrancando */
  }
}
const ws = new WebSocket(pagina.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let n = 0
const esperando = new Map()
const consola = []
let archivosListos = []
ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data)
  if (m.id && esperando.has(m.id)) {
    esperando.get(m.id)(m)
    esperando.delete(m.id)
    return
  }
  if (m.method === 'Runtime.consoleAPICalled') {
    consola.push(`[${m.params.type}] ${m.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`.slice(0, 600))
    if (consola.length > 300) consola.shift()
  }
  if (m.method === 'Fetch.requestPaused') desviar(m.params).catch(() => {})
  // El selector de archivos (Galería): se le dan las fotos preparadas con /archivos.
  if (m.method === 'Page.fileChooserOpened' && archivosListos.length) {
    enviar('DOM.setFileInputFiles', { files: archivosListos, backendNodeId: m.params.backendNodeId }).catch(() => {})
  }
})
const enviar = (method, params = {}) =>
  new Promise((ok, mal) => {
    const id = ++n
    esperando.set(id, (m) => (m.error ? mal(new Error(m.error.message)) : ok(m.result)))
    ws.send(JSON.stringify({ id, method, params }))
  })

// El render del catálogo de la app (assets/images/vehiculos/<marca>/<año>/<modelo>.png) NO
// se usa: Marco quiere fotos reales con licencia libre. Se pide al servidor falso la de esa
// marca y modelo (datos.mjs → fotoDeVehiculo); si aún no hay, un PNG transparente y la
// tarjeta queda sin vehículo hasta que llegue la buena.
const PNG_VACIO = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg=='

/** Cloudinary de la demo → servidor falso; cualquier otra cosa de Cloudinary, cortada. */
async function desviar({ requestId, request }) {
  const u = new URL(request.url)
  const arte = decodeURIComponent(u.pathname + u.search).match(/vehiculos\/([a-z0-9-]+)\/\d{4}\/([a-z0-9-]+)(?:\.[a-f0-9]+)?\.png/)
  if (arte) {
    const r = await fetch(`${API}/__demo/foto-vehiculo?marca=${arte[1]}&modelo=${arte[2]}`).catch(() => null)
    const ok = r?.ok
    const cuerpo = ok ? Buffer.from(await r.arrayBuffer()).toString('base64') : PNG_VACIO
    const tipo = ok ? r.headers.get('content-type') : 'image/png'
    return enviar('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: tipo }, { name: 'Cache-Control', value: 'no-store' }], body: cuerpo })
  }
  if (!u.hostname.endsWith('cloudinary.com')) return enviar('Fetch.continueRequest', { requestId })
  const demo = u.hostname === 'res.cloudinary.com' && u.pathname.startsWith('/fom-demo/')
  if (!demo) {
    if (u.hostname === 'api.cloudinary.com') {
      const cuerpo = JSON.stringify({ public_id: 'demo/no-subido', version: 1, format: 'jpg', secure_url: '' })
      return enviar('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body: Buffer.from(cuerpo).toString('base64') })
    }
    return enviar('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' })
  }
  const r = await fetch(`${API}/__cloudinary${u.pathname.slice('/fom-demo'.length)}`, { method: request.method === 'HEAD' ? 'HEAD' : 'GET' })
  const cuerpo = request.method === 'HEAD' ? Buffer.alloc(0) : Buffer.from(await r.arrayBuffer())
  const cabeceras = [{ name: 'Access-Control-Allow-Origin', value: '*' }]
  if (r.headers.get('content-type')) cabeceras.push({ name: 'Content-Type', value: r.headers.get('content-type') })
  await enviar('Fetch.fulfillRequest', { requestId, responseCode: r.status, responseHeaders: cabeceras, body: cuerpo.toString('base64') })
}

async function medidas() {
  await enviar('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: alto, deviceScaleFactor: 3, mobile: true, screenWidth: ANCHO, screenHeight: alto })
}
await enviar('Page.enable')
await enviar('Runtime.enable')
await medidas()
await enviar('Emulation.setEmulatedMedia', {
  features: [
    { name: 'prefers-color-scheme', value: 'dark' },
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ],
})
await enviar('Emulation.setTimezoneOverride', { timezoneId: 'America/Caracas' })
await enviar('Emulation.setLocaleOverride', { locale: 'es-VE' }).catch(() => {})
await enviar('Page.setInterceptFileChooserDialog', { enabled: true })
await enviar('Fetch.enable', { patterns: [{ urlPattern: '*://res.cloudinary.com/*' }, { urlPattern: '*://api.cloudinary.com/*' }, { urlPattern: '*vehiculos*' }] })

async function evaluar(expr) {
  const r = await enviar('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'fallo al evaluar')
  return r.result.value
}

async function tocarEn(x, y) {
  await enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await sleep(40)
  await enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
}

// El elemento visible MÁS PEQUEÑO cuyo texto es exactamente `texto` (el n-ésimo, de arriba abajo).
const BUSCAR = (texto, k, contiene = false, pulsar = false) => `(() => {
  const t = ${JSON.stringify(texto)};
  const vistos = [...document.querySelectorAll('body *')].filter((el) => {
    const txt = el.innerText ?? '';
    const plano = txt.replace(/[\\s\\u00a0]+/g, ' ').trim();
    if (txt.length > 120 || !(${contiene} ? plano.includes(t) : plano === t)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  });
  const hojas = vistos.filter((el) => !vistos.some((o) => o !== el && el.contains(o)));
  hojas.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  const el = hojas[${k}];
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (${pulsar}) (el.closest('button,[role=button],[role=tab],[role=link],a') ?? el).click();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`

const control = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  const q = url.searchParams
  const responder = (cuerpo, estado = 200) => {
    res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(cuerpo))
  }
  try {
    switch (url.pathname) {
      case '/ir': {
        const destino = q.get('url') ?? '/'
        await enviar('Page.navigate', { url: destino.startsWith('http') ? destino : `${APP}${destino}` })
        await sleep(Number(q.get('espera') ?? 2500))
        return responder({ ok: true })
      }
      case '/eval': {
        let cuerpo = ''
        for await (const t of req) cuerpo += t
        return responder({ valor: await evaluar(cuerpo) })
      }
      case '/pulsar':
      case '/tocar': {
        // /pulsar: click() del DOM sobre el botón (lo que entienden los Pressable de la web);
        // /tocar: clic de ratón de DevTools en su centro.
        const pulsar = url.pathname === '/pulsar'
        const punto = await evaluar(BUSCAR(q.get('texto'), Number(q.get('n') ?? 0), q.get('contiene') === '1', pulsar))
        if (!punto) return responder({ ok: false, error: 'no encontrado' }, 404)
        if (!pulsar) await tocarEn(punto.x, punto.y)
        await sleep(Number(q.get('espera') ?? 1200))
        return responder({ ok: true, ...punto })
      }
      case '/tocarxy':
        await tocarEn(Number(q.get('x')), Number(q.get('y')))
        await sleep(Number(q.get('espera') ?? 1200))
        return responder({ ok: true })
      case '/arrastrar': {
        // De (x, y) a (x2, y2) en pasos, como un dedo: abre hojas y desplaza listas.
        const [x, y, x2, y2] = ['x', 'y', 'x2', 'y2'].map((k) => Number(q.get(k)))
        const pasos = Number(q.get('pasos') ?? 12)
        if (q.get('toque') === '1') {
          // Con el dedo (eventos táctiles): lo que entienden los gestos de react-native-gesture-handler.
          await enviar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
          await enviar('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
          for (let i = 1; i <= pasos; i++) {
            await sleep(16)
            await enviar('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + ((x2 - x) * i) / pasos, y: y + ((y2 - y) * i) / pasos }] })
          }
          await sleep(60)
          await enviar('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
          await enviar('Emulation.setTouchEmulationEnabled', { enabled: false })
          await sleep(Number(q.get('espera') ?? 1200))
          return responder({ ok: true })
        }
        await enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
        await enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
        for (let i = 1; i <= pasos; i++) {
          await sleep(16)
          await enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + ((x2 - x) * i) / pasos, y: y + ((y2 - y) * i) / pasos, button: 'left', buttons: 1 })
        }
        await sleep(60)
        await enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', clickCount: 1 })
        await sleep(Number(q.get('espera') ?? 1200))
        return responder({ ok: true })
      }
      case '/rueda': {
        // Rueda del ratón sobre un punto: desplaza el ScrollView que haya debajo.
        const x = Number(q.get('x') ?? 195)
        const y = Number(q.get('y') ?? 400)
        await enviar('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: Number(q.get('dy') ?? 400) })
        await sleep(Number(q.get('espera') ?? 900))
        return responder({ ok: true })
      }
      case '/puntero': {
        // Toque con PointerEvents sintéticos sobre lo que haya en (x, y): los gestos de
        // react-native-gesture-handler en la web no se enteran de los clics de DevTools.
        const x = Number(q.get('x'))
        const y = Number(q.get('y'))
        await evaluar(`(async () => {
          const el = document.elementFromPoint(${x}, ${y});
          const o = { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: ${x}, clientY: ${y}, button: 0, buttons: 1 };
          el.dispatchEvent(new PointerEvent('pointerdown', o));
          await new Promise((r) => setTimeout(r, 60));
          el.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 }));
        })()`)
        await sleep(Number(q.get('espera') ?? 1200))
        return responder({ ok: true })
      }
      case '/archivos':
        // Rutas (separadas por coma) que recibirá el próximo selector de archivos.
        archivosListos = (q.get('rutas') ?? '').split(',').filter(Boolean)
        return responder({ ok: true, archivos: archivosListos })
      case '/escribir':
        await enviar('Input.insertText', { text: q.get('texto') ?? '' })
        return responder({ ok: true })
      case '/tecla': {
        const k = q.get('k') ?? 'Enter'
        const codigo = { Enter: 13, Tab: 9, Escape: 27 }[k] ?? 0
        await enviar('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: codigo, ...(k === 'Enter' ? { text: '\r' } : {}) })
        await enviar('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: codigo })
        await sleep(800)
        return responder({ ok: true })
      }
      case '/tam':
        alto = Number(q.get('alto') ?? 844)
        await medidas()
        await sleep(Number(q.get('espera') ?? 1200))
        return responder({ ok: true, alto })
      case '/foto': {
        const archivo = q.get('archivo')
        mkdirSync(dirname(archivo), { recursive: true })
        const { data } = await enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
        writeFileSync(archivo, Buffer.from(data, 'base64'))
        return responder({ ok: true, archivo })
      }
      case '/consola':
        return responder(consola.slice(-Number(q.get('n') ?? 40)))
      case '/cerrar':
        responder({ ok: true })
        ws.close()
        chrome.kill()
        setTimeout(() => process.exit(0), 300)
        return
      default:
        return responder({ error: 'orden desconocida' }, 404)
    }
  } catch (e) {
    responder({ error: String(e?.message ?? e) }, 500)
  }
})
control.listen(CONTROL, () =>
  console.log(`Navegador sin ventana listo · control http://localhost:${CONTROL} · PID ${process.pid} · Chrome PID ${chrome.pid}`),
)
