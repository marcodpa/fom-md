import { useMemo, useState } from 'react'
import { etiquetaUnidad } from '../datos/nombreUnidad'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { HAY_API, api } from '../datos/api'
import { useDatos } from '../useDatos'
import { Cabecera, Cargando, ErrorCarga, Tarjeta, Vacio, Kpi } from '../comp/ui'
import Mapa from '../comp/Mapa'
import FichaUnidad from '../comp/FichaUnidad'
import * as f from '../datos/formato'
import { etiqueta } from '../datos/catalogos'
import { estadoSenal, msSinReportar, useMinuto, useUnidadesAlDia } from '../datos/sinSenal'
import { Icono } from '../Iconos'
import RankingManejo from '../comp/RankingManejo'
import { masNuevoPrimero } from '../datos/orden'
import { contarSinLeer, estaLeida } from './alertas-presentacion'
import { diariasHechasHoy, unidadesSinDiariaHoy } from '../datos/inspeccionesHoy'
import { useVistaTelefono } from '../comp/movil-navegacion'
import { IconoMovil } from '../comp/movil-piezas'

// ============================================================
// RESUMEN — el inicio del supervisor
// ------------------------------------------------------------
// «Opción B · Mapa protagonista», elegida por Marco: el mapa ocupa casi toda
// la pantalla con las cifras del día encima; a la izquierda la lista de
// unidades (tocar una la centra en el mapa) y abajo lo que pasó hoy, lo
// más nuevo arriba.
//
// Lo que NO está: las cajas que el servidor todavía no alimenta (manejo
// seguro, unidades bloqueadas). Una caja con un guion ocupa el mejor sitio
// de la pantalla para decir «no sé»; cuando haya dato, se pone.
// ============================================================

// Cada dato a su ritmo. Antes todo se pedía junto cada 30 s (~8 pedidos más
// todas las páginas de ODT de la historia) y el servidor limita a cada usuario.
const MEDIO_MINUTO = 30_000 // el mapa y la lista de unidades: lo que se mueve
const UN_MINUTO = 60_000 // los contadores del día
const TRES_MINUTOS = 3 * 60_000 // «Hoy, en orden»: solo enseña los últimos 12

/**
 * Los contadores del día. Conectado se pide solo `/summary`: `repo.resumen()`
 * además vuelve a pedir la flota, los conductores y las áreas, que esta
 * pantalla no usa (la flota ya llega aparte). Sin base real, la semilla.
 */
function cargarContadores() {
  return HAY_API ? api.resumenOperacion().then((r) => r ?? {}) : repo.resumen()
}

/**
 * Lo que alimenta «Hoy, en orden»: órdenes, avisos e inspecciones. De las
 * órdenes solo hacen falta las de hoy: se leen páginas hasta llegar a ayer, no
 * las ~3.000 de la historia de la empresa.
 */
function cargarEventos() {
  return Promise.all([
    repo.odts.listar({ desde: f.hoyISO() }),
    repo.alertas.listar(),
    // El día completo: la cuenta de «faltan» necesita las de la mañana, no solo las últimas 100.
    repo.inspecciones.listar({ desde: f.hoyISO(), hasta: f.hoyISO() }),
  ]).then(([odts, alertas, inspecciones]) => ({ odts, alertas, inspecciones }))
}

/**
 * Lo que pasó HOY, armado con lo que el servidor sí sabe: inspecciones
 * enviadas, órdenes abiertas, avisos y unidades que dejaron de reportar.
 * Lo más nuevo arriba (regla de Marco para toda lista con hora).
 */
function eventosDeHoy({ vehiculos, odts, alertas, inspecciones }, hoy, ahora) {
  const esDeHoy = (iso) => iso && new Date(iso).toDateString() === hoy.toDateString()
  const eventos = []
  inspecciones
    .filter((i) => esDeHoy(i.enviadaEn))
    .forEach((i) =>
      eventos.push({
        id: `insp-${i.id}`,
        en: i.enviadaEn,
        tono: i.resultado === 'ok' || i.resultado === 'aprobada' ? 'ok' : 'aviso',
        texto: `${i.vehiculoNombre} · inspección de hoy hecha por ${i.conductorNombre}`,
        detalle: etiqueta('inspeccion_resultado', i.resultado),
        a: '/panel/inspecciones',
      }),
    )
  odts
    .filter((o) => esDeHoy(o.creadaEn))
    .forEach((o) =>
      eventos.push({
        id: `odt-${o.id}`,
        en: o.creadaEn,
        tono: 'aviso',
        texto: `${o.vehiculoNombre} · se abrió una orden de trabajo`,
        detalle: o.descripcion,
        a: '/panel/mantenimiento',
      }),
    )
  alertas
    .filter((n) => esDeHoy(n.creadaEn))
    .forEach((n) =>
      eventos.push({
        id: `aviso-${n.id}`,
        en: n.creadaEn,
        tono: estaLeida(n) ? 'gris' : 'azul',
        texto: n.titulo,
        detalle: n.detalle,
        a: '/panel/alertas',
      }),
    )
  vehiculos
    .filter((v) => v.ultimoReporte && esDeHoy(v.ultimoReporte) && estadoSenal(v, ahora).clave === 'sin_senal')
    .forEach((v) =>
      eventos.push({
        id: `senal-${v.id}`,
        en: v.ultimoReporte,
        tono: 'malo',
        texto: `${etiquetaUnidad(v)} dejó de reportar`,
        detalle: estadoSenal(v, ahora).texto,
        a: `/panel/flota/${v.id}`,
      }),
    )
  // Los últimos doce: el resumen es de reojo, el detalle vive en cada módulo.
  return masNuevoPrimero(eventos, 'en').slice(0, 12)
}

export default function Resumen() {
  // El mapa sigue algo vivo: refresco silencioso cada medio minuto.
  const vehiculos = useDatos(() => repo.vehiculos.listar(), [], MEDIO_MINUTO)
  const contadores = useDatos(cargarContadores, [], UN_MINUTO)
  const eventos = useDatos(cargarEventos, [], TRES_MINUTOS)
  const [seleccionado, setSeleccionado] = useState(null)
  const esMovil = useVistaTelefono()

  // Se sigue mostrando como un solo tablero: carga hasta tener las tres
  // partes y, si una falla, se avisa como antes.
  const partes = [vehiculos, contadores, eventos]
  const fallida = partes.find((p) => p.estado === 'error')
  const estado = fallida ? 'error' : partes.some((p) => p.estado === 'cargando') ? 'cargando' : 'ok'
  const error = fallida?.error ?? null
  // Reintentar solo lo que falló, sin volver a pedir lo que ya llegó bien.
  const recargar = () => partes.filter((p) => p.estado === 'error').forEach((p) => p.recargar())
  const datos = estado === 'ok'
    ? { resumen: contadores.datos, vehiculos: vehiculos.datos, ...eventos.datos }
    : null

  const vivo = estado === 'ok' && (
    <span className="rs-vivo">
      <i />
      El mapa se actualiza cada 30 s
    </span>
  )

  return (
    <>
      {esMovil ? (
        <>
          {/* Como panel/index.tsx de la app: «Reporte» junto al título y el aviso de refresco debajo. */}
          <Cabecera titulo="Resumen" bajada="Toda tu operación, en un solo lugar.">
            <Link className="pnl-btn primario" to="/panel/reportes" aria-label="Generar un reporte">
              <IconoMovil nombre="reporte" tam={16} />
              Reporte
            </Link>
          </Cabecera>
          {vivo && <div className="rs-vivo-movil">{vivo}</div>}
        </>
      ) : (
        <Cabecera titulo="Resumen" bajada="Toda tu operación, en un solo lugar.">
          {vivo}
        </Cabecera>
      )}

      <div className="pnl-cuerpo">
        {estado === 'cargando' && <Cargando filas={6} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} error={error} />}
        {estado === 'ok' && (
          <Tablero {...datos} seleccionado={seleccionado} alSeleccionar={setSeleccionado} />
        )}
      </div>
    </>
  )
}

function Cifra({ etiqueta: k, valor, tono = '' }) {
  return (
    <div className="pnl-cifra">
      <span className="pnl-cifra-k">{k}</span>
      <span className={`pnl-cifra-v${tono ? ` ${tono}` : ''}`}>{valor}</span>
    </div>
  )
}

function Tablero({ resumen: r, vehiculos, odts, alertas, inspecciones, seleccionado, alSeleccionar }) {
  // La hora se renueva cada minuto: el «hace …» de las calladas corre solo sin pedir nada.
  const ahora = useMinuto()
  const hoy = new Date()

  // La regla única (estadoSenal, en `u.senal`): la misma señal que el mapa y la flota.
  const alDia = useUnidadesAlDia(vehiculos)
  const unidades = useMemo(
    () =>
      [...alDia]
        // Las que no reportan al día primero, la de más tiempo callada arriba: son las que hay que mirar.
        .sort((a, b) => {
          const ca = a.senal.clave !== 'reportando'
          const cb = b.senal.clave !== 'reportando'
          return Number(cb) - Number(ca) ||
            (ca ? (msSinReportar(b.ultimoReporte, ahora) - msSinReportar(a.ultimoReporte, ahora)) || 0 : 0) ||
            a.alias.localeCompare(b.alias)
        }),
    [alDia, ahora],
  )
  const total = unidades.length

  // Contadores del servidor. `null` es «no se sabe» y se muestra como guion,
  // nunca como cero: cero afirma algo.
  // Misma cuenta que «Faltan hoy» de Inspecciones: unidades con diaria, no registros restados.
  const sinInspeccion = unidadesSinDiariaHoy(vehiculos, inspecciones).length
  const conDiaria = diariasHechasHoy(vehiculos, inspecciones)
  const odtAbiertas = (r.odtAbiertas ?? 0) + (r.odtEnRevision ?? 0)
  const num = (n) => (n == null ? '—' : f.numero(n))
  const tono = (n, cero = 'ok') => (n == null ? '' : n > 0 ? 'aviso' : cero)

  const eventos = useMemo(
    () => eventosDeHoy({ vehiculos, odts, alertas, inspecciones }, hoy, ahora),
    [vehiculos, odts, alertas, inspecciones, ahora],
  )

  const seleccion = unidades.find(u => u.id === seleccionado) ?? unidades.find(u => u.lat != null) ?? unidades[0]
  // La marcha solo de las que reportan: «detenidas» no incluye a las sin señal.
  const enMarcha = unidades.filter(u => u.senal.marcha === 'en_marcha').length
  const detenidas = unidades.filter(u => u.senal.marcha === 'parada').length
  const sinReportar = total - enMarcha - detenidas

  return (
    <div className="pnl-resumen">
      <div className="pnl-resumen-metricas">
        <Link to="/panel/flota" className="pnl-flota-metrica">
          <span className="pnl-metrica-icono"><Icono nombre="camion" tam={28} /></span>
          <div><h2>Flota de vehículos</h2><strong>{total}</strong><small>vehículos</small></div>
          <div className="pnl-flota-desglose">
            <div className="pnl-flota-barra"><i style={{ '--proporcion': `${total ? enMarcha / total * 100 : 0}%` }} /></div>
            <div className="pnl-flota-leyenda">
              <span>{enMarcha} en marcha</span>
              <span>{detenidas} {detenidas === 1 ? 'detenida' : 'detenidas'}</span>
              {sinReportar > 0 && <span>{sinReportar} sin señal o sin ubicación</span>}
            </div>
          </div>
        </Link>
        <Kpi titulo="ODT por resolver" valor={odtAbiertas} icono="llave" nota={`${f.cantidad(r.odtAbiertas ?? 0, 'abierta', 'abiertas')} · ${num(r.odtEnRevision ?? 0)} en revisión`} a="/panel/mantenimiento" />
        <Kpi titulo="Alertas nuevas" valor={num(contarSinLeer(alertas))} icono="campana" nota="Pendientes de leer" a="/panel/alertas" />
      </div>
      <div className="pnl-resumen-central">
        <div className="pnl-resumen-mapa">
          <Tarjeta titulo="Vehículos en tiempo real" accion={<Link to="/panel/mapa" className="pnl-link">Ver centro de control →</Link>} sinCuerpo>
            <Mapa vehiculos={unidades} seleccionado={seleccion?.id} alSeleccionar={alSeleccionar} alto="clamp(360px, 48vh, 570px)" leyenda={false} ficha={false} />
          </Tarjeta>
        </div>
        <div className="pnl-resumen-unidad">
        <Tarjeta titulo="Vehículo seleccionado" accion={unidades.length > 0 && (
          <select className="pnl-input pnl-resumen-select" aria-label="Seleccionar vehículo" value={seleccion?.id ?? ''} onChange={e => alSeleccionar(e.target.value)}>
            {unidades.map(u => <option key={u.id} value={u.id}>{etiquetaUnidad(u)}{u.senal.clave === 'reportando' ? '' : ` — ${estadoSenal(u, ahora).texto}`}</option>)}
          </select>
        )}>
          {seleccion ? <FichaUnidad unidad={seleccion} conCabecera={false} /> : <Vacio icono="camion" titulo="Sin unidades todavía" texto="Las unidades registradas aparecerán aquí." accion={<Link className="pnl-btn" to="/panel/flota">Ver vehículos</Link>} />}
        </Tarjeta>
        </div>
      </div>
      <div className="pnl-resumen-acciones">
        <Kpi titulo="Inspecciones de hoy" valor={num(conDiaria)} icono="inspeccion" nota={f.cantidad(sinInspeccion, 'unidad pendiente', 'unidades pendientes')} a="/panel/inspecciones" />
        <Kpi titulo="Documentos por atender" valor={r.docsVencidos == null && r.docsPorVencer == null ? '—' : f.numero((r.docsVencidos ?? 0) + (r.docsPorVencer ?? 0))} icono="documento" nota={r.docsVencidos == null && r.docsPorVencer == null ? 'Revisa los próximos vencimientos' : `${f.cantidad(r.docsVencidos ?? 0, 'vencido', 'vencidos')} · ${num(r.docsPorVencer ?? 0)} por vencer`} tono={r.docsVencidos > 0 ? 'malo' : r.docsPorVencer > 0 ? 'aviso' : ''} a="/panel/documentos" />
      </div>

      <RankingManejo />

      <Tarjeta
        titulo="Hoy, en orden"
        accion={<Link to="/panel/alertas" className="pnl-link">Ver alertas</Link>}
      >
        {eventos.length === 0 ? (
          <Vacio
            icono="reloj"
            titulo="Hoy no ha pasado nada todavía"
            texto="Cuando una unidad haga su inspección, se abra una orden o deje de reportar, lo verás aquí con su hora."
          />
        ) : (
          <ol className="rs-eventos">
            {eventos.map((e) => (
              <li key={e.id}>
                <Link to={e.a} className="rs-evento">
                  <time dateTime={e.en}>{f.hora(e.en)}</time>
                  <i className={`rs-evento-punto ${e.tono}`} />
                  <b>{e.texto}</b>
                  <span>{e.detalle}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Tarjeta>
    </div>
  )
}
