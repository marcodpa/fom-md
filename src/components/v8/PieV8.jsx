// Formulario de demostración y pie de la web v8.
// El formulario hace lo mismo que el actual (MarketingSections/ContactForm): arma el correo
// con los datos y abre la aplicación de correo hacia contacto@fom.app. No envía nada solo.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogoV8 } from './MarcaV8'
import { GRUPOS_V8, INICIO_V8, DEMO_V8 } from './NavV8'

export function FormularioV8() {
  const [listo, setListo] = useState(false)
  const enviar = e => {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const cuerpo = ['Solicitud de demostración FOM', ...['Nombre', 'Empresa', 'Correo', 'Flota', 'Mensaje'].map(k => `${k}: ${datos.get(k) || 'No indicado'}`)].join('\n')
    window.location.href = `mailto:contacto@fom.app?subject=${encodeURIComponent('Solicitud de demostración FOM')}&body=${encodeURIComponent(cuerpo)}`
    setListo(true)
  }
  return <form id="solicitud-demo" className="v8-form" onSubmit={enviar}>
    <div className="v8-form-row">
      <label>Nombre<input name="Nombre" autoComplete="name" required maxLength={120} /></label>
      <label>Empresa<input name="Empresa" autoComplete="organization" required maxLength={160} /></label>
    </div>
    <div className="v8-form-row">
      <label>Correo<input name="Correo" type="email" autoComplete="email" required maxLength={200} /></label>
      <label>Tamaño de la flota<select name="Flota" defaultValue="" required><option value="" disabled>Selecciona una opción</option><option>1 a 10 unidades</option><option>11 a 50 unidades</option><option>51 a 100 unidades</option><option>Más de 100 unidades</option></select></label>
    </div>
    <label>Cuéntanos qué necesitas<textarea name="Mensaje" rows={3} maxLength={2000} /></label>
    <button className="v8-pill v8-pill-lg" type="submit">Preparar solicitud por correo</button>
    <small>Se abrirá tu aplicación de correo para que revises y envíes la solicitud.</small>
    {listo && <p role="status">Solicitud preparada. Envíala desde tu aplicación de correo. También puedes escribir a <a href="mailto:contacto@fom.app">contacto@fom.app</a>.</p>}
  </form>
}

export function PieV8() {
  return <footer className="v8-footer">
    <div className="v8-footer-inner">
      <div className="v8-footer-brand">
        <Link to={INICIO_V8} aria-label="FOM, inicio"><LogoV8 /></Link>
        <p>Fleet Operations &amp; Maintenance</p>
        <p className="v8-footer-note">La oficina y la carretera, conectadas.</p>
      </div>
      {GRUPOS_V8.map(g => <nav key={g.id} aria-label={g.nombre}>
        <h2>{g.nombre}</h2>
        <ul>{g.links.map(([to, nombre]) => <li key={to}><Link to={to}>{nombre}</Link></li>)}</ul>
      </nav>)}
      <nav aria-label="Contacto">
        <h2>Contacto</h2>
        <ul>
          <li><Link to={DEMO_V8}>Solicitar una demostración</Link></li>
          <li><a href="mailto:contacto@fom.app">contacto@fom.app</a></li>
          <li><Link to="/contacto">Página de contacto</Link></li>
          <li><Link to="/entrar">Iniciar sesión</Link></li>
        </ul>
      </nav>
    </div>
    <div className="v8-footer-legal">
      <small>© {new Date().getFullYear()} FOM. Todos los derechos reservados.</small>
      <small>Flotas que mantienen el mundo en movimiento.</small>
    </div>
  </footer>
}
