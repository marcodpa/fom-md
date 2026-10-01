// Regla de contraseña del panel web. Mismo contenido que `validarClave` de la app del conductor
// (fom-driver-juan/src/lib/validate.ts): hay que mantener las dos iguales.
// El servidor (fom-core) aplica su propio mínimo; si es mayor que este, rechazará la clave aunque
// la pantalla la acepte.
export const MIN_CLAVE = 5
export const MAX_CLAVE = 128
const COMUNES = ['password', 'contrasena', 'contraseña', 'qwerty', 'admin', 'clave', 'flotas', '12345', 'abcde', 'fom2026', 'samfor']

export const REGLAS_CLAVE = `Mínimo ${MIN_CLAVE} caracteres, con una mayúscula, un número y un símbolo (ej. !, @, #). Sin repetir tres iguales seguidos, sin claves comunes y sin tu correo.`

/** Devuelve el primer problema de la clave, o null si cumple. `correo` es opcional. */
export function validarClave(valor, correo = '') {
  const v = valor ?? ''
  if (v.length < MIN_CLAVE) return `La contraseña debe tener al menos ${MIN_CLAVE} caracteres.`
  if (v.length > MAX_CLAVE) return `La contraseña no puede pasar de ${MAX_CLAVE} caracteres.`
  if (v !== v.trim()) return 'La contraseña no puede empezar ni terminar con espacios.'
  if (!/[A-Z]/.test(v)) return 'Incluye al menos una letra mayúscula.'
  if (!/\d/.test(v)) return 'Incluye al menos un número.'
  if (!/[^A-Za-z0-9]/.test(v)) return 'Incluye al menos un símbolo (ej. !, @, #).'
  if (/(.)\1\1/i.test(v)) return 'No repitas el mismo carácter tres veces seguidas.'
  const bajo = v.toLowerCase()
  if (v.length < 12 && COMUNES.some(c => bajo.includes(c))) return 'Esa clave corta es demasiado común: elige otra.'
  const usuario = String(correo).split('@')[0].toLowerCase()
  if (usuario.length >= 3 && bajo.includes(usuario)) return 'La contraseña no puede contener tu correo.'
  return null
}
