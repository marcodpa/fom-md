// Un solo formato para todo el panel. Esta prueba falla si alguien vuelve a escribir, en otro
// archivo, lo que ya vive en un sitio único: horas y fechas (formato.js), el nombre de la
// unidad (nombreUnidad.js), la placa en mayúsculas (placas.js), las etiquetas de rol (roles.js)
// y los puertos e IP del receptor GPS (gps.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fechaHora, hora, numero } from '../src/panel/datos/formato.js'
import { etiquetaUnidad, nombreUnidad } from '../src/panel/datos/nombreUnidad.js'
import { normalizarPlaca } from '../src/panel/datos/placas.js'

const RAIZ = join(import.meta.dirname, '..', 'src', 'panel')

function archivos(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return /\.(js|jsx)$/.test(nombre) ? [ruta] : []
  })
}

const fuentes = archivos(RAIZ).map((ruta) => ({ ruta: relative(RAIZ, ruta).split(sep).join('/'), texto: readFileSync(ruta, 'utf8') }))

// Líneas que rompen la regla, fuera del archivo dueño. Los comentarios de línea no cuentan.
function infracciones(regex, permitidos) {
  const fallas = []
  for (const { ruta, texto } of fuentes) {
    if (permitidos.includes(ruta)) continue
    texto.split('\n').forEach((linea, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(linea)) return
      if (regex.test(linea)) fallas.push(`${ruta}:${i + 1}  ${linea.trim().slice(0, 110)}`)
    })
  }
  return fallas
}

test('horas y fechas: nada de toLocale*/hour12 fuera de formato.js', () => {
  const fallas = infracciones(/toLocaleTimeString|toLocaleDateString|hour12|toLocaleString\(\s*['"`]es/, ['datos/formato.js'])
  assert.deepEqual(fallas, [])
})

test('nombre de la unidad: nada de alias || placa (ni al revés) fuera de nombreUnidad.js', () => {
  const fallas = infracciones(/\b\w+\??\.(alias|placa)\s*(\|\||\?\?)\s*\w+\??\.(placa|alias|numero)\b/, ['datos/nombreUnidad.js'])
  assert.deepEqual(fallas, [])
})

test('placas: toUpperCase() sobre una placa solo en placas.js', () => {
  const fallas = infracciones(/(placa|plate)\w*(\?\.|\.|\))\s*\w*\(?[^;\n]*toUpperCase\(\)|(placa|plate)\w*\??\.toUpperCase\(\)/i, ['datos/placas.js'])
  assert.deepEqual(fallas, [])
})

test('roles: ningún mapa de etiquetas de rol fuera de roles.js', () => {
  const fallas = infracciones(/\b(admin_fom|supervisor|operator|usuario|supervisor_company|supervisor_personal|usuario_personal)['"`]?\s*:\s*['"`](Administrador FOM|Supervisor|Operador|Usuario|Administrador)['"`]/, ['roles.js'])
  assert.deepEqual(fallas, [])
})

test('GPS: puertos e IP del receptor solo en gps.js', () => {
  const fallas = infracciones(/\b(5001|5002)\b|51\.81\.195\.12/, ['datos/gps.js'])
  assert.deepEqual(fallas, [])
})

test('hora y fechaHora: con una fecha inválida dicen «—», nunca NaN', () => {
  for (const malo of ['no es fecha', 'xx', {}, NaN]) {
    assert.equal(hora(malo), '—')
    assert.equal(fechaHora(malo), '—')
  }
  assert.equal(hora(null), '—')
  assert.equal(fechaHora(undefined), '—')
})

test('hora: siempre 12 horas', () => {
  assert.equal(hora(new Date(2026, 9, 20, 9, 42)), '9:42 a. m.')
  assert.equal(hora(new Date(2026, 9, 20, 0, 5)), '12:05 a. m.')
  assert.equal(hora(new Date(2026, 9, 20, 12, 0)), '12:00 p. m.')
  assert.equal(hora(new Date(2026, 9, 20, 19, 30, 7), true), '7:30:07 p. m.')
  assert.equal(fechaHora(new Date(2026, 9, 20, 7, 30)), '20 oct, 7:30 a. m.')
})

test('numero: miles con punto, decimales con coma, también de 4 cifras', () => {
  assert.equal(numero(1234), '1.234')
  assert.equal(numero(1946210), '1.946.210')
  assert.equal(numero(12.5, 2), '12,50')
  assert.equal(numero(-1234.5, 1), '-1.234,5')
  assert.equal(numero(null), '—')
  assert.equal(numero(NaN), '—')
})

test('nombreUnidad: alias, si no número interno en mayúsculas, si no placa, si no «Unidad»', () => {
  assert.equal(nombreUnidad({ alias: 'Hilux 27', numero: 'u-27', placa: 'A12BC3D' }), 'Hilux 27')
  assert.equal(nombreUnidad({ alias: '', numero: 'u-27', placa: 'A12BC3D' }), 'U-27')
  assert.equal(nombreUnidad({ alias: '  ', numero: '—', placa: 'A12BC3D' }), 'A12BC3D')
  assert.equal(nombreUnidad({ placa: 'a12bc3d' }), 'A12BC3D')
  assert.equal(nombreUnidad({ alias: '', numero: '', placa: '' }), 'Unidad')
  assert.equal(nombreUnidad(null), 'Unidad')
})

test('etiquetaUnidad: «nombre · PLACA», sin repetir la placa ni dejar «·» colgando', () => {
  assert.equal(etiquetaUnidad({ alias: 'Hilux 27', placa: 'a12bc3d' }), 'Hilux 27 · A12BC3D')
  assert.equal(etiquetaUnidad({ alias: 'Hilux 27', placa: '' }), 'Hilux 27')
  assert.equal(etiquetaUnidad({ alias: 'Hilux 27', placa: '—' }), 'Hilux 27')
  assert.equal(etiquetaUnidad({ placa: 'A12BC3D' }), 'A12BC3D')
  assert.equal(etiquetaUnidad({ alias: 'a12bc3d', placa: 'A12BC3D' }), 'a12bc3d')
  assert.equal(etiquetaUnidad({}), 'Unidad')
})

test('normalizarPlaca: recorta y pasa a mayúsculas', () => {
  assert.equal(normalizarPlaca('  ab123cd '), 'AB123CD')
  assert.equal(normalizarPlaca(''), '')
  assert.equal(normalizarPlaca(null), '')
  assert.equal(normalizarPlaca(undefined), '')
})
