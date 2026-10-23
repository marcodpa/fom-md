import { useEffect, useMemo, useRef, useState } from 'react'
import repo, { CONECTADO } from '../datos/repo'
import { pedir } from '../datos/api'
import { argumentosDeFormato } from '../datos/repoApi'
import { Campo, Modal, Tag } from './ui'
import { Icono } from '../Iconos'
import { mensajePublicacion } from './FormatosListos'
import { useSesion } from '../useSesion'
import {
  CAMPOS, NOMBRE_CAMPO, aFormato, analizarHoja, armarMapa, codigoDe, llavePregunta, muestraDeInspeccion, problemasDeLaHoja, sobreHoja, validarMapa,
} from '../datos/hojaEmpresa'
import { SIN_EMPRESA, almacenHojas, empresaActual } from '../datos/hojasEmpresa'
import { htmlPlanillas, imprimirHtml } from '../datos/planillaInspeccion'
import './hoja-empresa.css'

// ============================================================
// «Crear desde la hoja de tu empresa» (Plantillas de inspección)
// ------------------------------------------------------------
// 1. Subir la planilla en blanco (PDF, foto o Excel).
// 2. Revisar las preguntas que salieron de la hoja: cuáles son preguntas,
//    el texto tal cual, categoría y si es crítica.
// 3. Ubicar las respuestas: columnas SÍ / NO / OBS. (o una sola columna),
//    la fila de cada pregunta y los espacios de unidad, fecha, conductor,
//    observaciones y firma. Se arrastra o se elige y se hace clic.
// 4. Guardar: se crea (y publica) la plantilla y se guarda la hoja con su
//    mapa. Desde ahí se imprime una de prueba.
// Es trabajo de oficina: en un teléfono solo se avisa.
// ============================================================

const PASOS = [
  { v: 'subir', t: 'Sube tu hoja' },
  { v: 'preguntas', t: 'Revisa las preguntas' },
  { v: 'ubicar', t: 'Ubica las respuestas' },
  { v: 'guardar', t: 'Guarda' },
]
const COLUMNA = { conforme: 'SÍ', falla: 'NO', observacion: 'OBS.', unica: 'Respuesta' }
const ACEPTA = '.pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,application/pdf,image/jpeg,image/png,image/webp'

/** «hoja-de-inspeccion_2024.pdf» → «Hoja de inspeccion 2024». */
function nombreDeArchivo(nombre) {
  const t = String(nombre ?? '').replace(/\.[a-z0-9]+$/iu, '').replace(/[-_]+/gu, ' ').trim()
  return t ? t[0].toLocaleUpperCase('es') + t.slice(1) : 'Hoja de inspección'
}

const limitar = (v) => Math.max(0, Math.min(1, Math.round(v * 10000) / 10000))

/** La siguiente versión libre de un código entre las plantillas de la empresa. */
function versionLibre(plantillas, codigo) {
  const usadas = (plantillas ?? []).filter((t) => t.codigo === codigoDe(codigo)).map((t) => Number(t.version) || 0)
  return usadas.length ? Math.max(...usadas) + 1 : 1
}

/**
 * ¿La plantilla `t` que ya estaba en la empresa (misma versión) tiene las
 * mismas preguntas que la hoja? Si no, la hoja no se le puede pegar: sus
 * marcas caerían en preguntas ajenas. Conectado se lee su detalle; la
 * demostración solo sabe cuántas tiene.
 */
async function mismasPreguntas(t, formato) {
  if (!t) return false
  if (!CONECTADO) return Number(t.puntos) === formato.items.length
  const r = await pedir(`/api/v1/console/inspection-templates/${encodeURIComponent(t.id)}`)
  const items = [...(r?.template?.items ?? r?.item?.items ?? r?.items ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)
  return items.length === formato.items.length && items.every((it, i) => llavePregunta(it.name) === llavePregunta(formato.items[i].name))
}

/** El error al guardar, diciendo en qué quedó cada cosa. */
function errorAlGuardar(etapa, e, publicar) {
  const motivo = e?.message || 'No se pudo guardar.'
  if (etapa === 'imagenes') return `${motivo} No se creó ninguna plantilla: puedes volver a intentarlo.`
  if (etapa === 'plantilla') return `${motivo} La hoja no quedó guardada.`
  return `${motivo} Ojo: la plantilla ya quedó ${publicar ? 'creada (y publicada si se pudo)' : 'creada como borrador'}, pero su hoja no se guardó. Para pegarle la hoja, vuelve a crearla con otra versión.`
}

/** Imprime la hoja con una inspección de muestra encima. */
export function imprimirPrueba(mapa, paginas) {
  const h = muestraDeInspeccion(mapa)
  h.hojaEmpresa = { mapa, paginas }
  return imprimirHtml(htmlPlanillas([h], new Map(), sobreHoja()))
}

export default function HojaEmpresa({ plantillas = [], alCerrar, alGuardar }) {
  const sesion = useSesion()
  const angosta = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 899px)').matches
  const [paso, setPaso] = useState('subir')
  const [archivo, setArchivo] = useState(null)
  const [vistaFoto, setVistaFoto] = useState('')
  const [giro, setGiro] = useState(0)
  const [leyendo, setLeyendo] = useState(null)
  const [error, setError] = useState('')
  const [leido, setLeido] = useState(null)
  const [prop, setProp] = useState(null)
  const [pagina, setPagina] = useState(0)
  const [sel, setSel] = useState(null)
  const [marca, setMarca] = useState('x')
  const [datos, setDatos] = useState({ nombre: '', codigo: '', version: '1', publicar: true })
  const [codigoTocado, setCodigoTocado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState(null)

  useEffect(() => () => { if (vistaFoto) URL.revokeObjectURL(vistaFoto) }, [vistaFoto])

  const ocupado = Boolean(leyendo) || guardando
  const empresa = sesion?.perfil?.empresaGestion?.nombre || sesion?.perfil?.empresa || 'esta empresa'

  function elegir(a) {
    if (!a) return
    setError('')
    setArchivo(a)
    setGiro(0)
    const esFoto = /^image\//u.test(a.type) || /\.(jpe?g|png|webp)$/iu.test(a.name)
    setVistaFoto(esFoto ? URL.createObjectURL(a) : '')
    if (!esFoto) leer(a, 0)
  }

  async function leer(a = archivo, g = giro) {
    setError('')
    setLeyendo({ texto: 'Preparando…' })
    try {
      const { leerArchivo } = await import('../datos/leerHoja')
      const r = await leerArchivo(a, { giro: g, alAvanzar: (x) => setLeyendo((v) => ({ ...v, ...x })) })
      const p = analizarHoja(r.paginas)
      setLeido({ origen: r.origen, avisos: r.avisos, paginas: r.paginas.map(({ ancho, alto, imagen }) => ({ ancho, alto, imagen })) })
      setProp(p)
      const nombre = p.titulo || nombreDeArchivo(a.name)
      setDatos((d) => ({ ...d, nombre, codigo: codigoDe(nombre), version: String(versionLibre(plantillas, codigoDe(nombre))) }))
      setPagina(0)
      setSel(null)
      setPaso('preguntas')
    } catch (e) {
      setError(e?.message || 'No pudimos leer la hoja.')
    } finally {
      setLeyendo(null)
    }
  }

  // --- Ediciones sobre la propuesta ---
  const cambiarPregunta = (id, cambio) => setProp((p) => ({ ...p, preguntas: p.preguntas.map((q) => (q.id === id ? { ...q, ...cambio } : q)) }))
  const cambiarGrupo = (id, cambio) => setProp((p) => ({ ...p, grupos: p.grupos.map((g) => (g.id === id ? { ...g, ...cambio } : g)) }))
  const cambiarCampo = (clave, valor) => setProp((p) => ({ ...p, campos: { ...p.campos, [clave]: valor } }))
  function anadirPregunta() {
    setProp((p) => {
      const grupo = p.grupos.find((g) => g.pagina === pagina) ?? p.grupos[0]
      const id = `p${Date.now().toString(36)}`
      const nueva = { id, pagina, grupo: grupo?.id, texto: '', detalle: '', categoria: '', critica: false, esPregunta: true, y: grupo ? (grupo.y0 + grupo.y1) / 2 : 0.5, y0: null, y1: null, manual: true }
      setSel({ tipo: 'pregunta', id })
      return { ...p, preguntas: [...p.preguntas, nueva] }
    })
  }

  const elegidas = useMemo(() => (prop?.preguntas ?? []).filter((q) => q.esPregunta), [prop])
  const problemas = prop ? problemasDeLaHoja({ ...datos, preguntas: prop.preguntas }) : []
  const repetida = (plantillas ?? []).some((t) => t.codigo === codigoDe(datos.codigo) && Number(t.version) === Number(datos.version))

  function vistaPrevia() {
    const formato = aFormato({ ...datos, preguntas: prop.preguntas })
    const mapa = armarMapa({ propuesta: prop, formato, marca })
    imprimirPrueba(mapa, leido.paginas.map((p) => p.imagen)).catch((e) => setError(e?.message || 'No se pudo imprimir.'))
  }

  async function guardar() {
    if (problemas.length || repetida) return
    setGuardando(true)
    setError('')
    const formato = aFormato({ ...datos, preguntas: prop.preguntas })
    const mapa = armarMapa({ propuesta: prop, formato, marca })
    const paginas = leido.paginas.map((p) => p.imagen)
    const hoja = { empresa: empresaActual(), codigo: formato.code, version: formato.version, nombre: formato.name }
    const almacen = almacenHojas()
    let mensaje = ''
    let etapa = 'imagenes'
    try {
      if (!hoja.empresa) throw new Error(SIN_EMPRESA)
      if (!validarMapa(mapa)) throw new Error('La hoja tiene marcas fuera de lugar: vuelve a ubicar las respuestas.')
      // Primero las imágenes: si fallan, no queda una plantilla sin su hoja.
      const subidas = await almacen.subirPaginas({ ...hoja, paginas })
      etapa = 'plantilla'
      const buscarEsta = async () => (await repo.programaInspecciones.plantillas({}).catch(() => []))
        ?.find((t) => t.codigo === formato.code && Number(t.version) === formato.version)
      if (datos.publicar) {
        try {
          const r = await repo.programaInspecciones.publicarFormato(formato)
          if (r?.resultado === 'archivada') throw new Error('Esa versión está archivada: elige otra versión.')
          // Ya estaba (otro la creó a la vez): solo es la misma si tiene las mismas preguntas.
          if (r?.resultado !== 'creada' && !(await mismasPreguntas(await buscarEsta(), formato).catch(() => false))) {
            throw new Error('Ya había una plantilla con ese código y versión, con otras preguntas: la hoja no se le pegó. Usa otra versión.')
          }
          mensaje = mensajePublicacion(r?.resultado, empresa)
        } catch (e) {
          // Si quedó creada como borrador (otra versión ya está publicada), la hoja se guarda igual,
          // pero solo si esa plantilla es ESTA: con las mismas preguntas.
          if (!(await mismasPreguntas(await buscarEsta(), formato).catch(() => false))) throw e
          mensaje = e?.message || 'La plantilla quedó como borrador.'
        }
      } else {
        await repo.programaInspecciones.crearPlantilla(argumentosDeFormato(formato))
        mensaje = 'Plantilla creada como borrador. Publícala cuando quieras que los conductores la usen.'
      }
      etapa = 'hoja'
      const g = await almacen.guardar({ ...hoja, paginas, mapa, subidas })
      setResultado({ mensaje, mapa, paginas, guardado: g })
      setPaso('listo')
      alGuardar?.(mensaje)
    } catch (e) {
      setError(errorAlGuardar(etapa, e, datos.publicar))
    } finally {
      setGuardando(false)
    }
  }

  const cerrar = () => !ocupado && alCerrar()

  if (angosta) {
    return <Modal titulo="Crear desde la hoja de tu empresa" abierto alCerrar={alCerrar} ancho={520}>
      <div className="hje-movil"><Icono nombre="documento" tam={36}/><p><b>Hazlo desde la computadora.</b></p><p>Para pasar la hoja de tu empresa a FOM hay que revisar las preguntas y ubicar las marcas sobre la hoja: en una pantalla grande es mucho más fácil.</p></div>
      <div className="insp-actions"><button className="pnl-btn primario" type="button" onClick={alCerrar}>Entendido</button></div>
    </Modal>
  }

  const pag = leido?.paginas[pagina]
  return <Modal titulo="Crear desde la hoja de tu empresa" abierto alCerrar={cerrar} ancho={1320}>
    <div className="hje">
      {paso !== 'listo' && <ol className="hje-pasos" aria-label="Pasos">
        {PASOS.map((p, i) => {
          const actual = PASOS.findIndex((x) => x.v === paso)
          const puede = prop && i > 0 && !ocupado
          return <li key={p.v} aria-current={p.v === paso ? 'step' : undefined} className={i < actual ? 'hecho' : ''}>
            <button type="button" disabled={!puede || p.v === paso} onClick={() => setPaso(p.v)}><b>{i + 1}</b>{p.t}</button>
          </li>
        })}
      </ol>}

      {error && <p className="pnl-campo-error hje-error" role="alert">{error}</p>}

      {paso === 'subir' && <PasoSubir archivo={archivo} vistaFoto={vistaFoto} giro={giro} setGiro={setGiro} leyendo={leyendo} elegir={elegir} leer={() => leer()}/>}

      {paso !== 'subir' && paso !== 'listo' && prop && <div className="hje-dos">
        <div className="hje-hoja">
          {leido.paginas.length > 1 && <div className="hje-paginas" role="group" aria-label="Páginas de la hoja">
            {leido.paginas.map((_, i) => <button key={i} type="button" className="pnl-btn sutil" aria-pressed={pagina === i} onClick={() => setPagina(i)}>Página {i + 1}</button>)}
          </div>}
          <Lienzo pag={pag} paso={paso} pagina={pagina} prop={prop} sel={sel} setSel={setSel} marca={marca}
            cambiarPregunta={cambiarPregunta} cambiarGrupo={cambiarGrupo} cambiarCampo={cambiarCampo}/>
          <p className="hje-pie-hoja">{leido.origen === 'pdf-texto' ? 'Leída del texto del PDF: el texto es exacto.' : leido.origen === 'excel' ? 'Armada a partir de la tabla del Excel.' : 'Leída con reconocimiento de texto: revisa cada pregunta.'}</p>
        </div>
        <div className="hje-lado">
          {[...(leido.avisos ?? []), ...(prop.avisos ?? [])].map((a) => <p key={a} className="insp-ficha-aviso" role="status">{a}</p>)}
          {paso === 'preguntas' && <PasoPreguntas prop={prop} sel={sel} setSel={setSel} setPagina={setPagina} cambiarPregunta={cambiarPregunta} anadir={anadirPregunta}
            todas={(v) => setProp((p) => ({ ...p, preguntas: p.preguntas.map((q) => ({ ...q, esPregunta: v && q.texto.trim().length >= 2 })) }))}/>}
          {paso === 'ubicar' && <PasoUbicar prop={prop} pagina={pagina} setPagina={setPagina} sel={sel} setSel={setSel} marca={marca} setMarca={setMarca}
            cambiarGrupo={cambiarGrupo} cambiarCampo={cambiarCampo} elegidas={elegidas}/>}
          {paso === 'guardar' && <PasoGuardar datos={datos} setDatos={setDatos} codigoTocado={codigoTocado} setCodigoTocado={setCodigoTocado}
            plantillas={plantillas} prop={prop} elegidas={elegidas} problemas={problemas} repetida={repetida} guardando={guardando} empresa={empresa}/>}
        </div>
      </div>}

      {paso === 'listo' && resultado && <div className="hje-listo">
        <Icono nombre="check" tam={40}/>
        <h3>Listo: la hoja de tu empresa ya está en FOM</h3>
        <p>{resultado.mensaje}</p>
        <p>Cuando imprimas una inspección hecha con «{resultado.mapa.nombre}», saldrá sobre esta misma hoja con las respuestas en su sitio.</p>
        {resultado.guardado?.provisional && <p className="insp-ficha-aviso" role="status">Provisional: la hoja quedó guardada solo en este navegador{resultado.guardado.motivo ? ` (${resultado.guardado.motivo})` : ''}. Aquí se imprime sobre tu hoja; en otra computadora la inspección saldrá con la planilla de siempre hasta que el servidor tenga dónde guardarla.</p>}
      </div>}

      <div className="insp-actions">
        {paso === 'listo'
          ? <>
            <button className="pnl-btn sutil" type="button" onClick={() => imprimirPrueba(resultado.mapa, resultado.paginas)}><Icono nombre="reporte" tam={18}/>Imprimir una de prueba</button>
            <button className="pnl-btn primario" type="button" onClick={alCerrar}>Cerrar</button>
          </>
          : <>
            <button className="pnl-btn sutil" type="button" disabled={ocupado} onClick={alCerrar}>Cancelar</button>
            {paso === 'preguntas' && <button className="pnl-btn primario" type="button" disabled={!elegidas.length} onClick={() => { setSel(null); setPaso('ubicar') }}>Seguir: ubicar las respuestas →</button>}
            {paso === 'ubicar' && <>
              <button className="pnl-btn sutil" type="button" onClick={() => setPaso('preguntas')}>← Preguntas</button>
              <button className="pnl-btn primario" type="button" onClick={() => setPaso('guardar')}>Seguir: guardar →</button>
            </>}
            {paso === 'guardar' && <>
              <button className="pnl-btn sutil" type="button" disabled={guardando || !elegidas.length} onClick={vistaPrevia}><Icono nombre="reporte" tam={18}/>Imprimir una de prueba</button>
              <button className="pnl-btn primario" type="button" disabled={guardando || problemas.length > 0 || repetida} onClick={guardar}>{guardando ? 'Guardando…' : datos.publicar ? 'Guardar y publicar' : 'Guardar como borrador'}</button>
            </>}
          </>}
      </div>
    </div>
  </Modal>
}

function PasoSubir({ archivo, vistaFoto, giro, setGiro, leyendo, elegir, leer }) {
  const entrada = useRef(null)
  const [encima, setEncima] = useState(false)
  if (leyendo) {
    return <div className="hje-leyendo" role="status" aria-live="polite">
      <span className="hje-giro" aria-hidden="true"/>
      <p><b>{leyendo.texto}</b></p>
      {leyendo.avance != null && <div className="hje-barra"><span style={{ width: `${Math.round(leyendo.avance * 100)}%` }}/></div>}
      <p className="hje-nota">Todo se lee aquí, en tu computadora: la hoja no se manda a ningún servicio de fuera.</p>
    </div>
  }
  return <div className="hje-subir">
    <div>
      <h3>Sube la planilla de inspección de tu empresa, en blanco</h3>
      <p>FOM saca de ahí las preguntas tal como están escritas y, al imprimir una inspección, la imprime sobre esa misma hoja con las respuestas en su sitio.</p>
      <ul className="hje-tipos">
        <li><b>PDF</b> — lo mejor: si tiene texto, se lee exacto.</li>
        <li><b>Foto o escaneo</b> (JPG o PNG) — derecho, con buena luz y la hoja entera.</li>
        <li><b>Excel</b> (.xlsx) — FOM arma la hoja a partir de la tabla.</li>
      </ul>
    </div>
    {!vistaFoto
      ? <button type="button" className={`hje-zona${encima ? ' encima' : ''}`} onClick={() => entrada.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setEncima(true) }} onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); elegir(e.dataTransfer.files?.[0]) }}>
        <Icono nombre="descargar" tam={30}/>
        <b>Elige el archivo o arrástralo aquí</b>
        <span>PDF, JPG, PNG o Excel · hasta 25 MB</span>
      </button>
      : <div className="hje-foto">
        <div className="hje-foto-marco"><img src={vistaFoto} alt="La foto subida" style={{ transform: `rotate(${giro}deg)` }}/></div>
        <p>¿Se ve derecha? Si está de lado, gírala antes de leerla.</p>
        <div className="hje-foto-acciones">
          <button type="button" className="pnl-btn sutil" onClick={() => setGiro((g) => (g + 270) % 360)}>↺ Girar a la izquierda</button>
          <button type="button" className="pnl-btn sutil" onClick={() => setGiro((g) => (g + 90) % 360)}>↻ Girar a la derecha</button>
          <button type="button" className="pnl-btn sutil" onClick={() => entrada.current?.click()}>Elegir otra</button>
          <button type="button" className="pnl-btn primario" onClick={leer}>Leer la hoja</button>
        </div>
      </div>}
    <input ref={entrada} type="file" accept={ACEPTA} hidden aria-label="Archivo de la hoja" onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = '' }}/>
    {archivo && !vistaFoto && <p className="hje-nota">{archivo.name}</p>}
  </div>
}

/** La hoja con lo que se va marcando encima. Todo en % de la página. */
function Lienzo({ pag, paso, pagina, prop, sel, setSel, marca, cambiarPregunta, cambiarGrupo, cambiarCampo }) {
  const ref = useRef(null)
  const arrastre = useRef(null)
  const movido = useRef(false)
  const punto = (e) => {
    const r = ref.current.getBoundingClientRect()
    return { x: limitar((e.clientX - r.left) / r.width), y: limitar((e.clientY - r.top) / r.height) }
  }
  const empezar = (e, alMover) => {
    if (paso !== 'ubicar') return
    e.stopPropagation()
    e.preventDefault()
    ref.current.setPointerCapture?.(e.pointerId)
    arrastre.current = alMover
    // El clic que sigue a soltar un asa no es «poner aquí»: ya se movió (o no se quiso mover).
    movido.current = true
  }
  const mover = (e) => {
    if (!arrastre.current) return
    arrastre.current(punto(e))
  }
  const soltar = () => { arrastre.current = null }
  function clic(e) {
    if (movido.current) { movido.current = false; return }
    const p = punto(e)
    if (paso === 'preguntas') {
      const q = prop.preguntas.find((x) => x.pagina === pagina && x.y0 != null && p.y >= x.y0 && p.y <= x.y1)
      if (q) setSel({ tipo: 'pregunta', id: q.id })
      return
    }
    if (paso !== 'ubicar' || !sel) return
    if (sel.tipo === 'campo') {
      const actual = prop.campos[sel.clave]
      cambiarCampo(sel.clave, { ancho: 0.25, alto: 0.03, ...actual, pagina, x: p.x, y: p.y })
    } else if (sel.tipo === 'pregunta') cambiarPregunta(sel.id, { y: p.y, pagina })
    else if (sel.tipo === 'columna') {
      const g = prop.grupos.find((x) => x.id === sel.grupo)
      if (g && g.pagina === pagina) cambiarGrupo(g.id, { x: { ...g.x, [sel.col]: p.x } })
    }
  }
  const grupos = prop.grupos.filter((g) => g.pagina === pagina)
  const preguntas = prop.preguntas.filter((q) => q.pagina === pagina)
  const numero = new Map(prop.preguntas.filter((q) => q.esPregunta).map((q, i) => [q.id, i + 1]))
  return <div ref={ref} className={`hje-lienzo hje-${paso}${sel ? ' con-sel' : ''}`} style={{ aspectRatio: `${pag.ancho} / ${pag.alto}` }}
    onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} onClick={clic}>
    <img src={pag.imagen} alt={`Página ${pagina + 1} de la hoja`} draggable={false}/>
    {paso === 'preguntas' && preguntas.filter((q) => q.y0 != null).map((q) => <span key={q.id}
      className={`hje-fila${q.esPregunta ? ' si' : ''}${sel?.id === q.id ? ' sel' : ''}`}
      style={{ top: `${q.y0 * 100}%`, height: `${(q.y1 - q.y0) * 100}%` }}>{numero.get(q.id) && <b>{numero.get(q.id)}</b>}</span>)}
    {paso !== 'preguntas' && <>
      {grupos.map((g) => <span key={g.id}>
        {g.notas && <span className="hje-notas" style={{ left: `${g.notas.x0 * 100}%`, width: `${(g.notas.x1 - g.notas.x0) * 100}%`, top: `${g.y0 * 100}%`, height: `${(g.y1 - g.y0) * 100}%` }}><em>Notas</em></span>}
        {Object.entries(g.x).map(([col, x]) => <span key={col}
          className={`hje-guia hje-${col}${sel?.tipo === 'columna' && sel.grupo === g.id && sel.col === col ? ' sel' : ''}`}
          style={{ left: `${x * 100}%`, top: `${g.y0 * 100}%`, height: `${(g.y1 - g.y0) * 100}%` }}>
          <button type="button" aria-label={`Columna ${COLUMNA[col]}: arrastra para moverla`}
            onPointerDown={(e) => { setSel({ tipo: 'columna', grupo: g.id, col }); empezar(e, (p) => cambiarGrupo(g.id, { x: { ...g.x, [col]: p.x } })) }}
            onClick={(e) => e.stopPropagation()}>{COLUMNA[col]}</button>
        </span>)}
      </span>)}
      {preguntas.filter((q) => q.esPregunta).map((q) => {
        const g = prop.grupos.find((x) => x.id === q.grupo)
        if (!g) return null
        const xs = Object.values(g.x)
        const izq = Math.min(...xs)
        const ejemplo = g.modo === 'unica' ? 'SÍ' : marca === 'check' ? '✓' : 'X'
        const xEj = g.modo === 'unica' ? g.x.unica : g.x.conforme ?? izq
        return <span key={q.id}>
          <span className={`hje-renglon${sel?.id === q.id ? ' sel' : ''}`} style={{ top: `${q.y * 100}%`, left: `${Math.max(0, izq - 0.06) * 100}%`, width: `${(Math.max(...xs) - izq + 0.1) * 100}%` }}/>
          <button type="button" className={`hje-num${sel?.id === q.id ? ' sel' : ''}`} style={{ top: `${q.y * 100}%`, left: `${Math.max(0.01, izq - 0.06) * 100}%` }}
            aria-label={`Fila de la pregunta ${numero.get(q.id)}: arrastra para moverla`}
            onPointerDown={(e) => { setSel({ tipo: 'pregunta', id: q.id }); empezar(e, (p) => cambiarPregunta(q.id, { y: p.y })) }}
            onClick={(e) => e.stopPropagation()}>{numero.get(q.id)}</button>
          {xEj != null && <span className={`hje-ejemplo${g.modo === 'unica' ? ' palabra' : ''}`} style={{ top: `${q.y * 100}%`, left: `${xEj * 100}%` }}>{ejemplo}</span>}
        </span>
      })}
      {CAMPOS.map((c) => {
        const lugar = prop.campos[c]
        if (!lugar || lugar.pagina !== pagina) return null
        return <button key={c} type="button" className={`hje-campo${sel?.clave === c ? ' sel' : ''}`}
          style={{ left: `${lugar.x * 100}%`, top: `${lugar.y * 100}%`, width: `${lugar.ancho * 100}%` }}
          aria-label={`${NOMBRE_CAMPO[c]}: arrastra para moverlo`}
          onPointerDown={(e) => {
            setSel({ tipo: 'campo', clave: c })
            const inicio = punto(e)
            const base = { x: lugar.x, y: lugar.y }
            empezar(e, (p) => cambiarCampo(c, { ...lugar, x: limitar(base.x + p.x - inicio.x), y: limitar(base.y + p.y - inicio.y) }))
          }}
          onClick={(e) => e.stopPropagation()}>{NOMBRE_CAMPO[c]}</button>
      })}
    </>}
  </div>
}

function PasoPreguntas({ prop, sel, setSel, setPagina, cambiarPregunta, anadir, todas }) {
  const lista = useRef(null)
  useEffect(() => {
    if (sel?.tipo === 'pregunta') lista.current?.querySelector(`[data-id="${sel.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [sel])
  const categorias = [...new Set(prop.preguntas.map((q) => q.categoria).filter(Boolean))]
  const n = prop.preguntas.filter((q) => q.esPregunta).length
  let k = 0
  return <>
    <div className="hje-cab-lado">
      <div><h3>Las preguntas de tu hoja</h3><p>Marca las que son preguntas y corrige el texto si se leyó mal. El texto queda como está escrito en la hoja.</p></div>
      <Tag color="azul">{n} {n === 1 ? 'pregunta' : 'preguntas'}</Tag>
    </div>
    <div className="hje-cab-acciones">
      <button className="pnl-link" type="button" onClick={() => todas(true)}>Marcar todas</button>
      <button className="pnl-link" type="button" onClick={() => todas(false)}>Ninguna</button>
    </div>
    <datalist id="hje-categorias">{categorias.map((c) => <option key={c} value={c}/>)}</datalist>
    <ol className="hje-preguntas" ref={lista}>
      {prop.preguntas.map((q) => {
        const num = q.esPregunta ? ++k : null
        return <li key={q.id} data-id={q.id} className={`${q.esPregunta ? 'si' : 'no'}${sel?.id === q.id ? ' sel' : ''}`}
          onFocusCapture={() => { setSel({ tipo: 'pregunta', id: q.id }); setPagina(q.pagina) }}>
          <label className="hje-es"><input type="checkbox" checked={q.esPregunta} onChange={(e) => cambiarPregunta(q.id, { esPregunta: e.target.checked })}/>{num ? `Pregunta ${num}` : 'No es pregunta'}</label>
          <textarea className="pnl-input hje-texto" rows={2} maxLength={400} aria-label={`Texto de la pregunta ${num ?? ''}`} value={q.texto} onChange={(e) => cambiarPregunta(q.id, { texto: e.target.value })}/>
          {q.esPregunta && <div className="hje-fila-datos">
            <input className="pnl-input" list="hje-categorias" maxLength={60} placeholder="Categoría (General)" aria-label="Categoría" value={q.categoria} onChange={(e) => cambiarPregunta(q.id, { categoria: e.target.value })}/>
            <label><input type="checkbox" checked={q.critica} onChange={(e) => cambiarPregunta(q.id, { critica: e.target.checked })}/>Crítica</label>
          </div>}
          {q.esPregunta && (q.detalle || q.manual) && <details className="hje-detalle">
            <summary>Detalle que verá el conductor{q.detalle ? '' : ' (opcional)'}</summary>
            <textarea className="pnl-input" rows={4} aria-label="Detalle de la pregunta" value={q.detalle} onChange={(e) => cambiarPregunta(q.id, { detalle: e.target.value })}/>
          </details>}
          {q.manual && <p className="hje-nota">Añadida a mano: en el paso 3 dile en qué fila de la hoja va.</p>}
        </li>
      })}
    </ol>
    <button className="pnl-btn sutil" type="button" onClick={anadir}><Icono nombre="mas" tam={16}/>Añadir una pregunta</button>
  </>
}

function PasoUbicar({ prop, pagina, setPagina, sel, setSel, marca, setMarca, cambiarGrupo, cambiarCampo, elegidas }) {
  const grupos = prop.grupos.filter((g) => prop.preguntas.some((q) => q.esPregunta && q.grupo === g.id))
  const elegir = (s, p) => { setSel(s); if (p != null) setPagina(p) }
  return <>
    <div className="hje-cab-lado"><div><h3>Dónde va cada respuesta</h3><p>FOM ya propuso los sitios. Arrastra lo que no cuadre, o elige algo de esta lista y haz clic en la hoja donde va.</p></div></div>
    {sel && <p className="hje-sel" role="status">Elegido: <b>{sel.tipo === 'campo' ? NOMBRE_CAMPO[sel.clave] : sel.tipo === 'columna' ? `columna ${COLUMNA[sel.col]}` : `fila de la pregunta ${elegidas.findIndex((q) => q.id === sel.id) + 1}`}</b> — haz clic en la hoja para ponerlo ahí. <button type="button" className="pnl-link" onClick={() => setSel(null)}>Soltar</button></p>}

    <h4>Columnas de respuesta</h4>
    {grupos.map((g, i) => <div className="hje-bloque" key={g.id}>
      {grupos.length > 1 && <p className="hje-nota">Tabla {i + 1} · página {g.pagina + 1}</p>}
      {g.supuesto && <p className="insp-ficha-aviso">No vimos las columnas de respuesta: muévelas a su sitio.</p>}
      <div className="hje-modo" role="radiogroup" aria-label="Cómo se responde">
        <label><input type="radio" checked={g.modo === 'columnas'} onChange={() => cambiarGrupo(g.id, { modo: 'columnas', x: { conforme: (g.x.unica ?? 0.8) - 0.04, falla: (g.x.unica ?? 0.8) + 0.04 } })}/>Una columna para SÍ y otra para NO (se marca con una X)</label>
        <label><input type="radio" checked={g.modo === 'unica'} onChange={() => cambiarGrupo(g.id, { modo: 'unica', x: { unica: g.x.conforme ?? g.x.unica ?? 0.9 } })}/>Una sola columna (se escribe SÍ, OBS. o NO)</label>
      </div>
      <div className="hje-chips">
        {Object.keys(g.x).map((col) => <button key={col} type="button" className="pnl-btn sutil" aria-pressed={sel?.tipo === 'columna' && sel.grupo === g.id && sel.col === col} onClick={() => elegir({ tipo: 'columna', grupo: g.id, col }, g.pagina)}>Columna {COLUMNA[col]}</button>)}
        {g.modo === 'columnas' && g.x.observacion == null && <button type="button" className="pnl-link" onClick={() => cambiarGrupo(g.id, { x: { ...g.x, observacion: ((g.x.conforme ?? 0.8) + (g.x.falla ?? 0.88)) / 2 } })}>+ Columna OBS.</button>}
        {g.modo === 'columnas' && g.x.observacion != null && <button type="button" className="pnl-link" onClick={() => { const { observacion: _fuera, ...resto } = g.x; cambiarGrupo(g.id, { x: resto }) }}>Quitar OBS.</button>}
        {!g.notas
          ? <button type="button" className="pnl-link" onClick={() => cambiarGrupo(g.id, { notas: { x0: Math.min(0.8, Math.max(...Object.values(g.x)) + 0.04), x1: 0.97 } })}>+ Columna de notas</button>
          : <button type="button" className="pnl-link" onClick={() => cambiarGrupo(g.id, { notas: null })}>Quitar columna de notas</button>}
      </div>
      {g.modo === 'columnas' && g.x.observacion == null && <p className="hje-nota">Sin columna OBS., una observación se marca en SÍ y su nota se escribe aparte.</p>}
    </div>)}
    <div className="hje-modo" role="radiogroup" aria-label="Cómo se marca">
      <span>La marca:</span>
      <label><input type="radio" checked={marca === 'x'} onChange={() => setMarca('x')}/>X</label>
      <label><input type="radio" checked={marca === 'check'} onChange={() => setMarca('check')}/>✓</label>
    </div>

    <h4>Datos de la inspección</h4>
    <ul className="hje-campos">
      {CAMPOS.map((c) => {
        const lugar = prop.campos[c]
        return <li key={c} className={sel?.clave === c ? 'sel' : ''}>
          <span>{NOMBRE_CAMPO[c]}</span>
          {lugar ? <Tag color="verde">En la hoja{prop.paginas.length > 1 ? ` · pág. ${lugar.pagina + 1}` : ''}</Tag> : <Tag color="gris">Sin ubicar</Tag>}
          <button type="button" className="pnl-btn sutil" aria-pressed={sel?.clave === c} onClick={() => elegir({ tipo: 'campo', clave: c }, lugar?.pagina ?? pagina)}>{lugar ? 'Mover' : 'Ubicar'}</button>
          {lugar && <button type="button" className="pnl-link" onClick={() => cambiarCampo(c, null)}>Quitar</button>}
        </li>
      })}
    </ul>
    {!prop.campos.observaciones && <p className="hje-nota">Sin espacio de observaciones, la nota de cada respuesta se escribe debajo de su marca.</p>}

    <h4>Filas de las preguntas</h4>
    <ol className="hje-filas">
      {elegidas.map((q, i) => <li key={q.id}><button type="button" className={sel?.id === q.id ? 'sel' : ''} onClick={() => elegir({ tipo: 'pregunta', id: q.id }, q.pagina)}><b>{i + 1}</b>{q.texto || 'Sin texto'}</button></li>)}
    </ol>
  </>
}

function PasoGuardar({ datos, setDatos, codigoTocado, setCodigoTocado, plantillas, prop, elegidas, problemas, repetida, guardando, empresa }) {
  const set = (k) => (e) => {
    const v = e.target.value
    setDatos((d) => {
      const n = { ...d, [k]: v }
      if (k === 'nombre' && !codigoTocado) {
        n.codigo = codigoDe(v)
        n.version = String(versionLibre(plantillas, n.codigo))
      }
      if (k === 'codigo') n.version = String(versionLibre(plantillas, v))
      return n
    })
    if (k === 'codigo') setCodigoTocado(true)
  }
  const criticas = elegidas.filter((q) => q.critica).length
  const ubicados = Object.values(prop.campos).filter(Boolean).length
  return <>
    <div className="hje-cab-lado"><div><h3>Guarda la plantilla</h3><p>Se crea en {empresa} con las preguntas de la hoja. La hoja y el sitio de cada marca quedan guardados con ella.</p></div></div>
    <Campo etiqueta="Nombre de la plantilla"><input className="pnl-input" maxLength={120} value={datos.nombre} onChange={set('nombre')} disabled={guardando}/></Campo>
    <div className="hje-dos-campos">
      <Campo etiqueta="Código" ayuda="Sin espacios: letras, números y guiones."><input className="pnl-input" maxLength={40} value={datos.codigo} onChange={set('codigo')} disabled={guardando}/></Campo>
      <Campo etiqueta="Versión"><input className="pnl-input" type="number" min="1" step="1" value={datos.version} onChange={set('version')} disabled={guardando}/></Campo>
    </div>
    <label className="hje-publicar"><input type="checkbox" checked={datos.publicar} onChange={(e) => setDatos((d) => ({ ...d, publicar: e.target.checked }))} disabled={guardando}/>Publicarla ya, para que los conductores la usen en la app</label>
    <ul className="hje-resumen">
      <li><b>{elegidas.length}</b> {elegidas.length === 1 ? 'pregunta' : 'preguntas'}{criticas ? `, ${criticas} ${criticas === 1 ? 'crítica' : 'críticas'}` : ''}</li>
      <li><b>{ubicados}</b> de {CAMPOS.length} datos ubicados en la hoja</li>
      <li><b>{prop.paginas.length}</b> {prop.paginas.length === 1 ? 'página' : 'páginas'}</li>
    </ul>
    {repetida && <p className="pnl-campo-error" role="alert">Ya existe una plantilla con ese código y esa versión: cambia la versión.</p>}
    {problemas.map((p) => <p key={p} className="pnl-campo-error" role="alert">{p}</p>)}
    <p className="insp-info">Antes de guardar puedes imprimir una de prueba: sale la hoja con una inspección de ejemplo encima.</p>
  </>
}
