import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import repo from '../datos/repo'
import { useDatos } from '../useDatos'
import { Cabecera, Campo, Cargando, Chips, Datos, ErrorCarga, Kpi, Tag, Tarjeta, Vacio } from '../comp/ui'
import { Anillo, Barras, BarrasH, Split } from '../comp/Grafico'
import * as f from '../datos/formato'
import { etiqueta, color } from '../datos/catalogos'
import { Icono } from '../Iconos'

// La app promete "Próximamente: tendencias del período y comparativas
// visuales". Este módulo es esa promesa cumplida, más impresión y CSV.

const EMPRESA_NOMBRE = 'Transporte Lago Sur, C.A.'

const PERIODOS = [
  { v: 30, t: 'Este mes' },
  { v: 90, t: '90 días' },
  { v: 365, t: 'Año' },
]

const PERIODO_TEXTO = {
  30: 'Últimos 30 días',
  90: 'Últimos 90 días',
  365: 'Últimos 365 días',
}

const CATEGORIA_COSTO = {
  combustible: 'Combustible',
  repuestos: 'Repuestos',
  neumaticos: 'Neumáticos',
  lubricantes: 'Lubricantes',
  mano_obra: 'Mano de obra',
  preventivo: 'Mantenimiento preventivo',
  correctivo: 'Mantenimiento correctivo',
  peajes: 'Peajes',
  seguros: 'Seguros',
}

const TONO_KPI = { verde: 'ok', amarillo: 'aviso', rojo: 'malo' }
const TEXTO_SEMAFORO = { verde: 'Conforme', amarillo: 'Alerta', rojo: 'Atención' }

/** Coma decimal, como se escriben los números en Venezuela. */
function conComa(n, decimales = 2) {
  return Number(n ?? 0).toFixed(decimales).replace('.', ',')
}

/** Semáforo del porcentaje de identificación de conductores. */
function rangoIdentificacion(pct) {
  if (pct >= 85) return 'verde'
  if (pct >= 70) return 'amarillo'
  return 'rojo'
}

function Semaforo({ rango }) {
  return <Tag color={f.CLASE_SEMAFORO[rango]}>{TEXTO_SEMAFORO[rango]}</Tag>
}

/** CSV sin librerías: comillas dobladas, punto y coma y BOM para Excel. */
function descargarCsv(filas, nombre) {
  const texto = filas
    .map((fila) =>
      fila
        .map((celda) => {
          const t = String(celda ?? '')
          return /[";\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
        })
        .join(';')
    )
    .join('\r\n')
  const blob = new Blob(['\ufeff', texto], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}

export default function Reportes() {
  const navegar = useNavigate()
  const [dias, setDias] = useState(30)
  const [areaId, setAreaId] = useState('')

  const areas = useDatos(() => repo.areas(), [])
  // Seis fuentes, y NO todas existen: los costos y el histórico de eventos de
  // alerta no tienen superficie en el servidor todavía. Con `Promise.all` una
  // sola ausencia tumbaba el reporte entero y la pantalla decía «revisa tu
  // conexión» — un diagnóstico falso sobre cinco fuentes que sí respondieron.
  //
  // Se piden por separado y se tolera la falta: el reporte se arma con lo que
  // hay y DICE qué le faltó. Un informe incompleto que nombra su hueco sirve;
  // uno que se cae, no. Lo que nunca se hace es rellenar el hueco con un cero:
  // «sin datos» y «cero» son cosas distintas y se toman decisiones sobre ellas.
  const carga = useDatos(
    () => {
      const faltantes = []
      const tolerar = (nombre, promesa, vacio) =>
        promesa.catch((error) => {
          faltantes.push({ nombre, motivo: error?.message ?? 'No disponible' })
          return vacio
        })
      return Promise.all([
        tolerar('Resumen', repo.resumen(), null),
        tolerar('Vehículos', repo.vehiculos.listar({ areaId }), []),
        tolerar('Conductores', repo.personal.listar({ soloConductores: true }), []),
        tolerar('Órdenes de trabajo', repo.odts.listar({}), []),
        tolerar('Costos', repo.costos.resumen({ dias }), null),
        tolerar('Eventos de alerta', repo.alertas.eventos({ dias }), []),
      ]).then(([resumen, vehiculos, conductores, odts, costos, eventos]) => ({
        resumen,
        vehiculos,
        conductores,
        odts,
        costos,
        eventos,
        faltantes,
      }))
    },
    [areaId, dias]
  )

  const listaAreas = areas.datos ?? []
  const nombreAlcance =
    listaAreas.find((a) => a.id === areaId)?.nombre ?? 'Toda la empresa'

  const d = carga.datos
  const vehiculos = useMemo(() => d?.vehiculos ?? [], [d])

  const calculo = useMemo(() => {
    if (!d) return null
    const ids = new Set(vehiculos.map((v) => v.id))
    const corte = Date.now() - dias * 86400000

    const kmTotal = vehiculos.reduce((a, v) => a + (v.km ?? 0), 0)
    const enMarcha = vehiculos.filter((v) => v.estadoMarcha === 'en_marcha').length
    const indice = vehiculos.length
      ? Math.round(vehiculos.reduce((a, v) => a + (v.indiceSeguro ?? 0), 0) / vehiculos.length)
      : 0

    const odts = d.odts.filter(
      (o) => ids.has(o.vehiculoId) && new Date(o.creadaEn).getTime() >= corte
    )
    const cerradas = odts.filter((o) => o.estado === 'cerrada')
    const porFalla = {}
    odts.forEach((o) => {
      const clave = o.tipoFalla || 'otro'
      porFalla[clave] = (porFalla[clave] || 0) + 1
    })

    const eventos = d.eventos.filter((e) => ids.has(e.vehiculoId))
    const score = f.eventosPor100(eventos.length, kmTotal)
    const conConductor = vehiculos.filter((v) => v.conductorPrincipalId).length
    const identificacion = vehiculos.length
      ? Math.round((conConductor / vehiculos.length) * 100)
      : 0

    const conductores = areaId
      ? d.conductores.filter((p) => p.unidad && ids.has(p.unidad.id))
      : d.conductores

    return {
      kmTotal,
      enMarcha,
      detenidas: vehiculos.length - enMarcha,
      indice,
      odts,
      abiertas: odts.filter((o) => o.estado === 'abierta').length,
      enRevision: odts.filter((o) => o.estado === 'en_revision').length,
      cerradas: cerradas.length,
      costoOdts: cerradas.reduce((a, o) => a + (o.costo ?? 0), 0),
      fallas: Object.entries(porFalla)
        .map(([clave, valor]) => ({ etiqueta: etiqueta('tipo_falla', clave), valor }))
        .sort((a, b) => b.valor - a.valor),
      eventos: eventos.length,
      score,
      rangoScore: f.rangoScore(score),
      identificacion,
      rangoIdent: rangoIdentificacion(identificacion),
      conductores,
    }
  }, [d, vehiculos, dias, areaId])

  const exportar = () => {
    const filas = [
      ['Unidad', 'Placa', 'Área', 'Estado', 'Km', 'Índice', 'Docs vencidos', 'Docs por vencer', 'Conductor'],
      ...vehiculos.map((v) => [
        v.alias,
        v.placa,
        v.areaNombre,
        etiqueta('marcha_estado', v.estadoMarcha),
        Math.round(v.km ?? 0),
        v.indiceSeguro ?? '',
        v.docsVencidos ?? 0,
        v.docsPorVencer ?? 0,
        v.conductorNombre,
      ]),
    ]
    descargarCsv(filas, `reporte-flota-${f.hoyISO()}.csv`)
  }

  const bajada =
    carga.estado === 'ok'
      ? `${nombreAlcance} · ${PERIODO_TEXTO[dias]}`
      : 'Tendencias del período y comparativas de toda la operación.'

  return (
    <>
      <Cabecera titulo="Reportes" bajada={bajada}>
        <button
          type="button"
          className="pnl-btn"
          onClick={exportar}
          disabled={carga.estado !== 'ok' || vehiculos.length === 0}
        >
          <Icono nombre="descargar" tam={16} />
          Exportar CSV
        </button>
        <button
          type="button"
          className="pnl-btn primario"
          onClick={() => window.print()}
          disabled={carga.estado !== 'ok'}
        >
          <Icono nombre="reporte" tam={16} />
          Imprimir o guardar en PDF
        </button>
      </Cabecera>

      <div className="pnl-cuerpo">
        <div className="pnl-grid k2">
          <Tarjeta titulo="Período">
            <Chips opciones={PERIODOS} valor={dias} alCambiar={setDias} />
          </Tarjeta>
          <Tarjeta titulo="Alcance">
            <Campo etiqueta="Área" ayuda="Filtra las unidades del reporte.">
              <select
                className="pnl-select"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
              >
                <option value="">Toda la empresa</option>
                {listaAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          </Tarjeta>
        </div>

        {carga.estado === 'cargando' && <Cargando filas={8} />}
        {carga.estado === 'error' && (
          <ErrorCarga onReintentar={carga.recargar} error={carga.error} />
        )}
        {carga.estado === 'ok' && calculo && (
          <div className="pnl-imprimible">
            {/* Un informe que no dice lo que le falta se lee como si estuviera
                completo, y sobre eso se toman decisiones. Se nombra el hueco
                arriba del todo, donde no se puede pasar por alto. */}
            {(d?.faltantes ?? []).length > 0 && (
              <Tarjeta titulo="Este reporte está incompleto">
                <ul className="pnl-lista-avisos">
                  {d.faltantes.map((falta) => (
                    <li key={falta.nombre}>
                      <b>{falta.nombre}:</b> {falta.motivo}
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            )}
            <div className="pnl-grid">
              <Tarjeta titulo={EMPRESA_NOMBRE}>
                <Datos
                  items={[
                    { etiqueta: 'Reporte', valor: 'Gestión de flota' },
                    { etiqueta: 'Alcance', valor: nombreAlcance },
                    { etiqueta: 'Período', valor: PERIODO_TEXTO[dias] },
                    { etiqueta: 'Generado el', valor: f.fecha(new Date().toISOString()) },
                  ]}
                />
              </Tarjeta>

              {vehiculos.length === 0 ? (
                <Tarjeta>
                  <Vacio
                    icono="camion"
                    titulo="No hay unidades en este alcance"
                    texto="Elige otra área o vuelve a toda la empresa para ver el reporte completo."
                    accion={
                      <button type="button" className="pnl-btn" onClick={() => setAreaId('')}>
                        Ver toda la empresa
                      </button>
                    }
                  />
                </Tarjeta>
              ) : (
                <>
                  <Operacion vehiculos={vehiculos} c={calculo} />
                  <Mantenimiento c={calculo} resumen={d.resumen} />
                  <Seguridad c={calculo} />
                  <Costos costos={d.costos} areaId={areaId} dias={dias} />
                  <DesgloseVehiculos vehiculos={vehiculos} navegar={navegar} />
                  <DesgloseConductores conductores={calculo.conductores} navegar={navegar} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ---------------- Bloque 1: operación ----------------
function Operacion({ vehiculos, c }) {
  const rango = f.rangoIndice(c.indice)
  return (
    <div className="pnl-grid">
      <div className="pnl-grid k4">
        <Kpi titulo="Unidades" valor={f.numero(vehiculos.length)} icono="camion" />
        <Kpi
          titulo="En marcha"
          valor={f.numero(c.enMarcha)}
          icono="velocidad"
          nota={`${c.detenidas} detenidas`}
        />
        <Kpi titulo="Kilometraje total" valor={f.km(c.kmTotal)} icono="mapa" />
        <Kpi
          titulo="Índice de manejo seguro"
          valor={`${c.indice}`}
          icono="escudo"
          tono={TONO_KPI[rango]}
          nota="Promedio de la flota"
        />
      </div>
      <Tarjeta titulo="Operación de la flota">
        <Split
          a={c.enMarcha}
          b={c.detenidas}
          etiquetaA="en marcha"
          etiquetaB="detenidas"
        />
      </Tarjeta>
    </div>
  )
}

// ---------------- Bloque 2: mantenimiento ----------------
function Mantenimiento({ c, resumen }) {
  return (
    <div className="pnl-grid">
      <div className="pnl-grid k3">
        <Kpi titulo="ODT del período" valor={f.numero(c.odts.length)} icono="llave" />
        <Kpi
          titulo="Abiertas"
          valor={f.numero(c.abiertas)}
          icono="alerta"
          tono={c.abiertas > 0 ? 'aviso' : ''}
        />
        <Kpi titulo="En revisión" valor={f.numero(c.enRevision)} icono="reloj" />
        <Kpi titulo="Cerradas" valor={f.numero(c.cerradas)} icono="check" tono="ok" />
        <Kpi titulo="Costo total" valor={f.moneda(c.costoOdts)} icono="reporte" />
        <Kpi
          titulo="Tiempo promedio de resolución"
          valor={f.duracion((resumen?.horasPromedioResolucion ?? 0) * 60)}
          icono="reloj"
          nota="Sobre las ODT cerradas"
        />
      </div>
      <Tarjeta titulo="Fallas más frecuentes">
        {c.fallas.length === 0 ? (
          <Vacio
            icono="llave"
            titulo="Sin órdenes de trabajo en el período"
            texto="Cuando se registre una falla, aparecerá el desglose por tipo."
          />
        ) : (
          <Barras datos={c.fallas} formato={f.numero} />
        )}
      </Tarjeta>
    </div>
  )
}

// ---------------- Bloque 3: seguridad ----------------
function Seguridad({ c }) {
  // Los dos indicadores que la contratante revisa en cada corte.
  const anilloScore = Math.max(0, Math.min(1, 1 - c.score / 5))
  return (
    <div className="pnl-grid k2">
      <Tarjeta
        titulo="Score general de conducción"
        accion={<Semaforo rango={c.rangoScore} />}
      >
        <div className="pnl-grid k2">
          <Anillo
            valor={anilloScore}
            texto={conComa(c.score, 2)}
            sub="eventos por 100 km"
            tono={f.CLASE_SEMAFORO[c.rangoScore]}
          />
          <Datos
            items={[
              { etiqueta: 'Eventos de manejo', valor: f.numero(c.eventos) },
              { etiqueta: 'Kilometraje considerado', valor: f.km(c.kmTotal) },
              { etiqueta: 'Óptimo', valor: 'Menor a 1,5 eventos por cada 100 km' },
            ]}
          />
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Identificación de conductores"
        accion={<Semaforo rango={c.rangoIdent} />}
      >
        <div className="pnl-grid k2">
          <Anillo
            valor={c.identificacion / 100}
            texto={`${c.identificacion}%`}
            sub="unidades con conductor"
            tono={f.CLASE_SEMAFORO[c.rangoIdent]}
          />
          <Datos
            items={[
              { etiqueta: 'Unidades identificadas', valor: `${c.identificacion}%` },
              { etiqueta: 'Óptimo', valor: 'Mayor o igual a 85%' },
            ]}
          />
        </div>
      </Tarjeta>
    </div>
  )
}

// ---------------- Bloque 4: costos ----------------
function Costos({ costos, areaId, dias }) {
  const datos = (costos?.porCategoria ?? []).map((c) => ({
    etiqueta: CATEGORIA_COSTO[c.categoria] ?? c.categoria,
    valor: c.monto,
  }))
  return (
    <div className="pnl-grid">
      <div className="pnl-grid k3">
        <Kpi
          titulo="Costo del período"
          valor={f.moneda(costos?.total ?? 0)}
          icono="reporte"
          nota={PERIODO_TEXTO[dias]}
        />
        <Kpi
          titulo="Costo por kilómetro"
          valor={`$${conComa(costos?.costoPorKm ?? 0, 3)}`}
          icono="mapa"
          nota="Sobre el kilometraje de la flota"
        />
        <Kpi
          titulo="Movimientos registrados"
          valor={f.numero(costos?.movimientos ?? 0)}
          icono="documento"
        />
      </div>
      <Tarjeta
        titulo="Costos por categoría"
        accion={areaId ? <Tag color="gris">Toda la flota</Tag> : null}
      >
        {datos.length === 0 ? (
          <Vacio
            icono="reporte"
            titulo="Sin costos en el período"
            texto="No hay movimientos cargados en la ventana de tiempo elegida."
          />
        ) : (
          <BarrasH datos={datos} formato={f.moneda} />
        )}
      </Tarjeta>
    </div>
  )
}

// ---------------- Bloque 5: desglose por vehículo ----------------
function DesgloseVehiculos({ vehiculos, navegar }) {
  return (
    <Tarjeta titulo="Desglose por vehículo">
      <div className="pnl-tabla-wrap">
        <table className="pnl-tabla">
          <thead>
            <tr>
              <th>Unidad</th>
              <th>Placa</th>
              <th>Área</th>
              <th>Estado</th>
              <th className="num">Km</th>
              <th>Índice</th>
              <th>Documentos</th>
              <th>Conductor</th>
            </tr>
          </thead>
          <tbody>
            {vehiculos.map((v) => (
              <tr
                key={v.id}
                className="pnl-tabla-fila-link"
                onClick={() => navegar(`/panel/flota/${v.id}`)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navegar(`/panel/flota/${v.id}`)
                }}
              >
                <td>
                  <div className="pnl-doble">
                    <b>{v.alias}</b>
                    <span>
                      {v.marca} {v.modelo} {v.anio}
                    </span>
                  </div>
                </td>
                <td className="placa">{v.placa}</td>
                <td>{v.areaNombre}</td>
                <td>
                  <Tag color={color('marcha_estado', v.estadoMarcha)}>
                    {etiqueta('marcha_estado', v.estadoMarcha)}
                  </Tag>
                </td>
                <td className="num">{f.km(v.km)}</td>
                <td>
                  <Tag color={f.CLASE_SEMAFORO[f.rangoIndice(v.indiceSeguro)]}>
                    {v.indiceSeguro}
                  </Tag>
                </td>
                <td>
                  <EstadoDocs vencidos={v.docsVencidos} porVencer={v.docsPorVencer} />
                </td>
                <td>{v.conductorNombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  )
}

function EstadoDocs({ vencidos = 0, porVencer = 0 }) {
  if (vencidos > 0) {
    return <Tag color="rojo">{vencidos === 1 ? '1 vencido' : `${vencidos} vencidos`}</Tag>
  }
  if (porVencer > 0) {
    return (
      <Tag color="ambar">{porVencer === 1 ? '1 por vencer' : `${porVencer} por vencer`}</Tag>
    )
  }
  return <Tag color="verde">Al día</Tag>
}

// ---------------- Bloque 6: desglose por conductor ----------------
function DesgloseConductores({ conductores, navegar }) {
  return (
    <Tarjeta titulo="Desglose por conductor">
      {conductores.length === 0 ? (
        <Vacio
          icono="gente"
          titulo="Sin conductores en este alcance"
          texto="Asigna conductores a las unidades para ver su desempeño aquí."
        />
      ) : (
        <div className="pnl-tabla-wrap">
          <table className="pnl-tabla">
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Unidad</th>
                <th className="num">Eventos</th>
                <th>Índice</th>
              </tr>
            </thead>
            <tbody>
              {conductores.map((p) => (
                <tr
                  key={p.id}
                  className="pnl-tabla-fila-link"
                  onClick={() => navegar(`/panel/personal/${p.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navegar(`/panel/personal/${p.id}`)
                  }}
                >
                  <td>{p.nombre}</td>
                  <td>{p.unidadNombre}</td>
                  <td className="num">{f.numero(p.eventos)}</td>
                  <td>
                    {p.indiceSeguro === null || p.indiceSeguro === undefined ? (
                      <Tag color="gris">Sin dato</Tag>
                    ) : (
                      <Tag color={f.CLASE_SEMAFORO[f.rangoIndice(p.indiceSeguro)]}>
                        {p.indiceSeguro}
                      </Tag>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  )
}
