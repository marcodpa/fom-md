import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../useSesion'
import { Cabecera, Cargando } from '../comp/ui'
import { IconoMovil } from '../comp/movil-piezas'
import { useVistaTelefono } from '../comp/movil-navegacion'
import { IconoApp } from './MantenimientoConductorMovil'
import { BUZONES, ordenarAvisos, rutaDeAviso } from '../datos/avisosConductor'
import { useAvisosConductor } from '../datos/useAvisosConductor'
import * as f from '../datos/formato'
import '../../styles/mantenimiento-movil.css'
import './alertas-conductor.css'

// ============================================================
// ALERTAS DEL CONDUCTOR — lo que abre su campana
// ------------------------------------------------------------
// Copia de mis-notificaciones.tsx de FOM-DRIVER: TODAS juntas por defecto (lo
// sin leer primero y, dentro, lo más nuevo), con el buzón como filtro (Mi
// unidad · Órdenes · Personal), un buscador y dos tramos: Sin leer y Leídas.
// Son los MISMOS avisos que cuenta la campana: el número y la lista cuadran.
// Al abrir una se marca leída y se va a lo que cuenta.
// ============================================================

/** Sin tildes ni mayúsculas: buscar «camion» encuentra «camión». */
const plano = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** El ícono de cada buzón: la unidad (camión), las órdenes (parte) y lo personal (persona). */
function IconoBuzon({ buzon }) {
  const icono = BUZONES.find((b) => b.id === buzon)?.icono
  return icono === 'flota' ? <IconoApp nombre="flota" tam={17} /> : <IconoMovil nombre={icono ?? 'perfil'} tam={17} />
}

/**
 * La tarjeta de un aviso: halo del tono en el canto, ícono del buzón y, si
 * sigue SIN LEER, el punto que late. Lo leído no desaparece: se apaga.
 * Lo que en la app es deslizar (Leída · Eliminar) aquí son dos botones.
 */
function TarjetaAviso({ aviso, alAbrir, alMarcar, alQuitar }) {
  const sinLeer = !aviso.leida
  const conDestino = Boolean(rutaDeAviso(aviso))
  return (
    <article className={`mvm-tarjeta mva-tarjeta ${aviso.tono}${sinLeer ? '' : ' apagada'}`}>
      <button type="button" className="mva-abrir" onClick={() => alAbrir(aviso)}
        aria-label={`${aviso.titulo}${sinLeer ? ', sin leer' : ''}`}>
        <span className="mvm-tarjeta-fila">
          <span className="mvm-tarjeta-icono"><IconoBuzon buzon={aviso.buzon} /></span>
          <span className="mva-textos">
            <span className="mva-titulo-fila">
              <b className="mvm-tarjeta-titulo">{aviso.titulo}</b>
              {sinLeer && <i className="mvm-late" aria-hidden="true" />}
            </span>
            {aviso.detalle && <span className="mvm-tarjeta-desc">{aviso.detalle}</span>}
            <span className="mva-meta">
              <span className="mva-autor">{aviso.generadoPor}</span>
              <i aria-hidden="true" />
              <time dateTime={aviso.creadaEn || undefined}>{aviso.creadaEn ? f.fecha(aviso.creadaEn) : 'Sin fecha'}</time>
              {conDestino && <span className="mva-chevron"><IconoMovil nombre="chevron" tam={16} /></span>}
            </span>
          </span>
        </span>
      </button>
      <span className="mva-acciones">
        {sinLeer && <button type="button" className="mva-accion" onClick={() => alMarcar(aviso)} aria-label={`Marcar como leída: ${aviso.titulo}`}>
          <IconoApp nombre="check" tam={15} />Leída
        </button>}
        <button type="button" className="mva-accion quitar" onClick={() => alQuitar(aviso)} aria-label={`Quitar de la lista: ${aviso.titulo}`}>
          Quitar
        </button>
      </span>
    </article>
  )
}

export default function AlertasConductor() {
  const sesion = useSesion()
  const navegar = useNavigate()
  const esMovil = useVistaTelefono()
  const { buzones, estado, marcarLeidas, descartar, recargar } = useAvisosConductor(sesion?.perfil)
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  const lista = useMemo(() => {
    if (!buzones) return []
    const todas = filtro === 'todas' ? [...buzones.unidad, ...buzones.odt, ...buzones.personal] : buzones[filtro]
    const q = plano(busqueda.trim())
    return ordenarAvisos(todas.filter((n) => !q || plano(`${n.titulo} ${n.detalle} ${n.generadoPor}`).includes(q)))
  }, [buzones, filtro, busqueda])

  // Dos tramos: lo que falta por mirar y lo que ya se miró.
  const tramos = [
    { texto: 'Sin leer', items: lista.filter((n) => !n.leida) },
    { texto: 'Leídas', items: lista.filter((n) => n.leida) },
  ].filter((t) => t.items.length > 0)

  const noLeidasDe = (b) => (buzones?.[b] ?? []).filter((n) => !n.leida).length
  const filtros = [
    { id: 'todas', texto: 'Todas', n: BUZONES.reduce((s, b) => s + noLeidasDe(b.id), 0) },
    ...BUZONES.map((b) => ({ id: b.id, texto: b.texto, n: noLeidasDe(b.id) })),
  ]
  const pendientesVisibles = lista.filter((n) => !n.leida)

  /** Abre el aviso: lo marca leído y va a lo que cuenta (sin esperar a nada). */
  function abrir(aviso) {
    marcarLeidas([aviso])
    const ruta = rutaDeAviso(aviso)
    if (ruta) navegar(ruta)
  }

  const cargando = estado === 'cargando' && !buzones
  const vacioBuzon = BUZONES.find((b) => b.id === filtro)?.vacio

  return (
    <div className={`mvm mva${esMovil ? '' : ' mva-escritorio'}`}>
      {/* En el teléfono el título ya va en la barra de arriba (con «Volver»). */}
      {!esMovil && <Cabecera titulo="Alertas" bajada="Lo de tu unidad, las fallas que reportaste y tus documentos." />}

      <div className="mva-cabeza">
        <label className="mvm-buscar">
          <IconoApp nombre="buscar" tam={18} />
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en tus alertas…" aria-label="Buscar en tus alertas" />
        </label>
        {/* «Marcar» solo cuando hay algo que marcar, y solo lo que está a la vista. */}
        {pendientesVisibles.length > 0 && (
          <button type="button" className="mva-marcar" onClick={() => marcarLeidas(pendientesVisibles)}>
            <IconoApp nombre="check" tam={16} />Marcar
          </button>
        )}
      </div>

      {/* Los filtros siguen aunque no haya nada: si no, no habría cómo volver. */}
      <div className="mvm-riel" role="group" aria-label="Buzón">
        {filtros.map((b) => (
          <button key={b.id} type="button" className={`mvm-opcion${b.id === filtro ? ' on' : ''}`} aria-pressed={b.id === filtro} onClick={() => setFiltro(b.id)}>
            {b.texto}
            <span className="mvm-cuenta">{cargando ? '—' : b.n}</span>
          </button>
        ))}
      </div>

      {cargando ? (
        <Cargando filas={3} />
      ) : estado === 'error' && !buzones ? (
        <div className="mvm-vacio">
          <span className="mvm-vacio-icono"><IconoApp nombre="vacio" tam={22} /></span>
          <b>No pudimos cargar tus alertas.</b>
          <small>Revisa tu conexión e inténtalo de nuevo.</small>
          <button type="button" className="pnl-btn" onClick={recargar}>Reintentar</button>
        </div>
      ) : lista.length === 0 ? (
        <div className="mvm-vacio">
          <span className="mvm-vacio-icono"><IconoApp nombre="check" tam={22} /></span>
          <b>{busqueda.trim() ? 'Nada con esa búsqueda' : 'Todo al día'}</b>
          <small>{busqueda.trim() ? 'Prueba con otra palabra, o quita el filtro.'
            : filtro === 'todas' ? 'Cuando el sistema o tu supervisor te pidan algo, aparecerá aquí.' : vacioBuzon}</small>
        </div>
      ) : (
        <div className="mvm-tramos">
          {tramos.map((t) => (
            <section key={t.texto} className="mvm-tramo" aria-label={t.texto}>
              <div className="mvm-grupo-cab">
                <span className="mvm-overline">{t.texto}</span>
                <i aria-hidden="true" />
                <small>{t.items.length}</small>
              </div>
              {t.items.map((n) => (
                <TarjetaAviso key={n.id} aviso={n} alAbrir={abrir} alMarcar={(a) => marcarLeidas([a])} alQuitar={descartar} />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
