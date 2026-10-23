import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { useSesion } from '../useSesion'
import { esAdminFom, esGestor, etiquetaRolSesion } from '../roles'
import { salirEmpresa } from '../auth'
import {
  Cabecera, Cargando, ErrorCarga, Tarjeta, Vacio,
} from '../comp/ui'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'
import './usuarios-perfil.css'
import { useVistaTelefono } from '../comp/movil-navegacion'
import { AccionesCuentaMovil } from './AdminUsuarios'

import { PESTANAS, PestanasPerfil, MetricasPerfil, Identidad, FichaDatos, UnidadAsignada, Conduccion, Inspecciones, Documentos, ModalPerfil } from '../comp/PerfilUsuario'

export default function ExpedienteConductor() {
  const { id } = useParams()
  const [parametros, setParametros] = useSearchParams()
  const pestana = PESTANAS.some(t => t.v === parametros.get('vista')) ? parametros.get('vista') : 'datos'
  const setPestana = vista => setParametros(actual => { const siguiente = new URLSearchParams(actual); siguiente.set('vista', vista); return siguiente }, { replace: true })
  const sesion = useSesion()
  // Marca de tiempo del último guardado: sirve de disparador del aviso.
  const [guardado, setGuardado] = useState(0)

  const ficha = useDatos(() => repo.personal.obtener(id), [id])
  const flota = useDatos(() => repo.vehiculos.listar({}), [])
  const p = ficha.datos
  const puedeEditar = esGestor(sesion?.perfil) && p?.administrable !== false
  const vieneDePlataforma = parametros.get('origen') === 'plataforma' && esAdminFom(sesion?.perfil)
  const regreso = vieneDePlataforma ? '/panel/admin/plataforma' : '/panel/personal'
  const inspecciones = p?.inspecciones ?? []
  // El "Guardado" se va solo a los 2 segundos, sin dejar basura en pantalla.
  useEffect(() => {
    if (!guardado) return undefined
    const t = setTimeout(() => setGuardado(0), 2000)
    return () => clearTimeout(t)
  }, [guardado])

  const [editandoPerfil, setEditandoPerfil] = useState(false)
  // En el teléfono la lista de Usuarios no tiene el menú «⋮» (como la app): sus acciones van aquí.
  const esMovil = useVistaTelefono()

  const asignar = async (vehiculoId) => {
    if (!vehiculoId) return
    await repo.vehiculos.asignarConductor(vehiculoId, id)
    await ficha.recargar()
    setGuardado(Date.now())
  }

  const quitar = async () => {
    if (!p?.unidad) return
    await repo.vehiculos.asignarConductor(p.unidad.id, null)
    await ficha.recargar()
    setGuardado(Date.now())
  }

  // Eventos de manejo agrupados por tipo, de mayor a menor.
  const porTipo = useMemo(() => {
    const cuenta = new Map()
    if (p?.manejo) return [
      { etiqueta: 'Frenadas bruscas', valor: p.manejo.frenadas },
      { etiqueta: 'Aceleraciones bruscas', valor: p.manejo.aceleraciones },
      { etiqueta: 'Excesos de velocidad', valor: p.manejo.excesos },
    ].filter(e => Number.isFinite(e.valor))
    ;(p?.eventos ?? []).forEach((e) => cuenta.set(e.nombre, (cuenta.get(e.nombre) ?? 0) + 1))
    return [...cuenta.entries()]
      .map(([etq, valor]) => ({ etiqueta: etq, valor }))
      .sort((a, b) => b.valor - a.valor)
  }, [p])

  const unidades = useMemo(
    () => (flota.datos ?? []).filter((v) => v.id !== p?.unidad?.id),
    [flota.datos, p]
  )

  const bajada = p
    ? [etiquetaRolSesion(p.rol), p.unidad ? [p.unidad.alias, p.unidad.placa].filter(Boolean).join(' · ') : 'Sin unidad'].join(' · ')
    : 'Expediente de la persona'

  return (
    <div className="usr-perfil">
      <div className="usr-regreso">
        <Link to={regreso} className="pnl-volver" onClick={() => { if (vieneDePlataforma) salirEmpresa() }}>
          <Icono nombre="volver" tam={16} />{vieneDePlataforma ? 'Usuarios generales' : 'Usuarios'}
        </Link>
      </div>
      <Cabecera titulo={p?.nombre ?? 'Perfil de usuario'} bajada={bajada}>
        {p && puedeEditar && <button type="button" className="pnl-btn primario" onClick={() => setEditandoPerfil(true)}>
          <Icono nombre="editar" tam={16} />{p.perfilCompleto ? 'Editar datos' : 'Completar perfil'}
        </button>}
      </Cabecera>

      <div className="pnl-cuerpo">

        {ficha.estado === 'cargando' && <Cargando filas={6} />}
        {ficha.estado === 'error' && <ErrorCarga error={ficha.error} onReintentar={ficha.recargar} />}

        {ficha.estado === 'ok' && !p && (
          <Tarjeta>
            <Vacio
              icono="gente"
              titulo="No conseguimos a esta persona"
              texto="Puede que la hayan dado de baja o que el enlace esté vencido."
              accion={
                <Link to={regreso} className="pnl-btn primario" onClick={() => { if (vieneDePlataforma) salirEmpresa() }}>
                  <Icono nombre="gente" tam={16} />
                  Ver usuarios
                </Link>
              }
            />
          </Tarjeta>
        )}

        {ficha.estado === 'ok' && p && (
          <>
            <Identidad persona={p} />
            <MetricasPerfil persona={p} />

            <PestanasPerfil valor={pestana} alCambiar={setPestana} />
            <section className="usr-panel-pestana" id={`usr-panel-${pestana}`} role="tabpanel" aria-labelledby={`usr-tab-${pestana}`}>
            {pestana === 'datos' && (
              <div className="pnl-grid dos-tercios">
                <FichaDatos persona={p} />
                <UnidadAsignada
                  persona={p}
                  unidadActual={(flota.datos ?? []).find(v => v.id === p.unidad?.id) ?? p.unidad}
                  puedeEditar={puedeEditar}
                  unidades={unidades}
                  cargandoFlota={flota.estado !== 'ok'}
                  guardado={guardado > 0}
                  alAsignar={asignar}
                  alQuitar={quitar}
                />
              </div>
            )}

            {pestana === 'conduccion' && <Conduccion persona={p} porTipo={porTipo} />}
            {pestana === 'inspecciones' && <Inspecciones inspecciones={inspecciones} error={p.inspeccionesError} />}
            {pestana === 'documentos' && <Documentos persona={p} alActualizar={ficha.recargar} documentos={p.documentos ?? []} error={p.documentosError} />}
            </section>
            {/* Solo quien puede editar a la persona; la regla fina por acción es `accionesDeCuenta`. */}
            {esMovil && puedeEditar && <AccionesCuentaMovil persona={p} alCambiar={ficha.recargar} />}
          </>
        )}
      </div>
      {p && puedeEditar && editandoPerfil && (
        <ModalPerfil persona={p} alCerrar={() => setEditandoPerfil(false)} alHecho={() => { setEditandoPerfil(false); ficha.recargar() }} />
      )}
    </div>
  )
}
