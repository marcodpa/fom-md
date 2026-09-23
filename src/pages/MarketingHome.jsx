import { useEffect } from 'react'
import ScrollHero from '../components/marketing/ScrollHero'
import { MarketingFooter } from '../components/marketing/MarketingChrome'
import { DashboardSection, AppSection, FunctionsSection, SafetySection, AreasSection, BenefitsSection, FaqSection, ContactSection } from '../components/marketing/MarketingSections'
import { AboutPreview, ServicesPreview } from '../components/marketing/InstitutionalSections'
import '../styles/institutional.css'
export default function MarketingHome() {
  useEffect(() => { document.title = 'FOM — Tu flota conectada, tu operación bajo control' }, [])
  return <main id="contenido"><ScrollHero /><AboutPreview /><ServicesPreview /><DashboardSection /><AppSection /><FunctionsSection /><SafetySection /><AreasSection /><BenefitsSection /><FaqSection /><ContactSection /><MarketingFooter /></main>
}
