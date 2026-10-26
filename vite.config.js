import { statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// ============================================================
// QUÉ VIGILA EL SERVIDOR DE DESARROLLO
// ------------------------------------------------------------
// Por defecto Vite vigila TODA la carpeta del proyecto. Aquí conviven la web
// con material ajeno: una caché de npm (`A/`, miles de carpetas), vídeos,
// capturas, despliegues y otros proyectos. En Windows cada carpeta vigilada
// es un manejador abierto: llegó a 17.000 carpetas y 56.000 manejadores, y el
// servidor pasaba minutos recorriéndolas mientras la página «cargaba y
// cargaba». La web solo vive en `src/` y `public/`, más los archivos sueltos de
// la raíz (index.html, vite.config.js, .env); todo lo demás se ignora. Lista
// blanca a propósito: la próxima carpeta pesada que aparezca ya queda fuera.
// ============================================================
const RAIZ = path.dirname(fileURLToPath(import.meta.url))
const CARPETAS_DE_LA_WEB = new Set(['src', 'public'])

function fueraDeLaWeb(ruta) {
  const relativa = path.relative(RAIZ, ruta)
  if (!relativa || relativa.startsWith('..') || path.isAbsolute(relativa)) return false
  const primera = relativa.split(path.sep)[0]
  if (CARPETAS_DE_LA_WEB.has(primera)) return false
  // Un archivo suelto de la raíz se vigila; una carpeta que no es de la web, no.
  if (relativa === primera) {
    return statSync(ruta, { throwIfNoEntry: false })?.isDirectory() ?? false
  }
  return true
}

// ============================================================
// PUENTE DE DESARROLLO HACIA LA API REAL DE FOM
// ------------------------------------------------------------
// En desarrollo la web llama a `/fom-api/...` y este puente lo reenvía a la
// consola pública de FOM (`/api/v1/console`, detrás de nginx), la misma que usa
// el panel publicado. Esa superficie se autentica SOLO con la cookie de sesión:
// no hace falta ningún token interno, y el `.env` ya no lleva ninguno (T-175).
//
// SOLO SIRVE PARA DESARROLLO (`npm run dev` y `vite preview`).
//
// `.env` local (ver `.env.example`):
//   FOM_API_URL=https://<servidor de la consola pública>
//   VITE_FOM_API=/fom-api
// ============================================================

/** Nombre de la cookie de sesión que emite la API. */
const COOKIE_SESION = '__Host-fom_session'

/**
 * La sesión vive en memoria del servidor de desarrollo, no en el navegador.
 *
 * La cookie que emite la API lleva el prefijo `__Host-`, que obliga a `Secure`
 * y a origen propio; sobre `http://localhost` el comportamiento cambia entre
 * navegadores y se pierde a mitad de sesión. Guardarla aquí evita esa pelea
 * por completo, y en desarrollo hay una sola persona conectada.
 */
let sesionDev = null

function extraerSesion(setCookie) {
  const lista = Array.isArray(setCookie) ? setCookie : [setCookie]
  for (const cookie of lista) {
    if (typeof cookie !== 'string') continue
    const match = cookie.match(new RegExp(`${COOKIE_SESION}=([^;]*)`))
    if (match) return match[1] || null
  }
  return undefined // la respuesta no traía cookie de sesión
}

/** Nombres con los que el propio equipo se llama a sí mismo. */
const NOMBRES_LOCALES = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * ¿La petición viene de la página que sirve este mismo servidor?
 *
 * El puente lleva la sesión de quien entró, así que cualquier página abierta
 * en el navegador podría usarla mandando peticiones a `localhost` (CSRF), o
 * alguien de la red local podría llamarlo directamente. Por eso solo se acepta
 * lo que llega a `localhost`/`127.0.0.1` y cuyo `Origin` o `Referer` es
 * exactamente esa misma dirección (mismo puerto). Sin ninguna de las dos
 * cabeceras tampoco pasa: el navegador manda al menos el `Referer` en las
 * peticiones de la propia página.
 */
export function peticionLocal(peticion) {
  const host = String(peticion.headers?.host || '').toLowerCase()
  const nombre = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.split(':')[0]
  if (!NOMBRES_LOCALES.has(nombre)) return false

  const propios = [`http://${host}`, `https://${host}`]
  const deAqui = (valor) => {
    try {
      return propios.includes(new URL(valor).origin.toLowerCase())
    } catch {
      return false
    }
  }
  const origen = peticion.headers?.origin
  const referer = peticion.headers?.referer
  if (!origen && !referer) return false
  if (origen && !deAqui(origen)) return false
  if (referer && !deAqui(referer)) return false
  return true
}

function puenteFom(env) {
  const destino = env.FOM_API_URL || 'http://127.0.0.1:3000'

  return {
    target: destino,
    changeOrigin: true,
    // El servidor presenta un certificado válido para su dirección: se
    // verifica como cualquier otro. Si falla, es mejor un error que hablar
    // con quien se haga pasar por él.
    secure: true,
    rewrite: (ruta) => ruta.replace(/^\/fom-api/, ''),

    // Antes de reenviar nada: solo la página de este servidor puede usar el
    // puente (y con él la sesión guardada). El resto recibe 403.
    bypass(peticion, respuesta) {
      if (peticionLocal(peticion)) return undefined
      respuesta.writeHead(403, { 'content-type': 'application/json' })
      respuesta.end(JSON.stringify({ error: 'Origen no permitido para el puente de desarrollo.' }))
      return false
    },

    configure(proxy) {
      proxy.on('proxyReq', (peticion) => {
        // La única credencial es la cookie de sesión, igual que en el panel
        // publicado. La del navegador no se reenvía nunca: la sesión vive aquí.
        peticion.removeHeader('cookie')
        if (sesionDev) {
          peticion.setHeader('cookie', `${COOKIE_SESION}=${sesionDev}`)
        }
      })

      proxy.on('proxyRes', (respuesta) => {
        const cookie = respuesta.headers['set-cookie']
        if (!cookie) return
        const valor = extraerSesion(cookie)
        if (valor === undefined) return
        // Al entrar se guarda el testigo; al salir la API manda la cookie
        // vacía y aquí se borra.
        sesionDev = valor || null
        // No se reenvía al navegador: la sesión se queda de este lado.
        delete respuesta.headers['set-cookie']
      })

      proxy.on('error', (error, _peticion, respuesta) => {
        const mensaje =
          error.code === 'ECONNREFUSED'
            ? 'No hay nadie escuchando en ' + destino + '. Revisa FOM_API_URL en el .env.'
            : error.message
        console.error(`\n[fom-api] ${mensaje}\n`)
        if (respuesta?.writableEnded === false) {
          respuesta.writeHead?.(502, { 'content-type': 'application/json' })
          respuesta.end?.(JSON.stringify({ error: mensaje }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Sin el prefijo `VITE_`: son secretos de servidor y no deben acabar en el
  // bundle. Vite solo expone al cliente lo que empieza por `VITE_`.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    // MapLibre arranca su worker desde una URL relativa a su propio archivo; si Vite lo pre-empaqueta
    // en dev, esa URL se rompe y el mapa vectorial queda en blanco.
    optimizeDeps: {
      exclude: ['maplibre-gl'],
      // Solo la página de la web. Sin esto Vite rastrea cada .html del proyecto
      // (capturas, informes, despliegues viejos) recorriendo también la caché
      // de npm, y puede tropezar con scripts que no son de la web.
      entries: ['index.html'],
      // Las de carga diferida (leer la hoja de la empresa) se preparan al
      // arrancar: si Vite las descubre a mitad de uso, re-empaqueta y recarga
      // la página entera.
      include: ['pdfjs-dist', 'tesseract.js', 'xlsx'],
    },
    // 5173 por defecto; si el entorno impone un PORT (varias sesiones a la vez),
    // se respeta para no chocar con otro servidor ya levantado.
    // `vite preview` sirve el panel COMPILADO (tres archivos en vez de ciento
    // dieciséis) con el mismo puente a producción: es la forma rápida de usarlo
    // en la máquina sin esperar a que el servidor de desarrollo transforme cada
    // módulo. `npm run rapido`.
    preview: { port: 4173, proxy: { '/fom-api': puenteFom(env) } },
    server: {
      port: Number(process.env.PORT) || 5173,
      proxy: { '/fom-api': puenteFom(env) },
      watch: { ignored: [fueraDeLaWeb, '**/*.{mp4,mov,zip,pdf,xlsx,csv,blend}'] },
    },
    build: {
      chunkSizeWarningLimit: 1600,
    },
  }
})
