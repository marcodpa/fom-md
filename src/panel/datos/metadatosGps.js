export const CAMPOS_GPS = [
  { clave: 'simPhone', etiqueta: 'Línea SIM', max: 30, tipo: 'tel' },
  { clave: 'iccid', etiqueta: 'ICCID de la SIM', max: 22, tipo: 'text' },
  { clave: 'carrier', etiqueta: 'Operador de la SIM', max: 80 },
  { clave: 'apn', etiqueta: 'APN', max: 120 },
  { clave: 'simPlan', etiqueta: 'Plan de la SIM', max: 120 },
  { clave: 'firmwareVersion', etiqueta: 'Versión del firmware', max: 100 },
  { clave: 'simStatus', etiqueta: 'Estado de la SIM', opciones: [['active', 'Activa'], ['inactive', 'Inactiva'], ['suspended', 'Suspendida'], ['unknown', 'Desconocido']] },
  { clave: 'transport', etiqueta: 'Transporte', opciones: [['tcp', 'TCP'], ['udp', 'UDP']] },
]

/** Sólo campos modificados; un vacío de texto limpia el campo, no una enumeración. */
export function cambiosGps(datos, anteriores = {}) {
  const salida = {}
  for (const c of CAMPOS_GPS) {
    if (!Object.hasOwn(datos, c.clave)) continue
    const nuevo = String(datos[c.clave] ?? '').trim()
    const anterior = String(anteriores[c.clave] ?? '').trim()
    if (nuevo === anterior) continue
    if (c.opciones && !c.opciones.some(([valor]) => valor === nuevo)) throw new Error(`Elige un valor válido para ${c.etiqueta.toLowerCase()}.`)
    if (c.max && nuevo.length > c.max) throw new Error(`${c.etiqueta} admite hasta ${c.max} caracteres.`)
    if (c.clave === 'iccid' && nuevo && !/^\d{18,22}$/u.test(nuevo)) throw new Error('El ICCID debe tener entre 18 y 22 dígitos.')
    salida[c.clave] = nuevo || null
  }
  return salida
}
