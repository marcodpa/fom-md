import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MarketingFooter } from '../components/marketing/MarketingChrome'
import { DashboardVisual, MobileVisual } from '../components/marketing/ProductVisuals'
import '../styles/institutional.css'

const BENEFITS = [
  ['Visibilidad de la operación', 'Consulta ubicación, estado y responsable de cada unidad desde una misma vista.', '/plataforma', 'Ver el panel web'],
  ['Cuidado de cada vehículo', 'Reúne inspecciones, hallazgos y órdenes de mantenimiento para dar seguimiento a lo que necesita cada unidad.', '/funciones#detalle-2', 'Ver mantenimiento'],
  ['Comunicación desde el campo', 'El conductor registra información desde su teléfono y la oficina la consulta en la plataforma.', '/app', 'Conocer la app'],
  ['Atención a las alertas', 'Encuentra los avisos que requieren revisión y consulta el contexto de los eventos.', '/seguridad', 'Conocer seguridad'],
  ['Organización por áreas', 'Agrupa unidades por zona, sede o contrato para consultar la parte de la flota que te corresponde.', '/areas', 'Ver áreas de flota'],
  ['Información para decidir', 'Consulta reportes e historial para revisar la operación y planificar los siguientes pasos.', '/funciones#detalle-3', 'Explorar reportes'],
]

export default function ExperiencePage() {
  const app = useLocation().pathname === '/app'
  useEffect(() => { document.title = `${app ? 'App del conductor' : 'Beneficios'} — FOM` }, [app])
  return <main id="contenido" className="i-page">
    <section className="i-hero"><div className="i-hero-copy"><span className="m-kicker">{app ? 'FOM DRIVER · APP DEL CONDUCTOR' : 'BENEFICIOS'}</span><h1>{app ? 'Tu unidad y tu jornada, en tu teléfono.' : 'Más claridad para cada decisión de tu flota.'}</h1><p>{app ? 'Consulta el estado del vehículo, realiza la inspección y revisa tu perfil desde la app que acompaña al conductor.' : 'FOM conecta el trabajo de campo con la oficina para que la información sirva al seguimiento diario de la operación.'}</p><Link className="m-button primary" to="/contacto">Solicitar una demostración ↗</Link></div>{app ? <div className="e-hero-phone"><MobileVisual /><MobileVisual screen="perfil" /></div> : <DashboardVisual screen="flota" />}</section>
    {app ? <div className="e-content">
      <section className="e-row"><div><span className="m-kicker">01 · ANTES DE SALIR</span><h2>Una inspección que queda registrada.</h2><p>Revisa los puntos de la unidad y registra su condición desde el teléfono. La información permite dar seguimiento a los hallazgos desde la oficina.</p><ul><li>Lista de revisión por vehículo.</li><li>Registro de observaciones y fallas.</li><li>Historial disponible para la operación.</li></ul></div><MobileVisual screen="inspeccion" /></section>
      <section className="e-row"><div><span className="m-kicker">02 · DURANTE LA JORNADA</span><h2>El estado de tu unidad, a mano.</h2><p>Desde Inicio, el conductor consulta la información de su vehículo y encuentra accesos a inspecciones, mantenimiento y alertas.</p><Link className="m-text-link" to="/funciones">Explorar las funciones ↗</Link></div><MobileVisual screen="mantenimiento" /></section>
      <section className="e-row"><div><span className="m-kicker">03 · TU PERFIL</span><h2>Conoce tu índice de manejo.</h2><p>Consulta tus datos, documentos y el índice de conducción. Sus indicadores ayudan a entender qué aspectos del manejo requieren atención.</p><Link className="m-text-link" to="/seguridad">Conocer las herramientas de seguridad ↗</Link></div><MobileVisual screen="perfil" /></section>
    </div> : <div className="e-content e-benefit-grid">{BENEFITS.map(([title,copy,to,label],index) => <article key={title}><span>{String(index+1).padStart(2,'0')}</span><h2>{title}</h2><p>{copy}</p><Link className="m-text-link" to={to}>{label} ↗</Link></article>)}</div>}
    <section className="i-page-cta"><h2>{app ? 'La oficina y el conductor, conectados.' : 'Encuentra las herramientas para tu operación.'}</h2><p>Conoce el panel web y la app con una demostración de FOM.</p><Link className="m-button primary" to="/contacto">Hablemos de tu flota ↗</Link></section><MarketingFooter />
  </main>
}
