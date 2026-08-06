import { useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import {
  Cabecera, Campo, Cargando, Chips, ErrorCarga, Kpi, Modal, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'

// ============================================================
// PAGOS DEL SERVICIO (solo Administrador FOM)
// La facturación de FOM a cada ente: lo vencido arriba, y el registro
// de cada cuota con su estado.
// ============================================================

function cargar(empresaId, estadoPago) {
  return Promise.all([
    repo.admin.pagos.listar({}),
    repo.admin.pagos.listar({ empresaId, estado: estadoPago }),
    repo.admin.empresas.listar({}),
  ]).then(([todos, lista, empresas]) => ({
    todos,
    lista,
    empresas: empresas.filter((e) => !e.respaldo),
  }))
}

export default function AdminPagos() {
  const sesion = useSesion()
  const actor = sesion?.perfil
  const [empresaId, setEmpresaId] = useState('')
  const [estadoPago, setEstadoPago] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [aviso, setAviso] = useState('')

  const { datos, estado, recargar } = useDatos(() => cargar(empresaId, estadoPago), [empresaId, estadoPago])

  const cambiarEstado = (p, nuevo) => {
    const texto = nuevo === 'pagado'
      ? `¿Marcar pagada la cuota ${p.periodo} de ${p.empresaNombre}?`
      : `¿Marcar vencida la cuota ${p.periodo} de ${p.empresaNombre}?`
    if (!window.confirm(texto)) return
    setAviso('')
    repo.admin.pagos.actualizarEstado(p.id, nuevo, actor).then(recargar).catch((e) => setAviso(e.message))
  }

  return (
    <>
      <Cabecera
        titulo="Pagos del servicio"
        bajada="Cuotas mensuales de FOM por ente: registra, cobra y suspende con criterio."
      >
        <button type="button" className="pnl-btn primario" onClick={() => setRegistrando(true)}>
          <Icono nombre="mas" tam={16} />
          Registrar cuota
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        {estado === 'cargando' && <Cargando filas={6} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} />}
        {estado === 'ok' && (
          <Contenido
            datos={datos}
            empresaId={empresaId}
            setEmpresaId={setEmpresaId}
            estadoPago={estadoPago}
            setEstadoPago={setEstadoPago}
            aviso={aviso}
            cambiarEstado={cambiarEstado}
          />
        )}
      </div>

      {estado === 'ok' && (
        <ModalRegistrar
          abierto={registrando}
          empresas={datos.empresas}
          alCerrar={() => setRegistrando(false)}
          alGuardar={recargar}
          actor={actor}
        />
      )}
    </>
  )
}

function Contenido({ datos, empresaId, setEmpresaId, estadoPago, setEstadoPago, aviso, cambiarEstado }) {
  const { todos, lista, empresas } = datos

  const suma = (e) => todos.filter((p) => p.estado === e).reduce((a, p) => a + p.monto, 0)
  const cuenta = (e) => (e ? todos.filter((p) => p.estado === e).length : todos.length)

  return (
    <>
      <div className="pnl-grid k4">
        <Kpi titulo="Vencido" valor={f.moneda(suma('vencido'))} icono="alerta" tono={suma('vencido') > 0 ? 'malo' : 'ok'} nota={`${cuenta('vencido')} cuotas vencidas`} />
        <Kpi titulo="Pendiente" valor={f.moneda(suma('pendiente'))} icono="reloj" tono={suma('pendiente') > 0 ? 'aviso' : 'ok'} nota={`${cuenta('pendiente')} por cobrar`} />
        <Kpi titulo="Cobrado" valor={f.moneda(suma('pagado'))} icono="check" tono="ok" nota={`${cuenta('pagado')} cuotas pagadas`} />
        <Kpi titulo="Cuotas registradas" valor={todos.length} icono="costos" nota="En todo el sistema" />
      </div>

      {aviso && <p className="pnl-campo-error" role="alert">{aviso}</p>}

      <Tarjeta
        titulo="Registro de cuotas"
        accion={
          <select
            className="pnl-input"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            aria-label="Filtrar por empresa"
          >
            <option value="">Todas las empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        }
        sinCuerpo
      >
        <div className="pnl-card-cuerpo">
          <Chips
            opciones={[
              { v: '', t: 'Todas', n: cuenta('') },
              { v: 'vencido', t: 'Vencidas', n: cuenta('vencido') },
              { v: 'pendiente', t: 'Pendientes', n: cuenta('pendiente') },
              { v: 'pagado', t: 'Pagadas', n: cuenta('pagado') },
            ]}
            valor={estadoPago}
            alCambiar={setEstadoPago}
          />
        </div>

        {lista.length === 0 ? (
          <div className="pnl-card-cuerpo">
            <Vacio icono="costos" titulo="Sin cuotas que mostrar" texto="Prueba con otro filtro o registra la primera cuota." />
          </div>
        ) : (
          <div className="pnl-tabla-wrap">
            <table className="pnl-tabla">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Período</th>
                  <th className="num">Monto</th>
                  <th>Estado</th>
                  <th>Pagado el</th>
                  <th>Nota</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.empresaNombre}</b></td>
                    <td>{p.periodo}</td>
                    <td className="num"><b>{f.moneda(p.monto)}</b> {p.moneda}</td>
                    <td>
                      <Tag color={color('pago_estado', p.estado)}>{etiqueta('pago_estado', p.estado)}</Tag>
                    </td>
                    <td>{p.pagadoEn ? f.fecha(p.pagadoEn) : '—'}</td>
                    <td>{p.nota || '—'}</td>
                    <td className="num">
                      <div className="pnl-chips">
                        {p.estado !== 'pagado' && (
                          <button type="button" className="pnl-btn sutil" onClick={() => cambiarEstado(p, 'pagado')}>
                            <Icono nombre="check" tam={14} />
                            Pagada
                          </button>
                        )}
                        {p.estado === 'pendiente' && (
                          <button type="button" className="pnl-btn sutil" onClick={() => cambiarEstado(p, 'vencido')}>
                            Vencida
                          </button>
                        )}
                      </div>
                    </td>
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

function ModalRegistrar({ abierto, empresas, alCerrar, alGuardar, actor }) {
  const [empresaId, setEmpresaId] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cerrar = () => {
    setEmpresaId(''); setPeriodo(''); setMonto(''); setNota(''); setError('')
    alCerrar()
  }

  const confirmar = async () => {
    setGuardando(true)
    setError('')
    try {
      await repo.admin.pagos.registrar({ empresaId, monto: Number(monto), periodo, nota }, actor)
      await alGuardar()
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Registrar cuota" abierto={abierto} alCerrar={cerrar} ancho={480}>
      <Campo etiqueta="Empresa" error={error}>
        <select className="pnl-input" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
          <option value="">Selecciona el ente…</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Período" ayuda="La cuota mensual del servicio.">
        <input type="month" className="pnl-input" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
      </Campo>
      <Campo etiqueta="Monto (USD)">
        <input type="number" min="1" className="pnl-input" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="780" />
      </Campo>
      <Campo etiqueta="Nota (opcional)">
        <input type="text" className="pnl-input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Transferencia, referencia…" />
      </Campo>

      <div className="pnl-chips">
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>
          <Icono nombre="check" tam={16} />
          {guardando ? 'Registrando…' : 'Registrar'}
        </button>
        <button type="button" className="pnl-btn sutil" onClick={cerrar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
