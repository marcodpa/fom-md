import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import {
  Barra, Buscador, Cabecera, Cargando, Chips, Datos, ErrorCarga, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import Mapa from '../comp/Mapa'
import * as f from '../datos/formato'
import { etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'

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

  const areas = useDatos(() => repo.areas(), [])
  const flota = useDatos(
    () => repo.vehiculos.listar({ q, areaId, estado: estadoMarcha }),
    [q, areaId, estadoMarcha]
  )
  // El expediente trae el recorrido del día, que el mapa dibuja como trayecto.
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

  const bajada =
    flota.estado === 'ok'
      ? `${f.numero(lista.length)} ${lista.length === 1 ? 'unidad' : 'unidades'} · ${enMarcha} en marcha`
      : 'Dónde está cada unidad, en tiempo real.'

  const unidad = detalle.datos?.id === seleccionado ? detalle.datos : null

  return (
    <>
      <Cabecera titulo="Centro de control" bajada={bajada}>
        <Buscador valor={q} alCambiar={setQ} placeholder="Placa, alias o conductor…" />
      </Cabecera>

      <div className="pnl-cuerpo">
        <Chips opciones={ESTADOS} valor={estadoMarcha} alCambiar={setEstadoMarcha} />
        {opcionesArea.length > 1 && (
          <Chips opciones={opcionesArea} valor={areaId} alCambiar={setAreaId} />
        )}

        {flota.estado === 'cargando' && <Cargando filas={6} />}
        {flota.estado === 'error' && <ErrorCarga onReintentar={flota.recargar} />}
        {flota.estado === 'ok' && lista.length === 0 && (
          <Tarjeta>
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
          </Tarjeta>
        )}
        {flota.estado === 'ok' && lista.length > 0 && (
          <div className="pnl-grid dos-tercios">
            <Tarjeta sinCuerpo>
              <Mapa
                vehiculos={lista}
                seleccionado={seleccionado}
                alSeleccionar={setSeleccionado}
                recorrido={unidad?.recorrido ?? null}
                alto="clamp(420px, 68vh, 760px)"
              />
            </Tarjeta>

            <div className="pnl-grid">
              <Tarjeta titulo="Unidades">
                <ListaUnidades
                  vehiculos={lista}
                  seleccionado={seleccionado}
                  alSeleccionar={setSeleccionado}
                />
              </Tarjeta>

              {seleccionado && (
                <Telemetria
                  unidad={unidad}
                  estado={detalle.estado}
                  onReintentar={detalle.recargar}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function ListaUnidades({ vehiculos, seleccionado, alSeleccionar }) {
  return (
    <div className="pnl-filas">
      {vehiculos.map((v) => {
        const activa = v.estadoMarcha === 'en_marcha'
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
            <i className={`pnl-punto ${activa ? 'on' : 'off'}`} />
            <div className="pnl-fila-txt">
              <b>{v.alias}</b>
              <span>
                {v.placa} ·{' '}
                {v.conductorNombre === 'Sin asignar' ? 'Sin conductor' : v.conductorNombre}
              </span>
            </div>
            <em>{activa ? f.velocidad(v.velocidadKmh) : 'Detenida'}</em>
          </div>
        )
      })}
    </div>
  )
}

function Telemetria({ unidad: v, estado, onReintentar }) {
  if (estado === 'error') {
    return (
      <Tarjeta titulo="Telemetría">
        <ErrorCarga onReintentar={onReintentar} />
      </Tarjeta>
    )
  }
  if (!v) {
    return (
      <Tarjeta titulo="Telemetría">
        <Cargando filas={4} />
      </Tarjeta>
    )
  }

  const tonoNivel = (pct, bajo, medio) => (pct < bajo ? 'malo' : pct < medio ? 'aviso' : '')

  return (
    <Tarjeta
      titulo="Telemetría"
      accion={
        <Tag color={v.estadoMarcha === 'en_marcha' ? 'verde' : 'gris'}>
          {etiqueta('marcha_estado', v.estadoMarcha)}
        </Tag>
      }
    >
      <div className="pnl-grid">
        <div className="pnl-filas">
          <div className="pnl-fila">
            <div className="pnl-fila-txt">
              <b>Aceite</b>
              <span>{v.aceitePct}%</span>
              <Barra valor={v.aceitePct / 100} tono={tonoNivel(v.aceitePct, 25, 45)} />
            </div>
          </div>
        </div>

        <Datos
          items={[
            { etiqueta: 'Temperatura del motor', valor: `${v.tempMotorC} °C` },
            { etiqueta: 'Velocidad', valor: f.velocidad(v.velocidadKmh) },
            { etiqueta: 'Odómetro', valor: f.km(v.km) },
            { etiqueta: 'Último reporte', valor: f.desde(v.ultimoReporte) },
            { etiqueta: 'Ubicación', valor: v.ubicacionTexto },
            { etiqueta: 'Área', valor: v.areaNombre },
          ]}
        />

        <div>
          <Link to={`/panel/flota/${v.id}`} className="pnl-btn primario">
            <Icono nombre="camion" tam={16} />
            Ver expediente
          </Link>
        </div>
      </div>
    </Tarjeta>
  )
}
