// Dibujo de «Llegada» sobre el mapa de Mapbox: la ruta hasta el destino y su pin,
// más las cuentas y textos de la tarjeta. Cada función de dibujo devuelve cómo quitarlo.
// La ruta va de UN color (azul FOM): el tráfico se usa para el tiempo, no se pinta.

const AZUL_FOM = '#3D9BF5'
// El borde de la ruta: blanco sobre el mapa claro, casi negro sobre el oscuro.
const BORDE_CLARO = '#FFFFFF'
const BORDE_OSCURO = '#08121C'

// Gota azul con punto blanco (el mismo dibujo que en la app).
const PIN_DESTINO = '<svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true"><path d="M15 38.5S27 25.4 27 15.5a12 12 0 0 0-24 0C3 25.4 15 38.5 15 38.5Z" fill="#3D9BF5" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/><circle cx="15" cy="15.5" r="4.6" fill="#FFFFFF"/></svg>'

/** Color del borde de la ruta según cómo se ve el mapa (claro de día en calles; oscuro de noche o en satélite). */
export function bordeRuta(mapaClaro) {
  return mapaClaro ? BORDE_CLARO : BORDE_OSCURO
}

/** La ruta hasta el destino (azul FOM ~5 px con borde) y el pin propio en el destino. */
export function pintarLlegada(gl, mapa, { trazo, destino, mapaClaro = false }) {
  const ID = `llegada-${Date.now().toString(36)}`
  mapa.addSource(ID, {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: trazo } },
  })
  mapa.addLayer({ id: `${ID}-borde`, type: 'line', source: ID, slot: 'top', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': bordeRuta(mapaClaro), 'line-width': 9, 'line-emissive-strength': 1 } })
  mapa.addLayer({ id: `${ID}-linea`, type: 'line', source: ID, slot: 'top', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': AZUL_FOM, 'line-width': 5, 'line-emissive-strength': 1 } })
  const el = document.createElement('div')
  el.className = 'mapa-destino'
  el.innerHTML = PIN_DESTINO
  el.title = destino.nombre || 'Destino'
  const pin = new gl.Marker({ element: el, anchor: 'bottom' }).setLngLat([destino.lng, destino.lat]).addTo(mapa)
  return {
    /** Cambia el borde cuando el mapa pasa de claro a oscuro (luz automática). */
    tema: (claro) => {
      try { if (mapa.getLayer(`${ID}-borde`)) mapa.setPaintProperty(`${ID}-borde`, 'line-color', bordeRuta(claro)) } catch { /* estilo cambiando */ }
    },
    quitar: () => {
      pin.remove()
      for (const capa of [`${ID}-linea`, `${ID}-borde`]) if (mapa.getLayer(capa)) mapa.removeLayer(capa)
      if (mapa.getSource(ID)) mapa.removeSource(ID)
    },
  }
}

/** Los límites de una colección de polígonos o líneas, para encuadrarla. */
export function limitesDe(gl, coordenadas) {
  const planas = []
  const recorrer = (c) => {
    if (typeof c?.[0] === 'number') planas.push(c)
    else if (Array.isArray(c)) c.forEach(recorrer)
  }
  recorrer(coordenadas)
  if (!planas.length) return null
  return planas.reduce((b, p) => b.extend(p), new gl.LngLatBounds(planas[0], planas[0]))
}

// --- Textos de la tarjeta -------------------------------------------------

/** «18 min», «1 h», «1 h 05 min». */
export function tiempoLlegada(minutos) {
  const m = Math.max(0, Math.round(Number(minutos) || 0))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${String(r).padStart(2, '0')} min` : `${h} h`
}

/** «12,4 km» con coma decimal; desde 100 km, sin decimales («135 km»). */
export function distanciaLlegada(km) {
  const n = Math.max(0, Number(km) || 0)
  const decimales = n < 100 ? 1 : 0
  return `${n.toLocaleString('es-VE', { maximumFractionDigits: decimales, minimumFractionDigits: decimales })} km`
}

/** «3:42 p. m.»: la hora en que llega si sale ahora (hora local del navegador). */
export function horaLlegada(minutos, desde = Date.now()) {
  const d = new Date(desde + Math.max(0, Number(minutos) || 0) * 60000)
  const h = d.getHours()
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`
}

/** Minutos que suma el tráfico de ahora sobre lo normal; null si no llega a 2 min y al 10 %. */
export function extraPorTrafico(minutos, minutosNormales) {
  if (!Number.isFinite(minutos) || !Number.isFinite(minutosNormales) || minutosNormales <= 0) return null
  const extra = Math.round(minutos - minutosNormales)
  return extra >= 2 && extra >= minutosNormales * 0.1 ? extra : null
}

/** El error de la llegada en lenguaje llano (el detalle técnico se queda en la consola). */
export function mensajeLlegada(error) {
  const texto = String(error?.message || '')
  if (/token|respondió 40[13]/iu.test(texto)) return 'La llegada no está disponible en este momento.'
  if (/respondió 422|ruta|route|segment/iu.test(texto)) return 'No encontramos un camino por carretera hasta ese punto. Prueba con otro destino.'
  return 'No pudimos calcular la llegada. Revisa la conexión y prueba otra vez.'
}

// --- Eventos de manejo (frenadas, aceleraciones y excesos) ------------------
// Una sola capa GeoJSON de símbolos para todos los eventos: un marcador DOM por evento
// pesaba demasiado con 100 eventos. Los íconos se dibujan una vez en un lienzo y se
// registran en el estilo (al cambiar de estilo se vuelven a registrar).

const ICONO_EVENTO_PX = 30
const RATIO_ICONO = 2

/** El ícono de un tipo: círculo de su color, aro blanco y el glifo en oscuro. */
function imagenEvento(tipo) {
  const lado = ICONO_EVENTO_PX * RATIO_ICONO
  const lienzo = document.createElement('canvas')
  lienzo.width = lado
  lienzo.height = lado
  const ctx = lienzo.getContext('2d')
  ctx.scale(RATIO_ICONO, RATIO_ICONO)
  const c = ICONO_EVENTO_PX / 2
  ctx.beginPath()
  ctx.arc(c, c, c - 1, 0, Math.PI * 2)
  ctx.fillStyle = BORDE_OSCURO
  ctx.fill()
  ctx.beginPath()
  ctx.arc(c, c, c - 2.5, 0, Math.PI * 2)
  ctx.fillStyle = BORDE_CLARO
  ctx.fill()
  ctx.beginPath()
  ctx.arc(c, c, c - 4.5, 0, Math.PI * 2)
  ctx.fillStyle = tipo.color
  ctx.fill()
  // El glifo es de 24×24: se dibuja a 15 px en el centro.
  const k = 15 / 24
  ctx.translate(c - 12 * k, c - 12 * k)
  ctx.scale(k, k)
  ctx.strokeStyle = BORDE_OSCURO
  ctx.lineWidth = 2.4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const d of tipo.glifo) ctx.stroke(new Path2D(d))
  return ctx.getImageData(0, 0, lado, lado)
}

/** El círculo de un grupo: azul FOM con aro y el número en oscuro (nunca blanco sobre azul). */
function imagenGrupo(etiqueta) {
  const px = ICONO_EVENTO_PX + 4
  const lado = px * RATIO_ICONO
  const lienzo = document.createElement('canvas')
  lienzo.width = lado
  lienzo.height = lado
  const ctx = lienzo.getContext('2d')
  ctx.scale(RATIO_ICONO, RATIO_ICONO)
  const c = px / 2
  ctx.beginPath()
  ctx.arc(c, c, c - 1, 0, Math.PI * 2)
  ctx.fillStyle = BORDE_OSCURO
  ctx.fill()
  ctx.beginPath()
  ctx.arc(c, c, c - 2.5, 0, Math.PI * 2)
  ctx.fillStyle = BORDE_CLARO
  ctx.fill()
  ctx.beginPath()
  ctx.arc(c, c, c - 4.5, 0, Math.PI * 2)
  ctx.fillStyle = AZUL_FOM
  ctx.fill()
  ctx.fillStyle = BORDE_OSCURO
  ctx.font = `700 ${etiqueta.length > 2 ? 11 : 14}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(etiqueta, c, c + 0.5)
  return ctx.getImageData(0, 0, lado, lado)
}

/** «2»…«99»; «99+» de ahí en adelante. */
const etiquetaGrupo = (n) => (n > 99 ? '99+' : String(n))

const escHtml = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])

/**
 * Pinta los eventos de manejo (`coleccion`, de `geojsonEventos`) y devuelve cómo actualizarlos,
 * cómo abrir el globo de uno y cómo quitarlos. `tipos`: TIPOS_EVENTO; `alTocar(id)`: al tocar un ícono;
 * `alTocarGrupo(ids, [lng, lat])`: al tocar un círculo de varios eventos casi en el mismo punto.
 */
export function pintarEventosManejo(mapa, { coleccion, tipos, alTocar, alTocarGrupo, gl }) {
  const ID = `eventos-manejo-${Date.now().toString(36)}`
  for (const t of tipos) {
    const nombre = `evento-manejo-${t.clave}`
    if (!mapa.hasImage(nombre)) mapa.addImage(nombre, imagenEvento(t), { pixelRatio: RATIO_ICONO })
  }
  // Los círculos de grupo se dibujan según los números que hagan falta.
  const conGrupos = (c) => {
    for (const ft of c.features) {
      if (ft.properties.tipo !== 'grupo') continue
      const etiqueta = etiquetaGrupo(ft.properties.cantidad)
      ft.properties.imagen = `evento-grupo-${etiqueta}`
      if (!mapa.hasImage(ft.properties.imagen)) mapa.addImage(ft.properties.imagen, imagenGrupo(etiqueta), { pixelRatio: RATIO_ICONO })
    }
    return c
  }
  mapa.addSource(ID, { type: 'geojson', data: conGrupos(coleccion) })
  mapa.addLayer({
    id: `${ID}-iconos`,
    type: 'symbol',
    source: ID,
    slot: 'top',
    layout: {
      'icon-image': ['case', ['==', ['get', 'tipo'], 'grupo'], ['get', 'imagen'], ['concat', 'evento-manejo-', ['get', 'tipo']]],
      'icon-size': ['case', ['get', 'activo'], 1.3, 1],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'symbol-sort-key': ['get', 'orden'],
      'symbol-z-order': 'source',
    },
    paint: { 'icon-emissive-strength': 1 },
  })
  let globo = null
  const alClic = (e) => {
    const p = e.features?.[0]?.properties
    if (p?.id == null) return
    if (p.tipo === 'grupo') alTocarGrupo?.(String(p.ids).split('|'), e.features[0].geometry.coordinates)
    else alTocar?.(String(p.id))
  }
  const sobre = () => { mapa.getCanvas().style.cursor = 'pointer' }
  const fuera = () => { mapa.getCanvas().style.cursor = '' }
  mapa.on('click', `${ID}-iconos`, alClic)
  mapa.on('mouseenter', `${ID}-iconos`, sobre)
  mapa.on('mouseleave', `${ID}-iconos`, fuera)
  // Un solo globo a la vez (de un evento o de un grupo): el de antes se suelta primero, así su
  // «close» no cuenta como cerrar a mano.
  const ponerGlobo = (lngLat, html, alCerrar) => {
    const previo = globo
    globo = null
    previo?.remove()
    globo = new gl.Popup({ className: 'ruta-popup', closeButton: true, closeOnClick: false, maxWidth: '280px', offset: 18 })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(mapa)
    const este = globo
    este.on('close', () => { if (globo === este) { globo = null; alCerrar?.() } })
    return este
  }
  return {
    capa: `${ID}-iconos`,
    actualizar: (nueva) => { mapa.getSource(ID)?.setData(conGrupos(nueva)) },
    /** Abre el globo de un evento (`partes`: nombre, velocidades, hora, unidad). `alCerrar` al cerrarlo a mano. */
    abrir: (evento, partes, alCerrar) => {
      const [titulo, ...resto] = partes
      ponerGlobo([evento.lng, evento.lat], `<strong>${escHtml(titulo)}</strong>${resto.map((p) => `<span>${escHtml(p)}</span>`).join('')}`, alCerrar)
    },
    /**
     * El globo de un grupo: su título y un botón por evento (`filas`: { id, titulo, detalle }).
     * Tocar uno llama a `alElegir(id)`; el foco va al primero para seguir con el teclado.
     */
    abrirGrupo: (lngLat, titulo, filas, alElegir) => {
      const g = ponerGlobo(lngLat, `<strong>${escHtml(titulo)}</strong><ul class="em-globo-lista">${filas.map((x) =>
        `<li><button type="button" data-evento="${escHtml(x.id)}"><b>${escHtml(x.titulo)}</b>${x.detalle ? `<small>${escHtml(x.detalle)}</small>` : ''}</button></li>`).join('')}</ul>`)
      const el = g.getElement()
      el.addEventListener('click', (ev) => {
        const b = ev.target.closest?.('button[data-evento]')
        if (b) alElegir?.(b.getAttribute('data-evento'))
      })
      el.querySelector('button[data-evento]')?.focus({ preventScroll: true })
    },
    cerrar: () => {
      const g = globo
      globo = null
      g?.remove()
    },
    quitar: () => {
      mapa.off('click', `${ID}-iconos`, alClic)
      mapa.off('mouseenter', `${ID}-iconos`, sobre)
      mapa.off('mouseleave', `${ID}-iconos`, fuera)
      const g = globo
      globo = null
      g?.remove()
      if (mapa.getLayer(`${ID}-iconos`)) mapa.removeLayer(`${ID}-iconos`)
      if (mapa.getSource(ID)) mapa.removeSource(ID)
    },
  }
}
