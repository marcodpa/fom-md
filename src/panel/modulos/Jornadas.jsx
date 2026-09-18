import { useState } from 'react'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Cabecera, Cargando, Chips, ErrorCarga, Kpi, Tag, Tarjeta, Vacio } from '../comp/ui'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'

// ============================================================
// JORNADAS DE CONDUCCIÓN
// ------------------------------------------------------------
// Quién manejó qué unidad y cuándo: cada jornada empieza cuando el
// conductor entra con su PIN en la app y termina cuando cierra. Es la
// respuesta a «¿quién llevaba el carro a esa hora?».
// ============================================================

const ORIGEN = { pin: 'PIN en la app', manual: 'Manual', system: 'Sistema' }

function duracion(inicio, fin) {
  const ms = (fin ? new Date(fin) : new Date()) - new Date(inicio)
  if (!Number.isFinite(ms) || ms < 0) return '—'
  return f.duracion(Math.round(ms / 60000))
}

export default function Jornadas() {
  const [estado, setEstado] = useState('active')
  const jornadas = useDatos(() => repo.jornadas.listar({ estado }), [estado], 60000)
  const activas = useDatos(() => repo.jornadas.listar({ estado: 'active' }), [], 60000)

  return (
    <>
      <Cabecera titulo="Jornadas de conducción" bajada="Quién está al volante ahora y quién manejó cada unidad." />
      <div className="pnl-cuerpo">
        <div className="pnl-grid k3">
          <Kpi titulo="Al volante ahora" valor={activas.datos ? f.numero(activas.datos.length) : '—'} icono="gente" tono="ok" nota="Jornadas abiertas en este momento" />
          <Kpi titulo="Con este filtro" valor={jornadas.datos ? f.numero(jornadas.datos.length) : '—'} icono="reloj" nota="Últimas 100" />
          <Kpi titulo="Cómo empiezan" valor="PIN" icono="escudo" nota="El conductor se identifica en la app con su PIN" />
        </div>

        <Tarjeta titulo="Jornadas" sinCuerpo>
          <div className="pnl-card-cuerpo">
            <Chips opciones={[{ v: 'active', t: 'Abiertas' }, { v: 'ended', t: 'Cerradas' }, { v: '', t: 'Todas' }]} valor={estado} alCambiar={setEstado} />
          </div>
          {jornadas.estado === 'cargando' && <Cargando filas={5} />}
          {jornadas.estado === 'error' && <ErrorCarga onReintentar={jornadas.recargar} error={jornadas.error} />}
          {jornadas.estado === 'ok' && (jornadas.datos.length === 0 ? (
            <div className="pnl-card-cuerpo">
              <Vacio icono="reloj" titulo="Sin jornadas" texto="Cuando un conductor entre con su PIN en la app, su jornada aparecerá aquí." />
            </div>
          ) : (
            <div className="pnl-filas">
              {jornadas.datos.map((j) => (
                <div className="pnl-fila" key={j.id}>
                  <Icono nombre="gente" tam={18} />
                  <div className="pnl-fila-txt">
                    <b>{j.conductor} · {j.vehiculo}{j.placa ? ` · ${j.placa}` : ''}</b>
                    <span>
                      {j.rol === 'secundario' ? 'Conductor secundario' : 'Conductor principal'} · {ORIGEN[j.origen] ?? j.origen}
                      {' · '}desde {f.fechaHora(j.inicio)}{j.fin ? ` hasta ${f.fechaHora(j.fin)}` : ''} · {duracion(j.inicio, j.fin)}
                    </span>
                  </div>
                  <Tag color={j.estado === 'active' ? 'verde' : 'gris'}>{j.estado === 'active' ? 'Al volante' : 'Cerrada'}</Tag>
                </div>
              ))}
            </div>
          ))}
        </Tarjeta>
      </div>
    </>
  )
}
