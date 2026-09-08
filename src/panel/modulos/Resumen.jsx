import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Cabecera, Cargando, ErrorCarga, Tarjeta, Vacio } from '../comp/ui'
import MapaLibre from '../comp/MapaLibre'
import * as f from '../datos/formato'
import { etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'

// ============================================================
// RESUMEN — el inicio del supervisor
// ------------------------------------------------------------
// «Opción B · Mapa protagonista», elegida por Marco: el mapa ocupa casi toda
// la pantalla con las cifras del día encima; a la izquierda la lista de
// unidades (tocar una la centra en el mapa) y abajo lo que pasó hoy, en
// orden de hora.
//
// Lo que NO está: las cajas que el servidor todavía no alimenta (manejo
// seguro, unidades bloqueadas). Una caja con un guion ocupa el mejor sitio
// de la pantalla para decir «no sé»; cuando haya dato, se pone.
// ============================================================

/** Una unidad cuenta como «reportando» si mandó algo en el último cuarto de hora. */
const VIVO_MS = 15 * 60 * 1000

function cargarTablero() {
  return Promise.all([
    repo.resumen(),
    repo.vehiculos.listar(),
    repo.odts.listar(),
    repo.alertas.listar(),
    repo.inspecciones.listar(),
  ]).then(([resumen, vehiculos, odts, alertas, inspecciones]) => ({
    resumen,
    vehiculos,
    odts,
    alertas,
    inspecciones,
  }))
}

/** ¿Viva o callada? Con la hora de la última señal, no con «alguna vez reportó». */
function senalDe(v, ahora) {
  if (!v.ultimoReporte) return { viva: false, texto: 'nunca ha reportado' }
  const hace = ahora - new Date(v.ultimoReporte).getTime()
  return { viva: hace <= VIVO_MS, texto: f.desde(v.ultimoReporte) }
}

/**
 * Lo que pasó HOY, armado con lo que el servidor sí sabe: inspecciones
 * enviadas, órdenes abiertas, avisos y unidades que dejaron de reportar.
 * En orden de hora, de la mañana a ahora.
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
        tono: n.leidaEn ? 'gris' : 'azul',
        texto: n.titulo,
        detalle: n.detalle,
        a: '/panel/alertas',
      }),
    )
  vehiculos
    .filter((v) => v.ultimoReporte && esDeHoy(v.ultimoReporte) && !senalDe(v, ahora).viva)
    .forEach((v) =>
      eventos.push({
        id: `senal-${v.id}`,
        en: v.ultimoReporte,
        tono: 'malo',
        texto: `${v.alias} · ${v.placa} dejó de reportar`,
        detalle: `Última señal ${f.desde(v.ultimoReporte)}`,
        a: `/panel/flota/${v.id}`,
      }),
    )
  // Los últimos doce: el resumen es de reojo, el detalle vive en cada módulo.
  return eventos.sort((a, b) => new Date(a.en) - new Date(b.en)).slice(-12)
}

export default function Resumen() {
  // El mapa sigue algo vivo: refresco silencioso cada medio minuto.
  const { datos, estado, error, recargar } = useDatos(cargarTablero, [], 30000)
  const [seleccionado, setSeleccionado] = useState(null)

  return (
    <>
      <Cabecera titulo="Resumen" bajada="Dónde está la flota ahora y qué pasó hoy.">
        {estado === 'ok' && (
          <span className="rs-vivo">
            <i />
            Se actualiza solo cada 30 s
          </span>
        )}
      </Cabecera>

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
  const ahora = Date.now()
  const hoy = new Date()

  const unidades = useMemo(
    () =>
      vehiculos
        .map((v) => ({ ...v, senal: senalDe(v, ahora) }))
        // Las calladas primero: son las que hay que mirar.
        .sort((a, b) => Number(a.senal.viva) - Number(b.senal.viva) || a.alias.localeCompare(b.alias)),
    [vehiculos, ahora],
  )
  const reportando = unidades.filter((u) => u.senal.viva).length
  const total = unidades.length

  // Contadores del servidor. `null` es «no se sabe» y se muestra como guion,
  // nunca como cero: cero afirma algo.
  const sinInspeccion = r.inspeccionesHoy == null ? null : Math.max(0, total - r.inspeccionesHoy)
  const odtAbiertas = (r.odtAbiertas ?? 0) + (r.odtEnRevision ?? 0)
  const num = (n) => (n == null ? '—' : f.numero(n))
  const tono = (n, cero = 'ok') => (n == null ? '' : n > 0 ? 'aviso' : cero)

  const eventos = useMemo(
    () => eventosDeHoy({ vehiculos, odts, alertas, inspecciones }, hoy, ahora),
    [vehiculos, odts, alertas, inspecciones, ahora],
  )

  return (
    <div className="rs">
      <div className="rs-arriba">
        <Tarjeta
          titulo="Unidades"
          accion={<Link to="/panel/flota" className="pnl-link">{total} en total</Link>}
        >
          {unidades.length === 0 ? (
            <Vacio
              icono="camion"
              titulo="Sin unidades todavía"
              texto="Registra la primera desde Vehículos y aparecerá aquí y en el mapa."
            />
          ) : (
            <ul className="rs-unidades">
              {unidades.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className={`rs-unidad${seleccionado === u.id ? ' activa' : ''}`}
                    onClick={() => alSeleccionar(seleccionado === u.id ? null : u.id)}
                    aria-pressed={seleccionado === u.id}
                  >
                    <i className={`pnl-punto ${u.senal.viva ? 'on' : 'off'}`} />
                    <span className="rs-unidad-txt">
                      <b>
                        {u.alias} <code>{u.placa}</code>
                      </b>
                      <span>
                        {u.conductorNombre} · {`${u.marca} ${u.modelo}`.trim()}
                      </span>
                    </span>
                    <span className={`rs-unidad-senal${u.senal.viva ? ' ok' : ' malo'}`}>
                      {u.senal.viva ? 'Reportando' : 'Sin señal'}
                      <em>{u.senal.texto}</em>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="rs-pista">Toca una unidad para centrarla en el mapa y abrir su ficha.</p>
        </Tarjeta>

        <section className="rs-mapa" aria-label="Mapa de la flota">
          <MapaLibre
            vehiculos={unidades}
            seleccionado={seleccionado}
            alSeleccionar={alSeleccionar}
            alto="var(--rs-alto)"
            leyenda={false}
          />
          <Link to="/panel/mapa" className="rs-mapa-enlace">
            <Icono nombre="mapa" tam={14} />
            Centro de control
          </Link>
          <div className="pnl-cifras" aria-label="Cifras del día">
            <Cifra
              etiqueta="Reportando"
              valor={`${reportando} de ${total}`}
              tono={total === 0 ? '' : reportando === total ? 'ok' : 'aviso'}
            />
            <Cifra etiqueta="Sin inspección hoy" valor={num(sinInspeccion)} tono={tono(sinInspeccion)} />
            <Cifra etiqueta="Docs por vencer" valor={num(r.docsPorVencer)} tono={tono(r.docsPorVencer)} />
            <Cifra etiqueta="Órdenes abiertas" valor={num(odtAbiertas)} tono={tono(odtAbiertas)} />
            <Cifra etiqueta="Alertas sin leer" valor={num(r.alertasSinLeer)} tono={tono(r.alertasSinLeer)} />
          </div>
        </section>
      </div>

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
