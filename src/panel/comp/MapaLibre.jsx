import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ============================================================
// MAPA REAL Y GRATUITO (Leaflet + OpenStreetMap)
// Calles reales de la Costa Oriental del Lago, sin clave de API, sin cuenta
// de facturación y sin límite de tarjeta. Es la alternativa libre a Google
// Maps: el mapa es de verdad, solo cambia quién dibuja las teselas.
//
// La atribución a OpenStreetMap es OBLIGATORIA por su licencia (ODbL) y va
// siempre visible en la esquina del mapa.
// ============================================================

// Teselas claras: OpenStreetMap estándar.
// Teselas oscuras: CARTO Dark Matter, también gratuitas y sin clave.
const TESELAS = {
  claro: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribucion: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  oscuro: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    atribucion:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdominios: 'abcd',
  },
}

// Costa Oriental del Lago
const CENTRO = [10.32, -71.42]

function leerTokens() {
  const raiz = document.querySelector('.pnl') || document.documentElement
  const cs = getComputedStyle(raiz)
  return {
    primario: cs.getPropertyValue('--e-primario').trim() || '#208AEF',
    exito: cs.getPropertyValue('--e-exito').trim() || '#1E9E5A',
    tenue: cs.getPropertyValue('--e-texto-3').trim() || '#8A919E',
    superficie: cs.getPropertyValue('--e-sup').trim() || '#FFFFFF',
  }
}

/** Marcador circular, del mismo lenguaje visual que el resto de la consola. */
function iconoUnidad(v, seleccionado, tokens) {
  const color = seleccionado ? tokens.primario : v.estadoMarcha === 'en_marcha' ? tokens.exito : tokens.tenue
  const tam = seleccionado ? 20 : 16
  const pulso = v.estadoMarcha === 'en_marcha' ? ' pulsa' : ''
  return L.divIcon({
    className: 'pnl-marcador',
    html: `<i class="pnl-marcador-punto${pulso}" style="--c:${color};--b:${tokens.superficie};--t:${tam}px"></i>`,
    iconSize: [tam, tam],
    iconAnchor: [tam / 2, tam / 2],
  })
}

export default function MapaLibre({
  vehiculos = [],
  seleccionado = null,
  alSeleccionar,
  recorrido = null,
  alto = 'clamp(320px, 52vh, 560px)',
}) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const capa = useRef(null)
  const marcadores = useRef(new Map())
  const linea = useRef(null)
  const encuadrado = useRef(false)
  const [sobre, setSobre] = useState(null)
  const [fallaTeselas, setFallaTeselas] = useState(false)

  const esquema = document.documentElement.getAttribute('data-tema') === 'oscuro' ? 'oscuro' : 'claro'

  // Crear el mapa una sola vez
  useEffect(() => {
    if (mapa.current || !contenedor.current) return undefined
    mapa.current = L.map(contenedor.current, {
      center: CENTRO,
      zoom: 9,
      zoomControl: true,
      attributionControl: true,
    })
    return () => {
      mapa.current?.remove()
      mapa.current = null
      marcadores.current.clear()
    }
  }, [])

  // Teselas según el modo claro u oscuro
  useEffect(() => {
    if (!mapa.current) return
    const t = TESELAS[esquema]
    if (capa.current) capa.current.remove()
    let fallos = 0
    capa.current = L.tileLayer(t.url, {
      attribution: t.atribucion,
      maxZoom: t.maxZoom,
      subdomains: t.subdominios || 'abc',
    })
    capa.current.on('tileerror', () => {
      fallos += 1
      if (fallos > 6) setFallaTeselas(true)
    })
    capa.current.on('tileload', () => setFallaTeselas(false))
    capa.current.addTo(mapa.current)
  }, [esquema])

  // Marcadores de las unidades
  useEffect(() => {
    if (!mapa.current) return
    const tokens = leerTokens()
    const vistos = new Set()

    vehiculos
      .filter((v) => v.lat != null && v.lng != null)
      .forEach((v) => {
        vistos.add(v.id)
        const sel = seleccionado === v.id
        let m = marcadores.current.get(v.id)
        if (!m) {
          m = L.marker([v.lat, v.lng], {
            icon: iconoUnidad(v, sel, tokens),
            title: `${v.alias} · ${v.placa}`,
            keyboard: true,
            alt: `${v.alias}, ${v.estadoMarcha === 'en_marcha' ? 'en marcha' : 'detenida'}`,
          })
          m.on('click', () => alSeleccionar?.(seleccionado === v.id ? null : v.id))
          m.on('mouseover', () => setSobre(v.id))
          m.on('mouseout', () => setSobre(null))
          m.addTo(mapa.current)
          marcadores.current.set(v.id, m)
        } else {
          m.setLatLng([v.lat, v.lng])
          m.setIcon(iconoUnidad(v, sel, tokens))
        }
        m.setZIndexOffset(sel ? 1000 : 0)
      })

    marcadores.current.forEach((m, id) => {
      if (!vistos.has(id)) {
        m.remove()
        marcadores.current.delete(id)
      }
    })

    // Encuadrar toda la flota la primera vez
    if (!encuadrado.current && vistos.size) {
      const puntos = vehiculos.filter((v) => v.lat != null).map((v) => [v.lat, v.lng])
      if (puntos.length) {
        mapa.current.fitBounds(puntos, { padding: [48, 48], maxZoom: 12 })
        encuadrado.current = true
      }
    }
  }, [vehiculos, seleccionado, alSeleccionar, esquema])

  // Centrar en la unidad seleccionada
  useEffect(() => {
    if (!mapa.current || !seleccionado) return
    const v = vehiculos.find((x) => x.id === seleccionado)
    if (v?.lat != null) mapa.current.panTo([v.lat, v.lng])
  }, [seleccionado, vehiculos])

  // Recorrido del día
  useEffect(() => {
    if (!mapa.current) return
    if (linea.current) {
      linea.current.remove()
      linea.current = null
    }
    if (!recorrido?.length) return
    linea.current = L.polyline(
      recorrido.map((p) => [p.lat, p.lng]),
      { color: leerTokens().primario, weight: 4, opacity: 0.9 }
    ).addTo(mapa.current)
  }, [recorrido, esquema])

  // El contenedor cambia de tamaño al abrirse el módulo: recalcular
  useEffect(() => {
    const id = setTimeout(() => mapa.current?.invalidateSize(), 250)
    return () => clearTimeout(id)
  }, [alto])

  const activo = sobre ?? seleccionado
  const v = vehiculos.find((x) => x.id === activo)
  const enMarcha = vehiculos.filter((x) => x.estadoMarcha === 'en_marcha').length

  return (
    <div className="pnl-mapa" style={{ height: alto }}>
      <div ref={contenedor} className="pnl-mapa-lienzo" />

      {fallaTeselas && (
        <div className="pnl-mapa-aviso">
          No se pudieron cargar las imágenes del mapa. Revisa la conexión.
        </div>
      )}

      <div className="pnl-mapa-leyenda">
        <span className="pnl-mapa-vivo">
          <i />
          En vivo
        </span>
        <span>{vehiculos.length} unidades</span>
        <span className="sep">·</span>
        <span>{enMarcha} en marcha</span>
      </div>

      {v && (
        <div className="pnl-mapa-detalle">
          <div className="pnl-mapa-detalle-top">
            <span className={`pnl-tag ${v.estadoMarcha === 'en_marcha' ? 'verde' : 'gris'}`}>
              {v.estadoMarcha === 'en_marcha' ? 'En marcha' : 'Detenida'}
            </span>
            {seleccionado === activo && (
              <button type="button" onClick={() => alSeleccionar?.(null)} aria-label="Cerrar detalle del vehículo">
                ✕
              </button>
            )}
          </div>
          <b>{v.alias}</b>
          <span>
            {v.marca} {v.modelo} · {v.placa}
          </span>
          <div className="pnl-mapa-detalle-pie">
            <span>{v.conductorNombre ?? 'Sin conductor'}</span>
            {v.estadoMarcha === 'en_marcha' && <em>{v.velocidadKmh} km/h</em>}
          </div>
        </div>
      )}
    </div>
  )
}
