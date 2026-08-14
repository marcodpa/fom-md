import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import {
  Barra, Buscador, Cabecera, Cargando, Chips, Datos, ErrorCarga, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import Mapa from '../comp/Mapa'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'
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
  // Seguimiento en vivo: se vuelve a preguntar por la flota cada 15 segundos.
  // Los equipos reportan cada 1–5 minutos, así que consultar más seguido no
  // adelanta nada; con este ritmo una posición nueva aparece sola en menos de
  // 15 s desde que llega a la base, sin que nadie recargue.
  const flota = useDatos(
    () => repo.vehiculos.listar({ q, areaId, estado: estadoMarcha }),
    [q, areaId, estadoMarcha],
    15000
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
            {/* Sin velocidad en la base no se puede decir «Detenida»: lo que
                consta es cuándo reportó el equipo por última vez. */}
            <em>
              {v.estadoMarcha
                ? activa
                  ? f.velocidad(v.velocidadKmh)
                  : 'Detenida'
                : f.desde(v.ultimoReporte)}
            </em>
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
        v.estadoMarcha ? (
          <Tag color={v.estadoMarcha === 'en_marcha' ? 'verde' : 'gris'}>
            {etiqueta('marcha_estado', v.estadoMarcha)}
          </Tag>
        ) : (
          <Tag color={color('conexion', v.conexion)}>{etiqueta('conexion', v.conexion)}</Tag>
        )
      }
    >
      <div className="pnl-grid">
        {/* El nivel de aceite solo existe si el equipo lo reporta. Los GPS
            instalados hoy no lo hacen: se omite la barra en vez de dibujar
            una vacía que se lee como «tanque en cero». */}
        {v.aceitePct != null && (
          <div className="pnl-filas">
            <div className="pnl-fila">
              <div className="pnl-fila-txt">
                <b>Aceite</b>
                <span>{v.aceitePct}%</span>
                <Barra valor={v.aceitePct / 100} tono={tonoNivel(v.aceitePct, 25, 45)} />
              </div>
            </div>
          </div>
        )}

        <Datos
          items={[
            { etiqueta: 'Temperatura del motor', valor: v.tempMotorC == null ? '—' : `${v.tempMotorC} °C` },
            { etiqueta: 'Velocidad', valor: v.velocidadKmh == null ? '—' : f.velocidad(v.velocidadKmh) },
            { etiqueta: 'Odómetro', valor: f.km(v.km) },
            { etiqueta: 'Último reporte', valor: f.desde(v.ultimoReporte) },
            { etiqueta: 'Ubicación', valor: v.ubicacionTexto || '—' },
            { etiqueta: 'Área', valor: v.areaNombre },
          ].concat(
            // Datos que sí existen en la base real y no tenían dónde verse.
            v.gps?.imei ? [{ etiqueta: 'IMEI del equipo', valor: v.gps.imei }] : []
          )}
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
