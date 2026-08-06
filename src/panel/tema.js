// ============================================================
// TEMA DE LA CONSOLA
// Misma lógica que src/theme/ThemeProvider.tsx de la app:
//   modo 'sistema' -> usa el del equipo, con CLARO como respaldo
//   modo 'claro' | 'oscuro' -> forzado por la persona
// Y la marca de la empresa activa repinta el acento, igual que allá
// ("la marca de la EMPRESA ACTIVA pinta el acento de cada pantalla").
// ============================================================

const CLAVE_MODO = 'fom.panel.modo'

/** Marca por defecto: el azul del sistema (tokens.primary). */
export const MARCA_POR_DEFECTO = { nombre: 'FOM', color: '#208AEF' }

const oyentes = new Set()

export function modoGuardado() {
  try {
    const m = localStorage.getItem(CLAVE_MODO)
    return m === 'claro' || m === 'oscuro' || m === 'sistema' ? m : 'sistema'
  } catch {
    return 'sistema'
  }
}

/** Resuelve el esquema final, con la misma regla de la app. */
export function esquemaDe(modo = modoGuardado()) {
  if (modo === 'sistema') {
    const oscuroEnElEquipo =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    return oscuroEnElEquipo ? 'oscuro' : 'claro'
  }
  return modo
}

/** Aplica el esquema y la marca al documento. */
export function aplicarTema(modo = modoGuardado(), marca = MARCA_POR_DEFECTO) {
  const esquema = esquemaDe(modo)
  const raiz = document.documentElement
  raiz.setAttribute('data-tema', esquema)
  if (marca?.color) raiz.style.setProperty('--marca', marca.color)
  return esquema
}

export function fijarModo(modo) {
  try {
    localStorage.setItem(CLAVE_MODO, modo)
  } catch {
    /* sin almacenamiento: el modo dura lo que la pestaña */
  }
  const esquema = aplicarTema(modo)
  oyentes.forEach((fn) => fn({ modo, esquema }))
  return esquema
}

/** Alterna claro/oscuro, como toggleColorScheme() de la app. */
export function alternarEsquema() {
  return fijarModo(esquemaDe() === 'oscuro' ? 'claro' : 'oscuro')
}

export function alCambiarTema(fn) {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

/** Si el modo es 'sistema', seguir los cambios del equipo en vivo. */
export function escucharSistema() {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const alCambiar = () => {
    if (modoGuardado() === 'sistema') {
      const esquema = aplicarTema('sistema')
      oyentes.forEach((fn) => fn({ modo: 'sistema', esquema }))
    }
  }
  mq.addEventListener('change', alCambiar)
  return () => mq.removeEventListener('change', alCambiar)
}
