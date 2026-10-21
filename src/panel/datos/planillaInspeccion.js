// ============================================================
// LA PLANILLA DE INSPECCIÓN, lista para imprimir (T-79)
// ------------------------------------------------------------
// La misma hoja que imprime la app (fom-driver-juan, src/lib/pdf-inspeccion.ts):
// el formato en papel que se firma a mano —el título con su banda, la barra
// «AUTORIDAD PARA EL INICIO DEL TRABAJO», la cabecera roja, la tabla de cuatro
// columnas y el pie con la casilla de firma— relleno con lo que el conductor
// respondió. Una inspección, una hoja A4.
//
// Dos columnas, dos manos:
//  · «Verificador de inicio del trabajo» —la última— es la que se marca (SÍ,
//    OBS. o NO) con la respuesta de quien hizo la verificación.
//  · «Personal(es) que realiza(n) el trabajo» queda EN BLANCO, como en la hoja.
//
// Los sub-puntos de cada ítem salen de la AYUDA del formato publicado: sin
// ella la hoja sale con los títulos y nada más, en vez de inventarlos.
//
// Sin importaciones a propósito: lo prueba `node --test` tal cual.
// ============================================================

/** Cuántos detalles se piden a la vez: de uno en uno es lento, todos juntos ahoga al servidor (como la app). */
export const TANDA = 5

/** Cuántas hojas se imprimen sin avisar: más que esto es un rato de espera (como la app). */
export const AVISO_LOTE = 15

/** Cómo se marca cada respuesta en la columna que se firma. */
const MARCA = {
  conforme: { texto: 'SÍ', clase: 'si' },
  observacion: { texto: 'OBS.', clase: 'obs' },
  falla: { texto: 'NO', clase: 'no' },
}

/** Cómo se lee el resultado de la inspección en la cabecera. */
const RESULTADO = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  aprobada_con_observaciones: 'Aprobada con observaciones',
  bloqueada: 'Bloqueada',
}

/** Texto seguro dentro del HTML: lo que escribe una persona no abre etiquetas. */
export function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** AAAA-MM-DD → DD/MM/AAAA, que es como se lee en un papel. */
function fecha(iso) {
  const [a, m, d] = String(iso ?? '').split('-')
  return d && m && a ? `${d}/${m}/${a}` : iso || '—'
}

/** El día (AAAA-MM-DD) de una fecha sola o de un instante, en la hora local. */
function diaDe(valor) {
  const v = String(valor ?? '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const t = new Date(v)
  if (Number.isNaN(t.getTime())) return v.slice(0, 10)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/** Llave para cruzar un ítem con su ayuda por nombre: sin mayúsculas ni espacios de más. */
const llave = (nombre) => String(nombre ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

/**
 * La ayuda de cada ítem de un formato, para cruzarla con las respuestas.
 *
 * Acepta los ítems como los da el servidor (`id`, `name`, `helpText`) o como
 * los guarda el panel (`nombre`, `ayuda`). Se guardan por id y por nombre: el
 * detalle de la consola no siempre trae el id del ítem del formato, pero el
 * nombre de la respuesta es el del ítem.
 */
export function ayudasDeItems(items = []) {
  const m = new Map()
  for (const i of items ?? []) {
    const ayuda = i?.helpText ?? i?.ayuda
    if (!ayuda || !String(ayuda).trim()) continue
    if (i.id) m.set(`id:${i.id}`, String(ayuda))
    const n = llave(i.name ?? i.nombre)
    if (n) m.set(`nombre:${n}`, String(ayuda))
  }
  return m
}

/** La ayuda de una respuesta: por el id de su ítem y, si no, por su nombre. */
function ayudaDe(ayudas, r) {
  return (r.itemId && ayudas.get(`id:${r.itemId}`)) || ayudas.get(`nombre:${llave(r.nombre)}`) || ''
}

/**
 * Una inspección del panel (la de la lista) y sus respuestas (las del detalle)
 * en la forma de la hoja.
 */
export function hojaDe(insp, items = []) {
  const unidad = insp.vehiculoNombre && insp.vehiculoNombre !== '—'
    ? insp.vehiculoNombre
    : [insp.vehiculo?.alias, insp.vehiculo?.placa].filter(Boolean).join(' · ')
  return {
    id: insp.id,
    formato: insp.plantilla || (insp.clase === 'scheduled' ? 'Inspección programada' : 'Inspección diaria'),
    unidad: unidad || '—',
    conductor: insp.conductorNombre && insp.conductorNombre !== '—' ? insp.conductorNombre : 'Sin conductor',
    fecha: diaDe(insp.fecha || insp.creadaEn),
    ubicacion: insp.ubicacion || '—',
    resultado: insp.resultado,
    respuestas: (items ?? []).map((it) => ({
      itemId: it.itemId ?? it.templateItemId ?? null,
      nombre: it.nombre ?? it.name ?? '',
      estado: it.estadoItem ?? it.estado,
      nota: it.nota?.trim?.() || '',
    })),
  }
}

/**
 * Los sub-puntos de un ítem, tal como vienen en la ayuda del formato.
 *
 * Dos niveles, como en la hoja: la línea que empieza con guion es un sub-punto
 * del punto anterior («El conductor:» y debajo sus condiciones).
 */
function vinetas(ayuda) {
  if (!ayuda?.trim()) return ''
  const lineas = ayuda.split(/\r?\n/u).map((l) => l.trim()).filter(Boolean)
  if (lineas.length === 0) return ''
  const html = lineas
    .map((l) => {
      const hijo = /^[-–—]\s+/u.test(l)
      return `<li class="${hijo ? 'sub' : 'punto'}">${esc(l.replace(/^[-–—]\s+/u, ''))}</li>`
    })
    .join('')
  return `<ul>${html}</ul>`
}

/** Una fila de la tabla: el ítem, sus sub-puntos y las dos columnas. */
function fila(r, n, ayuda) {
  const marca = MARCA[r.estado] ?? { texto: '', clase: '' }
  const nota = r.nota ? `<p class="nota">${esc(r.nota)}</p>` : ''
  return `<tr>
    <td class="item">
      <div class="celda">
        <span class="num">${n}</span>
        <p class="titulo">${esc(r.nombre)}</p>
      </div>
    </td>
    <td class="detalle">${vinetas(ayuda)}${nota}</td>
    <td class="marca"></td>
    <td class="marca ${marca.clase}">${marca.texto}</td>
  </tr>`
}

/** Los datos de la cabecera: de qué unidad, de quién y de cuándo es la hoja. */
function cabecera(h) {
  const campos = [
    ['Unidad', h.unidad],
    ['Conductor', h.conductor],
    ['Fecha', fecha(h.fecha)],
    ['Ubicación', h.ubicacion ?? '—'],
    ['Resultado', RESULTADO[h.resultado] ?? h.resultado ?? '—'],
  ]
  return campos.map(([k, v]) => `<div><span>${k}</span><strong>${esc(v)}</strong></div>`).join('')
}

/** UNA hoja: una inspección, una página. */
function hoja(h, ayudas) {
  return `<section class="hoja">
    <header>
      <div class="marca-hueco"></div>
      <div class="rotulo">Verificaciones para el inicio del trabajo</div>
    </header>
    <h1>${esc(h.formato)}</h1>

    <div class="datos">${cabecera(h)}</div>

    <div class="barra">
      AUTORIDAD PARA EL INICIO DEL TRABAJO – No comenzaré a trabajar hasta confirmar…
    </div>

    <table>
      <thead>
        <tr>
          <th class="aviso izq">
            Confirme a continuación que los siguientes aspectos estén implementados y verificados
            antes de comenzar el trabajo
          </th>
          <th class="aviso">
            Toda persona expuesta que realice trabajos debe confirmar cada una de las acciones que
            se mencionan a continuación
          </th>
          <th class="col">Personal(es) que realiza(n) el trabajo</th>
          <th class="col">Verificador de inicio del trabajo</th>
        </tr>
      </thead>
      <tbody>
        <tr class="confirmado">
          <td colspan="4">HE CONFIRMADO:</td>
        </tr>
        ${h.respuestas.map((r, n) => fila(r, n + 1, ayudaDe(ayudas, r))).join('')}
      </tbody>
    </table>

    <div class="barra pie">
      Deténgase y busque ayuda si alguno de los controles/las salvaguardas anteriores no se ha
      implementado
    </div>

    <table class="firmas">
      <tr>
        <th class="vacia"></th>
        <th>Nombre escrito / Función</th>
        <th>Signatura</th>
        <th>Fecha</th>
      </tr>
      <tr>
        <!-- En blanco a propósito: esta fila la llena de su puño quien verifica
             el inicio del trabajo, que por eso se imprime. -->
        <td class="rol">Verificador de inicio del trabajo</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    </table>
  </section>`
}

// Copia literal del estilo de la app: misma hoja en el papel venga de donde venga.
const ESTILO = `
  @page { size: A4 portrait; margin: 9mm; }
  * { box-sizing: border-box; }
  /* Fondo blanco explícito: el panel es oscuro y la hoja se imprime en papel. */
  body { font-family: Helvetica, Arial, sans-serif; color: #10131a; background: #fff;
         margin: 0; font-size: 8pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hoja { page-break-after: always; }
  .hoja:last-child { page-break-after: auto; }

  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  /* El hueco del membrete: mismo sitio y mismo tamaño que en el papel. */
  .marca-hueco { width: 104px; height: 36px; border: 1px dashed #c9cedb; border-radius: 2px; }
  .rotulo { background: #2b3a77; color: #fff; font-weight: 700; font-size: 10.5pt;
            padding: 6px 14px; }
  h1 { font-size: 21pt; font-weight: 300; color: #9aa1ae; margin: 6px 0 4px; letter-spacing: .3px; }

  .datos { display: flex; flex-wrap: wrap; gap: 3px 16px; margin-bottom: 5px; padding: 4px 8px;
           border: 1px solid #d8dce6; }
  .datos div { display: flex; gap: 5px; align-items: baseline; }
  .datos span { color: #6b7280; text-transform: uppercase; font-size: 6.4pt; letter-spacing: .4px; }
  .datos strong { font-size: 8pt; }

  .barra { background: #2b3a77; color: #fff; font-weight: 700; padding: 5px 9px; font-size: 9pt; }
  .barra.pie { margin-top: 0; text-align: center; font-size: 8pt; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #9aa1ae; vertical-align: top; padding: 4px 6px; }
  thead th.aviso { background: #a8272f; color: #fff; font-size: 7pt; text-align: left;
                   font-weight: 700; line-height: 1.2; }
  thead th.izq { width: 21%; }
  thead th.col { background: #6b7280; color: #fff; width: 11%; font-size: 6.6pt; line-height: 1.15;
                 text-align: left; font-weight: 400; }
  tr.confirmado td { background: #fff; font-weight: 700; font-size: 8.4pt; padding: 3px 6px;
                     border-bottom: none; }

  .celda { display: flex; gap: 5px; }
  .num { flex: 0 0 14px; height: 14px; border-radius: 50%; background: #a8272f; color: #fff;
         font-size: 7pt; font-weight: 700; text-align: center; line-height: 14px; }
  .titulo { margin: 0; font-size: 7.4pt; line-height: 1.25; color: #3a4252; }
  td.detalle ul { margin: 0; padding-left: 10px; list-style: none; }
  td.detalle li { font-size: 7pt; line-height: 1.3; color: #2b313d; position: relative; }
  td.detalle li.punto::before { content: '•'; position: absolute; left: -9px; }
  td.detalle li.sub { padding-left: 10px; }
  td.detalle li.sub::before { content: '–'; position: absolute; left: 1px; }
  .nota { margin: 3px 0 0; font-size: 7pt; font-style: italic; color: #8a4b00;
          border-left: 2px solid #d8a657; padding-left: 5px; }

  td.marca { text-align: center; font-weight: 700; font-size: 10pt; vertical-align: middle;
             font-family: Georgia, 'Times New Roman', serif; }
  td.marca.si { color: #14532d; }
  td.marca.obs { color: #8a4b00; }
  td.marca.no { color: #991b1b; }

  table.firmas th { background: #2b3a77; color: #fff; font-size: 7pt; text-align: left;
                    font-weight: 700; padding: 3px 6px; }
  table.firmas th.vacia { width: 21%; background: #2b3a77; }
  table.firmas td { height: 38px; }
  table.firmas td.rol { font-size: 7pt; color: #3a4252; }
`

/**
 * El documento con una o varias hojas, cada una en su página.
 * `ayudas` cruza el ítem del formato con sus sub-puntos (ver ayudasDeItems).
 */
export function htmlPlanillas(hojas, ayudas = new Map()) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8" />
    <title>Verificaciones para el inicio del trabajo</title>
    <style>${ESTILO}</style></head><body>
    ${hojas.map((h) => hoja(h, ayudas)).join('')}
  </body></html>`
}

/**
 * Arma el documento de las inspecciones pedidas, como la app:
 *  · el detalle (lo que se respondió) se pide en tandas de TANDA, en paralelo
 *    dentro de cada una, y sin volver a pedir los que ya se leyeron (`leidas`);
 *  · la ayuda del formato se pide UNA vez por formato, no una por hoja.
 *
 * `leerRespuestas(insp)` y `leerAyudas(nombreDelFormato)` los pone quien llama
 * (demostración o servidor). Si la ayuda falla, la hoja sale sin viñetas.
 */
export async function armarPlanillas(inspecciones, { leerRespuestas, leerAyudas, leidas = new Map(), tanda = TANDA }) {
  const hojas = []
  for (let n = 0; n < inspecciones.length; n += tanda) {
    const grupo = inspecciones.slice(n, n + tanda)
    const respuestas = await Promise.all(grupo.map((i) => leidas.get(i.id) ?? leerRespuestas(i)))
    grupo.forEach((i, k) => hojas.push(hojaDe(i, respuestas[k])))
  }
  const ayudas = new Map()
  if (leerAyudas) {
    for (const formato of new Set(inspecciones.map((i) => i.plantilla || ''))) {
      const m = await Promise.resolve().then(() => leerAyudas(formato)).catch(() => null)
      m?.forEach((v, k) => { if (!ayudas.has(k)) ayudas.set(k, v) })
    }
  }
  return htmlPlanillas(hojas, ayudas)
}

/**
 * Imprime el documento desde un marco invisible, no la página del panel (que
 * es oscura y trae menú). El diálogo del navegador deja «Guardar como PDF».
 * El marco se quita al cerrar el diálogo, o al minuto si el navegador no avisa.
 */
export function imprimirHtml(html, doc = typeof document === 'undefined' ? null : document) {
  return new Promise((resolve, reject) => {
    if (!doc) {
      reject(new Error('Sin documento donde imprimir.'))
      return
    }
    const marco = doc.createElement('iframe')
    marco.setAttribute('aria-hidden', 'true')
    marco.setAttribute('title', 'Planilla de inspección')
    marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
    let quitado = false
    let reloj = null
    const quitar = () => {
      if (quitado) return
      quitado = true
      clearTimeout(reloj)
      marco.remove()
    }
    marco.onload = () => {
      const w = marco.contentWindow
      if (!w) {
        quitar()
        reject(new Error('No se pudo abrir la planilla.'))
        return
      }
      w.addEventListener('afterprint', () => setTimeout(quitar, 500))
      reloj = setTimeout(quitar, 60_000)
      w.focus()
      w.print()
      resolve()
    }
    marco.srcdoc = html
    doc.body.appendChild(marco)
  })
}
