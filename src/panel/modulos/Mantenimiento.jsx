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

// El tablero agrupa los nueve estados del servidor en cuatro columnas que
// se leen de un vistazo; el detalle de cada orden enseña el estado exacto.
const GRUPOS = [
  { clave: 'abierta', titulo: 'Abiertas', color: 'ambar', estados: ['abierta'], vacio: 'Nadie ha reportado fallas nuevas.' },
  { clave: 'revision', titulo: 'En revisión', color: 'azul', estados: ['en_revision', 'aprobada'], vacio: 'Ninguna orden esperando aprobación.' },
  { clave: 'taller', titulo: 'En taller', color: 'azul', estados: ['asignada', 'en_ejecucion', 'pausada', 'en_calidad'], vacio: 'Ninguna unidad está en taller ahora mismo.' },
  { clave: 'cerrada', titulo: 'Cerradas', color: 'verde', estados: ['cerrada', 'cancelada'], vacio: 'Todavía no se ha cerrado ninguna orden.' },
]
const EN_CURSO = ['en_revision', 'aprobada', 'asignada', 'en_ejecucion', 'pausada', 'en_calidad']

// Los pasos posibles desde cada estado. Es la tabla de transiciones del
// servidor más los dos caminos aparte que usa la app: asignar responsable
// (aprobada → asignada) y los eventos de ejecución (inicio, pausa,
// reanudación, entrega).
const PASOS_ODT = {
  abierta: [
    { a: 'en_revision', t: 'Pasar a revisión' },
    { a: 'cerrada', t: 'Cerrar' },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true },
  ],
  en_revision: [
    { a: 'aprobada', t: 'Aprobar' },
    { a: 'abierta', t: 'Devolver a abierta', sutil: true },
    { a: 'cerrada', t: 'Cerrar' },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true },
  ],
  aprobada: [
    { a: 'asignar', t: 'Asignar responsable' },
    { a: 'en_revision', t: 'Volver a revisión', sutil: true },
    { a: 'cerrada', t: 'Cerrar' },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true },
  ],
  asignada: [
    { a: 'inicio', t: 'Iniciar trabajo', ejecucion: true },
    { a: 'asignar', t: 'Reasignar', sutil: true },
    { a: 'en_revision', t: 'Volver a revisión', sutil: true },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true },
  ],
  en_ejecucion: [
    { a: 'entrega', t: 'Entregar a calidad', ejecucion: true },
    { a: 'pausa', t: 'Pausar', ejecucion: true, sutil: true },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true },
  ],
  pausada: [
    { a: 'reanudacion', t: 'Reanudar', ejecucion: true },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true },
  ],
  en_calidad: [
    { a: 'cerrada', t: 'Cerrar' },
    { a: 'en_ejecucion', t: 'Devolver a ejecución', sutil: true },
    { a: 'cancelada', t: 'Cancelar orden', sutil: true },
  ],
  cerrada: [{ a: 'en_revision', t: 'Reabrir' }],
  cancelada: [],
}
const EVENTO_ODT = { inicio: 'inició', pausa: 'pausó', reanudacion: 'reanudó', entrega: 'entregó a calidad' }
const AYUDA_ODT = {
  abierta: 'Alguien reportó la falla. Pásala a revisión para evaluarla, o ciérrala si ya se atendió.',
  en_revision: 'Se está evaluando. Apruébala para que pase a taller.',
  aprobada: 'Aprobada. Asigna quién la ejecuta: lo verá en su app.',
  asignada: 'Tiene responsable. El trabajo empieza cuando el responsable lo inicia desde su app.',
  en_ejecucion: 'En taller. Cuando termine, se entrega a calidad.',
  pausada: 'El trabajo está detenido. Reanúdalo cuando siga.',
  en_calidad: 'Terminó el trabajo: revisa y cierra con lo que se hizo y el costo.',
  cerrada: 'Si la falla volvió, reábrela: pasa a revisión y el cierre queda en el historial.',
  cancelada: 'Cancelada: no admite más cambios.',
}

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
        <Link to="/panel/mantenimiento/planes" className="pnl-btn sutil">
          <Icono nombre="sync" tam={16} />
          Planes y acciones
        </Link>
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
            perfil={sesion?.perfil ?? null}
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
  const enRevision = odts.filter((o) => EN_CURSO.includes(o.estado))
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
        titulo="En curso"
        valor={f.numero(enRevision.length)}
        icono="reloj"
        nota={enRevision.length > 0 ? 'En revisión, aprobadas o en taller' : 'Ninguna en revisión ni en taller'}
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
      {GRUPOS.map((col) => {
        const dela = odts.filter((o) => col.estados.includes(o.estado))
        return (
          <div className="pnl-kanban-col" key={col.clave}>
            <div className="pnl-kanban-cab">
              <Tag color={col.color}>{col.titulo}</Tag>
              <em>{f.numero(dela.length)}</em>
            </div>
            <div className="pnl-kanban-lista">
              {dela.length === 0 ? (
                <div className="pnl-vacio">
                  <b>Sin órdenes aquí</b>
                  <span>{col.vacio}</span>
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


function TarjetaOdt({ odt, alAbrir }) {
  return (
    <button type="button" className="pnl-kanban-card" onClick={() => alAbrir(odt.id)}>
      <b>{odt.descripcion}</b>
      <span>{odt.vehiculoNombre}</span>
      <div className="pnl-kanban-cab">
        <Tag color={colorTipo(odt.tipo)}>{etiqueta('odt_tipo', odt.tipo)}</Tag>
        {odt.estado !== 'abierta' && <Tag color={color('odt_estado', odt.estado)} plano>{etiqueta('odt_estado', odt.estado)}</Tag>}
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
              <td>{f.fechaCorta(o.creadaEn)}</td>
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

function Detalle({ odt, perfil, recargar, alCerrar }) {
  // ------------------------------------------------------------
  // El ciclo de la orden es el MISMO que el de la app y el del servidor:
  //   abierta → en revisión → aprobada → asignada → en ejecución ⇄ pausada
  //   → en calidad → cerrada; cancelada en cualquier punto; cerrada se
  //   reabre a revisión.
  // Cada paso viaja con el estado que se vio (para no pisar a nadie) y una
  // nota que queda en el historial. Asignar responsable y ejecutar (iniciar,
  // pausar, reanudar, entregar) son rutas distintas del cambio de estado, tal
  // como las usa la app en el taller.
  // ------------------------------------------------------------
  const [pendiente, setPendiente] = useState(null) // { a, t, ... }
  const [nota, setNota] = useState('')
  const [notaSolucion, setNotaSolucion] = useState(odt.notaSolucion ?? '')
  const [costo, setCosto] = useState(odt.costo != null ? String(odt.costo) : '')
  const [responsableId, setResponsableId] = useState('')
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [fallo, setFallo] = useState('')
  const gente = useDatos(() => repo.admin.usuarios.listar({}), [])
  // Responsable y eventos de taller: solo cuando la orden ya está en taller.
  const enTaller = ['asignada', 'en_ejecucion', 'pausada', 'en_calidad'].includes(odt.estado)
  const ejecucion = useDatos(
    () => (enTaller ? repo.odts.ejecucion(odt.id) : Promise.resolve(null)),
    [odt.id, odt.estado],
  )
  const responsable = ejecucion.datos?.responsable ?? null
  // La sesión trae correo y nombre, no identificador: se resuelve contra la
  // lista de gente. Iniciar, pausar, reanudar y entregar los hace SOLO el
  // responsable (el servidor responde «no existe» a cualquier otro), igual
  // que en la app: el gestor asigna, revisa y cierra.
  const yo = (gente.datos ?? []).find((p) => p.email && perfil?.correo && p.email.toLowerCase() === perfil.correo.toLowerCase())
  const soyResponsable = Boolean(responsable && yo && (yo.userId ?? yo.id) === responsable.id)

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
    { etiqueta: 'Prioridad', valor: etiqueta('odt_prioridad', odt.prioridad) },
    {
      etiqueta: 'Tipo de falla',
      valor: odt.tipoFalla ? etiqueta('tipo_falla', odt.tipoFalla) : 'No especificado',
    },
    { etiqueta: 'La generó', valor: odt.creadorNombre },
    { etiqueta: 'Creada', valor: f.fechaHora(odt.creadaEn) },
    { etiqueta: 'Ubicación', valor: odt.ubicacion || 'Sin ubicación' },
  ]
  if (responsable) items.push({ etiqueta: 'Responsable', valor: `${responsable.nombre} · desde ${f.fechaHora(responsable.desde)}` })

  if (odt.estado === 'cerrada' && odt.resueltaEn) {
    const minutos = (new Date(odt.resueltaEn) - new Date(odt.creadaEn)) / 60000
    items.push({ etiqueta: 'Resuelta', valor: f.fechaHora(odt.resueltaEn) })
    items.push({ etiqueta: 'Tiempo de resolución', valor: f.duracion(minutos) })
  }

  const pasos = (PASOS_ODT[odt.estado] ?? []).filter((p) => !p.ejecucion || soyResponsable)
  const pasosDelResponsable = (PASOS_ODT[odt.estado] ?? []).filter((p) => p.ejecucion)

  function elegir(paso) {
    if (guardando) return
    setFallo('')
    setErrores({})
    setPendiente(pendiente?.a === paso.a ? null : paso)
  }

  async function confirmar() {
    const err = {}
    if (nota.trim().length < 3) err.nota = 'Escribe una nota de al menos 3 letras: queda en el historial.'
    if (pendiente.a === 'asignar' && !responsableId) err.responsable = 'Elige quién se hace cargo.'
    let monto = null
    if (pendiente.a === 'cerrada') {
      if (!notaSolucion.trim()) err.notaSolucion = 'Cuenta qué se hizo para resolver la falla.'
      const crudo = costo.trim()
      monto = crudo === '' ? null : Number(crudo)
      if (monto !== null && (!Number.isFinite(monto) || monto < 0)) err.costo = 'El costo no puede ser negativo.'
    }
    setErrores(err)
    if (Object.keys(err).length > 0) return

    setGuardando(true)
    setFallo('')
    try {
      if (pendiente.a === 'asignar') {
        await repo.odts.asignarResponsable(odt.id, { usuarioId: responsableId, nota: nota.trim() })
      } else if (pendiente.ejecucion) {
        await repo.odts.ejecutar(odt, pendiente.a, nota.trim())
      } else {
        await repo.odts.cambiarEstado(odt.id, pendiente.a, {
          estadoActual: odt.estado,
          nota: nota.trim(),
          notaSolucion: pendiente.a === 'cerrada' ? notaSolucion.trim() : undefined,
          costo: pendiente.a === 'cerrada' ? monto : undefined,
          moneda: pendiente.a === 'cerrada' && monto != null ? 'USD' : undefined,
        })
      }
      setPendiente(null)
      setNota('')
      await recargar()
    } catch (e) {
      setFallo(e?.message || 'No pudimos guardar el cambio. Inténtalo otra vez.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="pnl-filas">
      <div className="pnl-kanban-cab">
        <Tag color={color('odt_estado', odt.estado)}>{etiqueta('odt_estado', odt.estado)}</Tag>
        <Tag color={colorTipo(odt.tipo)}>{etiqueta('odt_tipo', odt.tipo)}</Tag>
        {odt.prioridad && <Tag color={color('odt_prioridad', odt.prioridad)} plano>{etiqueta('odt_prioridad', odt.prioridad)}</Tag>}
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
        <b>Qué sigue</b>
        <span>{AYUDA_ODT[odt.estado] ?? 'Mueve la orden según vaya avanzando el trabajo.'}</span>
      </div>

      {enTaller && pasosDelResponsable.length > 0 && !soyResponsable && (
        <div className="pnl-fila">
          <Icono nombre="llamar" tam={16} />
          <div className="pnl-fila-txt">
            <b>{pasosDelResponsable.map((p) => p.t).join(', ')}: lo hace {responsable ? responsable.nombre : 'el responsable'} desde su app.</b>
            <span>Como en el taller: quien tiene la orden asignada la inicia, la pausa y la entrega. Tú puedes reasignarla, devolverla a revisión o cancelarla.</span>
          </div>
        </div>
      )}

      {ejecucion.datos?.eventos?.length > 0 && (
        <div className="pnl-fila-txt">
          <b>Taller</b>
          <span>
            {ejecucion.datos.eventos.map((e) => `${f.hora(e.en)} ${e.actor}: ${EVENTO_ODT[e.tipo] ?? e.tipo}${e.nota ? ` · ${e.nota}` : ''}`).join(' → ')}
          </span>
        </div>
      )}

      {pasos.length === 0 ? (
        <span className="pnl-fila-txt">Esta orden está cancelada: no admite más cambios.</span>
      ) : (
        <div className="pnl-kanban-cab" role="group" aria-label="Acciones sobre la orden">
          {pasos.map((p) => (
            <button
              key={p.a}
              type="button"
              className={`pnl-btn${pendiente?.a === p.a ? ' primario' : p.sutil ? ' sutil' : ''}`}
              onClick={() => elegir(p)}
              disabled={guardando}
              aria-pressed={pendiente?.a === p.a}
            >
              {p.t}
            </button>
          ))}
        </div>
      )}

      {pendiente && (
        <>
          {pendiente.a === 'asignar' && (
            <Campo etiqueta="Responsable" error={errores.responsable} ayuda="Quien va a ejecutar el trabajo. Lo verá en su app.">
              <select className="pnl-input" value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
                <option value="">Elige…</option>
                {(gente.datos ?? [])
                  .filter((p) => p.estado === 'active' || p.estado === 'activo' || !p.estado)
                  .map((p) => (
                    <option key={p.id} value={p.userId ?? p.id}>{p.nombre}{p.rolEtiqueta ? ` · ${p.rolEtiqueta}` : ''}</option>
                  ))}
              </select>
            </Campo>
          )}
          {pendiente.a === 'cerrada' && (
            <>
              <Campo etiqueta="Qué se hizo" error={errores.notaSolucion} ayuda="Queda como historial de la unidad.">
                <textarea
                  className="pnl-textarea"
                  rows={3}
                  value={notaSolucion}
                  onChange={(e) => setNotaSolucion(e.target.value)}
                  placeholder="Se cambiaron las pastillas delanteras y se purgó el sistema."
                />
              </Campo>
              <Campo etiqueta="Costo (USD)" error={errores.costo} ayuda="Opcional. Déjalo vacío si aún no lo tienes.">
                <input type="number" className="pnl-input" min="0" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="0" />
              </Campo>
            </>
          )}
          <Campo etiqueta={pendiente.a === 'cerrada' ? 'Nota del cierre' : 'Nota'} error={errores.nota} ayuda="Por qué se da este paso. Queda en el historial de la orden.">
            <textarea className="pnl-textarea" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
          </Campo>
          <div className="pnl-kanban-cab">
            <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>
              {guardando ? 'Guardando…' : pendiente.t}
            </button>
            <button type="button" className="pnl-btn sutil" onClick={() => { setPendiente(null); setErrores({}) }} disabled={guardando}>
              Volver
            </button>
          </div>
        </>
      )}

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
                <em>{f.fechaCorta(r.creadaEn)}</em>
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
