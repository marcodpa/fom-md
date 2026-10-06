export const DISENOS = [
  { id: 'azul', nombre: 'Azul FOM', descripcion: 'Los colores de FOM, con tarjetas y navegación redondeadas.' },
  { id: 'glass', nombre: 'Glass gris', descripcion: 'Cristal translúcido, fondo gris y superficies de grafito.' },
]
const valido = valor => DISENOS.some(d => d.id === valor)
export const cuentaApariencia = perfil => String(perfil?.userId || perfil?.id || perfil?.correo || '')
export const claveApariencia = cuenta => `fom.apariencia.v1:${encodeURIComponent(cuenta)}`

/** Personal en este navegador; nunca se usa la empresa como identidad. */
export function crearPreferenciasApariencia(obtenerStorage, eventos) {
  const memoria = new Map()
  const oyentes = new Set()
  const notificar = () => oyentes.forEach(fn => fn())
  const leer = cuenta => {
    if (!cuenta) return 'azul'
    if (memoria.has(cuenta)) return memoria.get(cuenta)
    try {
      const valor = obtenerStorage()?.getItem(claveApariencia(cuenta))
      return valido(valor) ? valor : 'azul'
    } catch { return 'azul' }
  }
  const cambiar = (cuenta, diseno) => {
    if (!cuenta || !valido(diseno)) return false
    memoria.set(cuenta, diseno)
    let guardado = false
    try {
      const storage = obtenerStorage()
      if (storage) { storage.setItem(claveApariencia(cuenta), diseno); guardado = true }
    } catch { /* El diseño sigue disponible durante esta sesión. */ }
    notificar()
    return guardado
  }
  eventos?.addEventListener('storage', e => {
    if (e.key === null || e.key?.startsWith('fom.apariencia.v1:')) {
      memoria.clear()
      notificar()
    }
  })
  return { leer, cambiar, suscribir: fn => { oyentes.add(fn); return () => oyentes.delete(fn) } }
}
