import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'

// El mapa real (Leaflet) llega en diferido; mientras tanto se ve el plano
// esquemático, que también queda como respaldo si el fragmento no carga.
const MapaReal = lazy(() => import('./MapaSeguridadReal'))

// ============================================================
// CENTRO DE CONTROL DE SEGURIDAD (página /seguridad)
// Tablero al estilo sala de control: mapa con zonas de alto riesgo,
// estado de las unidades en vivo, fila de alertas, protocolo de
// emergencia y eventos recientes. Todo con datos simulados, como
// el resto de la demostración.
// ============================================================

const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

const Ic = {
  alerta: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...trazo} aria-hidden="true">
      <path d="M12 3.6 21.5 20H2.5Z" /><path d="M12 9.5V14" /><path d="M12 17.2h.01" />
    </svg>
  ),
  desconexion: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...trazo} aria-hidden="true">
      <path d="M12 3.2c-3.5 0-6.3 2.8-6.3 6.3 0 4.4 6.3 11.3 6.3 11.3s6.3-6.9 6.3-11.3c0-3.5-2.8-6.3-6.3-6.3Z" />
      <path d="m9.5 7.5 5 5" /><path d="m14.5 7.5-5 5" />
    </svg>
  ),
  ruta: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...trazo} aria-hidden="true">
      <circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="5" r="2.2" />
      <path d="M8.2 19H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8" />
    </svg>
  ),
  escudo: (
    <svg viewBox="0 0 24 24" width="18" height="18" {...trazo} aria-hidden="true">
      <path d="M12 3 5 5.6V11c0 4.2 3 6.9 7 8.4 4-1.5 7-4.2 7-8.4V5.6z" /><path d="m9 11.8 2 2 4-4.2" />
    </svg>
  ),
  sos: (
    <svg viewBox="0 0 24 24" width="20" height="20" {...trazo} strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.5" /><path d="M12 15.6h.01" />
    </svg>
  ),
  check: <svg viewBox="0 0 24 24" width="15" height="15" {...trazo} strokeWidth="2" aria-hidden="true"><path d="M5 12.5 10 17.5 19.5 7" /></svg>,
}

// Estado en vivo de las unidades que vigila el tablero
const UNIDADES = [
  { placa: 'A48BF2C', indice: 92, estado: 'En ruta segura', tono: 'ok' },
  { placa: 'P21KD8', indice: 74, estado: 'Cruzando zona de riesgo', tono: 'aviso' },
  { placa: 'M77BX1', indice: 88, estado: 'Detenida en base', tono: 'ok' },
]

const ALERTAS = [
  { icono: Ic.alerta, tono: 'rojo', titulo: 'Parada no autorizada', dato: 'Unidad 14 · hace 2 min' },
  { icono: Ic.desconexion, tono: 'rojo', titulo: 'GPS sin reportar', dato: 'Unidad 09 · hace 37 min' },
  { icono: Ic.ruta, tono: 'ambar', titulo: 'Desvío de ruta', dato: 'Unidad 21 · hace 1 h' },
]

const EVENTOS = [
  { cuando: 'hace 2 min', que: 'Parada no autorizada', donde: 'Unidad 14 · Bachaquero', tono: 'rojo' },
  { cuando: 'hace 19 min', que: 'Apertura de puerta en ruta', donde: 'Unidad 03 · Cabimas', tono: 'ambar' },
  { cuando: 'hace 37 min', que: 'GPS dejó de reportar', donde: 'Unidad 09 · Maracaibo', tono: 'rojo' },
  { cuando: 'hace 1 h', que: 'Exceso de velocidad', donde: 'Unidad 21 · Carretera Lara-Zulia', tono: 'ambar' },
  { cuando: 'hace 2 h', que: 'Salida de geocerca autorizada', donde: 'Unidad 07 · Ciudad Ojeda', tono: 'gris' },
]

/** Mapa táctico: vías, zonas de alto riesgo en rojo, geocerca segura y unidades. */
function MapaTactico() {
  return (
    <svg viewBox="0 0 820 400" className="seg-mapa-svg" role="img"
      aria-label="Mapa de seguridad con dos zonas de alto riesgo, una geocerca segura y tres unidades en vivo">
      <defs>
        <filter id="seg-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Vías */}
      <g className="seg-vias">
        <path d="M0 210 C160 190, 300 240, 460 210 S 720 160, 820 190" className="principal" />
        <path d="M120 0 L150 160 L130 400" />
        <path d="M340 0 L360 180 L330 400" />
        <path d="M560 0 L540 200 L580 400" />
        <path d="M0 90 L280 110 L520 70 L820 100" />
        <path d="M0 320 L240 300 L520 330 L820 300" />
      </g>

      {/* Zonas de alto riesgo */}
      <g className="seg-zona-riesgo" filter="url(#seg-glow)">
        <path d="M300 60 L400 40 L450 120 L380 180 L300 150 Z" />
        <path d="M560 210 L660 190 L700 260 L620 310 L550 280 Z" />
      </g>
      <text className="seg-zona-tag rojo" x="332" y="106">Zona de alto riesgo</text>
      <text className="seg-zona-tag rojo" x="580" y="252">Zona de alto riesgo</text>

      {/* Geocerca segura */}
      <g className="seg-zona-segura">
        <rect x="70" y="230" width="150" height="110" rx="16" />
      </g>
      <text className="seg-zona-tag verde" x="92" y="288">Geocerca segura</text>

      {/* Ruta vigilada */}
      <path className="seg-ruta" d="M90 285 C 200 250, 300 250, 400 225 S 640 150, 780 175" />

      {/* Unidades */}
      {[[92, 284, 'ok'], [408, 222, 'aviso'], [778, 174, 'ok']].map(([x, y, t], i) => (
        <g key={i} className={`seg-pin ${t}`} transform={`translate(${x} ${y})`}>
          <circle className="halo" r="14" />
          <circle className="punto" r="5" />
        </g>
      ))}
    </svg>
  )
}

export default function SeguridadCentro({ page }) {
  return (
    <>
      {/* ---- Cabecera ---- */}
      <header className="pp-hero hero-mesh seg-hero">
        <div className="container">
          <div className="pp-eyebrow" data-reveal>Seguridad de la flota</div>
          <h1 data-reveal>
            Centro de control de <em>seguridad</em>
          </h1>
          <p data-reveal>{page.subtitle}</p>
        </div>

        {/* ---- Tablero: mapa + estado en vivo + alertas ---- */}
        <div className="container">
          <div className="seg-tablero mk-shell" data-reveal>
            <div className="seg-tablero-inner">
              <div className="seg-mapa">
                <Suspense fallback={<MapaTactico />}>
                  <MapaReal />
                </Suspense>

                <div className="seg-vivo">
                  <div className="seg-vivo-cab">
                    <i aria-hidden="true" />
                    Estado de seguridad en vivo
                  </div>
                  {UNIDADES.map((u) => (
                    <div className="seg-vivo-fila" key={u.placa}>
                      <div>
                        <b>{u.placa}</b>
                        <span>{u.estado}</span>
                      </div>
                      <em className={u.tono}>{u.indice}</em>
                    </div>
                  ))}
                </div>
              </div>

              <div className="seg-alertas">
                {ALERTAS.map((a, i) => (
                  <div className={`seg-alerta ${a.tono}`} key={i}>
                    <i className="seg-alerta-ic">{a.icono}</i>
                    <div>
                      <b>{a.titulo}</b>
                      <span>{a.dato}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ---- Protocolo de emergencia + eventos ---- */}
      <section className="seg-cuerpo">
        <div className="container seg-fila-2">
          <div className="seg-sos" data-reveal>
            <div className="seg-sos-anillo" aria-hidden="true">
              {Ic.sos}
            </div>
            <em>Protocolo de pánico</em>
            <b>Botón SOS de emergencia</b>
            <p>
              El conductor lo pulsa en su app ante robo, accidente o problema de salud.
              La alerta llega al panel del supervisor con la ubicación exacta en menos
              de 5 segundos, y el caso queda abierto hasta cerrarse con registro.
            </p>
            <Link to="/contacto" className="seg-sos-btn">
              Ver el protocolo completo
            </Link>
          </div>

          <div className="seg-eventos" data-reveal>
            <div className="seg-eventos-cab">
              <h2>Eventos de seguridad</h2>
              <span className="seg-historial">Historial</span>
            </div>
            <div className="seg-eventos-lista">
              {EVENTOS.map((e, i) => (
                <div className={`seg-evento ${e.tono}`} key={i}>
                  <time>{e.cuando}</time>
                  <div>
                    <b>{e.que}</b>
                    <span>{e.donde}</span>
                  </div>
                  <i aria-hidden="true" />
                </div>
              ))}
            </div>
            <p className="seg-nota">
              Vista de demostración con datos simulados. En tu cuenta, el historial
              muestra los eventos reales de tu flota.
            </p>
          </div>
        </div>

        {/* ---- Estado de protocolos ---- */}
        <div className="container seg-fila-3">
          <div className="seg-carta" data-reveal>
            <em>Respuesta a incidentes</em>
            <b>Protocolos de respuesta</b>
            <ul>
              <li>{Ic.check} Confirmar el evento y contactar al conductor</li>
              <li>{Ic.check} Escalar al supervisor de guardia si no responde</li>
              <li>{Ic.check} Registrar evidencia y cerrar el caso con auditoría</li>
            </ul>
          </div>

          <div className="seg-carta alerta" data-reveal>
            <em>Estado del protocolo</em>
            <b>Vigilancia reforzada</b>
            <div className="seg-nivel">
              <i aria-hidden="true" />
              Nivel activo: alerta preventiva
            </div>
            <p>
              La zona de Bachaquero mantiene rondas y avisos reforzados esta semana por
              solicitud de la contratante.
            </p>
          </div>

          <div className="seg-carta verde" data-reveal>
            <em>Geocercas seguras</em>
            <b>
              {Ic.escudo}
              18 zonas activas
            </b>
            <p>
              Patios, muelles y rutas con alertas de entrada y salida en tiempo real.
              Cada cruce queda registrado con hora y unidad.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
