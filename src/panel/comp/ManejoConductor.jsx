import { useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Tag } from './ui'
import { TarjetaManejo } from './ScoreManejo'
import { etiquetaManejo, manejoDe, tonoManejo } from '../datos/manejo'

/** Pastilla «49 · Atención» / «Sin km», con el mismo tono que la tabla del Resumen. */
export function PastillaManejo({ score }) {
  return <Tag color={tonoManejo(score)}>{etiquetaManejo(score)}</Tag>
}

/**
 * Pastilla de un conductor sacada del ranking de la empresa (lectura guardada unos minutos,
 * compartida por toda la pantalla). Si no se puede leer o no aparece, no se muestra nada.
 */
export function PastillaConductor({ userId, dias = 7 }) {
  const { datos } = useDatos(() => (userId ? repo.manejo.ranking({ dias }).catch(() => null) : Promise.resolve(null)), [userId, dias])
  const score = manejoDe(datos, userId)
  return score ? <PastillaManejo score={score} /> : null
}

/**
 * La tarjeta «Manejo» de una persona, con el selector 7 / 28 días.
 * - `propio`: el de la sesión (`/me/driving-score`). Si no, el de `userId` dentro del ranking.
 * - `inicial`: lo que la pantalla ya leyó para `diasInicial`; con eso no se vuelve a pedir
 *   (`cargandoInicial` mientras la pantalla todavía lo está leyendo).
 */
export default function ManejoConductor({ userId, propio = false, inicial, diasInicial = 7, cargandoInicial = false, error: errorInicial, ...resto }) {
  const [dias, setDias] = useState(diasInicial)
  const usarInicial = inicial !== undefined && dias === diasInicial
  const carga = useDatos(() => {
    if (usarInicial) return Promise.resolve(null)
    if (propio) return repo.manejo.miScore({ dias })
    return repo.manejo.ranking({ dias }).then((lista) => manejoDe(lista, userId))
  }, [dias, userId, propio, usarInicial])
  const score = usarInicial ? inicial : carga.datos
  const error = usarInicial ? errorInicial : carga.estado === 'error' ? carga.error?.message : ''
  return <TarjetaManejo {...resto} score={score} dias={dias} alCambiarDias={setDias}
    cargando={usarInicial ? cargandoInicial : carga.estado === 'cargando'} error={error} />
}
