// ============================================================
// REPOSITORIO DEL PANEL — el conmutador
// ------------------------------------------------------------
// Única puerta de acceso a los datos para toda la consola. Decide, módulo por
// módulo, si la respuesta viene de la base de datos real o de la semilla:
//
//   · Con `VITE_FOM_API` configurado, lo que la API respalda hoy —flota,
//     posiciones, recorrido, áreas y conductores— sale de la base real, por la
//     superficie `/api/v1/console` del Issue #173.
//   · Todo lo demás —ODT, inspecciones, documentos, personal, alertas, pagos,
//     auditoría— todavía no existe en el esquema real y lo sirve la semilla.
//   · Sin `VITE_FOM_API`, absolutamente todo es semilla y el sitio funciona
//     igual, sin depender de que el túnel esté arriba.
//
// La mezcla es deliberada y temporal: permite ver flota real hoy sin dejar
// media consola en blanco. A medida que `fom-core` gane dominios, cada bloque
// se muda de un lado al otro sin tocar un solo módulo de la interfaz.
//
// Ver `infra/MAPA-DOMINIO-FOM02.md` para el orden previsto de esa mudanza.
// ============================================================

import { HAY_API } from './api'
import repoApi from './repoApi'
import repoSemilla, { alCambiarDatos, reiniciarDatos } from './repoSemilla'

/** ¿Qué módulos están leyendo de la base real? Útil para avisarlo en pantalla. */
export const FUENTE_REAL = HAY_API
  ? ['vehiculos', 'recorrido', 'resumen', 'areas', 'conductores',
     'odts', 'inspecciones', 'documentos', 'alertas', 'reglas']
  : []

/** ¿La consola está conectada a la base de datos de producción? */
export const CONECTADO = HAY_API
export const DIRECTORIO_REAL = HAY_API

// ── Conectado a la base: lo que no tiene respaldo real se declara vacío ─────
//
// Antes, los módulos sin endpoint (personal, costos, administración) seguían
// mostrando la semilla COMO SI fuera real. Un panel conectado que enseña
// datos inventados sin decirlo es peor que uno incompleto: alguien toma una
// decisión sobre un pago o un usuario que no existe.
//
// Regla nueva: conectado, cada dato viene de la base o no viene. Las
// escrituras sin superficie real fallan con un mensaje claro en vez de
// simular que funcionaron sobre memoria del navegador.

const NO_HAY_ESCRITURA = () =>
  Promise.reject(
    new Error(
      'Esta acción todavía no existe en el servidor: el bloque de escritura ' +
        'está pendiente de contrato. Los datos que ves son reales; crear y ' +
        'editar llegará con esa superficie.',
    ),
  )

// Lo que de verdad NO tiene superficie en el servidor todavia, con el motivo
// concreto. Cada texto dice que falta y, cuando existe, por donde se hace hoy.

const FALTA_ALERTAS =
  'Marcar avisos como leídos todavía no existe en el servidor: la consola ' +
  'los lee pero aún no puede escribir su estado.'

const FALTA_DOCUMENTOS =
  'Cargar documentos y mover vencimientos todavía no existe en el ' +
  'servidor: la consola los lee y avisa de los vencidos, pero aún no ' +
  'puede modificarlos.'

const FALTA_INSPECCIONES =
  'Las inspecciones se registran desde la app del conductor, que es quien ' +
  'revisa la unidad. Desde la consola todavía solo se consultan.'

const FALTA_REGLAS =
  'Crear y editar reglas de alerta todavía no existe en el servidor: la ' +
  'consola muestra las que hay y a cuántas unidades alcanzan.'

const FALTA_GPS =
  'Los equipos GPS se registran y comisionan desde la app de campo, junto ' +
  'al vehículo. Desde la consola todavía no.'

const FALTA_COSTOS =
  'Cargar costos todavía no existe en el servidor como módulo propio: hoy ' +
  'el costo se registra al cerrar la orden de trabajo que lo generó.'

const FALTA_PAGOS =
  'La facturación no existe todavía en el servidor: no hay tablas de pagos ' +
  'ni superficie que las sirva. Lo que se ve aquí no es real.'

/**
 * Igual que la anterior pero DICIENDO QUÉ FALTA.
 *
 * Un mensaje genérico deja al que lo lee sin saber si el problema es suyo, de
 * su permiso o del producto. Nombrar la pieza que falta convierte un callejón
 * sin salida en algo que se puede pedir, esperar o rodear.
 */
const faltaEnElServidor = (queFalta) => () =>
  Promise.reject(new Error(queFalta))

/**
 * Envuelve una colección de la semilla dejando reales las funciones que sí
 * tienen respaldo, y con un aviso PROPIO las que no.
 *
 * Lo importante es que ninguna quede sin definir: una función ausente revienta
 * con «no es una función», que no le dice nada a nadie.
 */
function conRespaldoParcial(coleccion, reales, avisos = {}) {
  const salida = { ...sinRespaldo(coleccion), ...reales }
  for (const [nombre, aviso] of Object.entries(avisos)) {
    salida[nombre] = faltaEnElServidor(aviso)
  }
  return salida
}

/** Sustituye una colección de la semilla por su versión honesta y vacía. */
function sinRespaldo(coleccion) {
  const vacia = {}
  for (const [nombre, fn] of Object.entries(coleccion)) {
    if (typeof fn !== 'function') continue
    // Los listados devuelven vacío; todo lo demás (crear, set, eliminar,
    // asignar…) rechaza con el aviso. `obtener` devuelve null: no encontrado.
    if (nombre === 'listar') vacia[nombre] = () => Promise.resolve([])
    else if (nombre === 'obtener') vacia[nombre] = () => Promise.resolve(null)
    else if (nombre === 'resumen') vacia[nombre] = () => Promise.resolve(null)
    else vacia[nombre] = NO_HAY_ESCRITURA
  }
  return vacia
}

const repo = HAY_API
  ? {
      ...repoSemilla,

      // --- Sin respaldo real todavía: vacío honesto, nunca semilla ------
      personal: sinRespaldo(repoSemilla.personal),
      costos: conRespaldoParcial(repoSemilla.costos, {}, {
        registrar: FALTA_COSTOS,
        actualizar: FALTA_COSTOS,
        crear: FALTA_COSTOS,
      }),
      empresa: () => Promise.resolve(null),
      admin: {
        // Empresas, contratistas y áreas: reales desde el #250.
        empresas: conRespaldoParcial(
          repoSemilla.admin.empresas,
          repoApi.empresas,
        ),
        usuarios: repoApi.admin.usuarios,
        gps: conRespaldoParcial(repoSemilla.admin.gps, {}, {
          registrar: FALTA_GPS,
          asociar: FALTA_GPS,
          verificar: FALTA_GPS,
          probarPanico: FALTA_GPS,
        }),
        pagos: conRespaldoParcial(repoSemilla.admin.pagos, {}, {
          registrar: FALTA_PAGOS,
          actualizar: FALTA_PAGOS,
          actualizarEstado: FALTA_PAGOS,
        }),
        auditoria: sinRespaldo(repoSemilla.admin.auditoria ?? {}),
      },

      // --- Reales -------------------------------------------------------
      vehiculos: {
        ...sinRespaldo(repoSemilla.vehiculos),
        listar: repoApi.vehiculos.listar,
        obtener: repoApi.vehiculos.obtener,
        // Alta, edición, área y conductor: reales desde el #219.
        ...repoApi.vehiculosEscritura,
      },
      recorrido: repoApi.recorrido,
      resumen: repoApi.resumen,

      // Áreas y conductores pasan a ser reales: los sirve `/api/v1/console`
      // desde las tablas del #169. Antes las áreas devolvían una lista vacía a
      // propósito, porque las de la semilla habrían puesto filtros de mentira
      // sobre unidades reales.
      areas: repoApi.areas,
      // La semilla no tiene una colección `conductores` —los suyos viven en
      // `personal`—, así que esta es nueva y no envuelve nada.
      conductores: repoApi.conductores,

      // Operación y cumplimiento, desde las tablas de #170 y #171. Las
      // escrituras de la semilla se conservan donde existen: la superficie
      // real es de solo lectura todavía.
      odts: {
        ...sinRespaldo(repoSemilla.odts),
        listar: repoApi.odts.listar,
        obtener: repoApi.odts.obtener,
        crear: repoApi.odts.crear,
        mover: repoApi.odts.mover,
      },
      inspecciones: conRespaldoParcial(
        repoSemilla.inspecciones,
        { listar: repoApi.inspecciones.listar },
        { crear: FALTA_INSPECCIONES, registrar: FALTA_INSPECCIONES },
      ),
      documentos: conRespaldoParcial(
        repoSemilla.documentos,
        { listar: repoApi.documentos.listar },
        {
          actualizarVencimiento: FALTA_DOCUMENTOS,
          actualizar: FALTA_DOCUMENTOS,
          crear: FALTA_DOCUMENTOS,
          subir: FALTA_DOCUMENTOS,
        },
      ),
      alertas: conRespaldoParcial(
        repoSemilla.alertas,
        { listar: repoApi.alertas.listar },
        {
          marcarLeida: FALTA_ALERTAS,
          marcarTodasLeidas: FALTA_ALERTAS,
          marcar: FALTA_ALERTAS,
        },
      ),
      reglas: conRespaldoParcial(
        repoSemilla.reglas,
        { listar: repoApi.reglas.listar },
        { crear: FALTA_REGLAS, set: FALTA_REGLAS, eliminar: FALTA_REGLAS },
      ),
      // `areas` se INVOCA como función en cuatro pantallas —`repo.areas()`—,
      // así que sus escrituras se le cuelgan encima en vez de mezclarla en un
      // objeto: mezclarla la convertiría en objeto y todas esas pantallas
      // dejarían de cargar.
      areas: Object.assign(
        (...args) => repoApi.areas(...args),
        repoApi.areasEscritura,
      ),
    }
  : repoSemilla

export { alCambiarDatos, reiniciarDatos }
export { repo }
export default repo
