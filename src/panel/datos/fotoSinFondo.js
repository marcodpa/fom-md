// ============================================================
// FOTOS SIN FONDO de cada modelo (T-170), para «Mi unidad» en el teléfono
// ------------------------------------------------------------
// Las mismas que la app (`foto-sin-fondo.tsx`), con los mismos nombres:
// `src/assets/vehiculos/<marca>-<modelo>.png`, lienzo 800 × 500 (8:5), tres
// cuartos delantero izquierdo, el suelo al 92 % del alto y su sombra ya puesta
// (quien las monta no les añade otra). Lo que no tenga foto cae en la silueta
// de su tipo: `silueta-camioneta`, `silueta-camion`, `silueta-auto`.
// Para añadir un modelo basta dejar su PNG en la carpeta: Vite los recoge solos.
// ============================================================

const archivos = import.meta.glob('../../assets/vehiculos/*.png', { eager: true, import: 'default' })

/** Por nombre de archivo sin extensión: { 'toyota-hilux': url, 'silueta-auto': url, … }. */
const CATALOGO = Object.fromEntries(
  Object.entries(archivos).map(([ruta, url]) => [ruta.split('/').pop().replace(/\.png$/u, ''), url]),
)

/** Proporción del lienzo de las fotos (ancho / alto). */
export const PROPORCION_FOTO = 8 / 5

/** Deja el texto en la forma de los nombres: minúsculas, sin acentos ni signos. */
export function clave(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
}

/** Sin guiones: «F150», «F 150» y «F-150» son el mismo modelo. */
const junto = (texto) => texto.replace(/-/gu, '')

/** La silueta de cada tipo de vehículo; «otro» (o sin tipo) va como camioneta. */
const SILUETA = { camioneta: 'silueta-camioneta', camion: 'silueta-camion', auto: 'silueta-auto' }

/**
 * La foto sin fondo de una marca y modelo y, si no la hay, la silueta de su
 * tipo. Siempre devuelve una imagen: `{ url, silueta }`.
 *
 * El modelo casa por INCLUSIÓN («Hilux 4x4 doble cabina» encuentra
 * `toyota-hilux`), porque los modelos se escriben a mano al dar de alta.
 */
export function fotoSinFondo(marca, modelo, tipo = null, catalogo = CATALOGO) {
  const m = clave(marca)
  const mod = junto(clave(modelo))
  if (m && mod) {
    const k = Object.keys(catalogo).find((c) => c.startsWith(`${m}-`) && !c.startsWith('silueta-') && mod.includes(junto(c.slice(m.length + 1))))
    if (k) return { url: catalogo[k], silueta: false }
  }
  const s = SILUETA[tipo] ?? SILUETA.camioneta
  return { url: catalogo[s] ?? null, silueta: true }
}
