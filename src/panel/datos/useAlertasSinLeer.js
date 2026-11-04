import { useEffect, useState } from 'react'
import repo, { alCambiarAvisosGps, alCambiarDatos } from './repo'
import { contarSinLeer } from '../modulos/alertas-presentacion'

const CADA_MINUTO = 60_000

/**
 * Cuántas alertas siguen sin leer: el número de la campana, del globo del menú
 * y del teléfono. Cuenta sobre la misma lista que la bandeja (con los avisos
 * locales de «GPS sin señal») y con la misma regla (`contarSinLeer`).
 * Se vuelve a leer cuando algo cambia, al cambiar `clave` (p. ej. al navegar)
 * y cada minuto, por si alguien más marcó o llegó un aviso.
 */
export function useAlertasSinLeer({ activo = true, clave = '' } = {}) {
  const [sinLeer, setSinLeer] = useState(0)
  useEffect(() => {
    if (!activo) { setSinLeer(0); return undefined }
    let vivo = true
    const leer = () => repo.alertas.listar({}).then((l) => vivo && setSinLeer(contarSinLeer(l))).catch(() => {})
    leer()
    const baja = alCambiarDatos(leer)
    const bajaGps = alCambiarAvisosGps(leer)
    const reloj = setInterval(leer, CADA_MINUTO)
    return () => { vivo = false; baja(); bajaGps(); clearInterval(reloj) }
  }, [activo, clave])
  return sinLeer
}
