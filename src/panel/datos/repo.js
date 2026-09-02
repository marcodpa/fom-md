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
      costos: sinRespaldo(repoSemilla.costos),
      empresa: () => Promise.resolve(null),
      admin: {
        empresas: sinRespaldo(repoSemilla.admin.empresas),
        usuarios: repoApi.admin.usuarios,
        gps: sinRespaldo(repoSemilla.admin.gps),
        pagos: sinRespaldo(repoSemilla.admin.pagos),
        auditoria: sinRespaldo(repoSemilla.admin.auditoria ?? {}),
      },

      // --- Reales -------------------------------------------------------
      vehiculos: {
        ...sinRespaldo(repoSemilla.vehiculos),
        listar: repoApi.vehiculos.listar,
        obtener: repoApi.vehiculos.obtener,
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
      },
      inspecciones: { ...sinRespaldo(repoSemilla.inspecciones), listar: repoApi.inspecciones.listar },
      documentos: { ...sinRespaldo(repoSemilla.documentos), listar: repoApi.documentos.listar },
      alertas: { ...sinRespaldo(repoSemilla.alertas), listar: repoApi.alertas.listar },
      reglas: { ...sinRespaldo(repoSemilla.reglas), listar: repoApi.reglas.listar },
    }
  : repoSemilla

export { alCambiarDatos, reiniciarDatos }
export { repo }
export default repo
