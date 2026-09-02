import { Link } from 'react-router-dom'
import * as f from '../datos/formato'
import { Icono } from '../Iconos'

// ============================================================
// FICHA DE UNIDAD
// ------------------------------------------------------------
// Una sola ficha para los dos sitios donde se mira una unidad: flotando sobre
// el mapa al seleccionar un pin, y en la columna del Centro de control. Antes
// eran cuatro maquetados distintos —uno en cada componente de mapa y otro en
// la tarjeta de telemetría— con el mismo contenido escrito de cuatro formas.
// Cuando cambió la regla del estado de marcha hubo que corregirla en tres
// archivos y en uno se olvidó.
//
// Dos criterios que la gobiernan:
//
//   La PLACA manda. Es lo que el supervisor dice por radio y lo que lleva
//   pintado el vehículo. El alias interno va debajo, no encima.
//
//   Una fila sin dato no se dibuja. La versión anterior mostraba «Sin
//   conductor» y un pie vacío porque la base no guarda conductores todavía;
//   media ficha era relleno. Aquí solo aparece lo que existe, y si no hay
//   nada que mostrar se dice por qué.
// ============================================================

/**
 * Estado que se puede AFIRMAR de una unidad, con el mejor dato disponible.
 *
 * La cascada es deliberada y va de lo más preciso a lo más pobre:
 *
 *   1. ENCENDIDO. El GPS reporta el estado de la línea de contacto. Es el dato
 *      que pide la operación: verde encendido, gris apagado.
 *   2. VELOCIDAD. Si no hay encendido pero sí velocidad, marcha o parada.
 *   3. CONEXIÓN. Si no hay ninguno de los dos —el caso de HOY— lo único que
 *      consta es si el equipo reportó hace poco. Y no es lo mismo: una
 *      camioneta estacionada con el motor apagado sigue reportando cada minuto.
 *
 * Hoy `ignition` y `velocidadKmh` llegan siempre nulos porque esas columnas no
 * existen todavía en la base: son parte de la migración de telemetría que está
 * pendiente de aplicar. En cuanto entre, el verde y el gris pasan a significar
 * encendido y apagado sin tocar una línea de esta función.
 */
export function estadoUnidad(v) {
  if (v?.ignition === true) {
    return { clave: 'encendido', texto: 'Encendido', color: 'verde' }
  }
  if (v?.ignition === false) {
    return { clave: 'apagado', texto: 'Apagado', color: 'gris' }
  }
  if (v?.estadoMarcha) {
    return v.estadoMarcha === 'en_marcha'
      ? { clave: 'en_marcha', texto: 'En marcha', color: 'verde' }
      : { clave: 'parada', texto: 'Detenida', color: 'gris' }
  }
  return v?.conectado
    ? { clave: 'reportando', texto: 'Reportando', color: 'verde' }
    : { clave: 'sin_senal', texto: 'Sin señal', color: 'gris' }
}

/** Filas de datos: se descartan las que no tienen valor. */
function datosDe(v) {
  const filas = [
    ['Última señal', v.ultimoReporte ? f.momento(v.ultimoReporte) : null],
    // El encendido ya se anuncia en la etiqueta de estado; aquí solo se repite
    // si además hay velocidad, donde las dos cosas juntas cuentan algo: un
    // motor encendido a 0 km/h es ralentí, y eso interesa.
    ['Motor', v.ignition == null || v.velocidadKmh == null ? null : v.ignition ? 'Encendido' : 'Apagado'],
    ['Velocidad', v.velocidadKmh == null ? null : f.velocidad(v.velocidadKmh)],
    ['Odómetro', v.km == null ? null : f.km(v.km)],
    ['Conductor', v.conductorNombre && v.conductorNombre !== 'Sin asignar' ? v.conductorNombre : null],
    ['Área', v.areaNombre && v.areaNombre !== 'Sin área' ? v.areaNombre : null],
    ['Ubicación', v.ubicacionTexto || null],
    ['Temperatura', v.tempMotorC == null ? null : `${v.tempMotorC} °C`],
    ['Índice de manejo', v.indiceSeguro == null ? null : f.numero(v.indiceSeguro)],
    ['IMEI del equipo', v.gps?.imei || null],
    [
      'Coordenadas',
      v.lat != null && v.lng != null ? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}` : null,
    ],
  ]
  return filas.filter(([, valor]) => valor != null && valor !== '')
}

/**
 * @param {object}   unidad     Vehículo enriquecido del repositorio.
 * @param {'flotante'|'panel'} variante  Sobre el mapa, o en la columna.
 * @param {function} alCerrar   Si se pasa, aparece el botón de cerrar.
 * @param {boolean}  conEnlace  Enlace al expediente (se oculta si ya estás en él).
 */
export default function FichaUnidad({
  unidad: v,
  variante = 'panel',
  alCerrar,
  conEnlace = true,
}) {
  if (!v) return null

  const estado = estadoUnidad(v)
  const datos = datosDe(v)
  const descripcion = [v.marca, v.modelo, v.anio].filter(Boolean).join(' ')

  return (
    <article className={`pnl-ficha ${variante}`} aria-label={`Unidad ${v.placa}`}>
      <header className="pnl-ficha-top">
        <span className={`pnl-ficha-estado ${estado.color}`}>
          <i aria-hidden="true" />
          {estado.texto}
        </span>
        {alCerrar && (
          <button type="button" className="pnl-ficha-cerrar" onClick={alCerrar}
            aria-label={`Cerrar la ficha de ${v.placa}`}>
            <Icono nombre="cerrar" tam={14} />
          </button>
        )}
      </header>

      {/* La placa es el identificador que se usa en voz alta. */}
      <p className="pnl-ficha-placa">{v.placa}</p>
      <p className="pnl-ficha-sub">
        {v.alias && v.alias !== v.placa && <span className="alias">{v.alias}</span>}
        {descripcion && <span>{descripcion}</span>}
      </p>

      {datos.length > 0 ? (
        <dl className="pnl-ficha-datos">
          {datos.map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt>{etiqueta}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="pnl-ficha-vacio">
          Este equipo todavía no ha reportado ninguna posición.
        </p>
      )}

      {conEnlace && (
        <Link to={`/panel/flota/${v.id}`} className="pnl-ficha-accion">
          Ver expediente
          <Icono nombre="ver" tam={14} />
        </Link>
      )}
    </article>
  )
}
