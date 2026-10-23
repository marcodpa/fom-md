// Movimiento del puesto de monitores de la web v8 (EscenaMonitoresV8, T-142). Lo llama
// usarEscenaV8 (filtra «reducir movimiento» y limpia al desmontar). Solo transform, opacidad y un
// brillo corto (filter, solo en escritorio) mientras cada pantalla se abre.
//   Escritorio ≥ 1024 px, escena fija: los monitores llegan en fila y se cierran en arco hacia
//   quien mira; luego se encienden uno tras otro (centro, izquierda, derecha): línea de luz, la
//   pantalla se abre de la línea al alto completo y aparece su nombre.
//   Tableta: lo mismo, más suave y sin escena fija. Teléfono: sin arco (el del centro arriba y los
//   otros dos debajo); se encienden al pasar.
import { fondoV8, inicioCentradoV8 } from './piezasEscenaV8'

export function momentoMonitoresV8({ el, q, gsap, escritorio, telefono }) {
  const cols = q('.v8-mon-col')
  if (!cols.length) return
  const f = escritorio ? 1 : 0.6

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: escritorio
      ? { trigger: el, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true, start: inicioCentradoV8(el), end: '+=170%' }
      : { trigger: el, start: 'top 82%', end: telefono ? 'bottom 55%' : 'bottom 35%', scrub: 0.6 },
  })

  // 1 · El arco (no en el teléfono). Ningún borde pasa por delante del plano (fondoV8).
  if (!telefono) {
    cols.forEach(col => {
      const ap = col.querySelector('.v8-mon-aparato')
      const lado = col.classList.contains('is-izquierda') ? -1 : col.classList.contains('is-derecha') ? 1 : 0
      const giro = -lado * 20 * f
      gsap.set(ap, { transformPerspective: 1600, transformOrigin: '50% 50%' })
      tl.fromTo(ap, { rotationY: 0, xPercent: lado * 2, y: 30 * f, z: -40 * f }, {
        rotationY: giro, xPercent: -lado * 3 * f, y: 0, z: fondoV8(ap.offsetWidth || 400, 0, giro) - (lado ? 30 * f : 0),
        duration: 1, ease: 'power2.inOut',
      }, 0)
    })
  }

  // 2 · Se encienden por turno (data-orden).
  const turnos = [...cols].sort((a, b) => Number(a.dataset.orden) - Number(b.dataset.orden))
  const inicios = escritorio ? [0.8, 1.35, 1.8] : telefono ? [0.05, 0.45, 0.6] : [0.45, 0.8, 1.05]
  turnos.forEach((col, i) => {
    const toma = col.querySelector('.v8-mon-toma')
    const linea = col.querySelector('.v8-mon-linea')
    const nombre = col.querySelector('.v8-mon-nombre')
    const t = inicios[i] ?? inicios[inicios.length - 1] + i * 0.3
    tl.fromTo(linea, { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.14, ease: 'power2.out' }, t)
    tl.fromTo(toma, { opacity: 0, scaleY: 0.006, ...(escritorio ? { filter: 'brightness(2.2)' } : null) },
      { opacity: 1, scaleY: 1, ...(escritorio ? { filter: 'brightness(1)' } : null), duration: 0.3, ease: 'power3.out' }, t + 0.12)
    tl.to(linea, { opacity: 0, duration: 0.08 }, t + 0.17)
    tl.fromTo(nombre, { opacity: 0 }, { opacity: 1, duration: 0.2 }, t + 0.2)
  })

  // Pausa corta al final, antes de soltar la escena.
  if (escritorio) tl.to({}, { duration: 0.35 })
}
