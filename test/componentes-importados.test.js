// Cada componente que una pantalla pinta (<Algo />) tiene que estar importado o definido en el
// mismo archivo. El 4 nov 2026 Centro de control se cayó entero porque al juntar ramas se perdió
// el import de MarcaEmpresa: ni el build ni las demás pruebas lo vieron.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const raiz = join(import.meta.dirname, '..', 'src')

function archivos(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) return archivos(ruta)
    return nombre.endsWith('.jsx') ? [ruta] : []
  })
}

function nombresDisponibles(codigo) {
  const nombres = new Set()
  for (const m of codigo.matchAll(/import\s+([^'";]*?)\s+from\s+['"]/gu)) {
    for (const parte of m[1].replace(/[{}]/gu, ',').split(',')) {
      const nombre = parte.trim().split(/\s+as\s+/u).pop()?.replace(/^\*\s*as\s+/u, '').trim()
      if (nombre) nombres.add(nombre)
    }
  }
  for (const m of codigo.matchAll(/(?:function|const|let|class)\s+([A-Z]\w*)/gu)) nombres.add(m[1])
  // Desestructurados en parámetros o variables: ({ Icono }) / const { A, B } = …
  for (const m of codigo.matchAll(/\{([^{}]*)\}\s*(?:=|\))/gu)) {
    for (const parte of m[1].split(',')) {
      const nombre = parte.split(':').pop()?.split('=')[0]?.trim()
      if (nombre && /^[A-Z]\w*$/u.test(nombre)) nombres.add(nombre)
    }
  }
  return nombres
}

test('todo componente que se pinta está importado o definido en su archivo', () => {
  const faltan = []
  for (const ruta of archivos(raiz)) {
    // Sin comentarios: un ejemplo en un comentario no es un componente pintado.
    const codigo = readFileSync(ruta, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '')
    const disponibles = nombresDisponibles(codigo)
    const usados = new Set([...codigo.matchAll(/<([A-Z]\w*)[\s/>]/gu)].map((m) => m[1]))
    for (const nombre of usados) {
      if (!disponibles.has(nombre)) faltan.push(`${ruta.slice(raiz.length + 1)}: <${nombre}>`)
    }
  }
  assert.deepEqual(faltan, [], 'Importa el componente o defínelo en el archivo')
})
