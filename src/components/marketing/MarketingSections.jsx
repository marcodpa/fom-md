import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardVisual, MobileVisual, MapVisual } from './ProductVisuals'
import { PAGES } from '../../content/pages'

export function DashboardSection() {
  return <section className="m-section m-dashboard-section" id="plataforma"><DashboardVisual /><div className="m-copy"><span className="m-kicker">FOM CONSOLA</span><h2>Toda la operación.<br />Una sola vista.</h2><p>Vehículos, alertas y mantenimiento conectados para decidir con claridad.</p><ul className="m-feature-lines"><li><b>Flota en tiempo real</b><span>Ubica y consulta el estado de cada vehículo.</span></li><li><b>Atención a las alertas</b><span>Encuentra lo que requiere una revisión.</span></li><li><b>Expediente por vehículo</b><span>Historial, mantenimiento y detalles en un lugar.</span></li></ul><Link className="m-text-link" to="/plataforma">Conocer la plataforma ↗</Link></div></section>
}
export function AppSection() {
  return <section className="m-section m-app-section" id="app"><div className="m-section-heading"><h2>La operación también<br />viaja con tu equipo.</h2><p>FOM DRIVER conecta al conductor con su unidad y con la oficina. Inicio, inspección y perfil en una misma app.</p></div><div className="m-phones"><MobileVisual /><MobileVisual screen="inspeccion" /><MobileVisual screen="perfil" /></div><p className="m-caption">Pantallas de la app actual · Datos de demostración</p><Link className="m-text-link" to="/app">Descubrir la app del conductor ↗</Link></section>
}
export function FunctionsSection() {
  return <section className="m-section m-functions-section"><div className="m-section-heading"><h2>Del primer chequeo<br />al próximo servicio.</h2><p>Un recorrido conectado: revisar, reportar y dar seguimiento.</p></div><div className="m-workflow"><MobileVisual screen="inspeccion" /><ol><li><span>01</span><h3>Inspecciona</h3><p>Revisa la unidad antes de salir.</p></li><li><span>02</span><h3>Reporta</h3><p>Registra fallas y observaciones.</p></li><li><span>03</span><h3>Da seguimiento</h3><p>Consulta las órdenes de trabajo.</p></li></ol><MobileVisual screen="mantenimiento" /></div><div className="m-function-links">{['Rastreo GPS', 'Telemática', 'Mantenimiento', 'Reportes', 'Alertas'].map((s, i) => <Link key={s} to={`/funciones#detalle-${i}`}>{s} ↗</Link>)}</div></section>
}
export function SafetySection({ heading = true }) {
  return <section className="m-section m-safety-section">{heading && <div className="m-section-heading"><h2>Conducir mejor empieza<br />por entender cada viaje.</h2><p>Un índice claro para acompañar al conductor y atender lo que necesita mejorar.</p></div>}<div className="v-profile m-safety-live"><MobileVisual screen="perfil" /><div><span className="m-kicker">PERFIL DEL CONDUCTOR</span><h3>Tu manejo, con contexto.</h3><p>Revisa tu índice y los eventos de conducción desde el perfil de la app.</p><div className="v-score-key"><span>Manejo seguro</span><span>Puedes mejorar</span><span>Requiere atención</span></div></div></div><div className="m-section-bottom"><p className="m-caption">Índice del perfil · Datos de ejemplo</p><Link className="m-text-link" to="/seguridad">Conocer la seguridad de FOM ↗</Link></div></section>
}
const ZONES = [{ name: 'Maracaibo', text: 'Occidente del lago. Flota urbana y operaciones de distribución.' }, { name: 'Cabimas · Ciudad Ojeda', text: 'Costa oriental. Unidades entre campos, patios y puntos de operación.' }, { name: 'Lagunillas · Bachaquero', text: 'Sur del lago. Seguimiento de unidades y recorridos entre sedes.' }]
export function AreasSection() {
  const [zone, setZone] = useState(0)
  return <section className="m-section m-areas-section"><div className="m-copy"><span className="m-kicker">ÁREAS DE OPERACIÓN</span><h2>Un mismo control.<br />Cada zona de tu flota.</h2><p>Organiza unidades por área y consulta su ubicación desde la consola.</p><div className="m-zone-buttons" role="group" aria-label="Zonas de ejemplo">{ZONES.map((z, i) => <button key={z.name} onClick={() => setZone(i)} aria-pressed={zone === i}><i />{z.name}</button>)}</div><p className="m-zone-description" aria-live="polite">{ZONES[zone].text}</p><Link className="m-text-link" to="/areas">Explorar áreas de flota ↗</Link></div><MapVisual /></section>
}
export function BenefitsSection() {
  return <section className="m-benefits" id="beneficios"><div className="m-copy"><h2>Cuidar a la gente.<br />Ordenar la operación.</h2><p>Información clara para actuar a tiempo y acompañar a tu equipo.</p><ul className="m-feature-lines"><li>Historial de cada vehículo</li><li>Inspecciones y mantenimiento</li><li>Documentos y alertas en un lugar</li><li>Trabajo en campo y sincronización</li><li>Acceso según el rol de cada persona</li></ul><Link to="/beneficios" className="m-button outline">Explorar beneficios ↗</Link></div></section>
}
export function FaqSection({ faqs = PAGES.plataforma.faqs, title = 'Lo que necesitas saber para empezar.' }) {
  return <section className="m-section m-faq" id="preguntas"><div><span className="m-kicker">PREGUNTAS FRECUENTES</span><h2>{title}</h2><Link className="m-text-link" to="/preguntas-frecuentes">Visitar el centro de ayuda ↗</Link></div><div>{faqs.map(f => <details key={f.q}><summary>{f.q}<span aria-hidden="true">+</span></summary><p>{f.a}</p></details>)}</div></section>
}
export function ContactForm() {
  const [prepared, setPrepared] = useState(false)
  const submit = e => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const body = ['Solicitud de demostración FOM', ...['Nombre', 'Empresa', 'Correo', 'Flota', 'Mensaje'].map(k => `${k}: ${data.get(k) || 'No indicado'}`)].join('\n')
    window.location.href = `mailto:contacto@fom.app?subject=${encodeURIComponent('Solicitud de demostración FOM')}&body=${encodeURIComponent(body)}`
    setPrepared(true)
  }
  return <form id="solicitud-demo" className="m-contact-form" onSubmit={submit}><h2>Hablemos de tu operación</h2><p>Cuéntanos cómo trabajas y coordinamos una demostración.</p><label>Nombre<input name="Nombre" autoComplete="name" required maxLength={120} /></label><label>Empresa<input name="Empresa" autoComplete="organization" required maxLength={160} /></label><label>Correo<input name="Correo" type="email" autoComplete="email" required maxLength={200} /></label><label>Tamaño de la flota<select name="Flota" defaultValue="" required><option value="" disabled>Selecciona una opción</option><option>1 a 10 unidades</option><option>11 a 50 unidades</option><option>51 a 100 unidades</option><option>Más de 100 unidades</option></select></label><label>Cuéntanos qué necesitas<textarea name="Mensaje" rows={3} maxLength={2000} /></label><button className="m-button primary" type="submit">Preparar solicitud por correo ↗</button><small>Se abrirá tu aplicación de correo para que revises y envíes la solicitud.</small>{prepared && <p role="status">Solicitud preparada. Envíala desde tu aplicación de correo. También puedes escribir a <a href="mailto:contacto@fom.app">contacto@fom.app</a>.</p>}</form>
}
export function ContactSection() {
  return <section className="m-section m-contact" id="contacto"><div className="m-copy"><h2>Ve FOM con tu propia operación en mente.</h2><p>Conoce la consola, la app y las herramientas que acompañan a tu equipo.</p><DashboardVisual /></div><ContactForm /></section>
}

