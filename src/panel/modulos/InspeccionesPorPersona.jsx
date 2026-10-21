import { useEffect, useMemo, useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Barra, Buscador, Cargando, ErrorCarga, Modal, Tag, Tarjeta, Vacio } from '../comp/ui'
import Avatar from '../comp/Avatar'
import CalendarioInspecciones, { TEXTO_REGLA, diaDe, limitesDelMes, mesDeLaPersona, nombreDelMes } from '../comp/CalendarioInspecciones'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'

// ============================================================
// INSPECCIONES · HISTORIAL «POR PERSONA»
// ------------------------------------------------------------
// Los conductores de la empresa con su cumplimiento de la diaria en el mes,
// del peor al mejor. Al tocar uno se abre su ficha con el calendario y,
// debajo, sus inspecciones del mes: panel al lado en escritorio, hoja desde
// abajo en el teléfono. El mes lo elige el Historial (compartido con «Todas»).
//
// Misma regla y mismos nombres que la app (T-60): ver mesDeLaPersona.
// Una sola lectura por mes y empresa (inspecciones, gente y asignaciones)
// y el resto se filtra aquí. Nunca un pedido por día ni por persona.
// ============================================================

const TELEFONO = '(max-width: 767px)'
function useTelefono() {
  const [es, setEs] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(TELEFONO).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(TELEFONO)
    if (!mq) return undefined
    const cambio = () => setEs(mq.matches)
    mq.addEventListener('change', cambio)
    return () => mq.removeEventListener('change', cambio)
  }, [])
  return es
}

const tolerar = (promesa, porDefecto) => Promise.resolve().then(() => promesa()).catch(() => porDefecto)

async function cargarMes(mes) {
  const { desde, hasta } = limitesDelMes(mes)
  const [inspecciones, gente, asignaciones] = await Promise.all([
    repo.inspecciones.listar({ desde, hasta }),
    repo.personal.listar({}),
    tolerar(() => (typeof repo.conductores === 'function' ? repo.conductores() : []), []),
  ])
  return {
    mes,
    inspecciones,
    incompleta: Boolean(inspecciones.incompleta),
    gente,
    asignaciones: asignaciones ?? [],
  }
}

const momento = (i) => new Date(i.creadaEn || i.fecha || 0).getTime() || 0

/** Una fila por persona con su mes ya calculado. */
function armarFilas(datos, hoy) {
  const mes = datos.mes
  const { inspecciones, gente, asignaciones } = datos
  const conInspecciones = new Set(inspecciones.map((i) => i.conductorId).filter(Boolean))
  return gente
    .filter((p) => p.rol === 'conductor' || p.conduce || conInspecciones.has(p.userId ?? p.id))
    .map((p) => {
      const id = p.userId ?? p.id
      const suyas = inspecciones.filter((i) => (i.conductorId ? i.conductorId === id : i.conductorNombre === p.nombre))
      const asignacion = asignaciones.find((a) => a.id === id)
      // Desde cuándo se le cuenta: el inicio de la asignación vigente; si no se sabe, todo el mes.
      const desde = diaDe(asignacion?.desde) || null
      const unidad = p.unidadNombre && p.unidadNombre !== 'Sin unidad' ? p.unidadNombre : asignacion?.vehiculo || ''
      const conUnidad = Boolean(p.unidad || asignacion)
      const calc = mesDeLaPersona({ mes, hoy, inspecciones: suyas, desde, conUnidad })
      // Para la lista de la ficha: todas las del mes, también las que no son la diaria; la más reciente arriba.
      const delMes = suyas.filter((i) => diaDe(i.fecha || i.creadaEn).startsWith(mes)).sort((a, b) => momento(b) - momento(a))
      return { id, persona: p, nombre: p.nombre || '—', unidad, conUnidad, desde, inspecciones: delMes, ...calc }
    })
    // Del peor al mejor; los que no tienen días que contar, al final.
    .sort((a, b) => (a.totales.pct ?? 101) - (b.totales.pct ?? 101) || b.totales.noHechas - a.totales.noHechas || a.nombre.localeCompare(b.nombre))
}

const tonoDe = (pct) => (pct == null ? 'gris' : pct >= 90 ? 'ok' : pct >= 70 ? 'aviso' : 'malo')

function Cumplimiento({ totales }) {
  const { pct, cumplidos, debidos } = totales
  if (pct == null) return <span className="insp-pp-cifra gris">Sin días que contar</span>
  return <span className={`insp-pp-cifra ${tonoDe(pct)}`}>{f.numero(cumplidos)} de {f.numero(debidos)} {debidos === 1 ? 'día' : 'días'} · {pct} %</span>
}

function BarraPersona({ totales }) {
  if (totales.pct == null) return <div className="insp-pp-barra gris"><Barra valor={0} /></div>
  const tono = tonoDe(totales.pct)
  return <div className={`insp-pp-barra ${tono}`}><Barra valor={totales.pct / 100} tono={tono === 'malo' ? 'malo' : tono === 'aviso' ? 'aviso' : ''} /></div>
}

/** El mes (`mes`, «YYYY-MM») y su cambio llegan del Historial: el mismo selector sirve para «Por persona» y «Todas». */
export default function InspeccionesPorPersona({ mes, alCambiarMes, puedeAvanzar, abrirInspeccion, ocultarFicha = false }) {
  const hoy = f.hoyISO()
  const [q, setQ] = useState('')
  const [elegidoId, setElegidoId] = useState(null)
  const telefono = useTelefono()
  const datos = useDatos(() => cargarMes(mes), [mes])
  // Mientras llega otro mes se sigue viendo el anterior (sus filas salen de SU mes, no del nuevo).
  const filas = useMemo(() => (datos.datos ? armarFilas(datos.datos, hoy) : []), [datos.datos, hoy])
  const t = q.trim().toLowerCase()
  const visibles = t ? filas.filter((r) => `${r.nombre} ${r.unidad}`.toLowerCase().includes(t)) : filas
  const elegido = filas.find((r) => r.id === elegidoId) ?? null

  const ficha = elegido && <FichaPersona fila={elegido} mes={datos.datos?.mes ?? mes} hoy={hoy} cargando={datos.estado === 'cargando'} incompleta={datos.datos?.incompleta}
    alCambiarMes={alCambiarMes} puedeAvanzar={puedeAvanzar} alAbrir={abrirInspeccion} alCerrar={() => setElegidoId(null)} telefono={telefono} />

  return <div className={`insp-pp${elegido && !telefono ? ' con-ficha' : ''}`}>
    <Tarjeta titulo={`Cumplimiento de ${nombreDelMes(mes)}`} sinCuerpo>
      <p className="insp-card-hint">Del que menos cumple al que más. Toca a una persona para ver su mes día por día. {TEXTO_REGLA}</p>
      <div className="insp-pp-buscar"><Buscador valor={q} alCambiar={setQ} placeholder="Buscar persona o unidad…" /></div>
      {datos.estado === 'cargando' && !datos.datos && <Cargando filas={6} />}
      {datos.estado === 'error' && <ErrorCarga error={datos.error} onReintentar={datos.recargar} />}
      {datos.estado !== 'error' && datos.datos && (visibles.length
        ? <ul className="insp-pp-lista" aria-label="Conductores">{visibles.map((r) => (
          <li key={r.id}>
            <button type="button" className="insp-pp-fila" aria-pressed={r.id === elegidoId} onClick={() => setElegidoId(r.id)}>
              <Avatar userId={r.id} iniciales={f.iniciales(r.nombre)} nombre={r.nombre} clase="pnl-avatar insp-pp-av" tam={88} />
              <span className="insp-pp-quien"><b>{r.nombre}</b><small>{r.unidad || 'Sin unidad asignada'}</small></span>
              <span className="insp-pp-dato"><Cumplimiento totales={r.totales} /><BarraPersona totales={r.totales} /></span>
              <Icono nombre="volver" tam={16} />
            </button>
          </li>))}
        </ul>
        : <Vacio icono="buscar" titulo={t ? 'Nadie coincide con la búsqueda' : 'No hay conductores en la empresa'} texto={t ? 'Prueba con otro nombre o unidad.' : 'Cuando la empresa tenga conductores, aquí verás su cumplimiento.'} />)}
    </Tarjeta>
    {!telefono && <aside className="insp-pp-lado" aria-label="Ficha de la persona">
      {ficha || <Vacio icono="inspeccion" compacto titulo="Elige a una persona" texto="Verás su mes en un calendario, los días que hizo la diaria y los que no, y debajo sus inspecciones." />}
    </aside>}
    {telefono && elegido && !ocultarFicha && <Modal titulo={elegido.nombre} abierto alCerrar={() => setElegidoId(null)} ancho={560}>{ficha}</Modal>}
  </div>
}

function FichaPersona({ fila, mes, hoy, cargando, incompleta, alCambiarMes, puedeAvanzar, alAbrir, alCerrar, telefono }) {
  const { totales, dias, nombre, unidad, desde, conUnidad, inspecciones } = fila
  // Desde cuándo tiene la unidad: el inicio (validFrom) de su asignación vigente. La consola no da las
  // asignaciones anteriores, así que los días con una unidad previa en el mismo mes no se cuentan como debidos.
  const tieneDesde = conUnidad
    ? `Tiene la unidad ${unidad.replace(/^Unidad\s+/i, '') || 'asignada'}${desde ? ` desde el ${f.fecha(desde)}` : ''}.`
    : 'No tiene unidad asignada.'
  // La misma frase que la app (T-75): el fin de semana solo cuenta si ese día trabajó.
  const textoRegla = conUnidad
    ? `${TEXTO_REGLA}${desde ? '' : ' No se sabe desde cuándo la tiene: se cuenta desde el día 1 del mes.'}`
    : 'No tiene unidad: solo cuentan los días que la hizo.'
  return <div className="insp-ficha">
    {!telefono && <div className="insp-ficha-cab">
      <Avatar userId={fila.id} iniciales={f.iniciales(nombre)} nombre={nombre} clase="pnl-avatar insp-pp-av grande" tam={112} />
      <div><h2>{nombre}</h2><p>{unidad || 'Sin unidad asignada'}</p></div>
      <button type="button" className="insp-cal-flecha" aria-label="Cerrar ficha" onClick={alCerrar}><Icono nombre="cerrar" tam={16} /></button>
    </div>}
    {telefono && <p className="insp-ficha-unidad">{unidad || 'Sin unidad asignada'}</p>}
    <div className="insp-ficha-cumple">
      <span className="k">Cumplimiento del mes</span>
      <b className={tonoDe(totales.pct)}>{totales.pct == null ? '—' : `${totales.pct} %`}</b>
      <Cumplimiento totales={totales} />
      <BarraPersona totales={totales} />
    </div>
    {cargando ? <Cargando filas={3} /> : <CalendarioInspecciones mes={mes} dias={dias} hoy={hoy} alAbrir={alAbrir} alCambiarMes={alCambiarMes} puedeAvanzar={puedeAvanzar} />}
    <p className="insp-ficha-desde"><Icono nombre="camion" tam={16} /><span>{tieneDesde}</span></p>
    <dl className="insp-ficha-totales">
      {[['Hechas', totales.aprobadas, 'ok'], ['Con observaciones', totales.observaciones, 'aviso'], ['Bloqueadas', totales.bloqueadas, 'malo'], ['No hechas', totales.noHechas, 'malo']].map(([t, n, tono]) => (
        <div key={t} className={tono}><dt>{t}</dt><dd>{f.numero(n)}</dd></div>
      ))}
    </dl>
    {!cargando && <section className="insp-ficha-insp" aria-label={`Inspecciones de ${nombre} en ${nombreDelMes(mes)}`}>
      <h3>Inspecciones del mes <small>{f.numero(inspecciones.length)}</small></h3>
      {inspecciones.length
        ? <ul>{inspecciones.map((i) => <li key={i.id}>
          <button type="button" onClick={() => alAbrir(i)} aria-label={`Ver resultado del ${f.fechaHora(i.creadaEn || i.fecha)}`}>
            <span className="insp-ficha-insp-dato"><b>{f.fechaHora(i.creadaEn || i.fecha)}</b><small>{[i.vehiculo?.alias || i.vehiculoNombre, i.plantilla].filter(Boolean).join(' · ')}</small></span>
            <Tag color={color('inspeccion_resultado', i.resultado)}>{etiqueta('inspeccion_resultado', i.resultado)}</Tag>
            <Icono nombre="volver" tam={16} />
          </button>
        </li>)}</ul>
        : <p className="insp-ficha-nada">No registró inspecciones este mes.</p>}
    </section>}
    <p className="insp-ficha-regla"><Icono nombre="inspeccion" tam={16} /><span>{textoRegla} Hoy no cuenta como «No hecha» mientras siga a tiempo. Para el cumplimiento solo cuenta la diaria.</span></p>
    {incompleta && <p className="insp-ficha-aviso" role="status">El servidor no devolvió todo el mes: algunos días pueden faltar.</p>}
  </div>
}
