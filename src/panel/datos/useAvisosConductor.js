import { useCallback, useEffect, useMemo, useState } from 'react'
import repo, { alCambiarDatos } from './repo'
import { miAsignacion } from './asignacion-conductor'
import { armarBuzonesConductor, guardarEstadoAvisos, leerEstadoAvisos } from './avisosConductor'

// ============================================================
// LA CARGA de los avisos del conductor, para la campana y para su lista.
// ------------------------------------------------------------
// Como getPanelMantenimientoConductor de la app: lo que viene del servidor
// (su unidad, sus órdenes y los papeles) se recuerda un minuto y lo comparten
// la campana y la lista; lo leído y lo descartado se aplica encima en cada
// pintada, así marcar algo baja el número al instante sin volver a pedir nada.
// ============================================================

/** Cuánto vale lo leído del servidor: la campana se pinta en cada pestaña. */
const VIGENTE_MS = 60_000

/** Por usuario: `en` es cuándo llegó (null mientras viene). */
const memoria = new Map()
/** Sube con cada olvido: lo que estaba en camino ya no se guarda. */
let generacion = 0

const oyentes = new Set()
function avisar() {
  oyentes.forEach((fn) => fn())
}

/** Olvida lo leído del servidor: lo que acaba de cambiar tiene que verse. */
export function olvidarAvisosConductor() {
  generacion += 1
  memoria.clear()
  avisar()
}

// Una orden nueva o un papel editado en otro módulo cambian los avisos.
let suscrito = false
function suscribir() {
  if (suscrito) return
  suscrito = true
  alCambiarDatos(olvidarAvisosConductor)
}

const claveDe = (perfil) => `${perfil.id}|${perfil.nombre ?? ''}|${perfil.empresaGestion?.id ?? ''}`

/**
 * Su unidad, las órdenes de esa unidad y los papeles que el servidor le deje
 * ver. Cada lectura aguanta sola: una caída no tumba las demás, pero lo que
 * salió con un hueco no se recuerda (la próxima pantalla reintenta).
 */
async function leerFuentes(perfil) {
  let completo = true
  const caida = (vacio) => () => {
    completo = false
    return vacio
  }
  const asignaciones = await repo.conductores().catch(caida([]))
  const asignacion = miAsignacion(perfil, asignaciones ?? [])
  const vehiculoId = asignacion?.vehiculoId ?? null
  const [ordenes, documentos] = await Promise.all([
    // Las de SU unidad: las de la flota entera no le tocan.
    vehiculoId ? repo.odts.listar({ vehiculoId }).catch(caida([])) : Promise.resolve([]),
    repo.documentos.listar({}).catch(caida([])),
  ])
  return {
    completo,
    fuentes: {
      nombre: perfil.nombre ?? '',
      // Su id real sale de su asignación (en la sesión real el perfil solo trae el correo).
      personaId: asignacion?.id ?? perfil.userId ?? null,
      vehiculoId,
      ordenes: ordenes ?? [],
      documentos: documentos ?? [],
    },
  }
}

function vigente(entrada) {
  return entrada && entrada.gen === generacion && (entrada.en === null || Date.now() - entrada.en < VIGENTE_MS)
}

/** Lo leído del servidor, recordado un minuto; el pedido en camino se comparte. */
export function cargarFuentesAvisos(perfil) {
  const clave = claveDe(perfil)
  const guardada = memoria.get(clave)
  if (vigente(guardada)) return guardada.promesa
  const entrada = { gen: generacion, en: null, fuentes: null, promesa: null }
  entrada.promesa = leerFuentes(perfil).then(
    ({ fuentes, completo }) => {
      if (memoria.get(clave) === entrada) {
        if (completo && entrada.gen === generacion) {
          entrada.en = Date.now()
          entrada.fuentes = fuentes
        } else memoria.delete(clave)
      }
      return fuentes
    },
    (e) => {
      if (memoria.get(clave) === entrada) memoria.delete(clave)
      throw e
    },
  )
  memoria.set(clave, entrada)
  return entrada.promesa
}

/** Lo que ya está en memoria y vale, sin pedir nada (o null). */
function enMemoria(perfil) {
  if (!perfil) return null
  const entrada = memoria.get(claveDe(perfil))
  return vigente(entrada) ? entrada.fuentes : null
}

/**
 * Los avisos del conductor: sus tres buzones, el número de la campana y cómo
 * marcarlos o quitarlos. `activo` en false no pide nada (otros roles).
 * `refresco` cambia al navegar: vuelve a mirar (la memoria evita el pedido).
 */
export function useAvisosConductor(perfil, { activo = true, refresco = '' } = {}) {
  const usuario = perfil?.id ?? ''
  const [fuentes, setFuentes] = useState(() => (activo ? enMemoria(perfil) : null))
  const [estado, setEstado] = useState(() => (fuentes ? 'ok' : 'cargando'))
  // Sube cuando algo se marca, se descarta o se olvida: se vuelve a armar.
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const otra = () => setRevision((r) => r + 1)
    oyentes.add(otra)
    return () => oyentes.delete(otra)
  }, [])

  useEffect(() => {
    if (!activo || !perfil) return undefined
    suscribir()
    let vivo = true
    cargarFuentesAvisos(perfil)
      .then((f) => {
        if (!vivo) return
        setFuentes(f)
        setEstado('ok')
      })
      .catch(() => {
        if (vivo) setEstado((e) => (e === 'ok' ? e : 'error'))
      })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, usuario, perfil?.nombre, perfil?.empresaGestion?.id, refresco, revision])

  const armado = useMemo(
    () => (activo && fuentes ? armarBuzonesConductor({ ...fuentes, estado: leerEstadoAvisos(usuario) }) : null),
    // `revision` va a propósito: lo leído vive en el navegador, no en el estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activo, fuentes, usuario, revision],
  )

  /** Las da por vistas (abrirlas, o «Marcar todas»). */
  const marcarLeidas = useCallback((avisos) => {
    const ids = avisos.filter((n) => !n.leida).map((n) => n.id)
    if (!usuario || !ids.length) return
    guardarEstadoAvisos(usuario, ids, { leida: true })
    avisar()
  }, [usuario])

  /**
   * La quita de la lista, y no vuelve. No borra de lo que habla —la orden o
   * el papel siguen donde estaban—; de paso cuenta como leída.
   */
  const descartar = useCallback((aviso) => {
    if (!usuario || !aviso) return
    guardarEstadoAvisos(usuario, [aviso.id], { leida: true, descartada: true })
    avisar()
  }, [usuario])

  return {
    buzones: armado?.buzones ?? null,
    noLeidas: armado?.noLeidas ?? 0,
    estado: armado ? 'ok' : estado,
    marcarLeidas,
    descartar,
    recargar: olvidarAvisosConductor,
  }
}
