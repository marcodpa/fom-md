import { Icono } from '../Iconos'

// ============================================================
// CALENDARIO DE INSPECCIONES DE UNA PERSONA
// ------------------------------------------------------------
// Un mes, día por día: si hizo la diaria, si no la hizo, o si ese día no se
// cuenta. Cada día lleva icono además del color, para leerse sin depender
// del color. Solo la diaria cuenta; el resto de inspecciones del mes se ve
// en la lista de la ficha, sin marca en el calendario.
//
// La lógica (qué día «debía» y qué día cuenta) vive aquí, sin pantalla, para
// probarla sola.
// ============================================================

/** Estado de cada día: texto, icono y tono. El orden es el de la leyenda. */
export const ESTADO_DIA = {
  hecha: { texto: 'Hecha', icono: 'check', tono: 'ok' },
  observaciones: { texto: 'Con observaciones', icono: 'editar', tono: 'aviso' },
  bloqueada: { texto: 'Bloqueada', icono: 'alerta', tono: 'malo' },
  no_hecha: { texto: 'No hecha', icono: 'cerrar', tono: 'malo' },
  pendiente: { texto: 'Hoy', icono: 'reloj', tono: 'gris' },
  libre: { texto: 'No cuenta', icono: null, tono: 'gris' },
  futuro: { texto: 'No cuenta', icono: null, tono: 'gris' },
}

// Lo peor de un día manda: si hizo dos y una salió bloqueada, el día es «Bloqueada».
const GRAVEDAD = { aprobada: 0, aprobada_con_observaciones: 1, bloqueada: 2 }
const ESTADO_DE_RESULTADO = { aprobada: 'hecha', aprobada_con_observaciones: 'observaciones', bloqueada: 'bloqueada' }

const dos = (n) => String(n).padStart(2, '0')
const isoLocal = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`

/** Fecha local (YYYY-MM-DD) de un ISO con hora o de una fecha sola. */
export function diaDe(valor) {
  if (!valor) return ''
  const s = String(valor)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s.slice(0, 10) : isoLocal(d)
}

/** «2026-10» de una fecha local. */
export const mesDe = (d = new Date()) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}`

/** Mueve un mes «YYYY-MM» hacia atrás (-1) o adelante (+1). */
export function moverMes(mes, paso) {
  const [a, m] = mes.split('-').map(Number)
  return mesDe(new Date(a, m - 1 + paso, 1))
}

/** Primer y último día del mes, en YYYY-MM-DD. */
export function limitesDelMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  return { desde: `${mes}-01`, hasta: isoLocal(new Date(a, m, 0)) }
}

/** Todos los días del mes, en YYYY-MM-DD. */
export function diasDelMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  const total = new Date(a, m, 0).getDate()
  return Array.from({ length: total }, (_, i) => `${mes}-${dos(i + 1)}`)
}

/** Día de la semana de una fecha YYYY-MM-DD: 0 domingo … 6 sábado. */
export const diaSemana = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).getDay()
}

/** «Octubre 2026». */
export function nombreDelMes(mes) {
  const [a, m] = mes.split('-').map(Number)
  const t = new Date(a, m - 1, 1).toLocaleDateString('es-VE', { month: 'long' })
  return `${t.charAt(0).toUpperCase()}${t.slice(1)} ${a}`
}

/** ¿Cuenta como diaria? Lo clasifica el servidor (`clase`); las que llegan sin clase se toman como diarias. */
const esDiaria = (i) => i.clase !== 'scheduled'

/**
 * El mes de una persona, día por día.
 *
 * La misma regla que la app (T-60), para que las dos den las mismas cifras:
 *   · Debía hacerla todos los días, de lunes a domingo, desde que tiene
 *     unidad asignada (`desde`) hasta hoy. Sin unidad, ninguno.
 *   · Un día en que la hizo cuenta siempre, aunque no tenga unidad.
 *   · Hoy no cuenta como «No hecha» mientras siga a tiempo.
 *   · Solo las diarias suman (las que llegan sin clase se toman como diarias).
 */
export function mesDeLaPersona({ mes, hoy = isoLocal(new Date()), inspecciones = [], desde = null, conUnidad = true }) {
  const inicio = desde ? diaDe(desde) : ''

  const porDia = new Map()
  for (const i of inspecciones) {
    const dia = diaDe(i.fecha || i.creadaEn)
    if (!dia.startsWith(mes)) continue
    const lista = porDia.get(dia) ?? []
    lista.push(i)
    porDia.set(dia, lista)
  }

  const totales = { debidos: 0, cumplidos: 0, hechas: 0, aprobadas: 0, observaciones: 0, bloqueadas: 0, noHechas: 0, pct: null }
  const dias = diasDelMes(mes).map((fecha) => {
    const delDia = porDia.get(fecha) ?? []
    const diarias = delDia.filter(esDiaria)
    // La que representa el día es la peor; a igual gravedad, la más reciente.
    const inspeccion = [...diarias].sort((a, b) =>
      (GRAVEDAD[b.resultado] ?? 0) - (GRAVEDAD[a.resultado] ?? 0) ||
      new Date(b.creadaEn || b.fecha || 0) - new Date(a.creadaEn || a.fecha || 0))[0] ?? null
    const debia = fecha <= hoy && (!inicio || fecha >= inicio) && conUnidad

    let estado
    if (inspeccion) estado = ESTADO_DE_RESULTADO[inspeccion.resultado] ?? 'hecha'
    else if (fecha > hoy) estado = 'futuro'
    else if (debia) estado = fecha === hoy ? 'pendiente' : 'no_hecha'
    else estado = 'libre'

    // Cuenta en el cumplimiento: los días que debía (menos hoy si aún no la hizo) y todo día en que la hizo.
    const cuenta = Boolean(inspeccion) || (debia && estado !== 'pendiente')
    if (cuenta) totales.debidos++
    if (inspeccion) {
      totales.cumplidos++
      totales.hechas++
      if (estado === 'hecha') totales.aprobadas++
      if (estado === 'observaciones') totales.observaciones++
      if (estado === 'bloqueada') totales.bloqueadas++
    }
    if (estado === 'no_hecha') totales.noHechas++
    return { fecha, estado, inspeccion, cuenta }
  })
  totales.pct = totales.debidos ? Math.round((totales.cumplidos / totales.debidos) * 100) : null
  return { dias, totales }
}

const SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const SEMANA_LARGA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

function etiquetaDia(d) {
  const [, , n] = d.fecha.split('-').map(Number)
  const nombre = SEMANA_LARGA[(diaSemana(d.fecha) + 6) % 7]
  const partes = [`${nombre} ${n}`, ESTADO_DIA[d.estado].texto]
  if (d.inspeccion) partes.push('abrir la inspección')
  return partes.join(', ')
}

/**
 * El mes en una cuadrícula de lunes a domingo, con la navegación ‹ mes › y la
 * leyenda debajo. Tocar un día con inspección la abre (`alAbrir`).
 */
export default function CalendarioInspecciones({ mes, dias, alAbrir, alCambiarMes, puedeAvanzar = true, hoy = isoLocal(new Date()) }) {
  const huecos = (diaSemana(`${mes}-01`) + 6) % 7
  return (
    <div className="insp-cal">
      <div className="insp-cal-cab">
        <button type="button" className="insp-cal-flecha" aria-label="Mes anterior" onClick={() => alCambiarMes(moverMes(mes, -1))}>
          <Icono nombre="volver" tam={18} />
        </button>
        <h3 aria-live="polite">{nombreDelMes(mes)}</h3>
        <button type="button" className="insp-cal-flecha adelante" aria-label="Mes siguiente" disabled={!puedeAvanzar} onClick={() => alCambiarMes(moverMes(mes, 1))}>
          <Icono nombre="volver" tam={18} />
        </button>
      </div>
      <div className="insp-cal-grid" role="group" aria-label={`Inspecciones diarias de ${nombreDelMes(mes)}`}>
        {SEMANA.map((s, i) => <span key={i} className="insp-cal-sem" aria-hidden="true">{s}</span>)}
        {Array.from({ length: huecos }, (_, i) => <span key={`h${i}`} aria-hidden="true" />)}
        {dias.map((d) => {
          const meta = ESTADO_DIA[d.estado]
          const contenido = <>
            <b>{Number(d.fecha.slice(8))}</b>
            {meta.icono ? <Icono nombre={meta.icono} tam={16} /> : <i className="insp-cal-raya" aria-hidden="true" />}
          </>
          const clase = `insp-cal-dia ${d.estado}${d.fecha === hoy ? ' hoy' : ''}`
          return d.inspeccion
            ? <button key={d.fecha} type="button" className={clase} aria-label={etiquetaDia(d)} title={meta.texto} onClick={() => alAbrir(d.inspeccion)}>{contenido}</button>
            : <span key={d.fecha} className={clase} role="img" aria-label={etiquetaDia(d)} title={meta.texto}>{contenido}</span>
        })}
      </div>
      <ul className="insp-cal-leyenda" aria-label="Leyenda del calendario">
        {['hecha', 'observaciones', 'bloqueada', 'no_hecha', 'pendiente', 'libre'].map((e) => (
          <li key={e} className={`insp-cal-dia ${e}`}>
            {ESTADO_DIA[e].icono ? <Icono nombre={ESTADO_DIA[e].icono} tam={14} /> : <i className="insp-cal-raya" aria-hidden="true" />}
            <span>{ESTADO_DIA[e].texto}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
