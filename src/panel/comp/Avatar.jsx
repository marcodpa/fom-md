import { useEffect, useState } from 'react'
import { etiquetas, listarImagenes, miniatura } from '../datos/cloudinary'

// Foto de perfil: la más reciente con la etiqueta `fom_avatar_<userId>` en Cloudinary; si no hay, las iniciales.
// Se guarda en memoria para no pedir lo mismo en la barra de arriba, el menú y Mi perfil a la vez.

const cache = new Map() // userId -> Promise<string|null>
const oyentes = new Set()

function cargar(userId) {
  if (!cache.has(userId)) {
    cache.set(userId, listarImagenes(etiquetas.avatar(userId)).then((r) => r[0]?.url ?? null))
  }
  return cache.get(userId)
}

/** Después de cambiar la foto: se vuelve a pedir en todos los lugares donde aparece. */
export function invalidarAvatar(userId) {
  cache.delete(userId)
  oyentes.forEach((f) => f(userId))
}

export function useAvatar(userId) {
  const [url, setUrl] = useState(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const oyente = (id) => { if (id === userId) setVersion((v) => v + 1) }
    oyentes.add(oyente)
    return () => oyentes.delete(oyente)
  }, [userId])
  useEffect(() => {
    let vigente = true
    if (!userId) { setUrl(null); return undefined }
    cargar(userId).then((u) => { if (vigente) setUrl(u) })
    return () => { vigente = false }
  }, [userId, version])
  return url
}

/** El círculo con la foto de la persona o, mientras no la haya, sus iniciales. */
export default function Avatar({ userId, iniciales, nombre = '', clase = 'pnl-avatar', tam = 96 }) {
  const url = useAvatar(userId)
  return (
    <i className={clase}>
      {url ? <img src={miniatura(url, tam, tam)} alt={nombre ? `Foto de ${nombre}` : ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : iniciales}
    </i>
  )
}
