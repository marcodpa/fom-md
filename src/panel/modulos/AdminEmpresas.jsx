import { useEffect, useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import {
  Buscador, Cabecera, Campo, Cargando, Chips, ErrorCarga, Kpi, Modal, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import * as f from '../datos/formato'
import { COMPANY_TIPO, color, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'

// ============================================================
// EMPRESAS (solo Administrador FOM)
// La capa multiempresa: cada ente del sistema con su gente, su flota,
// su deuda y el estado del servicio.
// ============================================================

function cargar(q, tipo) {
  return repo.admin.empresas.listar({ q, tipo })
}

export default function AdminEmpresas() {
  const sesion = useSesion()
  const actor = sesion?.perfil
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState('')
  const [creando, setCreando] = useState(false)
  const [predeDe, setPredeDe] = useState(null) // empresa cuyo listado de compañías se edita
  const [aviso, setAviso] = useState('')

  const { datos, estado, recargar } = useDatos(() => cargar(q, tipo), [q, tipo])

  const accion = async (fn) => {
    setAviso('')
    try {
      await fn()
      await recargar()
    } catch (e) {
      setAviso(e.message)
    }
  }

  const alternarServicio = (e) => {
    const verbo = e.servicioActivo ? 'suspender' : 'reactivar'
    if (!window.confirm(`¿Seguro que quieres ${verbo} el servicio de ${e.nombre}?`)) return
    accion(() => repo.admin.empresas.setServicio(e.id, !e.servicioActivo, actor))
  }

  const eliminar = (e) => {
    if (!window.confirm(`¿Eliminar el ente ${e.nombre}? Esta acción queda en auditoría.`)) return
    accion(() => repo.admin.empresas.eliminar(e.id, actor))
  }

  return (
    <>
      <Cabecera
        titulo="Empresas"
        bajada="Todos los entes del sistema: contratistas, compañías y cuentas personales."
      >
        <button type="button" className="pnl-btn primario" onClick={() => setCreando(true)}>
          <Icono nombre="mas" tam={16} />
          Nueva empresa
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        {estado === 'cargando' && <Cargando filas={6} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} />}
        {estado === 'ok' && (
          <Contenido
            lista={datos}
            q={q}
            setQ={setQ}
            tipo={tipo}
            setTipo={setTipo}
            aviso={aviso}
            alternarServicio={alternarServicio}
            eliminar={eliminar}
            abrirPredefinidas={setPredeDe}
          />
        )}
      </div>

      <ModalNueva abierto={creando} alCerrar={() => setCreando(false)} alGuardar={recargar} actor={actor} />
      <ModalPredefinidas empresa={predeDe} alCerrar={() => setPredeDe(null)} alGuardar={recargar} actor={actor} />
    </>
  )
}

function Contenido({ lista, q, setQ, tipo, setTipo, aviso, alternarServicio, eliminar, abrirPredefinidas }) {
  const operativas = lista.filter((e) => !e.respaldo)
  const activas = operativas.filter((e) => e.servicioActivo).length
  const deudaTotal = operativas.reduce((a, e) => a + e.deuda, 0)

  return (
    <>
      <div className="pnl-grid k4">
        <Kpi titulo="Entes en el sistema" valor={operativas.length} icono="empresa" nota="Sin contar el de respaldo" />
        <Kpi titulo="Con servicio activo" valor={activas} icono="check" tono="ok" nota={`${operativas.length - activas} suspendidos`} />
        <Kpi titulo="Deuda acumulada" valor={f.moneda(deudaTotal)} icono="costos" tono={deudaTotal > 0 ? 'malo' : 'ok'} nota="Cuotas pendientes y vencidas" />
        <Kpi titulo="Usuarios totales" valor={lista.reduce((a, e) => a + e.usuarios, 0)} icono="gente" nota="En todas las empresas" />
      </div>

      {aviso && <p className="pnl-campo-error" role="alert">{aviso}</p>}

      <Tarjeta
        titulo="Todos los entes"
        accion={<Buscador valor={q} alCambiar={setQ} placeholder="Buscar por nombre, RIF o contacto…" />}
        sinCuerpo
      >
        <div className="pnl-card-cuerpo">
          <Chips
            opciones={[
              { v: '', t: 'Todos' },
              ...COMPANY_TIPO.map((t) => ({ v: t, t: etiqueta('company_tipo', t) })),
            ]}
            valor={tipo}
            alCambiar={setTipo}
          />
        </div>

        {lista.length === 0 ? (
          <div className="pnl-card-cuerpo">
            <Vacio icono="buscar" titulo="Sin resultados" texto="Prueba con otro filtro o limpia el buscador." />
          </div>
        ) : (
          <div className="pnl-tabla-wrap">
            <table className="pnl-tabla">
              <thead>
                <tr>
                  <th>Ente</th>
                  <th>Tipo</th>
                  <th>Contacto</th>
                  <th className="num">Usuarios</th>
                  <th className="num">Vehículos</th>
                  <th>Deuda</th>
                  <th>Servicio</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {lista.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="pnl-doble">
                        <b>{e.nombre}</b>
                        <span>{e.rif}</span>
                      </div>
                    </td>
                    <td>
                      <Tag color={e.respaldo ? 'gris' : color('company_tipo', e.tipo)}>
                        {e.respaldo ? 'Respaldo' : e.tipoEtiqueta}
                      </Tag>
                    </td>
                    <td>
                      <div className="pnl-doble">
                        <b>{e.contacto || '—'}</b>
                        <span>{e.telefono || e.email || ''}</span>
                      </div>
                    </td>
                    <td className="num">{e.usuarios}</td>
                    <td className="num">{e.vehiculos}</td>
                    <td>
                      {e.deuda > 0 ? (
                        <Tag color="rojo">{f.moneda(e.deuda)} · {e.pagosPendientes} cuotas</Tag>
                      ) : (
                        <Tag color="verde" plano>Al día</Tag>
                      )}
                    </td>
                    <td>
                      {e.respaldo ? (
                        <Tag color="gris" plano>—</Tag>
                      ) : (
                        <Tag color={e.servicioActivo ? 'verde' : 'rojo'}>
                          {e.servicioActivo ? 'Activo' : 'Suspendido'}
                        </Tag>
                      )}
                    </td>
                    <td className="num">
                      {!e.respaldo && (
                        <div className="pnl-chips">
                          {e.tipo === 'estandar' && (
                            <button type="button" className="pnl-btn sutil" onClick={() => abrirPredefinidas(e)}>
                              Compañías
                            </button>
                          )}
                          <button type="button" className="pnl-btn sutil" onClick={() => alternarServicio(e)}>
                            {e.servicioActivo ? 'Suspender' : 'Reactivar'}
                          </button>
                          <button type="button" className="pnl-btn sutil" onClick={() => eliminar(e)}>
                            Eliminar
                          </button>
                        </div>
                      )}
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

function ModalNueva({ abierto, alCerrar, alGuardar, actor }) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('estandar')
  const [rif, setRif] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [prede, setPrede] = useState([])
  const [companias, setCompanias] = useState([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Las compañías disponibles se cargan al abrir (solo aplican a contratistas).
  useEffect(() => {
    if (abierto) repo.admin.empresas.listar({ tipo: 'predefinida' }).then(setCompanias).catch(() => {})
  }, [abierto])

  const cerrar = () => {
    setNombre(''); setRif(''); setContacto(''); setTelefono(''); setEmail('')
    setTipo('estandar'); setPrede([]); setError('')
    alCerrar()
  }

  const confirmar = async () => {
    setGuardando(true)
    setError('')
    try {
      await repo.admin.empresas.crear({ nombre, tipo, rif, contacto, telefono, email, predefinidas: prede }, actor)
      await alGuardar()
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Nueva empresa" abierto={abierto} alCerrar={cerrar} ancho={560}>
      <Campo etiqueta="Nombre del ente" error={error}>
        <input type="text" className="pnl-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Transporte El Menito, C.A." />
      </Campo>
      <Campo etiqueta="Tipo" ayuda="Contratista opera flota; Compañía solo supervisa; Personal es una cuenta individual.">
        <select className="pnl-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {COMPANY_TIPO.map((t) => (
            <option key={t} value={t}>{etiqueta('company_tipo', t)}</option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="RIF">
        <input type="text" className="pnl-input" value={rif} onChange={(e) => setRif(e.target.value)} placeholder="J-12345678-9" />
      </Campo>
      <Campo etiqueta="Contacto">
        <input type="text" className="pnl-input" value={contacto} onChange={(e) => setContacto(e.target.value)} />
      </Campo>
      <Campo etiqueta="Teléfono">
        <input type="tel" className="pnl-input" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+58 …" />
      </Campo>
      <Campo etiqueta="Correo">
        <input type="email" className="pnl-input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Campo>

      {tipo === 'estandar' && companias.length > 0 && (
        <Campo etiqueta="Trabaja para" ayuda="Compañías cuyos supervisores verán esta flota.">
          <div className="pnl-chips">
            {companias.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`pnl-chip${prede.includes(c.id) ? ' activo' : ''}`}
                aria-pressed={prede.includes(c.id)}
                onClick={() =>
                  setPrede((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))
                }
              >
                {c.nombre}
              </button>
            ))}
          </div>
        </Campo>
      )}

      <div className="pnl-chips">
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>
          <Icono nombre="check" tam={16} />
          {guardando ? 'Creando…' : 'Crear empresa'}
        </button>
        <button type="button" className="pnl-btn sutil" onClick={cerrar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}

function ModalPredefinidas({ empresa, alCerrar, alGuardar, actor }) {
  const [prede, setPrede] = useState(null)
  const [companias, setCompanias] = useState([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!empresa) return
    setPrede(empresa.predefinidas ?? [])
    repo.admin.empresas.listar({ tipo: 'predefinida' }).then(setCompanias).catch(() => {})
  }, [empresa])

  if (!empresa) return null

  const cerrar = () => {
    setPrede(null); setError(''); alCerrar()
  }

  const confirmar = async () => {
    setGuardando(true)
    setError('')
    try {
      await repo.admin.empresas.asignarPredefinidas(empresa.id, prede ?? [], actor)
      await alGuardar()
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Compañías de ${empresa.nombre}`} abierto alCerrar={cerrar} ancho={480}>
      <Campo etiqueta="Trabaja para" error={error} ayuda="Sus supervisores ven la flota de esta contratista.">
        <div className="pnl-chips">
          {companias.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`pnl-chip${prede?.includes(c.id) ? ' activo' : ''}`}
              aria-pressed={prede?.includes(c.id)}
              onClick={() =>
                setPrede((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))
              }
            >
              {c.nombre}
            </button>
          ))}
          {companias.length === 0 && <span>No hay compañías registradas.</span>}
        </div>
      </Campo>
      <div className="pnl-chips">
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>
          <Icono nombre="check" tam={16} />
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="pnl-btn sutil" onClick={cerrar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
