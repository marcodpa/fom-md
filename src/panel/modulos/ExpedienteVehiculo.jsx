import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import { esGestor } from '../roles'
import {
  Cabecera, Cargando, Vacio, ErrorCarga, Tag, Tarjeta, Kpi, Barra, Modal, Campo,
  Volver, Pestanas, Datos,
} from '../comp/ui'
import Mapa from '../comp/Mapa'
import { BarrasH } from '../comp/Grafico'
import { Icono } from '../Iconos'
import FichaUnidad from '../comp/FichaUnidad'
import * as f from '../datos/formato'
import { resumenKm } from '../datos/odometro'
import { TIPO_FALLA, color, etiqueta } from '../datos/catalogos'

// ============================================================
// EXPEDIENTE DEL VEHÍCULO
// ------------------------------------------------------------
// Todo lo que se sabe de una unidad en un solo lugar: ficha, telemetría,
// mantenimiento, inspecciones, papeles y gasto. Las asignaciones (área y
// conductor) se editan aquí mismo, sin salir de la pantalla.
// ============================================================

const PESTANAS = [
  { v: 'resumen', t: 'Resumen' },
  { v: 'telemetria', t: 'Telemetría' },
  { v: 'mantenimiento', t: 'Mantenimiento' },
  { v: 'inspecciones', t: 'Inspecciones' },
  { v: 'documentos', t: 'Documentos' },
  { v: 'costos', t: 'Costos' },
]

const TONO_INDICE = { verde: 'ok', amarillo: 'aviso', rojo: 'malo' }

// Mismas nueve categorías del costService de la app.
const CATEGORIA_COSTO = {
  combustible: 'Combustible',
  repuestos: 'Repuestos',
  neumaticos: 'Neumáticos',
  lubricantes: 'Lubricantes',
  mano_obra: 'Mano de obra',
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
  peajes: 'Peajes',
  seguros: 'Seguros',
}

const DIAS_EVENTOS = 28

function tonoNivel(pct, malo, aviso) {
  if (pct <= malo) return 'malo'
  if (pct <= aviso) return 'aviso'
  return ''
}

/** Fila de nivel con barra y porcentaje (aceite; el combustible no se mide). */
function Nivel({ icono, titulo, pct, tono }) {
  return (
    <div className="pnl-fila">
      <Icono nombre={icono} tam={18} />
      <div className="pnl-fila-txt">
        <b>{titulo}</b>
        <Barra valor={(pct ?? 0) / 100} tono={tono} />
      </div>
      <em>{pct ?? 0}%</em>
    </div>
  )
}

/**
 * Kilometraje de la unidad. Si el equipo manda odómetro, ese total manda. Si no, se calcula del GPS de los
 * últimos 7 días (sin saltos ni deriva) y se dice que es un cálculo, no una lectura.
 */
function KpiKilometraje({ v }) {
  const pos = useDatos(() => repo.recorridoDetallado(v.id, { horas: 168, limite: 1000 }), [v.id])
  // La lectura OFICIAL del odómetro (la registra el servidor: GPS, manual u orden de mantenimiento) manda sobre el
  // cálculo del recorrido.
  const oficial = useDatos(() => (repo.vehiculos.odometro ? repo.vehiculos.odometro(v.id).catch(() => null) : Promise.resolve(null)), [v.id])
  const lecturaKm = oficial.datos?.km ?? v.km
  const hoy = f.hoyISO()
  const r = pos.estado === 'ok' ? resumenKm({ lectura: lecturaKm, puntos: pos.datos.puntos, hoy }) : null
  const aprox = (n) => `${f.numero(Math.round(n))} km`
  let valor = f.km(lecturaKm)
  let nota = `Alta: ${f.fecha(v.creadoEn)}`
  if (r) {
    const parcial = pos.datos.truncado ? ' (al menos)' : ''
    if (r.lectura == null) {
      valor = r.recorridoKm > 0 ? `≈ ${aprox(r.recorridoKm)}` : 'Sin dato'
      nota = r.recorridoKm > 0 ? `Calculado del GPS, últimos 7 días${parcial}. El equipo no manda odómetro.` : 'El equipo no manda odómetro y no hay recorrido reciente.'
    } else {
      nota = `Hoy ${aprox(r.hoyKm)} · 7 días ${aprox(r.recorridoKm)}${parcial}`
    }
  }
  return <Kpi titulo="Kilometraje" valor={valor} icono="camion" nota={nota} />
}

export default function ExpedienteVehiculo() {
  const { id } = useParams()
  const sesion = useSesion()

  const { datos: v, estado, error, recargar } = useDatos(() => repo.vehiculos.obtener(id), [id])
  const areas = useDatos(() => repo.areas(), [])
  const conductores = useDatos(() => repo.personal.listar({ soloConductores: true }), [])

  const [pestana, setPestana] = useState('resumen')
  const [pinSeleccionado, setPinSeleccionado] = useState(null)
  const [guardado, setGuardado] = useState('')
  const [conductorElegido, setConductorElegido] = useState(null)
  const [asignandoConductor, setAsignandoConductor] = useState(false)
  useEffect(() => { setConductorElegido(null) }, [id])

  // Modal de nueva ODT
  const [modalOdt, setModalOdt] = useState(false)
  const [forma, setForma] = useState({ descripcion: '', tipoFalla: 'motor', ubicacion: '' })
  const [errorForma, setErrorForma] = useState('')
  const [archivando, setArchivando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const reloj = useRef(null)
  useEffect(() => () => clearTimeout(reloj.current), [])

  function avisarGuardado(texto = 'Guardado') {
    setGuardado(texto)
    clearTimeout(reloj.current)
    reloj.current = setTimeout(() => setGuardado(''), 2000)
  }

  const eventosRecientes = useMemo(() => {
    if (!v?.eventos) return []
    const corte = Date.now() - DIAS_EVENTOS * 86400000
    return v.eventos.filter((e) => new Date(e.creadaEn).getTime() >= corte)
  }, [v])

  const porCategoria = useMemo(() => {
    if (!v?.costos?.length) return []
    const suma = {}
    v.costos.forEach((c) => {
      suma[c.categoria] = (suma[c.categoria] || 0) + c.monto
    })
    return Object.entries(suma)
      .map(([clave, valor]) => ({ etiqueta: CATEGORIA_COSTO[clave] ?? clave, valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [v])

  const totalCostos = useMemo(() => (v?.costos ?? []).reduce((a, c) => a + c.monto, 0), [v])

  // Sin try/catch un rechazo del servidor era una promesa sin capturar:
  // ningun mensaje, el selector volvia a su valor, y parecia que «no dejaba».
  async function cambiarArea(valor) {
    setErrorForma('')
    try {
      await repo.vehiculos.asignarArea(id, valor || null)
      await recargar()
      avisarGuardado()
    } catch (e) {
      setErrorForma(e.message)
    }
  }

  async function cambiarConductor(valor) {
    if (asignandoConductor) return
    setAsignandoConductor(true)
    setErrorForma('')
    try {
      await repo.vehiculos.asignarConductor(id, valor || null)
      await recargar()
      setConductorElegido(null)
      avisarGuardado(valor ? 'Conductor asignado' : 'Asignación retirada')
    } catch (e) {
      setErrorForma(e.message)
    } finally {
      setAsignandoConductor(false)
    }
  }

  async function cambiarVencimiento(docId, venceEn) {
    if (!venceEn) return
    await repo.documentos.actualizarVencimiento(docId, venceEn)
    await recargar()
    avisarGuardado('Vencimiento actualizado')
  }

  function abrirModalOdt() {
    setForma({ descripcion: '', tipoFalla: 'motor', ubicacion: v?.ubicacionTexto ?? '' })
    setErrorForma('')
    setModalOdt(true)
  }

  async function crearOdt(e) {
    e.preventDefault()
    if (!forma.descripcion.trim()) {
      setErrorForma('Describe la falla.')
      return
    }
    setEnviando(true)
    try {
      await repo.odts.crear({
        vehiculoId: id,
        descripcion: forma.descripcion.trim(),
        tipoFalla: forma.tipoFalla,
        ubicacion: forma.ubicacion.trim(),
        creadorId: sesion?.perfil?.id ?? null,
      })
      setModalOdt(false)
      await recargar()
      avisarGuardado('ODT creada')
    } finally {
      setEnviando(false)
    }
  }

  const cargando = estado === 'cargando'
  const abiertas = (v?.odts ?? []).filter((o) => o.estado === 'abierta').length
  const enRevision = (v?.odts ?? []).filter((o) => o.estado === 'en_revision').length

  return (
    <>
      <Cabecera
        titulo={v ? v.alias : 'Expediente de la unidad'}
        bajada={
          // Solo lo que existe. Un año nulo salia como la palabra «null» en
          // medio del subtitulo, que es peor que no decir el año.
          v
            ? [`${v.marca} ${v.modelo}`.trim(), v.anio, v.placa].filter(Boolean).join(' · ')
            : 'Ficha completa de la unidad'
        }
      >
        {v && (
          <>
            <Tag color={color('marcha_estado', v.estadoMarcha)}>
              {etiqueta('marcha_estado', v.estadoMarcha)}
            </Tag>
            {esGestor(sesion?.perfil) && (
              <button type="button" className="pnl-btn sutil" onClick={() => setArchivando(true)}>
                <Icono nombre="cerrar" tam={16} />
                Archivar unidad
              </button>
            )}
            <Tag color="azul">{etiqueta('vehiculo_tipo', v.tipo)}</Tag>
          </>
        )}
      </Cabecera>

      <div className="pnl-cuerpo">
        <Volver a="/panel/flota">Flota</Volver>

        {cargando && <Cargando filas={6} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} error={error} />}

        {estado === 'ok' && !v && (
          <Vacio
            icono="camion"
            titulo="No encontramos esa unidad"
            texto="Puede que la hayan dado de baja o que el enlace esté equivocado."
            accion={<Link to="/panel/flota" className="pnl-btn">Ver todas las unidades</Link>}
          />
        )}

        {estado === 'ok' && v && (
          <>
            <div className="pnl-grid k4">
              <KpiKilometraje v={v} />
              <Kpi
                titulo="Índice seguro"
                valor={v.indiceSeguro}
                icono="escudo"
                tono={TONO_INDICE[f.rangoIndice(v.indiceSeguro)]}
                nota="Manejo seguro sobre 100"
              />
              <Kpi
                titulo="ODT abiertas"
                valor={abiertas}
                icono="llave"
                tono={abiertas ? 'aviso' : 'ok'}
                nota={`${enRevision} en revisión`}
                a="/panel/mantenimiento"
              />
              <Kpi
                titulo="Eventos de manejo"
                valor={eventosRecientes.length}
                icono="alerta"
                tono={eventosRecientes.length > 6 ? 'malo' : ''}
                nota={`Últimos ${DIAS_EVENTOS} días`}
              />
            </div>

            <Pestanas opciones={PESTANAS} valor={pestana} alCambiar={setPestana} />

            {/* ---------------- Resumen ---------------- */}
            {pestana === 'resumen' && (
              <>
                <div className="pnl-expediente-hero"><Tarjeta titulo="Vehículo"><FichaUnidad unidad={v} conEnlace={false} /></Tarjeta><Tarjeta titulo="Recorrido del día" sinCuerpo><Mapa vehiculos={[v]} seleccionado={pinSeleccionado} alSeleccionar={setPinSeleccionado} recorrido={v.recorrido} alto="470px" ficha={false} /></Tarjeta></div>
                <Tarjeta titulo="Ficha de la unidad">
                  <Datos
                    items={[
                      { etiqueta: 'Alias', valor: v.alias },
                      { etiqueta: 'Número interno', valor: v.numero },
                      { etiqueta: 'Placa', valor: v.placa },
                      { etiqueta: 'Marca', valor: v.marca },
                      { etiqueta: 'Modelo', valor: v.modelo },
                      { etiqueta: 'Año', valor: v.anio ?? '—' },
                      { etiqueta: 'Tipo', valor: etiqueta('vehiculo_tipo', v.tipo) },
                      { etiqueta: 'Área', valor: v.areaNombre },
                      {
                        etiqueta: 'Conductor principal',
                        valor: v.conductorPrincipalId ? v.conductorNombre : 'Sin conductor',
                      },
                      { etiqueta: 'GPS', valor: v.gps?.modelo ?? 'Sin GPS' },
                      { etiqueta: 'IMEI', valor: v.gps?.imei ?? 'Sin registrar' },
                      { etiqueta: 'Seguridad', valor: v.gps?.pinSupport ? 'GPS con PIN' : 'GPS sin PIN' },
                      ...(v.creadoEn ? [{ etiqueta: 'Alta en el sistema', valor: f.fecha(v.creadoEn) }] : []),
                      ...((v.conductores?.length ?? 0) > 1 ? [{ etiqueta: 'Otros conductores', valor: v.conductores.slice(1).map((c) => `${c.nombre} (${c.rol})`).join(', ') }] : []),
                    ]}
                  />
                </Tarjeta>

                <Tarjeta
                  titulo="Asignaciones"
                  accion={guardado ? <Tag color="verde">{guardado}</Tag> : null}
                >
                  <div className="pnl-grid k2">
                    <Campo etiqueta="Área" ayuda="Ubicación, sector o contrato al que responde la unidad.">
                      <select
                        className="pnl-select"
                        value={v.areaId ?? ''}
                        onChange={(e) => cambiarArea(e.target.value)}
                      >
                        <option value="">Sin área</option>
                        {(areas.datos ?? []).map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre} ({etiqueta('area_tipo', a.tipo)})
                          </option>
                        ))}
                      </select>
                    </Campo>

                    <Campo etiqueta="Conductor principal" ayuda="Elige al conductor y pulsa Asignar. Se sustituirá la asignación anterior de esta unidad." error={errorForma}>
                      <select
                        className="pnl-select"
                        value={conductorElegido ?? v.conductorPrincipalId ?? ''}
                        disabled={asignandoConductor}
                        onChange={(e) => { setConductorElegido(e.target.value); setErrorForma('') }}
                      >
                        <option value="">Sin conductor</option>
                        {(conductores.datos ?? []).map((p) => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                      {conductorElegido !== null && conductorElegido !== (v.conductorPrincipalId ?? '') && (
                        <div className="pnl-chips">
                          <button type="button" className="pnl-btn primario" disabled={asignandoConductor} onClick={() => cambiarConductor(conductorElegido)}>
                            {asignandoConductor ? 'Guardando…' : conductorElegido ? 'Asignar' : 'Quitar asignación'}
                          </button>
                          <button type="button" className="pnl-btn sutil" disabled={asignandoConductor} onClick={() => { setConductorElegido(null); setErrorForma('') }}>Cancelar</button>
                        </div>
                      )}
                    </Campo>
                  </div>
                </Tarjeta>


              </>
            )}

            {/* ---------------- Telemetría ---------------- */}
            {pestana === 'telemetria' && (
              <>
                {v.aceitePct != null && (
                  <Tarjeta titulo="Niveles">
                    <div className="pnl-filas">
                      <Nivel
                        icono="llave"
                        titulo="Aceite"
                        pct={v.aceitePct}
                        tono={tonoNivel(v.aceitePct, 25, 40)}
                      />
                    </div>
                  </Tarjeta>
                )}

                <Tarjeta titulo="Estado en vivo">
                  <Datos
                    items={[
                      { etiqueta: 'Temperatura del motor', valor: v.tempMotorC == null ? 'Sin dato' : `${v.tempMotorC} °C` },
                      { etiqueta: 'Velocidad actual', valor: f.velocidad(v.velocidadKmh) },
                      { etiqueta: 'Estado', valor: etiqueta('marcha_estado', v.estadoMarcha) },
                      { etiqueta: 'Kilometraje', valor: f.km(v.km) },
                      { etiqueta: 'Ubicación', valor: v.ubicacionTexto || (Number.isFinite(v.lat) && Number.isFinite(v.lng) ? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}` : 'Sin posición') },
                      { etiqueta: 'Último reporte', valor: f.desde(v.ultimoReporte) },
                    ]}
                  />
                </Tarjeta>

                <Tarjeta titulo="Equipo GPS">
                  <div className="pnl-filas">
                    <div className="pnl-fila">
                      <span className={`pnl-punto ${v.gps?.verificado ? 'on' : 'off'}`} />
                      <div className="pnl-fila-txt">
                        <b>{v.gps?.modelo ?? 'Sin equipo'}</b>
                        <span>IMEI {v.gps?.imei ?? 'sin registrar'} · Línea {v.gps?.linea ?? 'sin registrar'}</span>
                      </div>
                      <Tag color={v.gps?.pinSupport ? 'verde' : 'gris'}>
                        {v.gps?.pinSupport ? 'GPS con PIN' : 'GPS sin PIN'}
                      </Tag>
                    </div>
                    <div className="pnl-fila">
                      <Icono nombre="pin" tam={16} />
                      <div className="pnl-fila-txt">
                        <span>
                          La telemetría detallada llega del GPS; hoy el sistema guarda posición,
                          velocidad y kilometraje.
                        </span>
                      </div>
                    </div>
                  </div>
                </Tarjeta>
              </>
            )}

            {/* ---------------- Mantenimiento ---------------- */}
            {pestana === 'mantenimiento' && (
              <Tarjeta
                titulo="Órdenes de trabajo"
                accion={
                  <button type="button" className="pnl-btn primario" onClick={abrirModalOdt}>
                    <Icono nombre="mas" tam={16} />
                    Nueva ODT
                  </button>
                }
              >
                {!v.odts.length ? (
                  <Vacio
                    icono="llave"
                    titulo="Sin órdenes de trabajo"
                    texto="Esta unidad no tiene fallas reportadas. Cuando aparezca una, la registras aquí."
                  />
                ) : (
                  <div className="pnl-filas">
                    {v.odts.map((o) => (
                      <div
                        key={o.id}
                        className={`pnl-fila${o.estado === 'abierta' ? ' critica' : o.estado === 'en_revision' ? ' aviso' : ''}`}
                      >
                        <div className="pnl-fila-txt">
                          <b>{o.descripcion}</b>
                          <span>
                            {o.tipoFalla ? etiqueta('tipo_falla', o.tipoFalla) : 'Sin clasificar'}
                            {' · '}
                            {f.fechaCorta(o.creadaEn)}
                            {o.estado === 'cerrada' && o.costo != null ? ` · ${f.moneda(o.costo)}` : ''}
                          </span>
                        </div>
                        <Tag color="gris">{etiqueta('odt_tipo', o.tipo)}</Tag>
                        <Tag color={color('odt_estado', o.estado)}>{etiqueta('odt_estado', o.estado)}</Tag>
                      </div>
                    ))}
                  </div>
                )}
              </Tarjeta>
            )}

            {/* ---------------- Inspecciones ---------------- */}
            {pestana === 'inspecciones' && (
              <Tarjeta titulo="Inspecciones diarias" sinCuerpo>
                {!v.inspecciones.length ? (
                  <Vacio
                    icono="check"
                    titulo="Sin inspecciones registradas"
                    texto="Todavía nadie ha hecho el chequeo de esta unidad desde la app."
                  />
                ) : (
                  <div className="pnl-tabla-wrap">
                    <table className="pnl-tabla">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Resultado</th>
                          <th className="num">Observaciones</th>
                          <th className="num">Fallas críticas</th>
                          <th>Ubicación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.inspecciones.map((i) => (
                          <tr key={i.id}>
                            <td>
                              <div className="pnl-doble">
                                <b>{f.fecha(i.fecha)}</b>
                                <span>{f.desde(i.creadaEn)}</span>
                              </div>
                            </td>
                            <td>
                              <Tag color={color('inspeccion_resultado', i.resultado)}>
                                {etiqueta('inspeccion_resultado', i.resultado)}
                              </Tag>
                            </td>
                            <td className="num">{i.observaciones ?? 0}</td>
                            <td className="num">{i.fallasCriticas ?? 0}</td>
                            <td>{i.ubicacion || 'Sin registrar'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Tarjeta>
            )}

            {/* ---------------- Documentos ---------------- */}
            {pestana === 'documentos' && (
              <Tarjeta
                titulo="Documentos de la unidad"
                accion={guardado ? <Tag color="verde">{guardado}</Tag> : null}
                sinCuerpo
              >
                {!v.documentos.length ? (
                  <Vacio
                    icono="documento"
                    titulo="Sin documentos cargados"
                    texto="Carga la póliza, el certificado de circulación y la revisión técnica para no perder de vista los vencimientos."
                  />
                ) : (
                  <div className="pnl-tabla-wrap">
                    <table className="pnl-tabla">
                      <thead>
                        <tr>
                          <th>Documento</th>
                          <th>Vence</th>
                          <th>Estado</th>
                          <th>Cambiar vencimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.documentos.map((d) => (
                          <tr key={d.id}>
                            <td><b>{d.tipo}</b></td>
                            <td>
                              <div className="pnl-doble">
                                <b>{f.fecha(d.venceEn)}</b>
                                <span>({f.vencimiento(d.venceEn)})</span>
                              </div>
                            </td>
                            <td>
                              <Tag color={color('documento_estado', d.estado)}>
                                {etiqueta('documento_estado', d.estado)}
                              </Tag>
                            </td>
                            <td>
                              <input
                                type="date"
                                className="pnl-input"
                                value={String(d.venceEn).slice(0, 10)}
                                min={f.hoyISO()}
                                aria-label={`Cambiar el vencimiento de ${d.tipo}`}
                                onChange={(e) => cambiarVencimiento(d.id, e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Tarjeta>
            )}

            {/* ---------------- Costos ---------------- */}
            {pestana === 'costos' && (
              <Tarjeta
                titulo="Gasto por categoría"
                accion={<span className="pnl-link">Total: {f.moneda(totalCostos)}</span>}
              >
                {!porCategoria.length ? (
                  <Vacio
                    icono="reporte"
                    titulo="Sin gastos registrados"
                    texto="Cuando cargues combustible, repuestos o mano de obra de esta unidad, el resumen aparece acá."
                  />
                ) : (
                  <>
                    <BarrasH datos={porCategoria} formato={(n) => f.moneda(n)} />
                    <div className="pnl-filas">
                      <div className="pnl-fila">
                        <div className="pnl-fila-txt">
                          <b>Total del período</b>
                          <span>{v.costos.length} movimientos registrados</span>
                        </div>
                        <em>{f.moneda(totalCostos)}</em>
                      </div>
                    </div>
                  </>
                )}
              </Tarjeta>
            )}
          </>
        )}
      </div>

      <Modal titulo="Nueva orden de trabajo" abierto={modalOdt} alCerrar={() => setModalOdt(false)}>
        <form onSubmit={crearOdt}>
          <Campo etiqueta="¿Qué le pasa a la unidad?" error={errorForma}>
            <textarea
              className="pnl-textarea"
              rows={4}
              value={forma.descripcion}
              placeholder="Ejemplo: el freno de mano no sostiene la unidad en pendiente."
              onChange={(e) => {
                setForma((s) => ({ ...s, descripcion: e.target.value }))
                if (errorForma) setErrorForma('')
              }}
            />
          </Campo>

          <Campo etiqueta="Tipo de falla">
            <select
              className="pnl-select"
              value={forma.tipoFalla}
              onChange={(e) => setForma((s) => ({ ...s, tipoFalla: e.target.value }))}
            >
              {TIPO_FALLA.map((t) => (
                <option key={t} value={t}>{etiqueta('tipo_falla', t)}</option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Ubicación" ayuda="Dónde está la unidad ahora mismo.">
            <input
              type="text"
              className="pnl-input"
              value={forma.ubicacion}
              placeholder="Ejemplo: Intercomunal, Ciudad Ojeda"
              onChange={(e) => setForma((s) => ({ ...s, ubicacion: e.target.value }))}
            />
          </Campo>

          <div className="pnl-cab-acciones">
            <button type="button" className="pnl-btn sutil" onClick={() => setModalOdt(false)}>
              Cancelar
            </button>
            <button type="submit" className="pnl-btn primario" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Crear ODT'}
            </button>
          </div>
        </form>
      </Modal>
      {v && archivando && (
        <ModalArchivar unidad={v} alCerrar={() => setArchivando(false)} alHecho={() => { setArchivando(false); recargar() }} />
      )}
    </>
  )
}

// ---------------- Archivar la unidad ----------------
// Mismo paso que en la app: primero se pregunta qué lo impide (jornadas o
// asignaciones abiertas, GPS instalado, órdenes o emergencias vivas) y solo
// si nada lo impide se archiva, con motivo y con el estado que se vio.
const BLOQUEO = {
  driverSessions: 'jornadas abiertas', driverAssignments: 'conductores asignados', gpsInstallations: 'equipos GPS instalados',
  workOrders: 'órdenes de trabajo abiertas', emergencies: 'emergencias activas',
}
function ModalArchivar({ unidad, alCerrar, alHecho }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const pre = useDatos(() => repo.vehiculos.preflightArchivo(unidad.id), [unidad.id])
  const bloqueos = Object.entries(pre.datos?.bloqueos ?? {}).filter(([, n]) => Number(n) > 0)
  async function confirmar() {
    if (motivo.trim().length < 3) return setError('Escribe el motivo: queda en el historial.')
    setGuardando(true)
    setError('')
    try {
      await repo.vehiculos.archivar(unidad.id, { estadoActual: pre.datos?.estadoActual, motivo: motivo.trim() })
      alHecho()
    } catch (e) {
      setError(e?.message || 'No se pudo archivar.')
    } finally {
      setGuardando(false)
    }
  }
  return (
    <Modal titulo={`Archivar ${unidad.alias}`} abierto alCerrar={alCerrar} ancho={480}>
      {pre.estado === 'cargando' && <Cargando filas={2} />}
      {pre.estado === 'error' && <ErrorCarga onReintentar={pre.recargar} error={pre.error} />}
      {pre.estado === 'ok' && (
        <>
          {bloqueos.length > 0 ? (
            <div className="pnl-fila critica">
              <Icono nombre="alerta" tam={16} />
              <div className="pnl-fila-txt">
                <b>Todavía no se puede archivar</b>
                <span>Antes resuelve: {bloqueos.map(([k, n]) => `${n} ${BLOQUEO[k] ?? k}`).join(', ')}.</span>
              </div>
            </div>
          ) : (
            <p style={{ margin: '0 0 12px', color: 'var(--e-texto-2)' }}>La unidad sale de la operación y conserva todo su historial. No se borra nada.</p>
          )}
          <Campo etiqueta="Motivo" error={error}>
            <input className="pnl-input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Vendida, siniestrada, fuera de servicio…" />
          </Campo>
          <div className="pnl-chips">
            <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando || bloqueos.length > 0}>
              {guardando ? 'Archivando…' : 'Archivar'}
            </button>
            <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
          </div>
        </>
      )}
    </Modal>
  )
}
