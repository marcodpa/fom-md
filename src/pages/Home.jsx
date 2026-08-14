import CinematicIntro from '../components/CinematicIntro'
import Hero from '../components/Hero'
import PlatformShowcase from '../components/PlatformShowcase'
import Features from '../components/Features'
import Security from '../components/Security'
import Branches from '../components/Branches'
import Benefits from '../components/Benefits'
import CTA from '../components/CTA'
import Footer from '../components/Footer'

// Inicio: la intro cinematográfica en video controlada por scroll y el resumen
// de la plataforma. Cada bloque enlaza a su página dedicada; aquí es la vista
// panorámica.
export default function Home({ reduced }) {
  return (
    <main id="contenido">
      <CinematicIntro reduced={reduced} />

      <div className="landing">
        <Hero />
        <PlatformShowcase />
        <Features />
        <Security />
        <Branches />
        <Benefits />
        <CTA />
        <Footer />
      </div>
    </main>
  )
}
