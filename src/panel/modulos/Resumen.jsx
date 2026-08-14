import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Cabecera, Cargando, ErrorCarga, Kpi, Tag, Tarjeta, Vacio } from '../comp/ui'
import Mapa from '../comp/Mapa'
import { Split } from '../comp/Grafico'
import * as f from '../datos/formato'
import { color, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'

// Todo el tablero se pide de una sola vez: si algo falla, el supervisor ve un
// único error con reintento en lugar de cuatro tarjetas rotas.
function cargarTablero() {
  return Promise.all([
    repo.resumen(),
    repo.vehiculos.listar(),
    repo.odts.listar(),
    repo.alertas.listar(),
  ]).then(([resumen, vehiculos, odts, alertas]) => ({ resumen, vehiculos, odts, alertas }))
}

export default function Resumen() {
  const { datos, estado, error, recargar } = useDatos(cargarTablero, [])

  return (
    <>
      <Cabecera
        titulo="Resumen"
        bajada="Cómo va la operación de hoy, de un vistazo."
      >
        <Link to="/panel/mapa" className="pnl-btn primario">
          <Icono nombre="mapa" tam={16} />
          Centro de control
        </Link>
      </Cabecera>

      <div className="pnl-cuerpo">
        {estado === 'cargando' && <Cargando filas={6} />}
        {estado === 'error' && <ErrorCarga onReintentar={recargar} />}
        {estado === 'ok' && <Tablero {...datos} />}
      </div>
    </>
  )
}

function Tablero({ resumen: r, vehiculos, odts, alertas }) {
  const semaforo = f.CLASE_SEMAFORO[f.rangoIndice(r.indiceSeguroPromedio)]
  const tonoIndice = semaforo === 'verde' ? 'ok' : semaforo === 'ambar' ? 'aviso' : 'malo'

  const pendientes = odts.filter((o) => o.estado !== 'cerrada').slice(0, 6)
  const ultimasAlertas = alertas.slice(0, 6)
  const inspeccionesHechas = r.inspeccionesHoy

  // Con la base real, buena parte del dominio (ODT, inspecciones, documentos,
  // personal) todavía no existe y llega como `null`. Interpolar eso en una
  // frase produce "null en marcha · null detenidas". Estas dos ayudas
  // devuelven la frase solo cuando hay con qué construirla.
  const SIN_DATOS = 'Sin registro en la base todavía'
  const frase = (texto, ...valores) =>
    valores.every((v) => v !== null && v !== undefined) ? texto : SIN_DATOS

  return (
    <>
      <div className="pnl-grid k4">
        <Kpi
          titulo="Flota"
          valor={f.numero(r.totalVehiculos)}
          icono="camion"
          nota={
            r.enMarcha != null
              ? `${r.enMarcha} en marcha · ${r.detenidos} detenidas`
              : /* Sin velocidad en la base no hay marcha ni parada; lo que
                   consta es qué equipos reportan. */
                `${r.reportando ?? 0} reportando · ${r.sinSenal ?? 0} sin señal`
          }
          a="/panel/flota"
        />
        <Kpi
          titulo="ODT abiertas"
          valor={f.numero(r.odtAbiertas)}
          icono="llave"
          tono={r.odtAbiertas > 0 ? 'aviso' : 'ok'}
          nota={frase(`${r.odtEnRevision} en revisión · ${r.odtCerradas} cerradas`, r.odtEnRevision, r.odtCerradas)}
          a="/panel/mantenimiento"
        />
        <Kpi
          titulo="Alertas sin leer"
          valor={f.numero(r.alertasSinLeer)}
          icono="campana"
          tono={r.alertasSinLeer > 0 ? 'aviso' : 'ok'}
          nota={
            r.alertasSinLeer == null
              ? SIN_DATOS
              : r.alertasSinLeer > 0
                ? 'Requieren tu revisión'
                : 'Todo al día'
          }
          a="/panel/alertas"
        />
        <Kpi
          titulo="Manejo seguro"
          valor={f.numero(r.indiceSeguroPromedio)}
          icono="escudo"
          tono={tonoIndice}
          nota="100 = perfecto"
          a="/panel/reportes"
        />
      </div>

      <div className="pnl-grid k4">
        <Kpi
          titulo="Inspecciones de hoy"
          valor={inspeccionesHechas == null ? '—' : `${inspeccionesHechas} de ${r.totalVehiculos}`}
          icono="check"
          tono={r.inspeccionesPendientes > 0 ? 'aviso' : 'ok'}
          nota={
            r.inspeccionesPendientes == null
              ? SIN_DATOS
              : r.inspeccionesPendientes > 0
                ? `${r.inspeccionesPendientes} sin hacer`
                : 'Toda la flota revisada'
          }
          a="/panel/inspecciones"
        />
        <Kpi
          titulo="Unidades bloqueadas"
          valor={f.numero(r.unidadesBloqueadas)}
          icono="alerta"
          tono={r.unidadesBloqueadas > 0 ? 'malo' : 'ok'}
          nota={
            r.unidadesBloqueadas == null
              ? SIN_DATOS
              : r.unidadesBloqueadas > 0
                ? 'No deben salir a ruta'
                : 'Ninguna bloqueada'
          }
          a="/panel/inspecciones"
        />
        <Kpi
          titulo="Documentos vencidos"
          valor={f.numero(r.docsVencidos)}
          icono="documento"
          tono={r.docsVencidos > 0 ? 'malo' : 'ok'}
          nota={frase(`${r.docsPorVencer} por vencer`, r.docsPorVencer)}
          a="/panel/documentos"
        />
        <Kpi
          titulo="Sin conductor"
          valor={f.numero(r.sinConductor)}
          icono="gente"
          tono={r.sinConductor > 0 ? 'aviso' : 'ok'}
          nota={frase(`${r.conductores} conductores activos`, r.conductores)}
          a="/panel/flota"
        />
      </div>

      <Tarjeta
        titulo="Mapa en vivo"
        accion={<Link to="/panel/mapa" className="pnl-link">Ver centro de control</Link>}
        sinCuerpo
      >
        <Mapa vehiculos={vehiculos} />
      </Tarjeta>

      <div className="pnl-grid dos-tercios">
        <Tarjeta
          titulo="Órdenes de trabajo abiertas"
          accion={<Link to="/panel/mantenimiento" className="pnl-link">Ver todas</Link>}
        >
          {pendientes.length === 0 ? (
            <Vacio
              icono="llave"
              titulo="Sin órdenes pendientes"
              texto="No hay ODT abiertas ni en revisión. La flota está al día."
            />
          ) : (
            <div className="pnl-filas">
              {pendientes.map((o) => (
                <Link
                  key={o.id}
                  to="/panel/mantenimiento"
                  className={`pnl-fila${o.estado === 'abierta' ? ' aviso' : ''}`}
                >
                  <div className="pnl-fila-txt">
                    <b>{o.descripcion}</b>
                    <span>{o.vehiculoNombre}</span>
                  </div>
                  <Tag color={color('odt_estado', o.estado)}>
                    {etiqueta('odt_estado', o.estado)}
                  </Tag>
                  <em>{f.desde(o.creadaEn)}</em>
                </Link>
              ))}
            </div>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Últimas alertas"
          accion={<Link to="/panel/alertas" className="pnl-link">Ver todas</Link>}
        >
          {ultimasAlertas.length === 0 ? (
            <Vacio
              icono="campana"
              titulo="Nada que reportar"
              texto="Cuando ocurra algo en la flota lo verás aquí."
            />
          ) : (
            <div className="pnl-filas">
              {ultimasAlertas.map((n) => (
                <Link key={n.id} to="/panel/alertas" className="pnl-fila">
                  <i className={`pnl-punto ${n.leida ? 'off' : 'on'}`} />
                  <div className="pnl-fila-txt">
                    <b>{n.titulo}</b>
                    <span>{n.detalle}</span>
                  </div>
                  <em>{f.desde(n.creadaEn)}</em>
                </Link>
              ))}
            </div>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Flota por área">
        {r.porArea.length === 0 ? (
          <Vacio
            icono="pin"
            titulo="Sin áreas configuradas"
            texto="Asigna un área a las unidades para ver el reparto de la flota."
          />
        ) : (
          <div className="pnl-filas">
            {r.porArea.map((a) => (
              <div className="pnl-fila" key={a.id}>
                <div className="pnl-fila-txt">
                  <b>{a.nombre}</b>
                  <span>
                    {a.total} {a.total === 1 ? 'unidad' : 'unidades'}
                  </span>
                  <Split
                    a={a.enMarcha}
                    b={a.total - a.enMarcha}
                    etiquetaA="en marcha"
                    etiquetaB="detenidas"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>
    </>
  )
}
