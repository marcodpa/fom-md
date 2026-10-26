// Saca EN LOTE las capturas de la app real con la demo (T-161), manejando capturar.mjs.
//
//   node tools/app-demo-api/servidor.mjs      (8790)
//   node tools/app-demo-api/app-expo.mjs      (8098; la primera carga tarda ~1,5 min)
//   node tools/app-demo-api/capturar.mjs      (8791)
//   node tools/app-demo-api/lote.mjs [--dir <carpeta>] [nombre …]
//
// Sin nombres saca todas; con nombres, solo ésas (p. ej. `m-cond-inicio m-sup-mapa`). Por defecto
// guarda en comparativa/web-v8-fotos/capturas-app/3x con el mismo nombre de archivo de siempre.
// Antes de cada captura deja el servidor falso como al arrancar (/__demo/reiniciar) y entra con
// la cuenta que toque, así cada una sale igual aunque se saque sola.
//
// Fotos de órdenes: datos.mjs las busca en fotos/ (falla-1.jpg, falla-2.jpg, luz-trasera.jpg,
// taller.jpg: fotos reales con licencia de comparativa/fotos-ordenes, T-169); si no están, las
// órdenes salen sin fotos. Las de la Galería (inspección, reportar) salen de esa misma carpeta.
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as D from './datos.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const CONTROL = process.env.CONTROL ?? 'http://localhost:8791'
const API = process.env.API ?? 'http://localhost:8790'
const args = process.argv.slice(2)
const iDir = args.indexOf('--dir')
const DIR = resolve(iDir >= 0 ? args.splice(iDir, 2)[1] : join(AQUI, '../../comparativa/web-v8-fotos/capturas-app/3x'))
const pedidas = args

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

// --- La API de capturar.mjs ------------------------------------------------------------------
async function orden(nombre, q = {}) {
  const r = await fetch(`${CONTROL}/${nombre}?${new URLSearchParams(q)}`)
  const cuerpo = await r.json()
  if (!r.ok) throw new Error(`${nombre} ${JSON.stringify(q)} → ${cuerpo.error ?? r.status}`)
  return cuerpo
}
async function ev(js) {
  const r = await (await fetch(`${CONTROL}/eval`, { method: 'POST', body: js })).json()
  if (r.error) throw new Error(r.error)
  return r.valor
}
const ir = (url, espera = 4000) => orden('ir', { url, espera })
/** Pulsa (click del DOM) el elemento visible cuyo texto es `texto` (o lo contiene). */
const pulsar = (texto, { n = 0, contiene = false, espera = 1500 } = {}) =>
  orden('pulsar', { texto, n, contiene: contiene ? 1 : 0, espera })
const ruta = () => ev('location.pathname + location.search')
/** La próxima vez que la app abra la Galería recibe estas fotos de fotos/. */
const fotosParaGaleria = (...nombres) =>
  orden('archivos', { rutas: nombres.map((n) => join(AQUI, 'fotos', n).replaceAll('\\', '/')).join(',') })
/** Pulsa «Galería» (la n-ésima visible) con las fotos dadas y espera a que salga la miniatura. */
async function galeria(n, ...nombres) {
  await fotosParaGaleria(...nombres)
  const antes = await ev(`document.querySelectorAll('[aria-label^="Ver la foto"],img[src^="blob:"]').length`)
  await pulsar('Galería', { n, espera: 1500 })
  const fin = Date.now() + 10000
  while (Date.now() < fin) {
    const ahora = await ev(`document.querySelectorAll('[aria-label^="Ver la foto"],img[src^="blob:"]').length`)
    if (ahora > antes) return esperar(1200)
    await esperar(400)
  }
  throw new Error('la Galería no devolvió la foto')
}

/** El botón o fila visible más pequeño que contiene `texto` (por debajo del encabezado). */
async function abrir(texto, espera = 3000) {
  const hecho = await ev(`(() => {
    const t = ${JSON.stringify(texto)};
    const c = [...document.querySelectorAll('[role=button],a,button,[role=link],[tabindex]')].filter((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top > 60 && r.bottom <= innerHeight + 1 && e.innerText.includes(t);
    });
    c.sort((a, b) => a.innerText.length - b.innerText.length);
    if (!c[0]) return null;
    c[0].click();
    return c[0].innerText.slice(0, 60);
  })()`)
  if (!hecho) throw new Error(`no encontré «${texto}»`)
  await esperar(espera)
}

/** Pestaña n (0…) de la barra de abajo. */
async function pestana(n, espera = 4000) {
  await ev(`[...document.querySelectorAll('[role=tab]')][${n}]?.click()`)
  await esperar(espera)
}

/** Desplaza el contenedor con scroll más alto que hay bajo el centro: a `px` (número), al fin
 *  ('fin') o `px` más (con `{ mas: true }`). */
async function desplazar(px, { mas = false, x = 195, y = 420 } = {}) {
  const r = await ev(`(() => {
    const p = document.elementFromPoint(${x}, ${y});
    const v = [...document.querySelectorAll('div')].filter((d) => {
      if (!d.contains(p)) return false;
      const r = d.getBoundingClientRect(), s = getComputedStyle(d);
      return d.scrollHeight > d.clientHeight + 20 && /(auto|scroll)/.test(s.overflowY) && r.width > 300 && r.height > 200 && s.visibility !== 'hidden';
    });
    v.sort((a, b) => b.clientHeight - a.clientHeight);
    const d = v[0];
    if (!d) return null;
    const a = ${JSON.stringify(px)};
    d.scrollTop = a === 'fin' ? d.scrollHeight : ${mas} ? d.scrollTop + a : a;
    return [d.scrollTop, d.scrollHeight, d.clientHeight];
  })()`)
  await esperar(900)
  return r
}

/** Espera (hasta `max` ms) a que la página diga `texto`, o a que deje de decirlo (`sin`). */
async function esperarTexto(texto, { max = 20000, sin = false } = {}) {
  const fin = Date.now() + max
  while (Date.now() < fin) {
    const hay = await ev(`document.body.innerText.toLowerCase().includes(${JSON.stringify(texto.toLowerCase())})`)
    if (hay !== sin) return esperar(1200)
    await esperar(500)
  }
  throw new Error(`${sin ? 'sigue diciendo' : 'no apareció'} «${texto}»`)
}

/** Desplaza hasta que el texto quede `margen` px por debajo del encabezado (68 px). */
async function desplazarA(texto, margen = 8) {
  const r = await ev(`(() => {
    const t = ${JSON.stringify(texto)};
    const el = [...document.querySelectorAll('div,span')].filter((e) => (e.innerText ?? '').trim().toLowerCase().startsWith(t.toLowerCase()) && e.getBoundingClientRect().height > 0)
      .sort((a, b) => a.innerText.length - b.innerText.length)[0];
    if (!el) return null;
    let d = el.parentElement;
    while (d && !(d.scrollHeight > d.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(d).overflowY))) d = d.parentElement;
    if (!d) return 'sin scroll';
    d.scrollTop += el.getBoundingClientRect().top - 68 - ${margen};
    return d.scrollTop;
  })()`)
  if (r == null) throw new Error(`no encontré «${texto}» para desplazar`)
  await esperar(900)
}

/** Escribe en el n-ésimo campo visible (input o textarea). */
async function escribir(n, texto) {
  await ev(`(() => { const t = [...document.querySelectorAll('textarea,input')].filter((e) => e.getBoundingClientRect().height > 0); t[${n}]?.focus({ preventScroll: true }); })()`)
  await orden('escribir', { texto })
  await ev('document.activeElement?.blur()')
  await esperar(500)
}

/** Abre la hoja de «Mi unidad». En la web, gesture-handler no se entera de los clics ni de los
 *  toques de DevTools; sí de PointerEvents de ratón sintéticos con arrastre hacia arriba. */
async function abrirHoja() {
  const t = await ev(`(async () => {
    const el = document.querySelector('[aria-label="Detalle de tu unidad"]');
    if (!el) return null;
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + 12;
    const s = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const o = { bubbles: true, cancelable: true, composed: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    for (let i = 1; i <= 15; i++) { await s(20); el.dispatchEvent(new PointerEvent('pointermove', { ...o, clientY: y - i * 30 })); }
    await s(30);
    el.dispatchEvent(new PointerEvent('pointerup', { ...o, clientY: y - 450, buttons: 0 }));
    await s(900);
    // La hoja es el primer antepasado que se mueve (desde T-170 la franja va dentro de su scroll).
    let h = el.parentElement;
    while (h && !h.style.transform) h = h.parentElement;
    return h?.style.transform ?? null;
  })()`)
  if (t !== 'translateY(0px)') throw new Error(`la hoja no abrió (${t})`)
}

/** En la web de la app, react-native-web pierde el paddingTop/paddingLeft de las tarjetas de
 *  cifras con ícono (KpiResumen) y el ícono tapa el título; en el teléfono salen bien. Se les
 *  pone el relleno que pide el código antes de la foto. */
const ajustarKpi = () =>
  ev(`(() => { let n = 0; for (const i of document.querySelectorAll('div')) { const s = getComputedStyle(i);
    if (s.position === 'absolute' && s.width === '44px' && s.height === '44px' && s.top === '17px' && s.left === '19px') {
      const c = i.parentElement;
      if (c.getBoundingClientRect().width < 250) c.style.paddingTop = '70px';
      else Object.assign(c.style, { paddingLeft: '80px', paddingTop: '20px', paddingBottom: '20px', paddingRight: '20px' });
      n++ } } return n })()`)

let altoActual = 844
async function alto(px) {
  if (px === altoActual) return
  await orden('tam', { alto: px, espera: 1500 })
  altoActual = px
}

/** Alarga la ventana para que quepa entero el contenedor con scroll (capturas «-larga»). */
async function pantallaLarga(extra = 0) {
  const r = await desplazar(0)
  await alto(844 + (r ? r[1] - r[2] : 0) + extra)
  await esperar(1000)
}

/** app-expo.mjs corre la app en modo desarrollo (T-183): su aviso de la esquina (LogBox, en un
 *  shadow DOM fuera de #root) no es de la pantalla y se oculta antes de la foto. */
const sinAvisoDev = () =>
  ev(`(() => { let n = 0; for (const d of document.querySelectorAll('body > div')) { if (d.shadowRoot && d.id !== 'root') { d.style.display = 'none'; n++ } } return n })()`)

async function foto(nombre) {
  await sinAvisoDev()
  await ajustarKpi()
  await esperar(400)
  await orden('foto', { archivo: join(DIR, `${nombre}.png`).replaceAll('\\', '/') })
}

// --- Sesión y estado ---------------------------------------------------------------------------
const CONDUCTOR = 'conductor@fom.com.ve'
const SUPERVISOR = 'supervisor@fom.com.ve'

async function reiniciarDemo(inspeccion = 'pendiente') {
  await fetch(`${API}/__demo/reiniciar`)
  await fetch(`${API}/__demo/modo?inspeccion=${inspeccion}`)
}

async function entrar(correo) {
  await alto(844)
  await ev('localStorage.clear(); sessionStorage.clear(); indexedDB.databases?.().then((ds) => ds.forEach((d) => indexedDB.deleteDatabase(d.name)))')
  await ir('/login', 5000)
  await ev('document.querySelector("input[type=email]")?.focus()')
  await orden('escribir', { texto: correo })
  await ev('document.querySelector("input[type=password]")?.focus()')
  await orden('escribir', { texto: 'demo1234' })
  await pulsar('Entrar', { espera: 9000 })
  const r = await ruta()
  if (r.startsWith('/login')) throw new Error(`no entró ${correo}`)
}

// --- Las capturas ---------------------------------------------------------------------------
// Cada una: [cuenta, modo de la inspección de hoy, pasos]. Los pasos parten de la pantalla de
// inicio de esa cuenta recién entrada.
const C = {}

// Conductor
C['m-cond-mapa'] = [CONDUCTOR, 'pendiente', async () => {}]
C['m-cond-inicio'] = [CONDUCTOR, 'pendiente', async () => {
  await abrirHoja()
}]
C['m-cond-inicio-telemetria'] = [CONDUCTOR, 'pendiente', async () => {
  await abrirHoja()
  await desplazar(230)
}]
C['m-cond-inicio-indice'] = [CONDUCTOR, 'pendiente', async () => {
  await abrirHoja()
  await desplazar(530)
}]
C['m-cond-perfil'] = [CONDUCTOR, 'pendiente', async () => {
  await pestana(3)
}]
C['m-cond-inspeccion'] = [CONDUCTOR, 'pendiente', async () => {
  await pestana(1)
}]
C['m-cond-insp-foto'] = [CONDUCTOR, 'pendiente', async () => {
  await pestana(1)
  await pulsar('Conforme', { contiene: true, n: 0, espera: 500 })
  await pulsar('Conforme', { contiene: true, n: 1, espera: 500 })
  await pulsar('Falla', { contiene: true, n: 2, espera: 800 })
  await escribir(0, 'No enciende la luz trasera izquierda.')
  // La foto de la luz rota (luz-trasera.jpg), desde la Galería.
  await desplazarA('Luces', 110)
  await galeria(0, 'luz-trasera.jpg')
  await desplazarA('Cruces y direccionales', 8)
  await pulsar('Observaci', { contiene: true, n: 0, espera: 800 })
  await escribir(1, 'La direccional derecha parpadea rápido.')
  await desplazarA('Luces delanteras y traseras', 8)
}]

C['m-insp-bloqueada'] = [CONDUCTOR, 'bloqueada', async () => {
  await pestana(1)
}]
C['m-insp-resultado'] = [CONDUCTOR, 'bloqueada', async () => {
  await pestana(1)
  await pulsar('Ver resultado', { espera: 2500 })
}]
C['m-cond-asignadas'] = [CONDUCTOR, 'pendiente', async () => {
  await pestana(2)
}]
C['m-cond-mantenimiento'] = [CONDUCTOR, 'pendiente', async () => {
  await pestana(2)
  await desplazar(400)
}]
C['m-cond-mantenimiento-lista'] = [CONDUCTOR, 'pendiente', async () => {
  await pestana(2)
  await desplazar('fin')
}]
/** La orden resuelta de Carlos (frenos), desde Mantenimiento → Realizadas. */
async function ordenResueltaCarlos() {
  await pestana(2)
  await desplazar('fin')
  await abrir('chillan al frenar y el pedal', 4000)
}
C['m-cond-orden-resuelta'] = [CONDUCTOR, 'pendiente', ordenResueltaCarlos]
C['m-cond-orden-larga'] = [CONDUCTOR, 'pendiente', async () => {
  await ordenResueltaCarlos()
  await pantallaLarga()
}]
C['m-orden-historial'] = [CONDUCTOR, 'pendiente', async () => {
  await ordenResueltaCarlos()
  await desplazar('fin')
}]
// La misma orden desde «La unidad»: fotos del reporte (disco de freno) y del cierre (taller).
C['m-cond-orden-fotos'] = [CONDUCTOR, 'pendiente', async () => {
  await ordenResueltaCarlos()
  await desplazarA('La unidad', 8)
}]
/** Reportar una falla lleno: frenos, alta y la descripción (sin fotos). */
async function reportarLleno() {
  await pestana(2)
  await desplazar('fin')
  await pulsar('Reportar una falla', { espera: 3500 })
  await pulsar('Frenos', { espera: 600 })
  await pulsar('Alta', { espera: 600 })
  await escribir(0, 'Las pastillas delanteras chillan al frenar y el pedal se siente largo.')
}
C['m-cond-reportar'] = [CONDUCTOR, 'pendiente', reportarLleno]
/** Como con KpiResumen: react-native-web deja que `padding` pise el `paddingBottom: 120` del
 *  formulario (en el teléfono gana el de un solo lado) y «Crear ODT», fijo abajo, tapa la
 *  Evidencia. Se le pone el relleno que pide el código. */
const rellenoFormulario = () =>
  ev(`(() => { for (const d of document.querySelectorAll('div')) { const s = getComputedStyle(d);
    if (s.maxWidth === '640px' && parseFloat(s.paddingBottom) < 120 && d.innerText.includes('Evidencia')) d.style.paddingBottom = '120px' } })()`)
/** Reportar lleno y con la foto del disco de freno (falla-2.jpg) con su título. */
async function reportarConFoto() {
  await reportarLleno()
  await galeria(0, 'falla-2.jpg')
  await escribir(1, 'Disco de freno delantero')
  await rellenoFormulario()
}
// El formulario entero, de la unidad a la foto, en una pantalla larga.
C['m-cond-reportar-larga'] = [CONDUCTOR, 'pendiente', async () => {
  await reportarConFoto()
  await pantallaLarga()
}]
C['m-cond-reportar-fotos'] = [CONDUCTOR, 'pendiente', async () => {
  await reportarConFoto()
  await desplazar('fin')
}]

// Supervisor. Pestañas: 0 Resumen · 1 Vehículos · 2 Usuarios · 3 Mantenimiento · 4 Mi perfil.
const U001 = D.UNIDAD_CARLOS.id
C['m-sup-resumen'] = [SUPERVISOR, 'pendiente', async () => {}]
C['m-sup-resumen-unidad'] = [SUPERVISOR, 'pendiente', async () => {
  await desplazarA('Vehículo seleccionado', 8)
}]
C['m-sup-resumen-cifras'] = [SUPERVISOR, 'pendiente', async () => {
  await desplazarA('Inspecciones de hoy', 24)
}]
C['m-sup-reportes'] = [SUPERVISOR, 'pendiente', async () => {
  await pulsar('Reporte', { espera: 3500 })
}]
C['m-sup-unidad'] = [SUPERVISOR, 'pendiente', async () => {
  await desplazarA('Ver expediente', 300)
  await pulsar('Ver expediente', { espera: 2000 })
  await esperarTexto('Ficha de la unidad')
  await esperarTexto('Cargando', { sin: true })
  await esperar(2500)
}]
async function vehiculosSup() {
  await pestana(1, 1500)
  await esperarTexto('Cargando posiciones', { sin: true })
  await esperarTexto('No pueden salir')
  await esperar(2500)
}
C['m-sup-vehiculos'] = [SUPERVISOR, 'pendiente', vehiculosSup]
C['m-sup-vehiculos-lista'] = [SUPERVISOR, 'pendiente', async () => {
  await vehiculosSup()
  await desplazarA('Atención', 330)
}]
C['m-sup-mapa'] = [SUPERVISOR, 'pendiente', async () => {
  await desplazarA('Ver centro de control', 200)
  await pulsar('Ver centro de control →', { espera: 6000 })
}]
C['m-sup-mapa-unidad'] = [SUPERVISOR, 'pendiente', async () => {
  await ir(`/mapa-flota?unidad=${U001}`, 8000)
}]
C['m-sup-recorrido'] = [SUPERVISOR, 'pendiente', async () => {
  await ir(`/mapa-flota?unidad=${U001}`, 8000)
  await pulsar('Ver recorrido', { espera: 6000 })
}]
C['m-sup-usuarios'] = [SUPERVISOR, 'pendiente', async () => {
  await pestana(2)
}]
C['m-sup-conductor'] = [SUPERVISOR, 'pendiente', async () => {
  await pestana(2)
  await abrir('Carlos', 5000)
}]
async function mantenimientoSup() {
  await pestana(3, 9000)
}
C['m-sup-mantenimiento'] = [SUPERVISOR, 'pendiente', mantenimientoSup]
C['m-sup-mantenimiento-lista'] = [SUPERVISOR, 'pendiente', async () => {
  await mantenimientoSup()
  await desplazarA('Atender ahora', 8)
}]
C['m-sup-orden'] = [SUPERVISOR, 'pendiente', async () => {
  await mantenimientoSup()
  await desplazarA('Atender ahora', 8)
  await abrir('Pastillas delanteras gastadas', 2000)
  await esperarTexto('La unidad')
}]
C['m-sup-resuelta'] = [SUPERVISOR, 'pendiente', async () => {
  await ir(`/orden?id=${D.ORDEN_RESUELTA_ID}&companyId=${D.ENTE_ID}`, 8000)
}]
C['m-sup-fotos'] = [SUPERVISOR, 'pendiente', async () => {
  await ir(`/orden?id=${D.ORDEN_RESUELTA_ID}&companyId=${D.ENTE_ID}`, 8000)
  await desplazarA('La unidad', 8)
}]
C['m-sup-nueva-odt'] = [SUPERVISOR, 'pendiente', async () => {
  await mantenimientoSup()
  await pulsar('Nueva ODT', { contiene: true, espera: 4000 })
  await abrir('Elegir la unidad', 3000)
  await abrir('U-004', 2500)
  await pulsar('Motor', { espera: 600 })
  await pulsar('Alta', { espera: 600 })
  await escribir(0, 'Se enciende la luz del aceite en marcha y el motor pierde fuerza en subida.')
  await desplazar(0)
}]
C['m-sup-planes'] = [SUPERVISOR, 'pendiente', async () => {
  await mantenimientoSup()
  await pulsar('Planes', { espera: 4000 })
}]
C['m-sup-plan'] = [SUPERVISOR, 'pendiente', async () => {
  await mantenimientoSup()
  await pulsar('Planes', { espera: 4000 })
  await abrir('Cambio de aceite y filtro', 5000)
}]
C['m-sup-perfil'] = [SUPERVISOR, 'pendiente', async () => {
  await pestana(4)
}]
C['m-sup-alertas'] = [SUPERVISOR, 'pendiente', async () => {
  await pestana(4)
  await pulsar('Alertas', { espera: 5000 })
}]
C['m-sup-inspecciones'] = [SUPERVISOR, 'pendiente', async () => {
  await pestana(4)
  await pulsar('Inspecciones', { espera: 6000 })
}]
C['m-sup-insp-historial'] = [SUPERVISOR, 'pendiente', async () => {
  await pestana(4)
  await pulsar('Inspecciones', { espera: 6000 })
  await pulsar('Historial', { espera: 1500 })
  await esperarTexto('Carlos Méndez')
}]
C['m-sup-areas'] = [SUPERVISOR, 'pendiente', async () => {
  await pestana(4)
  await pulsar('Áreas', { espera: 5000 })
}]

const lista = pedidas.length ? pedidas : Object.keys(C)
const faltan = lista.filter((n) => !C[n])
if (faltan.length) throw new Error(`No sé sacar: ${faltan.join(', ')}`)
mkdirSync(DIR, { recursive: true })
const fallidas = []
for (const nombre of lista) {
  const [cuenta, inspeccion, pasos] = C[nombre]
  try {
    await reiniciarDemo(inspeccion)
    await entrar(cuenta)
    await pasos()
    await foto(nombre)
    console.log(`✓ ${nombre}`)
  } catch (e) {
    fallidas.push(nombre)
    console.log(`✗ ${nombre}: ${e.message}`)
  }
}
await alto(844)
console.log(fallidas.length ? `Fallaron: ${fallidas.join(', ')}` : `Listas ${lista.length} en ${DIR}`)
