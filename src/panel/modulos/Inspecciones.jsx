import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import {
  Buscador, Cabecera, Cargando, Chips, Datos, ErrorCarga, Kpi, Modal, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import { BarrasH } from '../comp/Grafico'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'

// ============================================================
// INSPECCIONES PREOPERACIONALES
// En la app el supervisor solo ve el resultado final: nunca puede abrir la
// revisión y saber QUÉ falló. Aquí sí, con el checklist completo por unidad.
// ============================================================

/** Hash FNV-1a: misma inspección, mismo checklist, siempre. */
function hash(texto) {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Reconstruye el detalle por ítem a partir del resultado registrado.
 * Las fallas críticas caen sobre ítems críticos y las observaciones sobre los
 * no críticos primero. El orden sale del id de la inspección, así que la misma
 * inspección muestra siempre exactamente el mismo checklist.
 */
function checklistDe(insp) {
  const items = repo.inspecciones.itemsPlantilla(insp.tipoVehiculo)
  const porHash = (arr) => [...arr].sort((a, b) => hash(insp.id + a.id) - hash(insp.id + b.id))

  const criticos = porHash(items.filter((i) => i.critico))
  const noCriticos = porHash(items.filter((i) => !i.critico))

  const fallas = new Set(criticos.slice(0, Math.min(insp.fallasCriticas ?? 0, criticos.length)).map((i) => i.id))
  const candidatos = [...noCriticos, ...criticos.filter((i) => !fallas.has(i.id))]
  const observados = new Set(
    candidatos.slice(0, Math.min(insp.observaciones ?? 0, candidatos.length)).map((i) => i.id)
  )

  return items.map((i) => ({
    ...i,
    estadoItem: fallas.has(i.id) ? 'falla' : observados.has(i.id) ? 'observacion' : 'conforme',
  }))
}

/** Agrupa el checklist por categoría respetando el orden del catálogo. */
function porCategoria(items) {
  const grupos = []
  items.forEach((it) => {
    const g = grupos.find((x) => x.categoria === it.categoria)
    if (g) g.items.push(it)
    else grupos.push({ categoria: it.categoria, items: [it] })
  })
  return grupos
}

function cargar(fecha, q) {
  return Promise.all([
    repo.inspecciones.listar({ fecha, q }),
    repo.inspecciones.listar({ fecha: f.hoyISO() }),
    repo.inspecciones.pendientesHoy(),
    repo.vehiculos.listar({}),
  ]).then(([lista, hoy, pendientes, vehiculos]) => ({ lista, hoy, pendientes, vehiculos }))
}

export default function Inspecciones() {
  const [fecha, setFecha] = useState(f.hoyISO())
  const [resultado, setResultado] = useState('')
  const [q, setQ] = useState('')
  const [detalle, setDetalle] = useState(null)

  const { datos, estado, error, recargar } = useDatos(() => cargar(fecha, q), [fecha, q])

  return (
    <>
      <Cabecera
        titulo="Inspecciones"
        bajada="Revisión preoperacional de cada unidad, con el detalle de lo que reportó el conductor."
      >
        <button type="button" className="pnl-btn" onClick={() => setFecha(f.hoyISO())}>
          <Icono nombre="reloj" tam={16} />
          Ver hoy
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        {estado === 'cargando' && <Cargando filas={6} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} />}
        {estado === 'ok' && (
          <Contenido
            datos={datos}
            fecha={fecha}
            setFecha={setFecha}
            resultado={resultado}
            setResultado={setResultado}
            q={q}
            setQ={setQ}
            abrirDetalle={setDetalle}
          />
        )}
      </div>

      <DetalleInspeccion inspeccion={detalle} alCerrar={() => setDetalle(null)} />
    </>
  )
}

function Contenido({ datos, fecha, setFecha, resultado, setResultado, q, setQ, abrirDetalle }) {
  const { lista: base, hoy, pendientes, vehiculos } = datos

  const lista = useMemo(
    () => (resultado ? base.filter((i) => i.resultado === resultado) : base),
    [base, resultado]
  )

  const cuenta = (r) => base.filter((i) => i.resultado === r).length
  const hechasHoy = new Set(hoy.map((i) => i.vehiculoId)).size
  const aprobadasHoy = hoy.filter((i) => i.resultado === 'aprobada').length
  const conObservacionHoy = hoy.filter((i) => i.resultado === 'aprobada_con_observaciones').length
  const bloqueadasHoy = hoy.filter((i) => i.resultado === 'bloqueada').length

  // Fallas por categoría dentro del período que se está mirando.
  const fallasPorCategoria = useMemo(() => {
    const conteo = new Map()
    lista.forEach((insp) => {
      if (!insp.fallasCriticas) return
      checklistDe(insp).forEach((it) => {
        if (it.estadoItem === 'falla') conteo.set(it.categoria, (conteo.get(it.categoria) ?? 0) + 1)
      })
    })
    return [...conteo.entries()]
      .map(([cat, valor]) => ({ etiqueta: cat, valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [lista])

  return (
    <>
      <div className="pnl-grid k4">
        <Kpi
          titulo="Inspecciones de hoy"
          valor={`${hechasHoy} de ${vehiculos.length}`}
          icono="check"
          tono={pendientes.length > 0 ? 'aviso' : 'ok'}
          nota={
            pendientes.length > 0
              ? `${pendientes.length} ${pendientes.length === 1 ? 'unidad sin revisar' : 'unidades sin revisar'}`
              : 'Toda la flota revisada'
          }
        />
        <Kpi
          titulo="Aprobadas hoy"
          valor={f.numero(aprobadasHoy)}
          icono="escudo"
          tono="ok"
          nota="Salieron sin novedad"
        />
        <Kpi
          titulo="Con observaciones hoy"
          valor={f.numero(conObservacionHoy)}
          icono="editar"
          tono={conObservacionHoy > 0 ? 'aviso' : 'ok'}
          nota={conObservacionHoy > 0 ? 'Revisa el detalle de cada una' : 'Ninguna con novedades'}
        />
        <Kpi
          titulo="Unidades bloqueadas hoy"
          valor={f.numero(bloqueadasHoy)}
          icono="alerta"
          tono={bloqueadasHoy > 0 ? 'malo' : 'ok'}
          nota={bloqueadasHoy > 0 ? 'No deben salir a ruta' : 'Ninguna bloqueada'}
        />
      </div>

      <div className="pnl-grid dos-tercios">
        <Tarjeta
          titulo="Unidades sin inspección de hoy"
          accion={<Link to="/panel/flota" className="pnl-link">Ver la flota</Link>}
        >
          {pendientes.length === 0 ? (
            <Vacio
              icono="check"
              titulo="Todas las unidades inspeccionadas"
              texto={`Las ${vehiculos.length} unidades pasaron su revisión preoperacional de hoy.`}
            />
          ) : (
            <div className="pnl-filas">
              {pendientes.map((v) => (
                <Link key={v.id} to={`/panel/flota/${v.id}`} className="pnl-fila aviso">
                  <div className="pnl-fila-txt">
                    <b>{v.alias} · {v.placa}</b>
                    <span>{v.areaNombre} · {v.conductorNombre}</span>
                  </div>
                  <em>Sin revisar</em>
                </Link>
              ))}
            </div>
          )}
        </Tarjeta>

        <Tarjeta titulo="Ítems que más fallan">
          {fallasPorCategoria.length === 0 ? (
            <Vacio
              icono="escudo"
              titulo="Sin fallas críticas"
              texto="Ninguna inspección del período mostrado reportó fallas críticas."
            />
          ) : (
            <BarrasH datos={fallasPorCategoria} formato={(n) => f.numero(n)} />
          )}
        </Tarjeta>
      </div>

      <Tarjeta
        titulo="Historial de inspecciones"
        accion={<Buscador valor={q} alCambiar={setQ} placeholder="Buscar unidad o conductor…" />}
        sinCuerpo
      >
        <div className="pnl-card-cuerpo">
          <div className="pnl-chips">
            <Chips
              opciones={[
                { v: '', t: 'Todas', n: base.length },
                { v: 'aprobada', t: 'Aprobadas', n: cuenta('aprobada') },
                { v: 'aprobada_con_observaciones', t: 'Con observaciones', n: cuenta('aprobada_con_observaciones') },
                { v: 'bloqueada', t: 'Bloqueadas', n: cuenta('bloqueada') },
              ]}
              valor={resultado}
              alCambiar={setResultado}
            />
            <input
              type="date"
              className="pnl-input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              aria-label="Fecha de las inspecciones"
            />
            <button
              type="button"
              className={`pnl-chip${fecha === '' ? ' activo' : ''}`}
              onClick={() => setFecha('')}
              aria-pressed={fecha === ''}
            >
              Todas las fechas
            </button>
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="pnl-card-cuerpo">
            <Vacio
              icono="buscar"
              titulo="No hay inspecciones que mostrar"
              texto="Prueba con otra fecha, otro resultado o limpia el buscador."
            />
          </div>
        ) : (
          <div className="pnl-tabla-wrap">
            <table className="pnl-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Unidad</th>
                  <th>Conductor</th>
                  <th>Resultado</th>
                  <th className="num">Observaciones</th>
                  <th className="num">Fallas críticas</th>
                  <th>Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((i) => (
                  <tr
                    key={i.id}
                    className="pnl-tabla-fila-link"
                    tabIndex={0}
                    role="button"
                    aria-label={`Ver detalle de la inspección de ${i.vehiculoNombre}`}
                    onClick={() => abrirDetalle(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        abrirDetalle(i)
                      }
                    }}
                  >
                    <td>{f.fecha(i.fecha)}</td>
                    <td>
                      <div className="pnl-doble">
                        <b>{i.vehiculo?.alias ?? i.vehiculoNombre}</b>
                        <span>{i.vehiculo?.placa ?? etiqueta('vehiculo_tipo', i.tipoVehiculo)}</span>
                      </div>
                    </td>
                    <td>{i.conductorNombre}</td>
                    <td>
                      <Tag color={color('inspeccion_resultado', i.resultado)}>
                        {etiqueta('inspeccion_resultado', i.resultado)}
                      </Tag>
                    </td>
                    <td className="num">{f.numero(i.observaciones)}</td>
                    <td className="num">
                      {i.fallasCriticas > 0 ? <Tag color="rojo">{i.fallasCriticas}</Tag> : '0'}
                    </td>
                    <td>{i.ubicacion || 'Sin ubicación'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </>
  )
}

function DetalleInspeccion({ inspeccion, alCerrar }) {
  const grupos = useMemo(() => (inspeccion ? porCategoria(checklistDe(inspeccion)) : []), [inspeccion])
  if (!inspeccion) return null

  return (
    <Modal titulo="Detalle de la inspección" abierto alCerrar={alCerrar} ancho={620}>
      <Datos
        items={[
          { etiqueta: 'Unidad', valor: inspeccion.vehiculoNombre },
          { etiqueta: 'Conductor', valor: inspeccion.conductorNombre },
          { etiqueta: 'Fecha y hora', valor: f.fechaHora(inspeccion.creadaEn) },
          { etiqueta: 'Ubicación', valor: inspeccion.ubicacion || 'Sin ubicación' },
          { etiqueta: 'Tipo de unidad', valor: etiqueta('vehiculo_tipo', inspeccion.tipoVehiculo) },
          {
            etiqueta: 'Resultado',
            valor: (
              <Tag color={color('inspeccion_resultado', inspeccion.resultado)}>
                {etiqueta('inspeccion_resultado', inspeccion.resultado)}
              </Tag>
            ),
          },
        ]}
      />

      <div className="pnl-checklist">
        {grupos.map((g) => (
          <Fragment key={g.categoria}>
            <div className="pnl-check-cat">{g.categoria}</div>
            {g.items.map((it) => (
              <div className="pnl-check-item" key={it.id}>
                <div className="pnl-fila-txt">
                  <b>{it.nombre}</b>
                  {it.critico && <span>Crítico</span>}
                </div>
                <Tag color={color('inspeccion_item_estado', it.estadoItem)}>
                  {etiqueta('inspeccion_item_estado', it.estadoItem)}
                </Tag>
              </div>
            ))}
          </Fragment>
        ))}
      </div>

      <div className="pnl-fila-txt">
        <span>
          El detalle por ítem se reconstruye a partir del resultado registrado. Cuando la app guarde
          cada respuesta, se mostrará tal cual la envió el conductor.
        </span>
      </div>
    </Modal>
  )
}
