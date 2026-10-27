import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import repo from '../datos/repo'
import { miAsignacion } from '../datos/asignacion-conductor'
import { problemaDelArchivo } from '../datos/cloudinary'
import { estadoVisible } from '../datos/historial-odt'
import { ayudasDeItems, hojaDe, htmlPlanillas, imprimirHtml } from '../datos/planillaInspeccion'
import * as f from '../datos/formato'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import { Cabecera, Modal } from '../comp/ui'
import { useVistaTelefono } from '../comp/movil-navegacion'
import {
  VISTA_RESULTADO, conEstado, contarFallas, cuentaPlanillas, cuentaRespuestas, diaDeFinDeSemana, estadoDeUnidad,
  fechaLarga, fechaLocal, guardarFinDeSemana, hayBloqueada, itemsDe, leerFinDeSemana, medidaDePlanilla,
  planillasVisibles, problemaParaEnviar, textoDeQuien, textoDeResultado, textoFallas, textoMedida, todasHechas,
} from './InspeccionConductorReglas'
import './inspeccion-conductor.css'

// ============================================================
// INSPECCIÓN DEL DÍA — la del conductor, igual que la app (T-167a)
// ------------------------------------------------------------
// Copia de `(driver)/inspeccion.tsx` de FOM-DRIVER: el chequeo de la unidad
// antes de salir. La entrada es la unidad de hoy y «Tus planillas de hoy»: TODAS
// las que tocan hoy, cada una con su estado (T-200); al tocar una pendiente se
// abre su checklist por secciones con la barra de enviar fija abajo (T-202) y,
// al enviar, se vuelve a la lista con esa planilla en «Hecha». Tres respuestas
// por punto —Bien, Observación, Falla—, con nota, foto y «¿crear ODT?» en las
// fallas no críticas. Una falla en un ítem CRÍTICO bloquea la salida y genera
// su ODT; entonces se ofrece «Pedir otra unidad» o «Esperar reparación».
//
// Es UNA por unidad, planilla y día: la que ya está hecha —la hiciera quien la
// hiciera— enseña cuándo, quién y cómo salió. La unidad queda «Lista para
// salir» cuando TODAS las de hoy están hechas. Sábado y domingo, antes del
// formulario, se pregunta si va a trabajar con la unidad.
//
// En el teléfono es la pestaña «Inspección»; en la computadora, la entrada
// «Inspección del día» del menú. Los dos pintan las mismas piezas.
// ============================================================

/**
 * De dónde salen los datos: la colección `inspeccionConductor` de repo.js.
 * Conectado, las rutas de la app; en la demostración, la semilla.
 */
const datos = repo.inspeccionConductor

/** Trazos de tab-icon.tsx de la app que usa esta pantalla. */
const TRAZOS = {
  check: <path d="M20 6 9 17l-5-5" />,
  aviso: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5" /><path d="M12 16.5h.01" strokeWidth="2.6" /></>,
  calendario: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17" /><path d="M8 3v4M16 3v4" /></>,
  inspeccion: <><path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><path d="M9 3h6v4H9z" /><path d="M9.5 13.5 11 15l3.5-3.5" /></>,
  reporte: <><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M15 3v4h4" /><path d="M9 17v-4" /><path d="M12 17v-6" /><path d="M15 17v-2" /></>,
  vacio: <><path d="M4 13l2-7h12l2 7" /><path d="M4 13h5a3 3 0 0 0 6 0h5v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /></>,
  flota: <><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  chevron: <path d="M9 18l6-6-6-6" />,
  volver: <path d="M15 18l-6-6 6-6" />,
  ver: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  cerrar: <path d="M18 6L6 18M6 6l12 12" />,
  camara: <><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.4-2.1A1 1 0 0 1 9 4.5h6a1 1 0 0 1 .9.4L17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" /><path d="M12 15.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></>,
  galeria: <><path d="M4 4h16v16H4z" /><path d="M4 16l4.5-4.5L13 16" /><path d="M13 16l2.5-2.5L20 18" /><path d="M15.5 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" /></>,
}

function IconoApp({ nombre, tam = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[nombre]}
    </svg>
  )
}

/** Pastilla de la app: punto opcional y palabra, teñidos con su tono. */
function Pastilla({ tono, texto, conPunto = false }) {
  return <span className={`ic-pastilla ${tono}`}>{conPunto && <i aria-hidden="true" />}{texto}</span>
}

/** El botón de la app: primario (azul FOM) o secundario (superficie con borde). */
function Boton({ texto, alPulsar, variante = 'primario', ocupado = false, deshabilitado = false, icono, clase = '' }) {
  return (
    <button type="button" className={`ic-boton ${variante}${clase ? ` ${clase}` : ''}`} onClick={alPulsar} disabled={deshabilitado || ocupado} aria-busy={ocupado || undefined}>
      {icono && <IconoApp nombre={icono} tam={18} />}
      {ocupado ? 'Enviando…' : texto}
    </button>
  )
}

/** Estado vacío de la app: ícono en su círculo, título y una línea de qué pasa. */
function Vacio({ titulo, texto }) {
  return (
    <div className="ic-vacio" role="status">
      <span className="ic-vacio-icono"><IconoApp nombre="vacio" tam={22} /></span>
      <b>{titulo}</b>
      {texto && <small>{texto}</small>}
    </div>
  )
}

/** Sábado y domingo: si dijo que trabaja hoy. De lunes a viernes `dia` es `null`. */
function useFinDeSemana(userId) {
  const fecha = fechaLocal()
  const dia = diaDeFinDeSemana()
  const [leida, setLeida] = useState(null)
  useEffect(() => {
    if (dia && userId) setLeida({ fecha, respuesta: leerFinDeSemana(userId, fecha) })
  }, [dia, userId, fecha])
  const deHoy = leida?.fecha === fecha ? leida : null
  return {
    dia,
    lista: !dia || !userId || deHoy !== null,
    respuesta: deHoy?.respuesta ?? null,
    responder: (respuesta) => {
      setLeida({ fecha, respuesta })
      if (userId) guardarFinDeSemana(userId, respuesta, fecha)
    },
  }
}

export default function InspeccionConductor() {
  const sesion = useSesion()
  const perfil = sesion?.perfil
  const esMovil = useVistaTelefono()
  const navegar = useNavigate()
  const yo = useMemo(
    () => (perfil ? { id: perfil.userId ?? perfil.id, nombre: perfil.nombre, empresaId: perfil.empresaId ?? null } : null),
    [perfil],
  )

  // La unidad es la de su asignación vigente, como en Mi unidad.
  const asignaciones = useDatos(() => repo.conductores(), [])
  const asignacion = useMemo(() => miAsignacion(perfil, asignaciones.datos ?? []), [perfil, asignaciones.datos])
  const vehiculoId = asignacion?.vehiculoId ?? null
  const unidad = useDatos(() => (vehiculoId ? repo.vehiculos.obtener(vehiculoId) : Promise.resolve(null)), [vehiculoId])
  const vehiculo = unidad.datos?.id === vehiculoId ? unidad.datos : null

  /**
   * Las planillas de hoy de la unidad con su estado (T-200); `null` mientras se comprueba.
   * `{ nuevo, planillas: [{ id, plantilla, dueToday, hecha }], motivo, error }`.
   */
  const [lista, setLista] = useState(null)
  const cargarLista = useCallback(
    () => datos.planillasDeHoy(vehiculo, { empresaId: yo?.empresaId }),
    // Se vuelve a pedir solo si cambia de unidad o de empresa, no en cada pintado.
    [vehiculo?.id, yo?.empresaId],
  )
  useEffect(() => {
    if (!vehiculo) return undefined
    let vivo = true
    setLista(null)
    cargarLista()
      .then((l) => vivo && setLista(l))
      .catch((e) => vivo && setLista({ nuevo: true, planillas: [], motivo: null, error: e }))
    return () => { vivo = false }
  }, [vehiculo?.id, cargarLista])

  const [respuestas, setRespuestas] = useState({})
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  /** Lo que se acaba de enviar desde aquí: la planilla, las ODT generadas y cómo fueron las fotos. */
  const [enviado, setEnviado] = useState(null)
  const [avisoHecha, setAvisoHecha] = useState(null)
  /** La planilla abierta (su checklist) por su id; sin ninguna se ve «Tus planillas de hoy». */
  const [abiertaId, setAbiertaId] = useState(null)
  /** La planilla hecha cuyo resultado se está viendo. */
  const [verId, setVerId] = useState(null)
  const finDeSemana = useFinDeSemana(yo?.id)

  // Las vistas previas de las fotos se sueltan al salir de la pantalla.
  const fotosVivas = useRef(new Set())
  useEffect(() => () => fotosVivas.current.forEach((u) => URL.revokeObjectURL(u)), [])

  const planillas = useMemo(() => planillasVisibles(lista?.planillas), [lista])
  const activa = planillas.find((p) => p.id === abiertaId) ?? null
  const viendo = planillas.find((p) => p.id === verId) ?? null
  const items = useMemo(() => itemsDe(activa?.plantilla), [activa])
  const medida = useMemo(() => medidaDePlanilla(activa?.plantilla), [activa])
  const respondidos = items.filter((it) => respuestas[it.id]).length
  const total = items.length
  const fallas = items.filter((it) => respuestas[it.id]?.estado === 'falla').length
  /** Cuántos puntos hay respondidos en las que aún no se envían: para decir «En curso». */
  const enCurso = planillas.filter((p) => !p.hecha).reduce((n, p) => n + itemsDe(p.plantilla).filter((it) => respuestas[it.id]).length, 0)

  function responder(respuesta) {
    setRespuestas((previas) => ({ ...previas, [respuesta.itemId]: respuesta }))
  }

  function abrir(id) {
    setAbiertaId(id)
    if (id) {
      setEnviado(null)
      setAvisoHecha(null)
    }
    window.scrollTo?.({ top: 0 })
  }

  /** Marca una planilla como hecha en la lista, con lo que se sepa de su inspección. */
  function marcarHecha(id, hecha) {
    setLista((l) => ({ ...l, planillas: l.planillas.map((p) => (p.id === id ? { ...p, hecha: p.hecha ?? hecha } : p)) }))
  }

  async function enviar() {
    if (!vehiculo || !activa || !yo) return
    setError(null)
    const problema = problemaParaEnviar(items, respuestas)
    if (problema) {
      setError(problema)
      return
    }
    setEnviando(true)
    try {
      const respondidas = items.map((it) => respuestas[it.id]).map((r) => ({ ...r, fotos: r.fotos?.map((x) => x.archivo) }))
      const r = await datos.enviar(
        { vehiculo, plantilla: activa.plantilla, respuestas: respondidas, ubicacion: vehiculo.ubicacionTexto ?? '' },
        yo,
      )
      // Vuelve a la lista con esa planilla en «Hecha»: no se ofrece otra vez hoy.
      setEnviado({ ...r, planillaId: activa.id, nombre: activa.plantilla.nombre })
      marcarHecha(activa.id, { inspeccion: r.detalle, detalle: r.detalle })
      setRespuestas((previas) => Object.fromEntries(Object.entries(previas).filter(([id]) => !items.some((it) => it.id === id))))
      abrir(null)
    } catch (e) {
      if (e?.yaHecha) {
        // Alguien se adelantó: se recarga la lista para ver esa planilla como hecha.
        const nueva = await cargarLista().catch(() => null)
        if (nueva) setLista(nueva)
        marcarHecha(activa.id, { inspeccion: null, detalle: null })
        setEnviado(null)
        setAvisoHecha(e.message)
        abrir(null)
      } else {
        setError(e?.message || 'No se pudo enviar la inspección.')
      }
    } finally {
      setEnviando(false)
    }
  }

  const cargando = !sesion || asignaciones.estado === 'cargando'
    || (vehiculoId && (unidad.estado === 'cargando' || !vehiculo || !lista))
  const listas = todasHechas(planillas)
  // Sábado o domingo con planillas por hacer: primero la pregunta y, si trabaja, el formulario.
  const preguntar = Boolean(finDeSemana.dia) && finDeSemana.lista && finDeSemana.respuesta !== 'trabajo'
  const errorCarga = asignaciones.error ?? unidad.error ?? lista?.error

  // La unidad de hoy, para la cabecera de la entrada.
  const nombreUnidad = vehiculo ? `${vehiculo.marca ?? ''} ${vehiculo.modelo ?? ''}`.trim() || 'Tu unidad' : 'Tu unidad'
  const detalleUnidad = vehiculo
    ? [vehiculo.numero !== '—' ? vehiculo.numero : vehiculo.alias, vehiculo.placa !== '—' ? vehiculo.placa : null].filter(Boolean).join(' · ')
    : ''
  const nombrePlanilla = activa?.plantilla.nombre || 'Inspección preoperacional'

  // «Tus planillas de hoy»: la unidad, lo que se acaba de enviar y cada planilla con su estado.
  const vistaLista = (
    <>
      <UnidadDeHoy nombre={nombreUnidad} detalle={detalleUnidad} estado={estadoDeUnidad(planillas, enCurso)} />
      {avisoHecha && <p className="ic-aviso-caja aviso" role="status">{avisoHecha}</p>}
      {enviado && <EnviadaAhora enviado={enviado} yo={yo} alVer={() => setVerId(enviado.planillaId)} alAbrirOdt={() => navegar('/panel/mantenimiento')} />}
      {hayBloqueada(planillas) && <AccionesDeBloqueo vehiculoId={vehiculoId} />}
      <section className="ic-planillas" aria-label="Tus planillas de hoy">
        <RotuloPlanillas {...cuentaPlanillas(planillas)} />
        {planillas.map((p) => {
          const hecha = p.hecha ? vistaDeHecha(p.hecha, p.plantilla) : null
          return (
            <PlanillaDeHoy
              key={p.id}
              nombre={p.plantilla.nombre}
              medida={medidaDePlanilla(p.plantilla)}
              respondidos={itemsDe(p.plantilla).filter((it) => respuestas[it.id]).length}
              hecha={hecha}
              alAbrir={() => (p.hecha ? hecha.ver && setVerId(p.id) : abrir(p.id))}
            />
          )
        })}
      </section>
      {listas ? (
        <>
          <p className="ic-nota">La próxima la puedes hacer mañana.</p>
          <Boton texto="Ir al inicio" variante={hayBloqueada(planillas) ? 'secundario' : 'primario'} alPulsar={() => navegar('/panel')} />
        </>
      ) : (
        /* «Revisa tu unidad antes de salir» ya es la bajada del título: aquí no se repite. */
        <p className="ic-consejo"><IconoApp nombre="aviso" tam={16} />Si algo crítico falla, detenemos la salida y avisamos a tu empresa. Que llegues bien.</p>
      )}
      {/* No se pudo saber si ya está hecha: se deja hacer, pero se dice. */}
      {lista?.motivo && <p className="ic-nota">{lista.motivo}</p>}
      <Resultado abierta={Boolean(viendo)} inspeccion={viendo?.hecha?.inspeccion} detalleLeido={viendo?.hecha?.detalle} plantilla={viendo?.plantilla} alCerrar={() => setVerId(null)} />
    </>
  )

  let contenido
  let enFormulario = false
  if (cargando && !(asignaciones.estado === 'ok' && !asignacion)) {
    contenido = <Esqueleto />
  } else if (!asignacion) {
    contenido = errorCarga
      ? <Vacio titulo="No pudimos cargar la inspección" texto={errorCarga.message} />
      : <Vacio titulo="Aún no tienes un vehículo asignado" texto="La inspección es de tu unidad. Cuando tu administrador te asigne tu vehículo, cargamos su checklist para que la hagas antes de salir." />
  } else if (errorCarga) {
    contenido = <Vacio titulo="No pudimos cargar la inspección" texto={errorCarga.message} />
  } else if (listas) {
    contenido = vistaLista
  } else if (planillas.length === 0) {
    contenido = lista?.nuevo
      ? <Vacio titulo="Hoy no te toca ninguna planilla" texto="Cuando una planilla te toque, aparece aquí el día que corresponda." />
      : (
        <Vacio
          titulo="Sin formato de inspección"
          texto={`${vehiculo ? `Unidad ${vehiculo.placa ?? vehiculo.id}: t` : 'T'}u empresa todavía no publicó un formato de inspección para este tipo de unidad. Avísale a tu supervisor: se publica desde la web, en Inspecciones › Plantillas.`}
        />
      )
  } else if (preguntar) {
    contenido = <PreguntaFinDeSemana dia={finDeSemana.dia} respuesta={finDeSemana.respuesta} alResponder={finDeSemana.responder} />
  } else if (!activa || activa.hecha) {
    contenido = vistaLista
  } else {
    // La planilla abierta: secciones y, fija abajo, la barra de enviar.
    enFormulario = true
    contenido = (
      <>
        <button type="button" className="ic-volver" onClick={() => abrir(null)} aria-label="Volver a tus planillas de hoy">
          <IconoApp nombre="volver" tam={18} />Tus planillas de hoy
        </button>
        <header className="ic-planilla-cab">
          <h2>{nombrePlanilla}</h2>
          <small>{[nombreUnidad, detalleUnidad].filter(Boolean).join(' · ')}</small>
        </header>

        {activa.plantilla.categorias.map((categoria) => {
          const hechos = categoria.items.filter((it) => respuestas[it.id]).length
          const completa = hechos === categoria.items.length
          return (
            <section key={categoria.nombre} className="ic-tarjeta ic-seccion" aria-label={categoria.nombre}>
              <div className="ic-seccion-cab">
                <h3 className="ic-overline">{categoria.nombre}</h3>
                <Pastilla tono={completa ? 'exito' : 'neutro'} texto={completa ? 'Lista' : `${hechos} de ${categoria.items.length}`} conPunto={completa} />
              </div>
              {categoria.items.map((item) => (
                <Pregunta key={item.id} item={item} respuesta={respuestas[item.id]} alCambiar={responder} fotosVivas={fotosVivas.current} />
              ))}
            </section>
          )
        })}

        {/* No se pudo saber si ya está hecha: se deja hacer, pero se dice. */}
        {lista?.motivo && <p className="ic-nota">{lista.motivo}</p>}

        {/* La barra de enviar, fija sobre las pestañas: avance y botón. */}
        <div className="ic-enviar">
          <div className="ic-enviar-caja">
            {error && <p className="ic-error" role="alert">{error}</p>}
            <div className="ic-barra" role="progressbar" aria-label="Puntos revisados" aria-valuemin={0} aria-valuemax={total} aria-valuenow={respondidos}>
              <i className={fallas > 0 ? 'aviso' : 'exito'} style={{ width: `${total ? (respondidos / total) * 100 : 0}%` }} />
            </div>
            <div className="ic-enviar-fila">
              <div className="ic-enviar-cuenta">
                <b>{`${respondidos} de ${total}`}</b>
                <small className={fallas > 0 ? 'ic-rojo' : respondidos === total ? 'ic-verde' : ''}>
                  {fallas > 0 ? `${fallas} con falla` : respondidos === total ? 'Todo revisado' : `Faltan ${total - respondidos}`}
                </small>
              </div>
              <Boton texto="Enviar" icono="check" clase="ic-enviar-boton" alPulsar={enviar} ocupado={enviando} deshabilitado={respondidos === 0} />
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className={`ic${esMovil ? ' ic-movil' : ''}`}>
      {esMovil ? (
        !enFormulario && (
          <header className="ic-titulo">
            <h1>Inspección</h1>
            <p>Revisa tu unidad antes de salir.</p>
          </header>
        )
      ) : (
        <Cabecera titulo="Inspección del día" bajada="Revisa tu unidad antes de salir." />
      )}
      <div className={`ic-cuerpo${enFormulario ? ' ic-cuerpo-formulario' : ''}`}>{contenido}</div>
    </div>
  )
}

/** El esqueleto de la app mientras carga: la unidad, el rótulo y la tarjeta de la planilla. */
function Esqueleto() {
  return (
    <div className="ic-esqueleto" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Cargando…</span>
      <div className="ic-tarjeta"><i style={{ width: '35%', height: 12 }} /><i style={{ width: '70%', height: 16 }} /></div>
      <i style={{ width: '45%', height: 12 }} />
      <div className="ic-tarjeta"><i style={{ width: '60%', height: 16 }} /><i style={{ width: '85%', height: 12 }} /></div>
    </div>
  )
}

/** La unidad de hoy (inspeccion-planillas.tsx): fecha, marca y modelo, código y placa, y cómo va. */
function UnidadDeHoy({ nombre, detalle, estado }) {
  return (
    <section className="ic-tarjeta ic-unidad" aria-label="Tu unidad hoy">
      <span className="ic-icono redondo"><IconoApp nombre="flota" tam={22} /></span>
      <div className="ic-unidad-txt">
        <small>{fechaLarga()}</small>
        <b>{nombre}</b>
        {detalle && <span>{detalle}</span>}
        <span className="ic-unidad-estado"><Pastilla tono={estado.tono} texto={estado.texto} conPunto /></span>
      </div>
    </section>
  )
}

/** El rótulo de la lista: «Tus planillas de hoy» y cuántas van hechas. */
function RotuloPlanillas({ hechas, total }) {
  return (
    <div className="ic-rotulo-lista">
      <h2 className="ic-overline">Tus planillas de hoy</h2>
      <small>{`${hechas} de ${total} ${total === 1 ? 'hecha' : 'hechas'}`}</small>
    </div>
  )
}

/**
 * Una planilla de hoy (inspeccion-planillas.tsx): nombre, tamaño y si está
 * pendiente, en curso o hecha. Hecha con su resultado se puede ver; si solo se
 * sabe que existe (otra persona se adelantó), dice «Hecha hoy».
 */
function PlanillaDeHoy({ nombre, medida, respondidos, hecha = null, alAbrir }) {
  const enCurso = !hecha && respondidos > 0
  const accion = hecha ? (hecha.ver ? 'Ver resultado' : 'Hecha hoy') : enCurso ? 'Seguir' : 'Empezar'
  const tono = hecha ? hecha.tono : 'primario'
  return (
    <button type="button" className="ic-tarjeta ic-planilla" onClick={alAbrir} aria-label={`${accion}: ${nombre}`}>
      <span className="ic-planilla-fila">
        <span className={`ic-icono ${tono}`}><IconoApp nombre={hecha ? (hecha.tono === 'peligro' ? 'aviso' : 'check') : 'inspeccion'} tam={22} /></span>
        <span className="ic-planilla-txt">
          <b>{nombre}</b>
          <small>{textoMedida(medida)}</small>
        </span>
        <IconoApp nombre="chevron" tam={20} />
      </span>
      {enCurso && (
        <span className="ic-planilla-avance">
          <span className="ic-barra fina"><i className="primario" style={{ width: `${(respondidos / Math.max(1, medida.puntos)) * 100}%` }} /></span>
          <small>{`${respondidos} de ${medida.puntos} revisados`}</small>
        </span>
      )}
      <span className="ic-planilla-pie">
        {hecha
          ? <Pastilla tono={hecha.tono} texto={hecha.hora ? `${hecha.texto} · ${hecha.hora}` : hecha.texto} conPunto />
          : <Pastilla tono={enCurso ? 'primario' : 'aviso'} texto={enCurso ? 'En curso' : 'Pendiente'} conPunto />}
        <span className={`ic-planilla-accion${hecha ? '' : ' ic-azul'}`}>{accion}</span>
      </span>
    </button>
  )
}

/** Las tres respuestas (§4.1), en palabras de la calle, como inspection-item.tsx. */
const RESPUESTAS = [
  ['conforme', 'Bien', 'check', 'exito'],
  ['observacion', 'Observación', 'ver', 'aviso'],
  ['falla', 'Falla', 'cerrar', 'peligro'],
]

/**
 * UN PUNTO del checklist (inspection-item.tsx), pensado para el pulgar:
 * nombre, ayuda, si es crítico (franja y pastilla rojas) y tres respuestas
 * grandes con ícono encima de la palabra. En observación, qué se vio; en
 * falla, un recuadro con la nota, la foto y, si no es crítico, «¿crear ODT?».
 */
function Pregunta({ item, respuesta, alCambiar, fotosVivas }) {
  const estado = respuesta?.estado
  const elegida = RESPUESTAS.find(([valor]) => valor === estado)
  const [errorFoto, setErrorFoto] = useState(null)
  const [fotoAbierta, setFotoAbierta] = useState(null)
  const cambiar = (cambios) => alCambiar({ ...respuesta, itemId: item.id, ...cambios })

  function agregarFotos(lista) {
    const nuevas = []
    for (const archivo of lista ?? []) {
      const mal = problemaDelArchivo(archivo)
      if (mal) {
        setErrorFoto(mal)
        continue
      }
      const url = URL.createObjectURL(archivo)
      fotosVivas.add(url)
      nuevas.push({ archivo, url })
    }
    if (nuevas.length) {
      setErrorFoto(null)
      cambiar({ fotos: [...(respuesta?.fotos ?? []), ...nuevas] })
    }
  }
  function quitarFoto(n) {
    const foto = respuesta.fotos[n]
    URL.revokeObjectURL(foto.url)
    fotosVivas.delete(foto.url)
    cambiar({ fotos: respuesta.fotos.filter((_, i) => i !== n) })
  }

  return (
    <div className={`ic-item${item.critico ? ' critico' : ''}`}>
      <div className="ic-item-cab">
        <div className="ic-item-txt">
          {item.critico && <span className="ic-critico"><IconoApp nombre="aviso" tam={12} />Crítico</span>}
          <span className="ic-item-nombre">{item.nombre}</span>
          {item.ayuda && <small className="ic-ayuda">{item.ayuda}</small>}
        </div>
        {/* Ya respondido: la marca de su color, para repasar la lista de un vistazo. */}
        {elegida && <span className={`ic-marca ${elegida[3]}`} aria-label={`Respondido: ${elegida[1]}`}><IconoApp nombre={elegida[2]} tam={14} /></span>}
      </div>

      <div className="ic-respuestas" role="group" aria-label={`Respuesta para ${item.nombre}`}>
        {RESPUESTAS.map(([valor, texto, icono, tono]) => (
          <button key={valor} type="button" className={`ic-respuesta ${tono}${estado === valor ? ' on' : ''}`} aria-pressed={estado === valor}
            onClick={() => alCambiar(conEstado(respuesta, item.id, valor))}>
            <IconoApp nombre={icono} tam={20} />
            <span>{texto}</span>
          </button>
        ))}
      </div>

      {/* Observación o falla: el recuadro de lo que se vio, teñido de su tono. */}
      {(estado === 'observacion' || estado === 'falla') && (
        <div className={`ic-panel ${estado === 'falla' ? 'peligro' : 'aviso'}`}>
          {estado === 'falla' && item.critico && (
            <p className="ic-panel-critico"><IconoApp nombre="aviso" tam={18} />Punto crítico: la salida queda bloqueada y se crea la ODT. La foto es obligatoria.</p>
          )}
          <label className="ic-campo">
            <span>¿Qué viste? (opcional)</span>
            <textarea
              value={respuesta?.nota ?? ''}
              onChange={(e) => cambiar({ nota: e.target.value })}
              placeholder={estado === 'falla' ? 'Ej. la llanta delantera derecha está muy gastada…' : 'Ej. el limpiaparabrisas deja rayas…'}
              maxLength={1000}
              rows={3}
            />
          </label>

          {estado === 'falla' && (
            <>
              <div className="ic-fotos">
                <span className="ic-rotulo">{item.critico ? 'Foto (obligatoria)' : 'Foto'}</span>
                <div className="ic-fotos-acciones">
                  {/* En el teléfono «Tomar foto» abre la cámara; en la computadora, el selector de archivos. */}
                  <label className="ic-azulejo">
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => { agregarFotos(e.target.files); e.target.value = '' }} />
                    <IconoApp nombre="camara" tam={20} />Tomar foto
                  </label>
                  <label className="ic-azulejo">
                    <input type="file" accept="image/*" multiple onChange={(e) => { agregarFotos(e.target.files); e.target.value = '' }} />
                    <IconoApp nombre="galeria" tam={20} />Galería
                  </label>
                </div>
                {respuesta?.fotos?.length > 0 && (
                  <div className="ic-miniaturas">
                    {respuesta.fotos.map((foto, n) => (
                      <div key={foto.url} className="ic-miniatura">
                        <button type="button" className="ic-miniatura-ver" onClick={() => setFotoAbierta(foto.url)} aria-label="Ver foto a pantalla completa">
                          <img src={foto.url} alt="" />
                        </button>
                        <button type="button" className="ic-miniatura-quitar" onClick={() => quitarFoto(n)} aria-label="Quitar foto">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {errorFoto && <p className="ic-error" role="alert">{errorFoto}</p>}
              </div>
              {!item.critico && (
                <div className="ic-odt">
                  <span className="ic-rotulo">¿Crear ODT para repararlo?</span>
                  <div className="ic-toggle" role="group" aria-label="¿Crear ODT?">
                    <button type="button" className={`ic-opcion primario${respuesta?.crearOdt === true ? ' on' : ''}`} aria-pressed={respuesta?.crearOdt === true} onClick={() => cambiar({ crearOdt: true })}><span>Sí, crear ODT</span></button>
                    <button type="button" className={`ic-opcion neutro${respuesta?.crearOdt === false ? ' on' : ''}`} aria-pressed={respuesta?.crearOdt === false} onClick={() => cambiar({ crearOdt: false })}><span>Solo registrar</span></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Modal titulo="Foto" abierto={Boolean(fotoAbierta)} alCerrar={() => setFotoAbierta(null)} ancho={720}>
        {fotoAbierta && <img className="ic-foto-grande" src={fotoAbierta} alt={`Evidencia de ${item.nombre}`} />}
      </Modal>
    </div>
  )
}

/**
 * SÁBADO Y DOMINGO (inspeccion-fin-de-semana.tsx): la pregunta o, si dijo que
 * no trabaja, el «hoy no te toca» con la vuelta atrás.
 */
function PreguntaFinDeSemana({ dia, respuesta, alResponder }) {
  const libre = respuesta === 'no_trabajo'
  return (
    <section className="ic-tarjeta ic-hecha">
      <div className="ic-hecha-cab">
        <span className={`ic-circulo ${libre ? 'exito' : 'info'}`}><IconoApp nombre={libre ? 'check' : 'calendario'} tam={22} /></span>
        <h2 className="ic-subtitulo">{libre ? 'Listo, hoy no te toca la inspección.' : `Hoy es ${dia}. ¿Vas a trabajar con la unidad?`}</h2>
      </div>
      {libre ? (
        <>
          <p className="ic-texto">Si sales con la unidad, vuelve aquí y hazla.</p>
          <Boton texto="Cambié de idea, voy a trabajar" variante="secundario" alPulsar={() => alResponder('trabajo')} />
        </>
      ) : (
        <>
          <p className="ic-texto">El fin de semana la inspección solo hace falta si sales con la unidad.</p>
          <div className="ic-acciones">
            <Boton texto="Sí, voy a trabajar" alPulsar={() => alResponder('trabajo')} />
            <Boton texto="No trabajo hoy" variante="secundario" alPulsar={() => alResponder('no_trabajo')} />
          </div>
        </>
      )}
    </section>
  )
}

/** Una planilla hecha en el vocabulario de la lista: tono y palabra del resultado, la hora y si se puede ver. */
function vistaDeHecha(hecha) {
  const inspeccion = hecha.inspeccion
  const vista = inspeccion ? VISTA_RESULTADO[inspeccion.resultado] ?? VISTA_RESULTADO.pendiente : null
  return {
    tono: vista?.tono ?? 'exito',
    texto: vista?.corto ?? 'Hecha',
    hora: inspeccion?.enviadaEn ? f.hora(inspeccion.enviadaEn) : null,
    ver: Boolean(inspeccion),
  }
}

/**
 * LA PLANILLA QUE SE ACABA DE ENVIAR (HechaHoyView): cómo salió —con las cifras
 * Bien / Observación / Falla—, lo que toca según el resultado, las fotos que no
 * subieron y las ODT que se generaron. Va sobre la lista, donde esa planilla ya
 * figura como «Hecha».
 */
function EnviadaAhora({ enviado, yo, alVer, alAbrirOdt }) {
  const inspeccion = enviado.detalle
  const resultado = inspeccion?.resultado
  const vista = VISTA_RESULTADO[resultado] ?? VISTA_RESULTADO.pendiente
  const bloqueada = resultado === 'bloqueada'
  const tono = bloqueada ? 'peligro' : vista.tono
  const quien = textoDeQuien(inspeccion, yo, inspeccion?.enviadaEn ? f.hora(inspeccion.enviadaEn) : null)
  const detalle = textoDeResultado(resultado)
  const ordenes = enviado.resultado?.ordenesGeneradas ?? []
  const fotos = enviado.fotos
  const respuestas = inspeccion?.respuestas ?? []
  const cuenta = respuestas.length ? cuentaRespuestas(respuestas) : null

  return (
    <>
      <section className={`ic-tarjeta ic-hecha ${tono}`} aria-label="Planilla enviada">
        <div className="ic-hecha-cab">
          <span className={`ic-circulo grande ${tono}`}><IconoApp nombre={bloqueada ? 'aviso' : 'check'} tam={26} /></span>
          <div className="ic-hecha-txt">
            <h2 className="ic-subtitulo">{`Enviaste «${enviado.nombre}»`}</h2>
            {quien && <small>{quien}</small>}
            <Pastilla tono={vista.tono} texto={vista.largo} conPunto />
          </div>
        </div>
        {cuenta && (
          <div className="ic-cifras">
            {[['Bien', cuenta.bien, 'exito'], ['Observación', cuenta.observacion, 'aviso'], ['Falla', cuenta.falla, 'peligro']].map(([texto, n, t]) => (
              <div key={texto} className={`ic-cifra ${n > 0 ? t : ''}`}><b>{n}</b><small>{texto}</small></div>
            ))}
          </div>
        )}
        <Boton texto="Ver resultado" icono="ver" variante="secundario" alPulsar={alVer} />
      </section>

      {detalle && <p className="ic-texto">{detalle}</p>}

      {fotos?.fallidas > 0 && (
        <p className="ic-aviso-caja aviso" role="status">
          {`La inspección quedó guardada, pero ${fotos.fallidas === 1 ? 'una foto no se pudo subir' : `${fotos.fallidas} fotos no se pudieron subir`}. ${fotos.motivo ?? ''}`.trim()}
        </p>
      )}
      {fotos?.enDemo > 0 && (
        <p className="ic-aviso-caja info" role="status">
          {`Es la demostración: ${fotos.enDemo === 1 ? 'la foto adjunta no se guarda' : `las ${fotos.enDemo} fotos adjuntas no se guardan`} en la nube.`}
        </p>
      )}

      {/* ODT generadas por las fallas. */}
      {ordenes.length > 0 && (
        <section className="ic-ordenes" aria-label="ODT generadas">
          <h2 className="ic-overline">{`ODT generadas (${ordenes.length})`}</h2>
          {ordenes.map((ot) => (
            <button key={ot.id} type="button" className="ic-tarjeta ic-orden" onClick={alAbrirOdt} aria-label={`Abrir la ODT ${ot.id} en Mantenimiento`}>
              <span className="ic-orden-fila">
                <b>{ot.id}</b>
                <Pastilla tono="aviso" texto={estadoVisible(ot.estado).etiqueta} />
              </span>
              {ot.descripcion && <small>{ot.descripcion}</small>}
              <span className="ic-azul ic-caption">Tócala para verla en Mantenimiento</span>
            </button>
          ))}
        </section>
      )}
    </>
  )
}

/** Con una planilla bloqueada la unidad no sale: «Pedir otra unidad» o «Esperar reparación». */
function AccionesDeBloqueo({ vehiculoId }) {
  const [mensaje, setMensaje] = useState(null)
  const [pidiendo, setPidiendo] = useState(false)

  async function pedirOtraUnidad() {
    setPidiendo(true)
    try {
      await datos.pedirOtraUnidad(vehiculoId)
      setMensaje({ tono: 'exito', titulo: 'Solicitud enviada', texto: 'Tu supervisor recibió la solicitud de otra unidad.' })
    } catch (e) {
      setMensaje({ tono: 'peligro', titulo: 'No se pudo pedir otra unidad', texto: e?.message || 'Intenta de nuevo.' })
    } finally {
      setPidiendo(false)
    }
  }

  return (
    <>
      {mensaje && (
        <p className={`ic-aviso-caja ${mensaje.tono}`} role={mensaje.tono === 'peligro' ? 'alert' : 'status'}>
          <b>{mensaje.titulo}</b> {mensaje.texto}
        </p>
      )}
      <div className="ic-acciones">
        <Boton texto="Pedir otra unidad" alPulsar={pedirOtraUnidad} ocupado={pidiendo} />
        <Boton texto="Esperar reparación" variante="secundario"
          alPulsar={() => setMensaje({ tono: 'info', titulo: 'Entendido.', texto: 'Te avisaremos cuando tu unidad esté reparada y lista.' })} />
      </div>
    </>
  )
}

/**
 * RESULTADO DE INSPECCIÓN (inspecciones-resultado.tsx): quién, cuándo y
 * dónde, y lo que se marcó mal. Los conformes solo se cuentan.
 */
function Resultado({ abierta, inspeccion, detalleLeido, plantilla, alCerrar }) {
  const [leido, setLeido] = useState({ estado: 'listo', detalle: null })
  const [imprimiendo, setImprimiendo] = useState(false)
  const [errorImpresion, setErrorImpresion] = useState(null)
  // Lo leído de otra inspección (la planilla que se miró antes) no vale para esta.
  const detalle = detalleLeido?.id === inspeccion?.id ? detalleLeido : leido.detalle?.id === inspeccion?.id ? leido.detalle : null

  useEffect(() => {
    if (!abierta || !inspeccion || detalleLeido?.id === inspeccion.id) return undefined
    let vivo = true
    setLeido({ estado: 'cargando', detalle: null })
    datos.detalle(inspeccion.id)
      .then((d) => vivo && setLeido({ estado: 'listo', detalle: d }))
      .catch(() => vivo && setLeido({ estado: 'error', detalle: null }))
    return () => { vivo = false }
  }, [abierta, inspeccion, detalleLeido])

  if (!inspeccion) return null
  // Con el detalle leído se sabe quién, dónde y a qué hora; antes solo lo que dijo la lista.
  const cab = detalle ?? inspeccion
  const vista = VISTA_RESULTADO[inspeccion.resultado] ?? VISTA_RESULTADO.pendiente
  const respuestas = detalle?.respuestas ?? []
  const malas = respuestas.filter((r) => r.estado !== 'conforme')
  const conformes = respuestas.length - malas.length
  const cuenta = contarFallas(respuestas)
  const datosFila = [
    ['Conductor', cab.conductor || '—'],
    ['Fecha y hora', [f.fecha(cab.fecha), cab.enviadaEn ? f.hora(cab.enviadaEn) : null].filter(Boolean).join(' · ')],
    ['Ubicación', cab.ubicacion || 'Sin ubicación'],
    ['Formato', cab.formato],
  ]
  const ITEM = { conforme: ['Conforme', 'exito'], observacion: ['Observación', 'aviso'], falla: ['Falla', 'peligro'] }

  /** La hoja impresa de la web (planillaInspeccion.js), con las viñetas del formato. */
  async function imprimir() {
    if (imprimiendo || !detalle) return
    setImprimiendo(true)
    setErrorImpresion(null)
    try {
      const hoja = hojaDe({
        id: inspeccion.id,
        vehiculoNombre: [inspeccion.unidad, inspeccion.placa].filter(Boolean).join(' · '),
        plantilla: inspeccion.formato,
        clase: inspeccion.clase,
        conductorNombre: cab.conductor,
        fecha: inspeccion.fecha,
        ubicacion: cab.ubicacion,
        resultado: inspeccion.resultado,
      }, respuestas)
      await imprimirHtml(htmlPlanillas([hoja], ayudasDeItems(itemsDe(plantilla))))
    } catch (e) {
      setErrorImpresion(e?.message || 'No pudimos armar el PDF.')
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <Modal titulo="Resultado de inspección" abierto={abierta} alCerrar={alCerrar} ancho={560}>
      <div className="ic ic-resultado">
        <div className="ic-resultado-cab">
          <b className="ic-subtitulo">{[inspeccion.unidad, inspeccion.placa].filter(Boolean).join(' · ')}</b>
          <Pastilla tono={vista.tono} texto={vista.largo} conPunto />
        </div>
        <dl className="ic-datos">
          {datosFila.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        {leido.estado === 'error' && !detalle ? (
          <p className="ic-error" role="alert">No pudimos cargar las respuestas de esta inspección.</p>
        ) : !detalle ? (
          <Esqueleto />
        ) : (
          <>
            <div className="ic-resumen">
              <b className={cuenta.criticas > 0 ? 'ic-rojo' : ''}>{textoFallas(cuenta)}</b>
              <small>{respuestas.length === 0 ? 'Sin respuestas disponibles.' : `${conformes} ${conformes === 1 ? 'punto conforme' : 'puntos conformes'} de ${respuestas.length}`}</small>
            </div>
            {malas.map((r) => (
              <div key={r.id} className="ic-mala">
                <div>
                  <b>{r.nombre}</b>
                  <small>{[r.categoria || 'General', r.critico ? 'Punto crítico' : null].filter(Boolean).join(' · ')}</small>
                  {r.nota && <span>{r.nota}</span>}
                </div>
                <Pastilla tono={ITEM[r.estado][1]} texto={ITEM[r.estado][0]} />
              </div>
            ))}
          </>
        )}
        <p className="ic-nota">Respuestas registradas por el conductor. El supervisor no modifica el resultado.</p>
        {errorImpresion && <p className="ic-error" role="alert">{errorImpresion}</p>}
        <Boton texto="Imprimir" icono="reporte" variante="secundario" alPulsar={imprimir} deshabilitado={!detalle || imprimiendo} />
      </div>
    </Modal>
  )
}
