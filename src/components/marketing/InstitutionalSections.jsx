import { Link } from 'react-router-dom'
import oficina from '../../assets/marketing/photos/oficina.webp'
import instalacion from '../../assets/marketing/photos/instalacion-gps-v2.webp'

export function AboutPreview() {
  return <section className="i-home-section i-home-about" id="quienes-somos">
    <div className="i-home-copy"><span className="m-kicker">QUIÉNES SOMOS</span><h2>La operación se entiende mejor cuando todos ven lo mismo.</h2><p>FOM reúne el trabajo de la oficina y del equipo en campo en una sola plataforma para flotas. Seguimiento, cuidado del vehículo y comunicación forman parte de una misma operación.</p><Link className="m-text-link" to="/quienes-somos">Conoce FOM ↗</Link></div>
    <figure><img src={oficina} alt="Coordinadora de flota trabajando desde la oficina" loading="lazy" width="1672" height="941" /><figcaption>Coordinación en la oficina · Imagen ilustrativa</figcaption></figure>
  </section>
}

export function ServicesPreview() {
  return <section className="i-home-section i-home-services" id="servicios"><div className="i-home-service-head"><span className="m-kicker">QUÉ OFRECEMOS</span><h2>Herramientas para cada momento de la flota.</h2><p>De la ubicación de una unidad al próximo servicio, la información permanece conectada.</p></div><div className="i-home-service-grid"><figure><img src={instalacion} alt="Instalación de un dispositivo GPS en un vehículo" loading="lazy" width="1672" height="941" /><figcaption>Instalación · Imagen ilustrativa</figcaption></figure><div className="i-service-list"><article><span>01</span><h3>Seguimiento</h3><p>Ubicación, recorridos y estado de cada vehículo.</p></article><article><span>02</span><h3>Cuidado</h3><p>Inspecciones, documentos y mantenimiento.</p></article><article><span>03</span><h3>Decisiones</h3><p>Alertas, seguridad y reportes para la operación.</p></article><Link className="m-button outline" to="/que-ofrecemos">Ver todo lo que ofrecemos ↗</Link></div></div></section>
}
