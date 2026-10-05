import { useEffect, useMemo, useRef, useState } from 'react'
import FichaUnidad, { estadoUnidad } from './FichaUnidad'
import { vehicleMarkerUrl, MARKER_SIZE, MARKER_ANCHOR, validPosition } from './vehicleMarker'
import * as f from '../datos/formato'
import { puntoEnRuta } from '../datos/recorrido'

// ============================================================
// MAPA REAL DE GOOGLE MAPS
// La app usa react-native-maps (MapView), que en Android dibuja Google Maps.
// Aquí se usa la API de JavaScript de Google Maps para que la consola muestre
// exactamente el mismo mapa que ve el conductor en su teléfono.
//
// Necesita una clave: pon VITE_GOOGLE_MAPS_API_KEY en un archivo .env
// en la raíz del proyecto. Sin clave, Mapa.jsx cae al plano esquemático.
// ============================================================

export const CLAVE_MAPS = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || ''
export const hayClaveMaps = Boolean(CLAVE_MAPS)

// Una sola carga del script para toda la aplicación
let promesaCarga = null
function cargarGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (promesaCarga) return promesaCarga
  promesaCarga = new Promise((resolver, rechazar) => {
    const cb = '__fomMapaListo'
    window[cb] = () => resolver(window.google.maps)
    const s = document.createElement('script')
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(CLAVE_MAPS)}` +
      `&language=es&region=VE&loading=async&callback=${cb}`
    s.async = true
    s.onerror = () => {
      promesaCarga = null
      rechazar(new Error('No se pudo cargar Google Maps'))
    }
    document.head.appendChild(s)
  })
  return promesaCarga
}

// Estilo oscuro alineado a la paleta del tema (#0A0D12 / #141A22 / #262E39)
const ESTILO_OSCURO = [
  { elementType: 'geometry', stylers: [{ color: '#141a22' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0d12' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#abb3bf' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#39424f' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#69727e' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#12281d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1d2530' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#262e39' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a919e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#39424f' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1d2530' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1c2e' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a6079' }] },
]

const ESTILO_CLARO = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
]

// Centro por defecto: Costa Oriental del Lago
const CENTRO = { lat: 10.32, lng: -71.42 }

export default function MapaGoogle({
  vehiculos = [],
  seleccionado = null,
  alSeleccionar,
  ficha = true,
  leyenda = true,
  recorrido = null,
  viajes = null,
  paradas = null,
  cola = null,
  foco = null,
  espacioFicha = false,
  alVerRecorrido,
  alto = 'clamp(320px, 52vh, 560px)',
}) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const marcadores = useRef(new Map())
  const linea = useRef(null)
  const vehiculosRef = useRef(vehiculos)
  vehiculosRef.current = vehiculos
  const capasRuta = useRef([])
  const [estado, setEstado] = useState('cargando') // cargando | listo | error

  // Colores vivos del tema, para que los marcadores sigan el esquema
  const tokens = useMemo(() => {
    const raiz = document.querySelector('.pnl') || document.documentElement
    const cs = getComputedStyle(raiz)
    return {
      primario: cs.getPropertyValue('--e-primario').trim() || '#208AEF',
      exito: cs.getPropertyValue('--e-exito').trim() || '#1E9E5A',
      tenue: cs.getPropertyValue('--e-texto-3').trim() || '#8A919E',
      superficie: cs.getPropertyValue('--e-sup').trim() || '#FFFFFF',
    }
  }, [estado])

  const esquema = 'oscuro'

  // Crear el mapa una sola vez
  useEffect(() => {
    let vivo = true
    cargarGoogleMaps()
      .then((maps) => {
        if (!vivo || !contenedor.current) return
        mapa.current = new maps.Map(contenedor.current, {
          center: CENTRO,
          zoom: 9,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
          styles: esquema === 'oscuro' ? ESTILO_OSCURO : ESTILO_CLARO,
        })
        setEstado('listo')
      })
      .catch(() => vivo && setEstado('error'))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Repintar el estilo al cambiar de modo claro/oscuro
  useEffect(() => {
    if (estado !== 'listo' || !mapa.current) return
    mapa.current.setOptions({ styles: esquema === 'oscuro' ? ESTILO_OSCURO : ESTILO_CLARO })
  }, [esquema, estado])

  // Marcadores de las unidades
  useEffect(() => {
    if (estado !== 'listo' || !window.google?.maps) return
    const maps = window.google.maps
    const vistos = new Set()

    vehiculos
      .filter(validPosition)
      .forEach((v) => {
        vistos.add(v.id)
        const sel = seleccionado === v.id
        const icono = { url: vehicleMarkerUrl(v, sel), scaledSize: new maps.Size(...MARKER_SIZE), anchor: new maps.Point(...MARKER_ANCHOR) }
        let m = marcadores.current.get(v.id)
        if (!m) {
          m = new maps.Marker({
            map: mapa.current,
            position: { lat: v.lat, lng: v.lng },
            title: `${v.placa || v.alias} · ${estadoUnidad(v).texto}`,
            icon: icono,
          })
          marcadores.current.set(v.id, m)
        } else {
          m.setTitle(`${v.placa || v.alias} · ${estadoUnidad(v).texto}`)
          m.setPosition({ lat: v.lat, lng: v.lng })
          m.setIcon(icono)
        }
        maps.event.clearListeners(m, 'click')
        m.addListener('click', () => alSeleccionar?.(seleccionado === v.id ? null : v.id))
        m.setZIndex(sel ? 999 : 1)
      })

    // Retirar los que ya no vienen en la lista
    marcadores.current.forEach((m, id) => {
      if (!vistos.has(id)) {
        m.setMap(null)
        marcadores.current.delete(id)
      }
    })

    // Encuadrar la flota la primera vez que hay unidades
    if (!mapa.current.__encuadrado && vistos.size) {
      const limites = new maps.LatLngBounds()
      vehiculos.filter(validPosition).forEach((v) => limites.extend({ lat: v.lat, lng: v.lng }))
      mapa.current.fitBounds(limites, 48)
      mapa.current.__encuadrado = true
    }
  }, [vehiculos, seleccionado, estado, tokens, alSeleccionar])

  // Al ELEGIR una unidad se centra en ella (una sola vez, sin tocar el zoom). Los refrescos no mueven nada.
  useEffect(() => {
    if (estado !== 'listo' || !seleccionado || !mapa.current) return
    const v = vehiculosRef.current.find((x) => x.id === seleccionado)
    if (!validPosition(v)) return
    mapa.current.panTo({ lat: v.lat, lng: v.lng })
    if (ficha || espacioFicha) mapa.current.panBy(contenedor.current.clientWidth > 600 ? -175 : 0, contenedor.current.clientWidth > 600 ? 0 : contenedor.current.clientHeight * .18)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionado, estado])

  // Trazado del recorrido del día
  useEffect(() => {
    if (estado !== 'listo' || !window.google?.maps) return
    if (linea.current) {
      linea.current.setMap(null)
      linea.current = null
    }
    if (!recorrido?.length) return
    linea.current = new window.google.maps.Polyline({
      map: mapa.current,
      path: recorrido.filter(validPosition).map((p) => ({ lat: p.lat, lng: p.lng })),
      strokeColor: tokens.primario,
      strokeOpacity: 0.9,
      strokeWeight: 4,
    })
  }, [recorrido, estado, tokens])

  // Recorrido con viajes (inicio y fin), paradas y hora de cada punto
  useEffect(() => {
    if (estado !== 'listo' || !window.google?.maps) return undefined
    const g = window.google.maps
    const limpiar = () => { capasRuta.current.forEach((c) => c.setMap(null)); capasRuta.current = [] }
    limpiar()
    if (!viajes?.length && !paradas?.length) return undefined
    const info = new g.InfoWindow()
    const etiqueta = (letra, fondo, texto) => ({
      label: { text: letra, color: '#06101a', fontWeight: '700', fontSize: '13px' },
      icon: { path: g.SymbolPath.CIRCLE, scale: 13, fillColor: fondo, fillOpacity: 1, strokeColor: '#071019', strokeWeight: 3 },
      title: texto,
    })
    const limites = new g.LatLngBounds()
    for (const v of viajes ?? []) {
      const trazo = v.puntos.map((p) => ({ lat: p.lat, lng: p.lng }))
      trazo.forEach((p) => limites.extend(p))
      const linea = new g.Polyline({ map: mapa.current, path: trazo, strokeColor: tokens.primario, strokeOpacity: 0.95, strokeWeight: 5 })
      linea.addListener('click', (e) => {
        const p = puntoEnRuta(v.puntos, { lat: e.latLng.lat(), lng: e.latLng.lng() })
        info.setContent(`<strong>${f.hora(p.hora)}</strong><br>${f.fechaCorta(p.hora)}${p.velocidadKmh == null ? '' : `<br>${f.velocidad(p.velocidadKmh)}`}<br>Viaje ${v.numero}`)
        info.setPosition({ lat: p.lat, lng: p.lng })
        info.open(mapa.current)
      })
      capasRuta.current.push(linea)
      const cerca = (l) => (paradas ?? []).some((x) => Math.abs(x.lat - l.lat) < 0.0014 && Math.abs(x.lng - l.lng) < 0.0014)
      if (!cerca(v.inicio)) capasRuta.current.push(new g.Marker({ map: mapa.current, position: v.inicio, ...etiqueta('A', '#34d399', `Inicio ${f.hora(v.inicio.hora)}`) }))
      if (!v.fin.enCurso && !cerca(v.fin)) capasRuta.current.push(new g.Marker({ map: mapa.current, position: v.fin, ...etiqueta('B', '#f87171', `Fin ${f.hora(v.fin.hora)}`) }))
    }
    for (const p of paradas ?? []) {
      limites.extend({ lat: p.lat, lng: p.lng })
      const m = new g.Marker({ map: mapa.current, position: { lat: p.lat, lng: p.lng }, ...etiqueta('P', '#fbbf24', `Estacionada ${f.duracion(p.minutos)}`) })
      m.addListener('click', () => {
        info.setContent(`<strong>Estacionada ${f.duracion(p.minutos)}</strong><br>Llegó ${f.hora(p.desde)} · Salió ${f.hora(p.hasta)}`)
        info.open(mapa.current, m)
      })
      capasRuta.current.push(m)
    }
    return () => { limpiar(); info.close() }
  }, [viajes, paradas, estado, tokens])

  const colaEncuadrada = useRef(null)
  useEffect(() => { colaEncuadrada.current = null }, [seleccionado])

  // Cola: los últimos minutos de camino de la unidad elegida
  useEffect(() => {
    if (estado !== 'listo' || !window.google?.maps) return undefined
    const g = window.google.maps
    if (!cola || cola.length < 2) return undefined
    const util = cola.filter(validPosition).map((p) => ({ lat: p.lat, lng: p.lng }))
    if (util.length < 2) return undefined
    if (seleccionado && colaEncuadrada.current !== seleccionado) {
      const limites = new g.LatLngBounds()
      util.forEach(p => limites.extend(p))
      const ancho = contenedor.current.clientWidth
      mapa.current.fitBounds(limites, { top: 150, right: 80, bottom: (ficha || espacioFicha) && ancho <= 600 ? Math.min(contenedor.current.clientHeight * .45, 350) : 80, left: (ficha || espacioFicha) && ancho > 600 ? 410 : 40 })
      if (mapa.current.getZoom() > 16) mapa.current.setZoom(16)
      colaEncuadrada.current = seleccionado
    }
    const trazo = new g.Polyline({
      map: mapa.current, path: util, strokeOpacity: 0,
      icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.7, strokeColor: tokens.primario, scale: 3 }, offset: '0', repeat: '12px' }],
    })
    return () => trazo.setMap(null)
  }, [cola, estado, tokens, seleccionado])

  useEffect(() => {
    if (estado === 'listo' && foco && mapa.current) { mapa.current.panTo({ lat: foco.lat, lng: foco.lng }); mapa.current.setZoom(Math.max(mapa.current.getZoom() ?? 0, 16)) }
  }, [foco, estado])

  const activo = seleccionado
  const vehiculoActivo = vehiculos.find((v) => v.id === activo)
  const estadosVisibles = [...new Map(vehiculos.map(v => { const e = estadoUnidad(v); return [e.clave, e] })).values()]

  return (
    <div className="pnl-mapa fleet-map" style={{ height: alto }}>
      <div ref={contenedor} className="pnl-mapa-lienzo" />

      {estado === 'cargando' && (
        <div className="pnl-mapa-aviso">Cargando el mapa…</div>
      )}
      {estado === 'error' && (
        <div className="pnl-mapa-aviso">
          No se pudo cargar Google Maps. Revisa la clave y la conexión.
        </div>
      )}

      {leyenda && estadosVisibles.length > 0 && <div className="fleet-map-legend" aria-label="Estados de los vehículos">{estadosVisibles.map(e => <span className={e.color} key={e.clave}><i />{e.texto}</span>)}</div>}

      {ficha && vehiculoActivo && <FichaUnidad unidad={vehiculoActivo} variante="flotante" alVerRecorrido={alVerRecorrido} alCerrar={() => alSeleccionar?.(null)} />}

    </div>
  )
}
