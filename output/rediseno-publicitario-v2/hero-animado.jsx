import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PhoneFrame, ScreenInicio } from '/src/components/PhoneMockup.jsx';

gsap.registerPlugin(ScrollTrigger);
const root = createRoot(document.getElementById('phone-root'));
flushSync(() => root.render(<PhoneFrame><ScreenInicio /></PhoneFrame>));
document.querySelector('#phone-root').inert = true;
const media = gsap.matchMedia();
const steps = [...document.querySelectorAll('.step')];
const cue = document.querySelector('.cue-text');
media.add({ motion: '(prefers-reduced-motion: no-preference)', small: '(max-width:700px)' }, ({ conditions }) => {
  if (!conditions.motion) return;
  const scene = document.querySelector('.story');
  const desktop = document.querySelector('.dashboard');
  const phone = document.querySelector('.phone-position');
  gsap.set([desktop, document.querySelector('.morph-shell')], { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 1 });
  const placePhone = () => {
    const available = scene.clientHeight * (conditions.small ? .48 : .70);
    phone.style.setProperty('--phone-scale', Math.min(available / 599, conditions.small ? .78 : .94));
  };
  placePhone();
  ScrollTrigger.addEventListener('refreshInit', placePhone);
  const geometry = () => {
    // Layout offsets stay untransformed, so refreshing mid-scroll is deterministic.
    const scale = Number(phone.style.getPropertyValue('--phone-scale'));
    return { x: phone.offsetLeft - desktop.offsetLeft, y: phone.offsetTop - desktop.offsetTop,
      sx: (290 * scale) / desktop.offsetWidth, sy: (599 * scale) / desktop.offsetHeight };
  };
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
    trigger: scene, start: 'top top', end: () => '+=' + scene.clientHeight * 3.2,
    pin: true, scrub: .55, anticipatePin: 1, invalidateOnRefresh: true,
    markers: new URLSearchParams(location.search).has('debug'),
    onUpdate: ({ progress }) => {
      steps[0].classList.toggle('is-active', progress < .55);
      steps[1].classList.toggle('is-active', progress >= .55);
      cue.textContent = progress < .28 ? 'Desliza para llevar la operación contigo' : progress < .74 ? 'De la consola a tu mano' : 'Sigue bajando para explorar FOM';
    },
  }});
  tl.to('.sequence-track i', { scaleX: 1, duration: 1 }, 0)
    .fromTo('.scene-bg', { yPercent: -9, scale: 1.16 }, { yPercent: 9, scale: 1.03, duration: 1 }, 0);
  // First quarter holds the full dashboard; the final quarter holds the phone.
  tl.to('.intro', { opacity: 0, y: -35, duration: .17 }, .23)
    .to('.scene-bg', { opacity: .6, duration: .45 }, .24)
    .to('.morph-shell', { opacity: 1, duration: .08 }, .27)
    .to('.dashboard', { x: () => geometry().x, y: () => geometry().y,
      scaleX: () => geometry().sx, scaleY: () => geometry().sy, duration: .34 }, .31)
    .to('.dashboard', { opacity: 0, duration: .18 }, .46)
    .to('.morph-shell', { x: () => geometry().x, y: () => geometry().y,
      scaleX: () => geometry().sx, scaleY: () => geometry().sy, duration: .34 }, .31)
    .to('.phone-position', { opacity: 1, duration: .14 }, .54)
    .to('.morph-shell', { opacity: 0, duration: .09 }, .62)
    .fromTo('.mobile-copy', { opacity: 0, y: conditions.small ? 12 : 20 }, { opacity: 1, y: 0, duration: .18 }, .56);
  return () => { ScrollTrigger.removeEventListener('refreshInit', placePhone); phone.style.removeProperty('--phone-scale'); };
});
document.getElementById('replay').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'instant' }));
Promise.all([...document.images].map(img => img.decode().catch(() => {}))).then(() => ScrollTrigger.refresh());
window.addEventListener('pagehide', () => { media.revert(); root.unmount(); }, { once: true });
