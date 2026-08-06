import { Link } from 'react-router-dom'

// Pie de página completo: marca y estado, mapa del sitio en columnas,
// canales de contacto y línea legal. Es la última oportunidad de orientar
// a quien llegó hasta abajo sin decidirse.

const COLUMNAS = [
  {
    titulo: 'Plataforma',
    enlaces: [
      { t: 'Inicio', a: '/' },
      { t: 'La plataforma', a: '/plataforma' },
      { t: 'Funciones', a: '/funciones' },
      { t: 'Áreas y flota', a: '/areas' },
      { t: 'Seguridad', a: '/seguridad' },
    ],
  },
  {
    titulo: 'Recursos',
    enlaces: [
      { t: 'Preguntas frecuentes', a: '/preguntas-frecuentes' },
      { t: 'Solicitar demostración', a: '/contacto' },
      { t: 'Entrar al panel', a: '/entrar' },
      { t: 'La app del conductor', a: '/plataforma' },
    ],
  },
]

const Pin = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M12 2.4c-3.9 0-7 3.1-7 7 0 4.9 7 12.6 7 12.6s7-7.7 7-12.6c0-3.9-3.1-7-7-7Z"
      fill="url(#pie-mark)"
    />
    <circle cx="12" cy="9.3" r="2.4" fill="#0a1120" />
    <defs>
      <linearGradient id="pie-mark" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5cb0ff" />
        <stop offset="1" stopColor="#208aef" />
      </linearGradient>
    </defs>
  </svg>
)

const Ic = {
  correo: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7.5 8 6 8-6" />
    </svg>
  ),
  telefono: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 3.5h3l1.5 4-2 1.5a11.5 11.5 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />
    </svg>
  ),
  lugar: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-6.8 7-11a7 7 0 1 0-14 0c0 4.2 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  reloj: (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  ),
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        {/* Zona principal: marca + columnas */}
        <div className="footer-cuerpo">
          <div className="footer-marca">
            <a href="#top" className="footer-logo" aria-label="FOM, volver arriba">
              <Pin />
              <span>FOM</span>
            </a>
            <p className="footer-lema">
              Control y monitoreo de flotas por GPS para la Costa Oriental del Lago de
              Maracaibo. Un panel web para el supervisor, una app para el conductor,
              los mismos datos para todos.
            </p>
            <div className="footer-estado">
              <i aria-hidden="true" />
              Plataforma en línea · monitoreo 24/7
            </div>
          </div>

          {COLUMNAS.map((c) => (
            <nav className="footer-col" key={c.titulo} aria-label={c.titulo}>
              <span className="footer-col-titulo">{c.titulo}</span>
              {c.enlaces.map((e) => (
                <Link key={e.t} to={e.a}>
                  {e.t}
                </Link>
              ))}
            </nav>
          ))}

          <div className="footer-col" aria-label="Contacto">
            <span className="footer-col-titulo">Contacto</span>
            <a href="mailto:contacto@fom.app?subject=Consulta%20FOM" className="footer-dato">
              {Ic.correo}
              contacto@fom.app
            </a>
            <span className="footer-dato">
              {Ic.telefono}
              WhatsApp y llamadas, lunes a viernes
            </span>
            <span className="footer-dato">
              {Ic.reloj}
              8:00 a. m. a 5:00 p. m.
            </span>
            <span className="footer-dato">
              {Ic.lugar}
              Maracaibo · Cabimas · Ciudad Ojeda
            </span>
          </div>
        </div>

        {/* Línea inferior: legal y regreso */}
        <div className="footer-pie">
          <p>
            © 2026 FOM · Fleet Operations &amp; Maintenance. Demostración visual con
            datos simulados.
          </p>
          <div className="footer-pie-der">
            <span className="footer-nota">Hecho para operar en el Zulia</span>
            <a href="#top" className="footer-subir">
              Volver arriba
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
