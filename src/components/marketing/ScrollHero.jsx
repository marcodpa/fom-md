import { useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { DashboardVisual, MobileVisual } from './ProductVisuals'
import road from '../../assets/marketing/v6/road.webp'
gsap.registerPlugin(ScrollTrigger, useGSAP)

export default function ScrollHero() {
  const scope = useRef(null)
  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add({ motion: '(prefers-reduced-motion: no-preference)', small: '(max-width:700px)' }, ({ conditions }) => {
      if (!conditions.motion) return
      const scene = scope.current
      const desk = scene.querySelector('.m-morph-desktop')
      const phone = scene.querySelector('.m-morph-phone')
      const copy = scene.querySelector('.m-morph-copy')
      const shell = scene.querySelector('.m-morph-shell')
      gsap.set([desk, shell], { xPercent: -50, yPercent: -50, x: 0, y: 0 })
      const place = () => phone.style.setProperty('--phone-scale', Math.min(scene.clientHeight * (conditions.small ? .47 : .68) / 599, .9))
      place()
      ScrollTrigger.addEventListener('refreshInit', place)
      const geometry = () => { const scale = Number(phone.style.getPropertyValue('--phone-scale')); return { x: phone.offsetLeft - desk.offsetLeft, y: phone.offsetTop - desk.offsetTop, sx: 290 * scale / desk.offsetWidth, sy: 599 * scale / desk.offsetHeight } }
      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: scene, start: 'top top', end: () => '+=' + scene.clientHeight * 1.8, pin: true, scrub: .4, anticipatePin: 1, invalidateOnRefresh: true } })
      tl.to('.m-morph-progress i', { scaleX: 1, duration: 1 }, 0)
        .fromTo('.m-hero-background', { y: 0 }, { y: () => scene.clientHeight * .055, duration: .6 }, 0)
        .to('.m-hero-intro', { autoAlpha: 0, y: -25, duration: .15 }, .14)
        .to('.m-hero-background', { opacity: 0, duration: .32 }, .23)
        .to('.m-hero-studio', { opacity: 1, duration: .34 }, .23)
        .fromTo('.m-hero-studio svg', { y: 28 }, { y: 0, duration: .45 }, .23)
        .to(shell, { opacity: 1, duration: .08 }, .19)
        .to([desk, shell], { x: () => geometry().x, y: () => geometry().y, scaleX: () => geometry().sx, scaleY: () => geometry().sy, duration: .34 }, .23)
        .to(desk, { opacity: 0, duration: .17 }, .36)
        .to(phone, { opacity: 1, duration: .14 }, .44)
        .to(shell, { opacity: 0, duration: .09 }, .53)
        .fromTo(copy, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .18 }, .49)
        .to('.m-morph-cue', { autoAlpha: 0, duration: .1 }, .48)
        .to('.m-hero-continue', { autoAlpha: 1, duration: .12 }, .65)
        .to('.m-hero-studio svg', { opacity: .35, duration: .2 }, .8)
      return () => { ScrollTrigger.removeEventListener('refreshInit', place); phone.style.removeProperty('--phone-scale') }
    })
    return () => media.revert()
  }, { scope })
  return (
    <section className="m-scroll-hero" ref={scope} aria-label="La consola y la app de FOM">
      <div className="m-hero-background" aria-hidden="true">
        <img src={road} alt="" fetchpriority="high" decoding="async" />
      </div>
      <div className="m-hero-studio" aria-hidden="true">
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
          <path d="M620 -100V180Q620 340 820 340H1040Q1280 340 1280 560V1000" stroke="#131d28" strokeWidth="100" />
          <path d="M620 -100V180Q620 340 820 340H1040Q1280 340 1280 560V1000" stroke="#30465d" strokeWidth="1.5" strokeDasharray="14 16" />
          <path d="M800 -100V110Q800 175 910 175H1080Q1430 175 1430 540V1000" stroke="#233446" strokeWidth="1" />
        </svg>
      </div>
      <div className="m-hero-intro">
        <h1>Tu flota conectada.<br />Tu operación, bajo control.</h1>
        <p>La oficina y la carretera, en una misma plataforma.</p>
        <div className="m-actions"><Link className="m-button primary" to="/contacto">Solicitar una demo ↗</Link><a className="m-text-link" href="#plataforma">Explorar FOM ↓</a></div>
      </div>
      <div className="m-morph-desktop"><DashboardVisual /></div>
      <div className="m-morph-shell" aria-hidden="true" />
      <div className="m-morph-copy">
        
        <h2>Todo ese control.<br />Ahora en tu mano.</h2>
        <p>De la vista completa de tu flota<br />a la unidad que acompaña a tu conductor.</p>
        <span className="m-subtle">Tu unidad · Inspecciones · Tu perfil</span>
      </div>
      <div className="m-morph-phone"><MobileVisual caption={false} /></div>
      <div className="m-morph-cue">↓ Desliza para llevar la operación contigo</div>
      <a className="m-hero-continue" href="#plataforma">Descubre cómo funciona FOM <span aria-hidden="true">↓</span></a>
      <div className="m-morph-progress" aria-hidden="true"><span>Consola</span><div><i /></div><span>App móvil</span></div>
    </section>
  )
}
