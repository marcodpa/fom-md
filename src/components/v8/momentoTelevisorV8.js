// Movimiento del televisor de la web v8 (EscenaTelevisorV8, T-142). Lo llama usarEscenaV8, que ya
// filtra «reducir movimiento» y limpia todo al desmontar. Solo transform, opacidad y un brillo
// corto (filter) mientras la pantalla se abre.
//
// Dos piezas:
//  1. ENCENDIDO (con tiempo, no atado al scroll): cuando el televisor llega a su sitio, el piloto
//     pasa a azul, una línea de luz se abre de lado a lado, destello suave, la pantalla de carga de
//     FOM (flechas una tras otra, «FOM» letra a letra, lema, barra; una luz corre por las flechas)
//     y luego el panel real. Si se vuelve a subir, se apaga rápido (y se enciende otra vez al bajar).
//  2. RECORRIDO (atado al scroll): escritorio ≥ 1024 px con escena fija; el televisor sube de un
//     giro leve a quedar de frente; con la pantalla viva, el mapa se mueve despacio (y laten las
//     unidades) y al final se abre una unidad (Z69FC7W, la misma captura real del panel).
//     Tableta y teléfono: sin escena fija, más suave, mientras el televisor cruza la pantalla.
import { fondoV8, inicioCentradoV8 } from './piezasEscenaV8'

export function momentoTelevisorV8({ el, q, gsap, escritorio }) {
  const aparato = q('.v8-tv-aparato')[0]
  const panel = q('.v8-tv-panel')[0]
  const carga = q('.v8-tv-carga')[0]
  const linea = q('.v8-tv-linea')[0]
  const destello = q('.v8-tv-destello')[0]
  const led = q('.v8-tv-led b')[0]
  const mapa = q('.v8-tv-toma.is-mapa')[0]
  const unidad = q('.v8-tv-toma.is-unidad')[0]
  const flechas = q('.v8-tv-flechas path')
  const letras = q('.v8-tv-nombre span')
  const resto = q('.v8-tv-lema, .v8-tv-barra, .v8-tv-estado')
  if (!aparato || !panel || !carga) return

  // Apagado: pantalla negra con su reflejo y el piloto rojo tenue.
  gsap.set([panel, carga, linea, destello, led], { opacity: 0 })

  // 1 · Encendido.
  const on = gsap.timeline({
    paused: true,
    onComplete: () => el.classList.add('is-viva'),
    onReverseComplete: () => el.classList.remove('is-cargando'),
  })
  on.call(() => el.classList.add('is-cargando'), null, 0.3)
    .to(led, { opacity: 1, duration: 0.25, ease: 'power1.out' }, 0)
    .fromTo(linea, { opacity: 1, scaleX: 0 }, { scaleX: 1, duration: 0.34, ease: 'power3.out' }, 0.1)
    .fromTo(carga, { opacity: 1, scaleY: 0.004, filter: 'brightness(2.4)' },
      { scaleY: 1, filter: 'brightness(1)', duration: 0.55, ease: 'expo.out' }, 0.42)
    .to(linea, { opacity: 0, duration: 0.18 }, 0.46)
    .to(destello, { opacity: 0.5, duration: 0.07, ease: 'none' }, 0.42)
    .to(destello, { opacity: 0, duration: 0.7, ease: 'power2.out' }, 0.49)
    // La marca, como en CargaFom: flechas, letras, lema, barra y estado.
    .from(flechas, { opacity: 0, xPercent: -28, scale: 0.9, duration: 0.5, stagger: 0.12, ease: 'power3.out' }, 0.6)
    .from(letras, { opacity: 0, yPercent: 24, duration: 0.42, stagger: 0.08, ease: 'power3.out' }, 1.0)
    .from(resto, { opacity: 0, duration: 0.45, stagger: 0.08, ease: 'power1.out' }, 1.3)
    // La luz corre por las flechas hacia adelante: la marca «avanza».
    .to(flechas, {
      keyframes: [{ opacity: 0.38, xPercent: -3, duration: 0.22 }, { opacity: 1, xPercent: 4, duration: 0.2 }, { xPercent: 0, duration: 0.22 }],
      stagger: 0.12, ease: 'sine.inOut',
    }, 1.75)
    // Y entra el panel.
    .to(carga, { opacity: 0, duration: 0.55, ease: 'power2.inOut' }, 2.6)
    .fromTo(panel, { opacity: 0, scale: 1.015 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, 2.6)
    .call(() => el.classList.remove('is-cargando'), null, 3.2)

  let encendida = false
  const encender = () => { if (encendida) return; encendida = true; on.timeScale(1).play() }
  const apagar = () => {
    if (!encendida) return
    encendida = false
    el.classList.remove('is-viva', 'is-cargando')
    on.timeScale(3).reverse()
  }

  // 2 · Recorrido.
  const f = escritorio ? 1 : 0.6
  const ancho = aparato.offsetWidth || 900
  const alto = aparato.offsetHeight || 600
  const giroX = 13 * f
  gsap.set(aparato, { transformPerspective: 2200, transformOrigin: '50% 100%' })

  const UMBRAL = escritorio ? 0.24 : 0.18
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: escritorio
      ? {
        trigger: el, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
        start: inicioCentradoV8(el), end: '+=190%',
        onUpdate: s => (s.progress >= UMBRAL ? encender() : s.progress < UMBRAL * 0.6 && apagar()),
      }
      : {
        trigger: el, start: 'top 85%', end: 'bottom 15%', scrub: 0.6,
        // En tableta y teléfono se enciende una vez y se queda encendido.
        onUpdate: s => s.progress >= UMBRAL && encender(),
      },
  })

  // El televisor sube de un giro leve a quedar de frente (el borde de abajo nunca se acerca).
  tl.fromTo(aparato, { rotationX: giroX, y: 50 * f, z: fondoV8(ancho, alto * 2, 0, giroX) - 40 * f },
    { rotationX: 0, y: 0, z: 0, duration: 1, ease: 'power2.out' }, 0)
  // Con la pantalla viva: el mapa se mueve despacio (la captura es de 2880 px: nunca pasa de su
  // tamaño real) y al final se abre una unidad.
  tl.fromTo(mapa, { scale: 1, xPercent: 0, yPercent: 0 }, { scale: 1.06, xPercent: -1.5, yPercent: 1, duration: 1.5 }, 1.05)
  tl.to(mapa, { opacity: 0, duration: 0.35 }, 2.35)
  tl.fromTo(unidad, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' }, 2.35)
  // Un giro muy leve mientras se mira, para que el televisor no quede «pegado».
  if (escritorio) {
    tl.fromTo(aparato, { rotationY: 0 }, { rotationY: -3, z: fondoV8(ancho, 0, 3, 0), duration: 1.9 }, 1.05)
    tl.to({}, { duration: 0.35 })
  }

  return () => { on.kill(); el.classList.remove('is-viva', 'is-cargando') }
}
