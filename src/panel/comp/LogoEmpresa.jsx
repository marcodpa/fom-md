import { useEffect, useState } from 'react'
import LogoFom from '../../components/LogoFom'
import { alCambiarFotos } from '../datos/cloudinary'
import { CODIGO_FOM, logosDeEntes, urlDeLogo, urlLogoEnNube } from '../datos/logos'

/**
 * El logo de una empresa, para saber de una vez dónde estás.
 *
 * - Si la empresa es FOM Operations, se pinta el logo de FOM (regla de Marco).
 * - Si tiene logo subido al almacén del servidor, se pinta ese.
 * - Si no, y se subió a Cloudinary (el almacén del servidor sigue apagado en producción), se pinta ese:
 *   su dirección sale del id de la empresa, no hace falta ningún dato en el servidor.
 * - Si no tiene, se pinta `respaldo` (el icono que tenía la pantalla), nunca
 *   el logo de FOM: una empresa ajena sin logo no es FOM.
 *
 * `codigo` y `logoObjectId` se pueden pasar si ya se tienen; si no, se
 * resuelven contra la lista de entes (una lectura cacheada).
 */
export default function LogoEmpresa({ empresaId, codigo, logoObjectId, nombre = '', respaldo = null, className = '' }) {
  const [estado, setEstado] = useState({ src: null, esFom: codigo === CODIGO_FOM })
  // Se sube un logo desde esta web: se vuelve a buscar el de la empresa.
  const [cambio, setCambio] = useState(0)
  useEffect(() => alCambiarFotos(() => setCambio((n) => n + 1)), [])

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
      const src = (await urlDeLogo(empresaId, oid)) ?? (await urlLogoEnNube(empresaId))
      if (vivo) setEstado({ src, esFom: false })
    })()
    return () => {
      vivo = false
    }
  }, [empresaId, codigo, logoObjectId, cambio])

  if (estado.esFom) return <LogoFom simbolo decorativo className={`logo-empresa logo-fom ${className}`.trim()} />
  if (estado.src) {
    return (
      <img
        className={`logo-empresa ${className}`.trim()}
        src={estado.src}
        alt={nombre ? `Logo de ${nombre}` : ''}
        decoding="async"
        onError={() => setEstado({ src: null, esFom: false })}
      />
    )
  }
  return respaldo
}
