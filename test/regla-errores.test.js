import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// ============================================================
// P5: un error del servidor no puede convertirse en «no hay datos».
// Un `.catch(() => [])` o `.catch(() => null)` hace que una caída se vea como una lista
// vacía («Sin conductor», «Sin documentos»…) y nadie la reintenta. Un `catch {}` vacío
// hace lo mismo con una escritura. Si de verdad hay que tragarse un error, se anota la
// excepción AQUÍ con su motivo; todo lo demás debe mostrar un aviso con «Reintentar»
// (o dejar el fallo anotado, como `faltaron` en el expediente de la unidad).
// ============================================================

const raiz = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/u, '$1')

function* archivos(carpeta) {
  for (const nombre of readdirSync(carpeta)) {
    const ruta = join(carpeta, nombre)
    if (statSync(ruta).isDirectory()) yield* archivos(ruta)
    else if (/\.jsx?$/u.test(nombre)) yield ruta
  }
}

const REVISADOS = [
  join(raiz, 'src/panel/datos/repoApi.js'),
  ...archivos(join(raiz, 'src/panel/modulos')),
]

// Un bloque «vacío» puede llevar comentarios dentro: sigue sin hacer nada.
const VACIO = '(?:\\s|\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*)*'
const PATRONES = [
  { nombre: '.catch(() => [])', re: /\.catch\(\s*\(\s*\)\s*=>\s*\[\]\s*\)/gu },
  { nombre: '.catch(() => null)', re: /\.catch\(\s*\(\s*\)\s*=>\s*null\s*\)/gu },
  { nombre: 'catch {} vacío', re: new RegExp(`catch\\s*(?:\\([^)]*\\))?\\s*\\{${VACIO}\\}`, 'gu') },
  { nombre: '.catch(() => {}) vacío', re: new RegExp(`\\.catch\\(\\s*\\(\\s*\\w*\\s*\\)\\s*=>\\s*\\{${VACIO}\\}\\s*\\)`, 'gu') },
]

/**
 * Las que ya existían al poner la regla, por archivo: cuántas hay (como máximo) y por qué es
 * legítimo en cada una. Añadir una nueva exige escribirla aquí, con motivo, y que alguien lo revise.
 */
const EXCEPCIONES = {
  'src/panel/datos/repoApi.js': {
    veces: 8,
    motivo:
      'Posición suelta de una unidad (sin ella queda como estaba); entes solo para poner nombre; equipos GPS solo para unir el IMEI; '
      + 'áreas del panel de contadores; detalle de una planilla (queda lo que dijo la lista); equipos en «unidades de una empresa»; '
      + 'y guardar un recuerdo en localStorage (si no hay almacenamiento solo se pierde el recuerdo).',
  },
  'src/panel/modulos/AdminEmpresas.jsx': {
    veces: 1,
    motivo: 'Refrescar la lista tras guardar: la lista se vuelve a leer sola en la próxima carga; el alta ya se confirmó.',
  },
  'src/panel/modulos/AdminGps.jsx': {
    veces: 1,
    motivo: 'La flota solo da la línea chica de la unidad (marca, modelo, año); la lista de equipos sale igual.',
  },
  'src/panel/modulos/AdminGpsDetalle.jsx': {
    veces: 4,
    motivo: 'Posiciones, última posición, capacidades y bitácora del equipo: cada bloque es opcional en la ficha del equipo y el resto se ve igual.',
  },
  'src/panel/modulos/AdminGpsMeitrack.jsx': {
    veces: 1,
    motivo: 'Tras un fallo ambiguo se pregunta si el alta quedó hecha; si esa consulta también falla se informa el primer error, no se reintenta a ciegas.',
  },
  'src/panel/modulos/AdminGpsProbar.jsx': {
    veces: 1,
    motivo: 'La última posición es un dato extra de la prueba; sin ella la prueba se muestra igual.',
  },
  'src/panel/modulos/AdminUsuarios.jsx': {
    veces: 2,
    motivo: 'Empresas (solo alimentan «Mover», que es de la demo) y ranking de manejo (la lista sale igual, sin pastillas).',
  },
  'src/panel/modulos/CentroControl.jsx': {
    veces: 1,
    motivo: 'Conductores asignados del modo «manejo brusco»: si falla, se usa el conductor principal de la flota.',
  },
  'src/panel/modulos/ExpedienteVehiculo.jsx': {
    veces: 2,
    motivo: 'Odómetro oficial y km por día: datos extra del tarjetón de kilometraje; sin ellos se ve la lectura de la ficha.',
  },
  'src/panel/modulos/Flota.jsx': {
    veces: 1,
    motivo: 'Recargar la lista tras crear la unidad: el alta ya se confirmó y reintentarla duplicaría la unidad.',
  },
  'src/panel/modulos/InspeccionConductor.jsx': {
    veces: 1,
    motivo: 'Recargar la lista cuando otro ya hizo la planilla; si falla se queda la que había.',
  },
  'src/panel/modulos/InspeccionConductorReglas.jsx': {
    veces: 1,
    motivo: 'localStorage no disponible: solo se pierde el recuerdo, se vuelve a preguntar.',
  },
  'src/panel/modulos/Inspecciones.jsx': {
    veces: 1,
    motivo: 'Plantillas para imprimir la hoja: sin ellas se imprime la hoja de formato base.',
  },
  'src/panel/modulos/MantenimientoConductor.jsx': {
    veces: 1,
    motivo: 'Datos de ejecución del taller: extra de la ficha de la orden del conductor.',
  },
  'src/panel/modulos/MiPerfilSupervisorMovil.jsx': {
    veces: 3,
    motivo: 'Totales del perfil (unidades, gente, áreas): cada cifra falta por separado y se muestra «—», no un cero inventado.',
  },
  'src/panel/modulos/MiUnidadMovil.jsx': {
    veces: 4,
    motivo: 'Sesión por PIN, planilla de hoy, plantilla y acciones: extras de la hoja de «Mi unidad»; la unidad se ve igual.',
  },
  'src/panel/modulos/OtraUnidad.jsx': {
    veces: 1,
    motivo: 'Si no se puede leer la sesión abierta se ofrece igual el formulario; FOM dirá si ya hay una abierta.',
  },
  'src/panel/modulos/Reportes.jsx': {
    veces: 2,
    motivo: 'Cortes del informe: el null se cuenta y se anota en «faltantes» para avisarlo; y decodificar el logo antes de imprimir (no impide imprimir).',
  },
  'src/panel/modulos/SosConductor.jsx': {
    veces: 3,
    motivo: 'Última posición para el SOS, aviso de emergencia previa, y sondeo de la emergencia (sin respuesta se deja lo que se ve).',
  },
  'src/panel/modulos/UsuariosMovil.jsx': {
    veces: 1,
    motivo: 'Quiénes van manejando: sin la flota la lista sale igual, solo sin la marca de «conduciendo».',
  },
}

function hallazgos() {
  const porArchivo = {}
  for (const ruta of REVISADOS) {
    const texto = readFileSync(ruta, 'utf8')
    const clave = relative(raiz, ruta).replace(/\\/gu, '/')
    for (const { nombre, re } of PATRONES) {
      for (const m of texto.matchAll(re)) {
        const linea = texto.slice(0, m.index).split('\n').length
        ;(porArchivo[clave] ??= []).push({ nombre, linea })
      }
    }
  }
  return porArchivo
}

test('no hay .catch(() => []), .catch(() => null) ni catch {} vacíos nuevos', () => {
  const nuevos = []
  for (const [archivo, lista] of Object.entries(hallazgos())) {
    const permitidas = EXCEPCIONES[archivo]?.veces ?? 0
    if (lista.length > permitidas) {
      nuevos.push(`${archivo}: ${lista.length} y solo ${permitidas} permitidas (${lista.map((x) => `${x.nombre} en la línea ${x.linea}`).join('; ')})`)
    }
  }
  assert.deepEqual(
    nuevos,
    [],
    'Un error del servidor no puede verse como «no hay datos». Deja que llegue a la pantalla (ErrorCarga con «Reintentar»), '
      + 'anótalo (como `faltaron`) o, si de verdad es legítimo, añade la excepción con su motivo en test/regla-errores.test.js.',
  )
})

test('cada excepción lleva motivo y apunta a un archivo que existe', () => {
  for (const [archivo, { veces, motivo }] of Object.entries(EXCEPCIONES)) {
    assert.ok(REVISADOS.some((r) => relative(raiz, r).replace(/\\/gu, '/') === archivo), `${archivo} ya no existe: quita su excepción`)
    assert.ok(motivo && motivo.length > 20, `${archivo}: falta el motivo`)
    assert.ok(Number.isInteger(veces) && veces > 0, `${archivo}: veces inválido`)
  }
})

test('los arreglos de P5 siguen en pie: el expediente anota lo que falló y no lo traga', () => {
  const repoApi = readFileSync(join(raiz, 'src/panel/datos/repoApi.js'), 'utf8')
  assert.match(repoApi, /faltaron,\s*\n?\s*eventos: \[\]/u)
  assert.match(repoApi, /conductoresFallo = true/u)
  const centro = readFileSync(join(raiz, 'src/panel/modulos/CentroControl.jsx'), 'utf8')
  assert.doesNotMatch(centro, /gps\.listar\(\)\.catch/u)
})
