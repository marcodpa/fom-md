import { useEffect, useState } from 'react'
import { useSesion } from '../useSesion'
import { Icono } from '../Iconos'
import { Cabecera, Campo, Cargando, Datos, ErrorCarga, Modal, Tag, Tarjeta, Vacio } from '../comp/ui'
import { cargarMiPerfil, guardarMiPerfil } from '../datos/miPerfil'
import { iniciales, fecha } from '../datos/formato'

const ESTADOS = { vigente: ['Vigente', 'verde'], por_vencer: ['Por vencer', 'ambar'], vencido: ['Vencido', 'rojo'] }
const CAMPOS = [ ['nombre', 'Nombre y apellido', 'text'], ['cedula', 'Cédula', 'text'], ['telefono', 'Teléfono', 'tel'], ['direccion', 'Dirección', 'text'], ['fechaNacimiento', 'Fecha de nacimiento', 'date'] ]

export default function MiPerfil() {
  const sesion = useSesion()
  return <Perfil key={sesion?.perfil.correo || sesion?.perfil.id} />
}

function Perfil() {
  const [perfil, setPerfil] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [revision, setRevision] = useState(0)
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [documento, setDocumento] = useState(null)
  const [seguridad, setSeguridad] = useState(false)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    setError('')
    cargarMiPerfil().then(p => { if (vivo) setPerfil(p) }).catch(e => { if (vivo) setError(e.message) }).finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [revision])

  function editar() {
    setBorrador(Object.fromEntries(CAMPOS.map(([clave]) => [clave, perfil[clave] || ''])))
    setAviso('')
    setError('')
    setEditando(true)
  }

  async function guardar(e) {
    e.preventDefault()
    if (guardando) return
    setGuardando(true)
    setError('')
    try {
      const nuevo = await guardarMiPerfil(borrador, perfil)
      setPerfil(nuevo)
      setEditando(false)
      setAviso('Tus datos se guardaron correctamente.')
    } catch (e) { setError(e.message) }
    finally { setGuardando(false) }
  }

  const documentos = [...(perfil?.documentos ?? [])]
  if (perfil?.cedula && !documentos.some(d => /c[eé]dula|identidad/i.test(d.tipo))) documentos.unshift({ tipo: 'Cédula de identidad', numero: perfil.cedula, declarado: true })
  if (perfil?.conduce && perfil.licenciaNumero && !documentos.some(d => /licencia/i.test(d.tipo))) documentos.push({ tipo: 'Licencia de conducir', numero: perfil.licenciaNumero, venceEn: perfil.licenciaVence, declarado: true })
  if (perfil?.conduce && perfil.cartaMedicaVence && !documentos.some(d => /m[eé]dic/i.test(d.tipo))) documentos.push({ tipo: 'Carta médica', venceEn: perfil.cartaMedicaVence, declarado: true })
  const valor = (v, disponible = true) => v || (disponible ? 'Sin registrar' : 'No disponible en la web')

  return <>
    <Cabecera titulo="Mi perfil" bajada="Tu información personal, tus documentos y la seguridad de tu cuenta.">
      {perfil?.editable && !cargando && (editando ? <button className="pnl-btn sutil" disabled={guardando} onClick={() => { setEditando(false); setError('') }}>Cancelar</button> : <button className="pnl-btn primario" onClick={editar}><Icono nombre="editar" tam={18} />Editar mi perfil</button>)}
    </Cabecera>
    <div className="pnl-cuerpo">
      {cargando ? <Cargando filas={4} /> : !perfil ? <ErrorCarga error={error} onReintentar={() => setRevision(v => v + 1)} /> : <>
        {aviso && <p className="mp-exito" role="status"><Icono nombre="check" tam={18} />{aviso}</p>}
        <div className="mp-layout">
          <aside className="mp-identidad">
            <Tarjeta>
              <div className="mp-avatar">{perfil.fotoUrl ? <img src={perfil.fotoUrl} alt={`Foto de ${perfil.nombre}`} /> : <span>{iniciales(perfil.nombre)}</span>}</div>
              <h2>{perfil.nombre}</h2>
              <Tag color="azul">{perfil.rol}</Tag>
              <p className="mp-email">{perfil.email}</p>
              <div className="mp-empresa"><Icono nombre="empresa" tam={18} /><span>{perfil.empresa}</span></div>
              <p className="mp-nota">La foto de perfil se cambia desde la app.</p>
            </Tarjeta>
            <Tarjeta titulo="Seguridad"><p className="mp-nota">Administra el acceso a tu cuenta FOM.</p><button className="pnl-btn sutil mp-seguridad" onClick={() => setSeguridad(true)}><Icono nombre="escudo" tam={18} />Cambiar contraseña<Icono nombre="flecha" tam={16} /></button></Tarjeta>
          </aside>
          <div className="mp-contenido">
            {perfil.conduce && <Tarjeta titulo="Índice de manejo seguro">
              {perfil.indiceSeguro != null ? <div className="mp-score"><div style={{ '--score': `${Math.max(0, Math.min(100, perfil.indiceSeguro))}%` }}><strong>{perfil.indiceSeguro}</strong><small>de 100</small></div><p>{perfil.indiceSeguro >= 80 ? 'Manejo seguro' : perfil.indiceSeguro >= 60 ? 'Puedes mejorar' : 'Requiere atención'}<small>Consulta el detalle de tus recorridos en la app.</small></p></div> : <p className="mp-nota">El índice de manejo y los eventos por cada 100 km se consultan en Mi perfil de la app. Este dato todavía no está disponible para tu perfil en la web.</p>}
            </Tarjeta>}
            <Tarjeta titulo="Mi información">
              {editando ? <form className="mp-form" onSubmit={guardar}>
                {CAMPOS.map(([clave, etiqueta, tipo]) => <Campo key={clave} etiqueta={etiqueta} ayuda={clave === 'telefono' ? 'Incluye el código de país: +58…' : undefined}><input className="pnl-input" type={tipo} value={borrador[clave]} disabled={guardando} required={clave === 'nombre'} maxLength={clave === 'direccion' ? 300 : clave === 'nombre' ? 160 : undefined} onChange={e => setBorrador(b => ({ ...b, [clave]: e.target.value }))} /></Campo>)}
                <Campo etiqueta="Email" ayuda="El correo de acceso lo cambia un administrador."><input className="pnl-input" value={perfil.email} readOnly /></Campo>
                {!perfil.completoDisponible && <p className="mp-nota mp-form-pie">Si un dato no aparece en la web, escribe un valor solo cuando quieras actualizarlo.</p>}
                {error && <p className="pnl-campo-error mp-form-pie" role="alert">{error}</p>}
                <div className="mp-form-pie"><button className="pnl-btn primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button></div>
              </form> : <Datos items={[{ etiqueta: 'Nombre y apellido', valor: perfil.nombre }, { etiqueta: 'Cédula', valor: valor(perfil.cedula, perfil.editable || perfil.completoDisponible) }, { etiqueta: 'Teléfono', valor: valor(perfil.telefono, perfil.editable || perfil.completoDisponible) }, { etiqueta: 'Dirección', valor: valor(perfil.direccion, perfil.completoDisponible) }, { etiqueta: 'Fecha de nacimiento', valor: perfil.fechaNacimiento ? fecha(perfil.fechaNacimiento) : valor(null, perfil.completoDisponible) }, { etiqueta: 'Email', valor: perfil.email }]} />}
            </Tarjeta>
            <Tarjeta titulo="Mis documentos">
              {perfil.documentosError ? <p className="pnl-campo-error" role="alert">{perfil.documentosError}<button className="pnl-btn sutil" onClick={() => setRevision(v => v + 1)}>Volver a cargar</button></p> : documentos.length ? <div className="mp-documentos">{documentos.map((d, i) => <button key={d.id || `${d.tipo}-${i}`} className="mp-documento" onClick={() => setDocumento(d)}><span className="mp-doc-icon"><Icono nombre="documento" tam={22} /></span><span><b>{d.tipo}</b><small>{[d.numero && `N.º ${d.numero}`, d.venceEn && `Vence ${fecha(d.venceEn)}`].filter(Boolean).join(' · ') || 'Ver información del documento'}</small></span>{ESTADOS[d.estado] && <Tag color={ESTADOS[d.estado][1]}>{ESTADOS[d.estado][0]}</Tag>}<span aria-hidden="true">›</span></button>)}</div> : <Vacio icono="documento" titulo="Sin documentos para mostrar" texto="Tu cédula, licencia, carta médica y demás documentos personales aparecerán aquí cuando estén disponibles." />}
            </Tarjeta>
            {perfil.aviso && <p className="mp-disponibilidad"><Icono nombre="info" tam={18} />{perfil.aviso}</p>}
          </div>
        </div>
      </>}
    </div>
    <Modal abierto={Boolean(documento)} titulo={documento?.tipo || 'Documento'} alCerrar={() => setDocumento(null)} ancho={540}>
      {documento && <><Datos items={[{ etiqueta: 'Número', valor: documento.numero || 'Sin registrar' }, { etiqueta: 'Vencimiento', valor: documento.venceEn ? fecha(documento.venceEn) : 'Sin fecha registrada' }]} /><p className="mp-nota">Para ver o subir la foto y corregir el vencimiento, abre este documento en Mi perfil de la app.</p></>}
    </Modal>
    <Modal abierto={seguridad} titulo="Cambiar contraseña" alCerrar={() => setSeguridad(false)} ancho={480}><p>Abre la app FOM y entra en <strong>Mi perfil → Seguridad → Cambiar contraseña</strong>.</p><p className="mp-nota">El cambio de contraseña habitual todavía no está conectado en la web. El formulario de primer ingreso sirve únicamente para claves temporales.</p><button className="pnl-btn primario" onClick={() => setSeguridad(false)}>Entendido</button></Modal>
  </>
}
