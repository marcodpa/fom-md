import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import {
  Buscador, Cabecera, Campo, Cargando, Chips, ErrorCarga, Kpi, Modal, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import { Barras } from '../comp/Grafico'
import * as f from '../datos/formato'
import { color, diasPara, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'

// ============================================================
// DOCUMENTOS
// Vencimientos de vehículos y personas en un solo tablero: lo urgente arriba,
// el resto filtrable y exportable.
// ============================================================

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Marca de orden de bytes: sin ella Excel abre el CSV con los acentos rotos.
const BOM = String.fromCharCode(0xfeff)

/** Ruta del expediente del titular según el ámbito del documento. */
function rutaTitular(d) {
  if (!d.titularId) return null
  return d.ambito === 'vehiculo' ? `/panel/flota/${d.titularId}` : `/panel/personal/${d.titularId}`
}

const nombreAmbito = (ambito) => (ambito === 'vehiculo' ? 'Vehículo' : 'Personal')

/** Descarga la tabla filtrada como CSV, sin librerías. */
function exportarCsv(lista) {
  const cabeceras = ['Documento', 'Titular', 'Ámbito', 'Vence', 'Estado']
  const filas = lista.map((d) => [
    d.tipo,
    d.titular,
    nombreAmbito(d.ambito),
    d.venceEn,
    etiqueta('documento_estado', d.estado),
  ])
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const texto = [cabeceras, ...filas].map((fila) => fila.map(escapar).join(';')).join('\r\n')

  const blob = new Blob([BOM, texto], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = `documentos-${f.hoyISO()}.csv`
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}

/** Vencimientos agrupados por mes, de este mes en adelante (6 meses). */
function vencimientosPorMes(lista) {
  const hoy = new Date()
  const meses = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
    meses.push({ anio: d.getFullYear(), mes: d.getMonth(), etiqueta: MESES[d.getMonth()], valor: 0 })
  }
  lista.forEach((doc) => {
    const v = new Date(`${doc.venceEn}T00:00:00`)
    const casilla = meses.find((m) => m.anio === v.getFullYear() && m.mes === v.getMonth())
    if (casilla) casilla.valor += 1
  })
  return meses.map((m) => ({ etiqueta: m.etiqueta, valor: m.valor }))
}

function cargar(ambito, estadoDoc, q) {
  return Promise.all([
    repo.documentos.listar({}),
    repo.documentos.listar({ ambito, estado: estadoDoc, q }),
  ]).then(([todos, lista]) => ({ todos, lista }))
}

export default function Documentos() {
  const [ambito, setAmbito] = useState('')
  const [estadoDoc, setEstadoDoc] = useState('')
  const [q, setQ] = useState('')
  const [renovando, setRenovando] = useState(null)

  const { datos, estado, error, recargar } = useDatos(() => cargar(ambito, estadoDoc, q), [ambito, estadoDoc, q])

  return (
    <>
      <Cabecera
        titulo="Documentos"
        bajada="Pólizas, certificados y licencias con su fecha de vencimiento al día."
      >
        <button
          type="button"
          className="pnl-btn"
          onClick={() => exportarCsv(datos?.lista ?? [])}
          disabled={estado !== 'ok' || (datos?.lista.length ?? 0) === 0}
        >
          <Icono nombre="descargar" tam={16} />
          Exportar CSV
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        {estado === 'cargando' && <Cargando filas={6} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} />}
        {estado === 'ok' && (
          <Contenido
            datos={datos}
            ambito={ambito}
            setAmbito={setAmbito}
            estadoDoc={estadoDoc}
            setEstadoDoc={setEstadoDoc}
            q={q}
            setQ={setQ}
            abrirRenovar={setRenovando}
          />
        )}
      </div>

      <ModalRenovar
        documento={renovando}
        alCerrar={() => setRenovando(null)}
        alGuardar={recargar}
      />
    </>
  )
}

function Contenido({ datos, ambito, setAmbito, estadoDoc, setEstadoDoc, q, setQ, abrirRenovar }) {
  const { todos, lista } = datos

  const vencidos = todos.filter((d) => d.estado === 'vencido').length
  const porVencer = todos.filter((d) => d.estado === 'por_vencer').length
  const vigentes = todos.filter((d) => d.estado === 'vigente').length

  const urgentes = useMemo(
    () => todos.filter((d) => d.estado === 'vencido' || diasPara(d.venceEn) <= 7).slice(0, 10),
    [todos]
  )
  const totalUrgentes = todos.filter((d) => d.estado === 'vencido' || diasPara(d.venceEn) <= 7).length
  const porMes = useMemo(() => vencimientosPorMes(todos), [todos])

  const cuentaAmbito = (a) => (a ? todos.filter((d) => d.ambito === a).length : todos.length)
  const cuentaEstado = (e) => (e ? todos.filter((d) => d.estado === e).length : todos.length)

  return (
    <>
      <div className="pnl-grid k4">
        <Kpi
          titulo="Vencidos"
          valor={f.numero(vencidos)}
          icono="alerta"
          tono={vencidos > 0 ? 'malo' : 'ok'}
          nota={vencidos > 0 ? 'Regularízalos cuanto antes' : 'Ninguno vencido'}
        />
        <Kpi
          titulo="Por vencer en 30 días"
          valor={f.numero(porVencer)}
          icono="reloj"
          tono={porVencer > 0 ? 'aviso' : 'ok'}
          nota={porVencer > 0 ? 'Programa la renovación' : 'Nada próximo a vencer'}
        />
        <Kpi
          titulo="Vigentes"
          valor={f.numero(vigentes)}
          icono="escudo"
          tono="ok"
          nota="Con más de 30 días de vigencia"
        />
        <Kpi
          titulo="Total"
          valor={f.numero(todos.length)}
          icono="documento"
          nota="Documentos bajo control"
        />
      </div>

      <div className="pnl-grid dos-tercios">
        <Tarjeta
          titulo="Atención inmediata"
          accion={
            totalUrgentes > urgentes.length ? (
              <span className="pnl-link">{totalUrgentes} en total</span>
            ) : null
          }
        >
          {urgentes.length === 0 ? (
            <Vacio
              icono="check"
              titulo="Nada urgente"
              texto="Ningún documento vence en los próximos 7 días."
            />
          ) : (
            <div className="pnl-filas">
              {urgentes.map((d) => {
                const ruta = rutaTitular(d)
                const clase = `pnl-fila ${d.estado === 'vencido' ? 'critica' : 'aviso'}`
                const contenido = (
                  <>
                    <div className="pnl-fila-txt">
                      <b>{d.tipo}</b>
                      <span>{d.titular} · {nombreAmbito(d.ambito)}</span>
                    </div>
                    <Tag color={color('documento_estado', d.estado)}>{f.vencimiento(d.venceEn)}</Tag>
                  </>
                )
                return ruta ? (
                  <Link key={d.id} to={ruta} className={clase}>{contenido}</Link>
                ) : (
                  <div key={d.id} className={clase}>{contenido}</div>
                )
              })}
            </div>
          )}
        </Tarjeta>

        <Tarjeta titulo="Vencimientos de los próximos 6 meses">
          <Barras datos={porMes} formato={(n) => f.numero(n)} />
        </Tarjeta>
      </div>

      <Tarjeta
        titulo="Todos los documentos"
        accion={<Buscador valor={q} alCambiar={setQ} placeholder="Buscar por tipo o titular…" />}
        sinCuerpo
      >
        <div className="pnl-card-cuerpo">
          <Chips
            opciones={[
              { v: '', t: 'Todos', n: cuentaAmbito('') },
              { v: 'vehiculo', t: 'De vehículos', n: cuentaAmbito('vehiculo') },
              { v: 'persona', t: 'De personal', n: cuentaAmbito('persona') },
            ]}
            valor={ambito}
            alCambiar={setAmbito}
          />
          <Chips
            opciones={[
              { v: '', t: 'Todos', n: cuentaEstado('') },
              { v: 'vencido', t: 'Vencidos', n: cuentaEstado('vencido') },
              { v: 'por_vencer', t: 'Por vencer', n: cuentaEstado('por_vencer') },
              { v: 'vigente', t: 'Vigentes', n: cuentaEstado('vigente') },
            ]}
            valor={estadoDoc}
            alCambiar={setEstadoDoc}
          />
        </div>

        {lista.length === 0 ? (
          <div className="pnl-card-cuerpo">
            <Vacio
              icono="buscar"
              titulo="No hay documentos que mostrar"
              texto="Prueba con otro filtro o limpia el buscador."
            />
          </div>
        ) : (
          <div className="pnl-tabla-wrap">
            <table className="pnl-tabla">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Titular</th>
                  <th>Ámbito</th>
                  <th>Vence</th>
                  <th>Estado</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {lista.map((d) => {
                  const ruta = rutaTitular(d)
                  return (
                    <tr key={d.id}>
                      <td>{d.tipo}</td>
                      <td>
                        {ruta ? (
                          <Link to={ruta} className="pnl-link">{d.titular}</Link>
                        ) : (
                          d.titular
                        )}
                      </td>
                      <td>{nombreAmbito(d.ambito)}</td>
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
                      <td className="num">
                        <button type="button" className="pnl-btn sutil" onClick={() => abrirRenovar(d)}>
                          <Icono nombre="editar" tam={15} />
                          Renovar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </>
  )
}

function ModalRenovar({ documento, alCerrar, alGuardar }) {
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (!documento) return null

  const cerrar = () => {
    setFecha('')
    setError('')
    alCerrar()
  }

  const confirmar = async () => {
    if (!fecha || fecha <= f.hoyISO()) {
      setError('La nueva fecha debe ser posterior a hoy.')
      return
    }
    setGuardando(true)
    try {
      await repo.documentos.actualizarVencimiento(documento.id, fecha)
      await alGuardar()
      cerrar()
    } catch {
      setError('No pudimos guardar el cambio. Inténtalo de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Renovar ${documento.tipo}`} abierto alCerrar={cerrar} ancho={460}>
      <Campo
        etiqueta="Nueva fecha de vencimiento"
        error={error}
        ayuda={`${documento.titular} · ${f.vencimiento(documento.venceEn)}`}
      >
        <input
          type="date"
          className="pnl-input"
          value={fecha}
          min={f.hoyISO()}
          onChange={(e) => {
            setFecha(e.target.value)
            setError('')
          }}
        />
      </Campo>

      <div className="pnl-chips">
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>
          <Icono nombre="check" tam={16} />
          {guardando ? 'Guardando…' : 'Guardar vencimiento'}
        </button>
        <button type="button" className="pnl-btn sutil" onClick={cerrar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
