import '../styles/phone.css'

// Recreación fiel de las pantallas de FOM-DRIVER (la app del repo
// control-flotas-main): mapa protagonista con lengüeta de telemetría,
// inspección del día y mantenimiento/ODTs. Tokens del tema oscuro real:
// fondo #0A0D12, superficie #141A22, primario #3D9BF5, fuente del sistema.

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8.5 10 2 2L14 8.5" />
      <path d="M8.5 16H15" />
    </svg>
  ),
  wrench: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
}

function StatusBar() {
  return (
    <div className="ph-status" aria-hidden="true">
      <span className="ph-time">9:41</span>
      <span className="ph-signal">
        <i className="b1" />
        <i className="b2" />
        <i className="b3" />
        <i className="b4" />
        <svg className="ph-batt" viewBox="0 0 26 12">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" fill="none" stroke="currentColor" opacity="0.5" />
          <rect x="2.5" y="2.5" width="14" height="7" rx="1.5" fill="currentColor" />
          <rect x="23" y="4" width="2.5" height="4" rx="1" fill="currentColor" opacity="0.5" />
        </svg>
      </span>
    </div>
  )
}

function TabBar({ active }) {
  const tabs = [
    ['Inicio', 'home'],
    ['Inspección', 'check'],
    ['Mantenim.', 'wrench'],
    ['Perfil', 'user'],
  ]
  return (
    <div className="ph-tabs" aria-hidden="true">
      {tabs.map(([label, icon], i) => (
        <span key={label} className={`ph-tab${i === active ? ' on' : ''}`}>
          <span className="ph-tab-ic">{ICONS[icon]}</span>
          {label}
        </span>
      ))}
    </div>
  )
}

export function PhoneFrame({ children, className = '' }) {
  return (
    <div className={`phone ${className}`} role="img" aria-label="Pantalla de la app FOM en un iPhone">
      <div className="phone-screen">
        <div className="phone-island" aria-hidden="true" />
        {children}
        <div className="phone-home" aria-hidden="true" />
      </div>
    </div>
  )
}

// ---------- Pantalla 1: Inicio (mapa protagonista + lengüeta) ----------

export function ScreenInicio() {
  return (
    <div className="ph-app">
      <StatusBar />
      <div className="ph-map">
        <svg className="ph-map-roads" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,38 L34,34 L62,42 L100,34" className="r-main" />
          <path d="M18,0 L24,44 L20,130" />
          <path d="M0,78 L42,72 L100,82" />
          <path d="M52,0 L56,40 L64,130" />
          <path d="M80,0 L76,54 L84,130" />
          <path d="M0,108 L48,102 L100,112" />
          <path d="M36,20 L40,60" />
          <path d="M64,60 L92,64" />
        </svg>
        <span className="ph-geofence" aria-hidden="true" />
        <span className="ph-pin" aria-hidden="true" />
        <span className="ph-me" aria-hidden="true" />
        <div className="ph-map-chip">
          <b>Unidad 24</b> · A48BF2C
        </div>
        <button type="button" className="ph-sos" tabIndex={-1}>
          SOS
        </button>
        <button type="button" className="ph-report" tabIndex={-1}>
          Reportar una falla
        </button>
      </div>

      <div className="ph-sheet">
        <span className="ph-handle" aria-hidden="true" />
        <div className="ph-sheet-top">
          <div className="ph-speed">
            48 <small>km/h</small>
          </div>
          <span className="ph-chip on">En marcha</span>
          <div className="ph-ring" style={{ '--v': 92 }}>
            <b>92</b>
            <span>Índice seguro</span>
          </div>
        </div>
        <div className="ph-bars">
          <div className="ph-bar">
            <span>Batería</span>
            <div className="ph-bar-track">
              <i style={{ width: '90%' }} />
            </div>
            <b>12.6V</b>
          </div>
          <div className="ph-bar">
            <span>Aceite</span>
            <div className="ph-bar-track">
              <i style={{ width: '88%' }} />
            </div>
            <b>88%</b>
          </div>
        </div>
        <div className="ph-cells">
          <div>
            <span>Temp. motor</span>
            <b>92 °C</b>
          </div>
          <div>
            <span>Personas a bordo</span>
            <b>3</b>
          </div>
          <div>
            <span>Odómetro</span>
            <b>48.230 km</b>
          </div>
        </div>
      </div>
      <TabBar active={0} />
    </div>
  )
}

// ---------- Pantalla 2: Inspección del día ----------

const INSPECTION_ITEMS = [
  ['Frenos', 'ok'],
  ['Luces delanteras', 'ok'],
  ['Neumáticos', 'obs'],
  ['Nivel de aceite', 'ok'],
  ['Cinturones de seguridad', 'fail'],
  ['Extintor', 'pend'],
]

const INS_LABEL = { ok: 'Conforme', obs: 'Observación', fail: 'Falla', pend: 'Pendiente' }

export function ScreenInspeccion() {
  return (
    <div className="ph-app">
      <StatusBar />
      <div className="ph-head">
        <b>Inspección del día</b>
        <span>Lun 20 · Unidad 24</span>
      </div>
      <div className="ph-progress">
        <div className="ph-progress-track">
          <i style={{ width: '72%' }} />
        </div>
        <span>5 de 6 ítems revisados</span>
      </div>
      <div className="ph-list">
        {INSPECTION_ITEMS.map(([name, st]) => (
          <div key={name} className="ph-item">
            <span className={`ph-item-dot ${st}`} aria-hidden="true" />
            <b>{name}</b>
            <span className={`ph-item-state ${st}`}>{INS_LABEL[st]}</span>
          </div>
        ))}
      </div>
      <div className="ph-banner fail">
        <b>Resultado: Bloqueada</b>
        <span>Falla crítica en cinturones — se generó la ODT #218</span>
      </div>
      <TabBar active={1} />
    </div>
  )
}

// ---------- Pantalla 3: Mantenimiento (ODTs y alertas) ----------

const ODTS = [
  { id: 'ODT #218', tipo: 'Correctiva', estado: 'Abierta', st: 'open', desc: 'Cinturón trasero no asegura' },
  { id: 'ODT #214', tipo: 'Correctiva', estado: 'En revisión', st: 'rev', desc: 'Cambio de pastillas de freno' },
  { id: 'ODT #209', tipo: 'Preventiva', estado: 'Cerrada', st: 'done', desc: 'Servicio 45.000 km · $180' },
]

export function ScreenMantenimiento() {
  return (
    <div className="ph-app">
      <StatusBar />
      <div className="ph-head">
        <b>Mantenimiento</b>
        <span>Unidad 24 · Toyota Hilux</span>
      </div>
      <div className="ph-sub">Tus ODT</div>
      <div className="ph-list">
        {ODTS.map((o) => (
          <div key={o.id} className="ph-odt">
            <div className="ph-odt-top">
              <b>{o.id}</b>
              <span className={`ph-chip ${o.st}`}>{o.estado}</span>
            </div>
            <span className="ph-odt-desc">
              {o.tipo} · {o.desc}
            </span>
          </div>
        ))}
      </div>
      <div className="ph-sub">Alertas</div>
      <div className="ph-list">
        <div className="ph-alert warn">
          <b>RCV por vencer</b>
          <span>Vence en 12 días</span>
        </div>
        <div className="ph-alert ok">
          <b>Licencia vigente</b>
          <span>Categoría 5 · vence 2027</span>
        </div>
      </div>
      <TabBar active={2} />
    </div>
  )
}
