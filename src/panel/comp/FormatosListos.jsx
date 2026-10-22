import { useState } from 'react'
import repo from '../datos/repo'
import { useSesion } from '../useSesion'
import { areaDe, esAdminFom, rolCanonico } from '../roles'
import { Modal, Tag, Tarjeta } from './ui'
import { Icono } from '../Iconos'
import IOGP_CONDUCCION from '../datos/formatos/iogp-conduccion.json'

// Formatos ya preparados, idénticos a la hoja en papel: se publican en la
// empresa actual con un clic, sin copiarlos punto por punto.
export const FORMATOS_LISTOS = [
  { formato: IOGP_CONDUCCION, titulo: 'IOGP · Conducción — Verificaciones para el inicio del trabajo' },
]

const ESTADO = { borrador: ['Borrador', 'gris'], publicada: ['Publicada', 'verde'], archivada: ['Archivada', 'gris'] }

/** Admin FOM dentro de una empresa, o supervisor de su propia empresa. */
export function puedePublicarFormatos(perfil) {
  if (esAdminFom(perfil)) return Boolean(perfil.empresaGestion)
  return rolCanonico(perfil?.rol) === 'supervisor' && areaDe(perfil) === 'operativo'
}

const criticos = (f) => f.items.filter((i) => i.isCritical).length
const tituloCompleto = ({ formato, titulo }) => {
  const n = criticos(formato)
  return `${titulo} (${n === formato.items.length ? `${n} puntos críticos` : `${formato.items.length} puntos, ${n} ${n === 1 ? 'crítico' : 'críticos'}`})`
}

/**
 * La ayuda del punto tal cual viene: cada línea es una frase y las que
 * empiezan con «- » son sub-puntos de la frase anterior.
 */
export function bloquesDeAyuda(texto = '') {
  const bloques = []
  for (const linea of String(texto).split('\n')) {
    const sub = linea.match(/^\s*-\s+(.*)$/u)
    if (sub) {
      const ultimo = bloques.at(-1)
      if (ultimo?.tipo === 'lista') ultimo.items.push(sub[1])
      else bloques.push({ tipo: 'lista', items: [sub[1]] })
    } else if (linea.trim()) bloques.push({ tipo: 'frase', texto: linea.trim() })
  }
  return bloques
}

// «Transporte X, C.A.» ya termina en punto: no se le pone otro.
const fin = (empresa) => (empresa.endsWith('.') ? empresa : empresa + '.')

/** Mensaje tras publicar, según lo que encontró en la empresa. */
export function mensajePublicacion(resultado, empresa) {
  return {
    creada: `Formato publicado en ${fin(empresa)} Ya aparece en la inspección diaria de la app.`,
    borrador_publicada: `El borrador que ya existía se publicó en ${fin(empresa)}`,
    ya_publicada: `Este formato ya estaba publicado en ${empresa}; no se creó otro.`,
    archivada: `Este formato está archivado en ${empresa}: la misma versión no se puede volver a publicar.`,
  }[resultado] ?? 'Cambio guardado correctamente.'
}

// `plantillas` es null mientras la lista no ha llegado: entonces no se dice el estado.
export default function FormatosListos({ plantillas = null, alPublicar }) {
  const sesion = useSesion()
  const perfil = sesion?.perfil
  const [viendo, setViendo] = useState(null)
  const [publicando, setPublicando] = useState(null)
  if (!puedePublicarFormatos(perfil)) return null
  const empresa = perfil.empresaGestion?.nombre || perfil.empresa || 'esta empresa'
  const existente = (f) => plantillas?.find((t) => t.codigo === f.code && Number(t.version) === Number(f.version))
  return <>
    <Tarjeta titulo="Formatos listos para usar" sinCuerpo>
      {FORMATOS_LISTOS.map((listo) => {
        const { formato } = listo
        const actual = existente(formato)
        return <article className="insp-template-row" key={formato.code + formato.version}>
          <Icono nombre="inspeccion" tam={24}/>
          <div><h3>{tituloCompleto(listo)}</h3><p>{formato.code} · v{formato.version} · Aplica a todos los tipos de unidad</p></div>
          {actual ? <Tag color={ESTADO[actual.estado]?.[1] || 'gris'}>{ESTADO[actual.estado]?.[0] || actual.estado}</Tag> : plantillas && <Tag color="azul">Sin publicar</Tag>}
          <div className="insp-inline-actions">
            <button className="pnl-btn sutil" type="button" onClick={() => setViendo(listo)}>Ver puntos</button>
            {actual?.estado !== 'publicada' && actual?.estado !== 'archivada' && <button className="pnl-btn primario" type="button" onClick={() => setPublicando({ ...listo, actual })}>Publicar en esta empresa</button>}
          </div>
        </article>
      })}
    </Tarjeta>
    {viendo && <VerPuntos {...viendo} alCerrar={() => setViendo(null)}/>}
    {publicando && <ConfirmarPublicacion {...publicando} empresa={empresa} alCerrar={() => setPublicando(null)} alPublicar={(r) => { setPublicando(null); alPublicar?.(mensajePublicacion(r.resultado, empresa)) }}/>}
  </>
}

function VerPuntos({ formato, titulo, alCerrar }) {
  const puntos = [...formato.items].sort((a, b) => a.displayOrder - b.displayOrder)
  return <Modal titulo={titulo} abierto alCerrar={alCerrar} ancho={900}>
    {formato.description && <p className="insp-info" style={{ marginTop: 0 }}>{formato.description}</p>}
    <ol className="insp-preview-list">
      {puntos.map((p) => <li key={p.code}>
        <span><b>{p.name}</b></span>{p.isCritical && <Tag color="rojo">Crítico</Tag>}
        {bloquesDeAyuda(p.helpText).map((b, i) => b.tipo === 'lista'
          ? <ul key={i} style={{ margin: '6px 0 0', paddingLeft: 20, color: 'var(--e-texto-2)', fontSize: 13 }}>{b.items.map((t, j) => <li key={j} style={{ padding: '2px 0', border: 0 }}>{t}</li>)}</ul>
          : <p key={i} style={{ margin: '8px 0 0', color: 'var(--e-texto-2)', fontSize: 13 }}>{b.texto}</p>)}
      </li>)}
    </ol>
    <div className="insp-actions"><button className="pnl-btn sutil" type="button" onClick={alCerrar}>Cerrar</button></div>
  </Modal>
}

function ConfirmarPublicacion({ formato, titulo, actual, empresa, alCerrar, alPublicar }) {
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  async function publicar() {
    setOcupado(true); setError('')
    try { alPublicar(await repo.programaInspecciones.publicarFormato(formato)) }
    catch (e) { setError(e?.message || 'No se pudo publicar el formato.'); setOcupado(false) }
  }
  return <Modal titulo="Publicar formato" abierto alCerrar={() => !ocupado && alCerrar()} ancho={640}>
    <h3>{titulo}</h3>
    <p className="insp-info">{actual?.estado === 'borrador' ? `Ya está guardado como borrador en ${empresa}: se publicará tal cual.` : `Se creará y publicará en ${fin(empresa)}`} Los conductores lo verán en la inspección diaria de la app.</p>
    <p className="insp-info">{formato.items.length} puntos · versión {formato.version}. Una vez publicado no se puede editar; para cambiarlo se publica otra versión.</p>
    {error && <p className="pnl-campo-error" role="alert">{error}</p>}
    <div className="insp-actions">
      <button className="pnl-btn sutil" type="button" disabled={ocupado} onClick={alCerrar}>Volver</button>
      <button className="pnl-btn primario" type="button" disabled={ocupado} onClick={publicar}>{ocupado ? 'Publicando…' : 'Publicar en esta empresa'}</button>
    </div>
  </Modal>
}
