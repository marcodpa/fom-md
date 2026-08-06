export default function CTA() {
  return (
    <section className="section" id="contacto">
      <div className="container">
        <div className="cta-panel" data-reveal>
          <div className="cta-grid-lines" aria-hidden="true" />
          <h2 className="cta-title">
            <span>Tu flota en movimiento.</span>
            <span className="accent">Tu operación bajo control.</span>
          </h2>
          <p className="cta-sub">
            Tranquilidad de saber dónde está cada vehículo, que tus conductores están
            seguros y que todo marcha bien — 24/7, desde una sola plataforma.
          </p>
          <a href="mailto:contacto@fom.app?subject=Solicitud%20de%20demostraci%C3%B3n%20FOM" className="btn btn-primary">
            Solicitar demostración
            <span className="btn-ic" aria-hidden="true">
              ↗
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}
