// ============================================================
// REPOSITORIO DEL PANEL — el conmutador
// ------------------------------------------------------------
// Única puerta de acceso a los datos para toda la consola. Decide, módulo por
// módulo, si la respuesta viene de la base de datos real o de la semilla:
//
//   · Con `VITE_FOM_API` configurado, lo que la API respalda hoy —flota,
//     posiciones, recorrido— sale de producción.
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
export const FUENTE_REAL = HAY_API ? ['vehiculos', 'recorrido', 'resumen'] : []

/** ¿La consola está conectada a la base de datos de producción? */
export const CONECTADO = HAY_API

const repo = HAY_API
  ? {
      ...repoSemilla,

      // --- Reales -------------------------------------------------------
      vehiculos: {
        // Se conservan las escrituras de la semilla: la API todavía no
        // expone alta ni edición de vehículos para la consola de flota.
        ...repoSemilla.vehiculos,
        listar: repoApi.vehiculos.listar,
        obtener: repoApi.vehiculos.obtener,
      },
      recorrido: repoApi.recorrido,
      resumen: repoApi.resumen,

      // El esquema real tiene `areas`, pero vacía y sin vínculo con los
      // vehículos. Devolver las de la semilla pondría filtros de mentira
      // ("Costa oriental: 0") sobre unidades reales.
      areas: () => Promise.resolve([]),
    }
  : repoSemilla

export { alCambiarDatos, reiniciarDatos }
export { repo }
export default repo
