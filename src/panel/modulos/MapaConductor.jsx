import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import { miAsignacion, unidadDeAsignacion } from '../datos/asignacion-conductor'
import Mapa from '../comp/Mapa'
import FichaUnidad from '../comp/FichaUnidad'
import { Cargando, ErrorCarga, Vacio } from '../comp/ui'
import { Icono } from '../Iconos'
import '../../styles/control-map.css'

/** Mismo mapa a pantalla completa, consultando solo la unidad asignada. */
export default function MapaConductor() {
  const perfil = useSesion()?.perfil
  const [fichaAbierta, setFichaAbierta] = useState(false)
  const datos = useDatos(async () => {
    const asignacion = miAsignacion(perfil, await repo.conductores())
    const unidad = asignacion?.vehiculoId ? await repo.vehiculos.obtener(asignacion.vehiculoId) : null
    return { cuenta: perfil?.userId ?? perfil?.nombre, unidad: unidadDeAsignacion(asignacion, unidad) }
  }, [perfil?.userId, perfil?.nombre, perfil?.empresaId], 15000)
  const actual = datos.datos?.cuenta === (perfil?.userId ?? perfil?.nombre)
  const unidad = actual ? datos.datos?.unidad : null
  const posicionValida = Number.isFinite(unidad?.lat) && Number.isFinite(unidad?.lng)
  const vehiculos = useMemo(() => posicionValida ? [unidad] : [], [posicionValida, unidad])
  const cargando = datos.estado === 'cargando' || !actual && datos.estado !== 'error'

  return <section className="control-map" aria-label="Mapa de mi unidad">
    <div className="control-map-canvas">
      <Mapa vehiculos={vehiculos} seleccionado={fichaAbierta ? unidad?.id : null}
        alSeleccionar={() => setFichaAbierta(true)} alto="100%" ficha={false} leyenda={false} espacioFicha />
    </div>
    <div className="control-search">
      <div className="control-search-heading"><div><h1>Mi mapa</h1><p>{unidad ? `${unidad.placa || unidad.alias} · Tu unidad asignada` : 'Ubicación de tu unidad asignada'}</p></div>
        <Link className="pnl-btn" to="/panel"><Icono nombre="camion" tam={18} />Mi unidad</Link>
      </div>
    </div>
    {(cargando || datos.estado === 'error' || !unidad || !posicionValida) && <div className="control-panel control-feedback" role="status">
      {cargando ? <Cargando filas={3} /> : datos.estado === 'error' ? <ErrorCarga onReintentar={datos.recargar} /> : <Vacio icono="pin"
        titulo={unidad ? 'Todavía no hay posición GPS' : 'No tienes una unidad asignada'}
        texto={unidad ? 'El mapa mostrará tu vehículo cuando llegue una posición válida del GPS.' : 'Pide a tu supervisor que te asigne un vehículo para verlo aquí.'} />}
    </div>}
    {fichaAbierta && unidad && <aside className="control-panel control-unit" aria-label="Mi vehículo">
      <FichaUnidad unidad={unidad} conEnlace={false} alCerrar={() => setFichaAbierta(false)} />
    </aside>}
    <div className="control-live"><i />Actualización cada 15 s<span>Solo tu unidad asignada</span></div>
  </section>
}
