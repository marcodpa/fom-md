import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ============================================================
// MAPA REAL DEL CENTRO DE SEGURIDAD
// Calles reales de la Costa Oriental del Lago (teselas oscuras de CARTO,
// gratuitas y sin clave) con las capas de seguridad dibujadas encima:
// zonas de alto riesgo, geocerca segura, ruta vigilada y unidades en vivo.
// Se carga en diferido: mientras llega, se muestra el plano esquemático.
// ============================================================

// Zona de operación: Cabimas, Tía Juana y Ciudad Ojeda
const ZONA_RIESGO_1 = [
  [10.418, -71.472],
  [10.432, -71.442],
  [10.416, -71.418],
  [10.396, -71.428],
  [10.398, -71.462],
]
const ZONA_RIESGO_2 = [
  [10.298, -71.408],
  [10.312, -71.378],
  [10.296, -71.352],
  [10.274, -71.362],
  [10.278, -71.398],
]
// Patio resguardado al sur de Ciudad Ojeda
const GEOCERCA = [
  [10.212, -71.332],
  [10.212, -71.298],
  [10.186, -71.298],
  [10.186, -71.332],
]
// Ruta vigilada por la Intercomunal, de sur a norte
const RUTA = [
  [10.199, -71.315],
  [10.24, -71.35],
  [10.286, -71.383],
  [10.33, -71.42],
  [10.372, -71.44],
  [10.41, -71.445],
  [10.44, -71.455],
]

// [posición, tono] de las unidades sobre la ruta
const UNIDADES = [
  [[10.199, -71.315], 'verde'],
  [[10.286, -71.383], 'ambar'],
  [[10.44, -71.455], 'verde'],
]

const COLOR = { verde: '#3dd68c', ambar: '#f5c242' }

function pinUnidad(tono) {
  return L.divIcon({
    className: 'pnl-marcador',
    html: `<i class="pnl-marcador-punto pulsa" style="--c:${COLOR[tono]};--b:#0a1119;--t:16px"></i>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function etiqueta(texto, tono, ancho) {
  return L.divIcon({
    className: `seg-etq ${tono}`,
    html: texto,
    iconSize: [ancho, 20],
    iconAnchor: [ancho / 2, 10],
  })
}

export default function MapaSeguridadReal() {
  const contenedor = useRef(null)
  const mapa = useRef(null)

  useEffect(() => {
    if (mapa.current || !contenedor.current) return undefined

    const m = L.map(contenedor.current, {
      zoomControl: true,
      scrollWheelZoom: false, // que la rueda siga haciendo scroll en la página
      attributionControl: true,
    })
    mapa.current = m

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(m)

    // Zonas de alto riesgo
    const estiloRiesgo = {
      color: 'rgba(255, 99, 105, 0.75)',
      weight: 1.6,
      dashArray: '6 5',
      fillColor: '#ff6369',
      fillOpacity: 0.16,
    }
    L.polygon(ZONA_RIESGO_1, estiloRiesgo).addTo(m)
    L.polygon(ZONA_RIESGO_2, estiloRiesgo).addTo(m)
    L.marker([10.414, -71.444], { icon: etiqueta('Zona de alto riesgo', 'rojo', 150), interactive: false }).addTo(m)
    L.marker([10.293, -71.38], { icon: etiqueta('Zona de alto riesgo', 'rojo', 150), interactive: false }).addTo(m)

    // Geocerca segura
    L.polygon(GEOCERCA, {
      color: 'rgba(61, 214, 140, 0.65)',
      weight: 1.4,
      dashArray: '5 5',
      fillColor: '#3dd68c',
      fillOpacity: 0.08,
    }).addTo(m)
    L.marker([10.1985, -71.3145], { icon: etiqueta('Geocerca segura', 'verde', 128), interactive: false }).addTo(m)

    // Ruta vigilada
    L.polyline(RUTA, {
      color: '#3d9bf5',
      weight: 3,
      dashArray: '7 6',
      opacity: 0.9,
    }).addTo(m)

    // Unidades
    UNIDADES.forEach(([pos, tono]) => {
      L.marker(pos, { icon: pinUnidad(tono), interactive: false }).addTo(m)
    })

    // Encuadre de toda la operación
    m.fitBounds(
      [...ZONA_RIESGO_1, ...ZONA_RIESGO_2, ...GEOCERCA],
      { padding: [30, 30] }
    )

    // El contenedor termina de medirse tras el primer pintado
    const id = setTimeout(() => m.invalidateSize(), 250)

    return () => {
      clearTimeout(id)
      m.remove()
      mapa.current = null
    }
  }, [])

  return <div ref={contenedor} className="seg-mapa-real" aria-label="Mapa real de la Costa Oriental del Lago con zonas de seguridad" />
}
