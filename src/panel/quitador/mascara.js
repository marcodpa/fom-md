// ============================================================
// LA MÁSCARA del quitador de fondo (T-179): cuentas puras, sin navegador.
// ------------------------------------------------------------
// IS-Net devuelve, para cada punto de la foto reducida a 1024 × 1024, cuánto
// parece «objeto» (la unidad) y cuánto «fondo». Aquí se pasa eso a 0..1, se
// limpia (solo queda la mancha más grande: una persona o un carro suelto
// detrás no salen pegados) y se revisa si el resultado tiene pinta de malo.
// Lo usa el worker; está aparte para poder probarlo sin navegador.
// ============================================================

/** La salida cruda de IS-Net estirada a 0..1 (como hace rembg). */
export function normalizar(valores) {
  let bajo = Infinity
  let alto = -Infinity
  for (let i = 0; i < valores.length; i++) {
    const v = valores[i]
    if (v < bajo) bajo = v
    if (v > alto) alto = v
  }
  const rango = alto - bajo || 1
  const salida = new Float32Array(valores.length)
  for (let i = 0; i < valores.length; i++) salida[i] = (valores[i] - bajo) / rango
  return salida
}

/**
 * Se queda con la mancha más grande (la unidad) y borra el resto. Conserva 3
 * puntos de borde suave alrededor para que el contorno no quede serruchado.
 * Cambia `mascara` (n × n) y devuelve cuánto ocupa la unidad (0..1).
 */
export function limpiar(mascara, n) {
  const total = n * n
  const fuerte = new Uint8Array(total)
  for (let i = 0; i < total; i++) fuerte[i] = mascara[i] > 0.5 ? 1 : 0
  const etiqueta = new Int32Array(total)
  const pila = new Int32Array(total)
  let mejor = 0
  let mejorArea = 0
  let actual = 0
  let areaTotal = 0
  for (let s = 0; s < total; s++) {
    if (!fuerte[s] || etiqueta[s]) continue
    actual += 1
    let area = 0
    let tope = 0
    pila[tope++] = s
    etiqueta[s] = actual
    while (tope) {
      const p = pila[--tope]
      area += 1
      const x = p % n
      if (p >= n && fuerte[p - n] && !etiqueta[p - n]) { etiqueta[p - n] = actual; pila[tope++] = p - n }
      if (p < total - n && fuerte[p + n] && !etiqueta[p + n]) { etiqueta[p + n] = actual; pila[tope++] = p + n }
      if (x > 0 && fuerte[p - 1] && !etiqueta[p - 1]) { etiqueta[p - 1] = actual; pila[tope++] = p - 1 }
      if (x < n - 1 && fuerte[p + 1] && !etiqueta[p + 1]) { etiqueta[p + 1] = actual; pila[tope++] = p + 1 }
    }
    areaTotal += area
    if (area > mejorArea) { mejorArea = area; mejor = actual }
  }
  // Lo que no toca la mancha principal (ni su borde suave) se borra.
  let cerca = new Uint8Array(total)
  for (let p = 0; p < total; p++) if (mejor && etiqueta[p] === mejor) cerca[p] = 1
  for (let paso = 0; paso < 3; paso++) {
    const antes = cerca
    cerca = antes.slice()
    for (let p = 0; p < total; p++) {
      if (antes[p]) continue
      const x = p % n
      if ((p >= n && antes[p - n]) || (p < total - n && antes[p + n]) || (x > 0 && antes[p - 1]) || (x < n - 1 && antes[p + 1])) cerca[p] = 1
    }
  }
  for (let p = 0; p < total; p++) if (!cerca[p]) mascara[p] = 0
  return { cobertura: mejorArea / total, fraccionPrincipal: areaTotal ? mejorArea / areaTotal : 0 }
}

/** Avisos en llano para la vista previa. Las claves sirven a las pruebas. */
export const AVISOS = {
  vacia: 'Casi no quedó nada de la foto: puede que no se haya encontrado la unidad.',
  toda: 'El recorte ocupa casi toda la foto: puede que el fondo no se haya quitado bien.',
  cortada: 'La unidad parece cortada por los bordes de la foto: queda mejor una foto donde salga entera.',
}

/**
 * Revisión rápida de «foto mala»: casi vacía, casi toda la foto, o la unidad
 * pegada a 3 o más bordes (cortada). Devuelve las claves de `AVISOS`.
 */
export function revisar(mascara, n, cobertura) {
  let arriba = 0
  let abajo = 0
  let izquierda = 0
  let derecha = 0
  for (let i = 0; i < n; i++) {
    if (mascara[i] > 0.5) arriba++
    if (mascara[(n - 1) * n + i] > 0.5) abajo++
    if (mascara[i * n] > 0.5) izquierda++
    if (mascara[i * n + n - 1] > 0.5) derecha++
  }
  const bordes = [arriba, abajo, izquierda, derecha].filter((c) => c > n * 0.08).length
  const avisos = []
  if (cobertura < 0.06) avisos.push('vacia')
  if (cobertura > 0.85) avisos.push('toda')
  if (bordes >= 3) avisos.push('cortada')
  return avisos
}

/** La caja que encierra la unidad en la máscara (n × n), o `null` si no quedó nada. */
export function caja(mascara, n, umbral = 0.05) {
  let x0 = n
  let y0 = n
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (mascara[y * n + x] > umbral) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 }
}

// --- El lienzo final ----------------------------------------------------------
// Igual que las fotos del catálogo (`src/assets/vehiculos`, T-170): 8:5, la
// unidad centrada, el suelo al 92 % del alto y su sombra ya puesta. Así el
// recorte se usa en «Mi unidad» en el mismo sitio que una foto del catálogo.

export const LIENZO = { ancho: 1200, alto: 750, suelo: 0.92, margenX: 0.04, margenArriba: 0.06 }

/** Dónde va la unidad (de `ancho` × `alto` px) dentro del lienzo final. */
export function encaje(ancho, alto, lienzo = LIENZO) {
  const maxAncho = lienzo.ancho * (1 - 2 * lienzo.margenX)
  const suelo = lienzo.alto * lienzo.suelo
  const maxAlto = suelo - lienzo.alto * lienzo.margenArriba
  const escala = Math.min(maxAncho / ancho, maxAlto / alto)
  const w = ancho * escala
  const h = alto * escala
  return { x: (lienzo.ancho - w) / 2, y: suelo - h, ancho: w, alto: h, suelo }
}
