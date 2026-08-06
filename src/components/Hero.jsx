import { PhoneFrame, ScreenInicio } from './PhoneMockup'

export default function Hero() {
  return (
    <section className="section hero" id="presentacion">
      <div className="container hero-grid">
        <div>
          <div className="section-tag" data-reveal>
            Fleet Operations &amp; Maintenance
          </div>
          <h2 className="hero-title" data-reveal>
            Observa tu operación completa <em>en tiempo real.</em>
          </h2>
          <p className="hero-text" data-reveal>
            Organiza tus vehículos por empresa, área y conductor. Un panel web para
            supervisar desde la computadora y una app para el conductor en la calle:
            estados, recorridos, inspecciones, órdenes de trabajo y alertas sobre los
            mismos datos.
          </p>
          <div className="hero-actions" data-reveal>
            <a href="#contacto" className="btn btn-primary">
              Solicitar demostración
              <span className="btn-ic" aria-hidden="true">
                ↗
              </span>
            </a>
            <a href="#plataforma" className="btn btn-ghost">
              Explorar la app
            </a>
          </div>
          <ul className="hero-trust" data-reveal aria-label="Garantías de seguridad">
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Datos cifrados
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
              Tu flota siempre a la vista
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              Cada unidad bajo control
            </li>
          </ul>
        </div>

        <div className="hero-phone" data-reveal>
          <PhoneFrame>
            <ScreenInicio />
          </PhoneFrame>
        </div>
      </div>
    </section>
  )
}
