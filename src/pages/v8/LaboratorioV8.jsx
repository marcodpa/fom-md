// Laboratorio de la web v8 (T-142): página oculta (/nuevo/laboratorio, sin enlace en el menú y con
// «noindex») para que Marco vea las escenas interactivas nuevas antes de ponerlas en una página.
// Cada escena va sola, una tras otra, sobre el mismo fondo de la web (sin cajas ni calles).
// No usa useMomentoV8: cada escena trae su propio movimiento (escenasExtraV8.js).
import { useEffect } from 'react'
import { SitioV8, SeccionV8, ContenedorV8, EncabezadoV8 } from '../../components/v8'
import { EscenaTelevisorV8, EscenaMonitoresV8, EscenaAlertaV8, EscenaTableroV8 } from '../../components/v8/escenasExtraV8'

function useNoIndexar() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}

export default function LaboratorioV8() {
  useNoIndexar()
  return <SitioV8 titulo="Laboratorio de escenas — FOM" descripcion="Escenas interactivas de la web FOM en prueba.">
    <section className="v8-hero" aria-labelledby="v8-titulo">
      <ContenedorV8>
        <p className="v8-kick">Laboratorio</p>
        <h1 id="v8-titulo" className="v8-h1">Escenas nuevas, en prueba.</h1>
        <p className="v8-lead" style={{ maxWidth: 640 }}>
          Cuatro escenas con capturas reales del panel y de la app. Baja despacio: cada una se mueve con el scroll.
        </p>
      </ContenedorV8>
    </section>

    <SeccionV8 id="televisor" aria-labelledby="lab-tv">
      <ContenedorV8>
        <EncabezadoV8 centro aparece={false} id="lab-tv" kicker="Centro de control"
          titulo={['Se enciende la pantalla,', 'aparece tu flota.']} anchoBajada={620}
          bajada="Abre el panel y FOM te muestra cada unidad en el mapa, con su estado. El mapa se actualiza cada 15 segundos." />
        <EscenaTelevisorV8 />
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="monitores" aria-labelledby="lab-mon">
      <ContenedorV8>
        <EncabezadoV8 centro aparece={false} id="lab-mon" kicker="Oficina de operaciones"
          titulo={['Un puesto,', 'toda la operación.']} anchoBajada={620}
          bajada="Resumen, Centro de control y Mantenimiento, cada uno en su pantalla." />
      </ContenedorV8>
      <EscenaMonitoresV8 />
    </SeccionV8>

    <SeccionV8 id="alerta" aria-labelledby="lab-al">
      <ContenedorV8>
        <EncabezadoV8 centro aparece={false} id="lab-al" kicker="Alertas"
          titulo={['El aviso llega a la oficina', 'y al teléfono.']} anchoBajada={640}
          bajada="Cuando una unidad pasa el límite de velocidad, el aviso aparece en el panel y en la app del supervisor." />
        <EscenaAlertaV8 />
      </ContenedorV8>
    </SeccionV8>

    <SeccionV8 id="cabina" aria-labelledby="lab-cab">
      <ContenedorV8>
        <EncabezadoV8 centro aparece={false} id="lab-cab" kicker="App del conductor"
          titulo={['En la cabina,', 'la app va con él.']} anchoBajada={620}
          bajada="Su unidad, la señal y su índice de manejo, y el mapa con la unidad asignada, en el teléfono del conductor." />
        <EscenaTableroV8 />
      </ContenedorV8>
    </SeccionV8>
  </SitioV8>
}
