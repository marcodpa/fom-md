import { useEffect, useMemo, useRef, useState } from 'react'
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
  VISTA_RESULTADO, conEstado, contarFallas, diaDeFinDeSemana, esMia, fechaLocal, guardarFinDeSemana, itemsDe,
  leerFinDeSemana, problemaParaEnviar, textoDeResultado, textoFallas,
} from './InspeccionConductorReglas'
import './inspeccion-conductor.css'

// ============================================================
// INSPECCIÓN DEL DÍA — la del conductor, igual que la app (T-167a)
// ------------------------------------------------------------
// Copia de `(driver)/inspeccion.tsx` de FOM-DRIVER: el chequeo de la unidad
// antes de salir. Tres respuestas por ítem —Conforme, Observación, Falla—, con
// nota, foto y «¿crear ODT?» en las fallas no críticas. Una falla en un ítem
// CRÍTICO bloquea la salida y genera su ODT; entonces se ofrece «Pedir otra
// unidad» o «Esperar reparación».
//
// Es UNA por unidad y día: si la unidad ya tiene la de hoy —la hiciera quien
// la hiciera—, en vez del formulario se ve cuándo, quién y cómo salió. Sábado
// y domingo, antes del formulario, se pregunta si va a trabajar con la unidad.
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
}
/** Las tres respuestas caben enteras en un teléfono de 390 px: 13 px de letra, 6 entre botones y 2 a los lados. */
const TOGGLE_APRETADO = { gap: 6 }
const OPCION_APRETADA = { fontSize: 13, paddingInline: 2 }

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
function Boton({ texto, alPulsar, variante = 'primario', ocupado = false, deshabilitado = false, icono }) {
  return (
    <button type="button" className={`ic-boton ${variante}`} onClick={alPulsar} disabled={deshabilitado || ocupado} aria-busy={ocupado || undefined}>
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
  const plantilla = useDatos(() => (vehiculo ? datos.plantilla(vehiculo) : Promise.resolve(null)), [vehiculo?.id])

  /** La diaria de hoy de la unidad; `null` mientras se comprueba. */
  const [diaria, setDiaria] = useState(null)
  useEffect(() => {
    if (!vehiculoId) return undefined
    let vivo = true
    setDiaria(null)
    datos.diariaDeHoy(vehiculoId, { empresaId: yo?.empresaId })
      .then((d) => vivo && setDiaria(d))
      .catch(() => vivo && setDiaria({ estado: 'sin_comprobar', motivo: 'No pudimos comprobar si esta unidad ya tiene la inspección de hoy. Puedes hacerla igual.' }))
    return () => { vivo = false }
  }, [vehiculoId, yo?.empresaId])

  const [respuestas, setRespuestas] = useState({})
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  /** Lo que se acaba de enviar desde aquí: trae las ODT generadas y cómo fueron las fotos. */
  const [enviado, setEnviado] = useState(null)
  const [avisoHecha, setAvisoHecha] = useState(null)
  const finDeSemana = useFinDeSemana(yo?.id)

  // Las vistas previas de las fotos se sueltan al salir de la pantalla.
  const fotosVivas = useRef(new Set())
  useEffect(() => () => fotosVivas.current.forEach((u) => URL.revokeObjectURL(u)), [])

  const items = useMemo(() => itemsDe(plantilla.datos), [plantilla.datos])
  const respondidos = items.filter((it) => respuestas[it.id]).length
  const total = items.length
  const fallas = items.filter((it) => respuestas[it.id]?.estado === 'falla').length

  function responder(respuesta) {
    setRespuestas((previas) => ({ ...previas, [respuesta.itemId]: respuesta }))
  }

  async function enviar() {
    if (!vehiculo || !plantilla.datos || !yo) return
    setError(null)
    const problema = problemaParaEnviar(items, respuestas)
    if (problema) {
      setError(problema)
      return
    }
    setEnviando(true)
    try {
      const lista = items.map((it) => respuestas[it.id]).map((r) => ({ ...r, fotos: r.fotos?.map((x) => x.archivo) }))
      const r = await datos.enviar(
        { vehiculo, plantilla: plantilla.datos, respuestas: lista, ubicacion: vehiculo.ubicacionTexto ?? '' },
        yo,
      )
      // Pasa a «ya está hecha»: el formulario no vuelve hasta mañana.
      setEnviado(r)
      setDiaria({ estado: 'hecha', inspeccion: r.detalle, detalle: r.detalle })
      setRespuestas({})
      window.scrollTo?.({ top: 0 })
    } catch (e) {
      if (e?.yaHecha) {
        // Alguien se adelantó: se muestra la que ya está, si se puede ver.
        const d = await datos.diariaDeHoy(vehiculo.id, { empresaId: yo.empresaId }).catch(() => null)
        setAvisoHecha(d?.estado === 'hecha' && d.inspeccion ? e.message : null)
        setDiaria(d?.estado === 'hecha' ? d : { estado: 'hecha', inspeccion: null })
      } else {
        setError(e?.message || 'No se pudo enviar la inspección.')
      }
    } finally {
      setEnviando(false)
    }
  }

  const cargando = !sesion || asignaciones.estado === 'cargando'
    || (vehiculoId && (unidad.estado === 'cargando' || !vehiculo || plantilla.estado === 'cargando' || !diaria))
  // Sábado o domingo sin la diaria hecha: primero la pregunta y, si trabaja, el formulario.
  const preguntar = Boolean(finDeSemana.dia) && finDeSemana.lista && finDeSemana.respuesta !== 'trabajo'
  const errorCarga = asignaciones.error ?? unidad.error ?? plantilla.error

  let contenido
  if (cargando && !(asignaciones.estado === 'ok' && !asignacion)) {
    contenido = <Esqueleto />
  } else if (!asignacion) {
    contenido = errorCarga
      ? <Vacio titulo="No pudimos cargar la inspección" texto={errorCarga.message} />
      : <Vacio titulo="Aún no tienes un vehículo asignado" texto="La inspección es de tu unidad. Cuando tu administrador te asigne tu vehículo, cargamos su checklist para que la hagas antes de salir." />
  } else if (diaria?.estado === 'hecha') {
    contenido = (
      <HechaHoy
        diaria={diaria}
        enviado={enviado}
        aviso={avisoHecha}
        yo={yo}
        vehiculoId={vehiculoId}
        plantilla={plantilla.datos}
        alInicio={() => navegar('/panel')}
        alAbrirOdt={() => navegar('/panel/mantenimiento')}
      />
    )
  } else if (preguntar) {
    contenido = <PreguntaFinDeSemana dia={finDeSemana.dia} respuesta={finDeSemana.respuesta} alResponder={finDeSemana.responder} />
  } else if (errorCarga) {
    contenido = <Vacio titulo="No pudimos cargar la inspección" texto={errorCarga.message} />
  } else if (total === 0) {
    contenido = (
      <Vacio
        titulo="Sin formato de inspección"
        texto={`${vehiculo ? `Unidad ${vehiculo.placa ?? vehiculo.id}: t` : 'T'}u empresa todavía no publicó un formato de inspección para este tipo de unidad. Avísale a tu supervisor: se publica desde la web, en Inspecciones › Plantillas.`}
      />
    )
  } else {
    contenido = (
      <>
        {/* «Revisa tu unidad antes de salir» ya es la bajada del título: aquí no se repite. */}
        <p className="ic-intro">Si algo crítico falla, detenemos la salida y avisamos a tu empresa. Que llegues bien.</p>

        <section className="ic-tarjeta ic-vehiculo" aria-label="Vehículo">
          <small>Vehículo</small>
          <b>{[`${vehiculo.marca ?? ''} ${vehiculo.modelo ?? ''}`.trim(), vehiculo.numero !== '—' ? vehiculo.numero : vehiculo.alias, vehiculo.placa !== '—' ? vehiculo.placa : null].filter(Boolean).join(' · ')}</b>
        </section>

        <div className="ic-progreso">
          <div className="ic-progreso-fila">
            <span>{`${respondidos} de ${total} revisados`}</span>
            {fallas > 0 && <span className="ic-rojo">{`${fallas} con falla`}</span>}
          </div>
          <div className="ic-barra" role="progressbar" aria-label="Ítems revisados" aria-valuemin={0} aria-valuemax={total} aria-valuenow={respondidos}>
            <i className={fallas > 0 ? 'aviso' : 'exito'} style={{ width: `${total ? (respondidos / total) * 100 : 0}%` }} />
          </div>
        </div>

        {plantilla.datos.categorias.map((categoria) => (
          <section key={categoria.nombre} className="ic-categoria" aria-label={categoria.nombre}>
            <h2 className="ic-overline">{categoria.nombre}</h2>
            <div className="ic-tarjeta ic-lista">
              {categoria.items.map((item) => (
                <Pregunta key={item.id} item={item} respuesta={respuestas[item.id]} alCambiar={responder} fotosVivas={fotosVivas.current} />
              ))}
            </div>
          </section>
        ))}

        {error && <p className="ic-error" role="alert">{error}</p>}
        <Boton texto="Enviar inspección" alPulsar={enviar} ocupado={enviando} deshabilitado={respondidos === 0} />
        {/* No se pudo saber si ya está hecha: se deja hacer, pero se dice. */}
        {diaria?.estado === 'sin_comprobar' && <p className="ic-nota">{diaria.motivo}</p>}
      </>
    )
  }

  return (
    <div className={`ic${esMovil ? ' ic-movil' : ''}`}>
      {esMovil ? (
        <header className="ic-titulo">
          <h1>Inspección</h1>
          <p>Revisa tu unidad antes de salir.</p>
        </header>
      ) : (
        <Cabecera titulo="Inspección del día" bajada="Revisa tu unidad antes de salir." />
      )}
      <div className="ic-cuerpo">{contenido}</div>
    </div>
  )
}

/** El esqueleto de la app mientras carga: la bajada, la tarjeta del vehículo, la barra y dos tarjetas. */
function Esqueleto() {
  return (
    <div className="ic-esqueleto" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Cargando…</span>
      <i style={{ width: '90%', height: 14 }} />
      <div className="ic-tarjeta"><i style={{ width: '35%', height: 12 }} /><i style={{ width: '70%', height: 16 }} /></div>
      <i style={{ height: 8 }} />
      {[0, 1].map((n) => <div key={n} className="ic-tarjeta"><i style={{ width: '45%', height: 14 }} /><i style={{ width: '85%', height: 14 }} /></div>)}
    </div>
  )
}

/**
 * UN ÍTEM del checklist (inspection-item.tsx): nombre, si es crítico y las
 * tres respuestas. En observación, qué se vio; en falla, nota, foto y, si el
 * ítem no es crítico, «¿crear ODT?».
 */
function Pregunta({ item, respuesta, alCambiar, fotosVivas }) {
  const estado = respuesta?.estado
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
    <div className="ic-item">
      <div className="ic-item-cab">
        <span className="ic-item-nombre">{item.nombre}</span>
        {item.critico && <span className="ic-critico">Crítico</span>}
      </div>
      {item.ayuda && <small className="ic-ayuda">{item.ayuda}</small>}

      {/* Tres respuestas (§4.1): Conforme / Observación / Falla. A 390 px
          «⚠ Observación» no cabía (se cortaba en «Observaci…»): un punto
          menos de letra y menos aire entre botones, sin partir la palabra. */}
      <div className="ic-toggle" role="group" aria-label={`Respuesta para ${item.nombre}`} style={TOGGLE_APRETADO}>
        {[['conforme', '✓ Conforme', 'exito'], ['observacion', '⚠ Observación', 'aviso'], ['falla', '✕ Falla', 'peligro']].map(([valor, texto, tono]) => (
          <button key={valor} type="button" className={`ic-opcion ${tono}${estado === valor ? ' on' : ''}`} aria-pressed={estado === valor} style={OPCION_APRETADA}
            onClick={() => alCambiar(conEstado(respuesta, item.id, valor))}>
            <span>{texto}</span>
          </button>
        ))}
      </div>

      {(estado === 'observacion' || estado === 'falla') && (
        <label className="ic-campo">
          <span>¿Qué observaste? (opcional)</span>
          <textarea
            value={respuesta?.nota ?? ''}
            onChange={(e) => cambiar({ nota: e.target.value })}
            placeholder={estado === 'falla' ? 'Ej. la llanta delantera derecha está muy gastada…' : 'Ej. el limpiaparabrisas deja rayas…'}
            maxLength={1000}
            rows={3}
          />
        </label>
      )}

      {estado === 'falla' && (
        <>
          <span className="ic-rotulo">Evidencia (foto)</span>
          <div className="ic-fotos-acciones">
            {/* En el teléfono «Tomar foto» abre la cámara; en la computadora, el selector de archivos. */}
            <label className="ic-azulejo">
              <input type="file" accept="image/*" capture="environment" onChange={(e) => { agregarFotos(e.target.files); e.target.value = '' }} />
              Tomar foto
            </label>
            <label className="ic-azulejo">
              <input type="file" accept="image/*" multiple onChange={(e) => { agregarFotos(e.target.files); e.target.value = '' }} />
              Galería
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
          {item.critico ? (
            <p className="ic-rojo ic-caption">Ítem crítico: se creará la ODT automáticamente y la salida queda bloqueada.</p>
          ) : (
            <div className="ic-odt">
              <span className="ic-rotulo">¿Crear ODT?</span>
              <div className="ic-toggle" role="group" aria-label="¿Crear ODT?">
                <button type="button" className={`ic-opcion primario${respuesta?.crearOdt === true ? ' on' : ''}`} aria-pressed={respuesta?.crearOdt === true} onClick={() => cambiar({ crearOdt: true })}><span>Sí, crear ODT</span></button>
                <button type="button" className={`ic-opcion neutro${respuesta?.crearOdt === false ? ' on' : ''}`} aria-pressed={respuesta?.crearOdt === false} onClick={() => cambiar({ crearOdt: false })}><span>Solo registrar</span></button>
              </div>
            </div>
          )}
        </>
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

/**
 * LA DE HOY YA ESTÁ HECHA (inspeccion-hecha-hoy.tsx y HechaHoyView): cuándo,
 * quién y cómo salió y, debajo, lo que toca según el resultado. Recién
 * enviada desde aquí también enseña las ODT que se generaron.
 */
function HechaHoy({ diaria, enviado, aviso, yo, vehiculoId, plantilla, alInicio, alAbrirOdt }) {
  const [abierta, setAbierta] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [pidiendo, setPidiendo] = useState(false)
  const inspeccion = diaria.inspeccion
  const resultado = inspeccion?.resultado
  const vista = inspeccion ? VISTA_RESULTADO[resultado] ?? VISTA_RESULTADO.pendiente : null
  const bloqueada = resultado === 'bloqueada'
  const tono = vista?.tono ?? 'exito'
  const mia = esMia(inspeccion, yo)
  const hora = inspeccion?.enviadaEn ? `a las ${f.hora(inspeccion.enviadaEn)}` : 'hoy'
  const titulo = !inspeccion ? 'La inspección de hoy de esta unidad ya está hecha'
    : mia ? 'Ya hiciste la inspección de hoy' : 'La inspección de hoy ya está hecha'
  const quien = !inspeccion ? null : `${mia ? 'La hiciste' : `La hizo ${inspeccion.conductor}`} ${hora}`.replace(/\.?$/u, '.')
  const detalle = textoDeResultado(resultado)
  const ordenes = enviado?.resultado?.ordenesGeneradas ?? []
  const fotos = enviado?.fotos

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
      <section className="ic-tarjeta ic-hecha" aria-label="Inspección de hoy">
        {aviso && <p className="ic-aviso-linea">{aviso}</p>}
        <div className="ic-hecha-cab">
          <span className={`ic-circulo ${bloqueada ? 'peligro' : tono}`}><IconoApp nombre={bloqueada ? 'aviso' : 'check'} tam={22} /></span>
          <div className="ic-hecha-txt">
            <h2 className="ic-subtitulo">{titulo}</h2>
            {quien && <small>{quien}</small>}
          </div>
        </div>
        {inspeccion && vista && (
          <div className="ic-hecha-fila">
            <span>{[inspeccion.unidad, inspeccion.placa].filter(Boolean).join(' · ')}</span>
            <Pastilla tono={vista.tono} texto={vista.corto} conPunto />
          </div>
        )}
        {inspeccion && <Boton texto="Ver resultado" variante="secundario" alPulsar={() => setAbierta(true)} />}
        <p className="ic-nota">La próxima la puedes hacer mañana.</p>
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

      {/* ODT generadas por las fallas, si se acaba de enviar desde aquí. */}
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

      {mensaje && (
        <p className={`ic-aviso-caja ${mensaje.tono}`} role={mensaje.tono === 'peligro' ? 'alert' : 'status'}>
          <b>{mensaje.titulo}</b> {mensaje.texto}
        </p>
      )}

      {/* Al bloquear: reasignar o esperar. */}
      {bloqueada && (
        <div className="ic-acciones">
          <Boton texto="Pedir otra unidad" alPulsar={pedirOtraUnidad} ocupado={pidiendo} />
          <Boton texto="Esperar reparación" variante="secundario"
            alPulsar={() => setMensaje({ tono: 'info', titulo: 'Entendido.', texto: 'Te avisaremos cuando tu unidad esté reparada y lista.' })} />
        </div>
      )}
      <Boton texto="Ir al inicio" variante={bloqueada ? 'secundario' : 'primario'} alPulsar={alInicio} />

      <Resultado abierta={abierta} inspeccion={inspeccion} detalleLeido={diaria.detalle} plantilla={plantilla} alCerrar={() => setAbierta(false)} />
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
  const detalle = detalleLeido?.id === inspeccion?.id ? detalleLeido : leido.detalle

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
  const vista = VISTA_RESULTADO[inspeccion.resultado] ?? VISTA_RESULTADO.pendiente
  const respuestas = detalle?.respuestas ?? []
  const malas = respuestas.filter((r) => r.estado !== 'conforme')
  const conformes = respuestas.length - malas.length
  const cuenta = contarFallas(respuestas)
  const datosFila = [
    ['Conductor', inspeccion.conductor],
    ['Fecha y hora', [f.fecha(inspeccion.fecha), inspeccion.enviadaEn ? f.hora(inspeccion.enviadaEn) : null].filter(Boolean).join(' · ')],
    ['Ubicación', inspeccion.ubicacion || 'Sin ubicación'],
    ['Formato', inspeccion.formato],
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
        conductorNombre: inspeccion.conductor,
        fecha: inspeccion.fecha,
        ubicacion: inspeccion.ubicacion,
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
