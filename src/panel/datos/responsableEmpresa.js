// ============================================================
// RESPONSABLE DE LA EMPRESA + MENSAJES EN LLANO (Administración → Empresas)
// ------------------------------------------------------------
// Al crear una empresa se pide su responsable. Marco quiere que ese responsable
// quede creado de una vez como USUARIO SUPERVISOR de la empresa, con una clave
// temporal que se muestra una sola vez (igual que en la pantalla de usuarios).
//
// Aquí vive la lógica pura —sin pantalla ni red— para poder probarla:
//   · validar los datos del responsable,
//   · armar la petición de usuario,
//   · traducir los errores crudos del servidor a español llano.
// ============================================================
import { validarClave } from '../../lib/clave.js'

/** Nombre exacto del rol en fom-core (`ROLES_OTORGABLES`): otorgarlo exige ser administrador FOM. */
export const ROL_SUPERVISOR = 'supervisor'

// --- Clave temporal -----------------------------------------------------------
// Mismos grupos y largo que la pantalla de usuarios (AdminUsuarios): 16 o más caracteres, con
// mayúscula, número y símbolo, que es lo que exige el servidor.
const GRUPOS_CLAVE = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%*-_',
]
const CARACTERES_CLAVE = GRUPOS_CLAVE.join('')

function indiceAleatorio(limite) {
  const bytes = new Uint32Array(1)
  globalThis.crypto.getRandomValues(bytes)
  return bytes[0] % limite
}

function unaClave() {
  const caracteres = GRUPOS_CLAVE.map((grupo) => grupo[indiceAleatorio(grupo.length)])
  while (caracteres.length < 20) caracteres.push(CARACTERES_CLAVE[indiceAleatorio(CARACTERES_CLAVE.length)])
  for (let i = caracteres.length - 1; i > 0; i -= 1) {
    const j = indiceAleatorio(i + 1)
    ;[caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]]
  }
  return caracteres.join('')
}

/** Una clave temporal que cumple las reglas del servidor (si por azar repite tres iguales, se saca otra). */
export function generarClaveTemporal(correo = '') {
  for (let i = 0; i < 20; i += 1) {
    const clave = unaClave()
    if (!validarClave(clave, correo)) return clave
  }
  return unaClave()
}

// --- Datos del responsable ----------------------------------------------------
/** El servidor acepta el teléfono solo como «+» y de 7 a 15 dígitos: se quitan espacios, guiones y paréntesis. */
export function normalizarTelefono(telefono) {
  return String(telefono ?? '').replace(/[\s\-().]/gu, '')
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

/**
 * Revisa lo que el formulario pide del responsable. Devuelve el aviso en español para el primer
 * problema, o `null` si está todo bien. El nombre y el correo son obligatorios: sin ellos no se puede
 * crear su usuario.
 */
export function problemaDelResponsable({ contacto = '', email = '', telefono = '' } = {}) {
  const nombre = String(contacto).trim().replace(/\s+/gu, ' ')
  if (nombre.length < 2) return 'Escribe el nombre y el apellido del responsable.'
  if (nombre.split(' ').length < 2) return 'Escribe también el apellido del responsable.'
  if (nombre.length > 120) return 'El nombre del responsable es demasiado largo.'
  if (!String(email).trim()) return 'Escribe el correo del responsable: con él entrará a FOM.'
  if (!CORREO.test(String(email).trim())) return 'Escribe un correo válido para el responsable, por ejemplo nombre@empresa.com.'
  const tel = normalizarTelefono(telefono)
  if (tel && !/^\+[0-9]{7,15}$/u.test(tel)) {
    return 'El teléfono debe empezar por + y el código del país, por ejemplo +584141234567.'
  }
  return null
}

/**
 * El rol de supervisor según de dónde vengan los datos. En el servidor real es `supervisor`; la maqueta
 * (semilla local) usa los nombres de su catálogo: «supervisor_personal» en cuentas personales y
 * «supervisor_company» en las demás.
 */
export function rolSupervisorDe(tipoEmpresa, conectado) {
  if (conectado) return ROL_SUPERVISOR
  return tipoEmpresa === 'personal' ? 'supervisor_personal' : 'supervisor_company'
}

/**
 * La petición para `repo.admin.usuarios.crear` con los datos del responsable. La empresa destino viaja
 * aparte porque quien crea (administrador FOM) no pertenece a la empresa recién creada.
 */
export function armarUsuarioResponsable({ responsable, empresaId, tipoEmpresa, conectado, clave }) {
  const email = String(responsable?.email ?? '').trim().toLowerCase()
  return {
    nombre: String(responsable?.contacto ?? '').trim().replace(/\s+/gu, ' '),
    email,
    rol: rolSupervisorDe(tipoEmpresa, conectado),
    clave: clave || generarClaveTemporal(email),
    empresaId,
    // En el servidor real la ruta lleva la empresa (`/tenants/:id/users`).
    empresaDestinoId: conectado ? empresaId : undefined,
    conduce: false,
  }
}

// --- Errores en llano ---------------------------------------------------------
const ERRORES = [
  [
    /object_storage_unavailable|storage[_ ]unavailable/iu,
    'Por ahora el servidor no puede guardar archivos. No es un fallo tuyo: inténtalo más tarde o avisa al equipo técnico.',
  ],
  [
    /already has active company access|already belongs to this company/iu,
    'Ese correo ya tiene acceso a una empresa. Usa otro correo para el responsable.',
  ],
  [
    /code already exists|company with that code/iu,
    'Ya existe una empresa con un nombre parecido. Cambia un poco el nombre.',
  ],
  [/phone must be/iu, 'El teléfono debe empezar por + y el código del país, por ejemplo +584141234567.'],
  [/rif must look like/iu, 'El RIF debe verse así: J-12345678-9.'],
  [/email must be an email|must be an email/iu, 'El correo no es válido.'],
]

/**
 * El texto de un error listo para mostrar. Nunca deja pasar el código crudo del servidor
 * (`object_storage_unavailable`…): lo cambia por una frase en español.
 */
export function textoDeError(error, porDefecto = 'No se pudo completar la operación. Inténtalo de nuevo.') {
  const crudo = typeof error === 'string' ? error : error?.message || error?.codigo || ''
  const texto = `${crudo} ${error?.codigo ?? ''}`
  const conocido = ERRORES.find(([patron]) => patron.test(texto))
  if (conocido) return conocido[1]
  return String(crudo).trim() || porDefecto
}
