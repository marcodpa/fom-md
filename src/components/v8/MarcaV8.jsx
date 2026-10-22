// Logo FOM ORIGINAL en vector: mismos trazos que public/brand/fom-logo.svg (tres flechas azul
// #349BFA + «FOM»). Las letras toman currentColor; en la web v8 (.v8-logo) son #f7f8fa, el
// mismo blanco del archivo original.
export function LogoV8({ className = '', titulo = 'FOM' }) {
  return <svg className={`v8-logo ${className}`} viewBox="0 0 280 84" role="img" aria-label={titulo}>
    <g fill="#349BFA" transform="translate(0 1)">
      <path d="M3 25h14a4 4 0 0 1 3.4 1.9l9.7 15a4 4 0 0 1 0 4.3l-9.7 15A4 4 0 0 1 17 63H4a3 3 0 0 1-2.5-4.7L10 45a4 4 0 0 0 0-4.3L.5 29.7A3 3 0 0 1 3 25Z" />
      <path d="M24 13h18a5 5 0 0 1 4.2 2.3l16.2 25a5 5 0 0 1 0 5.4L46.2 71A5 5 0 0 1 42 73H26a4 4 0 0 1-3.4-6.1l13.6-21a5 5 0 0 0 0-5.4l-15.6-21A4 4 0 0 1 24 13Z" />
      <path d="M50 0h24a6 6 0 0 1 5 2.7l24 36a6 6 0 0 1 0 6.6L79 79.3a6 6 0 0 1-5 2.7H53a5 5 0 0 1-4.2-7.7l20.7-29a6 6 0 0 0 0-6.6L45.8 7.7A5 5 0 0 1 50 0Z" />
    </g>
    <g fill="currentColor">
      <path d="M118 16h40v11h-28v12h25v11h-25v17h-12Z" />
      <path fillRule="evenodd" d="M189 15a27 27 0 1 1 0 54 27 27 0 0 1 0-54Zm0 12a15 15 0 1 0 0 30 15 15 0 0 0 0-30Z" />
      <path d="M222 16h12l17 19 17-19h12v51h-12V34l-17 18-17-18v33h-12Z" />
    </g>
  </svg>
}

// Iconos de trazo fino (24 × 24, trazo 1.5) para la web v8.
const PATHS = {
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M10.5 5h3M11 18.5h2" /></>,
  monitor: <><rect x="2.5" y="3.5" width="19" height="13" rx="2" /><path d="M12 16.5v4m-4 0h8" /></>,
  database: <><ellipse cx="12" cy="5.5" rx="7.5" ry="3" /><path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" /></>,
  cloud: <path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6A3.8 3.8 0 0 1 17.5 18.5Z" />,
  wrench: <path d="M14.5 6.5a4 4 0 0 0 5 5l-8.8 8.8a2.1 2.1 0 0 1-3-3l8.8-8.8a4 4 0 0 1-2-2Zm0 0 3-3a4 4 0 0 0-3 3Z" />,
  clipboard: <><rect x="5" y="4.5" width="14" height="17" rx="2.5" /><path d="M9 4.5V3.8A1.3 1.3 0 0 1 10.3 2.5h3.4A1.3 1.3 0 0 1 15 3.8v.7M9 11l2 2 4-4M9 17h6" /></>,
  bell: <><path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14Z" /><path d="M10 21h4" /></>,
  chart: <path d="M4 20.5h16M7 17v-6m5 6V6m5 11v-8" />,
  shield: <><path d="M12 2.8 19.5 5.6v6c0 4.6-3.2 8.2-7.5 9.6-4.3-1.4-7.5-5-7.5-9.6v-6Z" /><path d="m8.8 12 2.2 2.2 4.3-4.4" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5Z" /><path d="m3 12.5 9 5 9-5M3 16.5l9 5 9-5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.5a6 6 0 0 1 3.5 6" /></>,
  gauge: <><path d="M3.5 17a8.5 8.5 0 1 1 17 0" /><path d="m12 15 4-5" /><circle cx="12" cy="15.5" r="1.3" /></>,
  sos: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.3v.2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  route: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></>,
  zone: <><path d="M4 7.5 9 4l6 3 5-3v12.5L15 20l-6-3-5 3.5Z" /><path d="M9 4v13m6-10v13" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  truck: <><path d="M2.5 6.5h11v10h-11Z" /><path d="M13.5 10h4l3 3.5v3h-7" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  camera: <><rect x="2.5" y="7" width="13" height="10" rx="2" /><path d="m15.5 11 6-3.5v9l-6-3.5" /></>,
  chat: <path d="M4.5 18.5 3.5 21l3.4-1.3A8.5 8.5 0 1 0 3.5 12a8.4 8.4 0 0 0 1 4Z" />,
  login: <><path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14" /><path d="M3.5 12h11m-4-4 4 4-4 4" /></>,
}

// <IconoV8 nombre="pin" />: decorativo (aria-hidden). Lista de nombres: claves de PATHS.
export const ICONOS_V8 = Object.keys(PATHS)

export function IconoV8({ nombre, className = '' }) {
  return <svg className={`v8-ico ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[nombre]}</svg>
}
