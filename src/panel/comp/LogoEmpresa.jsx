import { useEffect, useState } from 'react'
import LogoFom from '../../components/LogoFom'
import { CODIGO_FOM, logosDeEntes, urlDeLogo } from '../datos/logos'

/**
 * El logo de una empresa, para saber de una vez dónde estás.
 *
 * - Si la empresa es FOM Operations, se pinta el logo de FOM (regla de Marco).
 * - Si tiene logo subido, se pinta ese.
 * - Si no tiene, se pinta `respaldo` (el icono que tenía la pantalla), nunca
 *   el logo de FOM: una empresa ajena sin logo no es FOM.
 *
 * `codigo` y `logoObjectId` se pueden pasar si ya se tienen; si no, se
 * resuelven contra la lista de entes (una lectura cacheada).
 */
export default function LogoEmpresa({ empresaId, codigo, logoObjectId, nombre = '', respaldo = null, className = '' }) {
  const [estado, setEstado] = useState({ src: null, esFom: codigo === CODIGO_FOM })

  useEffect(() => {
    let vivo = true
    ;(async () => {
      let oid = logoObjectId
      let cod = codigo
      if (oid === undefined || cod === undefined) {
        const mapa = await logosDeEntes().catch(() => null)
        const e = mapa?.get(empresaId)
        if (oid === undefined) oid = e?.logoObjectId ?? null
        if (cod === undefined) cod = e?.codigo ?? null
      }
      if (cod === CODIGO_FOM) {
        if (vivo) setEstado({ src: null, esFom: true })
        return
      }
      const src = await urlDeLogo(empresaId, oid)
      if (vivo) setEstado({ src, esFom: false })
    })()
    return () => {
      vivo = false
    }
  }, [empresaId, codigo, logoObjectId])

  if (estado.esFom) return <LogoFom simbolo decorativo className={`logo-empresa logo-fom ${className}`.trim()} />
  if (estado.src) {
    return (
      <img
        className={`logo-empresa ${className}`.trim()}
        src={estado.src}
        alt={nombre ? `Logo de ${nombre}` : ''}
        onError={() => setEstado({ src: null, esFom: false })}
      />
    )
  }
  return respaldo
}
