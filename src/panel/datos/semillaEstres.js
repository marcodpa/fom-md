// ============================================================
// FLOTA DE ESTRÉS (T-80) — SOLO MODO DEMOSTRACIÓN
// ------------------------------------------------------------
// Una empresa GRANDE para ver cómo rinde el panel: 340 unidades (300 en
// Maracaibo, Costa oriental y Sur del lago + 40 del contrato petrolero), un
// conductor por unidad, ~3.000 órdenes de mantenimiento del último año,
// ~30.000 inspecciones, eventos, avisos, documentos y costos acordes.
//
// Se enciende con `?estres=1` (o `?estres=340`, o cualquier número de
// unidades) al cargar el panel, o dejando `fom.demo.estres` en localStorage.
// La URL lo deja guardado, así sigue activo al navegar por el panel y al
// recargar; `?estres=0` lo apaga. Conectado a la base real (HAY_API) no se
// enciende nunca: esto no toca producción.
//
// Mismas formas de objeto que semilla.js. Todo sale de un PRNG sembrado: con
// la misma fecha, los mismos datos. Lo único que cambia con el reloj es la
// posición de las unidades en marcha, que avanzan por carretera: cada lectura
// de la flota (el panel la pide cada 15 s) las encuentra más adelante.
// ============================================================

import { HAY_API } from './api'
import { hoyISO } from './formato'
import { RUTAS_LISTAS, enAgua, kmEnTierraFirme, puntoEnRuta } from './geoZulia'

export const CLAVE_ESTRES = 'fom.demo.estres'
/** Unidades con `?estres=1`: 300 + 40. */
export const FLOTA_ESTRES = 340
// Tope para que un número escrito a mano no cuelgue el navegador.
const MAXIMO = 3000
// La diaria se genera para las últimas 18 semanas: con 340 conductores da
// ~30.000 inspecciones en total. Un año entero serían ~75.000.
const DIAS_DIARIAS = 126
// Cambios locales aparte: jugar con la flota grande no ensucia la demo normal.
const CLAVE_CAMBIOS_ESTRES = 'fom.panel.cambios.estres'

const DIA = 86400000
const MIN = 60000
// Origen fijo del movimiento: la posición depende solo de la hora.
const EPOCA = Date.UTC(2026, 0, 1)

// --- ¿Está encendida? ---------------------------------------------------------

/** «1», «si» o vacío → 340; un número → esas unidades; «0» o nada → apagada. */
export function unidadesDe(valor) {
  if (valor == null) return 0
  const t = String(valor).trim().toLowerCase()
  if (['0', 'no', 'false', 'off'].includes(t)) return 0
  if (['', '1', 'si', 'sí', 'true', 'on'].includes(t)) return FLOTA_ESTRES
  const n = Number.parseInt(t, 10)
  if (!Number.isFinite(n) || n < 1) return 0
  return Math.min(n, MAXIMO)
}

/**
 * Unidades de la flota de estrés, o 0 si está apagada. La URL manda y queda
 * guardada; sin ella vale lo guardado.
 */
export function leerEstres() {
  if (HAY_API) return 0
  try {
    const almacen = typeof localStorage !== 'undefined' ? localStorage : null
    const busqueda = typeof location !== 'undefined' ? location.search : ''
    const params = new URLSearchParams(busqueda || '')
    if (params.has('estres')) {
      const n = unidadesDe(params.get('estres'))
      if (n) almacen?.setItem(CLAVE_ESTRES, String(n))
      else almacen?.removeItem(CLAVE_ESTRES)
      return n
    }
    return unidadesDe(almacen?.getItem(CLAVE_ESTRES))
  } catch {
    return 0
  }
}

/** La semilla que usa el panel: la de siempre, o la flota de estrés si está encendida. */
export function semillaActiva(base) {
  // Conectado a un servidor real (la web publicada) nunca se enciende, ni con `?estres=1`.
  if (import.meta.env?.VITE_FOM_API) return base
  const n = leerEstres()
  return n ? crearSemillaEstres(base, { vehiculos: n }) : base
}

// --- Azar sembrado (Lehmer, el mismo de semilla.js) -------------------------
function rng(semilla) {
  let s = semilla % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// --- Carreteras del Zulia ---------------------------------------------------
// Las vías por las que van y vienen las unidades (en marcha o detenidas a un
// lado) están en geoZulia.js, sobre trazos reales: ninguna cae en el lago.

// --- Catálogos de la empresa grande -----------------------------------------
const PILA = [
  'Carlos', 'Ana', 'Luis', 'José', 'Pedro', 'Endry', 'Maikel', 'Darwin', 'Jhoan', 'Kelvin', 'Reinaldo', 'Yorman',
  'Alexis', 'Deivis', 'Wilmer', 'Gustavo', 'Neiro', 'Jean Carlos', 'Rubén', 'Eliezer', 'Franklin', 'Mervin',
  'Yusmary', 'Oriana', 'Daniela', 'Rosmery', 'Jesús', 'Ángel', 'Edixon', 'Yonathan', 'Richard', 'Nelson',
  'Henry', 'Freddy', 'Leonardo', 'Wuilian', 'Ender', 'Gabriel', 'Luisana', 'Marbelis',
]
const APELLIDOS = [
  'Méndez', 'Rincón', 'Parra', 'Colina', 'Villalobos', 'Bracho', 'Chourio', 'Fuenmayor', 'Urdaneta', 'Atencio',
  'Ferrer', 'Boscán', 'Nava', 'Semprún', 'Ocando', 'Faría', 'Paz', 'Medina', 'Portillo', 'Morán', 'Chávez',
  'González', 'Montiel', 'Añez', 'Soto', 'Molero', 'Prieto', 'Áñez', 'Luzardo', 'Romero', 'Hernández', 'Petit',
]
const FLOTA = [
  ['Toyota', 'Hilux', 'camioneta'], ['Toyota', 'Fortuner', 'camioneta'], ['Chevrolet', 'Silverado', 'camioneta'],
  ['Ford', 'F-150', 'camioneta'], ['Mitsubishi', 'L200', 'camioneta'], ['Nissan', 'Frontier', 'camioneta'],
  ['Iveco', 'Daily', 'camion'], ['Mack', 'Granite', 'camion'], ['Kenworth', 'T800', 'camion'],
  ['Foton', 'Aumark', 'camion'], ['JAC', 'X200', 'camion'], ['Chevrolet', 'Aveo', 'auto'], ['Toyota', 'Corolla', 'auto'],
]
const MODELOS_GPS = ['Coban GPS303F', 'Teltonika FMB920', 'Concox GT06N', 'Queclink GV55']
const LETRAS = 'ABCDEFGHJKLMNPRSTUVWXYZ'
const FALLAS = [
  ['frenos', 'Pastillas delanteras gastadas, ruido al frenar'],
  ['motor', 'Sobrecalentamiento al subir la cuesta de Tamare'],
  ['neumaticos', 'Caucho trasero derecho con desgaste irregular'],
  ['electrico', 'Luces de cruce intermitentes, posible falso contacto'],
  ['carroceria', 'Golpe en puerta lateral tras maniobra en patio'],
  ['motor', 'Fuga de aceite visible en el cárter'],
  ['frenos', 'Freno de estacionamiento no sostiene en pendiente'],
  ['neumaticos', 'Presión baja recurrente en eje delantero'],
  ['electrico', 'Batería no sostiene carga en la mañana'],
  ['motor', 'Pérdida de potencia en carretera'],
  ['carroceria', 'Parabrisas con grieta que avanza'],
  ['otro', 'Aire acondicionado sin enfriar en la cabina'],
]
const SERVICIOS_PREV = ['Cambio de aceite y filtros', 'Servicio de frenos', 'Rotación de cauchos', 'Revisión de suspensión']
// Los 9 estados del servidor; los «en curso» son los del taller y la revisión.
const EN_CURSO = ['en_revision', 'aprobada', 'asignada', 'en_ejecucion', 'pausada', 'en_calidad']
const DOCS_VEHICULO = ['Póliza de seguro', 'Certificado de circulación', 'Revisión técnica', 'RCV']
const DOCS_PERSONA = ['Licencia de conducir', 'Certificado médico', 'Cédula de identidad']
const TIPO_EVENTO = [
  ['exceso_velocidad', 'Exceso de velocidad', 'advertencia'],
  ['frenada_brusca', 'Frenada brusca', 'advertencia'],
  ['aceleracion_brusca', 'Aceleración fuerte', 'info'],
  ['curva_agresiva', 'Curva tomada con brusquedad', 'info'],
]

const pad = (n, largo) => String(n).padStart(largo, '0')
// Todas las fechas salen de toISOString(): comparar el texto basta y es mucho más rápido que crear fechas.
const recientePrimero = (a, b) => (a.creadaEn < b.creadaEn ? 1 : a.creadaEn > b.creadaEn ? -1 : 0)
const sinAcentos = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/** Reparto de las unidades: 300 en las tres zonas y 40 del contrato (en proporción si son otras cantidades). */
function repartir(total) {
  const contrato = Math.round((total * 40) / 340)
  const resto = total - contrato
  const occidente = Math.round((resto * 13) / 30)
  const costa = Math.round((resto * 11) / 30)
  return [
    ...Array(occidente).fill('area-1'),
    ...Array(costa).fill('area-2'),
    ...Array(resto - occidente - costa).fill('area-3'),
    ...Array(contrato).fill('area-4'),
  ]
}

// ============================================================
// GENERADOR
// ============================================================
/**
 * La semilla de la empresa grande, con las mismas exportaciones que
 * semilla.js. `base` es el módulo semilla (de ahí salen la empresa, las
 * áreas, las otras empresas, pagos, GPS libres y auditoría).
 */
export function crearSemillaEstres(base, { vehiculos: total = FLOTA_ESTRES, ahora = Date.now() } = {}) {
  const R = rng(20261021)
  const entre = (a, b) => a + R() * (b - a)
  const entero = (a, b) => Math.floor(entre(a, b + 1))
  const elegir = (arr) => arr[Math.floor(R() * arr.length)]
  const haceMin = (m) => new Date(ahora - m * MIN).toISOString()
  const haceDias = (d) => new Date(ahora - d * DIA).toISOString()
  const enDias = (d) => hoyISO(new Date(ahora + d * DIA))
  const escala = total / FLOTA_ESTRES
  const EMPRESA = base.EMPRESA
  const AREAS = base.AREAS

  // --- Conductores (uno por unidad) -----------------------------------------
  const nombresUsados = new Set()
  const correosUsados = new Set()
  const conductores = []
  for (let i = 0; i < total; i++) {
    // El primero es el conductor de la cuenta de prueba (usr-002), como en la demo normal.
    let nombre = i === 0 ? 'Carlos Méndez' : `${elegir(PILA)} ${elegir(APELLIDOS)}`
    if (nombresUsados.has(nombre)) nombre = `${nombre} ${elegir(APELLIDOS)}`
    for (let k = 2; nombresUsados.has(nombre); k++) nombre = `${nombre.replace(/ \d+$/, '')} ${k}`
    nombresUsados.add(nombre)
    let correo = `${sinAcentos(nombre).replace(/\s+/g, '.')}@lagosur.com.ve`
    for (let k = 2; correosUsados.has(correo); k++) correo = correo.replace(/(\d*)@/, `${k}@`)
    correosUsados.add(correo)
    conductores.push({
      id: i === 0 ? 'usr-002' : `usr-e${pad(i + 1, 4)}`,
      nombre,
      email: correo,
      rol: 'conductor',
      empresaId: EMPRESA.id,
      conduce: true,
      perfilCompleto: R() > 0.12,
      cedula: `V-${entero(11, 30)}.${entero(100, 999)}.${entero(100, 999)}`,
      telefono: `+58 4${elegir(['14', '24', '12', '16'])}${entero(1000000, 9999999)}`,
      direccion: `${elegir(['Av. Intercomunal', 'Av. Bella Vista', 'Av. 5 de Julio', 'Carretera H', 'Av. Andrés Bello'])}, ${elegir(['Maracaibo', 'Cabimas', 'Ciudad Ojeda', 'San Francisco', 'Lagunillas'])}`,
      fechaNacimiento: `19${entero(70, 99)}-${pad(entero(1, 12), 2)}-${pad(entero(1, 28), 2)}`,
      licenciaNumero: `${entero(10000000, 29999999)}`,
      licenciaCategoria: elegir(['3', '4', '5']),
      licenciaVence: enDias(entero(-40, 900)),
      cartaMedicaVence: enDias(entero(-25, 700)),
      areaId: null,
      creadoEn: haceDias(entero(60, 1400)),
    })
  }
  // El supervisor de la demo y la gente de las otras empresas se conservan.
  const PERFILES = [
    ...base.PERFILES.filter((p) => p.empresaId === EMPRESA.id && !p.conduce),
    ...conductores,
    ...base.PERFILES.filter((p) => p.empresaId !== EMPRESA.id),
  ]

  // --- Vehículos ---------------------------------------------------------------
  const placas = new Set()
  const placa = () => {
    const l = () => LETRAS[Math.floor(R() * LETRAS.length)]
    let p
    do p = `${l()}${entero(10, 99)}${l()}${l()}${entero(1, 9)}${l()}`
    while (placas.has(p))
    placas.add(p)
    return p
  }
  const imeis = new Set()
  const imei = () => {
    let x
    do x = `86${entero(1000000000000, 9999999999999)}`
    while (imeis.has(x))
    imeis.add(x)
    return x
  }

  const movimiento = new Map() // id → cómo se mueve (o dónde está parada)
  const VEHICULOS = repartir(total).map((areaId, i) => {
    const [marca, modelo, tipo] = FLOTA[i % FLOTA.length]
    const conductor = conductores[i]
    const enMarcha = R() < 0.85
    const id = `veh-${pad(i + 1, 3)}`
    const v = {
      id,
      empresaId: EMPRESA.id,
      marca,
      modelo,
      anio: entero(2014, 2025),
      placa: placa(),
      numero: `U-${pad(i + 1, 3)}`,
      alias: `Unidad ${pad(i + 1, 3)}`,
      tipo,
      gps: {
        id: `gps-e${pad(i + 1, 4)}`,
        modelo: elegir(MODELOS_GPS),
        imei: imei(),
        linea: `+58 4${entero(120000000, 269999999)}`,
        verificado: true,
        pinSupport: R() > 0.4,
        panicoProbado: R() > 0.5,
      },
      areaId,
      conductorPrincipalId: conductor?.id ?? null,
      estadoMarcha: enMarcha ? 'en_marcha' : 'parada',
      km: entero(18000, 320000),
      indiceSeguro: entero(55, 99),
      aceitePct: entero(28, 96),
      tempMotorC: entero(76, 103),
      creadoEn: haceDias(entero(150, 1500)),
    }
    if (enMarcha) {
      const ruta = elegir(RUTAS_LISTAS[areaId])
      const mov = {
        ruta,
        enMarcha: true,
        km0: entre(0, ruta.largo * 2),
        kmh: entero(35, 85),
        fase: entre(0, Math.PI * 2),
        desfase: entero(0, 25000),
        carril: [(R() - 0.5) * 0.0004, (R() - 0.5) * 0.0004],
        jornadaMin: entero(90, 420),
      }
      // Dónde va a la hora `t`: avanza por su ruta a su velocidad.
      mov.en = (t) => {
        const [la, ln] = puntoEnRuta(ruta, mov.km0 + (mov.kmh * (t - EPOCA)) / 3600000)
        return { lat: la + mov.carril[0], lng: ln + mov.carril[1] }
      }
      mov.velocidad = (t) => Math.max(8, Math.round(mov.kmh + 8 * Math.sin(t / 45000 + mov.fase)))
      movimiento.set(id, mov)
      v.ubicacionTexto = `${ruta.via}, ${ruta.ciudad}`
      // Posición viva: cada lectura (un `{ ...v }` en el repositorio) la toma de la hora actual.
      Object.defineProperties(v, {
        lat: { enumerable: true, configurable: true, get: () => mov.en(Date.now()).lat },
        lng: { enumerable: true, configurable: true, get: () => mov.en(Date.now()).lng },
        velocidadKmh: { enumerable: true, configurable: true, get: () => mov.velocidad(Date.now()) },
        ultimoReporte: {
          enumerable: true,
          configurable: true,
          get: () => new Date(Math.floor((Date.now() - mov.desfase) / 30000) * 30000).toISOString(),
        },
      })
    } else {
      // Detenida a un lado de una vía de su zona, en tierra firme (nunca sobre el puente).
      // Los mismos sorteos de antes, en el mismo orden: el resto de la flota no cambia.
      const ruta = elegir(RUTAS_LISTAS[areaId])
      const km = kmEnTierraFirme(ruta, entre(0, ruta.largo))
      const orilla = entre(-0.0001, 0.0001)
      const [la, ln] = puntoEnRuta(ruta, km)
      const mov = { enMarcha: false, ruta, km, lat: la + orilla, lng: ln - orilla, paradaMin: entero(5, 600) }
      movimiento.set(id, mov)
      Object.assign(v, {
        velocidadKmh: 0,
        lat: mov.lat,
        lng: mov.lng,
        ubicacionTexto: `${ruta.via}, ${ruta.ciudad}`,
        ultimoReporte: haceMin(mov.paradaMin),
      })
    }
    return v
  })
  const vehPorId = Object.fromEntries(VEHICULOS.map((v) => [v.id, v]))
  const perfPorId = Object.fromEntries(PERFILES.map((p) => [p.id, p]))
  const textoDeLaZona = (areaId) => {
    const r = elegir(RUTAS_LISTAS[areaId])
    return `${r.via}, ${r.ciudad}`
  }

  // --- Órdenes de trabajo: ~8,8 por unidad en 12 meses, los 9 estados ------
  const estadoPorEdad = (dias) => {
    const r = R()
    if (dias > 30) return r < 0.92 ? 'cerrada' : r < 0.97 ? 'cancelada' : elegir(['abierta', 'en_revision', 'aprobada', 'pausada'])
    if (dias > 7) return r < 0.6 ? 'cerrada' : r < 0.65 ? 'cancelada' : r < 0.72 ? 'abierta' : elegir(EN_CURSO)
    return r < 0.15 ? 'cerrada' : r < 0.18 ? 'cancelada' : r < 0.45 ? 'abierta' : elegir(EN_CURSO)
  }
  const ODTS = []
  const cuantasOdt = Math.round(total * 8.8)
  for (let n = 1; n <= cuantasOdt; n++) {
    const veh = VEHICULOS[entero(0, VEHICULOS.length - 1)]
    const edad = entre(0, 365)
    const creada = ahora - edad * DIA
    const estado = estadoPorEdad(edad)
    const preventiva = R() < 0.25
    const cerrada = estado === 'cerrada'
    const resuelta = cerrada ? Math.min(creada + entre(2 / 24, 12) * DIA, ahora - 10 * MIN) : null
    const comun = {
      id: `odt-${pad(n, 4)}`,
      empresaId: EMPRESA.id,
      vehiculoId: veh.id,
      estado,
      prioridad: elegir(['baja', 'media', 'media', 'alta']),
      evidenciaUrls: [],
      resueltaEn: resuelta ? new Date(resuelta).toISOString() : null,
      creadaEn: new Date(creada).toISOString(),
    }
    if (preventiva) {
      ODTS.push({
        ...comun,
        creadorId: null, // Sistema
        autorVia: null,
        tipo: 'preventiva',
        descripcion: `${elegir(SERVICIOS_PREV)} por kilometraje cumplido`,
        tipoFalla: null,
        ubicacion: 'Posición actual del GPS',
        notaSolucion: cerrada ? 'Servicio ejecutado en taller propio.' : null,
        costo: cerrada && R() > 0.1 ? entero(90, 420) : null,
        reglaId: 'reg-002',
      })
    } else {
      const [tipoFalla, descripcion] = elegir(FALLAS)
      ODTS.push({
        ...comun,
        creadorId: veh.conductorPrincipalId,
        autorVia: 'principal',
        tipo: 'correctiva',
        descripcion,
        tipoFalla,
        ubicacion: textoDeLaZona(veh.areaId),
        notaSolucion: cerrada ? 'Repuesto sustituido y probado en ruta corta. Unidad operativa.' : null,
        costo: cerrada && R() > 0.1 ? entero(45, 1200) : null,
        reglaId: null,
      })
    }
  }
  ODTS.sort(recientePrimero)

  // --- Inspecciones ----------------------------------------------------------
  // Diaria de lunes a viernes en las últimas 18 semanas, cada conductor con su
  // constancia (80–99 %); algún sábado o domingo suelto; y las programadas,
  // de vez en cuando, en todo el año.
  const INSPECCIONES = []
  let ni = 1
  const diaLocal = (d) => {
    const x = new Date(ahora)
    x.setHours(12, 0, 0, 0)
    x.setDate(x.getDate() - d)
    return x
  }
  const dias = Array.from({ length: 365 }, (_, d) => {
    const fecha = diaLocal(d)
    const inicio = new Date(fecha)
    inicio.setHours(5, 30, 0, 0)
    return { d, iso: hoyISO(fecha), semana: fecha.getDay(), inicio: inicio.getTime() }
  })
  const horaDe = (dia, minutos) => Math.min(dia.inicio + minutos * MIN, ahora - MIN)
  for (const veh of VEHICULOS) {
    const conductorId = veh.conductorPrincipalId
    if (!conductorId) continue
    const constancia = 0.8 + R() * 0.19
    for (const dia of dias) {
      const laboral = dia.semana >= 1 && dia.semana <= 5
      if (dia.d < DIAS_DIARIAS) {
        // Hoy todavía hay quien no la ha hecho.
        const prob = laboral ? (dia.d === 0 ? constancia * 0.7 : constancia) : dia.semana === 6 ? 0.08 : 0.02
        if (R() < prob) {
          const r = R()
          const resultado = r > 0.94 ? 'bloqueada' : r > 0.76 ? 'aprobada_con_observaciones' : 'aprobada'
          INSPECCIONES.push({
            id: `insp-e${ni++}`,
            vehiculoId: veh.id,
            conductorId,
            fecha: dia.iso,
            clase: 'daily',
            resultado,
            ubicacion: veh.ubicacionTexto,
            creadaEn: new Date(horaDe(dia, entero(0, 210))).toISOString(),
            observaciones: resultado === 'aprobada' ? 0 : entero(1, 3),
            fallasCriticas: resultado === 'bloqueada' ? entero(1, 2) : 0,
          })
        }
      }
      if (laboral && R() < 0.035) {
        const conObs = R() < 0.15
        INSPECCIONES.push({
          id: `insp-e${ni++}`,
          vehiculoId: veh.id,
          conductorId,
          fecha: dia.iso,
          clase: 'scheduled',
          resultado: conObs ? 'aprobada_con_observaciones' : 'aprobada',
          ubicacion: veh.ubicacionTexto,
          creadaEn: new Date(horaDe(dia, entero(180, 420))).toISOString(),
          observaciones: conObs ? 1 : 0,
          fallasCriticas: 0,
        })
      }
    }
  }

  // --- Documentos (vehículo y persona) --------------------------------------
  const DOCUMENTOS = []
  let nd = 1
  for (const v of VEHICULOS) {
    for (const tipo of DOCS_VEHICULO) {
      DOCUMENTOS.push({ id: `doc-${pad(nd++, 5)}`, ambito: 'vehiculo', vehiculoId: v.id, userId: null, tipo, venceEn: enDias(entero(-45, 640)), fotoUrls: [] })
    }
  }
  for (const p of conductores) {
    for (const tipo of DOCS_PERSONA) {
      const vence = tipo === 'Licencia de conducir' ? p.licenciaVence : tipo === 'Certificado médico' ? p.cartaMedicaVence : enDias(entero(200, 1800))
      DOCUMENTOS.push({ id: `doc-${pad(nd++, 5)}`, ambito: 'persona', vehiculoId: null, userId: p.id, tipo, venceEn: vence ?? enDias(400), fotoUrls: [] })
    }
  }

  // --- Reglas de alerta ------------------------------------------------------
  const REGLAS = base.REGLAS.map((r) => ({
    ...r,
    vehiculos: VEHICULOS.map((v) => ({ vehiculoId: v.id, progresoKm: r.tipo === 'mantenimiento' ? entero(400, 5400) : 0 })),
  }))

  // --- Eventos de manejo: los últimos 120 días -------------------------------
  const EVENTOS = []
  let ne = 1
  for (let d = 0; d < 120; d++) {
    const cuantos = entero(Math.round(30 * escala), Math.round(55 * escala))
    for (let i = 0; i < cuantos; i++) {
      const veh = VEHICULOS[entero(0, VEHICULOS.length - 1)]
      const [clave, nombre, severidad] = elegir(TIPO_EVENTO)
      EVENTOS.push({
        id: `evt-${pad(ne++, 5)}`,
        vehiculoId: veh.id,
        conductorId: veh.conductorPrincipalId,
        clave,
        nombre,
        severidad,
        valor: clave === 'exceso_velocidad' ? entero(82, 118) : entero(3, 9),
        ubicacion: textoDeLaZona(veh.areaId),
        creadaEn: new Date(ahora - (d + R()) * DIA).toISOString(),
      })
    }
  }
  EVENTOS.sort(recientePrimero)

  // --- Avisos del panel: ODT de los últimos 45 días y excesos de 3 días ------
  const NOTIFICACIONES = []
  let nn = 1
  for (const o of ODTS) {
    const edad = (ahora - Date.parse(o.creadaEn)) / DIA
    if (edad > 45) continue
    const veh = vehPorId[o.vehiculoId]
    NOTIFICACIONES.push({
      id: `not-${pad(nn++, 5)}`,
      empresaId: EMPRESA.id,
      tipo: o.tipo === 'preventiva' ? 'alerta_cumplida' : 'odt_nueva',
      titulo: o.tipo === 'preventiva' ? `${o.descripcion.split(' por ')[0]} · ${veh.alias}` : `Nueva ODT — Vehículo ${veh.alias} (${veh.placa})`,
      detalle: o.descripcion,
      odtId: o.id,
      leida: edad > 2 ? R() < 0.92 : R() < 0.3,
      creadaEn: o.creadaEn,
    })
  }
  for (const e of EVENTOS) {
    if (e.clave !== 'exceso_velocidad') continue
    const edad = (ahora - Date.parse(e.creadaEn)) / DIA
    if (edad > 3) continue
    NOTIFICACIONES.push({
      id: `not-${pad(nn++, 5)}`,
      empresaId: EMPRESA.id,
      tipo: 'alerta_cumplida',
      titulo: 'Exceso de velocidad',
      detalle: `${vehPorId[e.vehiculoId].alias} va a ${e.valor} km/h (límite 80)`,
      odtId: null,
      leida: edad > 1 ? R() < 0.8 : R() < 0.2,
      creadaEn: e.creadaEn,
    })
  }
  NOTIFICACIONES.sort(recientePrimero)

  // --- Costos del último año ---------------------------------------------------
  const COSTOS = []
  let nc = 1
  for (let d = 0; d < 365; d++) {
    const cuantos = entero(Math.round(12 * escala), Math.round(30 * escala))
    for (let i = 0; i < cuantos; i++) {
      const cat = elegir(base.CATEGORIAS_COSTO)
      COSTOS.push({
        id: `cos-${pad(nc++, 5)}`,
        vehiculoId: VEHICULOS[entero(0, VEHICULOS.length - 1)].id,
        categoria: cat.clave,
        clase: cat.clase,
        monto: cat.clave === 'combustible' ? entero(30, 160) : entero(20, 620),
        fecha: hoyISO(new Date(ahora - d * DIA)),
      })
    }
  }

  // --- Recorridos (misma forma que semilla.js) --------------------------------
  // En marcha: el camino real que lleva por su ruta. Detenida: el último viaje
  // hasta el patio y unas posiciones quietas.
  function recorridoDe(vehiculoId, puntos = 26) {
    const mov = movimiento.get(vehiculoId)
    if (!mov) return []
    const t = Date.now()
    if (mov.enMarcha) {
      return Array.from({ length: puntos }, (_, i) => {
        const h = t - (puntos - 1 - i) * 18 * MIN
        return { ...mov.en(h), velocidadKmh: mov.velocidad(h), hora: new Date(h).toISOString() }
      })
    }
    const r = rng(vehiculoId.split('').reduce((a, c) => a + c.charCodeAt(0), 7))
    const fin = t - mov.paradaMin * MIN
    // Los últimos ~7 km por su vía hasta donde quedó parada.
    return Array.from({ length: puntos }, (_, i) => {
      const k = (i + 1) / puntos
      const [la, ln] = k === 1 ? [mov.lat, mov.lng] : puntoEnRuta(mov.ruta, mov.km - 7 * (1 - k))
      return {
        lat: la + (r() - 0.5) * 0.0001 * (1 - k),
        lng: ln + (r() - 0.5) * 0.0001 * (1 - k),
        velocidadKmh: i === puntos - 1 ? 0 : Math.round(30 + r() * 50),
        hora: new Date(fin - (puntos - 1 - i) * 3 * MIN).toISOString(),
      }
    })
  }

  function recorridoDetalladoDe(vehiculoId, horas = 24) {
    const mov = movimiento.get(vehiculoId)
    if (!mov) return { puntos: [], truncado: false }
    const ahoraMin = Math.floor(Date.now() / MIN) * MIN
    const desde = ahoraMin - horas * 3600000
    const salida = []
    if (mov.enMarcha) {
      // Sale del patio (quieta unos minutos) y rueda desde entonces, un punto por minuto.
      // El patio queda en tierra: si a esa hora iba por el puente, salió unos minutos antes.
      let inicio = ahoraMin - mov.jornadaMin * MIN
      for (let n = 0; n < 60 && enAgua(mov.en(inicio).lat, mov.en(inicio).lng); n++) inicio -= MIN
      const patio = mov.en(inicio)
      for (let t = inicio - 20 * MIN; t < inicio; t += 2 * MIN) salida.push({ ...patio, velocidadKmh: 0, hora: new Date(t).toISOString() })
      for (let t = inicio; t <= ahoraMin; t += MIN) salida.push({ ...mov.en(t), velocidadKmh: mov.velocidad(t), hora: new Date(t).toISOString() })
    } else {
      const r = rng(vehiculoId.split('').reduce((a, c) => a + c.charCodeAt(0) * 31, 11))
      const llegada = ahoraMin - mov.paradaMin * MIN
      const viaje = 40
      // El último viaje, por su vía, a unos 27 km/h de media hasta donde quedó parada.
      for (let m = 0; m <= viaje; m++) {
        const k = m / viaje
        const [la, ln] = m === viaje ? [mov.lat, mov.lng] : puntoEnRuta(mov.ruta, mov.km - 0.45 * (viaje - m))
        salida.push({
          lat: la + (r() - 0.5) * 0.0001 * (1 - k),
          lng: ln + (r() - 0.5) * 0.0001 * (1 - k),
          velocidadKmh: m === viaje ? 0 : Math.round(34 + r() * 52),
          hora: new Date(llegada - (viaje - m) * MIN).toISOString(),
        })
      }
      for (let t = llegada + 2 * MIN; t <= Math.min(ahoraMin, llegada + 12 * MIN); t += 2 * MIN) {
        salida.push({ lat: mov.lat + (r() - 0.5) * 0.00018, lng: mov.lng + (r() - 0.5) * 0.00018, velocidadKmh: 0, hora: new Date(t).toISOString() })
      }
    }
    return { puntos: salida.filter((p) => Date.parse(p.hora) >= desde), truncado: false }
  }

  return {
    ...base,
    PERFILES,
    VEHICULOS,
    ODTS,
    INSPECCIONES,
    DOCUMENTOS,
    REGLAS,
    NOTIFICACIONES,
    EVENTOS,
    COSTOS,
    recorridoDe,
    recorridoDetalladoDe,
    vehPorId,
    perfPorId,
    // Para repoSemilla: el historial extra de la demo normal ya va incluido
    // aquí, y los cambios locales se guardan aparte.
    sinHistorialExtra: true,
    claveCambios: CLAVE_CAMBIOS_ESTRES,
    estres: { vehiculos: total },
  }
}
