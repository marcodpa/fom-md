import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import { esAdminFom } from '../auth'
import {
  Cabecera, Campo, Cargando, Vacio, ErrorCarga, Tag, Tarjeta, Kpi, Buscador, Chips, Modal,
} from '../comp/ui'
import { Icono } from '../Iconos'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'

// ============================================================
// FLOTA — listado maestro de unidades
// ------------------------------------------------------------
// La app móvil muestra una lista simple; aquí el supervisor necesita comparar
// unidades entre sí, así que la vista es una tabla ordenable por cualquier
// columna, con filtros combinables y salida a CSV para el reporte semanal.
// ============================================================

/** Una unidad requiere atención si tiene papeles en riesgo o nadie a cargo. */
function requiereAtencion(v) {
  // Si la fuente no lleva documentos —hoy, la base real— no hay nada que
  // afirmar. Marcar «requiere atención» a toda la flota por lo que no sabemos
  // vuelve inútil el indicador justo cuando más debería significar algo.
  if (v.docsVencidos == null) return false
  return v.docsVencidos > 0 || v.docsPorVencer > 0 || !v.conductorPrincipalId
}

function nombreConductor(v) {
  return v.conductorPrincipalId ? v.conductorNombre : 'Sin conductor'
}

/** Columnas de la tabla. `num` alinea a la derecha como el resto del panel. */
const COLUMNAS = [
  { k: 'unidad', t: 'Unidad' },
  { k: 'placa', t: 'Placa' },
  { k: 'area', t: 'Área' },
  { k: 'conductor', t: 'Conductor' },
  { k: 'estado', t: 'Estado' },
  { k: 'documentos', t: 'Documentos' },
  { k: 'indice', t: 'Índice', num: true },
  { k: 'km', t: 'Km', num: true },
]

/** Valor comparable de cada columna. Los documentos ordenan por gravedad. */
function valorOrden(v, k) {
  switch (k) {
    case 'placa': return v.placa
    case 'area': return v.areaNombre
    case 'conductor': return nombreConductor(v)
    case 'estado': return v.estadoMarcha === 'en_marcha' ? 1 : 0
    case 'documentos': return v.docsVencidos * 100 + v.docsPorVencer
    case 'indice': return v.indiceSeguro
    case 'km': return v.km
    default: return v.alias
  }
}

function coincide(v, q) {
  const t = q.trim().toLowerCase()
  if (!t) return true
  return [v.alias, v.placa, v.numero, v.marca, v.modelo, nombreConductor(v), v.areaNombre]
    .join(' ')
    .toLowerCase()
    .includes(t)
}

/** Celda de documentos: al día, por vencer o vencidos. */
function TagDocumentos({ v }) {
  // Con la base real todavía no hay documentos. Se dice que no se sabe, en
  // vez de pintar un «Al día» que nadie ha comprobado.
  if (v.docsVencidos == null) return <span className="pnl-sin-dato">—</span>
  if (v.docsVencidos > 0) {
    return (
      <Tag color="rojo">
        {v.docsVencidos} {v.docsVencidos === 1 ? 'vencido' : 'vencidos'}
      </Tag>
    )
  }
  if (v.docsPorVencer > 0) return <Tag color="ambar">{v.docsPorVencer} por vencer</Tag>
  return <Tag color="verde">Al día</Tag>
}

/** Descarga la tabla tal como se ve, sin librerías: Blob + enlace temporal. */
function exportarCSV(filas) {
  const cabeceras = [
    'Unidad', 'Número', 'Placa', 'Marca', 'Modelo', 'Año', 'Tipo', 'Área', 'Conductor',
    'Estado', 'Velocidad (km/h)', 'Kilometraje', 'Índice seguro', 'Documentos vencidos',
    'Documentos por vencer', 'Ubicación', 'Último reporte',
  ]
  const celda = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`
  const lineas = [
    cabeceras.map(celda).join(';'),
    ...filas.map((v) =>
      [
        v.alias, v.numero, v.placa, v.marca, v.modelo, v.anio,
        etiqueta('vehiculo_tipo', v.tipo), v.areaNombre, nombreConductor(v),
        etiqueta('marcha_estado', v.estadoMarcha), v.estadoMarcha === 'en_marcha' ? v.velocidadKmh : 0,
        Math.round(v.km), v.indiceSeguro, v.docsVencidos, v.docsPorVencer,
        v.ubicacionTexto, f.fechaHora(v.ultimoReporte),
      ]
        .map(celda)
        .join(';')
    ),
  ]
  // El BOM hace que Excel en español abra las tildes correctamente.
  const blob = new Blob([`\ufeff${lineas.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `flota-fom-${f.hoyISO()}.csv`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

export default function Flota() {
  const navegar = useNavigate()
  const sesion = useSesion()
  const esAdmin = esAdminFom(sesion?.perfil)
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('todas')
  const [areaId, setAreaId] = useState('')
  const [orden, setOrden] = useState({ k: 'unidad', dir: 'asc' })
  const [creando, setCreando] = useState(false)

  const vehiculos = useDatos(() => repo.vehiculos.listar(), [])
  const areas = useDatos(() => repo.areas(), [])

  const lista = vehiculos.datos ?? []
  const estado = vehiculos.estado === 'error' || areas.estado === 'error'
    ? 'error'
    : vehiculos.estado === 'ok' && areas.estado === 'ok'
      ? 'ok'
      : 'cargando'

  // Base: búsqueda de texto (los chips cuentan sobre esta base)
  const buscadas = useMemo(() => lista.filter((v) => coincide(v, q)), [lista, q])
  const porArea = useMemo(
    () => (areaId ? buscadas.filter((v) => v.areaId === areaId) : buscadas),
    [buscadas, areaId]
  )

  const filtradas = useMemo(() => {
    if (filtro === 'en_marcha') return porArea.filter((v) => v.estadoMarcha === 'en_marcha')
    if (filtro === 'parada') return porArea.filter((v) => v.estadoMarcha === 'parada')
    if (filtro === 'atencion') return porArea.filter(requiereAtencion)
    return porArea
  }, [porArea, filtro])

  const ordenadas = useMemo(() => {
    const dir = orden.dir === 'asc' ? 1 : -1
    return [...filtradas].sort((a, b) => {
      const va = valorOrden(a, orden.k)
      const vb = valorOrden(b, orden.k)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb), 'es', { numeric: true }) * dir
    })
  }, [filtradas, orden])

  const chipsEstado = [
    { v: 'todas', t: 'Todas', n: porArea.length },
    { v: 'en_marcha', t: 'En marcha', n: porArea.filter((v) => v.estadoMarcha === 'en_marcha').length },
    { v: 'parada', t: 'Detenidas', n: porArea.filter((v) => v.estadoMarcha === 'parada').length },
    { v: 'atencion', t: 'Requieren atención', n: porArea.filter(requiereAtencion).length },
  ]

  const chipsArea = [
    { v: '', t: 'Todas las áreas', n: buscadas.length },
    ...(areas.datos ?? []).map((a) => ({
      v: a.id,
      t: a.nombre,
      n: buscadas.filter((v) => v.areaId === a.id).length,
    })),
  ]

  const enMarcha = lista.filter((v) => v.estadoMarcha === 'en_marcha').length
  // ¿La fuente sabe distinguir marcha de parada? Con la base real todavía no:
  // no se persiste la velocidad, solo la última vez que el equipo reportó.
  const sabeMarcha = lista.some((v) => v.estadoMarcha != null)
  const reportando = lista.filter((v) => v.conectado).length
  const atencion = lista.filter(requiereAtencion).length
  const sinConductor = lista.filter((v) => !v.conductorPrincipalId).length

  function ordenarPor(k) {
    setOrden((o) => (o.k === k ? { k, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { k, dir: 'asc' }))
  }

  function abrir(id) {
    navegar(`/panel/flota/${id}`)
  }

  return (
    <>
      <Cabecera titulo="Vehículos" bajada="Toda la flota en una sola tabla: estado, papeles y responsable de cada unidad.">
        <Buscador valor={q} alCambiar={setQ} placeholder="Buscar unidad, placa, conductor o área…" />
        <button
          type="button"
          className="pnl-btn"
          onClick={() => exportarCSV(ordenadas)}
          disabled={!ordenadas.length}
        >
          <Icono nombre="descargar" tam={16} />
          Exportar CSV
        </button>
        {esAdmin && (
          <button type="button" className="pnl-btn primario" onClick={() => setCreando(true)}>
            <Icono nombre="mas" tam={16} />
            Nueva unidad
          </button>
        )}
      </Cabecera>

      {esAdmin && (
        <ModalNuevaUnidad
          abierto={creando}
          areas={areas.datos ?? []}
          alCerrar={() => setCreando(false)}
          alGuardar={() => vehiculos.recargar()}
          actor={sesion?.perfil}
        />
      )}

      <div className="pnl-cuerpo">
        {estado === 'cargando' && <Cargando filas={8} />}
        {estado === 'error' && <ErrorCarga onReintentar={() => { vehiculos.recargar(); areas.recargar() }} />}

        {estado === 'ok' && (
          <>
            <div className="pnl-grid k4">
              <Kpi titulo="Total de unidades" valor={lista.length} icono="camion" />
              {sabeMarcha ? (
                <Kpi
                  titulo="En marcha"
                  valor={enMarcha}
                  icono="velocidad"
                  tono="ok"
                  nota={`${lista.length - enMarcha} detenidas`}
                />
              ) : (
                /* La base no guarda la velocidad: se informa cuántos equipos
                   están reportando, que es lo que sí consta. */
                <Kpi
                  titulo="Reportando"
                  valor={reportando}
                  icono="velocidad"
                  tono={reportando ? 'ok' : 'aviso'}
                  nota={`${lista.length - reportando} sin señal`}
                />
              )}
              <Kpi
                titulo="Requieren atención"
                valor={atencion}
                icono="alerta"
                tono={atencion ? 'aviso' : 'ok'}
                nota="Papeles en riesgo o sin responsable"
              />
              <Kpi
                titulo="Sin conductor"
                valor={sinConductor}
                icono="gente"
                tono={sinConductor ? 'malo' : 'ok'}
                nota="Unidades sin conductor principal"
              />
            </div>

            <Chips opciones={chipsEstado} valor={filtro} alCambiar={setFiltro} />
            <Chips opciones={chipsArea} valor={areaId} alCambiar={setAreaId} />

            <Tarjeta
              titulo={`${ordenadas.length} ${ordenadas.length === 1 ? 'unidad' : 'unidades'}`}
              accion={<span className="pnl-link">Toca una fila para ver el expediente</span>}
              sinCuerpo
            >
              {!lista.length && (
                <Vacio
                  icono="camion"
                  titulo="Todavía no hay unidades"
                  texto="Cuando registres vehículos en FOM, aparecerán aquí con su estado en vivo."
                />
              )}

              {lista.length > 0 && !ordenadas.length && (
                <Vacio
                  icono="buscar"
                  titulo="Sin resultados"
                  texto={
                    q.trim()
                      ? `Ninguna unidad coincide con «${q.trim()}».`
                      : 'Ninguna unidad cumple con los filtros seleccionados.'
                  }
                  accion={
                    <button
                      type="button"
                      className="pnl-btn"
                      onClick={() => { setQ(''); setFiltro('todas'); setAreaId('') }}
                    >
                      Limpiar filtros
                    </button>
                  }
                />
              )}

              {ordenadas.length > 0 && (
                <div className="pnl-tabla-wrap">
                  <table className="pnl-tabla">
                    <thead>
                      <tr>
                        {COLUMNAS.map((c) => {
                          const activa = orden.k === c.k
                          return (
                            <th
                              key={c.k}
                              className={`pnl-tabla-fila-link${c.num ? ' num' : ''}`}
                              aria-sort={activa ? (orden.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                              tabIndex={0}
                              title={`Ordenar por ${c.t}`}
                              onClick={() => ordenarPor(c.k)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  ordenarPor(c.k)
                                }
                              }}
                            >
                              {c.t}
                              {activa ? (orden.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {ordenadas.map((v) => (
                        <tr
                          key={v.id}
                          className="pnl-tabla-fila-link"
                          tabIndex={0}
                          role="link"
                          aria-label={`Abrir el expediente de ${v.alias}, placa ${v.placa}`}
                          onClick={() => abrir(v.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              abrir(v.id)
                            }
                          }}
                        >
                          <td>
                            <div className="pnl-doble">
                              <b>{v.alias}</b>
                              <span>{v.numero} · {v.marca} {v.modelo}</span>
                            </div>
                          </td>
                          <td className="placa">{v.placa}</td>
                          <td>{v.areaNombre}</td>
                          <td>{nombreConductor(v)}</td>
                          <td>
                            <div className="pnl-doble">
                              {v.estadoMarcha ? (
                                <>
                                  <Tag color={color('marcha_estado', v.estadoMarcha)}>
                                    {etiqueta('marcha_estado', v.estadoMarcha)}
                                  </Tag>
                                  {v.estadoMarcha === 'en_marcha' && (
                                    <span>{f.velocidad(v.velocidadKmh)}</span>
                                  )}
                                </>
                              ) : (
                                /* Sin velocidad en la base no se puede afirmar
                                   marcha ni parada; se informa la conexión. */
                                <>
                                  <Tag color={color('conexion', v.conexion)}>
                                    {etiqueta('conexion', v.conexion)}
                                  </Tag>
                                  <span>{f.desde(v.ultimoReporte)}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td><TagDocumentos v={v} /></td>
                          <td className="num">
                            <Tag color={f.CLASE_SEMAFORO[f.rangoIndice(v.indiceSeguro)]}>
                              {v.indiceSeguro}
                            </Tag>
                          </td>
                          <td className="num">{f.km(v.km)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Tarjeta>
          </>
        )}
      </div>
    </>
  )
}

/**
 * Alta de unidad, SOLO Administrador FOM. La regla dura de la app se
 * respeta completa: sin un GPS verificado y libre no se crea nada.
 */
function ModalNuevaUnidad({ abierto, areas, alCerrar, alGuardar, actor }) {
  const [alias, setAlias] = useState('')
  const [placa, setPlaca] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [anio, setAnio] = useState('')
  const [tipo, setTipo] = useState('camioneta')
  const [gpsId, setGpsId] = useState('')
  const [areaSel, setAreaSel] = useState('')
  const [gpsLibres, setGpsLibres] = useState(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Los GPS elegibles (verificados y sin unidad) se consultan al abrir.
  useEffect(() => {
    if (abierto) repo.admin.gps.disponibles().then(setGpsLibres).catch(() => setGpsLibres([]))
  }, [abierto])

  const cerrar = () => {
    setAlias(''); setPlaca(''); setMarca(''); setModelo(''); setAnio('')
    setTipo('camioneta'); setGpsId(''); setAreaSel(''); setError('')
    alCerrar()
  }

  const confirmar = async () => {
    setGuardando(true)
    setError('')
    try {
      await repo.vehiculos.crear(
        { alias, placa, marca, modelo, anio, tipo, gpsId, areaId: areaSel || null },
        actor
      )
      await alGuardar()
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Nueva unidad" abierto={abierto} alCerrar={cerrar} ancho={560}>
      {gpsLibres !== null && gpsLibres.length === 0 ? (
        <>
          <p>No hay GPS verificados libres en el inventario.</p>
          <p className="pnl-campo-ayuda">
            Registra y verifica un equipo en Administración FOM → GPS antes de crear la unidad.
          </p>
          <div className="pnl-chips">
            <button type="button" className="pnl-btn primario" onClick={cerrar}>Entendido</button>
          </div>
        </>
      ) : (
        <>
          <Campo etiqueta="Placa" error={error}>
            <input type="text" className="pnl-input" value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="A12BC3D" />
          </Campo>
          <Campo etiqueta="Alias (opcional)" ayuda="Si lo dejas vacío se numera como Unidad NN.">
            <input type="text" className="pnl-input" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Unidad 27" />
          </Campo>
          <Campo etiqueta="Marca">
            <input type="text" className="pnl-input" value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Toyota" />
          </Campo>
          <Campo etiqueta="Modelo">
            <input type="text" className="pnl-input" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Hilux" />
          </Campo>
          <Campo etiqueta="Año">
            <input type="number" className="pnl-input" value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="2026" />
          </Campo>
          <Campo etiqueta="Tipo">
            <select className="pnl-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="camioneta">Camioneta</option>
              <option value="camion">Camión</option>
              <option value="auto">Automóvil</option>
              <option value="otro">Otro</option>
            </select>
          </Campo>
          <Campo etiqueta="GPS verificado" ayuda="Obligatorio: la unidad nace reportando.">
            <select className="pnl-input" value={gpsId} onChange={(e) => setGpsId(e.target.value)}>
              <option value="">Selecciona el equipo…</option>
              {(gpsLibres ?? []).map((g) => (
                <option key={g.id} value={g.id}>{g.modelo} · {g.imei}</option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Área (opcional)">
            <select className="pnl-input" value={areaSel} onChange={(e) => setAreaSel(e.target.value)}>
              <option value="">Sin asignar</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </Campo>

          <div className="pnl-chips">
            <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>
              <Icono nombre="check" tam={16} />
              {guardando ? 'Creando…' : 'Crear unidad'}
            </button>
            <button type="button" className="pnl-btn sutil" onClick={cerrar} disabled={guardando}>
              Cancelar
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
