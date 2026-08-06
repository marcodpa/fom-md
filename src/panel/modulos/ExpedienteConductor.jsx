import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import {
  Cabecera, Campo, Cargando, Datos, ErrorCarga, Kpi, Pestanas, Tag, Tarjeta, Vacio, Volver,
} from '../comp/ui'
import { Anillo, BarrasH } from '../comp/Grafico'
import * as f from '../datos/formato'
import { color, estadoDocumento, etiqueta } from '../datos/catalogos'
import { Icono } from '../Iconos'

const PESTANAS = [
  { v: 'datos', t: 'Datos' },
  { v: 'conduccion', t: 'Conducción' },
  { v: 'inspecciones', t: 'Inspecciones' },
  { v: 'documentos', t: 'Documentos' },
]

/** Tono de KPI a partir del semáforo del índice de manejo seguro. */
const TONO_KPI = { verde: 'ok', amarillo: 'aviso', rojo: 'malo' }

export default function ExpedienteConductor() {
  const { id } = useParams()
  const [pestana, setPestana] = useState('datos')
  // Marca de tiempo del último guardado: sirve de disparador del aviso.
  const [guardado, setGuardado] = useState(0)

  const ficha = useDatos(() => repo.personal.obtener(id), [id])
  const flota = useDatos(() => repo.vehiculos.listar({}), [])
  const p = ficha.datos

  // El "Guardado" se va solo a los 2 segundos, sin dejar basura en pantalla.
  useEffect(() => {
    if (!guardado) return undefined
    const t = setTimeout(() => setGuardado(0), 2000)
    return () => clearTimeout(t)
  }, [guardado])

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
    ? `${etiqueta('rol', p.rol)} · ${p.unidad ? `${p.unidad.alias} · ${p.unidad.placa}` : 'Sin unidad'}`
    : 'Expediente de la persona'

  return (
    <>
      <Cabecera titulo={p?.nombre ?? 'Expediente'} bajada={bajada} />

      <div className="pnl-cuerpo">
        <Volver a="/panel/personal">Personal</Volver>

        {ficha.estado === 'cargando' && <Cargando filas={6} />}
        {ficha.estado === 'error' && <ErrorCarga onReintentar={ficha.recargar} />}

        {ficha.estado === 'ok' && !p && (
          <Tarjeta>
            <Vacio
              icono="gente"
              titulo="No conseguimos a esta persona"
              texto="Puede que la hayan dado de baja o que el enlace esté vencido."
              accion={
                <Link to="/panel/personal" className="pnl-btn primario">
                  <Icono nombre="gente" tam={16} />
                  Ver el personal
                </Link>
              }
            />
          </Tarjeta>
        )}

        {ficha.estado === 'ok' && p && (
          <>
            <Identidad persona={p} />

            <div className="pnl-grid k4">
              <Kpi
                titulo="Índice de manejo seguro"
                valor={p.indiceSeguro === null || p.indiceSeguro === undefined ? 'Sin unidad' : f.numero(p.indiceSeguro)}
                icono="escudo"
                tono={p.indiceSeguro === null || p.indiceSeguro === undefined ? '' : TONO_KPI[f.rangoIndice(p.indiceSeguro)]}
                nota={
                  p.indiceSeguro === null || p.indiceSeguro === undefined
                    ? 'se calcula con la unidad asignada'
                    : 'sobre 100 puntos'
                }
              />
              <Kpi
                titulo="Eventos de manejo"
                valor={f.numero(p.eventos.length)}
                icono="alerta"
                tono={p.eventos.length > 8 ? 'aviso' : ''}
                nota="en los últimos 28 días"
              />
              <Kpi
                titulo="Inspecciones hechas"
                valor={f.numero(p.inspecciones.length)}
                icono="check"
                nota="preoperacionales firmadas"
              />
              <Kpi
                titulo="ODT reportadas"
                valor={f.numero(p.odts.length)}
                icono="llave"
                nota="órdenes que abrió esta persona"
              />
            </div>

            <Pestanas opciones={PESTANAS} valor={pestana} alCambiar={setPestana} />

            {pestana === 'datos' && (
              <div className="pnl-grid dos-tercios">
                <FichaDatos persona={p} />
                <UnidadAsignada
                  persona={p}
                  unidades={unidades}
                  cargandoFlota={flota.estado !== 'ok'}
                  guardado={guardado > 0}
                  alAsignar={asignar}
                  alQuitar={quitar}
                />
              </div>
            )}

            {pestana === 'conduccion' && <Conduccion persona={p} porTipo={porTipo} />}
            {pestana === 'inspecciones' && <Inspecciones inspecciones={p.inspecciones} />}
            {pestana === 'documentos' && <Documentos documentos={p.documentos} />}
          </>
        )}
      </div>
    </>
  )
}

function Identidad({ persona: p }) {
  return (
    <Tarjeta>
      <div className="pnl-persona">
        <i className="pnl-avatar-l">{f.iniciales(p.nombre)}</i>
        <div className="pnl-fila-txt">
          <b>{p.nombre}</b>
          <span>{p.email}</span>
          <span>
            <Icono nombre="llamar" tam={14} />
            {` ${p.telefono || 'Sin teléfono'}`}
          </span>
        </div>
        <Tag color={p.rol === 'conductor' ? 'azul' : 'gris'}>{etiqueta('rol', p.rol)}</Tag>
      </div>
    </Tarjeta>
  )
}

/** Fecha con su cuenta regresiva y el color del semáforo de documentos. */
function Vence({ iso }) {
  if (!iso) return <>Sin registro</>
  const estado = estadoDocumento(iso)
  return (
    <>
      {`${f.fecha(iso)} `}
      <Tag color={color('documento_estado', estado)} plano>{f.vencimiento(iso)}</Tag>
    </>
  )
}

function FichaDatos({ persona: p }) {
  const licencia = p.licenciaNumero
    ? `${p.licenciaNumero} · Grado ${p.licenciaCategoria}`
    : 'Sin licencia cargada'

  return (
    <Tarjeta
      titulo="Datos de la persona"
      accion={
        p.perfilCompleto ? (
          <Tag color="verde">Perfil completo</Tag>
        ) : (
          <Tag color="ambar">Perfil sin completar</Tag>
        )
      }
    >
      {!p.perfilCompleto && (
        <div className="pnl-fila aviso">
          <i className="pnl-punto off" />
          <div className="pnl-fila-txt">
            <b>Perfil sin completar</b>
            <span>
              Al entrar por primera vez a la app debe llenar su cédula, licencia y carta médica.
            </span>
          </div>
        </div>
      )}

      <Datos
        items={[
          { etiqueta: 'Nombre', valor: p.nombre },
          { etiqueta: 'Cédula', valor: p.cedula || 'Sin registro' },
          { etiqueta: 'Correo', valor: p.email },
          { etiqueta: 'Teléfono', valor: p.telefono || 'Sin registro' },
          { etiqueta: 'Dirección', valor: p.direccion || 'Sin registro' },
          { etiqueta: 'Fecha de nacimiento', valor: p.fechaNacimiento ? f.fecha(p.fechaNacimiento) : 'Sin registro' },
          { etiqueta: 'Rol', valor: etiqueta('rol', p.rol) },
          { etiqueta: 'Licencia', valor: licencia },
          { etiqueta: 'Vence la licencia', valor: <Vence iso={p.licenciaVence} /> },
          { etiqueta: 'Certificado médico', valor: <Vence iso={p.cartaMedicaVence} /> },
          { etiqueta: 'Perfil completo', valor: p.perfilCompleto ? 'Sí' : 'No' },
          { etiqueta: 'Alta en el sistema', valor: f.fecha(p.creadoEn) },
        ]}
      />
    </Tarjeta>
  )
}

function UnidadAsignada({ persona: p, unidades, cargandoFlota, guardado, alAsignar, alQuitar }) {
  return (
    <Tarjeta
      titulo="Unidad asignada"
      accion={guardado ? <Tag color="verde">Guardado</Tag> : null}
    >
      <div className="pnl-filas">
        {p.unidad ? (
          <div className="pnl-fila">
            <i className="pnl-punto on" />
            <div className="pnl-fila-txt">
              <b>{p.unidad.alias}</b>
              <span>{p.unidad.placa}</span>
            </div>
            <Link to={`/panel/flota/${p.unidad.id}`} className="pnl-link">
              Ver la unidad
            </Link>
          </div>
        ) : (
          <div className="pnl-fila">
            <i className="pnl-punto off" />
            <div className="pnl-fila-txt">
              <b>Sin unidad asignada</b>
              <span>Esta persona no maneja ninguna unidad de la flota.</span>
            </div>
          </div>
        )}
      </div>

      <Campo
        etiqueta={p.unidad ? 'Cambiar de unidad' : 'Asignar una unidad'}
        ayuda="Queda como conductor principal de la unidad que elijas."
      >
        <select
          className="pnl-select"
          value=""
          disabled={cargandoFlota || unidades.length === 0}
          onChange={(e) => alAsignar(e.target.value)}
        >
          <option value="">
            {cargandoFlota ? 'Cargando la flota…' : 'Elegir una unidad…'}
          </option>
          {unidades.map((v) => (
            <option key={v.id} value={v.id}>
              {v.conductorPrincipalId
                ? `${v.alias} · ${v.placa} (la maneja ${v.conductorNombre})`
                : `${v.alias} · ${v.placa} (libre)`}
            </option>
          ))}
        </select>
      </Campo>

      {p.unidad && (
        <button type="button" className="pnl-btn sutil" onClick={alQuitar}>
          <Icono nombre="cerrar" tam={16} />
          Quitar asignación
        </button>
      )}
    </Tarjeta>
  )
}

function Conduccion({ persona: p, porTipo }) {
  const eventos = p.eventos
  const semaforo = p.indiceSeguro === null || p.indiceSeguro === undefined
    ? null
    : f.rangoIndice(p.indiceSeguro)

  if (eventos.length === 0) {
    return (
      <Tarjeta titulo="Conducción">
        <Vacio
          icono="escudo"
          titulo="Sin eventos registrados"
          texto="Este conductor no tiene eventos de manejo en los últimos 28 días."
        />
      </Tarjeta>
    )
  }

  return (
    <div className="pnl-grid">
      <div className="pnl-grid dos-tercios">
        <Tarjeta titulo="Eventos por tipo">
          <BarrasH datos={porTipo} formato={(n) => f.numero(n)} />
        </Tarjeta>

        <Tarjeta titulo="Índice de manejo seguro">
          {semaforo ? (
            <Anillo
              valor={p.indiceSeguro / 100}
              texto={f.numero(p.indiceSeguro)}
              sub="índice"
              tono={f.CLASE_SEMAFORO[semaforo]}
            />
          ) : (
            <Vacio
              icono="escudo"
              titulo="Todavía no hay índice"
              texto="El índice se calcula sobre la unidad que maneja. Asígnale una en la pestaña de Datos."
            />
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Eventos de manejo" sinCuerpo>
        <div className="pnl-tabla-wrap">
          <table className="pnl-tabla">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Severidad</th>
                <th className="num">Valor</th>
                <th>Ubicación</th>
                <th>Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((e) => (
                <tr key={e.id}>
                  <td>{e.nombre}</td>
                  <td>
                    <Tag color={color('alerta_severidad', e.severidad)}>
                      {etiqueta('alerta_severidad', e.severidad)}
                    </Tag>
                  </td>
                  <td className="num">
                    {e.clave === 'exceso_velocidad' ? f.velocidad(e.valor) : f.numero(e.valor)}
                  </td>
                  <td>{e.ubicacion}</td>
                  <td>{f.desde(e.creadaEn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  )
}

function Inspecciones({ inspecciones }) {
  if (inspecciones.length === 0) {
    return (
      <Tarjeta titulo="Inspecciones">
        <Vacio
          icono="check"
          titulo="Sin inspecciones"
          texto="Esta persona todavía no ha firmado ninguna inspección preoperacional."
        />
      </Tarjeta>
    )
  }

  return (
    <Tarjeta titulo="Inspecciones preoperacionales" sinCuerpo>
      <div className="pnl-tabla-wrap">
        <table className="pnl-tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Resultado</th>
              <th className="num">Observaciones</th>
              <th className="num">Fallas críticas</th>
            </tr>
          </thead>
          <tbody>
            {inspecciones.map((i) => (
              <tr key={i.id}>
                <td>{f.fecha(i.fecha)}</td>
                <td>
                  <Tag color={color('inspeccion_resultado', i.resultado)}>
                    {etiqueta('inspeccion_resultado', i.resultado)}
                  </Tag>
                </td>
                <td className="num">{f.numero(i.observaciones)}</td>
                <td className="num">
                  {i.fallasCriticas > 0 ? (
                    <Tag color="rojo">{f.numero(i.fallasCriticas)}</Tag>
                  ) : (
                    f.numero(0)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  )
}

function Documentos({ documentos }) {
  if (documentos.length === 0) {
    return (
      <Tarjeta titulo="Documentos">
        <Vacio
          icono="documento"
          titulo="Sin documentos cargados"
          texto="Cuando suba su licencia, su cédula o su certificado médico, van a aparecer aquí."
        />
      </Tarjeta>
    )
  }

  return (
    <Tarjeta titulo="Documentos de la persona" sinCuerpo>
      <div className="pnl-tabla-wrap">
        <table className="pnl-tabla">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Vence</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((d) => (
              <tr key={d.id}>
                <td>{d.tipo}</td>
                <td>{`${f.fecha(d.venceEn)} (${f.vencimiento(d.venceEn)})`}</td>
                <td>
                  <Tag color={color('documento_estado', d.estado)}>
                    {etiqueta('documento_estado', d.estado)}
                  </Tag>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  )
}
