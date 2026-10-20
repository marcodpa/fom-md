import { createPortal } from 'react-dom'
import {
  CATEGORIAS, ETIQUETA_GRUPO, comparar, dineroVE, duracionHoras, esProducto, fechaCortaVE, fechaHoraVE,
  etiquetaFalla, formatoPorId, grupoOdt, kmVE, numeroValido, numeroVE, porScore, porcentajeVE, resultadoDe, textoCmp, tonoIndice, tonoScore,
} from '../reportes-datos'
import './informe.css'

// ============================================================
// INFORME IMPRIMIBLE (maquetas P1..P8). Hoja A4 clara, una sección por hoja
// nueva. Cada sección es una tabla: su encabezado (thead) y su pie (tfoot)
// se repiten solos en cada hoja que ocupe al imprimir.
// ============================================================

const SECCIONES = {
  portada: { titulo: 'Portada', corto: 'Portada', detalle: 'Empresa, período, alcance y contenido.' },
  resumen: { titulo: 'Resumen ejecutivo', corto: 'Resumen', detalle: 'Conclusión, indicadores clave y puntos de atención.' },
  vehiculos: { titulo: 'Vehículos', corto: 'Vehículos', detalle: 'Operación de la flota y detalle por unidad.' },
  mantenimiento: { titulo: 'Mantenimiento', corto: 'Mantenimiento', detalle: 'ODT por estado, tiempos, costo y lista de órdenes.' },
  conductores: { titulo: 'Conductores', corto: 'Conductores', detalle: 'Km, eventos de manejo, índice y papeles.' },
  costos: { titulo: 'Costos y gastos', corto: 'Costos', detalle: 'Gasto por categoría, productos y servicios, costo por km.' },
  estadistico: { titulo: 'Informe estadístico', corto: 'Estadístico', detalle: 'Indicadores de conducción y distancias por conductor.' },
  notas: { titulo: 'Notas y firmas', corto: 'Notas', detalle: 'Origen de cada dato, glosario y aprobación.' },
}
const POR_FORMATO = {
  completo: ['portada', 'resumen', 'vehiculos', 'mantenimiento', 'conductores', 'costos', 'estadistico', 'notas'],
  vehiculos: ['portada', 'vehiculos', 'mantenimiento', 'notas'],
  usuarios: ['portada', 'conductores', 'notas'],
  costos: ['portada', 'costos', 'notas'],
  estadistico: ['portada', 'estadistico', 'notas'],
}
export const seccionesDe = formato => (POR_FORMATO[formato] || POR_FORMATO.vehiculos).map(id => ({ id, ...SECCIONES[id] }))

// --- Piezas -----------------------------------------------------------------
const TRAZO = { ok: 'm5 12.5 4.5 4.5L19 7.5', wa: 'M12 3.5 2.5 20h19zM12 10v4.5M12 17.2v.3', ba: 'M7 7l10 10M17 7 7 17', ne: 'M6 12h12' }
const CLASE = { ok: 'ok', warn: 'wa', bad: 'ba', null: 'ne' }
function Ti({ tipo, tam = 11 }) {
  return <svg className="inf-ti" width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true"><path d={TRAZO[tipo]} /></svg>
}
/** Etiqueta con icono y borde: se lee igual en blanco y negro. */
function Tg({ tono, children, clase }) {
  const c = clase || CLASE[tono] || 'ne'
  return <span className={`inf-tg ${c}`}><Ti tipo={c === 'az' ? 'ne' : c} />{children}</span>
}
/** Marca pequeña junto a un número: alerta o atención. Conforme no lleva marca. */
function Mk({ tono }) {
  if (!tono || tono === 'ok') return null
  const c = CLASE[tono]
  return <span className={`inf-mk ${c}`} title={resultadoDe(tono)}><Ti tipo={c} tam={10} /></span>
}
const tonoPapeles = estado => estado === 'vencido' ? 'bad' : estado === 'por_vencer' ? 'warn' : estado === 'al_dia' ? 'ok' : null
const Raya = () => <span className="inf-raya">—</span>
const n0 = v => numeroValido(v) ? numeroVE(v) : '—'
const n2 = v => numeroValido(v) ? numeroVE(v, 2) : '—'
const lista = xs => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`
/** Identificación de conductores: sin unidades no hay porcentaje y queda «Sin dato». */
const tonoIdent = n => !numeroValido(n) ? null : n >= 85 ? 'ok' : n >= 70 ? 'warn' : 'bad'
/** «(8,3 % más que el período anterior)» · «(igual que el período anterior)». */
const frenteAnterior = cmp => cmp?.direccion === 'igual' ? ' (igual que el período anterior)' : cmp?.pct != null ? ` (${cmp.texto} que el período anterior)` : ''

function Encabezado({ doc, n, s }) {
  return <header className="inf-hd">
    <div className="inf-hd-fila">
      <div className="inf-logo"><img src="/brand/fom-logo.svg" alt="FOM" width="93" height="28" /></div>
      <div className="inf-hd-t"><b>Informe de gestión de flota</b><span>{doc.empresa}</span></div>
      <div className="inf-hd-r"><b>{n} · {s.corto}</b><span>Fleet Operations &amp; Maintenance</span></div>
    </div>
    <div className="inf-regla"><i /><s /></div>
  </header>
}
function Pie({ doc, n, total }) {
  return <footer className="inf-ft">
    <span><span>Período <b>{doc.nombre.fechas}</b></span><span>Generado el {fechaHoraVE(doc.generado)} · {doc.autor.nombre}</span></span>
    <span>Confidencial · uso interno</span>
    <span><b>Sección {n} de {total}</b></span>
  </footer>
}
function Hoja({ doc, s, n, total, children }) {
  return <table className="inf-hoja" aria-label={`Sección ${n}: ${s.titulo}`}>
    <thead><tr><td><Encabezado doc={doc} n={n} s={s} /></td></tr></thead>
    <tfoot><tr><td><Pie doc={doc} n={n} total={total} /></td></tr></tfoot>
    <tbody><tr><td className="inf-mn">{children}</td></tr></tbody>
  </table>
}
const Titulo = ({ n, s, extra, baj }) => <div><p className="inf-eb">Sección {n}{extra ? ` · ${extra}` : ''}</p><h1>{s.titulo}</h1>{baj && <p className="inf-baj">{baj}</p>}</div>
const Sub = ({ titulo, children }) => <div className="inf-sub"><h2>{titulo}</h2>{children && <span>{children}</span>}</div>

/** Cifra con comparación: ▲▼, el texto y si fue favorable. */
function Kp({ etiqueta, valor, unidad, cmp, antes, ahora, nota }) {
  return <div className="inf-kp">
    <span className="l">{etiqueta}</span>
    <span className="v">{valor}{unidad && <small>{unidad}</small>}</span>
    {ahora ? <span className="cmp"><Tg clase="ne">Vista actual</Tg></span>
      : cmp ? <span className="cmp">{textoCmp(cmp)} {cmp.tono === 'bien' ? <Tg tono="ok">Favorable</Tg> : cmp.tono === 'mal' ? <Tg tono="warn">Desfavorable</Tg> : null}</span>
        : <span className="cmp sin">Sin comparación</span>}
    {(antes || nota) && <span className="p">{[antes && antes.replace(/^antes/, 'Antes'), nota].filter(Boolean).join(' · ')}</span>}
  </div>
}

/** Barra de escala con triángulo: zonas verde, ámbar y roja con borde (legible sin color). */
function Escala({ zonas, posicion }) {
  return <div className="inf-escala">
    <div className="inf-escala-b">{zonas.map(([flex, color], i) => <span key={i} style={{ flex, background: color }} />)}</div>
    {posicion != null && <span className="inf-escala-t" style={{ left: `calc(${Math.max(0, Math.min(100, posicion))}% - 5px)` }} />}
  </div>
}

function Aro({ valor, tam = 104, grosor = 16 }) {
  const r = (tam - grosor) / 2
  const c = 2 * Math.PI * r
  const p = numeroValido(valor) ? Math.max(0, Math.min(100, valor)) / 100 : 0
  return <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} aria-hidden="true" className="inf-aro">
    <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="#EEF1F5" strokeWidth={grosor} />
    <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="#3D9BF5" strokeWidth={grosor} strokeDasharray={`${c * p} ${c}`} transform={`rotate(-90 ${tam / 2} ${tam / 2})`} />
    <circle cx={tam / 2} cy={tam / 2} r={r + grosor / 2} fill="none" stroke="#141A22" strokeWidth="1" />
    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="20" fontWeight="700" fill="#141A22">{numeroValido(valor) ? `${Math.round(valor)} %` : '—'}</text>
  </svg>
}

// --- Secciones ----------------------------------------------------------------
function Portada({ doc, secciones }) {
  const f = formatoPorId(doc.formato)
  const completo = doc.formato === 'completo'
  const meta = [
    ['Período del informe', doc.nombre.fechas, `${doc.nombre.dias} ${doc.nombre.dias === 1 ? 'día' : 'días'}`],
    ['Comparado con', doc.nombre.anteriorFechas, `Período anterior, ${doc.nombre.diasAnterior} días`],
    ['Alcance', doc.alcanceTexto, `${doc.m.vista.total} ${doc.m.vista.total === 1 ? 'unidad' : 'unidades'}`],
    ['Generado por', doc.autor.nombre, doc.autor.cargo],
    ['Fecha de generación', fechaHoraVE(doc.generado), 'Hora local del equipo'],
    ['Formato', f.nombre, completo ? 'Todos los formatos en un PDF' : f.frase],
  ]
  return <>
    <div className="inf-portada">
      <p className="inf-eb">{f.nombre} · {doc.alcanceTexto}</p>
      <h1 className="inf-grande">{completo ? <>Informe de gestión<br />de flota</> : f.titulo}</h1>
      <p className="inf-empresa">{doc.empresa}</p>
      <p className="inf-baj">{completo ? 'Operación, mantenimiento, conductores, costos e indicadores de conducción del período, comparados con el período anterior.' : `${f.frase} Comparado con el período anterior.`}</p>
    </div>
    <div className="inf-meta">{meta.map(([k, v, s]) => <div key={k}><p className="inf-eb gris">{k}</p><p className="v">{v}</p><p className="s">{s}</p></div>)}</div>
    <div className="inf-pocas"><p className="inf-eb">En pocas palabras</p><p>{doc.frase.texto}{doc.frase.aviso && <> <b>{doc.frase.aviso}</b></>}</p></div>
    <div className="inf-kp4">{doc.cifras.map(c => <div key={c.clave}><span>{c.etiqueta}</span><b>{c.valor}{c.unidad && <small> {c.unidad}</small>}</b><i>{c.ahora ? 'Vista actual' : c.cmp ? textoCmp(c.cmp) : 'Sin comparación'}</i></div>)}</div>
    <div>
      <h2 className="inf-h2-contenido">Contenido</h2>
      <ol className="inf-indice">{secciones.map((s, i) => <li key={s.id}><span className={i === 0 ? 'num on' : 'num'}>{i + 1}</span><span><b>{s.titulo}</b><span>{s.detalle}</span></span><span className="sec">Sección {i + 1}</span></li>)}</ol>
    </div>
    <p className="inf-nota abajo">Estado de marcha, asignaciones, índice y documentos corresponden a la vista al generar el informe; kilómetros, eventos, ODT y gastos, al período elegido.</p>
  </>
}

function puntosDeAtencion(m) {
  const { vista, act, ant, filasU, filasP } = m
  const puntos = []
  const vencidas = filasU.filter(f => f.papeles.estado === 'vencido')
  if (vencidas.length) puntos.push(['bad', `Documentos vencidos en ${vencidas.length} ${vencidas.length === 1 ? 'unidad' : 'unidades'}`, `${lista(vencidas.slice(0, 6).map(f => f.v.alias))}${vencidas.length > 6 ? ' y otras' : ''}. Renovar antes de circular.`])
  const peor = filasU.filter(f => tonoIndice(f.v.indiceSeguro) === 'bad').sort((a, b) => a.v.indiceSeguro - b.v.indiceSeguro)[0]
  if (peor) puntos.push(['bad', `${peor.v.alias}: el índice de manejo más bajo`, `Índice ${peor.v.indiceSeguro} de 100${peor.sinResolver ? ` y ${peor.sinResolver} ODT sin resolver` : ''}.`])
  const personas = filasP.filter(p => p.papeles.estado === 'vencido')
  if (personas.length) puntos.push(['bad', `${personas.length} ${personas.length === 1 ? 'conductor con papeles vencidos' : 'conductores con papeles vencidos'}`, `${lista(personas.slice(0, 5).map(p => p.nombre))}.`])
  if (act.sinResolver) puntos.push(['warn', `${act.sinResolver} ${act.sinResolver === 1 ? 'orden de trabajo sin resolver' : 'órdenes de trabajo sin resolver'}`, `${act.abiertas} abiertas y ${act.revision} en revisión. El período cerró con ${act.odts.length} ODT (antes ${ant.odts.length}).`])
  const sinConductor = filasU.filter(f => !f.v.conductorPrincipalId)
  if (sinConductor.length) puntos.push(['warn', `${sinConductor.length} ${sinConductor.length === 1 ? 'unidad sin conductor asignado' : 'unidades sin conductor asignado'}`, `${lista(sinConductor.slice(0, 6).map(f => f.v.alias))}${sinConductor.length > 6 ? ' y otras' : ''}.`])
  if (vista.sinDato) puntos.push(['warn', `${vista.sinDato} ${vista.sinDato === 1 ? 'unidad sin dato de marcha' : 'unidades sin dato de marcha'}`, 'El GPS no informó si estaba en marcha al generar el informe. Revisar el equipo.'])
  return puntos.slice(0, 6)
}

function Resumen({ doc, n, s }) {
  const { act, ant, vista } = doc.m
  const kmCmp = comparar(act.km, ant.km, {})
  const gastoCmp = comparar(act.gasto, ant.gasto, {})
  const frases = []
  if (act.km != null) frases.push(`La flota recorrió ${kmVE(act.km)}${frenteAnterior(kmCmp)}${act.eventosPor100 != null ? `, con ${numeroVE(act.eventosPor100, 2)} eventos de manejo por cada 100 km` : ''}.`)
  if (act.gasto != null) frases.push(`El gasto fue de ${dineroVE(act.gasto)}${frenteAnterior(gastoCmp)}.`)
  const conclusion = `${frases.length ? `${frases.join(' ')} ` : ''}Se crearon ${act.odts.length} ODT (antes ${ant.odts.length}) y ${act.sinResolver} siguen sin resolver. Ahora hay ${vista.enMarcha} de ${vista.total} unidades en marcha.`
  const kps = [
    { etiqueta: 'Km recorridos', valor: act.km == null ? '—' : numeroVE(Math.round(act.km)), unidad: act.km == null ? '' : 'km', cmp: kmCmp, antes: ant.km == null ? null : `antes ${kmVE(ant.km)}`, nota: act.km == null ? '' : 'De los conductores identificados' },
    { etiqueta: 'Score de conducción', valor: n2(act.eventosPor100), unidad: act.eventosPor100 == null ? '' : 'ev./100 km', cmp: comparar(act.eventosPor100, ant.eventosPor100, { mejor: 'baja', modo: 'abs', decimales: 2 }), antes: ant.eventosPor100 == null ? null : `antes ${n2(ant.eventosPor100)}`, nota: 'óptimo < 1,5' },
    { etiqueta: 'Identificación', valor: n0(vista.identificacion), unidad: vista.identificacion == null ? '' : '%', ahora: true, nota: `${vista.conConductor} de ${vista.total}` },
    { etiqueta: 'ODT del período', valor: numeroVE(act.odts.length), cmp: comparar(act.odts.length, ant.odts.length, { mejor: 'baja', modo: 'abs' }), antes: `antes ${ant.odts.length}`, nota: `${act.sinResolver} sin resolver` },
    { etiqueta: 'Gasto del período', valor: dineroVE(act.gasto), cmp: comparar(act.gasto, ant.gasto, { mejor: 'baja' }), antes: ant.gasto == null ? null : `antes ${dineroVE(ant.gasto)}`, nota: act.gasto == null ? 'Costos no disponibles' : `${n0(act.movimientos)} gastos` },
    { etiqueta: 'Costo por km', valor: act.costoPorKm == null ? '—' : dineroVE(act.costoPorKm, 3), cmp: comparar(act.costoPorKm, ant.costoPorKm, { mejor: 'baja', modo: 'abs', decimales: 3, prefijo: '$' }), antes: ant.costoPorKm == null ? null : `antes ${dineroVE(ant.costoPorKm, 3)}` },
  ]
  const puntos = puntosDeAtencion(doc.m)
  return <>
    <Titulo n={n} s={s} />
    <div className="inf-conclusion"><p>{conclusion}</p></div>
    <div><Sub titulo="Indicadores clave del período">▲ ▼ contra {doc.nombre.anteriorFechas}</Sub><div className="inf-kp3">{kps.map(k => <Kp key={k.etiqueta} {...k} />)}</div></div>
    <div className="inf-box gris inf-ahora">
      <span className="t">Vista actual · {fechaHoraVE(doc.generado)} · sin comparación</span>
      <span className="f"><span><b>{vista.total}</b> unidades</span><span><i className="inf-dot m" /><b>{vista.enMarcha}</b> en marcha</span><span><i className="inf-dot d" /><b>{vista.detenidas}</b> detenidas</span><span><i className="inf-dot x" /><b>{vista.sinDato}</b> sin dato</span><span>Índice <b>{n0(vista.indice)}</b>/100</span></span>
    </div>
    <div>
      <Sub titulo="Puntos de atención">Ordenados por urgencia</Sub>
      {puntos.length ? <ol className="inf-puntos">{puntos.map(([t, titulo, det]) => <li key={titulo}><span><Tg tono={t}>{t === 'bad' ? 'Atención' : 'Alerta'}</Tg></span><span><b>{titulo}</b><span>{det}</span></span></li>)}</ol>
        : <p className="inf-lec">Sin puntos de atención en este período.</p>}
    </div>
  </>
}

function Vehiculos({ doc, n, s }) {
  const { act, vista, filasU } = doc.m
  const pct = vista.total ? Math.round(vista.enMarcha / vista.total * 100) : 0
  const totalEventos = filasU.reduce((t, f) => t + f.eventos, 0)
  return <>
    <Titulo n={n} s={s} extra="Formato de vehículos" />
    <div className="inf-box inf-dos">
      <div className="inf-col">
        <Sub titulo="Operación de la flota">Vista actual</Sub>
        <div className="inf-marcha" role="img" aria-label={`${vista.enMarcha} en marcha, ${vista.detenidas} detenidas, ${vista.sinDato} sin dato`}>
          {vista.enMarcha > 0 && <span className="m" style={{ flex: vista.enMarcha }}>{vista.enMarcha}</span>}
          {vista.detenidas > 0 && <span className="d inf-trama" style={{ flex: vista.detenidas }}><b>{vista.detenidas}</b></span>}
          {vista.sinDato > 0 && <span className="x" style={{ flex: vista.sinDato }}>{vista.sinDato}</span>}
        </div>
        <div className="inf-leyenda"><span><i className="inf-dot m" />En marcha {vista.enMarcha}</span><span><i className="inf-dot d" />Detenidas {vista.detenidas}</span><span><i className="inf-dot x" />Sin dato {vista.sinDato}</span></div>
        <p className="inf-lec"><b>Lectura:</b> {pct} % de la flota estaba en marcha al generar el informe.</p>
      </div>
      <div className="inf-col inf-datos">
        <div><span>Km del período (conductores identificados)</span><b>{kmVE(act.km)}</b></div>
        <div><span>Odómetros acumulados</span><b>{kmVE(vista.odometros)}</b></div>
        <div><span>Índice promedio</span><b>{vista.indice == null ? '—' : `${vista.indice} / 100`}</b></div>
        <div><span>Unidades con conductor</span><b>{vista.conConductor} de {vista.total}</b></div>
      </div>
    </div>
    <div>
      <Sub titulo="Detalle por unidad">Eventos y ODT: período · Estado, índice y documentos: vista actual</Sub>
      <table className="inf-tabla">
        <colgroup><col style={{ width: '17%' }} /><col style={{ width: '12%' }} /><col style={{ width: '13%' }} /><col style={{ width: '19%' }} /><col style={{ width: '9%' }} /><col style={{ width: '9%' }} /><col style={{ width: '7%' }} /><col style={{ width: '14%' }} /></colgroup>
        <thead><tr><th>Unidad</th><th>Placa</th><th>Estado</th><th>Conductor</th><th className="r">Índice</th><th className="r">Eventos</th><th className="r">ODT</th><th>Documentos</th></tr></thead>
        <tbody>
          {filasU.map(f => <tr key={f.id}>
            <td className="b w">{f.v.alias}</td><td>{f.v.placa || '—'}</td>
            <td><i className={`inf-dot ${f.v.estadoMarcha === 'en_marcha' ? 'm' : f.v.estadoMarcha === 'parada' ? 'd' : 'x'}`} />{f.v.estadoMarcha === 'en_marcha' ? 'En marcha' : f.v.estadoMarcha === 'parada' ? 'Detenida' : 'Sin dato'}</td>
            <td className="w">{f.v.conductorPrincipalId ? f.v.conductorNombre : <span className="inf-si">Sin conductor</span>}</td>
            <td className="r">{n0(f.v.indiceSeguro)}<Mk tono={tonoIndice(f.v.indiceSeguro)} /></td>
            <td className="r">{f.eventos}</td><td className="r">{f.odts}</td>
            <td><Tg tono={tonoPapeles(f.papeles.estado)}>{f.papeles.texto}</Tg></td>
          </tr>)}
          <tr className="tot"><td>Total · {filasU.length}</td><td /><td>{vista.enMarcha} en marcha</td><td>{vista.conConductor} con conductor</td><td className="r">{n0(vista.indice)}</td><td className="r">{totalEventos}</td><td className="r">{act.odts.length}</td><td>{vista.conPapelesVencidos} con vencidos</td></tr>
        </tbody>
      </table>
    </div>
    <p className="inf-nota">Índice de manejo 0–100 (más alto es mejor): sin marca = Conforme (85 o más) · <Mk tono="warn" /> Alerta (70 a 84) · <Mk tono="bad" /> Atención (menor a 70). «—» = sin dato, no es cero. Eventos = eventos de alerta del período.</p>
  </>
}

function Dona({ partes, total }) {
  const r = 44
  const c = 2 * Math.PI * r
  let acumulado = 0
  return <svg width="124" height="124" viewBox="0 0 124 124" aria-hidden="true" className="inf-dona">
    <circle cx="62" cy="62" r={r} fill="none" stroke="#EEF1F5" strokeWidth="20" />
    {total > 0 && partes.filter(p => p.valor > 0).map(p => {
      const largo = p.valor / total * c
      const el = <circle key={p.clave} cx="62" cy="62" r={r} fill="none" stroke={p.color} strokeWidth="20" strokeDasharray={`${Math.max(0, largo - 2)} ${c}`} strokeDashoffset={-acumulado} transform="rotate(-90 62 62)" />
      acumulado += largo
      return el
    })}
    <text x="62" y="62" dominantBaseline="central" textAnchor="middle" fontSize="22" fontWeight="700" fill="#141A22">{total}</text>
  </svg>
}

function Mantenimiento({ doc, n, s }) {
  const { act, ant } = doc.m
  const total = act.odts.length
  const partes = [
    { clave: 'abierta', etiqueta: 'Abierta', valor: act.abiertas, color: '#7A4F00' },
    { clave: 'revision', etiqueta: 'En revisión', valor: act.revision, color: '#3D9BF5' },
    { clave: 'resuelta', etiqueta: 'Resuelta', valor: act.resueltas, color: '#BFE3CB' },
  ]
  const otros = total - act.abiertas - act.revision - act.resueltas
  const maxFalla = act.fallas[0]?.valor || 1
  const ahora = new Date(doc.generado).getTime()
  const vieja = doc.m.pendientes?.[0]
  // Días hasta resolverse; las que siguen sin resolver, hasta hoy. Resuelta sin fecha (p. ej. cancelada): no se sabe.
  const dias = o => {
    const fin = o.resueltaEn ? Date.parse(o.resueltaEn) : ['abierta', 'revision'].includes(grupoOdt(o.estado)) ? ahora : NaN
    const d = (fin - Date.parse(o.creadaEn)) / 86400000
    return Number.isFinite(d) ? Math.max(0, Math.round(d)) : null
  }
  const porId = new Map(doc.m.alcance.unidades.map(v => [v.id, v]))
  const ordenes = [...act.odts].sort((a, b) => Date.parse(a.creadaEn) - Date.parse(b.creadaEn))
  return <>
    <Titulo n={n} s={s} baj={`Órdenes de trabajo (ODT) creadas entre el ${doc.nombre.fechas}.`} />
    <div className="inf-dos-cajas">
      <div className="inf-box inf-col">
        <Sub titulo="ODT por estado">{total} en total</Sub>
        <div className="inf-dona-fila">
          <Dona partes={partes} total={total} />
          <ul className="inf-estados">{partes.map(p => <li key={p.clave}><i style={{ background: p.color }} /><span>{p.etiqueta}</span><b>{p.valor}</b><span className="r">{total ? Math.round(p.valor / total * 100) : 0} %</span></li>)}
            {otros > 0 && <li><i style={{ background: '#FFFFFF' }} /><span>Otro estado</span><b>{otros}</b><span className="r">{Math.round(otros / total * 100)} %</span></li>}</ul>
        </div>
        <p className="inf-lec"><b>Lectura:</b> {total ? `${act.sinResolver} de ${total} órdenes (${Math.round(act.sinResolver / total * 100)} %) siguen sin resolver.` : 'No se crearon ODT en el período.'}</p>
      </div>
      <div className="inf-box inf-col">
        <Sub titulo="Fallas más frecuentes">N.º de ODT</Sub>
        {act.fallas.length ? <div className="inf-barras">{act.fallas.slice(0, 6).map(x => <div key={x.clave} className="inf-bar"><span>{x.etiqueta}</span><span className="t"><i style={{ width: `${x.valor / maxFalla * 100}%` }} /></span><b>{x.valor}</b></div>)}</div> : <p className="inf-lec">Sin órdenes en el período.</p>}
        {act.fallas.length > 1 && <p className="inf-lec abajo"><b>Lectura:</b> {act.fallas[0].etiqueta.toLocaleLowerCase('es')} y {act.fallas[1].etiqueta.toLocaleLowerCase('es')} suman {act.fallas[0].valor + act.fallas[1].valor} de las {total} órdenes.</p>}
      </div>
    </div>
    <div className="inf-kp4b">
      <Kp etiqueta="Resolución promedio" valor={duracionHoras(act.resolucionHoras)} cmp={comparar(act.resolucionHoras, ant.resolucionHoras, { mejor: 'baja', modo: 'pct' })} antes={ant.resolucionHoras == null ? null : `antes ${duracionHoras(ant.resolucionHoras)}`} />
      <Kp etiqueta="Más antigua sin resolver" valor={vieja ? `${dias(vieja)} ${dias(vieja) === 1 ? 'día' : 'días'}` : '—'} ahora nota={vieja ? `${porId.get(vieja.vehiculoId)?.alias || vieja.vehiculoNombre || '—'} · desde el ${fechaCortaVE(vieja.creadaEn, true)}` : 'Ninguna'} />
      <Kp etiqueta="Costo en resueltas" valor={dineroVE(act.costoResueltas)} cmp={comparar(act.costoResueltas, ant.costoResueltas, { mejor: 'baja' })} nota={`${act.conCosto} de ${act.resueltas} con costo`} />
      <Kp etiqueta="Costo medio resuelta" valor={act.conCosto ? dineroVE(act.costoResueltas / act.conCosto) : '—'} ahora={false} cmp={null} nota="Solo con costo" />
    </div>
    <div>
      <Sub titulo="Órdenes del período">Días: hasta resolverse, o abierta al {fechaCortaVE(doc.generado)}</Sub>
      <table className="inf-tabla">
        <colgroup><col style={{ width: '9%' }} /><col style={{ width: '13%' }} /><col style={{ width: '13%' }} /><col style={{ width: '30%' }} /><col style={{ width: '16%' }} /><col style={{ width: '8%' }} /><col style={{ width: '11%' }} /></colgroup>
        <thead><tr><th>Creada</th><th>Unidad</th><th>Falla</th><th>Descripción</th><th>Estado</th><th className="r">Días</th><th className="r">Costo</th></tr></thead>
        <tbody>
          {ordenes.length ? ordenes.map(o => {
            const g = grupoOdt(o.estado)
            return <tr key={o.id}>
              <td>{fechaCortaVE(o.creadaEn)}</td><td className="b w">{porId.get(o.vehiculoId)?.alias || o.vehiculoNombre || '—'}</td>
              <td className="w">{o.tipoFalla ? etiquetaFalla(o.tipoFalla) : o.tipo === 'preventiva' ? 'Preventivo' : 'Otro'}</td><td className="w">{o.descripcion || '—'}</td>
              <td>{g === 'abierta' ? <Tg tono="warn">Abierta</Tg> : g === 'revision' ? <Tg clase="az">En revisión</Tg> : g === 'resuelta' ? <Tg tono="ok">Resuelta</Tg> : <Tg clase="ne">{ETIQUETA_GRUPO.otro}</Tg>}</td>
              <td className="r">{dias(o) == null ? <Raya /> : `${dias(o)} d`}</td>
              <td className="r">{numeroValido(o.costo) ? dineroVE(o.costo) : g === 'resuelta' ? 'Sin costo' : <Raya />}</td>
            </tr>
          }) : <tr><td colSpan="7" className="inf-si">No se crearon ODT en el período.</td></tr>}
          <tr className="tot"><td>Total</td><td>{total} ODT</td><td /><td>{act.sinResolver} sin resolver</td><td>{act.abiertas} · {act.revision} · {act.resueltas}</td><td /><td className="r">{dineroVE(act.costoResueltas)}</td></tr>
        </tbody>
      </table>
    </div>
    <p className="inf-nota">El costo registrado al cerrar las ODT no es el gasto total de la flota (ver Costos y gastos). Una ODT resuelta sin costo se muestra como «Sin costo», no como $0.</p>
  </>
}

function Conductores({ doc, n, s }) {
  const { act, ant, vista, filasP } = doc.m
  const ranking = [...filasP].sort((a, b) => (a.eventosPor100 ?? Infinity) - (b.eventosPor100 ?? Infinity) || (b.km ?? -1) - (a.km ?? -1))
  const conKm = ranking.filter(p => p.km != null)
  const sumar = campo => conKm.reduce((t, p) => t + (p.desglose?.[campo] || 0), 0)
  return <>
    <Titulo n={n} s={s} extra="Formato de usuarios" baj="Quién manejó, cuánto y cómo. Ordenados por eventos por cada 100 km." />
    <div className="inf-box inf-ident">
      <div className="inf-ident-a">
        <Aro valor={vista.identificacion} />
        <div className="inf-col">
          <h2>Identificación</h2>
          <span className="g"><b>{vista.conConductor} de {vista.total}</b> unidades</span>
          <span><Tg tono={tonoIdent(vista.identificacion)}>{resultadoDe(tonoIdent(vista.identificacion))}</Tg></span>
          <p className="inf-lec">Vista actual: unidades con conductor asignado.</p>
        </div>
      </div>
      <div className="inf-ident-c"><p className="inf-nota">Km con conductor</p><p className="v">{act.km == null ? '—' : numeroVE(Math.round(act.km))}<small>km</small></p><p className="inf-nota">{act.km == null ? 'Sin dato del servidor' : `${conKm.length} conductores`}</p></div>
      <div className="inf-ident-c"><p className="inf-nota">Eventos de manejo</p><p className="v">{n0(act.eventosManejo)}</p><p className="inf-nota">{ant.eventosManejo == null ? 'Sin comparación' : `${act.eventosManejo > ant.eventosManejo ? '▲' : act.eventosManejo < ant.eventosManejo ? '▼' : '='} antes ${n0(ant.eventosManejo)}`}</p></div>
      <div className="inf-ident-c"><p className="inf-nota">Papeles al día</p><p className="v">{n0(vista.papelesAlDia)}<small>%</small></p><p className="inf-nota">{vista.papelesVencidos} vencidos · {vista.papelesPorVencer} por vencer</p></div>
    </div>
    <div>
      <Sub titulo="Conductores del período">Acel., Fren. y Exc.: eventos de manejo del período · Índice y papeles: vista actual</Sub>
      <table className="inf-tabla">
        <colgroup><col style={{ width: '4%' }} /><col style={{ width: '20%' }} /><col style={{ width: '12%' }} /><col style={{ width: '9%' }} /><col style={{ width: '7%' }} /><col style={{ width: '7%' }} /><col style={{ width: '7%' }} /><col style={{ width: '9%' }} /><col style={{ width: '9%' }} /><col style={{ width: '16%' }} /></colgroup>
        <thead><tr><th className="r">#</th><th>Conductor</th><th>Unidad</th><th className="r">Km</th><th className="r">Acel.</th><th className="r">Fren.</th><th className="r">Exc.</th><th className="r">Ev./100</th><th className="r">Índice</th><th>Papeles</th></tr></thead>
        <tbody>
          {ranking.length ? ranking.map((p, i) => <tr key={p.id}>
            <td className="r">{p.km != null ? i + 1 : '—'}</td><td className="b w">{p.nombre}</td><td className="w">{p.unidad || <span className="inf-si">Sin unidad</span>}</td>
            <td className="r">{p.km == null ? '—' : numeroVE(Math.round(p.km))}</td>
            <td className="r">{p.desglose ? p.desglose.aceleraciones : '—'}</td><td className="r">{p.desglose ? p.desglose.frenadas : '—'}</td><td className="r">{p.desglose ? p.desglose.excesos : '—'}</td>
            <td className="r">{n2(p.eventosPor100)}<Mk tono={tonoScore(p.eventosPor100)} /></td>
            <td className="r">{n0(p.indice)}<Mk tono={tonoIndice(p.indice)} /></td>
            <td><Tg tono={tonoPapeles(p.papeles.estado)}>{p.papeles.texto}</Tg></td>
          </tr>) : <tr><td colSpan="10" className="inf-si">No hay conductores en este alcance.</td></tr>}
          <tr className="tot"><td /><td>Total · {ranking.length}</td><td /><td className="r">{act.km == null ? '—' : numeroVE(Math.round(act.km))}</td><td className="r">{conKm.length ? sumar('aceleraciones') : '—'}</td><td className="r">{conKm.length ? sumar('frenadas') : '—'}</td><td className="r">{conKm.length ? sumar('excesos') : '—'}</td><td className="r">{n2(act.eventosPor100)}</td><td className="r">{n0(vista.indice)}</td><td>{vista.papelesVencidos} vencidos</td></tr>
        </tbody>
      </table>
    </div>
    <p className="inf-nota">Ev./100 = eventos de manejo por cada 100 km (más bajo es mejor; óptimo menor a 1,5). Índice 0–100 (más alto es mejor). <Mk tono="warn" /> Alerta · <Mk tono="bad" /> Atención. «—» = sin dato del servidor, no es cero.</p>
  </>
}

function Costos({ doc, n, s }) {
  const { act, ant, filasU } = doc.m
  const max = act.porCategoria?.[0]?.monto || 1
  const conOdt = filasU.filter(f => f.resueltas > 0).sort((a, b) => (b.costo ?? -1) - (a.costo ?? -1))
  return <>
    <Titulo n={n} s={s} extra="Formato de costos" baj="Lo que se gastó en la flota en el período, no solo el mantenimiento." />
    <div className="inf-kp3">
      <Kp etiqueta="Gasto del período" valor={dineroVE(act.gasto)} cmp={comparar(act.gasto, ant.gasto, { mejor: 'baja' })} antes={ant.gasto == null ? null : `antes ${dineroVE(ant.gasto)}`} nota={act.gasto == null ? 'Costos no disponibles en el servidor' : ''} />
      <Kp etiqueta="Costo por km" valor={act.costoPorKm == null ? '—' : dineroVE(act.costoPorKm, 3)} cmp={comparar(act.costoPorKm, ant.costoPorKm, { mejor: 'baja', modo: 'abs', decimales: 3, prefijo: '$' })} antes={ant.costoPorKm == null ? null : `antes ${dineroVE(ant.costoPorKm, 3)}`} nota={act.costoPorKm == null ? 'Hace falta gasto y km del período' : ''} />
      <div className="inf-kp"><span className="l">Productos y servicios</span><span className="v chica">{dineroVE(act.productos)} <small>· {dineroVE(act.servicios)}</small></span><span className="cmp" style={{ fontWeight: 500 }}>{act.gasto ? `${Math.round(act.productos / act.gasto * 100)} % · ${Math.round(act.servicios / act.gasto * 100)} %` : '—'}</span><span className="p">{act.movimientos == null ? 'Sin dato' : `${numeroVE(act.movimientos)} gastos registrados`}</span></div>
    </div>
    <div className="inf-box inf-col">
      <Sub titulo="Gasto por categoría">USD · P = producto · S = servicio</Sub>
      {act.porCategoria?.length ? <div className="inf-barras">{act.porCategoria.map(x => <div key={x.categoria} className="inf-bar cat"><span>{CATEGORIAS[x.categoria] || x.categoria} <em>{esProducto(x.categoria) ? 'P' : 'S'}</em></span><span className="t"><i style={{ width: `${x.monto / max * 100}%` }} /></span><b>{dineroVE(x.monto)}</b><span className="r gris">{Math.round(x.monto / act.gasto * 100)} %</span></div>)}</div>
        : <p className="inf-lec">{act.gasto == null ? 'Los costos de operación todavía no están disponibles en el servidor. Abajo, el costo registrado en las ODT resueltas.' : 'Sin gastos registrados en el período.'}</p>}
      {act.porCategoria?.length > 1 && <p className="inf-lec"><b>Lectura:</b> {(CATEGORIAS[act.porCategoria[0].categoria] || act.porCategoria[0].categoria).toLocaleLowerCase('es')} y {(CATEGORIAS[act.porCategoria[1].categoria] || act.porCategoria[1].categoria).toLocaleLowerCase('es')} son el {Math.round((act.porCategoria[0].monto + act.porCategoria[1].monto) / act.gasto * 100)} % del gasto.</p>}
    </div>
    <div>
      <Sub titulo="Costo registrado en ODT por unidad">Solo unidades con ODT resueltas en el período</Sub>
      <table className="inf-tabla">
        <colgroup><col style={{ width: '24%' }} /><col style={{ width: '18%' }} /><col style={{ width: '18%' }} /><col style={{ width: '18%' }} /><col style={{ width: '22%' }} /></colgroup>
        <thead><tr><th>Unidad</th><th>Placa</th><th className="r">ODT resueltas</th><th className="r">Con costo</th><th className="r">Costo registrado</th></tr></thead>
        <tbody>
          {conOdt.map(f => <tr key={f.id}><td className="b w">{f.v.alias}</td><td>{f.v.placa || '—'}</td><td className="r">{f.resueltas}</td><td className="r">{f.conCosto}{f.conCosto < f.resueltas && <Mk tono="warn" />}</td><td className="r b">{f.costo == null ? 'Sin costo' : dineroVE(f.costo)}</td></tr>)}
          {filasU.length - conOdt.length > 0 && <tr className="si"><td>Otras {filasU.length - conOdt.length} unidades</td><td /><td className="r">0</td><td className="r">—</td><td className="r">—</td></tr>}
          <tr className="tot"><td>Total</td><td /><td className="r">{act.resueltas}</td><td className="r">{act.conCosto}</td><td className="r">{dineroVE(act.costoResueltas)}</td></tr>
        </tbody>
      </table>
    </div>
    <p className="inf-nota">Costo por km = gasto del período ÷ km recorridos en el período (no el odómetro acumulado). El servidor no reparte los gastos por unidad: por eso la tabla muestra el costo registrado al cerrar las ODT. <Mk tono="warn" /> = ODT resueltas sin costo registrado.</p>
  </>
}

function Estadistico({ doc, n, s }) {
  const { act, ant, vista } = doc.m
  const ranking = (act.manejo || []).map(x => ({ ...x, unidad: doc.m.filasP.find(p => p.id === x.id)?.unidad || null })).sort(porScore)
  const por100 = (x, campo) => x.km > 0 ? numeroVE(x[campo] / x.km * 100, 2) : '—'
  const tonoId = tonoIdent(vista.identificacion)
  const filas = [
    { nombre: 'Score de conducción', como: 'Eventos ÷ km × 100', valor: n2(act.eventosPor100), optimo: 'menor a 1,5', zonas: [[0.3, '#BFE3CB'], [0.4, '#F5DFA3'], [0.3, '#F2B8B0']], pos: act.eventosPor100 == null ? null : act.eventosPor100 / 5 * 100, tono: tonoScore(act.eventosPor100), ref: ant.eventosPor100 == null ? 'Sin comparación' : `Antes ${n2(ant.eventosPor100)}` },
    { nombre: 'Identificación de conductores', como: 'Unidades con conductor', valor: porcentajeVE(vista.identificacion), optimo: '85 % o más', zonas: [[0.7, '#F2B8B0'], [0.15, '#F5DFA3'], [0.15, '#BFE3CB']], pos: vista.identificacion, tono: tonoId, ref: 'Vista actual' },
    { nombre: 'Índice de manejo promedio', como: 'Promedio de las unidades', valor: vista.indice == null ? '—' : `${vista.indice} / 100`, optimo: '85 o más', zonas: [[0.7, '#F2B8B0'], [0.15, '#F5DFA3'], [0.15, '#BFE3CB']], pos: vista.indice, tono: tonoIndice(vista.indice), ref: 'Vista actual' },
  ]
  const conformes = filas.filter(f => f.tono === 'ok').length
  return <>
    <Titulo n={n} s={s} extra="Formato estadístico" />
    <div>
      <Sub titulo="Indicadores de conducción">Triángulo = valor sobre su escala</Sub>
      <table className="inf-tabla alta">
        <colgroup><col style={{ width: '29%' }} /><col style={{ width: '11%' }} /><col style={{ width: '13%' }} /><col style={{ width: '19%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /></colgroup>
        <thead><tr><th>Indicador</th><th className="r">Valor</th><th>Óptimo</th><th>Escala</th><th>Resultado</th><th className="r">Referencia</th></tr></thead>
        <tbody>{filas.map(f => <tr key={f.nombre}><td><b className="bl">{f.nombre}</b><span className="gris">{f.como}</span></td><td className="r grande">{f.valor}</td><td>{f.optimo}</td><td><Escala zonas={f.zonas} posicion={f.pos} /></td><td><Tg tono={f.tono}>{resultadoDe(f.tono)}</Tg></td><td className="r gris">{f.ref}</td></tr>)}</tbody>
      </table>
      <p className="inf-lec"><b>Lectura:</b> {conformes} de {filas.length} indicadores en zona Conforme{act.eventosPor100 != null && ant.eventosPor100 != null ? `; el score pasó de ${n2(ant.eventosPor100)} a ${n2(act.eventosPor100)}` : ''}.</p>
    </div>
    <div>
      <Sub titulo="Distancias y eventos por conductor">Acel., Fren. y Exc.: por cada 100 km · primero el score más alto</Sub>
      <table className="inf-tabla">
        <colgroup><col style={{ width: '27%' }} /><col style={{ width: '15%' }} /><col style={{ width: '12%' }} /><col style={{ width: '11%' }} /><col style={{ width: '11%' }} /><col style={{ width: '11%' }} /><col style={{ width: '13%' }} /></colgroup>
        <thead><tr><th>Conductor</th><th>Unidad</th><th className="r">Km</th><th className="r">Acel.</th><th className="r">Fren.</th><th className="r">Exc.</th><th className="r">Score</th></tr></thead>
        <tbody>
          {ranking.length ? ranking.map(x => <tr key={x.id}><td className="b w">{x.nombre}</td><td className="w">{x.unidad || '—'}</td><td className="r">{numeroVE(Math.round(x.km))}</td><td className="r">{por100(x, 'aceleraciones')}</td><td className="r">{por100(x, 'frenadas')}</td><td className="r">{por100(x, 'excesos')}</td><td className="r b">{x.eventosPor100 == null ? <Raya /> : n2(x.eventosPor100)}<Mk tono={tonoScore(x.eventosPor100)} /></td></tr>)
            : <tr><td colSpan="7" className="inf-si">El servidor no entregó km ni eventos de manejo para este período: no se califica.</td></tr>}
          {ranking.length > 0 && <tr className="tot"><td>Total · {ranking.length}</td><td /><td className="r">{numeroVE(Math.round(act.km))}</td><td className="r">{numeroVE(ranking.reduce((t, x) => t + x.aceleraciones, 0) / act.km * 100, 2)}</td><td className="r">{numeroVE(ranking.reduce((t, x) => t + x.frenadas, 0) / act.km * 100, 2)}</td><td className="r">{numeroVE(ranking.reduce((t, x) => t + x.excesos, 0) / act.km * 100, 2)}</td><td className="r">{n2(act.eventosPor100)}</td></tr>}
        </tbody>
      </table>
    </div>
    <p className="inf-nota">Score: sin marca = Conforme (menor a 1,5) · <Mk tono="warn" /> Alerta (1,5 a 3,49) · <Mk tono="bad" /> Atención (3,5 o más). Sin km no se califica. Eventos de alerta del período en este alcance: {numeroVE(act.eventos)} (antes {numeroVE(ant.eventos)}).</p>
  </>
}

function Notas({ doc, n, s }) {
  const origen = [
    ['Marcha y conductor asignado', 'Vehículos (GPS y asignación)', 'ahora'],
    ['Índice de manejo (0–100)', 'Vehículos y perfil del conductor', 'ahora'],
    ['Documentos vencidos y por vencer', 'Documentos de cada unidad y persona', 'ahora'],
    ['Odómetros acumulados', 'Vehículos', 'ahora'],
    ['Km y eventos de manejo', 'Score de manejo de FOM', 'periodo'],
    ['Eventos de alerta', 'Alertas de FOM', 'periodo'],
    ['Órdenes de trabajo y su costo', 'Mantenimiento (fecha de creación)', 'periodo'],
    ['Gastos y categorías', 'Costos y gastos', 'periodo'],
    ['Comparación ▲ ▼', `Mismas fuentes, ${doc.nombre.anteriorFechas}`, 'anterior'],
  ]
  const glosario = [
    ['ODT', 'Orden de trabajo. Tiene tres estados: Abierta, En revisión y Resuelta.'],
    ['Índice de manejo', 'Nota de 0 a 100 de cada unidad o conductor. Más alto es mejor.'],
    ['Score de conducción', 'Eventos de manejo por cada 100 km. Más bajo es mejor; óptimo menor a 1,5.'],
    ['Evento de manejo', 'Aceleración brusca, frenada brusca o exceso de velocidad registrado por el GPS.'],
    ['Identificación', 'Unidades con conductor asignado al generar el informe.'],
    ['Sin dato', 'No hubo medición. Nunca se cuenta como cero ni como Conforme.'],
  ]
  const anio = new Date(doc.generado).getFullYear()
  return <>
    <Titulo n={n} s={s} />
    <div>
      <Sub titulo="De dónde sale cada dato">Todas las cifras se consultan en FOM al generar el informe</Sub>
      <table className="inf-tabla alta">
        <colgroup><col style={{ width: '38%' }} /><col style={{ width: '40%' }} /><col style={{ width: '22%' }} /></colgroup>
        <thead><tr><th>Dato</th><th>Origen en FOM</th><th>Momento</th></tr></thead>
        <tbody>{origen.map(([dato, de, cuando]) => <tr key={dato}><td className="b">{dato}</td><td>{de}</td><td>{cuando === 'ahora' ? <Tg clase="ne">Vista actual</Tg> : <span className="inf-tg az">{cuando === 'periodo' ? 'Período' : 'Período anterior'}</span>}</td></tr>)}</tbody>
      </table>
    </div>
    {doc.faltantes.length > 0 && <div className="inf-box aviso"><h2>Reporte parcial</h2><p className="inf-lec">No se pudo consultar: {doc.faltantes.map(x => x.nombre.toLocaleLowerCase('es')).join(', ')}. Esas cifras aparecen como «—».</p></div>}
    <div className="inf-dos-cajas">
      <div className="inf-box gris"><h2>Vista actual</h2><p className="inf-txt">Cómo estaba la flota al generar el informe ({fechaHoraVE(doc.generado)}). No se compara con el período anterior.</p></div>
      <div className="inf-box azul"><h2>Período</h2><p className="inf-txt">Lo ocurrido entre el {doc.nombre.fechas}. Se compara con {doc.nombre.anteriorFechas}.</p></div>
    </div>
    <div>
      <h2 className="inf-mb">Glosario</h2>
      <div className="inf-glosario">{glosario.map(([t, d]) => <div key={t}><b>{t}</b><p>{d}</p></div>)}</div>
    </div>
    <div className="inf-firmas-bloque">
      <Sub titulo="Firmas">Conformidad con el contenido del informe</Sub>
      <div className="inf-firmas">{[['Elaborado por', doc.autor.nombre, doc.autor.cargo], ['Revisado por', '', 'Jefe de mantenimiento'], ['Aprobado por', '', 'Gerente de operaciones']].map(([t, nombre, cargo]) => <div key={t}><p className="inf-eb gris">{t}</p><div className="esp" /><div className="linea" /><span><b>Nombre:</b> {nombre || ' '}</span><span><b>Cargo:</b> {cargo}</span><span><b>Fecha:</b> ____ / ____ / {anio}</span></div>)}</div>
    </div>
  </>
}

const CUERPOS = { resumen: Resumen, vehiculos: Vehiculos, mantenimiento: Mantenimiento, conductores: Conductores, costos: Costos, estadistico: Estadistico, notas: Notas }

/** Una sección del informe con su encabezado y pie. */
function Seccion({ doc, secciones, indice }) {
  const s = secciones[indice]
  const Cuerpo = CUERPOS[s.id]
  return <Hoja doc={doc} s={s} n={indice + 1} total={secciones.length}>
    {s.id === 'portada' ? <Portada doc={doc} secciones={secciones} /> : <Cuerpo doc={doc} n={indice + 1} s={s} />}
  </Hoja>
}

/** El informe completo, montado fuera de la consola para imprimirlo solo. */
export function InformeImprimible({ doc }) {
  const secciones = seccionesDe(doc.formato)
  return createPortal(<div className="inf-raiz"><div className="inf">{secciones.map((s, i) => <Seccion key={s.id} doc={doc} secciones={secciones} indice={i} />)}</div></div>, document.body)
}

/** Una hoja reducida para la vista previa de la ventana «Generar PDF». */
export function VistaHoja({ doc, indice = 0 }) {
  const secciones = seccionesDe(doc.formato)
  const i = Math.min(indice, secciones.length - 1)
  return <div className="inf-mini" aria-hidden="true"><div className="inf inf-pliego"><Seccion doc={doc} secciones={secciones} indice={i} /></div></div>
}

