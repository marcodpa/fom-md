import { distanciaLlegada, extraPorTrafico, horaLlegada, tiempoLlegada } from './herramientasMapbox'

// ============================================================
// LLEGADA (tarjeta sobre el mapa de Mapbox, para la unidad elegida)
// ------------------------------------------------------------
// Eliges un destino (un punto del mapa u otra unidad) y se ve cuánto tarda
// la unidad en llegar con el tráfico de ahora, a qué hora llega y por dónde.
// Mismo diseño que en la app. Sin «alcance» ni semáforo de tráfico (pedido
// de Marco, 21 oct 2026): la ruta va de un solo color.
// ============================================================

function IconoLlegada() {
  return (
    <svg className="mapa-herr-svg" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

function IconoDestino() {
  return (
    <svg className="mapa-herr-svg" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
    </svg>
  )
}

export default function HerramientasRuta({ unidad, estado, alElegirDestino, alCancelar, alQuitarLlegada }) {
  const { eligiendo, llegada, cargandoLlegada, errorLlegada } = estado
  const placa = unidad.placa || unidad.alias || 'Unidad'
  const conDestino = Boolean(llegada) && !eligiendo && !cargandoLlegada
  const extra = conDestino ? extraPorTrafico(llegada.minutos, llegada.minutosNormales) : null

  return (
    <section className="mapa-herr" aria-label={`Llegada de ${placa}`}>
      <header className="mapa-herr-cab">
        <i className="mapa-herr-ico"><IconoLlegada /></i>
        <div>
          <b>{placa}</b>
          <span>{conDestino ? 'Llegada con el tráfico de ahora' : '¿Cuánto tarda en llegar?'}</span>
        </div>
      </header>

      {eligiendo && (
        <>
          <p className="mapa-herr-eligiendo" role="status"><IconoDestino />Toca un punto del mapa o una unidad</p>
          <div className="mapa-herr-acciones">
            <button type="button" className="mapa-herr-btn2" onClick={alCancelar}>Cancelar</button>
          </div>
        </>
      )}

      {/* Mismo alto que el resultado: al llegar la ruta la tarjeta no salta. */}
      {!eligiendo && cargandoLlegada && (
        <>
          <div className="mapa-herr-cuerpo mapa-herr-skel" role="status" aria-label="Calculando la llegada">
            <i className="s-tiempo" />
            <i className="s-linea" />
            <i className="s-pie" />
          </div>
          <div className="mapa-herr-acciones mapa-herr-skel" aria-hidden="true">
            <i className="s-boton" />
          </div>
        </>
      )}

      {conDestino && (
        <>
          <div className="mapa-herr-cuerpo" role="status">
            <p className="mapa-herr-tiempo">
              <strong>{tiempoLlegada(llegada.minutos)}</strong>
              <span>llega a las {horaLlegada(llegada.minutos, llegada.calculadaEn)}</span>
            </p>
            <div className="mapa-herr-viaje" aria-label={`${distanciaLlegada(llegada.km)} desde ${placa} hasta ${llegada.destino?.nombre || 'Punto elegido'}`}>
              <div className="mapa-herr-trazo" aria-hidden="true">
                <i className="o" />
                <span><em>{distanciaLlegada(llegada.km)}</em></span>
                <i className="d" />
              </div>
              <div className="mapa-herr-puntos" aria-hidden="true">
                <span>{placa}</span>
                <span>{llegada.destino?.nombre || 'Punto elegido'}</span>
              </div>
            </div>
            {extra && <span className="mapa-herr-chip">+{tiempoLlegada(extra)} por tráfico</span>}
          </div>
          <div className="mapa-herr-acciones">
            <button type="button" className="mapa-herr-btn2" onClick={alElegirDestino}>Cambiar destino</button>
            <button type="button" className="mapa-herr-texto" onClick={alQuitarLlegada}>Quitar</button>
          </div>
        </>
      )}

      {!eligiendo && !cargandoLlegada && !llegada && (
        <>
          {errorLlegada && <p className="mapa-herr-error" role="alert">{errorLlegada}</p>}
          <div className="mapa-herr-acciones">
            <button type="button" className="mapa-herr-btn" onClick={alElegirDestino}>{errorLlegada ? 'Elegir otro destino' : 'Elegir destino'}</button>
          </div>
        </>
      )}
    </section>
  )
}
