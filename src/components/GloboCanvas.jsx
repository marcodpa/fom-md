import { useEffect, useRef } from 'react'
import { esTierra } from './mundoTierra'

// ============================================================
// LA TIERRA EN CANVAS
// Globo de puntos con los CONTINENTES REALES (máscara horneada de Natural
// Earth): los puntos solo existen donde hay tierra firme, así que se ven
// América, África, Europa... Venezuela queda de frente al cargar y una red
// de arcos une a Maracaibo con las capitales de la operación.
// Solo se anima transform/alpha, respeta el movimiento reducido y se pausa
// cuando la pestaña no se ve.
// ============================================================

const DOS_PI = Math.PI * 2
const RAD = Math.PI / 180

// Ciudades reales [lat, lng]. La primera es la casa: Maracaibo.
const CIUDADES = [
  [10.65, -71.64], // Maracaibo (principal)
  [10.48, -66.9], // Caracas
  [4.71, -74.07], // Bogotá
  [8.98, -79.52], // Ciudad de Panamá
  [25.76, -80.19], // Miami
  [29.76, -95.37], // Houston
  [19.43, -99.13], // Ciudad de México
  [-23.55, -46.63], // São Paulo
  [40.42, -3.7], // Madrid
]
// Arcos desde Maracaibo hacia el resto de la red
const ARCOS = [1, 2, 3, 4, 5, 6, 7, 8]

// lat/lng a vector unitario (y hacia abajo, como el lienzo)
function aVector(lat, lng) {
  const f = lat * RAD
  const l = lng * RAD
  return { x: Math.cos(f) * Math.sin(l), y: -Math.sin(f), z: Math.cos(f) * Math.cos(l) }
}

export default function GloboCanvas() {
  const lienzo = useRef(null)

  useEffect(() => {
    const canvas = lienzo.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let ancho = 0
    let alto = 0
    let cuadro = 0
    let vivo = true

    // --- Puntos de tierra: esfera de Fibonacci filtrada por la máscara ---
    const N = 16000
    const tierra = []
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const t = i * 2.399963
      const x = Math.cos(t) * r
      const z = Math.sin(t) * r
      const lat = Math.asin(-y) / RAD
      const lng = Math.atan2(x, z) / RAD
      if (esTierra(lat, lng)) tierra.push({ x, y, z })
    }

    // --- Ciudades y arcos ---
    const ciudades = CIUDADES.map(([la, lo]) => aVector(la, lo))
    const casa = ciudades[0]
    const arcos = ARCOS.map((idx) => {
      const b = ciudades[idx]
      const dot = Math.max(-1, Math.min(1, casa.x * b.x + casa.y * b.y + casa.z * b.z))
      const omega = Math.acos(dot)
      const so = Math.sin(omega) || 1e-6
      const puntos = []
      const PASOS = 44
      for (let k = 0; k <= PASOS; k++) {
        const t = k / PASOS
        const A = Math.sin((1 - t) * omega) / so
        const B = Math.sin(t * omega) / so
        const alza = 1 + 0.14 * Math.sin(Math.PI * t) // el arco se levanta del suelo
        puntos.push({
          x: (casa.x * A + b.x * B) * alza,
          y: (casa.y * A + b.y * B) * alza,
          z: (casa.z * A + b.z * B) * alza,
        })
      }
      return puntos
    })

    // Estrellas fijas del fondo
    const estrellas = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      t: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.5 + 0.15,
    }))

    const medir = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      ancho = canvas.clientWidth
      alto = canvas.clientHeight
      canvas.width = Math.round(ancho * dpr)
      canvas.height = Math.round(alto * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // Venezuela de frente al cargar; luego el mundo cruza despacio
    const GIRO_INICIAL = 71.6 * RAD
    const VUELTA = quieto ? 0 : DOS_PI / 110000 // una vuelta cada ~110 s

    const pintar = (ms) => {
      const g = GIRO_INICIAL + ms * VUELTA
      const seng = Math.sin(g)
      const cosg = Math.cos(g)
      const cx = ancho / 2
      const cy = alto * 0.46
      const R = Math.min(ancho, alto) * 0.42

      const gira = (p) => ({
        x: p.x * cosg + p.z * seng,
        y: p.y,
        z: -p.x * seng + p.z * cosg,
      })

      ctx.clearRect(0, 0, ancho, alto)

      // Estrellas
      for (const e of estrellas) {
        ctx.globalAlpha = e.a
        ctx.fillStyle = '#9fb6d8'
        ctx.fillRect(e.x * ancho, e.y * alto, e.t, e.t)
      }
      ctx.globalAlpha = 1

      // Atmósfera
      const halo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.5)
      halo.addColorStop(0, 'rgba(59, 213, 255, 0.10)')
      halo.addColorStop(0.6, 'rgba(59, 213, 255, 0.03)')
      halo.addColorStop(1, 'rgba(59, 213, 255, 0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.5, 0, DOS_PI)
      ctx.fill()

      // Océano: disco profundo con la luz entrando desde arriba
      const disco = ctx.createRadialGradient(cx, cy - R * 0.4, R * 0.2, cx, cy, R)
      disco.addColorStop(0, '#16283f')
      disco.addColorStop(1, '#091223')
      ctx.fillStyle = disco
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, DOS_PI)
      ctx.fill()

      // Continentes: puntos solo donde hay tierra
      for (const p of tierra) {
        const q = gira(p)
        if (q.z < 0.02) continue
        const prof = q.z // 0 borde, 1 frente
        ctx.globalAlpha = 0.16 + prof * 0.62
        ctx.fillStyle = prof > 0.55 ? '#8fd0f2' : '#3f6e9e'
        ctx.beginPath()
        ctx.arc(cx + q.x * R, cy + q.y * R, 0.9 + prof * 0.7, 0, DOS_PI)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Arcos de la red, con un pulso viajando por cada uno
      const fase = ms * 0.00012
      arcos.forEach((arc, ai) => {
        ctx.beginPath()
        let dentro = false
        for (const p of arc) {
          const q = gira(p)
          if (q.z < 0.03) {
            dentro = false
            continue
          }
          const px = cx + q.x * R
          const py = cy + q.y * R
          if (dentro) ctx.lineTo(px, py)
          else ctx.moveTo(px, py)
          dentro = true
        }
        ctx.strokeStyle = 'rgba(59, 213, 255, 0.32)'
        ctx.lineWidth = 1
        ctx.stroke()

        // pulso viajero
        const t = (fase + ai * 0.13) % 1
        const idx = Math.min(arc.length - 1, Math.floor(t * arc.length))
        const q = gira(arc[idx])
        if (q.z > 0.03) {
          ctx.globalAlpha = 0.9
          ctx.fillStyle = '#9fe5ff'
          ctx.shadowColor = '#3bd5ff'
          ctx.shadowBlur = 6
          ctx.beginPath()
          ctx.arc(cx + q.x * R, cy + q.y * R, 1.6, 0, DOS_PI)
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1
        }
      })

      // Ciudades: balizas que titilan; Maracaibo con anillo
      const lat = ms * 0.002
      ciudades.forEach((c, i) => {
        const q = gira(c)
        if (q.z < 0.03) return
        const px = cx + q.x * R
        const py = cy + q.y * R
        const brillo = quieto ? 0.85 : 0.6 + 0.4 * Math.sin(lat + i * 1.7)
        ctx.globalAlpha = q.z * brillo
        ctx.fillStyle = '#9fe5ff'
        ctx.shadowColor = '#3bd5ff'
        ctx.shadowBlur = 9
        ctx.beginPath()
        ctx.arc(px, py, i === 0 ? 2.6 : 1.9, 0, DOS_PI)
        ctx.fill()
        ctx.shadowBlur = 0
        if (i === 0) {
          const onda = quieto ? 0.5 : (ms % 2600) / 2600
          ctx.globalAlpha = (1 - onda) * 0.55 * q.z
          ctx.strokeStyle = '#3bd5ff'
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(px, py, 3 + onda * 14, 0, DOS_PI)
          ctx.stroke()
        }
      })
      ctx.globalAlpha = 1

      // Filo de luz superior
      const filo = ctx.createLinearGradient(cx, cy - R, cx, cy)
      filo.addColorStop(0, 'rgba(255,255,255,0.10)')
      filo.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.strokeStyle = filo
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, R - 0.75, Math.PI, DOS_PI)
      ctx.stroke()
    }

    const paso = (ms) => {
      if (!vivo) return
      pintar(ms)
      if (!quieto && !document.hidden) cuadro = requestAnimationFrame(paso)
    }

    const alVolver = () => {
      if (!document.hidden && !quieto && vivo) cuadro = requestAnimationFrame(paso)
    }

    medir()
    if (quieto) pintar(0)
    else cuadro = requestAnimationFrame(paso)

    const ro = new ResizeObserver(() => {
      medir()
      if (quieto) pintar(0)
    })
    ro.observe(canvas)
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      vivo = false
      cancelAnimationFrame(cuadro)
      ro.disconnect()
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [])

  return <canvas ref={lienzo} className="lg-globo" aria-hidden="true" />
}
