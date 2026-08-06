import {
  PhoneFrame,
  ScreenInicio,
  ScreenInspeccion,
  ScreenMantenimiento,
} from './PhoneMockup'

// Showcase de la app del conductor. Vive aparte porque lo usan tanto la home
// como la página dedicada /plataforma.
export default function PlatformShowcase() {
  return (
    <section className="section dash-section" id="plataforma">
      <div className="container">
        <header className="sec-head" data-reveal>
          <div className="sec-kicker">La app</div>
          <h2>FOM-DRIVER: la operación en el bolsillo del conductor.</h2>
          <p>
            Mapa en vivo con telemetría, inspección diaria que bloquea salidas
            inseguras y órdenes de trabajo con su ciclo completo. Pantallas de la
            app con datos simulados.
          </p>
        </header>
        <div className="phones-row" data-reveal>
          <div className="phone-col">
            <PhoneFrame>
              <ScreenInspeccion />
            </PhoneFrame>
            <div className="phone-caption">
              <b>Inspección diaria</b>
              <span>Conforme · Observación · Falla</span>
            </div>
          </div>
          <div className="phone-col">
            <PhoneFrame>
              <ScreenInicio />
            </PhoneFrame>
            <div className="phone-caption">
              <b>Mapa en vivo</b>
              <span>Telemetría e índice de manejo seguro</span>
            </div>
          </div>
          <div className="phone-col">
            <PhoneFrame>
              <ScreenMantenimiento />
            </PhoneFrame>
            <div className="phone-caption">
              <b>Mantenimiento</b>
              <span>ODTs, alertas y documentos</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
