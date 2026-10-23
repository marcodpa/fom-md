// Movimiento de «En la cabina» (EscenaTableroV8, T-142). Lo llama usarEscenaV8 (filtra «reducir
// movimiento» y limpia al desmontar). Solo transform y opacidad. Sin escena fija: todo va atado al
// paso de la escena por la pantalla.
//   - La carretera «avanza»: la foto se acerca despacio hacia el fondo de la vía (de 1 a 1,06; la
//     foto es de 1920 px y nunca pasa de su tamaño real).
//   - El teléfono llega girado, se asienta en su soporte y se mece apenas, como en marcha.
//   - Su pantalla se desplaza sola (Mi unidad → el mapa de su unidad), igual que los teléfonos.
import { fondoV8 } from './piezasEscenaV8'

export function momentoTableroV8({ el, q, gsap, escritorio, telefono }) {
  const foto = q('.v8-tab-foto')[0]
  const tel = q('.v8-tab-tel')[0]
  if (!foto || !tel) return
  const f = escritorio ? 1 : telefono ? 0.5 : 0.7

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 15%', scrub: 0.7 },
  })

  tl.fromTo(foto, { scale: 1 }, { scale: 1.06, duration: 1 }, 0)

  // El teléfono: llega girado y queda mirando un poco hacia el conductor (ningún borde se acerca).
  const ancho = tel.offsetWidth || 220
  const alto = tel.offsetHeight || 480
  const entra = -20 * f, queda = -7 * f
  gsap.set(tel, { transformPerspective: 1400, transformOrigin: '50% 100%' })
  tl.fromTo(tel, { rotationY: entra, rotationX: 8 * f, y: 90 * f, z: fondoV8(ancho, alto, entra, 8 * f) - 30 * f },
    { rotationY: queda, rotationX: 0, y: 0, z: fondoV8(ancho, 0, queda, 0), duration: 0.42, ease: 'power2.out' }, 0)
  // Vaivén leve de la marcha (solo el giro en el plano).
  tl.to(tel, { keyframes: [{ rotationZ: -1.2 * f }, { rotationZ: 0.9 * f }, { rotationZ: -0.6 * f }, { rotationZ: 0 }], duration: 0.58, ease: 'sine.inOut' }, 0.42)

  // La pantalla larga se desplaza (como hace momentoTelefonosV8 con .v8-pantalla-rollo).
  const rollo = tel.querySelector('.v8-pantalla-rollo')
  if (rollo) {
    const recorrido = parseFloat(rollo.dataset.v8Recorrido) || 0
    tl.fromTo(rollo, { yPercent: 0 }, { yPercent: -recorrido, duration: 0.5 }, 0.3)
    const funde = tel.querySelector('.v8-pantalla-funde')
    if (funde) tl.fromTo(funde, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.3)
  }
}
