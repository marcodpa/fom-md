// Movimiento de «El aviso llega» (EscenaAlertaV8, T-142). Lo llama usarEscenaV8 (filtra «reducir
// movimiento» y limpia al desmontar). Solo transform y opacidad.
//   1. El portátil y el teléfono llegan de un giro leve a quedar de frente.
//   2. Se marca el aviso en el panel (anillo que late una vez).
//   3. Una señal viaja por una curva punteada del panel al teléfono (chispa con estela).
//   4. El teléfono vibra (solo al bajar) y se marca el mismo aviso en la app.
// Escritorio ≥ 1024 px con escena fija; tableta y teléfono sin pin, atado al paso de la escena.
import { fondoV8, inicioCentradoV8, puntoV8 } from './piezasEscenaV8'

export function momentoAlertaV8({ el, q, gsap, escritorio }) {
  const grupo = q('.v8-al-grupo')[0]
  const portatil = q('.v8-al-portatil')[0]
  const tel = q('.v8-al-tel')[0]
  const [marcaPanel, marcaApp] = q('.v8-al-marca')
  const ruta = q('.v8-al-ruta')[0]
  const chispas = q('.v8-al-chispa')
  if (!grupo || !portatil || !tel || !marcaPanel || !marcaApp || !ruta) return
  const f = escritorio ? 1 : 0.6

  // Curva del extremo derecho de la fila del panel al extremo izquierdo de la fila de la app
  // (medida sin transform; se vuelve a medir en cada refresh).
  let a, b, c
  const medir = () => {
    a = puntoV8(marcaPanel, grupo, 0.97, 0.5)
    b = puntoV8(marcaApp, grupo, 0.03, 0.5)
    const vertical = Math.abs(b.y - a.y) > Math.abs(b.x - a.x)
    c = vertical
      ? { x: Math.max(a.x, b.x) + 30, y: (a.y + b.y) / 2 }
      : { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - Math.abs(b.x - a.x) * 0.45 - 20 }
    ruta.setAttribute('d', `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`)
  }
  medir()
  const enCurva = t => {
    const u = 1 - t
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
  }
  const viaje = { t: 0 }
  const pintar = () => chispas.forEach((ch, i) => {
    const p = enCurva(Math.max(0, Math.min(1, viaje.t - i * 0.07)))
    gsap.set(ch, { x: p.x, y: p.y })
  })
  pintar()

  // Estado inicial: sin marcas ni señal.
  gsap.set([marcaPanel, marcaApp], { opacity: 0 })
  gsap.set(chispas, { opacity: 0 })

  // Vibración del teléfono (con tiempo, solo al bajar).
  const vibrar = () => gsap.fromTo(tel, { rotationZ: 0, x: 0 }, {
    keyframes: [{ rotationZ: -2, x: -3 }, { rotationZ: 2, x: 3 }, { rotationZ: -1.5, x: -2 }, { rotationZ: 1, x: 1.5 }, { rotationZ: 0, x: 0 }],
    duration: 0.42, ease: 'sine.inOut', overwrite: 'auto',
  })

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: escritorio
      ? { trigger: el, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true, start: inicioCentradoV8(el), end: '+=170%', onRefresh: () => { medir(); pintar() } }
      : { trigger: el, start: 'top 80%', end: 'bottom 30%', scrub: 0.6, onRefresh: () => { medir(); pintar() } },
  })

  // 1 · Llegan de un giro leve (nada se acerca: z negativo).
  const giroP = 12 * f, giroT = -16 * f
  gsap.set(portatil, { transformPerspective: 1800, transformOrigin: '50% 100%' })
  gsap.set(tel, { transformPerspective: 1400, transformOrigin: '50% 50%' })
  tl.fromTo(portatil, { rotationY: giroP, xPercent: -3 * f, z: fondoV8(portatil.offsetWidth, 0, giroP) - 30 * f },
    { rotationY: 0, xPercent: 0, z: 0, duration: 1, ease: 'power2.out' }, 0)
  tl.fromTo(tel, { rotationY: giroT, y: 60 * f, z: fondoV8(tel.offsetWidth, 0, giroT) - 30 * f },
    { rotationY: 0, y: 0, z: 0, duration: 1, ease: 'power2.out' }, 0.06)

  // 2 · El aviso en el panel.
  const anillo = m => m.querySelector('b')
  tl.to(marcaPanel, { opacity: 1, duration: 0.2 }, 1.0)
  tl.fromTo(anillo(marcaPanel), { opacity: 0.9, scale: 1 }, { opacity: 0, scale: 1.04, duration: 0.4, ease: 'power2.out' }, 1.05)

  // 3 · La señal viaja.
  tl.to(ruta, { opacity: 0.6, duration: 0.18 }, 1.3)
  tl.to(chispas, { opacity: (i) => [1, 0.6, 0.3][i] ?? 0.3, duration: 0.08 }, 1.36)
  tl.to(viaje, { t: 1.14, duration: 0.75, ease: 'power1.inOut', onUpdate: pintar }, 1.36)
  tl.to(chispas, { opacity: 0, duration: 0.1 }, 2.08)

  // 4 · Llega: vibra y se marca el mismo aviso en la app.
  tl.call(() => { if (tl.scrollTrigger?.direction !== -1) vibrar() }, null, 2.1)
  tl.to(marcaApp, { opacity: 1, duration: 0.2 }, 2.12)
  tl.fromTo(anillo(marcaApp), { opacity: 0.9, scale: 1 }, { opacity: 0, scale: 1.05, duration: 0.4, ease: 'power2.out' }, 2.15)
  tl.to(ruta, { opacity: 0.22, duration: 0.25 }, 2.3)

  if (escritorio) tl.to({}, { duration: 0.35 })
}
