import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import {
  Barra,
  Buscador,
  Cabecera,
  Campo,
  Cargando,
  Chips,
  Datos,
  ErrorCarga,
  Kpi,
  Modal,
  Pestanas,
  Tag,
  Tarjeta,
  Vacio,
} from '../comp/ui'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'

// ============================================================
// MANTENIMIENTO — órdenes de trabajo de la flota.
// La app móvil solo muestra la lista de ODT de un vehículo; aquí el
// supervisor ve toda la operación: tablero por estado, tabla completa,
// expediente de cada orden y las reglas que crean las preventivas solas.
// ============================================================

const COLUMNAS = ['abierta', 'en_revision', 'cerrada']

const TIPOS_FALLA = ['motor', 'frenos', 'neumaticos', 'electrico', 'carroceria', 'otro']

const UBICACION_POR_DEFECTO = 'Registrada desde el panel'

/** Ámbar para lo correctivo (algo se dañó), azul para lo preventivo (algo se cuida). */
function colorTipo(tipo) {
  return tipo === 'preventiva' ? 'azul' : 'ambar'
}

/** Todo el módulo se pide junto: un solo error con reintento en vez de tres. */
function cargarMantenimiento() {
  return Promise.all([repo.odts.listar({}), repo.vehiculos.listar({}), repo.reglas.listar()]).then(
    ([odts, vehiculos, reglas]) => ({ odts, vehiculos, reglas })
  )
}

export default function Mantenimiento() {
  const sesion = useSesion()
  const { datos, estado, error, recargar } = useDatos(cargarMantenimiento, [])
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [vista, setVista] = useState('tablero')
  const [detalleId, setDetalleId] = useState(null)
  const [creando, setCreando] = useState(false)

  const odts = datos?.odts ?? []
  const vehiculos = datos?.vehiculos ?? []
  const reglas = datos?.reglas ?? []

  const visibles = useMemo(() => {
    const texto = q.trim().toLowerCase()
    return odts.filter((o) => {
      if (tipo && o.tipo !== tipo) return false
      if (!texto) return true
      return [o.descripcion, o.vehiculoNombre, o.creadorNombre, etiqueta('tipo_falla', o.tipoFalla)]
        .join(' ')
        .toLowerCase()
        .includes(texto)
    })
  }, [odts, q, tipo])

  const detalle = detalleId ? odts.find((o) => o.id === detalleId) : null

  return (
    <>
      <Cabecera
        titulo="Mantenimiento"
        bajada="Las órdenes de trabajo de la flota, desde que se reportan hasta que se cierran."
      >
        <Buscador
          valor={q}
          alCambiar={setQ}
          placeholder="Buscar por descripción, unidad o quien la reportó…"
        />
        <button type="button" className="pnl-btn primario" onClick={() => setCreando(true)}>
          <Icono nombre="mas" tam={16} />
          Nueva ODT
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        {estado === 'cargando' && <Cargando filas={6} />}
        {estado === 'error' && (
          <ErrorCarga
            onReintentar={recargar}
            texto={error?.message || 'Revisa la conexión e inténtalo de nuevo.'}
          />
        )}

        {estado === 'ok' && (
          <>
            <Indicadores odts={odts} />

            <Pestanas
              opciones={[
                { v: 'tablero', t: 'Tablero' },
                { v: 'lista', t: 'Lista' },
              ]}
              valor={vista}
              alCambiar={setVista}
            />

            {vista === 'tablero' ? (
              <Tarjeta
                titulo="Tablero de órdenes"
                accion={<FiltroTipo odts={odts} valor={tipo} alCambiar={setTipo} />}
              >
                <Tablero odts={visibles} alAbrir={setDetalleId} />
              </Tarjeta>
            ) : (
              <Tarjeta
                titulo="Todas las órdenes"
                accion={<FiltroTipo odts={odts} valor={tipo} alCambiar={setTipo} />}
                sinCuerpo
              >
                <Lista odts={visibles} alAbrir={setDetalleId} />
              </Tarjeta>
            )}

            <Reglas reglas={reglas} />
          </>
        )}
      </div>

      <Modal
        titulo={detalle ? 'Orden de trabajo' : ''}
        abierto={Boolean(detalle)}
        alCerrar={() => setDetalleId(null)}
        ancho={620}
      >
        {detalle && (
          <Detalle
            key={detalle.id}
            odt={detalle}
            recargar={recargar}
            alCerrar={() => setDetalleId(null)}
          />
        )}
      </Modal>

      <Modal
        titulo="Nueva ODT"
        abierto={creando}
        alCerrar={() => setCreando(false)}
        ancho={560}
      >
        {creando && (
          <NuevaOdt
            vehiculos={vehiculos}
            creadorId={sesion?.perfil?.id ?? null}
            recargar={recargar}
            alCerrar={() => setCreando(false)}
          />
        )}
      </Modal>
    </>
  )
}

// ---------------- Indicadores ----------------

function Indicadores({ odts }) {
  const abiertas = odts.filter((o) => o.estado === 'abierta')
  const enRevision = odts.filter((o) => o.estado === 'en_revision')
  const cerradas = odts.filter((o) => o.estado === 'cerrada')

  const hoy = new Date()
  const cerradasMes = cerradas.filter((o) => {
    if (!o.resueltaEn) return false
    const d = new Date(o.resueltaEn)
    return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear()
  })
  const gasto = cerradas.reduce((a, o) => a + (o.costo ?? 0), 0)
  const conCosto = cerradas.filter((o) => o.costo != null).length

  return (
    <div className="pnl-grid k4">
      <Kpi
        titulo="ODT abiertas"
        valor={f.numero(abiertas.length)}
        icono="llave"
        tono={abiertas.length > 0 ? 'aviso' : 'ok'}
        nota={abiertas.length > 0 ? 'Esperando que alguien las tome' : 'Nada pendiente por atender'}
      />
      <Kpi
        titulo="En revisión"
        valor={f.numero(enRevision.length)}
        icono="reloj"
        nota={enRevision.length > 0 ? 'Ya están en taller' : 'Ninguna en taller'}
      />
      <Kpi
        titulo="Cerradas este mes"
        valor={f.numero(cerradasMes.length)}
        icono="check"
        tono={cerradasMes.length > 0 ? 'ok' : ''}
        nota={`${f.numero(cerradas.length)} cerradas en total`}
      />
      <Kpi
        titulo="Costo acumulado"
        valor={f.moneda(gasto)}
        icono="documento"
        nota={`De ${f.numero(conCosto)} ${conCosto === 1 ? 'orden cerrada' : 'órdenes cerradas'} con costo cargado`}
      />
    </div>
  )
}

function FiltroTipo({ odts, valor, alCambiar }) {
  return (
    <Chips
      opciones={[
        { v: '', t: 'Todas', n: odts.length },
        { v: 'correctiva', t: 'Correctivas', n: odts.filter((o) => o.tipo === 'correctiva').length },
        { v: 'preventiva', t: 'Preventivas', n: odts.filter((o) => o.tipo === 'preventiva').length },
      ]}
      valor={valor}
      alCambiar={alCambiar}
    />
  )
}

// ---------------- Vista tablero ----------------

function Tablero({ odts, alAbrir }) {
  return (
    <div className="pnl-kanban">
      {COLUMNAS.map((col) => {
        const dela = odts.filter((o) => o.estado === col)
        return (
          <div className="pnl-kanban-col" key={col}>
            <div className="pnl-kanban-cab">
              <Tag color={color('odt_estado', col)}>{etiqueta('odt_estado', col)}</Tag>
              <em>{f.numero(dela.length)}</em>
            </div>
            <div className="pnl-kanban-lista">
              {dela.length === 0 ? (
                <div className="pnl-vacio">
                  <b>Sin órdenes aquí</b>
                  <span>{textoColumnaVacia(col)}</span>
                </div>
              ) : (
                dela.map((o) => <TarjetaOdt key={o.id} odt={o} alAbrir={alAbrir} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function textoColumnaVacia(col) {
  if (col === 'abierta') return 'Nadie ha reportado fallas nuevas.'
  if (col === 'en_revision') return 'Ninguna unidad está en taller ahora mismo.'
  return 'Todavía no se ha cerrado ninguna orden.'
}

function TarjetaOdt({ odt, alAbrir }) {
  return (
    <button type="button" className="pnl-kanban-card" onClick={() => alAbrir(odt.id)}>
      <b>{odt.descripcion}</b>
      <span>{odt.vehiculoNombre}</span>
      <div className="pnl-kanban-cab">
        <Tag color={colorTipo(odt.tipo)}>{etiqueta('odt_tipo', odt.tipo)}</Tag>
        {odt.estado === 'cerrada' && odt.costo != null && <Tag color="gris">{f.moneda(odt.costo)}</Tag>}
      </div>
      <em>
        {odt.creadorNombre} · {f.desde(odt.creadaEn)}
      </em>
    </button>
  )
}

// ---------------- Vista lista ----------------

function Lista({ odts, alAbrir }) {
  if (odts.length === 0) {
    return (
      <div className="pnl-card-cuerpo">
        <Vacio
          icono="llave"
          titulo="No hay órdenes con estos filtros"
          texto="Prueba con otra búsqueda o muestra todos los tipos de orden."
        />
      </div>
    )
  }

  return (
    <div className="pnl-tabla-wrap">
      <table className="pnl-tabla">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Unidad</th>
            <th>Tipo</th>
            <th>Falla</th>
            <th>Generó</th>
            <th>Creada</th>
            <th>Estado</th>
            <th className="num">Costo</th>
          </tr>
        </thead>
        <tbody>
          {odts.map((o) => (
            <tr
              key={o.id}
              className="pnl-tabla-fila-link"
              onClick={() => alAbrir(o.id)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  alAbrir(o.id)
                }
              }}
            >
              <td>
                <div className="pnl-doble">
                  <b>{o.descripcion}</b>
                  <span>{o.ubicacion || 'Sin ubicación'}</span>
                </div>
              </td>
              <td>{o.vehiculoNombre}</td>
              <td>
                <Tag color={colorTipo(o.tipo)}>{etiqueta('odt_tipo', o.tipo)}</Tag>
              </td>
              <td>{o.tipoFalla ? etiqueta('tipo_falla', o.tipoFalla) : 'No especificado'}</td>
              <td>{o.creadorNombre}</td>
              <td>{f.fecha(o.creadaEn)}</td>
              <td>
                <Tag color={color('odt_estado', o.estado)}>{etiqueta('odt_estado', o.estado)}</Tag>
              </td>
              <td className="num">{o.costo != null ? f.moneda(o.costo) : '·'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------- Detalle de una ODT ----------------

function Detalle({ odt, recargar, alCerrar }) {
  const [cerrando, setCerrando] = useState(false)
  const [nota, setNota] = useState(odt.notaSolucion ?? '')
  const [costo, setCosto] = useState(odt.costo != null ? String(odt.costo) : '')
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState('')

  const seleccion = cerrando ? 'cerrada' : odt.estado

  const items = [
    {
      etiqueta: 'Unidad',
      valor: odt.vehiculoId ? (
        <Link to={`/panel/flota/${odt.vehiculoId}`} className="pnl-link" onClick={alCerrar}>
          {odt.vehiculoNombre}
        </Link>
      ) : (
        'Sin unidad'
      ),
    },
    { etiqueta: 'Tipo de orden', valor: etiqueta('odt_tipo', odt.tipo) },
    {
      etiqueta: 'Tipo de falla',
      valor: odt.tipoFalla ? etiqueta('tipo_falla', odt.tipoFalla) : 'No especificado',
    },
    { etiqueta: 'La generó', valor: odt.creadorNombre },
    { etiqueta: 'Creada', valor: f.fechaHora(odt.creadaEn) },
    { etiqueta: 'Ubicación', valor: odt.ubicacion || 'Sin ubicación' },
  ]

  if (odt.estado === 'cerrada' && odt.resueltaEn) {
    const minutos = (new Date(odt.resueltaEn) - new Date(odt.creadaEn)) / 60000
    items.push({ etiqueta: 'Resuelta', valor: f.fechaHora(odt.resueltaEn) })
    items.push({ etiqueta: 'Tiempo de resolución', valor: f.duracion(minutos) })
  }

  function aplicar(nuevo) {
    setGuardando(true)
    setFallo('')
    repo.odts
      .cambiarEstado(odt.id, nuevo)
      .then(() => {
        setCerrando(false)
        setErrores({})
        return recargar()
      })
      .catch(() => setFallo('No pudimos guardar el cambio de estado. Inténtalo otra vez.'))
      .then(() => setGuardando(false))
  }

  function elegir(nuevo) {
    if (guardando) return
    setFallo('')
    if (nuevo === 'cerrada') {
      if (odt.estado === 'cerrada') setCerrando(false)
      else setCerrando(true)
      return
    }
    setCerrando(false)
    if (nuevo === odt.estado) return
    aplicar(nuevo)
  }

  function guardarCierre() {
    const err = {}
    if (!nota.trim()) err.nota = 'Cuenta qué se hizo para resolver la falla.'
    const crudo = costo.trim()
    const monto = crudo === '' ? null : Number(crudo)
    if (monto !== null && (!Number.isFinite(monto) || monto < 0)) {
      err.costo = 'El costo no puede ser negativo.'
    }
    setErrores(err)
    if (Object.keys(err).length > 0) return

    setGuardando(true)
    setFallo('')
    repo.odts
      .cambiarEstado(odt.id, 'cerrada', { notaSolucion: nota.trim(), costo: monto })
      .then(() => {
        setCerrando(false)
        return recargar()
      })
      .catch(() => setFallo('No pudimos guardar el cierre. Inténtalo otra vez.'))
      .then(() => setGuardando(false))
  }

  return (
    <div className="pnl-filas">
      <div className="pnl-kanban-cab">
        <Tag color={color('odt_estado', odt.estado)}>{etiqueta('odt_estado', odt.estado)}</Tag>
        <Tag color={colorTipo(odt.tipo)}>{etiqueta('odt_tipo', odt.tipo)}</Tag>
        <em>{f.desde(odt.creadaEn)}</em>
      </div>

      <div className="pnl-fila-txt">
        <b>{odt.descripcion}</b>
        <span>Orden {odt.id}</span>
      </div>

      <Datos items={items} />

      {odt.estado === 'cerrada' && (
        <div className={`pnl-fila${odt.costo != null ? '' : ' aviso'}`}>
          <div className="pnl-fila-txt">
            <b>{odt.notaSolucion || 'Se cerró sin nota de solución.'}</b>
            <span>
              {odt.costo != null
                ? `Costo cargado: ${f.moneda(odt.costo)}`
                : 'No se cargó ningún costo a esta orden.'}
            </span>
          </div>
        </div>
      )}

      <div className="pnl-fila-txt">
        <b>Estado de la orden</b>
        <span>
          {odt.estado === 'cerrada'
            ? 'Si la falla volvió, reábrela y el cierre se borra.'
            : 'Mueve la orden según vaya avanzando el trabajo.'}
        </span>
      </div>

      <div className="pnl-tabs" role="group">
        {COLUMNAS.map((e) => (
          <button
            key={e}
            type="button"
            className={`pnl-tab${seleccion === e ? ' activo' : ''}`}
            onClick={() => elegir(e)}
            disabled={guardando}
            aria-pressed={seleccion === e}
          >
            {etiqueta('odt_estado', e)}
          </button>
        ))}
      </div>

      {cerrando && (
        <>
          <Campo etiqueta="Qué se hizo" error={errores.nota} ayuda="Queda como historial de la unidad.">
            <textarea
              className="pnl-textarea"
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Se cambiaron las pastillas delanteras y se purgó el sistema."
            />
          </Campo>

          <Campo etiqueta="Costo" error={errores.costo} ayuda="Opcional. Déjalo vacío si aún no lo tienes.">
            <input
              type="number"
              className="pnl-input"
              min="0"
              step="1"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="0"
            />
          </Campo>

          <div className="pnl-kanban-cab">
            <button
              type="button"
              className="pnl-btn primario"
              onClick={guardarCierre}
              disabled={guardando}
            >
              {guardando ? 'Guardando…' : 'Guardar cierre'}
            </button>
            <button
              type="button"
              className="pnl-btn sutil"
              onClick={() => {
                setCerrando(false)
                setErrores({})
              }}
              disabled={guardando}
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {guardando && !cerrando && <span className="pnl-fila-txt">Guardando…</span>}
      {fallo && (
        <div className="pnl-fila critica">
          <Icono nombre="alerta" tam={16} />
          <div className="pnl-fila-txt">
            <b>{fallo}</b>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------- Nueva ODT ----------------

function NuevaOdt({ vehiculos, creadorId, recargar, alCerrar }) {
  const [vehiculoId, setVehiculoId] = useState(vehiculos[0]?.id ?? '')
  const [descripcion, setDescripcion] = useState('')
  const [tipoFalla, setTipoFalla] = useState('motor')
  const [ubicacion, setUbicacion] = useState(UBICACION_POR_DEFECTO)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState('')

  if (vehiculos.length === 0) {
    return (
      <Vacio
        icono="camion"
        titulo="No hay unidades registradas"
        texto="Agrega una unidad a la flota para poder levantar órdenes de trabajo."
      />
    )
  }

  const elegido = vehiculos.find((v) => v.id === vehiculoId)

  function crear() {
    const err = {}
    // El mismo minimo que exige el servidor. Validarlo aqui convierte un
    // rechazo del servidor en un aviso junto al campo, que es donde se puede
    // corregir.
    if (!descripcion.trim()) err.descripcion = 'Describe la falla.'
    else if (descripcion.trim().length < 10)
      err.descripcion = 'Describe un poco mas: al menos 10 caracteres.'
    setErrores(err)
    if (Object.keys(err).length > 0) return

    setGuardando(true)
    setFallo('')
    repo.odts
      .crear({
        vehiculoId,
        descripcion: descripcion.trim(),
        tipoFalla,
        ubicacion: ubicacion.trim() || UBICACION_POR_DEFECTO,
        creadorId,
      })
      .then(() => {
        alCerrar()
        return recargar()
      })
      .catch((error) => {
        // Se muestra el motivo REAL. Un «inténtalo otra vez» generico invita a
        // repetir algo que no puede funcionar, y esconde justo el dato que
        // permite arreglarlo.
        setFallo(error?.message || 'No pudimos crear la orden.')
        setGuardando(false)
      })
  }

  return (
    <div className="pnl-filas">
      <Campo
        etiqueta="Unidad"
        ayuda={elegido?.conductorNombre ? `Conductor: ${elegido.conductorNombre}` : 'Sin conductor asignado'}
      >
        <select
          className="pnl-select"
          value={vehiculoId}
          onChange={(e) => setVehiculoId(e.target.value)}
        >
          {vehiculos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.alias} · {v.placa}
            </option>
          ))}
        </select>
      </Campo>

      <Campo
        etiqueta="Qué le pasa a la unidad"
        error={errores.descripcion}
        ayuda="Mientras más claro, más rápido la resuelven en taller."
      >
        <textarea
          className="pnl-textarea"
          rows={3}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="El freno de mano no sostiene la camioneta en pendiente."
        />
      </Campo>

      <Campo etiqueta="Tipo de falla">
        <select className="pnl-select" value={tipoFalla} onChange={(e) => setTipoFalla(e.target.value)}>
          {TIPOS_FALLA.map((t) => (
            <option key={t} value={t}>
              {etiqueta('tipo_falla', t)}
            </option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Ubicación" ayuda="Dónde está la unidad o dónde ocurrió la falla.">
        <input
          type="text"
          className="pnl-input"
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          placeholder={UBICACION_POR_DEFECTO}
        />
      </Campo>

      {fallo && (
        <div className="pnl-fila critica">
          <Icono nombre="alerta" tam={16} />
          <div className="pnl-fila-txt">
            <b>{fallo}</b>
          </div>
        </div>
      )}

      <div className="pnl-kanban-cab">
        <button type="button" className="pnl-btn primario" onClick={crear} disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear ODT'}
        </button>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ---------------- Reglas de alerta ----------------

function textoRegla(r) {
  if (r.tipo === 'velocidad') return `Velocidad mayor a ${f.numero(r.umbral)} km/h`
  return `${r.servicio || 'Servicio programado'}: cada ${f.numero(r.umbral)} km`
}

function Reglas({ reglas }) {
  return (
    <Tarjeta titulo="Reglas de alerta">
      {reglas.length === 0 ? (
        <Vacio
          icono="alerta"
          titulo="Todavía no hay reglas"
          texto="Cuando configures una regla de velocidad o de mantenimiento la verás aquí."
        />
      ) : (
        <div className="pnl-filas">
          {reglas.map((r) => {
            const asignadas = r.vehiculos?.length ?? 0
            const promedio =
              r.tipo === 'mantenimiento' && asignadas > 0 && r.umbral
                ? r.vehiculos.reduce((a, v) => a + (v.progresoKm ?? 0), 0) / asignadas / r.umbral
                : 0
            const listo = promedio >= 0.85
            return (
              <div className={`pnl-fila${listo ? ' aviso' : ''}`} key={r.id}>
                <div className="pnl-fila-txt">
                  <b>{textoRegla(r)}</b>
                  <span>
                    {asignadas} {asignadas === 1 ? 'unidad asignada' : 'unidades asignadas'}
                  </span>
                  {r.tipo === 'mantenimiento' && (
                    <>
                      <Barra valor={promedio} tono={listo ? 'aviso' : ''} />
                      <span>Progreso promedio: {Math.round(Math.min(1, promedio) * 100)}%</span>
                    </>
                  )}
                </div>
                <Tag color={r.activa ? 'verde' : 'gris'}>{r.activa ? 'Activa' : 'Pausada'}</Tag>
                <em>{f.fecha(r.creadaEn)}</em>
              </div>
            )
          })}
          <p className="pnl-fila-txt">
            <span>
              Cuando una regla de mantenimiento se cumple, la ODT preventiva se crea sola. Al
              cerrarla, el contador se reinicia.
            </span>
          </p>
        </div>
      )}
    </Tarjeta>
  )
}
