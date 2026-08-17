import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import FichaUnidad, { estadoUnidad } from './FichaUnidad'

// ============================================================
// MAPA REAL Y GRATUITO (Leaflet + OpenStreetMap)
// Calles reales de la Costa Oriental del Lago, sin clave de API, sin cuenta
// de facturación y sin límite de tarjeta. Es la alternativa libre a Google
// Maps: el mapa es de verdad, solo cambia quién dibuja las teselas.
//
// La atribución a OpenStreetMap es OBLIGATORIA por su licencia (ODbL) y va
// siempre visible en la esquina del mapa.
// ============================================================

// UN SOLO proveedor de teselas: OpenStreetMap, para los dos temas.
//
// Antes el tema oscuro usaba CARTO Dark Matter. Se retiró porque
// `basemaps.cartocdn.com` no responde desde la red de operación: las teselas
// no daban error, simplemente se colgaban hasta agotar el tiempo. Y como el
// respaldo se disparaba con el evento `tileerror`, que un timeout nunca
// dispara, el mapa se quedaba en negro sin avisar de nada.
//
// El aspecto oscuro se consigue ahora con un filtro CSS sobre las mismas
// teselas (ver `.pnl-mapa.oscuro` en panel.css). Menos dependencias externas
// y un modo menos que se puede romper por su cuenta.
const TESELAS = {
  claro: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribucion: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  oscuro: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    atribucion: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
}

/**
 * Lleva un marcador de su posición actual a la nueva deslizándose.
 *
 * Los equipos reportan cada uno a cinco minutos, así que sin esto el punto
 * desaparece de un sitio y aparece en otro. Interpolando el trayecto durante
 * poco más de un segundo se lee como un vehículo avanzando, que es lo que el
 * supervisor espera de un rastreador.
 *
 * Devuelve una función para cancelar, porque si llega una posición todavía más
 * nueva a mitad del recorrido hay que abandonar el anterior y salir hacia la
 * última: si no, dos animaciones pelean por el mismo marcador.
 */
function deslizar(marcador, destino, ms = 1200) {
  const origen = marcador.getLatLng()
  const dLat = destino[0] - origen.lat
  const dLng = destino[1] - origen.lng

  // Salto enorme (primer dato, o el vehículo reapareció lejos): no se anima,
  // se coloca. Un deslizamiento de kilómetros sería una mentira visual.
  if (Math.abs(dLat) > 0.05 || Math.abs(dLng) > 0.05 || (dLat === 0 && dLng === 0)) {
    marcador.setLatLng(destino)
    return () => {}
  }

  let cuadro = 0
  const inicio = performance.now()
  const paso = (ahora) => {
    const t = Math.min(1, (ahora - inicio) / ms)
    const suave = 1 - Math.pow(1 - t, 3)
    marcador.setLatLng([origen.lat + dLat * suave, origen.lng + dLng * suave])
    if (t < 1) cuadro = requestAnimationFrame(paso)
  }
  cuadro = requestAnimationFrame(paso)
  return () => cancelAnimationFrame(cuadro)
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
  // Un solo criterio de estado para el pin, la etiqueta y la ficha.
  const estado = estadoUnidad(v)
  const vivo = estado.color === 'verde'
  const color = seleccionado ? tokens.primario : vivo ? tokens.exito : tokens.tenue
  const tam = seleccionado ? 20 : 16
  const pulso = estado.clave === 'en_marcha' || estado.clave === 'reportando' ? ' pulsa' : ''
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
  // Cancelador de la animación en curso de cada unidad, para que dos
  // posiciones seguidas no se peleen por mover el mismo marcador.
  const animaciones = useRef(new Map())
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
    const animacionesActivas = animaciones.current
    return () => {
      animacionesActivas.forEach((cancelar) => cancelar())
      animacionesActivas.clear()
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
    let cargoAlguna = false
    capa.current = L.tileLayer(t.url, {
      attribution: t.atribucion,
      maxZoom: t.maxZoom,
      subdomains: t.subdominios || 'abc',
    })
    capa.current.on('tileerror', () => {
      fallos += 1
      if (fallos > 6) setFallaTeselas(true)
    })
    capa.current.on('tileload', () => {
      cargoAlguna = true
      setFallaTeselas(false)
    })
    capa.current.addTo(mapa.current)

    // Un proveedor caído no siempre falla: a veces solo se cuelga, y entonces
    // `tileerror` no llega nunca. Si a los 8 segundos no cargó ni una tesela,
    // se avisa igual en vez de dejar un rectángulo vacío.
    const vigilante = setTimeout(() => {
      if (!cargoAlguna) setFallaTeselas(true)
    }, 8000)
    return () => clearTimeout(vigilante)
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
            alt: `${v.alias || v.placa}, ${estadoUnidad(v).texto}`,
          })
          m.on('click', () => alSeleccionar?.(seleccionado === v.id ? null : v.id))
          m.on('mouseover', () => setSobre(v.id))
          m.on('mouseout', () => setSobre(null))
          m.addTo(mapa.current)
          marcadores.current.set(v.id, m)
        } else {
          const previa = m.getLatLng()
          if (previa.lat !== v.lat || previa.lng !== v.lng) {
            animaciones.current.get(v.id)?.()
            animaciones.current.set(v.id, deslizar(m, [v.lat, v.lng]))
          }
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
  // La base real no guarda velocidad: no se puede contar cuántas van en
  // marcha, solo cuántos equipos están reportando.
  const sabeMarcha = vehiculos.some((x) => x.estadoMarcha != null)
  const reportando = vehiculos.filter((x) => x.conectado).length

  return (
    <div className={`pnl-mapa${esquema === 'oscuro' ? ' oscuro' : ''}`} style={{ height: alto }}>
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
        <span>{sabeMarcha ? `${enMarcha} en marcha` : `${reportando} reportando`}</span>
      </div>

      {v && (
        <FichaUnidad
          unidad={v}
          variante="flotante"
          alCerrar={seleccionado === activo ? () => alSeleccionar?.(null) : undefined}
        />
      )}
    </div>
  )
}
