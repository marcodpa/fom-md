import { useMemo } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import { Cabecera, Cargando, Datos, ErrorCarga, Kpi, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { etiqueta } from '../datos/catalogos'

// ============================================================
// MI UNIDAD — el inicio del conductor
// ------------------------------------------------------------
// Copia la pantalla de inicio del conductor de la app (`(driver)/index`): la
// unidad que tiene asignada, cómo está, la inspección del día y lo que hay
// pendiente de mantenimiento. Nada más: un conductor no ve la flota entera,
// ni la gente, ni los reportes — eso es del panel operativo del supervisor.
//
// Reportar una falla y hacer la inspección son trabajo de campo y se hacen
// desde la app: el servidor exige rol de gestor para abrirlas desde la
// consola. Aquí se dice, en vez de ofrecer un botón que va a fallar.
// ============================================================

/**
 * Encuentra la asignación del conductor que ha entrado.
 *
 * La sesión web trae el correo y el nombre pero no el identificador, y la
 * lista de conductores trae el identificador y el nombre pero no el correo.
 * Mientras el servidor no mande el identificador en la sesión, se empareja
 * por nombre; cuando lo mande, `perfil.userId` manda y el nombre sobra.
 */
function miAsignacion(perfil, asignaciones) {
  if (!perfil) return null
  if (perfil.userId) {
    return asignaciones.find((a) => a.id === perfil.userId) ?? null
  }
  const nombre = String(perfil.nombre ?? '').trim().toLowerCase()
  if (!nombre) return null
  const mias = asignaciones.filter(
    (a) => String(a.nombre ?? '').trim().toLowerCase() === nombre,
  )
  // Dos personas con el mismo nombre en la misma empresa: mejor no adivinar
  // cuál es la unidad del que entró que enseñarle la de otro.
  return mias.length === 1 ? mias[0] : null
}

export default function MiUnidad() {
  const sesion = useSesion()
  const perfil = sesion?.perfil

  // `repo.conductores()` devuelve las asignaciones vigentes de la empresa:
  // { id, nombre, rol, vehiculoId, vehiculo, desde }.
  const asignaciones = useDatos(() => repo.conductores(), [])

  const asignacion = useMemo(
    () => miAsignacion(perfil, asignaciones.datos ?? []),
    [perfil, asignaciones.datos],
  )
  // Solo SU unidad. Listar la flota entera descargaria la posicion de todos
  // los vehiculos de la empresa para un conductor que solo necesita el suyo:
  // mas trafico, y mas de lo que le toca ver.
  const vehiculos = useDatos(
    () => (asignacion ? repo.vehiculos.obtener(asignacion.vehiculoId) : Promise.resolve(null)),
    [asignacion?.vehiculoId],
  )
  const unidad = vehiculos.datos ?? null

  const odts = useDatos(
    () => (unidad ? repo.odts.listar({}).then((l) => l.filter((o) => o.vehiculoId === unidad.id)) : Promise.resolve([])),
    [unidad?.id],
  )
  const inspecciones = useDatos(
    () => (unidad ? repo.inspecciones.listar({ vehiculoId: unidad.id }) : Promise.resolve([])),
    [unidad?.id],
  )

  const cargando =
    asignaciones.estado === 'cargando' || vehiculos.estado === 'cargando'
  const error = asignaciones.error ?? vehiculos.error
  const abiertas = (odts.datos ?? []).filter((o) => o.estado === 'abierta' || o.estado === 'en_revision')
  const hoy = f.hoyISO()
  const inspeccionHoy = (inspecciones.datos ?? []).find((i) => String(i.fecha ?? '').slice(0, 10) === hoy)

  return (
    <>
      <Cabecera
        titulo="Mi unidad"
        bajada={unidad ? `${unidad.alias} · ${unidad.placa}` : 'La unidad que tienes asignada hoy.'}
      />

      {cargando && <Cargando filas={6} />}
      {!cargando && error && <ErrorCarga onReintentar={() => { asignaciones.recargar(); vehiculos.recargar() }} error={error} />}

      {!cargando && !error && !unidad && (
        <Tarjeta>
          <Vacio
            icono="camion"
            titulo="No tienes una unidad asignada"
            texto="Cuando tu supervisor te asigne un vehículo, aquí verás su estado, la inspección del día y el mantenimiento pendiente."
          />
        </Tarjeta>
      )}

      {!cargando && !error && unidad && (
        <>
          <div className="pnl-grid k4">
            <Kpi
              titulo="Estado"
              valor={unidad.conexion === 'reportando' ? 'Reportando' : 'Sin señal'}
              icono="pin"
              tono={unidad.conexion === 'reportando' ? 'ok' : 'aviso'}
              nota={unidad.ultimoReporte ? `Última señal ${f.desde(unidad.ultimoReporte)}` : 'Sin reportes todavía'}
            />
            <Kpi
              titulo="Inspección del día"
              valor={inspeccionHoy ? etiqueta('inspeccion_resultado', inspeccionHoy.resultado) : 'Pendiente'}
              icono="check"
              tono={inspeccionHoy ? 'ok' : 'aviso'}
              nota={inspeccionHoy ? 'Registrada desde la app' : 'Se hace desde la app'}
            />
            <Kpi
              titulo="Mantenimiento"
              valor={f.numero(abiertas.length)}
              icono="llave"
              tono={abiertas.length > 0 ? 'aviso' : 'ok'}
              nota={abiertas.length > 0 ? 'Órdenes abiertas o en taller' : 'Nada pendiente'}
            />
            <Kpi
              titulo="Kilometraje"
              valor={unidad.km != null ? f.km(unidad.km) : '—'}
              icono="velocidad"
              nota={unidad.km != null ? 'Odómetro' : 'Sin registro en la base'}
            />
          </div>

          <div className="pnl-grid">
            <Tarjeta titulo="Ficha de la unidad">
              <Datos
                items={[
                  { etiqueta: 'Alias', valor: unidad.alias },
                  { etiqueta: 'Placa', valor: unidad.placa },
                  { etiqueta: 'Marca y modelo', valor: `${unidad.marca} ${unidad.modelo}`.trim() },
                  { etiqueta: 'Tu rol en la unidad', valor: asignacion.rol === 'secundario' ? 'Conductor secundario' : 'Conductor principal' },
                  { etiqueta: 'Asignada desde', valor: f.fecha(asignacion.desde) },
                ]}
              />
            </Tarjeta>

            <Tarjeta titulo="Mantenimiento y alertas">
              {abiertas.length === 0 ? (
                <Vacio
                  icono="llave"
                  titulo="Sin órdenes pendientes"
                  texto="Tu unidad no tiene fallas reportadas ni trabajos en taller."
                />
              ) : (
                <div className="pnl-filas">
                  {abiertas.map((o) => (
                    <div className="pnl-fila" key={o.id}>
                      <div className="pnl-fila-txt">
                        <b>{o.descripcion}</b>
                        <span>{o.falla ? etiqueta('tipo_falla', o.falla) : 'Sin tipo'} · {f.desde(o.creadaEn)}</span>
                      </div>
                      <Tag color={o.estado === 'en_revision' ? 'ambar' : 'azul'} plano>
                        {etiqueta('odt_estado', o.estado)}
                      </Tag>
                    </div>
                  ))}
                </div>
              )}
              {/* Se dice, en vez de ofrecer un botón que el servidor va a
                  rechazar: abrir una orden desde la consola exige rol de
                  gestor. El conductor la reporta desde la app, sobre su
                  unidad, que es como está pensado. */}
              <p className="pnl-campo-ayuda">
                Para reportar una falla o hacer la inspección del día usa la app FOM en tu teléfono.
              </p>
            </Tarjeta>
          </div>
        </>
      )}
    </>
  )
}
