import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import {
  Buscador, Cabecera, Cargando, Chips, ErrorCarga, Kpi, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import * as f from '../datos/formato'
import { etiqueta, color } from '../datos/catalogos'
import { Icono } from '../Iconos'

// Filtros de la vista. "Con pendientes" es lo que el supervisor debe perseguir.
const FILTROS = [
  { v: 'todos', t: 'Todos' },
  { v: 'conductores', t: 'Conductores' },
  { v: 'sin_unidad', t: 'Sin unidad' },
  { v: 'pendientes', t: 'Con pendientes' },
]

/** Lo que le falta a una persona para estar al día, con los textos de la app. */
function faltantes(p) {
  const lista = []
  if (!p.perfilCompleto) lista.push('Perfil sin completar')
  if (p.licenciaEstado === 'por_vencer') lista.push('Licencia por vencer')
  if (p.licenciaEstado === 'vencido') lista.push('Licencia vencida')
  if (p.medicaEstado === 'por_vencer') lista.push('Certificado médico por vencer')
  if (p.medicaEstado === 'vencido') lista.push('Certificado médico vencido')
  return lista
}

const tienePendientes = (p) =>
  !p.perfilCompleto ||
  (p.licenciaEstado !== null && p.licenciaEstado !== 'vigente') ||
  (p.medicaEstado !== null && p.medicaEstado !== 'vigente')

/** Una celda de CSV: comillas dobles escapadas, como espera Excel. */
function celda(valor) {
  const t = String(valor ?? '').replace(/"/g, '""')
  return `"${t}"`
}

/** Descarga el roster sin librerías: Blob + enlace temporal. */
function exportarCSV(lista) {
  const cabecera = [
    'Nombre', 'Cédula', 'Correo', 'Teléfono', 'Rol', 'Unidad', 'Licencia', 'Grado',
    'Vence licencia', 'Estado licencia', 'Vence certificado médico', 'Estado certificado médico',
    'Índice de manejo seguro', 'Pendientes',
  ]
  const filas = lista.map((p) => [
    p.nombre,
    p.cedula,
    p.email,
    p.telefono,
    etiqueta('rol', p.rol),
    p.unidad ? p.unidadNombre : 'Sin unidad',
    p.licenciaNumero || '',
    p.licenciaCategoria ? `Grado ${p.licenciaCategoria}` : '',
    p.licenciaVence ? f.fecha(p.licenciaVence) : '',
    p.licenciaEstado ? etiqueta('documento_estado', p.licenciaEstado) : '',
    p.cartaMedicaVence ? f.fecha(p.cartaMedicaVence) : '',
    p.medicaEstado ? etiqueta('documento_estado', p.medicaEstado) : '',
    p.indiceSeguro ?? '',
    faltantes(p).join(' / '),
  ])
  const csv = [cabecera, ...filas].map((fila) => fila.map(celda).join(';')).join('\r\n')
  // El BOM evita que Excel rompa los acentos al abrir el archivo.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `personal-fom-${f.hoyISO()}.csv`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

export default function Personal() {
  const navegar = useNavigate()
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const gente = useDatos(() => repo.personal.listar({ q }), [q])
  const lista = useMemo(() => gente.datos ?? [], [gente.datos])

  const conteos = useMemo(() => ({
    todos: lista.length,
    conductores: lista.filter((p) => p.conduce).length,
    sin_unidad: lista.filter((p) => !p.unidad).length,
    pendientes: lista.filter(tienePendientes).length,
  }), [lista])

  const visibles = useMemo(() => {
    if (filtro === 'conductores') return lista.filter((p) => p.conduce)
    if (filtro === 'sin_unidad') return lista.filter((p) => !p.unidad)
    if (filtro === 'pendientes') return lista.filter(tienePendientes)
    return lista
  }, [lista, filtro])

  const conUnidad = lista.filter((p) => p.unidad).length
  const vencidos = lista.filter(
    (p) => p.licenciaEstado === 'vencido' || p.medicaEstado === 'vencido'
  ).length
  const porVencer = lista.filter(
    (p) => p.licenciaEstado === 'por_vencer' || p.medicaEstado === 'por_vencer'
  ).length
  const conDocs = lista.filter(
    (p) =>
      p.licenciaEstado === 'vencido' || p.medicaEstado === 'vencido' ||
      p.licenciaEstado === 'por_vencer' || p.medicaEstado === 'por_vencer'
  ).length

  const opciones = FILTROS.map((o) => ({ ...o, n: conteos[o.v] }))

  const bajada =
    gente.estado === 'ok'
      ? `${f.numero(lista.length)} ${lista.length === 1 ? 'persona' : 'personas'} · ${f.numero(conteos.conductores)} al volante`
      : 'La gente de la empresa, sus licencias y su unidad asignada.'

  return (
    <>
      <Cabecera titulo="Personal" bajada={bajada}>
        <Buscador valor={q} alCambiar={setQ} placeholder="Buscar por nombre, cédula o correo…" />
        <button
          type="button"
          className="pnl-btn"
          onClick={() => exportarCSV(visibles)}
          disabled={visibles.length === 0}
        >
          <Icono nombre="descargar" tam={16} />
          Exportar CSV
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        {gente.estado === 'cargando' && <Cargando filas={7} />}
        {gente.estado === 'error' && <ErrorCarga onReintentar={gente.recargar} />}

        {gente.estado === 'ok' && (
          <>
            <div className="pnl-grid k4">
              <Kpi
                titulo="Personas"
                valor={f.numero(lista.length)}
                icono="gente"
                nota="registradas en la empresa"
              />
              <Kpi
                titulo="Conductores"
                valor={f.numero(conteos.conductores)}
                icono="velocidad"
                nota="habilitados para manejar"
              />
              <Kpi
                titulo="Con unidad asignada"
                valor={f.numero(conUnidad)}
                icono="camion"
                nota={`${f.numero(conteos.sin_unidad)} sin unidad`}
              />
              <Kpi
                titulo="Documentos por vencer o vencidos"
                valor={f.numero(conDocs)}
                icono="documento"
                tono={vencidos > 0 ? 'malo' : porVencer > 0 ? 'aviso' : ''}
                nota={
                  conDocs === 0
                    ? 'todo el mundo al día'
                    : `${f.numero(vencidos)} vencidos · ${f.numero(porVencer)} por vencer`
                }
                notaTono={vencidos > 0 ? 'malo' : porVencer > 0 ? 'aviso' : ''}
              />
            </div>

            <Chips opciones={opciones} valor={filtro} alCambiar={setFiltro} />

            {lista.length === 0 && q !== '' && (
              <Tarjeta>
                <Vacio
                  icono="buscar"
                  titulo="Sin resultados"
                  texto={`Ningún usuario coincide con «${q}».`}
                  accion={
                    <button type="button" className="pnl-btn" onClick={() => setQ('')}>
                      Limpiar búsqueda
                    </button>
                  }
                />
              </Tarjeta>
            )}

            {lista.length === 0 && q === '' && (
              <Tarjeta>
                <Vacio
                  icono="gente"
                  titulo="Todavía no hay gente cargada"
                  texto="Cuando el personal entre por primera vez a la app, va a aparecer aquí con su licencia y su unidad."
                />
              </Tarjeta>
            )}

            {lista.length > 0 && visibles.length === 0 && (
              <Tarjeta>
                <Vacio
                  icono="check"
                  titulo="Nadie en este filtro"
                  texto="Ninguna persona cumple con lo que estás filtrando. Prueba con otra pestaña."
                  accion={
                    <button type="button" className="pnl-btn" onClick={() => setFiltro('todos')}>
                      Ver a todos
                    </button>
                  }
                />
              </Tarjeta>
            )}

            {visibles.length > 0 && (
              <Tarjeta
                titulo="Roster"
                accion={
                  <span className="pnl-tag gris plano">
                    {f.numero(visibles.length)} {visibles.length === 1 ? 'persona' : 'personas'}
                  </span>
                }
                sinCuerpo
              >
                <Tabla gente={visibles} navegar={navegar} />
              </Tarjeta>
            )}
          </>
        )}
      </div>
    </>
  )
}

function Tabla({ gente, navegar }) {
  return (
    <div className="pnl-tabla-wrap">
      <table className="pnl-tabla">
        <thead>
          <tr>
            <th>Persona</th>
            <th>Cédula</th>
            <th>Rol</th>
            <th>Unidad</th>
            <th>Licencia</th>
            <th>Certificado médico</th>
            <th className="num">Índice</th>
          </tr>
        </thead>
        <tbody>
          {gente.map((p) => {
            const pendientes = faltantes(p)
            const ir = () => navegar(`/panel/personal/${p.id}`)
            return (
              <tr
                key={p.id}
                className="pnl-tabla-fila-link"
                tabIndex={0}
                onClick={ir}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    ir()
                  }
                }}
              >
                <td>
                  <div className="pnl-persona">
                    <i className="pnl-avatar">{f.iniciales(p.nombre)}</i>
                    <div className="pnl-doble">
                      <b>{p.nombre}</b>
                      <span>{p.email}</span>
                      {pendientes.length > 0 && (
                        <Tag color="ambar" plano>
                          {`Falta: ${pendientes.join(', ').toLowerCase()}`}
                        </Tag>
                      )}
                    </div>
                  </div>
                </td>
                <td>{p.cedula || 'Sin cédula'}</td>
                <td>
                  <Tag color={p.rol === 'conductor' ? 'azul' : 'gris'}>{etiqueta('rol', p.rol)}</Tag>
                </td>
                <td>
                  {p.unidad ? (
                    <div className="pnl-doble">
                      <b>{p.unidad.alias}</b>
                      <span>{p.unidad.placa}</span>
                    </div>
                  ) : (
                    <span className="pnl-tag gris plano">Sin unidad</span>
                  )}
                </td>
                <td>
                  {p.licenciaEstado ? (
                    <div className="pnl-doble">
                      <Tag color={color('documento_estado', p.licenciaEstado)}>
                        {etiqueta('documento_estado', p.licenciaEstado)}
                      </Tag>
                      <span>{`Grado ${p.licenciaCategoria}`}</span>
                    </div>
                  ) : (
                    <span className="pnl-tag gris plano">Sin licencia</span>
                  )}
                </td>
                <td>
                  {p.medicaEstado ? (
                    <Tag color={color('documento_estado', p.medicaEstado)}>
                      {etiqueta('documento_estado', p.medicaEstado)}
                    </Tag>
                  ) : (
                    <span className="pnl-tag gris plano">Sin certificado</span>
                  )}
                </td>
                <td className="num">
                  {p.indiceSeguro === null || p.indiceSeguro === undefined ? (
                    '—'
                  ) : (
                    <Tag color={f.CLASE_SEMAFORO[f.rangoIndice(p.indiceSeguro)]}>
                      {f.numero(p.indiceSeguro)}
                    </Tag>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
