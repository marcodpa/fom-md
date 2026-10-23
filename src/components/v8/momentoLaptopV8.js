// Movimiento de la escena de laptop de la web v8 (T-141). Lo llama useMomentoV8, que ya filtra
// «reducir movimiento» (entonces la laptop queda abierta y quieta, como la deja el CSS) y limpia
// todo al desmontar. Solo transform y opacidad.
//  - Escritorio ≥ 1024 px: la escena se queda fija bajo la barra; la tapa gira desde cerrada hasta
//    abierta mientras el conjunto pasa de verse desde arriba a verse de frente; la pantalla se
//    enciende con la captura real y, si hay una segunda, cambia a ella; al final se suelta.
//  - Tableta y teléfono: sin escena fija; la tapa llega casi abierta y termina de abrirse al pasar.
// Regla de siempre: la pantalla abierta queda de frente y a la profundidad de la bisagra (el giro
// de la tapa compensa el del conjunto), así la captura nunca se ve más grande que su tamaño.

const BARRA = 90 // barra global flotante (14 + 64) y un respiro

const grados = (el, prop, def) => parseFloat(getComputedStyle(el).getPropertyValue(prop)) || def

export function escenasLaptopV8({ q, gsap, escritorio }) {
  q('[data-v8-laptop]').forEach(escena => {
    const equipo = escena.querySelector('.v8-lap-equipo')
    const tapa = escena.querySelector('.v8-lap-tapa')
    if (!equipo || !tapa) return
    const apagada = escena.querySelector('.v8-lap-apagada')
    const reflejo = escena.querySelector('.v8-lap-reflejo')
    const sigue = escena.querySelector('.v8-lap-capa.is-sigue')
    const incl = grados(escena, '--v8-lap-incl', -14)
    const abre = grados(escena, '--v8-lap-abre', 14)

    // Cerrada (escritorio) o casi abierta (tableta y teléfono).
    // Cerrada, la tapa queda tumbada sobre la base: el conjunto sube para que la laptop quede
    // centrada en la escena y baja a su sitio mientras se abre.
    const altoTapa = tapa.offsetHeight || 500
    const desde = escritorio
      ? { tapa: -90, incl: incl - 24, y: -altoTapa * 0.42 }
      : { tapa: -38, incl: incl - 8, y: -altoTapa * 0.12 }

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: escritorio
        ? {
          trigger: escena, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
          end: sigue ? '+=160%' : '+=110%',
          // Centrada en el espacio libre bajo la barra; si no cabe, fija por arriba.
          start: () => {
            const libre = window.innerHeight - BARRA
            const alto = escena.offsetHeight
            return alto < libre ? `top ${Math.round(BARRA + (libre - alto) / 2)}px` : `top ${BARRA}px`
          },
        }
        : { trigger: escena, start: 'top 90%', end: 'center 50%', scrub: 0.6 },
    })

    // 1 · La tapa se abre y el conjunto pasa de verse desde arriba a verse de frente.
    tl.fromTo(tapa, { rotationX: desde.tapa }, { rotationX: abre, duration: 1, ease: 'power1.inOut' }, 0)
    tl.fromTo(equipo, { rotationX: desde.incl, y: desde.y }, { rotationX: incl, y: 0, duration: 1, ease: 'power1.inOut' }, 0)

    // 2 · La pantalla se enciende cuando la tapa ya va a medio abrir; el reflejo del vidrio se va.
    if (apagada) tl.fromTo(apagada, { opacity: 1 }, { opacity: 0, duration: 0.35 }, 0.55)
    if (reflejo) tl.fromTo(reflejo, { opacity: 1 }, { opacity: 0, duration: 0.5 }, 0.6)

    // 3 · (Escritorio) Con la laptop abierta, la pantalla pasa a la segunda captura, que sube un
    //     poco al entrar, como al navegar el panel. Pausa corta antes de soltar la escena.
    if (escritorio && sigue) {
      tl.fromTo(sigue, { opacity: 0, yPercent: 4 }, { opacity: 1, yPercent: 0, duration: 0.45, ease: 'power2.out' }, 1.25)
      tl.to({}, { duration: 0.3 })
    } else if (escritorio) {
      tl.to({}, { duration: 0.25 })
    }
  })
}
