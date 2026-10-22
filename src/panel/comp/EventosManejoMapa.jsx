import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import Mapa from './Mapa'
import { HAY_MAPBOX } from './MapaMapbox'
import { Cargando, ErrorCarga, Tarjeta, Vacio } from './ui'
import { DIAS_MANEJO } from '../datos/manejo'
import {
  CLAVES_EVENTO, EXCESO_KMH, TIPOS_EVENTO, contarPorTipo, eventosParaMapa, excesosBajoUmbral,
  filtrarPorTipos, textoEvento, tipoEvento, unidadEvento, velocidadesEvento,
} from '../datos/eventosManejo'
import * as f from '../datos/formato'
import './eventos-manejo.css'

/** El ícono de un tipo de evento: el mismo círculo de color y glifo de la capa del mapa. */
export function IconoEventoManejo({ tipo, tam = 28 }) {
  const t = tipoEvento(tipo)
  if (!t) return null
  return <span className="em-icono" style={{ '--em-color': t.color, width: tam, height: tam }} aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {t.glifo.map((d) => <path key={d} d={d} />)}
    </svg>
  </span>
}

/**
 * Pestaña Conducción: dónde hubo frenadas bruscas, aceleraciones bruscas y excesos de más de
 * 120 km/h en el período (7 / 30 días), sobre el mapa y en una lista debajo (lo más nuevo primero).
 * `propio`: los eventos de la sesión (`me/`); si no, los de `userId`. El período inicial puede
 * venir en `?dias=` (el «Ver eventos →» de la tarjeta Manejo lo manda).
 */
export default function EventosManejoMapa({ userId, propio = false }) {
  const [parametros] = useSearchParams()
  const pedido = Number(parametros.get('dias'))
  const [dias, setDias] = useState(DIAS_MANEJO.includes(pedido) ? pedido : DIAS_MANEJO[0])
  // «Ver eventos →» con la pestaña ya abierta solo cambia `?dias=`: se sigue aquí también.
  const [pedidoVisto, setPedidoVisto] = useState(pedido)
  if (pedido !== pedidoVisto && !(Number.isNaN(pedido) && Number.isNaN(pedidoVisto))) {
    setPedidoVisto(pedido)
    if (DIAS_MANEJO.includes(pedido)) setDias(pedido)
  }
  const [tipos, setTipos] = useState(() => new Set(CLAVES_EVENTO))
  const [activo, setActivo] = useState(null)
  const caja = useRef(null)

  const carga = useDatos(
    () => (userId || propio ? repo.manejo.eventos({ userId, propio, dias }) : Promise.resolve([])),
    [userId, propio, dias],
  )
  const crudos = carga.datos
  const delPeriodo = useMemo(() => eventosParaMapa(crudos, { dias }), [crudos, dias])
  const ocultos = useMemo(() => excesosBajoUmbral(crudos, { dias }), [crudos, dias])
  const cuenta = contarPorTipo(delPeriodo)
  const visibles = useMemo(() => filtrarPorTipos(delPeriodo, tipos), [delPeriodo, tipos])
  // Si el filtro esconde el elegido, se suelta (y el mapa cierra su globo).
  const elegido = visibles.some((e) => e.id === activo) ? activo : null

  const alternarTipo = (clave) => setTipos((actual) => {
    const nuevo = new Set(actual)
    if (nuevo.has(clave)) nuevo.delete(clave)
    else nuevo.add(clave)
    return nuevo
  })
  const elegirFila = (id) => {
    setActivo(id)
    // En el teléfono la lista queda debajo: se sube al mapa para ver dónde fue.
    const r = caja.current?.getBoundingClientRect()
    if (r && (r.top < 0 || r.bottom > window.innerHeight)) {
      caja.current.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }

  const periodo = <div className="pnl-chips em-dias" role="group" aria-label="Período de los eventos">{DIAS_MANEJO.map((d) => (
    <button key={d} type="button" className={`pnl-chip${d === dias ? ' activo' : ''}`} aria-pressed={d === dias} onClick={() => { setDias(d); setActivo(null) }}>{d} días</button>
  ))}</div>

  const cargando = carga.estado === 'cargando' && !crudos
  const notas = [
    `Excesos: solo los de más de ${EXCESO_KMH} km/h.`,
    ocultos > 0 ? `${f.numero(ocultos)} ${ocultos === 1 ? 'exceso' : 'excesos'} de ${EXCESO_KMH} km/h o menos no ${ocultos === 1 ? 'se muestra' : 'se muestran'}.` : '',
    crudos?.tope ? 'Llegaron los 100 eventos más recientes: puede haber más antiguos en el período.' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="pnl-grid em-conduccion">
      <Tarjeta titulo="Eventos de manejo en el mapa" accion={periodo}>
        {cargando && <Cargando filas={3} />}
        {carga.estado === 'error' && <ErrorCarga compacto error={carga.error} onReintentar={carga.recargar} />}
        {carga.estado !== 'error' && !cargando && delPeriodo.length === 0 && <Vacio compacto icono="velocidad" titulo="Sin eventos en el período"
          texto={`No hubo frenadas ni aceleraciones bruscas, ni excesos de más de ${EXCESO_KMH} km/h, en los últimos ${dias} días.`} />}
        {carga.estado !== 'error' && delPeriodo.length > 0 && <>
          <div className="em-leyenda" role="group" aria-label="Tipos de evento que se muestran">
            {TIPOS_EVENTO.map((t) => (
              <button key={t.clave} type="button" className={`em-filtro${tipos.has(t.clave) ? ' activo' : ''}`} aria-pressed={tipos.has(t.clave)} onClick={() => alternarTipo(t.clave)}>
                <IconoEventoManejo tipo={t.clave} tam={22} /><span>{t.plural}</span><b>{f.numero(cuenta[t.clave])}</b>
              </button>
            ))}
          </div>
          <div className="em-mapa" ref={caja}>
            {HAY_MAPBOX
              ? <Mapa vehiculos={[]} eventosManejo={visibles} eventoActivo={elegido} alElegirEvento={setActivo}
                alto="clamp(300px, 46vh, 460px)" leyenda={false} ficha={false} />
              : <p className="em-nota">El mapa de eventos necesita Mapbox, que no está configurado aquí. Abajo está la lista con cada evento.</p>}
            {HAY_MAPBOX && visibles.length === 0 && <p className="em-sobre-mapa" role="status">Activa al menos un tipo de evento para verlo en el mapa.</p>}
          </div>
          <p className="em-nota">{notas} Toca un ícono para ver el detalle.</p>
        </>}
      </Tarjeta>

      {visibles.length > 0 && <Tarjeta titulo={`Eventos (${f.numero(visibles.length)})`} sinCuerpo>
        <ul className="em-lista">
          {visibles.map((e) => (
            <li key={e.id}>
              <button type="button" className={`em-fila${e.id === elegido ? ' activo' : ''}`} aria-pressed={e.id === elegido}
                aria-label={`${textoEvento(e)}. Ver en el mapa`} onClick={() => elegirFila(e.id)}>
                <IconoEventoManejo tipo={e.tipo} />
                <span className="em-fila-txt">
                  <b>{tipoEvento(e.tipo).nombre}{velocidadesEvento(e) && <em> · {velocidadesEvento(e)}</em>}</b>
                  <small>{[f.fechaHora(e.hora), unidadEvento(e)].filter(Boolean).join(' · ')}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Tarjeta>}
    </div>
  )
}
