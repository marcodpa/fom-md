import { useState } from 'react'
import repo, { DIRECTORIO_REAL } from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import {
  Buscador, Cabecera, Campo, Cargando, Chips, ErrorCarga, Kpi, Modal, Tag, Tarjeta, Vacio,
} from '../comp/ui'
import * as f from '../datos/formato'
import { ROLES_ASIGNABLES, etiquetaRol } from '../datos/catalogos'
import { Icono } from '../Iconos'

// ============================================================
// USUARIOS DEL SISTEMA (solo Administrador FOM)
// Toda la gente de todas las empresas. Las reglas duras vienen del
// repositorio (jerarquía de rango, rol vs tipo de ente, Desempleados C.A.);
// aquí solo se muestran sus mensajes tal cual.
// ============================================================

function cargar(q, empresaId, rol) {
  if (DIRECTORIO_REAL) {
    return repo.admin.usuarios.listar({ q, rol }).then((lista) => ({ lista, empresas: [] }))
  }
  return Promise.all([
    repo.admin.usuarios.listar({ q, empresaId, rol }),
    repo.admin.empresas.listar({}),
  ]).then(([lista, empresas]) => ({ lista, empresas }))
}

export default function AdminUsuarios() {
  const sesion = useSesion()
  const actor = sesion?.perfil
  const [q, setQ] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [rol, setRol] = useState('')
  const [creando, setCreando] = useState(false)
  const [moviendo, setMoviendo] = useState(null)
  const [claveDe, setClaveDe] = useState(null) // {nombre, clave} tras restablecer
  const [aviso, setAviso] = useState('')

  const { datos, estado, recargar } = useDatos(() => cargar(q, empresaId, rol), [q, empresaId, rol])

  const accion = async (fn) => {
    setAviso('')
    try {
      await fn()
      await recargar()
    } catch (e) {
      setAviso(e.message)
    }
  }

  const restablecerClave = async (p) => {
    if (!window.confirm(`¿Restablecer la clave de ${p.nombre} a la por defecto?`)) return
    setAviso('')
    try {
      const r = await repo.admin.usuarios.cambiarClave(p.id, actor)
      setClaveDe({ nombre: p.nombre, clave: r.clave })
      await recargar()
    } catch (e) {
      setAviso(e.message)
    }
  }

  const aDesempleados = (p) => {
    if (!window.confirm(`${p.nombre} saldrá de ${p.empresaNombre} y su cuenta pasará a Desempleados C.A. ¿Continuar?`)) return
    accion(() => repo.admin.usuarios.enviarADesempleados(p.id, actor))
  }

  const eliminarDefinitivo = (p) => {
    if (!window.confirm(`¿Eliminar DEFINITIVAMENTE la cuenta de ${p.nombre}?`)) return
    if (!window.confirm('Esta acción no se puede deshacer. ¿Confirmas?')) return
    accion(() => repo.admin.usuarios.eliminarDefinitivo(p.id, actor))
  }

  return (
    <>
      <Cabecera
        titulo="Usuarios del sistema"
        bajada={DIRECTORIO_REAL
          ? 'Directorio real del ente autorizado por tu sesión.'
          : 'Todas las cuentas de todas las empresas, con las reglas de mando de la app.'}
      >
        <button type="button" className="pnl-btn primario" onClick={() => setCreando(true)}>
          <Icono nombre="mas" tam={16} />
          Nuevo usuario
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        {estado === 'cargando' && <Cargando filas={6} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} />}
        {estado === 'ok' && (
          <Contenido
            datos={datos}
            q={q}
            setQ={setQ}
            empresaId={empresaId}
            setEmpresaId={setEmpresaId}
            rol={rol}
            setRol={setRol}
            aviso={aviso}
            restablecerClave={restablecerClave}
            aDesempleados={aDesempleados}
            eliminarDefinitivo={eliminarDefinitivo}
            abrirMover={setMoviendo}
            directorioReal={DIRECTORIO_REAL}
          />
        )}
      </div>

      {estado === 'ok' && (
        <>
          <ModalCrear
            abierto={creando}
            empresas={datos.empresas}
            alCerrar={() => setCreando(false)}
            alGuardar={recargar}
            actor={actor}
            directorioReal={DIRECTORIO_REAL}
          />
          {!DIRECTORIO_REAL && <ModalMover
            usuario={moviendo}
            empresas={datos.empresas}
            alCerrar={() => setMoviendo(null)}
            alGuardar={recargar}
            actor={actor}
          />}
        </>
      )}

      <Modal titulo="Clave restablecida" abierto={!!claveDe} alCerrar={() => setClaveDe(null)} ancho={440}>
        {claveDe && (
          <>
            <p>
              La clave de <b>{claveDe.nombre}</b> quedó en <code>{claveDe.clave}</code>.
            </p>
            <p className="pnl-campo-ayuda">
              Entrégasela en persona: deberá cambiarla al entrar. No se volverá a mostrar.
            </p>
            <div className="pnl-chips">
              <button type="button" className="pnl-btn primario" onClick={() => setClaveDe(null)}>
                Entendido
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}

function Contenido({
  datos, q, setQ, empresaId, setEmpresaId, rol, setRol, aviso,
  restablecerClave, aDesempleados, eliminarDefinitivo, abrirMover, directorioReal,
}) {
  const { lista, empresas } = datos
  const desempleados = lista.filter((p) => p.esDesempleado).length

  return (
    <>
      <div className="pnl-grid k4">
        <Kpi titulo="Cuentas" valor={lista.length} icono="gente" nota="En el filtro actual" />
        <Kpi titulo="Conductores" valor={lista.filter((p) => p.conduce).length} icono="camion" nota="Con permiso de manejo" />
        <Kpi titulo="Clave temporal" valor={lista.filter((p) => p.claveTemporal).length} icono="escudo" tono="aviso" nota="Deben cambiarla al entrar" />
        <Kpi titulo="En Desempleados" valor={desempleados} icono="empresa" tono={desempleados > 0 ? 'aviso' : 'ok'} nota="Cuentas fuera de empresa" />
      </div>

      {aviso && <p className="pnl-campo-error" role="alert">{aviso}</p>}

      <Tarjeta
        titulo="Cuentas"
        accion={<Buscador valor={q} alCambiar={setQ} placeholder="Buscar por nombre, correo o cédula…" />}
        sinCuerpo
      >
        <div className="pnl-card-cuerpo">
          {!directorioReal && <div className="pnl-chips">
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
          </div>}
          <Chips
            opciones={directorioReal
              ? [
                  { v: '', t: 'Todos' },
                  { v: 'conductor', t: 'Conductores' },
                  { v: 'supervisor', t: 'Supervisores' },
                  { v: 'operator', t: 'Operadores' },
                  { v: 'usuario', t: 'Usuarios' },
                ]
              : [
                  { v: '', t: 'Todos' },
                  { v: 'conductor', t: 'Conductores' },
                  { v: 'supervisor_company', t: 'Supervisores' },
                  { v: 'supervisor_personal', t: 'Personales' },
                ]}
            valor={rol}
            alCambiar={setRol}
          />
        </div>

        {lista.length === 0 ? (
          <div className="pnl-card-cuerpo">
            <Vacio icono="gente" titulo="Sin cuentas que mostrar" texto="Prueba con otro filtro o crea el primer usuario." />
          </div>
        ) : (
          <div className="pnl-tabla-wrap">
            <table className="pnl-tabla">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>{directorioReal ? 'Alcance' : 'Empresa'}</th>
                  <th>Rol</th>
                  <th>Señales</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="pnl-persona">
                        <i className="pnl-avatar">{f.iniciales(p.nombre)}</i>
                        <div className="pnl-doble">
                          <b>{p.nombre}</b>
                          <span>{p.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{p.empresaNombre}</td>
                    <td>
                      <Tag color={p.rol === 'admin' ? 'azul' : 'gris'} plano>{p.rolEtiqueta}</Tag>
                    </td>
                    <td>
                      <div className="pnl-chips">
                        {p.claveTemporal && <Tag color="ambar" plano>Clave temporal</Tag>}
                        {p.esDesempleado && <Tag color="gris">Desempleado</Tag>}
                        {!p.perfilCompleto && <Tag color="gris" plano>Perfil incompleto</Tag>}
                      </div>
                    </td>
                    <td className="num">
                      {!directorioReal && p.rol !== 'admin' && (
                        <div className="pnl-chips">
                          <button type="button" className="pnl-btn sutil" onClick={() => abrirMover(p)}>
                            Mover
                          </button>
                          <button type="button" className="pnl-btn sutil" onClick={() => restablecerClave(p)}>
                            Clave
                          </button>
                          {p.esDesempleado ? (
                            <button type="button" className="pnl-btn sutil" onClick={() => eliminarDefinitivo(p)}>
                              Eliminar
                            </button>
                          ) : (
                            <button type="button" className="pnl-btn sutil" onClick={() => aDesempleados(p)}>
                              Dar salida
                            </button>
                          )}
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

const GRUPOS_CLAVE = [
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  'abcdefghijkmnopqrstuvwxyz',
  '23456789',
  '!@#$%*-_',
]
const CARACTERES_CLAVE = GRUPOS_CLAVE.join('')

function indiceAleatorio(limite) {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] % limite
}

function generarClaveTemporal() {
  const caracteres = GRUPOS_CLAVE.map((grupo) => grupo[indiceAleatorio(grupo.length)])
  while (caracteres.length < 20) {
    caracteres.push(CARACTERES_CLAVE[indiceAleatorio(CARACTERES_CLAVE.length)])
  }
  for (let i = caracteres.length - 1; i > 0; i -= 1) {
    const j = indiceAleatorio(i + 1)
    ;[caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]]
  }
  return caracteres.join('')
}

function ModalCrear({ abierto, empresas, alCerrar, alGuardar, actor, directorioReal }) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [rol, setRol] = useState('conductor')
  const [conduce, setConduce] = useState(false)
  const [clave, setClave] = useState(() => generarClaveTemporal())
  const [error, setError] = useState('')
  const [creado, setCreado] = useState(null) // {nombre, clave}
  const [guardando, setGuardando] = useState(false)

  const destino = empresas.find((e) => e.id === empresaId)
  const destinos = empresas.filter((e) => !e.respaldo)

  const cerrar = () => {
    setNombre(''); setApellido(''); setEmail(''); setEmpresaId(''); setRol('conductor')
    setConduce(false); setClave(generarClaveTemporal()); setError(''); setCreado(null)
    alCerrar()
  }

  const confirmar = async () => {
    setGuardando(true)
    setError('')
    try {
      if (!nombre.trim() || (directorioReal && !apellido.trim())) {
        throw new Error('Escribe el nombre y el apellido.')
      }
      if (!/.+@.+\..+/.test(email)) throw new Error('Escribe un correo válido.')
      if (directorioReal && clave.length < 16) {
        throw new Error('La contraseña temporal debe tener al menos 16 caracteres.')
      }
      const nombreCompleto = [nombre, directorioReal ? apellido : ''].filter(Boolean).join(' ').trim()
      const r = await repo.admin.usuarios.crear({
        nombre: nombreCompleto, email, rol, empresaId, conduce, clave,
      }, actor)
      await alGuardar()
      setCreado({ nombre: r.nombre, clave: r.clave, claveCreada: r.claveCreada !== false })
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const rolesReales = actor?.rol === 'admin_fom'
    ? [
        { v: 'supervisor', t: 'Supervisor' },
        { v: 'conductor', t: 'Conductor' },
        { v: 'operator', t: 'Operador' },
        { v: 'usuario', t: 'Usuario' },
      ]
    : [{ v: 'conductor', t: 'Conductor' }]

  return (
    <Modal titulo="Nuevo usuario" abierto={abierto} alCerrar={cerrar} ancho={520}>
      {creado ? (
        <>
          {creado.clave ? (
            <p><b>{creado.nombre}</b> ya puede entrar con la clave <code>{creado.clave}</code>.</p>
          ) : (
            <p><b>{creado.nombre}</b> ya pertenecía al sistema y conserva su contraseña actual.</p>
          )}
          <p className="pnl-campo-ayuda">
            Entrégasela en persona: deberá cambiarla al entrar. No se volverá a mostrar.
          </p>
          <div className="pnl-chips">
            <button type="button" className="pnl-btn primario" onClick={cerrar}>
              Entendido
            </button>
          </div>
        </>
      ) : (
        <>
          <Campo etiqueta="Nombre" error={error}>
            <input type="text" className="pnl-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          {directorioReal && (
            <Campo etiqueta="Apellido">
              <input type="text" className="pnl-input" value={apellido} onChange={(e) => setApellido(e.target.value)} />
            </Campo>
          )}
          <Campo etiqueta="Correo">
            <input type="email" className="pnl-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@empresa.com" />
          </Campo>
          {!directorioReal && <Campo etiqueta="Empresa">
            <select className="pnl-input" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
              <option value="">Selecciona el ente…</option>
              {destinos.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre} · {e.tipoEtiqueta}</option>
              ))}
            </select>
          </Campo>}
          <Campo etiqueta="Rol" ayuda="El repositorio valida rol contra tipo de ente, igual que la app.">
            <select className="pnl-input" value={rol} onChange={(e) => setRol(e.target.value)}>
              {(directorioReal ? rolesReales : ROLES_ASIGNABLES.map((r) => ({ v: r, t: etiquetaRol(r, destino?.tipo) }))).map((r) => (
                <option key={r.v} value={r.v}>{r.t}</option>
              ))}
            </select>
          </Campo>
          {!directorioReal && <Campo etiqueta="Permisos">
            <label className="pnl-chip" style={{ display: 'inline-flex', gap: 8 }}>
              <input
                type="checkbox"
                checked={rol === 'conductor' ? true : conduce}
                disabled={rol === 'conductor'}
                onChange={(e) => setConduce(e.target.checked)}
              />
              Conduce vehículos
            </label>
          </Campo>}
          {directorioReal && (
            <Campo etiqueta="Contraseña temporal" ayuda="Mínimo 16 caracteres. La persona deberá cambiarla al entrar.">
              <div className="pnl-chips">
                <input
                  type="text"
                  className="pnl-input"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  autoComplete="new-password"
                />
                <button type="button" className="pnl-btn sutil" onClick={() => setClave(generarClaveTemporal())}>
                  Generar otra
                </button>
              </div>
            </Campo>
          )}

          <div className="pnl-chips">
            <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando}>
              <Icono nombre="check" tam={16} />
              {guardando ? 'Creando…' : 'Crear usuario'}
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

function ModalMover({ usuario, empresas, alCerrar, alGuardar, actor }) {
  const [empresaId, setEmpresaId] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (!usuario) return null
  const destinos = empresas.filter((e) => !e.respaldo && e.id !== usuario.empresaId)

  const cerrar = () => {
    setEmpresaId(''); setError('')
    alCerrar()
  }

  const confirmar = async () => {
    setGuardando(true)
    setError('')
    try {
      await repo.admin.usuarios.mover(usuario.id, empresaId, actor)
      await alGuardar()
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={`Mover a ${usuario.nombre}`} abierto alCerrar={cerrar} ancho={460}>
      <Campo etiqueta="Ente destino" error={error} ayuda="El rol debe ser compatible con el tipo de ente.">
        <select className="pnl-input" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
          <option value="">Selecciona…</option>
          {destinos.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre} · {e.tipoEtiqueta}</option>
          ))}
        </select>
      </Campo>
      <div className="pnl-chips">
        <button type="button" className="pnl-btn primario" onClick={confirmar} disabled={guardando || !empresaId}>
          <Icono nombre="check" tam={16} />
          {guardando ? 'Moviendo…' : 'Mover'}
        </button>
        <button type="button" className="pnl-btn sutil" onClick={cerrar} disabled={guardando}>
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
