import { useContext, useLayoutEffect, useRef } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import LogoFom from '../../components/LogoFom'
import { Icono } from '../Iconos'
import { useSesion } from '../useSesion'
import { areaDe } from '../roles'
import { useAvisosConductor } from '../datos/useAvisosConductor'
import { MovilContexto } from './movil-navegacion'

/**
 * Las piezas de la app para la web en el teléfono (encabezado-fom.tsx,
 * screen-header.tsx y app-tab-bar.tsx). Solo se montan bajo 768 px; los
 * estilos están en styles/movil-app.css.
 */

/**
 * Trazos de tab-icon.tsx de la app que el set de la web no tiene o dibuja
 * distinto: «perfil» (UNA persona, eres tú; no confundir con «gente»), la
 * flecha de las filas, la casa de Mi unidad («inicio»), el portapapeles de
 * Inspección y la llave de Mantenimiento («ot»), copiados tal cual.
 */
const TRAZOS_APP = {
  perfil: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><path d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /></>,
  chevron: <path d="M9 18l6-6-6-6" />,
  inicio: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  inspeccion: <><path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><path d="M9 3h6v4H9z" /><path d="M9.5 13.5 11 15l3.5-3.5" /></>,
  ot: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  reporte: <><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M15 3v4h4" /><path d="M9 17v-4" /><path d="M12 17v-6" /><path d="M15 17v-2" /></>,
}

export function IconoMovil({ nombre, tam = 20 }) {
  const trazo = TRAZOS_APP[nombre]
  if (!trazo) return <Icono nombre={nombre} tam={tam} />
  return (
    <svg className="ico" viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {trazo}
    </svg>
  )
}

/**
 * LA BARRA DE ARRIBA DEL TELÉFONO: una sola pieza de 52 px en todas las
 * pantallas. A la izquierda un botón de 44 (menú o atrás); en medio el nombre
 * de la pantalla y, debajo, la empresa (logo de 18 + nombre, en una línea);
 * a la derecha la campana o el logo FOM. Pegada arriba en todas las pantallas;
 * sobre un mapa (`flotante`) flota como el buscador. Estilos: movil-app.css.
 */
function BarraMovil({ izquierda, titulo, linea, derecha, flotante = false, clase = '' }) {
  return (
    <header className={`mv-barra${flotante ? ' flotante' : ''}${clase ? ` ${clase}` : ''}`}>
      <div className="mv-barra-caja">
        {izquierda}
        <div className="mv-barra-centro">
          <b className="mv-barra-titulo">{titulo}</b>
          {linea && <span className="mv-barra-linea">{linea}</span>}
        </div>
        {derecha}
      </div>
    </header>
  )
}

/** ☰: abre el menú completo (el lateral de la computadora, como hoja desde la izquierda). */
function BotonMenu() {
  const movil = useContext(MovilContexto)
  if (!movil?.abrirMenu) return null
  return (
    <button type="button" className="mv-barra-boton" aria-label="Abrir menú" aria-expanded={!!movil.menuAbierto}
      aria-controls="panel-navigation" onClick={movil.abrirMenu}>
      <Icono nombre="menu" tam={22} />
    </button>
  )
}

/**
 * EL ENCABEZADO DE LAS PESTAÑAS: ☰, el nombre de la pestaña con la empresa
 * debajo (`marca`, o el texto `nombre` si no hay marca) y la campana con su
 * globo. Mi perfil ya está en la barra de abajo: aquí no se repite el avatar.
 *
 * Al conductor la campana le cuenta SUS avisos (su unidad, las órdenes que
 * reportó y sus papeles), como encabezado-fom de la app, y no los de toda la
 * empresa que llegan en `sinLeer`. Los demás roles, sin cambios.
 */
export function MovilEncabezado({ seccion, nombre, marca = null, sinLeer, etiquetaCampana, flotante = false }) {
  const sesion = useSesion()
  const { pathname } = useLocation()
  const esConductor = areaDe(sesion?.perfil) === 'conductor'
  const suyos = useAvisosConductor(sesion?.perfil, { activo: esConductor, refresco: pathname })
  const avisos = esConductor ? suyos.noLeidas : sinLeer
  const etiqueta = esConductor ? (avisos > 0 ? `Alertas: ${avisos} sin leer` : 'Alertas') : etiquetaCampana
  return (
    <BarraMovil
      flotante={flotante}
      izquierda={<BotonMenu />}
      titulo={seccion}
      linea={marca || (nombre ? <span className="mv-barra-texto">{nombre}</span> : null)}
      derecha={(
        <Link to="/panel/alertas" className="mv-barra-boton" aria-label={etiqueta}>
          <Icono nombre="campana" tam={21} />
          {avisos > 0 && <span className="mv-insignia" aria-hidden="true">{avisos > 99 ? '99+' : avisos}</span>}
        </Link>
      )}
    />
  )
}

/**
 * EL ENCABEZADO DE LAS PANTALLAS EMPUJADAS (fichas, Centro de control,
 * Reportes…): atrás, el título con la empresa debajo y el logo FOM pequeño a
 * la derecha como firma.
 */
export function MovilPantalla({ titulo, marca = null, alVolver, flotante = false }) {
  return (
    <BarraMovil
      clase="mv-pila"
      flotante={flotante}
      izquierda={(
        <button type="button" className="mv-barra-boton" aria-label="Volver" onClick={alVolver}>
          <Icono nombre="volver" tam={22} />
        </button>
      )}
      titulo={titulo}
      linea={marca}
      derecha={<LogoFom decorativo className="mv-barra-logo" />}
    />
  )
}

/**
 * EL DOCK: la barra de pestañas flotante, con el nombre bajo cada ícono y la
 * píldora del activo (#173553, texto #8BC6FF) detrás del ícono.
 *
 * La píldora es UNA sola pieza que se desliza de pestaña en pestaña (T-184):
 * se mide dónde está el ícono activo y se mueve con transform. La primera
 * vez se coloca sin animar; después, con el resorte de movimiento.css.
 */
export function MovilBarra({ pestanas }) {
  const { pathname } = useLocation()
  const dock = useRef(null)
  const indicador = useRef(null)

  useLayoutEffect(() => {
    const caja = dock.current
    const pieza = indicador.current
    if (!caja || !pieza) return undefined
    let cuadro = 0
    const colocar = () => {
      const activa = caja.querySelector('.mv-pestana.activa .mv-pildora')
      if (!activa) { caja.removeAttribute('data-indicador'); return }
      // Con offsets y no con getBoundingClientRect: la escala del toque no la descuadra.
      let x = 0
      let y = 0
      for (let el = activa; el && el !== caja; el = el.offsetParent) { x += el.offsetLeft; y += el.offsetTop }
      const estado = caja.getAttribute('data-indicador')
      // Ya estaba colocada: la transición se enciende ANTES de moverla.
      if (estado === 'medido') caja.setAttribute('data-indicador', 'listo')
      pieza.style.transform = `translate3d(${x}px, ${y}px, 0)`
      if (!estado) {
        // Primera vez: en su sitio sin deslizarse; el resorte, desde el próximo cambio.
        caja.setAttribute('data-indicador', 'medido')
        cuadro = requestAnimationFrame(() => { cuadro = requestAnimationFrame(() => caja.setAttribute('data-indicador', 'listo')) })
      }
    }
    colocar()
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(colocar)
    observador?.observe(caja)
    return () => { observador?.disconnect(); cancelAnimationFrame(cuadro) }
  }, [pathname, pestanas.length])

  return (
    <nav className="mv-dock-zona" aria-label="Pestañas">
      <div className="mv-dock" ref={dock}>
        <span className="mv-dock-indicador" ref={indicador} aria-hidden="true" />
        {pestanas.map(p => (
          <NavLink
            key={p.a}
            to={p.a}
            end
            // El nombre entero para quien navega a ciegas, aunque se vea el corto.
            aria-label={p.largo ?? p.texto}
            className={({ isActive }) => `mv-pestana${isActive ? ' activa' : ''}`}
          >
            <span className="mv-pildora"><IconoMovil nombre={p.icono} tam={20} /></span>
            <span className="mv-etiqueta">{p.corto ?? p.texto}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
