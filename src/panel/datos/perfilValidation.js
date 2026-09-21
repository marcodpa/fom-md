export function personaPropia(lista, correo) {
  const email = String(correo || '').trim().toLowerCase()
  if (!email) return null
  return lista.find(p => String(p.email || '').trim().toLowerCase() === email) ?? null
}

export function cambiosDePerfil(borrador, anterior) {
  const cambio = {}
  const nombre = borrador.nombre.trim()
  if (nombre.length < 2 || nombre.length > 160) throw new Error('Escribe tu nombre y apellido, entre 2 y 160 caracteres.')
  if (nombre !== anterior.nombre) cambio.displayName = nombre
  const campos = { cedula: 'nationalId', telefono: 'phone', direccion: 'address', fechaNacimiento: 'birthDate' }
  for (const [campo, clave] of Object.entries(campos)) {
    let valor = String(borrador[campo] ?? '').trim()
    if (valor === String(anterior[campo] ?? '').trim()) continue
    if (!valor) throw new Error('Completa los datos que modificaste. Para corregir un dato, escribe su nuevo valor.')
    if (campo === 'cedula') {
      valor = valor.toLowerCase().replace(/[.\s]/g, '').replace(/^([ve])-?/, '$1-')
      if (!/^[ve]-\d{6,9}$/.test(valor)) throw new Error('Escribe una cédula válida, por ejemplo V-12345678.')
    }
    if (campo === 'telefono') {
      valor = valor.replace(/[\s()-]/g, '')
      if (!/^\+\d{7,15}$/.test(valor)) throw new Error('Incluye el código de país en el teléfono, por ejemplo +584141234567.')
    }
    if (campo === 'direccion' && valor.length > 300) throw new Error('La dirección admite hasta 300 caracteres.')
    if (campo === 'fechaNacimiento') {
      const fecha = new Date(`${valor}T12:00:00Z`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || !Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor || fecha > new Date()) throw new Error('Escribe una fecha de nacimiento válida.')
    }
    cambio[clave] = valor
  }
  return cambio
}
