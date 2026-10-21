import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import { Buscador, Cargando, ErrorCarga, Modal, Vacio } from '../comp/ui'
import { hoyISO } from '../datos/formato'
import { etiquetaManejo, tonoManejo } from '../datos/manejo'
import {
  CATEGORIAS, COMPLETO, FORMATOS, alcanceAlCambiar, armarModelo, cifrasDe, cortesDelPeriodo, crearCsv, crearPeriodo, diasDesde,
  diasServidor, dineroVE, duracionHoras, enVentana, esProducto, formatoPorId, kmVE,
  mesesDisponibles, nombrarPeriodo, numeroValido, numeroVE, porScore, porcentajeVE, rangoPorDefecto, restarCostos,
  restarManejo, resultadoDe, tonoIndice, tonoScore,
} from './reportes-datos'
import { tableroDe, textoCifras } from './reportes-tablero-datos'
import Tablero from './reportes-tablero.jsx'
import { InformeImprimible, VistaHoja, seccionesDe } from './informe/Informe'
import './reportes.css'

// Las 7 vistas de antes caen en una de las 4 pestañas (enlaces guardados).
const VISTA_ANTIGUA = { resumen: 'vehiculos', operacion: 'vehiculos', mantenimiento: 'vehiculos', unidades: 'vehiculos', seguridad: 'usuarios', conductores: 'usuarios' }
const EMPRESA = { tipo: 'empresa' }
const PAGINA = 10
const FALTA = {
  Costos: 'Los costos de operación aún no están disponibles en el servidor.',
  Manejo: 'El servidor no entregó el score de manejo (km y eventos) del período.',
}

// --- Iconos de la maqueta (trazo 1.8) ----------------------------------------
const TRAZOS = {
  vehiculos: <><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></>,
  usuarios: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3 3 0 0 1 0 6" /><path d="M17.5 20a5.5 5.5 0 0 0-3-4.9" /></>,
  costos: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9" /><path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.9-2.5 2s1.1 1.8 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5" /></>,
  estadistico: <><path d="M4 4h6v6H4z" /><path d="M14 4h6v6h-6z" /><path d="M4 14h6v6H4z" /><path d="M14 14h6v6h-6z" /></>,
  completo: <><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M15 3v4h4M9 17v-4M12 17v-6M15 17v-2" /></>,
  empresa: <><path d="M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17" /><path d="M15 9h4a1 1 0 0 1 1 1v11" /><path d="M3 21h18" /><path d="M8.5 7h3M8.5 11h3M8.5 15h3" /></>,
  check: <path d="M5 13l4 4L19 7" />,
  compartir: <path d="M12 4v11M8 8l4-4 4 4M5 13v6h14v-6" />,
  descargar: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />,
  calendario: <><path d="M4 6h16v14H4z" /><path d="M8 2v4M16 2v4M3 10h18" /></>,
  atras: <path d="m15 5-7 7 7 7" />,
  adelante: <path d="m9 5 7 7-7 7" />,
  alerta: <><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4.5M12 17.2v.3" /></>,
}
const Ico = ({ n, tam = 18 }) => <svg className="rp-ico" width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true">{TRAZOS[n]}</svg>
const Etiqueta = ({ tono, children }) => <span className={`rp-tag t-${tono || 'neu'}`}><i />{children}</span>
const TONO_PAPELES = { vencido: 'bad', por_vencer: 'warn', al_dia: 'ok' }
// Color de la pastilla de manejo (datos/manejo.js) → color de celda de Reportes: mismo tono que el Resumen.
const TONO_MANEJO_REPORTE = { verde: 'ok', ambar: 'warn', rojo: 'bad', gris: 'none' }
const n2 = v => numeroValido(v) ? numeroVE(v, 2) : '—'
const csvNum = v => numeroValido(v) ? String(Math.round(Number(v) * 1000) / 1000).replace('.', ',') : ''
const claveDe = sel => sel.tipo === 'mes' ? 'mes' : `${sel.desdeMes}_${sel.hastaMes}`

/**
 * Todo lo que pide un período, a la vez y sin bucles: listas, eventos y una
 * lectura «desde» de costos y de manejo por corte. El período y el anterior
 * salen de restar esas lecturas. La usan la pantalla y la ventana del PDF.
 */
async function cargarReporte(periodoSel) {
  const ahora = new Date()
  const t = ahora.getTime()
  const periodo = crearPeriodo(periodoSel, ahora)
  const cortes = cortesDelPeriodo(periodo, t)
  const faltantes = []
  const tolerar = async (nombre, consultar, vacio) => {
    try { return await consultar() } catch { faltantes.push({ nombre, motivo: FALTA[nombre] || `No se pudo consultar ${nombre.toLocaleLowerCase('es')}. Reintenta para actualizar.` }); return vacio }
  }
  const lecturas = async (nombre, pedir) => {
    const lista = await Promise.all(cortes.map(c => Promise.resolve().then(() => pedir(c)).catch(() => null)))
    if (lista.some(x => x == null)) faltantes.push({ nombre, motivo: FALTA[nombre] })
    return new Map(cortes.map((c, i) => [c, lista[i]]))
  }
  const [vehiculos, conductores, odts, eventos, manejo, costos] = await Promise.all([
    tolerar('Vehículos', () => repo.vehiculos.listar({}), []),
    tolerar('Conductores', () => repo.personal.listar({ soloConductores: true }), []),
    tolerar('Órdenes de trabajo', () => repo.odts.listar({}), []),
    tolerar('Eventos de alerta', () => repo.alertas.eventos({ dias: diasDesde(cortes[0], t) }), []),
    lecturas('Manejo', c => repo.manejo.ranking({ dias: diasServidor(c, t) })),
    lecturas('Costos', c => repo.costos.resumen({ dias: diasDesde(c, t) })),
  ])
  const ventanas = (porCorte, restar) => ({ actual: enVentana(porCorte, periodo.desde, periodo.hasta, t, restar), anterior: enVentana(porCorte, periodo.anterior.desde, periodo.anterior.hasta, t, restar) })
  return { sel: claveDe(periodoSel), ahora, periodo, vehiculos, conductores, odts, eventos, manejo: ventanas(manejo, restarManejo), costos: ventanas(costos, restarCostos), faltantes }
}

function descargar(nombre, contenido) {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Filas del CSV de cada formato: lo mismo que se ve en su tabla, con todas las filas del alcance. */
function filasCsv(formato, m) {
  const marcha = v => v.estadoMarcha === 'en_marcha' ? 'En marcha' : v.estadoMarcha === 'parada' ? 'Detenida' : 'Sin dato'
  if (formato === 'usuarios') return [['Persona', 'Unidad', 'Área', 'Km del período', 'Excesos', 'Frenadas', 'Aceleraciones', 'Eventos por 100 km', 'ODT reportadas', 'Índice actual', 'Papeles', 'Pide atención'],
    ...m.filasP.map(p => [p.nombre, p.unidad || '', p.area || '', csvNum(p.km), p.desglose?.excesos ?? '', p.desglose?.frenadas ?? '', p.desglose?.aceleraciones ?? '', csvNum(p.eventosPor100), p.odts ?? '', p.indice ?? '', p.papeles.texto, p.motivos.join(', ')])]
  if (formato === 'estadistico') return [['Conductor', 'Km del período', 'Aceleraciones', 'Frenadas', 'Excesos', 'Score (eventos por 100 km)', 'Resultado'],
    ...(m.act.manejo || []).map(x => [x.nombre, csvNum(x.km), x.aceleraciones, x.frenadas, x.excesos, csvNum(x.eventosPor100), resultadoDe(tonoScore(x.eventosPor100))])]
  if (formato === 'costos') return [['Categoría', 'Tipo', 'Monto (USD)', '% del gasto'],
    ...(m.act.porCategoria || []).map(x => [CATEGORIAS[x.categoria] || x.categoria, esProducto(x.categoria) ? 'Producto' : 'Servicio', csvNum(x.monto), m.act.gasto ? Math.round(x.monto / m.act.gasto * 100) : '']),
    [], ['Unidad', 'Placa', 'ODT resueltas', 'Con costo', 'Costo registrado en ODT (USD)'],
    ...m.filasU.filter(f => f.resueltas).map(f => [f.v.alias, f.v.placa, f.resueltas, f.conCosto, csvNum(f.costo)])]
  return [['Unidad', 'Placa', 'Marca', 'Modelo', 'Área', 'Conductor', 'Estado actual', 'Índice actual', 'Eventos del período', 'ODT del período', 'ODT sin resolver', 'Papeles', 'Pide atención'],
    ...m.filasU.map(f => [f.v.alias, f.v.placa, f.v.marca, f.v.modelo, f.v.areaNombre, f.v.conductorPrincipalId ? f.v.conductorNombre : 'Sin conductor', marcha(f.v), f.v.indiceSeguro ?? '', f.eventos, f.odts, f.sinResolver, f.papeles.texto, f.motivos.join(', ')])]
}

// --- Piezas de la pantalla ------------------------------------------------------
function Barra({ partes, etiqueta }) {
  const total = partes.reduce((s, p) => s + p.valor, 0)
  return <>
    <div className="rp-bar" role="img" aria-label={etiqueta}>{total ? partes.filter(p => p.valor > 0).map(p => <div key={p.etiqueta} className={p.clase} style={{ flex: p.valor }}>{p.texto ?? numeroVE(p.valor)}</div>) : <div className="vacia">Sin registros</div>}</div>
    <div className="rp-leg">{partes.map(p => <span key={p.etiqueta}><i className={`rp-dot ${p.clase}`} />{p.etiqueta} <b>{p.leyenda ?? numeroVE(p.valor)}{p.pct && total ? ` · ${Math.round(p.valor / total * 100)} %` : ''}</b></span>)}</div>
  </>
}

function Aro({ valor, tono, texto }) {
  const c = 2 * Math.PI * 30
  const p = numeroValido(valor) ? Math.max(0, Math.min(100, valor)) / 100 : 0
  return <div className="rp-aro"><svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="30" fill="none" className="pista" strokeWidth="9" /><circle cx="36" cy="36" r="30" fill="none" className={`valor ${tono || 'neu'}`} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 36 36)" /></svg><span>{texto}</span></div>
}

function Chips({ opciones, valor, alCambiar, etiqueta }) {
  return <div role="group" aria-label={etiqueta} className="rp-chips">{opciones.map(([v, t]) => <button key={v} type="button" className={`rp-chip${valor === v ? ' on' : ''}`} aria-pressed={valor === v} onClick={() => alCambiar(v)}>{t}</button>)}</div>
}

/** Tabla con buscador, filtro «Piden atención» y «Ver todas». */
function TablaFiltrada({ titulo, detalle, accion, filas, texto, buscar: placeholder, columnas, fila, nombres = ['Todas', 'Piden atención'], vacio, sinFilas, pie, filtro, setFiltro }) {
  const [buscar, setBuscar] = useState('')
  const [todas, setTodas] = useState(false)
  const atencion = filas.filter(f => f.atencion)
  const t = buscar.trim().toLocaleLowerCase('es')
  const visibles = (filtro === 'atencion' ? atencion : filas).filter(f => !t || texto(f).toLocaleLowerCase('es').includes(t))
  const mostradas = todas ? visibles : visibles.slice(0, PAGINA)
  return <section className="rp-card rp-tabla-card" id="rp-tabla">
    <div className="rp-hd"><div><h2 className="rp-st">{titulo}</h2><span className="rp-hint">{detalle}</span></div>{accion}</div>
    <div className="rp-controles">
      <Buscador valor={buscar} alCambiar={v => { setBuscar(v); setTodas(false) }} placeholder={placeholder} />
      <Chips etiqueta="Qué filas ver" valor={filtro} alCambiar={v => { setFiltro(v); setTodas(false) }} opciones={[['todas', `${nombres[0]} · ${filas.length}`], ['atencion', `${nombres[1]} · ${atencion.length}`]]} />
    </div>
    {mostradas.length ? <div className="rp-tabla-wrap"><table className="rp-tb"><thead><tr>{columnas.map(([c, num]) => <th key={c} className={num ? 'nr' : undefined}>{c}</th>)}</tr></thead><tbody>{mostradas.map(fila)}</tbody></table></div>
      : !filas.length ? <Vacio compacto icono="reporte" titulo="Sin datos en este período" texto={sinFilas} />
      : <Vacio compacto icono="buscar" titulo={filtro === 'atencion' && !t ? 'Nada pide atención' : 'Sin coincidencias'} texto={filtro === 'atencion' && !t ? vacio : 'Prueba otro nombre o placa.'} />}
    <div className="rp-hd rp-pie">
      <span className="rp-hint">{mostradas.length} de {visibles.length}{pie ? ` · ${pie}` : ''}</span>
      {visibles.length > PAGINA && <button type="button" className="rp-link" onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : `Ver las ${visibles.length} →`}</button>}
    </div>
  </section>
}

// --- Pestañas -------------------------------------------------------------------
function PestanaVehiculos({ m, csv, filtro, setFiltro }) {
  const { act } = m
  return <div className="rp-cuerpo">
    <TablaFiltrada titulo="Por unidad" detalle="Eventos y ODT del período; estado, índice y papeles de ahora." filas={m.filasU} filtro={filtro} setFiltro={setFiltro}
      accion={<button type="button" className="rp-link rp-con-ico" onClick={csv}><Ico n="descargar" tam={16} />Descargar tabla (CSV)</button>}
      texto={f => `${f.v.alias} ${f.v.placa} ${f.v.marca} ${f.v.modelo} ${f.v.conductorNombre}`} buscar="Buscar unidad o placa" pie="primero las que piden atención"
      vacio="Ninguna unidad tiene índice bajo, papeles vencidos, ODT sin resolver ni falta de conductor." sinFilas="No hay unidades en este alcance."
      columnas={[['Unidad'], ['Conductor'], ['Estado ahora'], ['Índice', 1], ['Eventos', 1], ['ODT', 1], ['Sin resolver', 1], ['Papeles']]}
      fila={f => <tr key={f.id}>
        <td><Link className="rp-fila-link" to={`/panel/flota/${f.v.id}`}><b>{f.v.alias} · {f.v.placa || '—'}</b></Link><span className="s">{[f.v.marca, f.v.modelo, f.v.anio].filter(x => x && x !== '—').join(' ') || '—'}</span></td>
        <td>{f.v.conductorPrincipalId ? f.v.conductorNombre : <span className="c-bad b">Sin conductor</span>}<span className="s">{f.v.areaNombre || 'Sin área'}</span></td>
        <td><Etiqueta tono={f.v.estadoMarcha === 'en_marcha' ? 'info' : null}>{f.v.estadoMarcha === 'en_marcha' ? 'En marcha' : f.v.estadoMarcha === 'parada' ? 'Detenida' : 'Sin dato'}</Etiqueta></td>
        <td className={`nr b c-${tonoIndice(f.v.indiceSeguro) || 'none'}`}>{numeroValido(f.v.indiceSeguro) ? f.v.indiceSeguro : '—'}</td>
        <td className="nr">{f.eventos}</td><td className="nr">{f.odts}</td>
        <td className={`nr${f.sinResolver ? ' b c-warn' : ''}`}>{f.sinResolver}</td>
        <td><Etiqueta tono={TONO_PAPELES[f.papeles.estado]}>{f.papeles.texto}</Etiqueta></td>
      </tr>} />
    <div className="rp-lado">
      {/* Marcha y ODT por estado están en el tablero (T-88); aquí queda lo que el tablero no da. */}
      <section className="rp-card rp-col">
        <div className="rp-hd"><h2 className="rp-st">Costo y tiempo de las ODT</h2><Link className="rp-link" to="/panel/mantenimiento">Ver detalle →</Link></div>
        <div className="rp-par rp-sin-linea"><span className="rp-lbl">Costo en ODT resueltas</span><b>{dineroVE(act.costoResueltas)}</b></div>
        <span className="rp-hint">{act.conCosto} de {act.resueltas} resueltas con costo registrado.</span>
        <div className="rp-par rp-linea"><span className="rp-lbl">Tiempo promedio para resolver</span><b>{duracionHoras(act.resolucionHoras)}</b></div>
      </section>
    </div>
  </div>
}

function PestanaUsuarios({ m, csv, filtro, setFiltro }) {
  const { act, vista } = m
  const maxEv = act.eventosPorClave[0]?.valor || 1
  return <div className="rp-cuerpo">
    <TablaFiltrada titulo="Por persona" detalle="Km, ODT y eventos de cada conductor en el período." filas={m.filasP} filtro={filtro} setFiltro={setFiltro} nombres={['Todos', 'Piden atención']}
      accion={<button type="button" className="rp-link rp-con-ico" onClick={csv}><Ico n="descargar" tam={16} />Descargar tabla (CSV)</button>}
      texto={p => `${p.nombre} ${p.unidad || ''}`} buscar="Buscar persona o unidad" pie="el conductor sale del titular asignado a cada unidad"
      vacio="Nadie tiene papeles vencidos o por vencer, índice bajo ni demasiados eventos." sinFilas="No hay conductores en este alcance."
      columnas={[['Persona'], ['Unidad'], ['Km', 1], ['ODT', 1], ['Exc · Fren · Acel', 1], ['Eventos / 100 km', 1], ['Índice', 1], ['Papeles']]}
      fila={p => <tr key={p.id}>
        <td><Link className="rp-fila-link" to={`/panel/personal/${p.id}`}><b>{p.nombre}</b></Link><span className="s">{p.area || '—'}</span></td>
        <td>{p.unidad || <span className="rp-hint">Sin unidad</span>}</td>
        <td className="nr">{p.km == null ? '—' : numeroVE(Math.round(p.km))}</td>
        <td className="nr">{p.odts ?? '—'}</td>
        <td className="nr">{p.desglose ? `${p.desglose.excesos} · ${p.desglose.frenadas} · ${p.desglose.aceleraciones}` : '—'}</td>
        <td className={`nr b c-${tonoScore(p.eventosPor100) || 'none'}`}>{n2(p.eventosPor100)}</td>
        <td className={`nr b c-${p.indice == null ? 'none' : TONO_MANEJO_REPORTE[tonoManejo({ indice: p.indice, rating: p.rating })]}`}>{p.indice == null ? '—' : etiquetaManejo({ indice: p.indice, rating: p.rating })}</td>
        <td><Etiqueta tono={TONO_PAPELES[p.papeles.estado]}>{p.papeles.texto}</Etiqueta></td>
      </tr>} />
    <div className="rp-lado">
      <section className="rp-card rp-col">
        <div className="rp-hd"><h2 className="rp-st">Seguridad</h2><Etiqueta tono="info">Ahora</Etiqueta></div>
        <div className="rp-aros">
          <div><Aro valor={vista.identificacion} tono="azul" texto={vista.identificacion == null ? '—' : `${vista.identificacion} %`} /><b>Identificación de conductores</b><span className="rp-hint">{vista.conConductor} de {vista.total} unidades</span></div>
          <div><Aro valor={vista.indice} tono={tonoIndice(vista.indice)} texto={vista.indice ?? '—'} /><b>Índice de manejo seguro</b><span className="rp-hint">{vista.indice == null ? 'Sin dato completo' : `sobre 100 · ${resultadoDe(tonoIndice(vista.indice))}`}</span></div>
        </div>
        <div className="rp-umbrales"><Etiqueta tono="ok">85 o más</Etiqueta><Etiqueta tono="warn">70 a 84</Etiqueta><Etiqueta tono="bad">Menos de 70</Etiqueta></div>
      </section>
      <section className="rp-card rp-col">
        <div className="rp-hd"><h2 className="rp-st">Eventos del período</h2><b className="rp-num">{numeroVE(act.eventos)}</b></div>
        {act.eventosPorClave.length ? <ul className="rp-barras">{act.eventosPorClave.map(e => <li key={e.clave}><div><span>{e.nombre}</span><b>{e.valor}</b></div><div className="pista"><div style={{ width: `${e.valor / maxEv * 100}%` }} /></div></li>)}</ul> : <span className="rp-hint">Sin eventos de alerta en el período.</span>}
        <span className="rp-hint rp-abajo">{act.km != null ? `En ${kmVE(act.km)}: ${n2(act.eventosPor100)} eventos de manejo por cada 100 km.` : 'Sin km del período no se calculan eventos por cada 100 km.'}</span>
      </section>
    </div>
  </div>
}

function PestanaCostos({ m, csv, filtro, setFiltro }) {
  const { act } = m
  const filas = m.filasU.filter(f => f.resueltas > 0).map(f => ({ ...f, atencion: f.conCosto < f.resueltas }))
  return <div className="rp-cuerpo">
    {/* «Gasto por categoría» está en el tablero (T-88); el CSV (categorías y unidades) sigue en la tabla. */}
    <div className="rp-principal">
      <TablaFiltrada titulo="Costo registrado en ODT por unidad" detalle="Unidades con ODT resueltas en el período. El servidor no reparte los gastos por unidad." filas={filas} filtro={filtro} setFiltro={setFiltro}
        accion={<button type="button" className="rp-link rp-con-ico" onClick={csv}><Ico n="descargar" tam={16} />Descargar tabla (CSV)</button>}
        texto={f => `${f.v.alias} ${f.v.placa}`} buscar="Buscar unidad o placa" vacio="Todas las ODT resueltas tienen su costo registrado." sinFilas="No se resolvieron ODT en el período."
        columnas={[['Unidad'], ['ODT resueltas', 1], ['Con costo', 1], ['Costo registrado', 1]]}
        fila={f => <tr key={f.id}>
          <td><b>{f.v.alias} · {f.v.placa || '—'}</b><span className="s">{f.v.areaNombre || 'Sin área'}</span></td>
          <td className="nr">{f.resueltas}</td><td className={`nr${f.atencion ? ' b c-warn' : ''}`}>{f.conCosto}</td><td className="nr b">{f.costo == null ? 'Sin costo' : dineroVE(f.costo)}</td>
        </tr>} />
    </div>
    <div className="rp-lado">
      <section className="rp-card rp-col">
        <div className="rp-hd"><h2 className="rp-st">Productos y servicios</h2></div>
        {act.gasto ? <Barra etiqueta={`Productos ${dineroVE(act.productos)} y servicios ${dineroVE(act.servicios)}`} partes={[{ etiqueta: 'Productos', valor: Math.round(act.productos), texto: `${Math.round(act.productos / act.gasto * 100)} %`, leyenda: dineroVE(act.productos), clase: 'azul' }, { etiqueta: 'Servicios', valor: Math.round(act.servicios), texto: `${Math.round(act.servicios / act.gasto * 100)} %`, leyenda: dineroVE(act.servicios), clase: 'gris' }]} /> : <span className="rp-hint">Sin dato de costos del período.</span>}
        <span className="rp-hint">Productos: combustible, repuestos, neumáticos y lubricantes. Servicios: mano de obra, mantenimiento, peajes y seguros.</span>
      </section>
      <section className="rp-card rp-col">
        <div className="rp-hd"><h2 className="rp-st">Costo en ODT resueltas</h2><Link className="rp-link" to="/panel/mantenimiento">Ver →</Link></div>
        <b className="rp-grande">{dineroVE(act.costoResueltas)}</b>
        <span className="rp-hint">{act.conCosto} de {act.resueltas} resueltas con costo. Es parte del gasto, no el gasto total de la flota.</span>
      </section>
    </div>
  </div>
}

function PestanaEstadistico({ m, ant, csv, filtro, setFiltro }) {
  const { act, vista } = m
  const filas = (act.manejo || []).map(x => ({ ...x, unidad: m.filasP.find(p => p.id === x.id)?.unidad || null, atencion: x.eventosPor100 != null && x.eventosPor100 >= 1.5 })).sort(porScore)
  const tonoId = vista.identificacion == null ? null : vista.identificacion >= 85 ? 'ok' : vista.identificacion >= 70 ? 'warn' : 'bad'
  const indicadores = [
    ['Score de conducción', 'Eventos ÷ km × 100', n2(act.eventosPor100), 'menor a 1,5', tonoScore(act.eventosPor100), ant.eventosPor100 == null ? 'Sin comparación' : `Antes ${n2(ant.eventosPor100)}`],
    ['Identificación de conductores', 'Unidades con conductor', porcentajeVE(vista.identificacion), '85 % o más', tonoId, 'Ahora'],
    ['Índice de manejo promedio', 'Promedio de las unidades', vista.indice == null ? '—' : `${vista.indice} / 100`, '85 o más', tonoIndice(vista.indice), 'Ahora'],
  ]
  const por100 = (x, c) => x.km > 0 ? numeroVE(x[c] / x.km * 100, 2) : '—'
  return <div className="rp-cuerpo">
    <div className="rp-principal">
      <section className="rp-card rp-col">
        <div className="rp-hd"><div><h2 className="rp-st">Indicadores de conducción</h2><span className="rp-hint">Valor del período o de ahora, con su zona.</span></div></div>
        <div className="rp-tabla-wrap"><table className="rp-tb"><thead><tr><th>Indicador</th><th className="nr">Valor</th><th>Óptimo</th><th>Resultado</th><th className="nr">Referencia</th></tr></thead>
          <tbody>{indicadores.map(([t, como, valor, optimo, tono, ref]) => <tr key={t}><td><b>{t}</b><span className="s">{como}</span></td><td className={`nr b c-${tono || 'none'}`}>{valor}</td><td>{optimo}</td><td><Etiqueta tono={tono}>{resultadoDe(tono)}</Etiqueta></td><td className="nr rp-hint">{ref}</td></tr>)}</tbody></table></div>
      </section>
      <TablaFiltrada titulo="Distancias y eventos por conductor" detalle="Acel., Fren. y Exc. por cada 100 km recorridos en el período." filas={filas} filtro={filtro} setFiltro={setFiltro} nombres={['Todos', 'Piden atención']}
        accion={<button type="button" className="rp-link rp-con-ico" onClick={csv}><Ico n="descargar" tam={16} />Descargar tabla (CSV)</button>}
        texto={x => `${x.nombre} ${x.unidad || ''}`} buscar="Buscar conductor" pie="primero el score más alto" vacio="Ningún conductor pasa de 1,5 eventos por cada 100 km." sinFilas="El servidor no entregó km ni eventos de manejo para este período: el score por conductor no se califica."
        columnas={[['Conductor'], ['Unidad'], ['Km', 1], ['Acel.', 1], ['Fren.', 1], ['Exc.', 1], ['Score', 1]]}
        fila={x => <tr key={x.id}><td><b>{x.nombre}</b></td><td>{x.unidad || '—'}</td><td className="nr">{numeroVE(Math.round(x.km))}</td><td className="nr">{por100(x, 'aceleraciones')}</td><td className="nr">{por100(x, 'frenadas')}</td><td className="nr">{por100(x, 'excesos')}</td><td className={`nr b c-${tonoScore(x.eventosPor100) || 'none'}`}>{n2(x.eventosPor100)}</td></tr>} />
    </div>
    <div className="rp-lado">
      {/* «Eventos de alerta» por tipo y su «antes» están en el tablero (T-88). */}
      <section className="rp-card rp-col">
        <div className="rp-hd"><h2 className="rp-st">Cómo se califica</h2></div>
        <div className="rp-umbrales col"><span><Etiqueta tono="ok">Conforme</Etiqueta> menos de 1,5 eventos / 100 km</span><span><Etiqueta tono="warn">Alerta</Etiqueta> de 1,5 a 3,49</span><span><Etiqueta tono="bad">Atención</Etiqueta> 3,5 o más</span></div>
        <span className="rp-hint">Sin km no se califica: «—» no es cero.</span>
      </section>
    </div>
  </div>
}

// --- Período y alcance -------------------------------------------------------------
function PeriodoControl({ periodoSel, setPeriodoSel, meses, id }) {
  const personalizado = periodoSel.tipo === 'personalizado'
  const cambiar = (campo, valor) => setPeriodoSel({ ...periodoSel, tipo: 'personalizado', [campo]: valor })
  return <div className="rp-grupo">
    <p className="rp-ov" id={`${id}-per`}>Período</p>
    <div className="rp-seg" role="group" aria-labelledby={`${id}-per`}>
      <button type="button" className={personalizado ? '' : 'on'} aria-pressed={!personalizado} onClick={() => setPeriodoSel({ ...periodoSel, tipo: 'mes' })}>Mes actual</button>
      <button type="button" className={personalizado ? 'on' : ''} aria-pressed={personalizado} onClick={() => setPeriodoSel({ ...periodoSel, tipo: 'personalizado' })}>Personalizado</button>
    </div>
    {personalizado && <div className="rp-meses">
      <label>Desde<select className="pnl-select" value={periodoSel.desdeMes} onChange={e => cambiar('desdeMes', e.target.value)}>{meses.map(x => <option key={x.clave} value={x.clave}>{x.etiqueta}</option>)}</select></label>
      <label>Hasta<select className="pnl-select" value={periodoSel.hastaMes} onChange={e => cambiar('hastaMes', e.target.value)}>{meses.map(x => <option key={x.clave} value={x.clave}>{x.etiqueta}</option>)}</select></label>
    </div>}
  </div>
}

function AlcanceControl({ alcance, setAlcance, areas, bloqueado, sobrePersonas, alElegir, id, vertical = false }) {
  const opciones = [['empresa', 'Toda la empresa', 'empresa'], ['area', 'Un área', 'vehiculos'], ['elegidos', 'Los que yo elija', 'check']]
  const actual = bloqueado ? 'empresa' : alcance.tipo
  const elegidos = (sobrePersonas ? alcance.personas : alcance.vehiculos) || []
  return <div className="rp-grupo">
    <p className="rp-ov" id={`${id}-alc`}>Alcance</p>
    <div role="radiogroup" aria-labelledby={`${id}-alc`} className={`rp-alcances${vertical ? ' vertical' : ''}`}>
      {opciones.map(([v, t, ico]) => <button key={v} type="button" role="radio" aria-checked={actual === v} disabled={bloqueado && v !== 'empresa'} className={`rp-fw${actual === v ? ' on' : ''}`}
        onClick={() => { if (v === 'elegidos' && !elegidos.length) { alElegir(); return } setAlcance({ ...alcance, tipo: v, areaId: v === 'area' ? alcance.areaId || areas[0]?.id || '' : alcance.areaId }) }}>
        <span className="rp-fai"><Ico n={ico} /></span>{t}<span className="rp-rd">{actual === v && <i />}</span>
      </button>)}
    </div>
    {!bloqueado && actual === 'area' && <label className="rp-area">Área<select className="pnl-select" value={alcance.areaId || ''} onChange={e => setAlcance({ ...alcance, areaId: e.target.value })}>{areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label>}
    {!bloqueado && actual === 'elegidos' && <button type="button" className="rp-link" onClick={alElegir}>{elegidos.length ? `${elegidos.length} ${sobrePersonas ? 'personas elegidas' : 'unidades elegidas'} · Cambiar` : 'Elegir'}</button>}
  </div>
}

function ElegirModal({ abierto, alCerrar, sobrePersonas, d, alcance, setAlcance }) {
  const [buscar, setBuscar] = useState('')
  const campo = sobrePersonas ? 'personas' : 'vehiculos'
  const lista = (sobrePersonas ? d?.conductores : d?.vehiculos) || []
  const elegidos = new Set(alcance[campo] || [])
  const t = buscar.trim().toLocaleLowerCase('es')
  const visibles = lista.filter(x => !t || `${x.nombre || ''} ${x.alias || ''} ${x.placa || ''}`.toLocaleLowerCase('es').includes(t))
  const fijar = ids => setAlcance({ ...alcance, tipo: 'elegidos', [campo]: [...ids] })
  const alternar = id => { const s = new Set(elegidos); if (s.has(id)) s.delete(id); else s.add(id); fijar(s) }
  return <Modal titulo={sobrePersonas ? 'Elige las personas' : 'Elige las unidades'} abierto={abierto} alCerrar={alCerrar} ancho={560}>
    <div className="rp-elegir">
      <Buscador valor={buscar} alCambiar={setBuscar} placeholder={sobrePersonas ? 'Buscar persona' : 'Buscar unidad o placa'} />
      <div className="rp-hd"><span className="rp-hint">{elegidos.size} de {lista.length} elegidas</span><span className="rp-acciones-txt"><button type="button" className="rp-link" onClick={() => fijar(new Set([...elegidos, ...visibles.map(x => x.id)]))}>Marcar las visibles</button><button type="button" className="rp-link" onClick={() => fijar(new Set())}>Quitar todas</button></span></div>
      <ul className="rp-lista-elegir">{visibles.map(x => <li key={x.id}><label><input type="checkbox" checked={elegidos.has(x.id)} onChange={() => alternar(x.id)} /><span><b>{sobrePersonas ? x.nombre : `${x.alias} · ${x.placa || '—'}`}</b><small>{sobrePersonas ? (x.unidadNombre || 'Sin unidad') : (x.areaNombre || 'Sin área')}</small></span></label></li>)}</ul>
      <div className="rp-hd"><span /><button type="button" className="rp-btn" onClick={alCerrar} disabled={!elegidos.size}>Listo</button></div>
    </div>
  </Modal>
}

// --- Pantalla ------------------------------------------------------------------------
export default function Reportes() {
  const [parametros, setParametros] = useSearchParams()
  const pedida = parametros.get('vista')
  const vista = FORMATOS.some(x => x.id === pedida) ? pedida : VISTA_ANTIGUA[pedida] || 'vehiculos'
  const [periodoSel, setPeriodoSel] = useState(() => ({ tipo: 'mes', ...rangoPorDefecto() }))
  const [alcance, setAlcance] = useState(EMPRESA)
  const [filtros, setFiltros] = useState({})
  const [ventana, setVentana] = useState(null)
  // La ventana del PDF tiene su propio período y alcance: cambiarlos ahí no toca la pantalla de atrás (como en la app).
  const [formatoPdf, setFormatoPdf] = useState('vehiculos')
  const [periodoPdf, setPeriodoPdf] = useState(null)
  const [alcancePdf, setAlcancePdf] = useState(EMPRESA)
  const [hoja, setHoja] = useState(0)
  const [eligiendo, setEligiendo] = useState(false)
  const [imprimir, setImprimir] = useState(null)
  const [aviso, setAviso] = useState('')
  const sesion = useSesion()
  const empresa = sesion?.perfil?.empresa || 'Tu empresa'
  const autor = { nombre: sesion?.perfil?.nombre || 'Usuario de FOM', cargo: sesion?.perfil?.rolNombre || 'Supervisor' }
  const meses = useMemo(() => mesesDisponibles(), [])
  const areas = useDatos(() => repo.areas(), [])
  const listaAreas = areas.datos || []
  const clavePeriodo = claveDe(periodoSel)

  const carga = useDatos(() => cargarReporte(periodoSel), [clavePeriodo])
  // Si en la ventana se elige otro período, se pide aparte; si es el de la pantalla, se reutiliza lo ya cargado.
  const propio = !!ventana && !!periodoPdf && claveDe(periodoPdf) !== clavePeriodo
  const cargaPdf = useDatos(() => (propio ? cargarReporte(periodoPdf) : null), [propio ? claveDe(periodoPdf) : ''])

  const d = carga.datos
  const falta = nombre => !!d?.faltantes.some(x => x.nombre === nombre)
  const formato = formatoPorId(vista)
  const nombre = d ? nombrarPeriodo(d.periodo) : null
  const alcanceDe = (f, a = alcance) => (f === 'costos' || f === 'completo' ? EMPRESA : a)
  const textoAlcance = (a, f) => a.tipo === 'area' ? listaAreas.find(x => x.id === a.areaId)?.nombre || 'Un área' : a.tipo === 'elegidos' ? `${((f === 'usuarios' ? a.personas : a.vehiculos) || []).length} ${f === 'usuarios' ? 'personas elegidas' : 'unidades elegidas'}` : 'Toda la empresa'
  const m = useMemo(() => d ? armarModelo(d, d.periodo, alcanceDe(vista), vista) : null, [d, alcance, vista]) // eslint-disable-line react-hooks/exhaustive-deps
  const tablero = useMemo(() => m ? tableroDe(vista, m, d.periodo, nombre) : null, [m]) // eslint-disable-line react-hooks/exhaustive-deps
  const listo = carga.estado === 'ok' && !falta('Vehículos') && (d?.vehiculos.length ?? 0) > 0 && m?.alcance.unidades.length > 0

  // Datos de la ventana: los de su período cuando llegan; mientras tanto sigue la hoja que se veía.
  const listaPdf = propio && cargaPdf.estado !== 'cargando' && cargaPdf.datos?.sel === claveDe(periodoPdf)
  const dV = !propio ? d : listaPdf ? cargaPdf.datos : cargaPdf.datos || d
  const errorPdf = propio && cargaPdf.estado === 'error'
  const actualizando = propio && !listaPdf && !errorPdf

  // El documento del PDF: con el formato, el período y el alcance elegidos en la ventana.
  const doc = useMemo(() => {
    if (!dV || !ventana) return null
    const base = formatoPdf === 'completo' ? 'vehiculos' : formatoPdf
    const a = alcanceDe(formatoPdf, alcancePdf)
    const mm = armarModelo(dV, dV.periodo, a, base)
    const nom = nombrarPeriodo(dV.periodo)
    let cs = cifrasDe(base, mm)
    if (formatoPdf === 'completo') {
      const cc = cifrasDe('costos', mm)
      cs = [cs[0], cs[1], cc[0], cs[2]]
    }
    return { formato: formatoPdf, empresa, autor, generado: new Date(), periodo: dV.periodo, nombre: nom, alcanceTexto: textoAlcance(a, base), m: mm, cifras: cs, faltantes: dV.faltantes }
  }, [dV, ventana, formatoPdf, alcancePdf, empresa]) // eslint-disable-line react-hooks/exhaustive-deps
  const pdfListo = !!doc && !actualizando && !errorPdf && !doc.faltantes.some(x => x.nombre === 'Vehículos') && doc.m.alcance.unidades.length > 0

  useEffect(() => {
    if (!imprimir) return undefined
    const titulo = document.title
    let vivo = true
    const alTerminar = () => { document.title = titulo; setImprimir(null) }
    window.addEventListener('afterprint', alTerminar, { once: true })
    const marco = requestAnimationFrame(async () => {
      // El logo y la letra tienen que estar cargados antes de abrir el diálogo de impresión.
      await Promise.all([document.fonts?.ready, ...[...document.querySelectorAll('.inf-raiz img')].map(i => i.decode?.().catch(() => {}))])
      if (!vivo) return
      // Chrome propone el título de la página como nombre del archivo PDF.
      document.title = `${formatoPorId(imprimir.formato).titulo} · ${imprimir.empresa} · ${imprimir.nombre.corto}`
      window.print()
    })
    return () => { vivo = false; cancelAnimationFrame(marco); window.removeEventListener('afterprint', alTerminar); document.title = titulo }
  }, [imprimir])

  const cambiarVista = id => { const s = new URLSearchParams(parametros); s.set('vista', id); setParametros(s); setAlcance(alcanceAlCambiar(alcance, vista, id)); setAviso('') }
  const abrirVentana = tipo => { setFormatoPdf(vista); setPeriodoPdf(periodoSel); setAlcancePdf(alcance); setHoja(0); setVentana(tipo); setAviso('') }
  const elegirFormatoPdf = id => { setAlcancePdf(alcanceAlCambiar(alcancePdf, formatoPdf, id)); setFormatoPdf(id); setHoja(0) }
  const nombreCsv = (f, p) => `reporte-${f}-${p.clave}-${hoyISO()}.csv`
  const descargarCsv = () => { descargar(nombreCsv(vista, d.periodo), crearCsv(filasCsv(vista, m))); setAviso('Descarga CSV iniciada. Incluye todas las filas del alcance elegido.') }
  /**
   * El navegador no sabe convertir el informe en un archivo PDF sin una
   * librería: se comparte el CSV del formato (o, si no comparte
   * archivos, las 4 cifras en una línea) y el PDF sale con «Descargar PDF».
   */
  async function compartir() {
    if (!pdfListo) return
    const base = formatoPdf === 'completo' ? 'vehiculos' : formatoPdf
    const nombreArchivo = nombreCsv(formatoPdf, doc.periodo)
    const contenido = crearCsv(filasCsv(base, doc.m))
    const titulo = `${formatoPorId(formatoPdf).titulo} · ${empresa} · ${doc.nombre.corto}`
    const texto = textoCifras(doc.cifras)
    try {
      const archivo = typeof File === 'function' ? new File([contenido], nombreArchivo, { type: 'text/csv' }) : null
      if (archivo && navigator.canShare?.({ files: [archivo] })) { await navigator.share({ files: [archivo], title: titulo, text: texto }); setAviso('Tabla del reporte compartida (CSV).'); return }
      if (navigator.share) { await navigator.share({ title: titulo, text: texto }); setAviso('Resumen compartido. Para el detalle usa «Descargar PDF» o el CSV.'); return }
    } catch (error) {
      if (error?.name === 'AbortError') return
    }
    descargar(nombreArchivo, contenido)
    setAviso('Este navegador no comparte archivos: descargamos el CSV para que lo envíes.')
  }

  const secciones = seccionesDe(formatoPdf)
  const pidePersonas = vista === 'usuarios'
  return <div className="rp-root">
    <header className="rp-cab">
      <div><h1>Reportes</h1><p>{empresa} · {textoAlcance(alcanceDe(vista), vista)}{nombre ? ` · ${nombre.largo}` : ''}</p></div>
      <div className="rp-acciones">
        <button type="button" className="rp-btn2" disabled={!listo} onClick={() => abrirVentana('compartir')}><Ico n="compartir" />Compartir</button>
        <button type="button" className="rp-btn" disabled={!listo} onClick={() => abrirVentana('pdf')}><Ico n="completo" />Generar PDF</button>
      </div>
    </header>

    <nav className="rp-riel" aria-label="Tipo de reporte">{FORMATOS.map(x => <button key={x.id} type="button" className={`rp-tw${vista === x.id ? ' on' : ''}`} aria-current={vista === x.id ? 'page' : undefined} onClick={() => cambiarVista(x.id)}>
      <span className="rp-tfi"><Ico n={x.id} tam={20} /></span>
      <span className="rp-tw-t"><span className="rp-twl">{x.nombre}</span><span className="rp-twt">{x.frase}</span></span>
      {vista === x.id && <span className="rp-chk"><Ico n="check" tam={11} /></span>}
    </button>)}</nav>

    <section className="rp-card rp-filtros" aria-label="Período y alcance del reporte">
      <PeriodoControl id="rp" periodoSel={periodoSel} setPeriodoSel={setPeriodoSel} meses={meses} />
      <div className="rp-sep" />
      <AlcanceControl id="rp" alcance={alcance} setAlcance={setAlcance} areas={listaAreas} bloqueado={vista === 'costos'} sobrePersonas={pidePersonas} alElegir={() => setEligiendo(true)} />
      <p className="rp-hint rp-filtros-nota">{vista === 'costos' ? 'Costos sale siempre de toda la empresa: el servidor no lo separa por área.' : 'Km, eventos y ODT: del período. Marcha, conductores y papeles: de ahora.'}</p>
    </section>
    {areas.estado === 'error' && <p className="rp-aviso" role="status"><Ico n="alerta" />No se pudieron cargar las áreas. <button type="button" className="rp-link" onClick={areas.recargar}>Reintentar</button></p>}
    {aviso && <p role="status" className="rp-descarga">{aviso}</p>}

    {carga.estado === 'cargando' && <Cargando filas={6} />}
    {carga.estado === 'error' && <ErrorCarga error={carga.error} onReintentar={carga.recargar} />}
    {carga.estado === 'ok' && falta('Vehículos') && <section className="rp-card"><Vacio icono="reporte" titulo="No pudimos cargar las unidades" texto="Sin la lista de vehículos no se puede armar el reporte." accion={<button type="button" className="pnl-btn" onClick={carga.recargar}>Reintentar</button>} /></section>}
    {carga.estado === 'ok' && !falta('Vehículos') && m && !m.alcance.unidades.length && <section className="rp-card"><Vacio icono="camion" titulo="No hay unidades en este alcance" texto="Elige otra área u otras unidades, o mira toda la empresa. El período se conserva." accion={<button type="button" className="pnl-btn primario" onClick={() => setAlcance(EMPRESA)}>Ver toda la empresa</button>} /></section>}

    {listo && <>
      {/* Tablero en lugar de «En pocas palabras» (T-88): cifras, gráficos, chips y fuentes. */}
      <Tablero t={tablero} faltantes={d.faltantes} ahora={d.ahora} alRecargar={carga.recargar}
        cabecera={{
          titulo: formato.titulo, comparaCon: nombre.comparaCon,
          pases: [<span key="p" className="rp-pas"><Ico n="calendario" tam={11} />{nombre.corto}</span>, <span key="a" className="rp-pas"><Ico n="usuarios" tam={11} />{textoAlcance(alcanceDe(vista), vista)}</span>],
        }}
        alVerTabla={() => { setFiltros({ ...filtros, [vista]: 'atencion' }); document.getElementById('rp-tabla')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} />

      {vista === 'vehiculos' && <PestanaVehiculos m={m} csv={descargarCsv} filtro={filtros.vehiculos || 'todas'} setFiltro={v => setFiltros({ ...filtros, vehiculos: v })} />}
      {vista === 'usuarios' && <PestanaUsuarios m={m} csv={descargarCsv} filtro={filtros.usuarios || 'todas'} setFiltro={v => setFiltros({ ...filtros, usuarios: v })} />}
      {vista === 'costos' && <PestanaCostos m={m} csv={descargarCsv} filtro={filtros.costos || 'todas'} setFiltro={v => setFiltros({ ...filtros, costos: v })} />}
      {vista === 'estadistico' && <PestanaEstadistico m={m} ant={m.ant} csv={descargarCsv} filtro={filtros.estadistico || 'todas'} setFiltro={v => setFiltros({ ...filtros, estadistico: v })} />}
    </>}

    {/* Abierta mientras no se cierre: cambiar el período recarga en silencio y no la cierra. */}
    <Modal titulo={ventana === 'compartir' ? 'Compartir reporte' : 'Generar PDF'} abierto={!!ventana && !eligiendo} alCerrar={() => setVentana(null)} ancho={1000}>
      {doc && <div className="rp-ventana">
        <section className="rp-previa" aria-labelledby="rp-previa-t" aria-busy={actualizando}>
          <p className="rp-ov az">Vista previa</p>
          <p id="rp-previa-t" className="rp-hero-t">{formatoPorId(formatoPdf).titulo}</p>
          <div className="rp-pases"><span className="rp-pas"><Ico n="calendario" tam={11} />{doc.nombre.corto}</span><span className="rp-pas"><Ico n="usuarios" tam={11} />{doc.alcanceTexto}</span><span className="rp-pas">{secciones.length} secciones</span></div>
          <VistaHoja doc={doc} indice={hoja} />
          <div className="rp-pager">
            <button type="button" className="rp-round" aria-label="Sección anterior" disabled={hoja === 0} onClick={() => setHoja(hoja - 1)}><Ico n="atras" /></button>
            <span>{secciones[Math.min(hoja, secciones.length - 1)].titulo} · {Math.min(hoja, secciones.length - 1) + 1} de {secciones.length}</span>
            <button type="button" className="rp-round" aria-label="Sección siguiente" disabled={hoja >= secciones.length - 1} onClick={() => setHoja(hoja + 1)}><Ico n="adelante" /></button>
          </div>
        </section>
        <div className="rp-opciones">
          <p className="rp-nota-azul"><b>Sale con la pestaña que estabas viendo;</b> aquí puedes cambiarla.</p>
          <section className="rp-grupo" aria-labelledby="rp-v-tipo">
            <p className="rp-ov" id="rp-v-tipo">Qué incluir</p>
            <div className="rp-tipos" role="radiogroup" aria-labelledby="rp-v-tipo">{[...FORMATOS, COMPLETO].map(x => <button key={x.id} type="button" role="radio" aria-checked={formatoPdf === x.id} className={`rp-tf${formatoPdf === x.id ? ' on' : ''}`} onClick={() => elegirFormatoPdf(x.id)}>
              <span className="rp-tfi"><Ico n={x.id} /></span><span className="rp-tfl">{x.nombre}</span>{formatoPdf === x.id && <span className="rp-chk"><Ico n="check" tam={11} /></span>}
            </button>)}</div>
            <span className="rp-hint">{formatoPorId(formatoPdf).frase}</span>
          </section>
          <PeriodoControl id="rp-v" periodoSel={periodoPdf || periodoSel} setPeriodoSel={setPeriodoPdf} meses={meses} />
          <AlcanceControl id="rp-v" vertical alcance={alcancePdf} setAlcance={setAlcancePdf} areas={listaAreas} bloqueado={formatoPdf === 'completo' || formatoPdf === 'costos'} sobrePersonas={formatoPdf === 'usuarios'} alElegir={() => setEligiendo(true)} />
          <span className="rp-hint">Reporte completo y Costos salen siempre de toda la empresa. Vehículos, Usuarios y Estadístico dejan elegir un área o las unidades y personas que tú quieras. Lo que cambies aquí no cambia la pantalla de atrás.</span>
          {actualizando && <span className="rp-hint" role="status">Actualizando el período…</span>}
          {errorPdf && <span className="rp-aviso" role="status"><Ico n="alerta" />No pudimos cargar ese período. <button type="button" className="rp-link" onClick={cargaPdf.recargar}>Reintentar</button></span>}
          {!actualizando && !errorPdf && !doc.m.alcance.unidades.length && <span className="rp-hint c-warn" role="status">No hay unidades en este alcance: elige otra área u otras unidades.</span>}
          <p className="rp-hint">«Descargar PDF» abre la impresión del navegador: elige «Guardar como PDF». «Compartir» envía la tabla del formato (CSV) por las apps del equipo; si el navegador no comparte archivos, envía el resumen o descarga el CSV.</p>
          <div className="rp-dock">
            <button type="button" className="rp-btn2" disabled={!pdfListo} onClick={compartir}><Ico n="compartir" />Compartir</button>
            <button type="button" className="rp-btn" disabled={!pdfListo} onClick={() => setImprimir(doc)}><Ico n="descargar" />Descargar PDF</button>
          </div>
        </div>
      </div>}
    </Modal>
    <ElegirModal abierto={eligiendo} alCerrar={() => setEligiendo(false)} sobrePersonas={ventana ? formatoPdf === 'usuarios' : pidePersonas} d={ventana ? dV : d} alcance={ventana ? alcancePdf : alcance} setAlcance={ventana ? setAlcancePdf : setAlcance} />
    {imprimir && <InformeImprimible doc={imprimir} />}
  </div>
}
