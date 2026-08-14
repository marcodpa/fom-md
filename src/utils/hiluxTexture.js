import hiluxUrl from '../assets/hilux.png'

// Elimina el fondo blanco de la foto de la Hilux mediante un flood-fill desde
// los bordes: solo se vuelven transparentes los píxeles claros y poco saturados
// conectados con el exterior, de modo que los brillos blancos de la carrocería
// y los grises del interior se conservan intactos.

let promise = null

function isBackground(data, i) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  // Umbral bajo de luminancia para que el relleno también atraviese la sombra
  // gris de la foto original (incluidos los huecos bajo el chasis).
  return max - min < 42 && lum > 62
}

function removeBackground(imageData, w, h) {
  const data = imageData.data
  const removed = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  let head = 0
  let tail = 0

  const push = (idx) => {
    if (removed[idx]) return
    if (!isBackground(data, idx * 4)) return
    removed[idx] = 1
    queue[tail++] = idx
  }

  for (let x = 0; x < w; x++) {
    push(x)
    push((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    push(y * w)
    push(y * w + w - 1)
  }

  while (head < tail) {
    const idx = queue[head++]
    const x = idx % w
    const y = (idx / w) | 0
    if (x > 0) push(idx - 1)
    if (x < w - 1) push(idx + 1)
    if (y > 0) push(idx - w)
    if (y < h - 1) push(idx + w)
  }

  for (let i = 0; i < removed.length; i++) {
    if (removed[i]) data[i * 4 + 3] = 0
  }

  // Suavizado de bordes: los píxeles opacos pegados a la zona eliminada
  // reciben alfa parcial para evitar el halo blanco.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      if (removed[idx]) continue
      let n = 0
      if (removed[idx - 1]) n++
      if (removed[idx + 1]) n++
      if (removed[idx - w]) n++
      if (removed[idx + w]) n++
      if (removed[idx - w - 1]) n++
      if (removed[idx - w + 1]) n++
      if (removed[idx + w - 1]) n++
      if (removed[idx + w + 1]) n++
      if (n > 0) {
        const k = i4(idx)
        data[k + 3] = Math.round(data[k + 3] * Math.max(0.15, 1 - n * 0.28))
        // atenúa el residuo claro del borde
        data[k] = Math.round(data[k] * 0.82)
        data[k + 1] = Math.round(data[k + 1] * 0.82)
        data[k + 2] = Math.round(data[k + 2] * 0.82)
      }
    }
  }

  // El render original tiene un charco de luz rebotada del piso del estudio
  // bajo el chasis, encerrado por el anillo de sombra oscura (inalcanzable por
  // el flood-fill). En la franja inferior, los píxeles poco saturados se
  // convierten en sombra: cuanto más brillantes, más se oscurecen y más
  // transparentes quedan. La placa está por encima de la franja y los rines,
  // al ser oscuros, apenas cambian.
  const bandStart = Math.floor(h * 0.7)
  for (let y = bandStart; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x
      if (removed[idx]) continue
      const k = i4(idx)
      const r = data[k]
      const g = data[k + 1]
      const b = data[k + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      if (max - min >= 46) continue
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const t = Math.min(1, Math.max(0, (lum - 60) / 170))
      if (t <= 0) continue
      const dim = 1 - 0.85 * t
      data[k] = Math.round(r * dim)
      data[k + 1] = Math.round(g * dim)
      data[k + 2] = Math.round(b * dim)
      data[k + 3] = Math.round(data[k + 3] * (1 - 0.5 * t))
    }
  }

  return removed
}

function i4(idx) {
  return idx * 4
}

function cropToContent(canvas, ctx, w, h) {
  const id = ctx.getImageData(0, 0, w, h)
  const data = id.data
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return canvas
  const pad = 6
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(w - 1, maxX + pad)
  maxY = Math.min(h - 1, maxY + pad)
  const cw = maxX - minX + 1
  const ch = maxY - minY + 1
  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  out.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch)
  return out
}

// La foto del catálogo es de la Hilux ROJA y la unidad de la intro es BLANCA:
// en la ficha se verían dos vehículos distintos. SOLO donde el rojo domina
// (la pintura), el píxel se vuelve neutro conservando su luminancia, con una
// curva que sube las medias luces: la carrocería queda blanca con su sombreado
// real, y cromados, cristales, cauchos y sombras (neutros) no se tocan.
function repaintWhite(imageData) {
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    if (r - b < 15) continue // píxel neutro: no es pintura
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    // curva de pintura blanca: raíz para levantar medios, tope en 250
    const v = Math.min(250, Math.round(255 * Math.sqrt(lum / 255) * 1.24))
    d[i] = v
    d[i + 1] = Math.min(252, v + 2)
    d[i + 2] = Math.min(255, v + 5) // deje frío, como la carrocería de la intro
  }
}

export function loadHilux() {
  if (promise) return promise
  promise = new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const maxW = 1024
        const scale = Math.min(1, maxW / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, w, h)
        const imageData = ctx.getImageData(0, 0, w, h)
        removeBackground(imageData, w, h)
        repaintWhite(imageData)
        ctx.putImageData(imageData, 0, 0)
        const cropped = cropToContent(canvas, ctx, w, h)

        resolve({
          dataUrl: cropped.toDataURL('image/png'),
          aspect: cropped.height / cropped.width,
        })
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = reject
    img.src = hiluxUrl
  })
  return promise
}
