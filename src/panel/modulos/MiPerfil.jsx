import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { rolCanonico } from '../roles'
import { indiceDePersona } from '../datos/perfilUsuario'
import { PESTANAS, PestanasPerfil, MetricasPerfil, Identidad, FichaDatos, UnidadAsignada, Conduccion, Inspecciones, Documentos } from '../comp/PerfilUsuario'
import { useSesion } from '../useSesion'
import { Icono } from '../Iconos'
import { Cabecera, Campo, Cargando, Datos, ErrorCarga, Modal } from '../comp/ui'
import { cargarMiPerfil, guardarMiPerfil } from '../datos/miPerfil'
import { iniciales, fecha } from '../datos/formato'
import './perfil-alertas.css'
import Avatar from '../comp/Avatar'
import EditarMisDatos from '../comp/EditarMisDatos'
import FotosDe from '../comp/FotosDe'
import { claveDeTipo, huecosPersona } from '../comp/FotosIdentidad'
import { ArchivosDeDocumento } from './Documentos'
import './usuarios-perfil.css'
import MovilAccesos from '../comp/movil-accesos'
import { useVistaTelefono } from '../comp/movil-navegacion'
import MiPerfilMovil from './MiPerfilMovil'

const PESTANAS_PROPIAS = PESTANAS

const ESTADOS = { vigente: ['Vigente', 'verde'], por_vencer: ['Por vencer', 'ambar'], vencido: ['Vencido', 'rojo'] }
const CAMPOS = [['nombre', 'Nombre y apellido', 'text'], ['cedula', 'Cédula', 'text'], ['telefono', 'Teléfono', 'tel'], ['direccion', 'Dirección', 'text'], ['fechaNacimiento', 'Fecha de nacimiento', 'date']]

export default function MiPerfil() {
  const sesion = useSesion()
  return <Perfil key={`${sesion?.perfil.correo || sesion?.perfil.id}:${sesion?.perfil.empresaGestion?.id || 'propia'}`} />
}

function Perfil() {
  const sesion = useSesion()
  const [parametros, setParametros] = useSearchParams()
  const pestana = PESTANAS_PROPIAS.some(t => t.v === parametros.get('vista')) ? parametros.get('vista') : 'datos'
  const setPestana = vista => setParametros(actual => { const siguientes = new URLSearchParams(actual); siguientes.set('vista', vista); return siguientes }, { replace: true })
  const scorePropio = useDatos(() => rolCanonico(sesion?.perfil.rol) === 'conductor' ? repo.manejo.miScore({ dias: 7 }) : Promise.resolve(null), [sesion?.perfil.id])
  const [perfil, setPerfil] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [revision, setRevision] = useState(0)
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [documento, setDocumento] = useState(null)

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
  function cancelar() { if (!guardando) { setEditando(false); setError('') } }

  const documentos = [...(perfil?.documentos ?? [])]
  if (perfil?.cedula && !documentos.some(d => /c[eé]dula|identidad/i.test(d.tipo))) documentos.unshift({ tipo: 'Cédula de identidad', numero: perfil.cedula, declarado: true })
  if (perfil?.conduce && perfil.licenciaNumero && !documentos.some(d => /licencia/i.test(d.tipo))) documentos.push({ tipo: 'Licencia de conducir', numero: perfil.licenciaNumero, venceEn: perfil.licenciaVence, declarado: true })
  if (perfil?.conduce && perfil.cartaMedicaVence && !documentos.some(d => /m[eé]dic/i.test(d.tipo))) documentos.push({ tipo: 'Carta médica', venceEn: perfil.cartaMedicaVence, declarado: true })
  const persona = perfil ? {
    ...perfil,
    rol: perfil.rolCodigo || sesion?.perfil.rol || perfil.rol,
    manejo: scorePropio.datos || perfil.manejo,
    indiceSeguro: indiceDePersona(scorePropio.datos) ?? perfil.indiceSeguro,
    manejoError: scorePropio.estado === 'error' ? scorePropio.error.message : perfil.manejoError,
    manejoCargando: scorePropio.estado === 'cargando',
    eventosDisponibles: perfil.eventosDisponibles ?? Boolean(perfil.modoDemo),
    inspeccionesDisponibles: perfil.inspeccionesDisponibles ?? Boolean(perfil.modoDemo),
    odtsDisponibles: perfil.odtsDisponibles ?? Boolean(perfil.modoDemo),
  } : null
  const porTipo = useMemo(() => {
    const score = scorePropio.datos || perfil?.manejo
    if (score) return [
      { etiqueta: 'Frenadas bruscas', valor: score.frenadas },
      { etiqueta: 'Aceleraciones bruscas', valor: score.aceleraciones },
      { etiqueta: 'Excesos de velocidad', valor: score.excesos },
    ].filter(e => Number.isFinite(e.valor))
    const cuenta = new Map()
    for (const evento of perfil?.eventos ?? []) cuenta.set(evento.nombre, (cuenta.get(evento.nombre) || 0) + 1)
    return [...cuenta].map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor)
  }, [perfil, scorePropio.datos])

  // El conductor en la vista de teléfono: la pestaña «Mi perfil» de la app, con
  // estos mismos datos y los mismos diálogos (editar, documentos).
  const esMovil = useVistaTelefono()
  const [viendoDocumentos, setViendoDocumentos] = useState(false)
  const dialogos = <>
    <EditarMisDatos abierto={editando} perfil={perfil} borrador={borrador} setBorrador={setBorrador}
      guardando={guardando} error={error} alGuardar={guardar} alCancelar={cancelar} />
    <Modal abierto={Boolean(documento)} titulo="Información del documento" alCerrar={() => setDocumento(null)} ancho={760}><div className="pa-modal">{documento && <><h3 className="fp-modal-tipo"><Icono nombre="documento" tam={26} />{documento.tipo}</h3><Datos items={[{ etiqueta: 'Número', valor: documento.numero || 'Sin registrar' }, { etiqueta: 'Vencimiento', valor: documento.venceEn ? fecha(documento.venceEn) : 'Sin fecha registrada' }, { etiqueta: 'Estado', valor: ESTADOS[documento.estado]?.[0] || 'Sin estado disponible' }]} /><p className="pa-ayuda">{documento.declarado ? 'Dato declarado en tu perfil.' : 'Documento registrado en tu cuenta.'}</p>{claveDeTipo(documento.tipo) && perfil?.id ? <FotosDe huecos={huecosPersona(perfil.id, claveDeTipo(documento.tipo))} /> : documento.id && !documento.declarado ? <ArchivosDeDocumento documento={documento} /> : <p className="pa-nota">Este documento no admite fotos todavía.</p>}<div className="pa-modal-acciones"><button className="pnl-btn primario" onClick={() => setDocumento(null)}>Entendido</button></div></>}</div></Modal>
  </>
  if (esMovil && rolCanonico(sesion?.perfil.rol) === 'conductor') {
    return <>
      {cargando ? <div className="pnl-cuerpo"><Cargando filas={4} /></div>
        : !perfil ? <div className="pnl-cuerpo"><ErrorCarga error={{ message: error }} onReintentar={() => setRevision(v => v + 1)} /></div>
          : <MiPerfilMovil persona={persona} sesion={sesion?.perfil} aviso={aviso} alEditar={editar}
            documentos={documentos} alVerDocumentos={() => setViendoDocumentos(true)} />}
      <Modal abierto={viendoDocumentos && !documento} titulo="Documentos" alCerrar={() => setViendoDocumentos(false)} ancho={760}>
        {viendoDocumentos && persona && <Documentos persona={persona} alActualizar={() => setRevision(v => v + 1)} documentos={documentos} error={perfil.documentosError} alVer={setDocumento} />}
      </Modal>
      {dialogos}
    </>
  }

  return <div className="usr-perfil usr-propio pa-superficie">
    <div className="usr-regreso"><Link className="pnl-volver" to="/panel"><Icono nombre="volver" tam={16} />Inicio</Link></div>
    <Cabecera titulo="Mi perfil" bajada="Tus datos, conducción, inspecciones y documentos.">
      {perfil?.editable && !cargando && <button className="pnl-btn primario" onClick={editar}><Icono nombre="editar" tam={18} />Editar mis datos</button>}
    </Cabecera>
    <div className="pnl-cuerpo">
      {cargando ? <Cargando filas={4} /> : !perfil ? <ErrorCarga error={{ message: error }} onReintentar={() => setRevision(v => v + 1)} /> : <>
        {aviso && <p className="pa-confirmacion" role="status"><Icono nombre="check" tam={18} />{aviso}</p>}
        <Identidad persona={persona} avatar={<Avatar userId={perfil.id} iniciales={iniciales(perfil.nombre)} nombre={perfil.nombre} clase="pnl-avatar-l" tam={160} />} />
        <MetricasPerfil persona={persona} propio />
        <PestanasPerfil valor={pestana} alCambiar={setPestana} opciones={PESTANAS_PROPIAS} />
        <section className="usr-panel-pestana" role="tabpanel" id={`usr-panel-${pestana}`} aria-labelledby={`usr-tab-${pestana}`}>
          {pestana === 'datos' && <div className="pnl-grid dos-tercios">
            <FichaDatos persona={persona} />
            <UnidadAsignada persona={persona} unidadActual={persona.unidad} puedeEditar={false} unidades={[]} />
          </div>}
          {pestana === 'conduccion' && <Conduccion persona={persona} porTipo={porTipo} />}
          {pestana === 'inspecciones' && <Inspecciones inspecciones={persona.inspecciones ?? []} error={persona.inspeccionesError || (persona.inspeccionesDisponibles === false ? 'Tu historial de inspecciones todavía no está disponible en la web.' : '')} />}
          {pestana === 'documentos' && <Documentos persona={persona} alActualizar={() => setRevision(v => v + 1)} documentos={documentos} error={perfil.documentosError} alVer={setDocumento} />}
        </section>
      </>}
      {/* Solo en el teléfono: lo que no está en la barra de abajo, y cerrar sesión. */}
      <MovilAccesos />
    </div>
    {dialogos}

  </div>
}
