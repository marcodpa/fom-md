import {
  PhoneFrame,
  ScreenInicio,
  ScreenInspeccion,
  ScreenMantenimiento,
} from '../PhoneMockup'
import capturaConsola from '../../assets/consola-resumen.jpg'

// ============================================================
// MOCKUPS DE INTERFAZ REAL DE FOM
// No son imágenes ni divs de relleno: son mini-interfaces funcionales de la
// plataforma, con la estética de la app (oscuro, acento azul). Se muestran
// dentro de marcos de dispositivo (laptop / iPhone) o como tarjetas sueltas.
// Cada bloque de las páginas de producto elige uno por su tema.
// ============================================================

// --- Mini mapa reutilizable (lago + calles + unidades) --------------------
function MiniMap({ pins = DEFAULT_PINS }) {
  return (
    <svg viewBox="0 0 400 260" className="mk-map-svg" aria-hidden="true">
      <defs>
        <linearGradient id="mk-lake" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5f7cf0" />
          <stop offset="1" stopColor="#3a52c7" />
        </linearGradient>
        <filter id="mk-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="mk-roads">
        {['M0 70 L150 90 L240 60', 'M40 200 L160 170 L300 190', 'M90 0 L110 130 L90 260', 'M400 60 L300 110 L340 180', 'M260 10 L300 90 L360 150'].map((d, i) => (
          <path key={i} d={d} className={i < 2 ? 'main' : ''} />
        ))}
      </g>
      <path className="mk-lake-glow" d="M220 -20 C 200 60, 170 70, 205 120 S 250 180, 210 210 S 170 250, 220 300" filter="url(#mk-glow)" />
      <path className="mk-lake-core" d="M220 -20 C 200 60, 170 70, 205 120 S 250 180, 210 210 S 170 250, 220 300" />
      <path className="mk-route" d="M0 70 L150 90 L240 60" />
      {pins.map((p, i) => (
        <g key={i} transform={`translate(${p[0]} ${p[1]})`} className={`mk-vpin${p[2] ? ' on' : ''}`}>
          <circle className="mk-vpin-ring" r="13" />
          <circle className="mk-vpin-dot" r="4.5" />
        </g>
      ))}
    </svg>
  )
}
const DEFAULT_PINS = [
  [95, 110, true],
  [150, 150, false],
  [300, 120, false],
  [250, 200, false],
  [120, 190, false],
]

// --- Marco de laptop con el panel web ------------------------------------
export function DashboardMockup() {
  return (
    <div className="mk-shell mk-laptop" data-parallax>
      <div className="mk-browser">
        <div className="mk-bar">
          <span className="mk-dot" />
          <span className="mk-dot" />
          <span className="mk-dot" />
          <div className="mk-url">app.fom.com.ve/flota</div>
        </div>
        <div className="mk-dash">
          <aside className="mk-side">
            <div className="mk-side-brand">
              <i className="mk-side-logo" />
              FOM
            </div>
            <div className="mk-side-list">
              {[
                ['A48BF2C', 'En marcha', 'on'],
                ['P21KD8', 'En marcha', 'on'],
                ['J09FR2', 'Detenida', 'off'],
                ['M77BX1', 'En marcha', 'on'],
                ['C14QA6', 'Ralentí', 'idle'],
              ].map(([plate, st, k]) => (
                <div className="mk-unit" key={plate}>
                  <i className={`mk-unit-dot ${k}`} />
                  <b>{plate}</b>
                  <span>{st}</span>
                </div>
              ))}
            </div>
          </aside>
          <div className="mk-main">
            <div className="mk-kpis">
              <div className="mk-kpi">
                <b>26</b>
                <span>conectadas</span>
                <em className="mk-kpi-delta up">+2</em>
              </div>
              <div className="mk-kpi">
                <b>18</b>
                <span>en marcha</span>
                <em className="mk-kpi-delta up">+3</em>
              </div>
              <div className="mk-kpi">
                <b className="warn">3</b>
                <span>alertas</span>
                <em className="mk-kpi-delta down">-1</em>
              </div>
            </div>
            <div className="mk-map">
              <MiniMap />
              <div className="mk-map-tag">
                <i />
                Maracaibo · en vivo · 12:43
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Captura real de la consola, con el mismo marco de navegador ----------
export function ConsolaReal() {
  return (
    <div className="mk-shell mk-laptop" data-parallax>
      <div className="mk-browser">
        <div className="mk-bar">
          <span className="mk-dot" />
          <span className="mk-dot" />
          <span className="mk-dot" />
          <div className="mk-url">app.fom.com.ve/panel</div>
        </div>
        <img
          className="mk-captura"
          src={capturaConsola}
          alt="Consola FOM real: resumen con indicadores de flota, órdenes de trabajo, alertas y el mapa en vivo de la Costa Oriental del Lago"
          loading="eager"
        />
      </div>
    </div>
  )
}

// --- iPhones (reusan pantallas reales) -----------------------------------
export function PhoneMap() {
  return (
    <div className="mk-phone" data-parallax>
      <PhoneFrame>
        <ScreenInicio />
      </PhoneFrame>
    </div>
  )
}
export function PhoneInspeccion() {
  return (
    <div className="mk-phone" data-parallax>
      <PhoneFrame>
        <ScreenInspeccion />
      </PhoneFrame>
    </div>
  )
}
export function PhoneMant() {
  return (
    <div className="mk-phone" data-parallax>
      <PhoneFrame>
        <ScreenMantenimiento />
      </PhoneFrame>
    </div>
  )
}

// --- Tarjetas de interfaz -------------------------------------------------
function Card({ title, meta, children, className = '' }) {
  return (
    <div className={`mk-shell mk-card ${className}`} data-parallax>
      <div className="mk-card-inner">
        <div className={`mk-card-head${meta ? ' has-meta' : ''}`}>
          <span>{title}</span>
          {meta && <em className="mk-card-meta">{meta}</em>}
        </div>
        {children}
      </div>
    </div>
  )
}

export function AlertsCard() {
  const items = [
    ['Exceso de velocidad', 'A48BF2C · 82 km/h', 'danger', 'ahora'],
    ['Salida de geocerca', 'P21KD8 · Zona Sur', 'warn', 'hace 2 min'],
    ['Parada no autorizada', 'J09FR2 · 14 min', 'warn', 'hace 14 min'],
    ['Frenada brusca', 'M77BX1 · Av. Bella Vista', 'danger', 'hace 1 h'],
  ]
  return (
    <Card title="Alertas en vivo">
      <div className="mk-alerts">
        {items.map(([t, s, k, when], i) => (
          <div className={`mk-alert ${k}`} key={i}>
            <div>
              <b>{t}</b>
              <span>{s}</span>
            </div>
            <em>{when}</em>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function TelemetryCard() {
  const gauges = [
    ['Motor', 92, '°C'],
    ['Batería', 88, '%'],
    ['Aceite', 74, '%'],
  ]
  return (
    <Card title="Telemetría · A48BF2C">
      <div className="mk-tele">
        {gauges.map(([label, val, u], i) => (
          <div className="mk-tele-row" key={i}>
            <span>{label}</span>
            <div className="mk-tele-bar">
              <i style={{ '--v': val / 100 }} />
            </div>
            <b>
              {val}
              <em>{u}</em>
            </b>
          </div>
        ))}
      </div>
      <div className="mk-tele-foot">
        <div>
          <b>48.230</b>
          <span>km totales</span>
        </div>
        <div>
          <b>48</b>
          <span>km/h ahora</span>
        </div>
      </div>
    </Card>
  )
}

export function MaintenanceCard() {
  const odts = [
    ['Cambio de aceite', 'A48BF2C', 'Programada', 'warn'],
    ['Frenos delanteros', 'J09FR2', 'En proceso', 'on'],
    ['Cauchos 4x', 'P21KD8', 'Vence en 3 días', 'danger'],
  ]
  return (
    <Card title="Órdenes de trabajo" meta="3 abiertas">
      <div className="mk-odt">
        {odts.map(([t, p, st, k], i) => (
          <div className="mk-odt-row" key={i}>
            <div>
              <b>{t}</b>
              <span>{p}</span>
            </div>
            <em className={`mk-tag ${k}`}>{st}</em>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ZonesCard() {
  return (
    <Card title="Zonas y geocercas" className="mk-card-map">
      <div className="mk-zones-map">
        <MiniMap pins={[[95, 110, true], [300, 120, false], [250, 200, false]]} />
      </div>
      <div className="mk-zones-legend">
        {[
          ['Occidente', '12'],
          ['Costa oriental', '9'],
          ['Sur del lago', '5'],
        ].map(([z, n], i) => (
          <span key={i}>
            <i />
            {z} <b>{n}</b>
          </span>
        ))}
      </div>
    </Card>
  )
}

export function SafetyCard() {
  return (
    <Card title="Índice de manejo seguro">
      <div className="mk-safety">
        <div className="mk-safety-score">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="mk-ring-bg" cx="60" cy="60" r="50" />
            <circle
              className="mk-ring-fg"
              cx="60"
              cy="60"
              r="50"
              style={{ '--p': 0.92 }}
            />
          </svg>
          <div className="mk-safety-num">
            <b>92</b>
            <span>Verde</span>
          </div>
        </div>
        <div className="mk-safety-list">
          {[
            ['Frenadas bruscas', '2'],
            ['Aceleración fuerte', '1'],
            ['Exceso de velocidad', '0'],
          ].map(([t, n], i) => (
            <div key={i}>
              <span>{t}</span>
              <b>{n}</b>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export function RolesCard() {
  const users = [
    ['Carlos Méndez', 'Gerente de flota', 'Todo'],
    ['Ana Rincón', 'Supervisora · Sur', 'Su zona'],
    ['Luis Parra', 'Mantenimiento', 'ODTs'],
    ['José Colina', 'Conductor', 'App'],
  ]
  return (
    <Card title="Roles y permisos" meta="4 usuarios">
      <div className="mk-roles">
        {users.map(([n, r, scope], i) => (
          <div className="mk-role" key={i}>
            <i className="mk-avatar" style={{ '--h': i * 70 }} />
            <div>
              <b>{n}</b>
              <span>{r}</span>
            </div>
            <em>{scope}</em>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ReportCard() {
  const bars = [40, 62, 48, 78, 66, 90, 72]
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  return (
    <Card title="Reporte semanal" meta="últimos 7 días">
      <div className="mk-report">
        <div className="mk-report-bars">
          {bars.map((h, i) => (
            <i key={i} style={{ '--h': `${h}%`, '--i': i }} />
          ))}
        </div>
        <div className="mk-report-days">
          {days.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mk-report-foot">
          <div>
            <b>1.284</b>
            <span>km esta semana</span>
          </div>
          <div>
            <b>+8,4%</b>
            <span>vs. anterior</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function IntegrationsCard() {
  const tools = [
    ['ERP', true],
    ['Nómina', false],
    ['Despacho', true],
    ['Excel', true],
    ['PDF', false],
    ['Webhook', false],
  ]
  return (
    <Card title="Integraciones · API" meta="v1.3">
      <div className="mk-integ">
        <div className="mk-integ-grid">
          {tools.map(([s, on]) => (
            <span key={s} className={on ? 'on' : ''}>{s}</span>
          ))}
        </div>
        <code className="mk-integ-code">
          GET /api/v1/vehiculos/A48BF2C
          <span className="mk-code-ok">200 OK · 42 ms</span>
        </code>
      </div>
    </Card>
  )
}

// --- Dispatcher -----------------------------------------------------------
const MAP = {
  'laptop-dashboard': DashboardMockup,
  'captura-consola': ConsolaReal,
  'phone-map': PhoneMap,
  'phone-inspeccion': PhoneInspeccion,
  'phone-mant': PhoneMant,
  'card-alerts': AlertsCard,
  'card-telemetry': TelemetryCard,
  'card-maintenance': MaintenanceCard,
  'card-zones': ZonesCard,
  'card-safety': SafetyCard,
  'card-roles': RolesCard,
  'card-report': ReportCard,
  'card-integrations': IntegrationsCard,
}

export default function Visual({ id }) {
  const Cmp = MAP[id] || DashboardMockup
  return <Cmp />
}
