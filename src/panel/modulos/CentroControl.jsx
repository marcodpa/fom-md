import { useEffect, useMemo, useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import {
  Buscador, Cargando, Chips, ErrorCarga, Vacio,
} from '../comp/ui'
import Mapa from '../comp/Mapa'
import FichaUnidad, { estadoUnidad } from '../comp/FichaUnidad'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'
import '../../styles/control-map.css'

const ESTADOS = [
  { v: '', t: 'Todas' },
  { v: 'en_marcha', t: 'En marcha' },
  { v: 'parada', t: 'Detenidas' },
]

export default function CentroControl() {
  const [q, setQ] = useState('')
  const [estadoMarcha, setEstadoMarcha] = useState('')
  const [areaId, setAreaId] = useState('')
  const [seleccionado, setSeleccionado] = useState(null)
  const [listaAbierta, setListaAbierta] = useState(false)

  const areas = useDatos(() => repo.areas(), [])
  // Seguimiento en vivo: se vuelve a preguntar por la flota cada 15 segundos.
  // Los equipos reportan cada 1–5 minutos, así que consultar más seguido no
  // adelanta nada; con este ritmo una posición nueva aparece sola en menos de
  // 15 s desde que llega a la base, sin que nadie recargue.
  const flota = useDatos(
    () => repo.vehiculos.listar({ q, areaId, estado: estadoMarcha }),
    [q, areaId, estadoMarcha],
    15000
  )
  // El expediente se sigue pidiendo por UNA sola razón: trae el recorrido del
  // día, que el mapa dibuja como trayecto. La ficha de la unidad ya no se
  // arma aquí — flota sobre el mapa y se alimenta de la lista.
  const detalle = useDatos(
    () => (seleccionado ? repo.vehiculos.obtener(seleccionado) : Promise.resolve(null)),
    [seleccionado]
  )

  const lista = useMemo(() => flota.datos ?? [], [flota.datos])
  const enMarcha = lista.filter((v) => v.estadoMarcha === 'en_marcha').length

  // Si un filtro deja fuera la unidad abierta, se cierra el detalle.
  useEffect(() => {
    if (seleccionado && !lista.some((v) => v.id === seleccionado)) setSeleccionado(null)
  }, [lista, seleccionado])

  const opcionesArea = useMemo(
    () => [{ v: '', t: 'Todas las áreas' }].concat((areas.datos ?? []).map((a) => ({ v: a.id, t: a.nombre }))),
    [areas.datos]
  )

  const limpiar = () => {
    setQ('')
    setEstadoMarcha('')
    setAreaId('')
  }

  // Sin velocidad en la base no se puede contar cuántas van en marcha; lo que
  // sí consta es cuántos equipos están reportando.
  const sabeMarcha = lista.some((v) => v.estadoMarcha != null)
  const reportando = lista.filter((v) => v.conectado).length
  const bajada =
    flota.estado === 'ok'
      ? `${f.numero(lista.length)} ${lista.length === 1 ? 'unidad' : 'unidades'} · ` +
        (sabeMarcha ? `${enMarcha} en marcha` : `${reportando} reportando`)
      : 'Dónde está cada unidad, en tiempo real.'

  const unidad = detalle.datos?.id === seleccionado ? detalle.datos : null

  return (
    <section className="control-map" aria-label="Centro de control">
      <div className="control-map-canvas">
        <Mapa vehiculos={lista} seleccionado={seleccionado} alSeleccionar={setSeleccionado}
          recorrido={unidad?.recorrido ?? null} alto="100%" ficha={false} leyenda={false} />
      </div>
      <div className="control-search">
        <div className="control-search-heading"><div><h1>Centro de control</h1><p>{bajada}</p></div>
          <button className="pnl-btn" type="button" aria-expanded={listaAbierta} aria-controls="control-unidades" onClick={() => { setListaAbierta(v => !v); setSeleccionado(null) }}><Icono nombre="camion" tam={18} />Unidades</button>
        </div>
        <Buscador valor={q} alCambiar={setQ} placeholder="Placa, alias o conductor…" />
      </div>
      <div className="control-filters">
        <Chips opciones={ESTADOS} valor={estadoMarcha} alCambiar={setEstadoMarcha} />
        {opcionesArea.length > 1 && <select className="pnl-input" aria-label="Área de la flota" value={areaId} onChange={e => setAreaId(e.target.value)}>{opcionesArea.map(a => <option key={a.v} value={a.v}>{a.t}</option>)}</select>}
      </div>
      {(flota.estado !== 'ok' || lista.length === 0) && <div className="control-panel control-feedback" role="status">
        {flota.estado === 'cargando' && <Cargando filas={3} />}
        {flota.estado === 'error' && <ErrorCarga onReintentar={flota.recargar} />}
        {flota.estado === 'ok' && lista.length === 0 && (
            <Vacio
              icono="buscar"
              titulo="Ninguna unidad coincide"
              texto="Prueba con otra placa o quita los filtros para ver toda la flota."
              accion={
                <button type="button" className="pnl-btn" onClick={limpiar}>
                  Limpiar filtros
                </button>
              }
            />
        )}
      </div>}
      {listaAbierta && flota.estado === 'ok' && lista.length > 0 && !seleccionado && <aside className="control-panel" id="control-unidades" aria-label="Unidades de la flota">
        <div className="control-panel-heading"><h2>Unidades <span>{lista.length}</span></h2><button type="button" aria-label="Cerrar lista de unidades" onClick={() => setListaAbierta(false)}><Icono nombre="cerrar" /></button></div>
        <ListaUnidades vehiculos={lista} seleccionado={seleccionado} alSeleccionar={setSeleccionado} />
      </aside>}
      {seleccionado && <aside className="control-panel control-unit" aria-label="Detalle de la unidad">
        <FichaUnidad unidad={unidad ?? lista.find(v => v.id === seleccionado)} alCerrar={() => setSeleccionado(null)} />
        {detalle.estado === 'error' && <p className="control-detail-note">No se pudo cargar el recorrido. <button onClick={detalle.recargar}>Reintentar</button></p>}
      </aside>}
      <div className="control-live"><i />Actualización cada 15 s<span>Selecciona una unidad en el mapa</span></div>
    </section>
  )
}

function ListaUnidades({ vehiculos, seleccionado, alSeleccionar }) {
  return (
    <div className="pnl-filas">
      {vehiculos.map((v) => {
        const estado = estadoUnidad(v)
        const viva = estado.color === 'verde'
        const abierta = seleccionado === v.id
        const alternar = () => alSeleccionar(abierta ? null : v.id)
        return (
          <div
            key={v.id}
            className={`pnl-fila${abierta ? ' aviso' : ''}`}
            role="button"
            tabIndex={0}
            aria-pressed={abierta}
            onClick={alternar}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                alternar()
              }
            }}
          >
            <i className={`pnl-punto ${viva ? 'on' : 'off'}`} />
            <div className="pnl-fila-txt">
              <b>{v.alias}</b>
              <span>
                {v.placa} ·{' '}
                {v.conductorNombre === 'Sin asignar' ? 'Sin conductor' : v.conductorNombre}
              </span>
            </div>
            {/* Con velocidad en la base se muestra; sin ella, lo único que
                consta es cuándo reportó el equipo por última vez. */}
            <em>
              {v.velocidadKmh != null
                ? f.velocidad(v.velocidadKmh)
                : v.estadoMarcha === 'parada'
                  ? 'Detenida'
                  : f.desde(v.ultimoReporte)}
            </em>
          </div>
        )
      })}
    </div>
  )
}
