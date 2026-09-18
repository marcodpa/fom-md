import { useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import { Cabecera, Campo, Cargando, Chips, ErrorCarga, Modal, Pestanas, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { esAdminFom } from '../roles'
import { Icono } from '../Iconos'

// ============================================================
// TRANSFERENCIAS ENTRE ENTES (doble control)
// ------------------------------------------------------------
// Mover una persona o un vehículo de una empresa a otra no es editar un
// campo: el ente de origen la libera y el de destino la acepta, y hasta
// que no pasan las dos cosas no se completa. Cualquiera de los dos puede
// rechazarla y quien la abrió puede cancelarla. Cada decisión viaja con la
// versión que se vio, para que dos personas no se pisen.
// ============================================================

const ESTADO = { pending: ['En curso', 'ambar'], completed: ['Completada', 'verde'], rejected: ['Rechazada', 'rojo'], cancelled: ['Cancelada', 'gris'] }
const ROLES_DESTINO = [['conductor', 'Conductor'], ['operator', 'Operador'], ['usuario', 'Usuario']]
const PIE = { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }

function paso(t) {
  if (t.estado !== 'pending') return null
  if (!t.liberadaEn) return { clave: 'origin-release', texto: 'Liberar en origen' }
  if (!t.aceptadaEn) return { clave: 'destination-acceptance', texto: 'Aceptar en destino' }
  return null
}

export default function Transferencias() {
  const sesion = useSesion()
  const actor = sesion?.perfil
  const [pestana, setPestana] = useState('identidad')
  const [estado, setEstado] = useState('pending')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [creando, setCreando] = useState(false)
  const [cerrando, setCerrando] = useState(null) // { t, paso }

  const lista = useDatos(
    () => (pestana === 'identidad' ? repo.transferencias.identidad.listar({ estado }) : repo.transferencias.vehiculo.listar({ estado })),
    [pestana, estado],
  )
  const empresas = useDatos(() => repo.admin.empresas.listar({}), [])
  const nombreEmpresa = (id) => empresas.datos?.find((e) => e.id === id)?.nombre ?? id?.slice(0, 8) ?? '—'

  async function actuar(fn, exito) {
    setOcupado(true)
    setAviso('')
    try {
      await fn()
      setAviso(exito)
      lista.recargar()
      return true
    } catch (e) {
      setAviso(e?.message || 'No se pudo completar la acción.')
      return false
    } finally {
      setOcupado(false)
    }
  }
  const modulo = () => (pestana === 'identidad' ? repo.transferencias.identidad : repo.transferencias.vehiculo)

  return (
    <>
      <Cabecera titulo="Transferencias" bajada="Personas y vehículos que cambian de ente, con liberación en origen y aceptación en destino.">
        <button type="button" className="pnl-btn primario" onClick={() => setCreando(true)}>
          <Icono nombre="mas" tam={16} />
          {pestana === 'identidad' ? 'Transferir persona' : 'Transferir vehículo'}
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        {aviso && <p className="pnl-campo-error" role="status">{aviso}</p>}
        <Pestanas opciones={[{ v: 'identidad', t: 'Personas' }, { v: 'vehiculo', t: 'Vehículos' }]} valor={pestana} alCambiar={setPestana} />

        <Tarjeta titulo={pestana === 'identidad' ? 'Transferencias de personas' : 'Transferencias de vehículos'} sinCuerpo>
          <div className="pnl-card-cuerpo">
            <Chips
              opciones={[{ v: 'pending', t: 'En curso' }, { v: 'completed', t: 'Completadas' }, { v: 'rejected', t: 'Rechazadas' }, { v: 'cancelled', t: 'Canceladas' }, { v: '', t: 'Todas' }]}
              valor={estado}
              alCambiar={setEstado}
            />
          </div>
          {lista.estado === 'cargando' && <Cargando filas={4} />}
          {lista.estado === 'error' && <ErrorCarga onReintentar={lista.recargar} error={lista.error} />}
          {lista.estado === 'ok' && (lista.datos.length === 0 ? (
            <div className="pnl-card-cuerpo">
              <Vacio icono="comparar" titulo="Sin transferencias" texto="No hay movimientos entre entes con este filtro." />
            </div>
          ) : (
            <div className="pnl-filas">
              {lista.datos.map((t) => {
                const [esT, esC] = ESTADO[t.estado] ?? [t.estado, 'gris']
                const siguiente = paso(t)
                return (
                  <div className="pnl-fila" key={t.id}>
                    <Icono nombre={pestana === 'identidad' ? 'gente' : 'camion'} tam={18} />
                    <div className="pnl-fila-txt">
                      <b>
                        {nombreEmpresa(t.origenId)} → {nombreEmpresa(t.destinoId)}
                        {t.rolDestino ? ` · llega como ${t.rolDestino}` : ''}
                        {t.codigoDestino ? ` · código ${t.codigoDestino}` : ''}
                      </b>
                      <span>
                        {t.motivo} · abierta {f.desde(t.creadaEn)}
                        {t.liberadaEn ? ` · liberada ${f.desde(t.liberadaEn)}` : ''}
                        {t.aceptadaEn ? ` · aceptada ${f.desde(t.aceptadaEn)}` : ''}
                        {t.completadaEn ? ` · completada ${f.desde(t.completadaEn)}` : ''}
                      </span>
                    </div>
                    <Tag color={esC}>{esT}</Tag>
                    {siguiente && (
                      <button type="button" className="pnl-btn primario" disabled={ocupado} onClick={() => actuar(() => modulo().decidir(t, siguiente.clave), 'Paso registrado.')}>
                        {siguiente.texto}
                      </button>
                    )}
                    {t.estado === 'pending' && (
                      <>
                        <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => setCerrando({ t, paso: 'rejection' })}>Rechazar</button>
                        <button type="button" className="pnl-btn sutil" disabled={ocupado} onClick={() => setCerrando({ t, paso: 'cancellation' })}>Cancelar</button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </Tarjeta>
      </div>

      <ModalNueva
        tipo={pestana}
        abierto={creando}
        empresas={empresas.datos ?? []}
        admin={esAdminFom(actor)}
        alCerrar={() => setCreando(false)}
        guardar={(datos) => actuar(() => modulo().crear(datos), 'Transferencia abierta: falta que origen libere y destino acepte.')}
      />
      <ModalCierre cierre={cerrando} alCerrar={() => setCerrando(null)} confirmar={(motivo) => actuar(() => modulo().decidir(cerrando.t, cerrando.paso, motivo), cerrando.paso === 'rejection' ? 'Transferencia rechazada.' : 'Transferencia cancelada.')} />
    </>
  )
}

function ModalNueva({ tipo, abierto, empresas, admin, alCerrar, guardar }) {
  const [d, setD] = useState({ sujeto: '', origenId: '', destinoId: '', rolDestino: 'conductor', codigoDestino: '', motivo: '' })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }))
  // Personas de toda la plataforma para el administrador; la gente del
  // propio ente para un supervisor. Vehículos: los del ente de la sesión.
  const personas = useDatos(() => (admin ? repo.admin.plataforma.personas({ limite: 200 }) : repo.admin.usuarios.listar({})), [admin])
  const vehiculos = useDatos(() => repo.vehiculos.listar(), [])

  async function confirmar() {
    if (!d.sujeto) return setError(tipo === 'identidad' ? 'Elige la persona.' : 'Elige el vehículo.')
    if (!d.origenId || !d.destinoId || d.origenId === d.destinoId) return setError('Origen y destino tienen que ser entes distintos.')
    if (tipo === 'vehiculo' && !d.codigoDestino.trim()) return setError('Di el código que tendrá el vehículo en el destino.')
    if (d.motivo.trim().length < 3) return setError('Escribe el motivo.')
    setGuardando(true)
    setError('')
    const ok = await guardar(
      tipo === 'identidad'
        ? { usuarioId: d.sujeto, origenId: d.origenId, destinoId: d.destinoId, rolDestino: d.rolDestino, motivo: d.motivo }
        : { vehiculoId: d.sujeto, origenId: d.origenId, destinoId: d.destinoId, codigoDestino: d.codigoDestino.trim(), motivo: d.motivo },
    )
    setGuardando(false)
    if (ok) alCerrar()
  }

  const opcionesPersona = (personas.datos ?? []).filter((p) => p.rol !== 'admin_fom')
  return (
    <Modal titulo={tipo === 'identidad' ? 'Transferir una persona' : 'Transferir un vehículo'} abierto={abierto} alCerrar={alCerrar} ancho={560}>
      <Campo etiqueta={tipo === 'identidad' ? 'Persona' : 'Vehículo'} error={error}>
        <select className="pnl-input" value={d.sujeto} onChange={(e) => {
          const id = e.target.value
          const p = tipo === 'identidad' ? opcionesPersona.find((x) => (x.userId ?? x.id) === id) : null
          setD((x) => ({ ...x, sujeto: id, origenId: p?.empresaId ?? x.origenId }))
        }}>
          <option value="">Elige…</option>
          {tipo === 'identidad'
            ? opcionesPersona.map((p) => <option key={p.id} value={p.userId ?? p.id}>{p.nombre} · {p.email}{p.empresaNombre ? ` · ${p.empresaNombre}` : ''}</option>)
            : (vehiculos.datos ?? []).map((v) => <option key={v.id} value={v.id}>{v.alias} · {v.placa}</option>)}
        </select>
      </Campo>
      <div className="pnl-grid k2">
        <Campo etiqueta="Ente de origen">
          <select className="pnl-input" value={d.origenId} onChange={set('origenId')}>
            <option value="">Elige…</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Ente de destino">
          <select className="pnl-input" value={d.destinoId} onChange={set('destinoId')}>
            <option value="">Elige…</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </Campo>
      </div>
      {tipo === 'identidad' ? (
        <Campo etiqueta="Rol en el destino" ayuda={admin ? 'Solo el administrador FOM puede entregar a alguien como supervisor.' : undefined}>
          <select className="pnl-input" value={d.rolDestino} onChange={set('rolDestino')}>
            {(admin ? [['supervisor', 'Supervisor'], ...ROLES_DESTINO] : ROLES_DESTINO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Campo>
      ) : (
        <Campo etiqueta="Código en el destino" ayuda="El alias con el que la unidad existirá en la otra empresa.">
          <input className="pnl-input" value={d.codigoDestino} onChange={set('codigoDestino')} placeholder="vm-xx-000" />
        </Campo>
      )}
      <Campo etiqueta="Motivo">
        <input className="pnl-input" value={d.motivo} onChange={set('motivo')} placeholder="Cambio de contrato" />
      </Campo>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Cancelar</button>
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>{guardando ? 'Abriendo…' : 'Abrir transferencia'}</button>
      </div>
    </Modal>
  )
}

function ModalCierre({ cierre, alCerrar, confirmar }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  async function ok() {
    if (motivo.trim().length < 3) return setError('Escribe el motivo: queda en el historial.')
    setGuardando(true)
    setError('')
    const bien = await confirmar(motivo.trim())
    setGuardando(false)
    if (bien) {
      setMotivo('')
      alCerrar()
    }
  }
  return (
    <Modal titulo={cierre?.paso === 'rejection' ? 'Rechazar la transferencia' : 'Cancelar la transferencia'} abierto={Boolean(cierre)} alCerrar={alCerrar} ancho={460}>
      <Campo etiqueta="Motivo" error={error}>
        <textarea className="pnl-input" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Campo>
      <div style={PIE}>
        <button type="button" className="pnl-btn sutil" onClick={alCerrar} disabled={guardando}>Volver</button>
        <button type="button" className="pnl-btn primario" onClick={ok} disabled={guardando}>{guardando ? 'Guardando…' : 'Confirmar'}</button>
      </div>
    </Modal>
  )
}
