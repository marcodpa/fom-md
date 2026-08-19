import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// ============================================================
// PUENTE DE DESARROLLO HACIA LA API REAL DE FOM
// ------------------------------------------------------------
// La API de `fom-core` es estrictamente servidor a servidor: cada petición
// exige un token interno, y una sesión self-hosted como credencial de actor.
// Un sitio estático no puede guardar ese token — viajaría en el bundle y lo
// leería cualquiera con las herramientas de desarrollo.
//
// Este proxy hace de intermediario, igual que la carpeta `app/api` de
// `gps-web`: el token vive aquí, del lado del servidor de desarrollo, y el
// navegador nunca lo ve. La web solo llama a `/fom-api/...`.
//
// SOLO SIRVE PARA DESARROLLO. En producción esto lo reemplaza la superficie
// pública `/api/v1/*` con autenticación por cookie, que todavía no existe.
//
// Requiere un túnel SSH abierto contra el servidor de aplicación:
//   ssh -N -L 3000:127.0.0.1:3000 fomadmin@10.20.30.10
//
// Y un `.env` local (ver `.env.example`):
//   FOM_API_URL=http://127.0.0.1:3000
//   FOM_INTERNAL_TOKEN=<el valor de FOM_MAP_INTERNAL_AUTH_TOKEN del servidor>
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

function puenteFom(env) {
  const destino = env.FOM_API_URL || 'http://127.0.0.1:3000'
  const token = env.FOM_INTERNAL_TOKEN || ''

  /**
   * MODO SIN LOGIN — solo desarrollo.
   *
   * La API admite dos credenciales de actor: una sesión (`x-fom-auth-session`)
   * o directamente un correo (`x-fom-map-actor-email`). La segunda es la vía
   * servidor a servidor: quien tiene el token interno ya es de confianza, así
   * que puede declarar en nombre de quién actúa.
   *
   * Con `FOM_DEV_ACTOR_EMAIL` puesto, el puente usa esa vía y la consola abre
   * con datos reales sin pasar por la pantalla de acceso. Es cómodo para
   * desarrollar, y es también un atajo de seguridad: cualquiera que abra
   * localhost ve la flota. Por eso es una variable aparte, hay que ponerla a
   * mano, y no existe en producción — allí el único camino será la sesión.
   *
   * Si hay una sesión de verdad, manda la sesión: este atajo solo cubre el
   * hueco cuando nadie ha entrado.
   */
  const actorDev = env.FOM_DEV_ACTOR_EMAIL || ''

  return {
    target: destino,
    changeOrigin: true,
    rewrite: (ruta) => ruta.replace(/^\/fom-api/, ''),

    // Con el atajo activo, la consola pregunta "¿hay sesión?" y hay que
    // responderle que sí; si no, se queda en la pantalla de acceso para
    // siempre. Se responde aquí sin molestar a la API.
    bypass(peticion, respuesta) {
      if (!actorDev || sesionDev) return undefined
      const ruta = (peticion.url || '').split('?')[0]
      if (ruta === '/fom-api/auth/session') {
        respuesta.setHeader('content-type', 'application/json')
        respuesta.end(
          JSON.stringify({
            authenticated: true,
            user: {
              email: actorDev,
              displayName: 'Modo desarrollo',
              // El rol de la sesión de desarrollo. `GET /auth/session` de la API
              // interna no devuelve rol; el endpoint público
              // `/api/v1/mobile/auth/me` sí (`tenant: { id, name, role }`), y es
              // ahí donde la consola debe leerlo cuando se migre a esa puerta.
              // Hasta entonces se declara aquí, del lado del servidor de
              // desarrollo, para poder trabajar en el panel de administración.
              // Se controla con FOM_DEV_ROL en el .env.
              role: env.FOM_DEV_ROL || 'admin_fom',
            },
          })
        )
        return false
      }
      return undefined
    },

    configure(proxy) {
      proxy.on('proxyReq', (peticion) => {
        // La superficie `/api/v1/console` (Issue #173) se autentica SOLO con
        // la cookie de sesión, igual que hará en producción. No recibe el
        // token interno a propósito: si aquí se lo mandáramos, funcionaría en
        // local y fallaría al publicar, que es la peor forma de enterarse.
        const rutaConsola = (peticion.path || '').startsWith('/api/v1/console')

        // Para el resto, el mismo valor viaja con dos nombres: `authentication`
        // valida uno y `maps` / `gps-console` el otro. Se mandan los dos para
        // no tener que adivinar a qué módulo va cada ruta.
        if (token && !rutaConsola) {
          peticion.setHeader('x-fom-auth-internal-token', token)
          peticion.setHeader('x-fom-map-internal-token', token)
        }
        // Credencial de actor. La API exige EXACTAMENTE una: o sesión, o
        // correo. Mandar las dos es un 401.
        peticion.removeHeader('x-fom-auth-session')
        peticion.removeHeader('x-fom-map-actor-email')
        if (sesionDev) {
          // La cookie va siempre; la cabecera de sesión solo a la superficie
          // interna, que es la que la lee.
          peticion.setHeader('cookie', `${COOKIE_SESION}=${sesionDev}`)
          if (!rutaConsola) {
            peticion.setHeader('x-fom-auth-session', sesionDev)
          }
        } else {
          peticion.removeHeader('cookie')
          // El atajo por correo no existe en `/api/v1/console`: ahí la sesión
          // es obligatoria. Sin haber entrado, esas rutas responden 401, que es
          // exactamente lo que harán en producción.
          if (actorDev && !rutaConsola) {
            peticion.setHeader('x-fom-map-actor-email', actorDev)
          }
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
            ? 'No hay nadie escuchando en ' +
              destino +
              '. ¿Está abierto el túnel SSH? ' +
              'ssh -N -L 3000:127.0.0.1:3000 fomadmin@10.20.30.10'
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
    // 5173 por defecto; si el entorno impone un PORT (varias sesiones a la vez),
    // se respeta para no chocar con otro servidor ya levantado.
    server: {
      port: Number(process.env.PORT) || 5173,
      proxy: { '/fom-api': puenteFom(env) },
    },
    build: {
      chunkSizeWarningLimit: 1600,
    },
  }
})
