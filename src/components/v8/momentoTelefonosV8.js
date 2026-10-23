// Movimiento de los teléfonos de la web v8 (lo llama useMomentoV8, que ya filtra «reducir
// movimiento» y limpia todo al desmontar). Solo transform y opacidad.
//  - escenasTelefonosV8: EscenaTelefonosV8 ([data-v8-tels]). Escritorio: escena fija; primero se
//    desplaza la pantalla de cada teléfono, luego se inclinan en 3D hacia lados opuestos y se
//    separan. Tableta y teléfono: lo mismo, más suave y sin
//    escena fija, mientras la escena cruza la pantalla.
//  - telefonoSueltoV8: los teléfonos sueltos (CapturaFlotanteV8 de la app): inclinación 3D suave
//    atada al scroll y, si la captura tiene continuación, la pantalla que se desplaza.
// Regla de siempre: ningún giro acerca el teléfono. Cada giro lleva un translateZ negativo que
// deja el borde más cercano por detrás del plano (la captura nunca se ve más grande que su tamaño).

const RAD = Math.PI / 180

// Profundidad que compensa un giro (Y sobre el ancho, X sobre el alto) para que nada se acerque.
const fondo = (ancho, alto, giroY, giroX) =>
  -(ancho / 2 * Math.sin(Math.abs(giroY) * RAD) + alto / 2 * Math.sin(Math.abs(giroX) * RAD)) - 6

// Rollo de una pantalla larga (PantallaTelefonoV8): sube su recorrido entre `desde` y `desde + dur`
// de la línea de tiempo; el fundido entre dos pantallas aparece al empezar a subir.
function desplazarPantalla(tl, el, desde, dur) {
  const rollo = el.querySelector('.v8-pantalla-rollo')
  if (!rollo) return
  const recorrido = parseFloat(rollo.dataset.v8Recorrido) || 0
  tl.fromTo(rollo, { yPercent: 0 }, { yPercent: -recorrido, ease: 'none', duration: dur }, desde)
  const funde = el.querySelector('.v8-pantalla-funde')
  if (funde) tl.fromTo(funde, { opacity: 0 }, { opacity: 1, ease: 'none', duration: dur * 0.1 }, desde)
}

// Escena de teléfonos. `f` = 1 en escritorio, 0,55 en tableta y teléfono (como la base).
export function escenasTelefonosV8({ q, gsap, escritorio, f }) {
  q('[data-v8-tels]').forEach(escena => {
    const tels = [...escena.querySelectorAll('.v8-tels-tel')]
    if (!tels.length) return
    const n = tels.length
    const barra = 90 // barra global flotante (14 + 64) y un respiro

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: escritorio
        ? {
          trigger: escena, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
          end: '+=170%',
          // Centrada en el espacio libre bajo la barra; si no cabe, fija por arriba.
          start: () => {
            const libre = window.innerHeight - barra
            const alto = escena.offsetHeight
            return alto < libre ? `top ${Math.round(barra + (libre - alto) / 2)}px` : `top ${barra}px`
          },
        }
        : { trigger: escena, start: 'top 85%', end: 'bottom 10%', scrub: 0.6 },
    })

    // 1 · La pantalla de cada teléfono se desplaza (el segundo un poco después, como dos personas).
    const ritmo = escritorio ? 1 : 0.8
    tels.forEach((tel, i) => desplazarPantalla(tl, tel, i * 0.14, ritmo))

    // 2 · Se inclinan en 3D hacia lados opuestos y se separan; el del centro (con tres) sube.
    const desde = escritorio ? 0.9 : 0.35
    tels.forEach((tel, i) => {
      const lado = n === 1 ? 0 : (i / (n - 1)) * 2 - 1 // -1 izquierda · 0 centro · 1 derecha
      const giroY = 24 * lado * f
      const giroX = (lado === 0 ? 12 : 7) * f
      const ancho = tel.offsetWidth || 280
      const alto = tel.offsetHeight || 600
      gsap.set(tel, { transformPerspective: 1500, transformOrigin: '50% 50%' })
      tl.fromTo(tel, { xPercent: 0, yPercent: 0, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0 }, {
        rotationY: giroY,
        rotationX: giroX,
        rotationZ: -9 * lado * f,
        xPercent: 7 * lado * f,
        // El izquierdo baja y el derecho sube; el del centro sube un poco.
        yPercent: (lado === 0 ? -4 : -7 * lado) * f,
        z: fondo(ancho, alto, giroY, giroX) - 20 * f,
        duration: 1,
      }, desde + Math.abs(lado) * 0.05)
    })

    // Tramo vacío con la duración que tenía la cinta (T-139, ya no está): el reparto del scroll y
    // el movimiento de los teléfonos quedan exactamente como antes.
    tl.to({}, { duration: desde + 1.15 }, 0)
    // Pausa corta al final, antes de soltar la escena.
    if (escritorio) tl.to({}, { duration: 0.25 })
  })
}

// Teléfono suelto: entra girado, queda de frente al centro de la pantalla y sigue girando un poco
// al salir; si la captura tiene continuación, la pantalla se desplaza mientras pasa.
export function telefonoSueltoV8({ gsap, el, f }) {
  const ancho = el.offsetWidth || 240
  const alto = el.offsetHeight || 520
  const entraY = -18 * f, entraX = 7 * f
  const saleY = 9 * f, saleX = -5 * f
  gsap.set(el, { transformPerspective: 1800, transformOrigin: '50% 50%' })
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.9 },
  })
  tl.fromTo(el, { rotationY: entraY, rotationX: entraX, rotationZ: -2.5 * f, y: 60 * f, z: fondo(ancho, alto, entraY, entraX) - 60 * f },
    { rotationY: 0, rotationX: 0, rotationZ: 0, y: 0, z: 0, duration: 0.45 }, 0)
    .to(el, { rotationY: saleY, rotationX: saleX, rotationZ: 1.5 * f, y: -30 * f, z: fondo(ancho, alto, saleY, saleX), duration: 0.55 }, 0.45)
  desplazarPantalla(tl, el, 0.28, 0.5)
}
