import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Cabecera, Cargando, Chips, ErrorCarga, Kpi, Pestanas, Tag, Tarjeta, Vacio } from '../comp/ui'
import { BarrasH } from '../comp/Grafico'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'

// La app separa dos cosas que el supervisor nunca ve juntas: las
// notificaciones (ODT nuevas y reglas que se cumplieron) y los eventos de
// manejo que alimentan el índice seguro. Aquí conviven en la misma bandeja.

const DIAS_EVENTOS = 28

const PESTANAS = [
  { v: 'notificaciones', t: 'Notificaciones' },
  { v: 'eventos', t: 'Eventos de manejo' },
]

const TIPOS_EVENTO = [
  { v: 'exceso_velocidad', t: 'Exceso de velocidad' },
  { v: 'frenada_brusca', t: 'Frenada brusca' },
  { v: 'aceleracion_brusca', t: 'Aceleración fuerte' },
  { v: 'curva_agresiva', t: 'Curva agresiva' },
]

export default function Alertas() {
  const [pestana, setPestana] = useState('notificaciones')
  const [filtro, setFiltro] = useState('todas')
  const [tipoEvento, setTipoEvento] = useState('')

  const notif = useDatos(() => repo.alertas.listar({}), [])
  const manejo = useDatos(() => repo.alertas.eventos({ dias: DIAS_EVENTOS }), [])

  const lista = useMemo(() => notif.datos ?? [], [notif.datos])
  const eventos = useMemo(() => manejo.datos ?? [], [manejo.datos])

  const estado =
    notif.estado === 'error' || manejo.estado === 'error'
      ? 'error'
      : notif.estado === 'ok' && manejo.estado === 'ok'
        ? 'ok'
        : 'cargando'

  const recargar = () => {
    notif.recargar()
    manejo.recargar()
  }

  const sinLeer = lista.filter((n) => !n.leida).length
  const hoy = f.hoyISO()
  const deHoy = lista.filter((n) => f.hoyISO(new Date(n.creadaEn)) === hoy).length
  const excesos = eventos.filter((e) => e.clave === 'exceso_velocidad').length

  const filtrosNotif = [
    { v: 'todas', t: 'Todas', n: lista.length },
    { v: 'sin_leer', t: 'Sin leer', n: sinLeer },
    { v: 'odt_nueva', t: 'ODT nuevas', n: lista.filter((n) => n.tipo === 'odt_nueva').length },
    {
      v: 'alerta_cumplida',
      t: 'Reglas cumplidas',
      n: lista.filter((n) => n.tipo === 'alerta_cumplida').length,
    },
  ]

  const notificaciones = useMemo(() => {
    if (filtro === 'sin_leer') return lista.filter((n) => !n.leida)
    if (filtro === 'odt_nueva' || filtro === 'alerta_cumplida') {
      return lista.filter((n) => n.tipo === filtro)
    }
    return lista
  }, [lista, filtro])

  const conteoPorTipo = useMemo(
    () =>
      TIPOS_EVENTO.map((t) => ({
        etiqueta: t.t,
        valor: eventos.filter((e) => e.clave === t.v).length,
      })),
    [eventos]
  )

  const filtrosEvento = [{ v: '', t: 'Todos', n: eventos.length }].concat(
    TIPOS_EVENTO.map((t) => ({
      v: t.v,
      t: t.t,
      n: eventos.filter((e) => e.clave === t.v).length,
    }))
  )

  const eventosFiltrados = useMemo(
    () => (tipoEvento ? eventos.filter((e) => e.clave === tipoEvento) : eventos),
    [eventos, tipoEvento]
  )

  const marcar = (alerta) => {
    if (!alerta.leida) repo.alertas.marcarLeida(alerta.id)
  }

  const bajada =
    estado === 'ok'
      ? sinLeer > 0
        ? `${f.numero(sinLeer)} ${sinLeer === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}`
        : 'Todo al día, no queda nada sin leer.'
      : 'Lo que pasó en la flota, en orden de llegada.'

  return (
    <>
      <Cabecera titulo="Alertas" bajada={bajada}>
        <button
          type="button"
          className="pnl-btn"
          onClick={() => repo.alertas.marcarTodasLeidas()}
          disabled={estado !== 'ok' || sinLeer === 0}
        >
          <Icono nombre="check" tam={16} />
          Marcar todas como leídas
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        {estado === 'cargando' && <Cargando filas={6} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} error={error} />}
        {estado === 'ok' && (
          <>
            <div className="pnl-grid k4">
              <Kpi
                titulo="Sin leer"
                valor={f.numero(sinLeer)}
                icono="campana"
                tono={sinLeer > 0 ? 'aviso' : ''}
                nota={sinLeer > 0 ? 'Esperan tu revisión' : 'Bandeja al día'}
              />
              <Kpi titulo="Alertas de hoy" valor={f.numero(deHoy)} icono="alerta" />
              <Kpi
                titulo="Eventos de manejo"
                valor={f.numero(eventos.length)}
                icono="velocidad"
                nota={`Últimos ${DIAS_EVENTOS} días`}
              />
              <Kpi
                titulo="Excesos de velocidad"
                valor={f.numero(excesos)}
                icono="escudo"
                tono={excesos > 0 ? 'aviso' : ''}
                nota={`Últimos ${DIAS_EVENTOS} días`}
              />
            </div>

            <Pestanas opciones={PESTANAS} valor={pestana} alCambiar={setPestana} />

            {pestana === 'notificaciones' ? (
              <>
                <Chips opciones={filtrosNotif} valor={filtro} alCambiar={setFiltro} />
                <Tarjeta titulo="Bandeja">
                  {notificaciones.length === 0 ? (
                    <Vacio
                      icono="campana"
                      titulo="Sin notificaciones"
                      texto="Cuando llegue una ODT nueva o se cumpla una regla, la verás aquí."
                    />
                  ) : (
                    <div className="pnl-filas">
                      {notificaciones.map((n) => (
                        <FilaNotificacion key={n.id} alerta={n} alAbrir={marcar} />
                      ))}
                    </div>
                  )}
                </Tarjeta>
              </>
            ) : (
              <>
                <Chips opciones={filtrosEvento} valor={tipoEvento} alCambiar={setTipoEvento} />
                {eventos.length === 0 ? (
                  <Tarjeta titulo="Eventos de manejo">
                    <Vacio
                      icono="velocidad"
                      titulo="Sin eventos de manejo"
                      texto={`No se detectaron eventos en los últimos ${DIAS_EVENTOS} días. Buena señal.`}
                    />
                  </Tarjeta>
                ) : (
                  <div className="pnl-grid">
                    <Tarjeta titulo="Eventos por tipo">
                      <BarrasH datos={conteoPorTipo} formato={f.numero} />
                    </Tarjeta>
                    <Tarjeta titulo="Detalle de eventos">
                      {eventosFiltrados.length === 0 ? (
                        <Vacio
                          icono="filtro"
                          titulo="Ningún evento de ese tipo"
                          texto="Prueba con otro tipo de evento o mira todos."
                          accion={
                            <button
                              type="button"
                              className="pnl-btn"
                              onClick={() => setTipoEvento('')}
                            >
                              Ver todos
                            </button>
                          }
                        />
                      ) : (
                        <TablaEventos eventos={eventosFiltrados} />
                      )}
                    </Tarjeta>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

/** Fila de la bandeja. Si la notificación trae ODT, lleva a Mantenimiento. */
function FilaNotificacion({ alerta, alAbrir }) {
  const contenido = (
    <>
      <i className={`pnl-punto ${alerta.leida ? 'off' : 'alerta'}`} />
      <div className="pnl-fila-txt">
        <b>{alerta.titulo}</b>
        <span>{alerta.detalle}</span>
      </div>
      <em>{f.desde(alerta.creadaEn)}</em>
    </>
  )

  const clase = `pnl-fila${alerta.leida ? '' : ' aviso'}`

  if (alerta.odtId) {
    return (
      <Link to="/panel/mantenimiento" className={clase} onClick={() => alAbrir(alerta)}>
        {contenido}
      </Link>
    )
  }

  return (
    <div
      className={clase}
      role="button"
      tabIndex={0}
      onClick={() => alAbrir(alerta)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          alAbrir(alerta)
        }
      }}
    >
      {contenido}
    </div>
  )
}

function TablaEventos({ eventos }) {
  return (
    <div className="pnl-tabla-wrap">
      <table className="pnl-tabla">
        <thead>
          <tr>
            <th>Evento</th>
            <th>Severidad</th>
            <th>Unidad</th>
            <th>Conductor</th>
            <th className="num">Valor</th>
            <th>Ubicación</th>
            <th>Cuándo</th>
          </tr>
        </thead>
        <tbody>
          {eventos.map((e) => (
            <tr key={e.id}>
              <td>{e.nombre}</td>
              <td>
                <Tag color={color('alerta_severidad', e.severidad)}>
                  {etiqueta('alerta_severidad', e.severidad)}
                </Tag>
              </td>
              <td>
                {e.vehiculo ? (
                  <Link to={`/panel/flota/${e.vehiculo.id}`} className="pnl-link">
                    {e.vehiculo.alias}
                  </Link>
                ) : (
                  'Sin unidad'
                )}
              </td>
              <td>{e.conductorNombre}</td>
              <td className="num">
                {e.clave === 'exceso_velocidad' ? f.velocidad(e.valor) : f.numero(e.valor)}
              </td>
              <td>{e.ubicacion}</td>
              <td>{f.desde(e.creadaEn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
