import { useRef, useState } from 'react'
import { HAY_API, claveIdempotente } from '../datos/api'
import repo from '../datos/repo'
import { useSesion } from '../useSesion'
import { TIPOS_CREDENCIAL, puedeEditarCredenciales, credencialesVigentes, cuerpoCredencial } from '../datos/credencialesPersona'
import { Campo, Modal, Tarjeta, Tag } from './ui'
import * as f from '../datos/formato'
import { estadoDocumento, color } from '../datos/catalogos'

function borradorDe(c, tipo) {
  return { tipo, numero: c?.number || '', categoria: c?.category || '', emitidaEn: c?.issuedAt || '', venceEn: c?.expiresAt || '', motivo: '' }
}

export default function CredencialesPersona({ persona, alActualizar }) {
  const sesion = useSesion()
  const [editando, setEditando] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const actuales = credencialesVigentes(persona.credenciales)
  const puede = HAY_API && puedeEditarCredenciales(sesion?.perfil, persona)
  return <>
    <Tarjeta titulo="Licencia y aptitud médica">
      <p className="usr-nota">Estos registros pertenecen a la persona y mantienen su historial aunque cambie de empresa.</p>
      {mensaje && <p className="usr-nota" role="status">{mensaje}</p>}
      <div className="pnl-filas">{TIPOS_CREDENCIAL.map(t => {
        const c = actuales.find(x => x.kind === t.valor)
        const estado = c?.expiresAt ? estadoDocumento(c.expiresAt) : null
        return <div className="pnl-fila" key={t.valor}><div className="pnl-fila-txt"><b>{t.texto}</b>
          <span>{c ? [c.number, c.category ? `Grado o categoría ${c.category}` : '', c.expiresAt ? `Vence ${f.fecha(c.expiresAt)}` : ''].filter(Boolean).join(' · ') : 'Sin registro de credencial disponible'}</span>
        </div>{estado && <Tag color={color('documento_estado', estado)}>{f.vencimiento(c.expiresAt)}</Tag>}
        {puede && <button type="button" className="pnl-btn sutil" onClick={() => { setMensaje(''); setEditando(borradorDe(c, t.valor)) }}>{c ? 'Actualizar' : 'Registrar'} {t.valor === 'driver_license' ? 'licencia' : 'aptitud médica'}</button>}</div>
      })}</div>
    </Tarjeta>
    {editando && <EditarCredencial key={editando.tipo} persona={persona} inicial={editando} alCerrar={() => setEditando(null)} alHecho={async c => {
      // La respuesta de escritura no sustituye la comprobación por lectura independiente.
      const ficha = await repo.personal.obtener(persona.userId || persona.id)
      const recibida = credencialesVigentes(ficha?.credenciales).find(x => x.id === c.id)
      if (!recibida) throw new Error('El servidor respondió, pero la lectura no confirma el nuevo registro. Recarga el perfil antes de repetir.')
      await alActualizar?.()
      setMensaje('Guardado y comprobado en el perfil. La versión anterior permanece en el historial.')
      setEditando(null)
    }} />}
  </>
}

function EditarCredencial({ persona, inicial, alCerrar, alHecho }) {
  const intento = useRef(null)
  const [d, setD] = useState(inicial)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const licencia = d.tipo === 'driver_license'
  const campo = (clave, valor) => setD(actual => ({ ...actual, [clave]: valor }))
  const guardar = async e => {
    e.preventDefault()
    if (ocupado) return
    setError('')
    try {
      const firma = JSON.stringify(cuerpoCredencial(d))
      if (intento.current?.firma !== firma) intento.current = { firma, clave: claveIdempotente() }
    } catch (e) { setError(e.message); return }
    setOcupado(true)
    try { const r = await repo.personal.guardarCredencial(persona.userId || persona.id, d, intento.current.clave); await alHecho(r) }
    catch (e) { setError(e.message) }
    finally { setOcupado(false) }
  }
  return <Modal abierto titulo={`${licencia ? 'Licencia' : 'Aptitud médica'} · ${persona.nombre}`} alCerrar={ocupado ? () => {} : alCerrar} ancho={520}>
    <form onSubmit={guardar}>
      <p className="usr-nota">Registrar esta versión reemplaza la vigente para esta persona en todas sus empresas. El historial se conserva.</p>
      <Campo etiqueta={licencia ? 'Número de licencia' : 'Número del certificado (opcional)'}><input className="pnl-input" value={d.numero} maxLength={50} required={licencia} disabled={ocupado} onChange={e => campo('numero', e.target.value)} /></Campo>
      {licencia && <Campo etiqueta="Grado o categoría"><input className="pnl-input" value={d.categoria} maxLength={20} required disabled={ocupado} onChange={e => campo('categoria', e.target.value)} /></Campo>}
      <Campo etiqueta="Fecha de emisión (opcional)"><input className="pnl-input" type="date" value={d.emitidaEn} disabled={ocupado} onChange={e => campo('emitidaEn', e.target.value)} /></Campo>
      <Campo etiqueta="Fecha de vencimiento"><input className="pnl-input" type="date" value={d.venceEn} required disabled={ocupado} onChange={e => campo('venceEn', e.target.value)} /></Campo>
      <Campo etiqueta="Motivo administrativo" ayuda="No incluyas información médica en el motivo." error={error}><select className="pnl-select" value={d.motivo} required disabled={ocupado} onChange={e => campo('motivo', e.target.value)}><option value="">Elige el motivo…</option><option value="registro-inicial">Registro inicial</option><option value="renovacion">Renovación</option><option value="correccion-de-registro">Corrección del registro</option></select></Campo>
      <div className="pnl-chips"><button className="pnl-btn primario" type="submit" disabled={ocupado}>{ocupado ? 'Guardando y comprobando…' : 'Guardar'}</button><button className="pnl-btn sutil" type="button" disabled={ocupado} onClick={alCerrar}>Cancelar</button></div>
    </form>
  </Modal>
}
