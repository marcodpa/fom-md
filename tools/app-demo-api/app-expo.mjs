// La app de Juan (Expo web) apuntando al SERVIDOR FALSO de la demo (T-147), para sacar capturas
// de la app real con datos de demostración. Igual que scripts/app-demo.mjs, NO lee el
// .env.local entero —así no se conecta a producción ni a la nube de fotos real—: solo toma de
// ahí el token público de Mapbox, y no lo escribe en ningún sitio.
//
//   node tools/app-demo-api/servidor.mjs     (primero; puerto 8790)
//   node tools/app-demo-api/app-expo.mjs     (Expo web en http://localhost:8098)
//
// La nube de fotos es «fom-demo», que no existe: capturar.mjs desvía esas peticiones al
// servidor falso. Abierta a mano en un navegador, la app sale sin fotos.
//
// Va en MODO DESARROLLO (T-183): desde T-177 la app publicada (`--no-dev`) solo habla con FOM
// por https, y el servidor falso es http://localhost. En desarrollo la app deja http para el
// servidor local (`base()` en src/lib/fom-api.ts), así que la regla de la app publicada no se
// afloja. El aviso de desarrollo de la esquina lo oculta lote.mjs antes de cada foto.
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const APP = 'C:/Users/home/Downloads/fom-driver-juan'
const API = process.env.API ?? 'http://localhost:8790'
const PUERTO = process.env.PUERTO_APP ?? '8098'

const env = { ...process.env, CI: '1', EXPO_NO_DOTENV: '1', BROWSER: 'none', NODE_ENV: 'development' }
for (const k of Object.keys(env)) if (k.startsWith('EXPO_PUBLIC_')) delete env[k]
env.EXPO_PUBLIC_FOM_API_URL = API
env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME = 'fom-demo'
env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET = 'fom-demo'
try {
  const local = fs.readFileSync(`${APP}/.env.local`, 'utf8')
  const token = local.match(/^EXPO_PUBLIC_MAPBOX_TOKEN=(pk\.\S+)$/m)?.[1]
  if (token) env.EXPO_PUBLIC_MAPBOX_TOKEN = token
} catch {
  /* sin token: el mapa sale sin teselas */
}

// --clear: Expo incrusta las EXPO_PUBLIC_* al empaquetar; sin limpiar podría servir un paquete
// viejo que apunta a otro servidor.
const hijo = spawn('npx', ['expo', 'start', '--web', '--port', PUERTO, '--clear'], { cwd: APP, env, stdio: 'inherit', shell: true })
console.log(`Expo web (demo) → http://localhost:${PUERTO} · API ${API} · PID ${hijo.pid}`)
hijo.on('exit', (c) => process.exit(c ?? 0))
