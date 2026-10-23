import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'vite'
import {
  AVISO_LOTE,
  TANDA,
  armarPlanillas,
  ayudasDeItems,
  hojaDe,
  htmlPlanillas,
  imprimirHtml,
} from '../src/panel/datos/planillaInspeccion.js'

// ============================================================
// T-79: imprimir la planilla de inspección, como la app
// ------------------------------------------------------------
// 1. La hoja es la de la app (pdf-inspeccion.ts): A4, una por inspección,
//    cabecera con unidad/conductor/fecha/ubicación/resultado, cada ítem con
//    su marca (SÍ · OBS. · NO) en «Verificador», «Personal» en blanco, la
//    nota y las viñetas de la ayuda del formato, y la fila de firma.
// 2. Se arma como la app: detalles en tandas de 5, sin repetir los ya
//    leídos, y la ayuda una vez por formato.
// 3. Se imprime desde un marco aparte, no la página del panel.
// 4. Los puntos de impresión de la app existen en la web.
// 5. Conectado, las viñetas salen del formato publicado de la empresa.
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')
const leer = (ruta) => readFileSync(join(raiz, ruta), 'utf8')

async function compilar(entrada, api) {
  const salida = await build({
    root: raiz,
    logLevel: 'error',
    define: { 'import.meta.env.VITE_FOM_API': JSON.stringify(api) },
    build: { write: false, lib: { entry: join(raiz, entrada), formats: ['es'], fileName: 'm' } },
  })
  const codigo = salida[0].output.find((o) => o.type === 'chunk').code
  return import('data:text/javascript;base64,' + Buffer.from(codigo).toString('base64'))
}

const inspeccion = (id, extra = {}) => ({
  id,
  resultado: 'aprobada_con_observaciones',
  fecha: '2026-10-21',
  creadaEn: '2026-10-21T07:42:00',
  vehiculoNombre: 'U-01 · Z69FC7W',
  conductorNombre: 'Pedro Villalobos',
  ubicacion: 'Campo Boscán',
  plantilla: 'Conducción',
  ...extra,
})

const respuestas = [
  { id: 'a1', nombre: 'Plan del viaje', estadoItem: 'conforme' },
  { id: 'a2', nombre: 'Conductor descansado', estadoItem: 'observacion', nota: 'Durmió <5 h' },
  { id: 'a3', nombre: 'Cinturones', estadoItem: 'falla' },
]

test('la hoja: la misma de la app, A4, una por inspección, con marca, nota, viñetas y firma', () => {
  const ayudas = ayudasDeItems([{ id: 't2', name: 'Conductor descansado', helpText: 'El conductor:\n- está bien descansado\n- no está bajo efectos' }])
  const html = htmlPlanillas([hojaDe(inspeccion('i1'), respuestas), hojaDe(inspeccion('i2', { resultado: 'bloqueada' }), respuestas)], ayudas)

  assert.match(html, /@page \{ size: A4 portrait; margin: 9mm; \}/)
  assert.equal(html.match(/<section class="hoja">/g).length, 2, 'una hoja por inspección')
  assert.match(html, /Verificaciones para el inicio del trabajo/)
  assert.match(html, /AUTORIDAD PARA EL INICIO DEL TRABAJO/)
  assert.match(html, /<h1>Conducción<\/h1>/)
  // Cabecera: unidad, conductor, fecha como en papel, ubicación y resultado.
  assert.match(html, /<span>Unidad<\/span><strong>U-01 · Z69FC7W<\/strong>/)
  assert.match(html, /<span>Conductor<\/span><strong>Pedro Villalobos<\/strong>/)
  assert.match(html, /<span>Fecha<\/span><strong>21\/10\/2026<\/strong>/)
  assert.match(html, /<span>Ubicación<\/span><strong>Campo Boscán<\/strong>/)
  assert.match(html, /Aprobada con observaciones/)
  assert.match(html, /<strong>Bloqueada<\/strong>/)
  // «Personal» en blanco y la marca en «Verificador».
  assert.match(html, /<td class="marca"><\/td>\s*<td class="marca si">SÍ<\/td>/)
  assert.match(html, /<td class="marca obs">OBS\.<\/td>/)
  assert.match(html, /<td class="marca no">NO<\/td>/)
  // La nota del conductor, escapada.
  assert.match(html, /<p class="nota">Durmió &lt;5 h<\/p>/)
  // Viñetas de dos niveles cruzadas por nombre; a los ítems sin ayuda no se les inventa nada.
  assert.match(html, /<li class="punto">El conductor:<\/li><li class="sub">está bien descansado<\/li>/)
  assert.equal(html.match(/<ul>/g).length, 2, 'solo el ítem con ayuda lleva viñetas (una vez por hoja)')
  // La fila de firma, en blanco.
  assert.match(html, /<td class="rol">Verificador de inicio del trabajo<\/td>/)
})

test('la hoja en demostración: sin formato ni conteos, título por clase y datos de la semilla', () => {
  const h = hojaDe({ id: 'insp-1', resultado: 'aprobada', fecha: '2026-10-20', vehiculoNombre: '—', vehiculo: { alias: 'Unidad 01', placa: 'A12BC3D' }, conductorNombre: '—', clase: 'daily' }, [])
  assert.equal(h.formato, 'Inspección diaria')
  assert.equal(h.unidad, 'Unidad 01 · A12BC3D')
  assert.equal(h.conductor, 'Sin conductor')
  assert.equal(h.ubicacion, '—')
  assert.equal(hojaDe({ id: 'x', clase: 'scheduled', fecha: '2026-10-20' }).formato, 'Inspección programada')
})

test('se arma como la app: tandas de 5, sin repetir lo leído, la ayuda una vez por formato', async () => {
  assert.equal(TANDA, 5)
  assert.equal(AVISO_LOTE, 15)
  const lista = Array.from({ length: 12 }, (_, n) => inspeccion(`i${n}`, { plantilla: n % 2 ? 'Conducción' : 'Otra' }))
  let enVuelo = 0
  let maximo = 0
  const pedidas = []
  const formatos = []
  const html = await armarPlanillas(lista, {
    leidas: new Map([['i0', respuestas]]),
    leerRespuestas: async (i) => {
      pedidas.push(i.id)
      enVuelo++
      maximo = Math.max(maximo, enVuelo)
      await new Promise((r) => setTimeout(r, 5))
      enVuelo--
      return respuestas
    },
    leerAyudas: async (formato) => {
      formatos.push(formato)
      if (formato === 'Otra') throw new Error('sin formato')
      return ayudasDeItems([{ name: 'Cinturones', helpText: 'Se usan bien' }])
    },
  })
  assert.ok(maximo <= TANDA, `pidió ${maximo} a la vez`)
  assert.ok(!pedidas.includes('i0'), 'no vuelve a pedir el detalle que ya estaba leído')
  assert.equal(pedidas.length, 11)
  assert.deepEqual(formatos.sort(), ['Conducción', 'Otra'], 'una lectura por formato')
  assert.equal(html.match(/<section class="hoja">/g).length, 12)
  assert.match(html, /Se usan bien/, 'si un formato falla, las demás viñetas siguen')
})

test('se imprime desde un marco aparte y el marco se quita al cerrar el diálogo', async () => {
  const oyentes = {}
  let imprimio = false
  let quitado = false
  const atributos = {}
  const marco = {
    style: {},
    setAttribute(k, v) { atributos[k] = v },
    remove() { quitado = true },
    contentWindow: { addEventListener: (t, fn) => { oyentes[t] = fn }, focus() {}, print() { imprimio = true } },
  }
  const doc = {
    createElement: (t) => { assert.equal(t, 'iframe'); return marco },
    body: { appendChild: (m) => { assert.match(m.srcdoc, /<section class="hoja">/); setTimeout(() => m.onload(), 0) } },
  }
  await imprimirHtml(htmlPlanillas([hojaDe(inspeccion('i1'), respuestas)]), doc)
  assert.ok(imprimio, 'llama print() en el marco')
  // Aislado: sin scripts dentro; se imprime desde fuera (same-origin) y el diálogo necesita allow-modals.
  assert.equal(atributos.sandbox, 'allow-same-origin allow-modals')
  assert.doesNotMatch(atributos.sandbox, /allow-scripts/u)
  oyentes.afterprint()
  await new Promise((r) => setTimeout(r, 600))
  assert.ok(quitado, 'quita el marco después de imprimir')
  await assert.rejects(imprimirHtml('<p></p>', null))
})

test('los puntos de impresión de la app existen en la web', () => {
  const ins = leer('src/panel/modulos/Inspecciones.jsx')
  const pp = leer('src/panel/modulos/InspeccionesPorPersona.jsx')
  assert.ok(!ins.includes('window.print()'), 'ya no imprime la página entera')
  assert.match(ins, /Imprimir el día/, 'Resumen: las de hoy')
  assert.match(ins, /Imprimir todas/, 'Historial › Todas')
  assert.match(ins, /Seleccionar/, 'selección múltiple')
  assert.match(ins, /function ImprimirHallazgos/, 'Hallazgos')
  assert.match(ins, /BotonImprimirUna/, 'cada fila / tarjeta')
  assert.match(ins, /imp\.imprimir\(\[inspeccion\]/, 'el detalle de una inspección')
  assert.match(pp, /Imprimir las \$\{/, 'Por persona: las del mes')
})

test('conectado: las viñetas salen del formato publicado de la empresa', async () => {
  const { leerAyudasDelFormato } = await compilar('src/panel/datos/ayudasFormato.js', '/fom-api')
  const original = globalThis.fetch
  const rutas = []
  try {
    globalThis.fetch = async (url) => {
      const u = new URL(String(url), 'http://x')
      rutas.push(u.pathname)
      if (u.pathname.endsWith('/inspection-templates')) {
        return new Response(JSON.stringify({ items: [
          { id: 'viejo', code: 'c', version: 1, name: 'Mi formato', status: 'archivada', itemCount: 1 },
          { id: 'nuevo', code: 'c', version: 2, name: 'Mi formato', status: 'publicada', itemCount: 1 },
        ] }), { status: 200 })
      }
      if (u.pathname.endsWith('/inspection-templates/nuevo')) {
        return new Response(JSON.stringify({ template: { id: 'nuevo', items: [{ id: 'it1', name: 'Luces', helpText: 'Delanteras\n- altas' }] } }), { status: 200 })
      }
      return new Response('{}', { status: 404 })
    }
    const ayudas = await leerAyudasDelFormato('Mi formato')
    assert.equal(ayudas.get('nombre:luces'), 'Delanteras\n- altas')
    assert.ok(rutas.some((r) => r.endsWith('/inspection-templates/nuevo')), 'lee la publicada, no la archivada')
    // Los formatos listos del panel (IOGP) siguen de respaldo por nombre.
    assert.ok([...ayudas.keys()].some((k) => k.startsWith('nombre:el conductor se encuentra')))
  } finally { globalThis.fetch = original }
})
