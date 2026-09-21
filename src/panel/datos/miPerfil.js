import { api, HAY_API } from './api'
import { perfilActual, actualizarNombreSesion } from '../auth'
import { esGestor } from '../roles'
import semilla from './repoSemilla'

import { personaPropia, cambiosDePerfil } from './perfilValidation'

function identidad() {
  const p = perfilActual()
  if (!p) throw new Error('Vuelve a iniciar sesión para consultar tu perfil.')
  return p
}

export async function cargarMiPerfil() {
  const sesion = identidad()
  const base = { nombre: sesion.nombre, email: sesion.correo, rol: sesion.rolNombre, empresa: sesion.empresa, conduce: sesion.rol === 'conductor', documentos: [], editable: false, completoDisponible: false }
  if (!HAY_API) {
    const persona = await semilla.personal.obtener(sesion.userId || sesion.id)
    return { ...base, ...persona, rol: base.rol, nombre: persona?.nombre || base.nombre, email: sesion.correo, editable: Boolean(persona), completoDisponible: true, modoDemo: true }
  }
  // El directorio publicado requiere ser gestor. Nunca se intenta leer la
  // lista de compañeros como conductor ni se sustituye el usuario por otro.
  if (!esGestor(sesion)) return { ...base, aviso: 'Tu información completa y su edición siguen disponibles en Mi perfil de la app. La conexión de autoservicio todavía no está publicada para la web.' }
  const respuesta = await api.directorio({ q: sesion.correo })
  const propia = personaPropia(respuesta?.items ?? [], sesion.correo)
  if (!propia) return { ...base, aviso: 'La sesión está activa, pero el directorio no devolvió tu ficha personal. Puedes consultar tus datos completos desde la app.' }
  let documentos = [], documentosError = ''
  try {
    const listado = await api.documentos({})
    documentos = (listado?.items ?? []).filter(d => d.scope === 'persona' && d.holderUserId === propia.userId && d.status !== 'archived').map(d => ({ id: d.id, tipo: d.documentType, numero: d.documentNumber, venceEn: d.expiresOn, archivos: d.fileCount, estado: d.daysToExpiry == null ? null : d.daysToExpiry < 0 ? 'vencido' : d.daysToExpiry <= 30 ? 'por_vencer' : 'vigente' }))
  } catch { documentosError = 'No se pudieron consultar tus documentos. Vuelve a cargar el perfil.' }
  return { ...base, id: propia.userId, nombre: propia.displayName, cedula: propia.nationalId ?? propia.identification?.value, telefono: propia.phone, direccion: propia.address, fechaNacimiento: propia.birthDate, editable: true, documentos, documentosError, perfilCompleto: propia.profileComplete, conduce: base.conduce || Boolean(propia.vehicleId), aviso: 'La foto, el índice de manejo, los datos de licencia y el cambio de contraseña se administran por ahora desde Mi perfil de la app.' }
}

export async function guardarMiPerfil(borrador, anterior) {
  const sesion = identidad()
  if (sesion.correo !== anterior.email) throw new Error('La cuenta cambió. Vuelve a abrir Mi perfil.')
  const cambios = cambiosDePerfil(borrador, anterior)
  if (!Object.keys(cambios).length) return anterior
  if (!HAY_API) {
    await semilla.personal.actualizar(sesion.userId || sesion.id, { nombre: borrador.nombre.trim(), cedula: borrador.cedula.trim(), telefono: borrador.telefono.trim(), direccion: borrador.direccion.trim(), fechaNacimiento: borrador.fechaNacimiento })
    actualizarNombreSesion(sesion.correo, borrador.nombre.trim())
    return { ...anterior, ...borrador }
  }
  if (!esGestor(sesion)) throw new Error('La edición de tu perfil está disponible desde la app.')
  // Se resuelve de nuevo la identidad antes de escribir: la interfaz nunca
  // escoge un userId arbitrario ni conserva el de una sesión anterior.
  const actual = await api.sesion()
  if (!actual.authenticated || actual.user.email !== sesion.correo) throw new Error('La cuenta cambió. Vuelve a abrir Mi perfil.')
  const directorio = await api.directorio({ q: sesion.correo })
  const propia = personaPropia(directorio?.items ?? [], sesion.correo)
  if (!propia || propia.userId !== anterior.id) throw new Error('No se pudo verificar tu identidad para guardar.')
  const resultado = await api.actualizarPerfil(propia.userId, cambios)
  const p = resultado?.profile
  if (!p || p.userId && p.userId !== propia.userId) throw new Error('El servidor no confirmó el perfil guardado.')
  const nombre = p.displayName || borrador.nombre.trim()
  actualizarNombreSesion(sesion.correo, nombre)
  return { ...anterior, nombre, cedula: p.nationalId ?? anterior.cedula, telefono: p.phone ?? anterior.telefono, direccion: p.address ?? anterior.direccion, fechaNacimiento: p.birthDate ?? anterior.fechaNacimiento, perfilCompleto: p.profileComplete }
}
