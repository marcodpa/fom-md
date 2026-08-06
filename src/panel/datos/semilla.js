// ============================================================
// SEMILLA DE DATOS
// Réplica del esquema real (empresas, perfiles, areas, gps, vehiculos, odts,
// inspecciones, documentos, notificaciones, reglas_alerta) con datos de la
// Costa Oriental del Lago. Se genera con un PRNG sembrado, así el panel
// muestra siempre lo mismo entre recargas.
//
// Lo que la app aún no guarda en base de datos (posiciones históricas, eventos
// de manejo) se genera aquí igual que ella lo simula, y queda marcado para
// cuando exista la tabla. El nivel de combustible NO existe en ningún lado:
// los GPS instalados no lo reportan.
// ============================================================

import { hoyISO } from './formato'

// --- PRNG determinista (Lehmer, igual que costService de la app) -----------
function rng(semilla) {
  let s = semilla % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
const R = rng(20260726)
const entre = (a, b) => a + R() * (b - a)
const entero = (a, b) => Math.floor(entre(a, b + 1))
const elegir = (arr) => arr[Math.floor(R() * arr.length)]

const AHORA = Date.now()
const DIA = 86400000
const haceMin = (m) => new Date(AHORA - m * 60000).toISOString()
const haceDias = (d) => new Date(AHORA - d * DIA).toISOString()
const enDias = (d) => hoyISO(new Date(AHORA + d * DIA))

// --- Empresa ---------------------------------------------------------------
export const EMPRESA = {
  id: 'transporte-lago-sur',
  slug: 'transporte-lago-sur',
  nombre: 'Transporte Lago Sur, C.A.',
  tipo: 'estandar',
  rif: 'J-30412876-5',
  contacto: 'Yeison Márquez',
  telefono: '+58 4141238890',
  email: 'operaciones@lagosur.com.ve',
  servicioActivo: true,
  predefinidas: ['petrolera-del-lago'],
}

// --- Áreas (agrupación lógica: ubicacion | sector | contrato) --------------
export const AREAS = [
  { id: 'area-1', nombre: 'Occidente', tipo: 'ubicacion', base: { lat: 10.6545, lng: -71.6405 } },
  { id: 'area-2', nombre: 'Costa oriental', tipo: 'ubicacion', base: { lat: 10.3907, lng: -71.4462 } },
  { id: 'area-3', nombre: 'Sur del lago', tipo: 'ubicacion', base: { lat: 10.135, lng: -71.26 } },
  { id: 'area-4', nombre: 'Contrato Petrolera del Lago', tipo: 'contrato', base: { lat: 10.2, lng: -71.31 } },
]

const CIUDADES = {
  'area-1': ['Maracaibo', 'San Francisco', 'Santa Rita'],
  'area-2': ['Cabimas', 'Ciudad Ojeda', 'Tía Juana'],
  'area-3': ['Lagunillas', 'Bachaquero', 'Mene Grande'],
  'area-4': ['Ciudad Ojeda', 'Cabimas'],
}

const VIAS = [
  'Av. Intercomunal',
  'Carretera Lara-Zulia',
  'Av. Bella Vista',
  'Av. 5 de Julio',
  'Carretera Nacional Ciudad Ojeda',
  'Av. Principal Tamare',
  'Troncal 17',
  'Av. Andrés Bello',
]

// --- Personal (tabla perfiles) --------------------------------------------
const NOMBRES = [
  'Carlos Méndez', 'Ana Rincón', 'Luis Parra', 'José Colina', 'Pedro Villalobos',
  'Endry Bracho', 'Maikel Chourio', 'Darwin Fuenmayor', 'Jhoan Urdaneta', 'Kelvin Atencio',
  'Reinaldo Ferrer', 'Yorman Boscán', 'Alexis Nava', 'Deivis Semprún', 'Wilmer Ocando',
  'Gustavo Faría', 'Neiro Paz', 'Jean Carlos Medina', 'Rubén Portillo', 'Eliezer Morán',
  'Franklin Chávez', 'Mervin González',
]

export const PERFILES = [
  {
    id: 'usr-001',
    nombre: 'Yeison Márquez',
    email: 'supervisor@fom.com.ve',
    rol: 'supervisor_company',
    empresaId: 'transporte-lago-sur',
    conduce: false,
    perfilCompleto: true,
    cedula: 'V-16.482.907',
    telefono: '+58 4141238890',
    direccion: 'Av. 5 de Julio, Maracaibo',
    fechaNacimiento: '1988-03-14',
    licenciaNumero: '',
    licenciaCategoria: '',
    licenciaVence: null,
    cartaMedicaVence: null,
    areaId: null,
    creadoEn: haceDias(880),
  },
  ...NOMBRES.map((nombre, i) => {
    const grado = elegir(['3', '4', '5'])
    return {
      id: `usr-${String(i + 2).padStart(3, '0')}`,
      nombre,
      email: `${nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.')}@lagosur.com.ve`,
      rol: 'conductor',
      empresaId: 'transporte-lago-sur',
      conduce: true,
      perfilCompleto: R() > 0.12,
      cedula: `V-${entero(11, 28)}.${entero(100, 999)}.${entero(100, 999)}`,
      telefono: `+58 4${elegir(['14', '24', '12', '16'])}${entero(1000000, 9999999)}`,
      direccion: `${elegir(VIAS)}, ${elegir(CIUDADES[elegir(['area-1', 'area-2', 'area-3'])])}`,
      fechaNacimiento: `19${entero(72, 99)}-${String(entero(1, 12)).padStart(2, '0')}-${String(entero(1, 28)).padStart(2, '0')}`,
      licenciaNumero: `${entero(10000000, 29999999)}`,
      licenciaCategoria: grado,
      licenciaVence: enDias(entero(-40, 900)),
      cartaMedicaVence: enDias(entero(-25, 700)),
      areaId: null,
      creadoEn: haceDias(entero(60, 700)),
    }
  }),
]

// --- GPS -------------------------------------------------------------------
const MODELOS_GPS = ['Coban GPS303F', 'Teltonika FMB920', 'Concox GT06N', 'Queclink GV55']

// --- Vehículos -------------------------------------------------------------
const FLOTA = [
  ['Toyota', 'Hilux', 'camioneta'], ['Toyota', 'Fortuner', 'camioneta'],
  ['Chevrolet', 'Silverado', 'camioneta'], ['Ford', 'F-150', 'camioneta'],
  ['Mitsubishi', 'L200', 'camioneta'], ['Nissan', 'Frontier', 'camioneta'],
  ['Iveco', 'Daily', 'camion'], ['Mack', 'Granite', 'camion'],
  ['Kenworth', 'T800', 'camion'], ['Foton', 'Aumark', 'camion'],
  ['JAC', 'X200', 'camion'], ['Chevrolet', 'Aveo', 'auto'],
  ['Toyota', 'Corolla', 'auto'],
]

const LETRAS = 'ABCDEFGHJKLMNPRSTUVWXYZ'
function placaVE() {
  const l = () => LETRAS[Math.floor(R() * LETRAS.length)]
  return `${l()}${entero(10, 99)}${l()}${l()}${entero(1, 9)}${l()}`
}

// Reparto por zona: 12 Occidente, 9 Costa oriental, 5 Sur del lago = 26
const REPARTO = [
  ...Array(12).fill('area-1'),
  ...Array(9).fill('area-2'),
  ...Array(5).fill('area-3'),
]

export const VEHICULOS = REPARTO.map((areaId, i) => {
  const [marca, modelo, tipo] = FLOTA[i % FLOTA.length]
  const area = AREAS.find((a) => a.id === areaId)
  const enMarcha = R() > 0.32
  const conductor = PERFILES[i + 1] // usr-002 en adelante
  const km = entero(18000, 240000)
  return {
    id: `veh-${String(i + 1).padStart(3, '0')}`,
    empresaId: EMPRESA.id,
    marca,
    modelo,
    anio: entero(2014, 2024),
    placa: placaVE(),
    numero: `U-${String(i + 1).padStart(3, '0')}`,
    alias: `Unidad ${String(i + 1).padStart(2, '0')}`,
    tipo,
    gps: {
      id: `gps-${String(i + 1).padStart(3, '0')}`,
      modelo: elegir(MODELOS_GPS),
      imei: `86${entero(1000000000000, 9999999999999)}`,
      linea: `+58 4${entero(120000000, 269999999)}`,
      verificado: true,
      pinSupport: R() > 0.4,
      panicoProbado: R() > 0.5,
    },
    areaId,
    conductorPrincipalId: conductor?.id ?? null,
    estadoMarcha: enMarcha ? 'en_marcha' : 'parada',
    velocidadKmh: enMarcha ? entero(18, 92) : 0,
    km,
    lat: area.base.lat + entre(-0.09, 0.09),
    lng: area.base.lng + entre(-0.09, 0.09),
    indiceSeguro: entero(58, 99),
    // Telemetría que la app simula (aún sin columnas en la base):
    aceitePct: entero(28, 96),
    tempMotorC: entero(76, 103),
    ubicacionTexto: `${elegir(VIAS)}, ${elegir(CIUDADES[areaId])}`,
    ultimoReporte: haceMin(entero(0, enMarcha ? 3 : 240)),
    creadoEn: haceDias(entero(90, 1200)),
  }
})

const vehPorId = Object.fromEntries(VEHICULOS.map((v) => [v.id, v]))
const perfPorId = Object.fromEntries(PERFILES.map((p) => [p.id, p]))

// --- Órdenes de trabajo (tabla odts) ---------------------------------------
const FALLAS = [
  ['frenos', 'Pastillas delanteras gastadas, ruido al frenar'],
  ['motor', 'Sobrecalentamiento al subir la cuesta de Tamare'],
  ['neumaticos', 'Caucho trasero derecho con desgaste irregular'],
  ['electrico', 'Luces de cruce intermitentes, posible falso contacto'],
  ['carroceria', 'Golpe en puerta lateral tras maniobra en patio'],
  ['motor', 'Fuga de aceite visible en el cárter'],
  ['frenos', 'Freno de estacionamiento no sostiene en pendiente'],
  ['neumaticos', 'Presión baja recurrente en eje delantero'],
]
const SERVICIOS_PREV = ['Cambio de aceite y filtros', 'Servicio de frenos', 'Rotación de cauchos', 'Revisión de suspensión']

export const ODTS = (() => {
  const lista = []
  // Correctivas (las reporta un conductor)
  for (let i = 0; i < 11; i++) {
    const veh = VEHICULOS[entero(0, VEHICULOS.length - 1)]
    const [tipoFalla, descripcion] = FALLAS[i % FALLAS.length]
    const estado = i < 4 ? 'abierta' : i < 7 ? 'en_revision' : 'cerrada'
    const creadaEn = haceDias(entero(1, 40))
    lista.push({
      id: `odt-${String(i + 1).padStart(3, '0')}`,
      empresaId: EMPRESA.id,
      vehiculoId: veh.id,
      creadorId: veh.conductorPrincipalId,
      autorVia: 'principal',
      tipo: 'correctiva',
      estado,
      descripcion,
      tipoFalla,
      ubicacion: veh.ubicacionTexto,
      evidenciaUrls: [],
      notaSolucion: estado === 'cerrada' ? 'Repuesto sustituido y probado en ruta corta. Unidad operativa.' : null,
      costo: estado === 'cerrada' ? entero(45, 780) : null,
      resueltaEn: estado === 'cerrada' ? haceDias(entero(0, 8)) : null,
      reglaId: null,
      creadaEn,
    })
  }
  // Preventivas (las crea el sistema al cumplirse una regla: creadorId = null)
  for (let i = 0; i < 4; i++) {
    const veh = VEHICULOS[entero(0, VEHICULOS.length - 1)]
    const estado = i < 2 ? 'abierta' : 'cerrada'
    lista.push({
      id: `odt-${String(12 + i).padStart(3, '0')}`,
      empresaId: EMPRESA.id,
      vehiculoId: veh.id,
      creadorId: null, // Sistema
      autorVia: null,
      tipo: 'preventiva',
      estado,
      descripcion: `${SERVICIOS_PREV[i % SERVICIOS_PREV.length]} por kilometraje cumplido`,
      tipoFalla: null,
      ubicacion: 'Posición actual del GPS',
      evidenciaUrls: [],
      notaSolucion: estado === 'cerrada' ? 'Servicio ejecutado en taller propio.' : null,
      costo: estado === 'cerrada' ? entero(90, 340) : null,
      resueltaEn: estado === 'cerrada' ? haceDias(entero(1, 12)) : null,
      reglaId: 'reg-002',
      creadaEn: haceDias(entero(2, 30)),
    })
  }
  return lista.sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn))
})()

// --- Inspecciones preoperacionales -----------------------------------------
export const INSPECCIONES = (() => {
  const lista = []
  let n = 1
  // 18 de hoy y el resto del histórico de 12 días
  for (let d = 0; d < 12; d++) {
    const cuantas = d === 0 ? 18 : entero(14, 22)
    for (let i = 0; i < cuantas; i++) {
      const veh = VEHICULOS[(i + d * 3) % VEHICULOS.length]
      const r = R()
      const resultado = r > 0.9 ? 'bloqueada' : r > 0.68 ? 'aprobada_con_observaciones' : 'aprobada'
      lista.push({
        id: `insp-${String(n++).padStart(3, '0')}`,
        vehiculoId: veh.id,
        conductorId: veh.conductorPrincipalId,
        fecha: hoyISO(new Date(AHORA - d * DIA)),
        resultado,
        ubicacion: veh.ubicacionTexto,
        creadaEn: new Date(AHORA - d * DIA - entero(1, 9) * 3600000).toISOString(),
        observaciones:
          resultado === 'aprobada'
            ? 0
            : resultado === 'aprobada_con_observaciones'
              ? entero(1, 3)
              : entero(1, 2),
        fallasCriticas: resultado === 'bloqueada' ? entero(1, 2) : 0,
      })
    }
  }
  return lista
})()

// --- Documentos (vehículo y persona) ---------------------------------------
const DOCS_VEHICULO = ['Póliza de seguro', 'Certificado de circulación', 'Revisión técnica', 'RCV']
const DOCS_PERSONA = ['Licencia de conducir', 'Certificado médico', 'Cédula de identidad']

export const DOCUMENTOS = (() => {
  const lista = []
  let n = 1
  VEHICULOS.forEach((v) => {
    DOCS_VEHICULO.forEach((tipo) => {
      lista.push({
        id: `doc-${String(n++).padStart(3, '0')}`,
        ambito: 'vehiculo',
        vehiculoId: v.id,
        userId: null,
        tipo,
        venceEn: enDias(entero(-45, 640)),
        fotoUrls: [],
      })
    })
  })
  PERFILES.filter((p) => p.conduce).forEach((p) => {
    DOCS_PERSONA.forEach((tipo) => {
      const vence =
        tipo === 'Licencia de conducir'
          ? p.licenciaVence
          : tipo === 'Certificado médico'
            ? p.cartaMedicaVence
            : enDias(entero(200, 1800))
      lista.push({
        id: `doc-${String(n++).padStart(3, '0')}`,
        ambito: 'persona',
        vehiculoId: null,
        userId: p.id,
        tipo,
        venceEn: vence ?? enDias(400),
        fotoUrls: [],
      })
    })
  })
  return lista
})()

// --- Reglas de alerta ------------------------------------------------------
export const REGLAS = [
  {
    id: 'reg-001',
    empresaId: EMPRESA.id,
    tipo: 'velocidad',
    umbral: 80,
    servicio: null,
    activa: true,
    creadaPor: 'usr-001',
    creadaEn: haceDias(120),
    vehiculos: VEHICULOS.map((v) => ({ vehiculoId: v.id, progresoKm: 0 })),
  },
  {
    id: 'reg-002',
    empresaId: EMPRESA.id,
    tipo: 'mantenimiento',
    umbral: 5000,
    servicio: 'Cambio de aceite y filtros',
    activa: true,
    creadaPor: 'usr-001',
    creadaEn: haceDias(120),
    vehiculos: VEHICULOS.map((v) => ({ vehiculoId: v.id, progresoKm: entero(400, 5400) })),
  },
]

// --- Notificaciones del panel ---------------------------------------------
export const NOTIFICACIONES = (() => {
  const lista = []
  ODTS.slice(0, 8).forEach((o, i) => {
    const veh = vehPorId[o.vehiculoId]
    lista.push({
      id: `not-${String(i + 1).padStart(3, '0')}`,
      empresaId: EMPRESA.id,
      tipo: o.tipo === 'preventiva' ? 'alerta_cumplida' : 'odt_nueva',
      titulo:
        o.tipo === 'preventiva'
          ? `${o.descripcion.split(' por ')[0]} · ${veh.alias}`
          : `Nueva ODT — Vehículo ${veh.alias} (${veh.placa})`,
      detalle: o.descripcion,
      odtId: o.id,
      leida: i > 3,
      creadaEn: o.creadaEn,
    })
  })
  // Excesos de velocidad detectados por la regla
  VEHICULOS.filter((v) => v.velocidadKmh > 80)
    .slice(0, 4)
    .forEach((v, i) => {
      lista.push({
        id: `not-1${String(i + 1).padStart(2, '0')}`,
        empresaId: EMPRESA.id,
        tipo: 'alerta_cumplida',
        titulo: 'Exceso de velocidad',
        detalle: `${v.alias} va a ${v.velocidadKmh} km/h (límite 80)`,
        odtId: null,
        leida: false,
        creadaEn: haceMin(entero(4, 220)),
      })
    })
  return lista.sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn))
})()

// --- Eventos de manejo (base del índice seguro; la app los simula) ---------
const TIPO_EVENTO = [
  ['exceso_velocidad', 'Exceso de velocidad', 'advertencia'],
  ['frenada_brusca', 'Frenada brusca', 'advertencia'],
  ['aceleracion_brusca', 'Aceleración fuerte', 'info'],
  ['curva_agresiva', 'Curva tomada con brusquedad', 'info'],
]

export const EVENTOS = (() => {
  const lista = []
  for (let i = 0; i < 90; i++) {
    const veh = VEHICULOS[entero(0, VEHICULOS.length - 1)]
    const [clave, nombre, severidad] = elegir(TIPO_EVENTO)
    lista.push({
      id: `evt-${String(i + 1).padStart(3, '0')}`,
      vehiculoId: veh.id,
      conductorId: veh.conductorPrincipalId,
      clave,
      nombre,
      severidad,
      valor: clave === 'exceso_velocidad' ? entero(82, 118) : entero(3, 9),
      ubicacion: `${elegir(VIAS)}, ${elegir(CIUDADES[veh.areaId])}`,
      creadaEn: haceDias(entre(0, 28)),
    })
  }
  return lista.sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn))
})()

// --- Recorrido del día (la app no lo guarda; aquí se simula el trazado) ----
export function recorridoDe(vehiculoId, puntos = 26) {
  const v = vehPorId[vehiculoId]
  if (!v) return []
  const r = rng(vehiculoId.split('').reduce((a, c) => a + c.charCodeAt(0), 7))
  const salida = []
  let lat = v.lat - 0.055
  let lng = v.lng - 0.05
  for (let i = 0; i < puntos; i++) {
    lat += (v.lat - lat) / (puntos - i) + (r() - 0.5) * 0.008
    lng += (v.lng - lng) / (puntos - i) + (r() - 0.5) * 0.008
    salida.push({
      lat,
      lng,
      velocidadKmh: Math.round(r() * 88),
      hora: new Date(AHORA - (puntos - i) * 18 * 60000).toISOString(),
    })
  }
  return salida
}

// --- Costos por categoría (mismas 9 categorías del costService) ------------
export const CATEGORIAS_COSTO = [
  { clave: 'combustible', nombre: 'Combustible', clase: 'producto' },
  { clave: 'repuestos', nombre: 'Repuestos', clase: 'producto' },
  { clave: 'neumaticos', nombre: 'Neumáticos', clase: 'producto' },
  { clave: 'lubricantes', nombre: 'Lubricantes', clase: 'producto' },
  { clave: 'mano_obra', nombre: 'Mano de obra', clase: 'servicio' },
  { clave: 'preventivo', nombre: 'Preventivo', clase: 'servicio' },
  { clave: 'correctivo', nombre: 'Correctivo', clase: 'servicio' },
  { clave: 'peajes', nombre: 'Peajes', clase: 'servicio' },
  { clave: 'seguros', nombre: 'Seguros', clase: 'servicio' },
]

export const COSTOS = (() => {
  const lista = []
  let n = 1
  for (let d = 0; d < 90; d++) {
    const cuantos = entero(1, 4)
    for (let i = 0; i < cuantos; i++) {
      const cat = elegir(CATEGORIAS_COSTO)
      const veh = VEHICULOS[entero(0, VEHICULOS.length - 1)]
      lista.push({
        id: `cos-${String(n++).padStart(4, '0')}`,
        vehiculoId: veh.id,
        categoria: cat.clave,
        clase: cat.clase,
        monto: cat.clave === 'combustible' ? entero(30, 160) : entero(20, 620),
        fecha: hoyISO(new Date(AHORA - d * DIA)),
      })
    }
  }
  return lista
})()

export { vehPorId, perfPorId }

// ============================================================
// ADMINISTRACIÓN FOM (multiempresa)
// Lo que ve y maneja el Administrador FOM: todas las empresas, los pagos
// del servicio, el inventario de GPS y la bitácora de auditoría.
// ============================================================

export const EMPRESAS = [
  EMPRESA,
  {
    id: 'petrolera-del-lago',
    slug: 'petrolera-del-lago',
    nombre: 'Petrolera del Lago',
    tipo: 'predefinida',
    rif: 'J-07013380-1',
    contacto: 'Lino Ferrer',
    telefono: '+58 2617521200',
    email: 'fiscalizacion@petrolago.com.ve',
    servicioActivo: true,
    predefinidas: [],
  },
  {
    id: 'transporte-sampieri',
    slug: 'transporte-sampieri',
    nombre: 'Transporte Sampieri, C.A.',
    tipo: 'estandar',
    rif: 'J-29884511-3',
    contacto: 'Renzo Sampieri',
    telefono: '+58 4246118834',
    email: 'gerencia@sampieri.com.ve',
    servicioActivo: true,
    predefinidas: ['petrolera-del-lago'],
  },
  {
    id: 'flota-quintero',
    slug: 'flota-quintero',
    nombre: 'Flota Quintero',
    tipo: 'personal',
    rif: 'V-14528390-0',
    contacto: 'Alejandra Quintero',
    telefono: '+58 4149982213',
    email: 'ale.quintero@gmail.com',
    servicioActivo: false, // suspendida por pago vencido
    predefinidas: [],
  },
  {
    id: 'desempleados-ca',
    slug: 'desempleados-ca',
    nombre: 'Desempleados C.A.',
    tipo: 'estandar',
    rif: 'J-00000000-0',
    contacto: 'FOM',
    telefono: '',
    email: '',
    servicioActivo: false,
    respaldo: true, // ente de sistema: recibe a las personas eliminadas
    predefinidas: [],
  },
]

// Personal de los otros entes (el grueso de PERFILES es de Lago Sur)
PERFILES.push(
  {
    id: 'usr-101',
    nombre: 'Renzo Sampieri',
    email: 'gerencia@sampieri.com.ve',
    rol: 'supervisor_company',
    empresaId: 'transporte-sampieri',
    conduce: false,
    perfilCompleto: true,
    cedula: 'V-13.774.902',
    telefono: '+58 4246118834',
    direccion: 'Av. Intercomunal, Ciudad Ojeda',
    fechaNacimiento: '1979-11-02',
    licenciaNumero: '',
    licenciaCategoria: '',
    licenciaVence: null,
    cartaMedicaVence: null,
    areaId: null,
    creadoEn: haceDias(410),
  },
  {
    id: 'usr-102',
    nombre: 'Lino Ferrer',
    email: 'fiscalizacion@petrolago.com.ve',
    rol: 'supervisor_company',
    empresaId: 'petrolera-del-lago',
    conduce: false,
    perfilCompleto: true,
    cedula: 'V-9.114.630',
    telefono: '+58 2617521200',
    direccion: 'Av. La Limpia, Maracaibo',
    fechaNacimiento: '1968-05-19',
    licenciaNumero: '',
    licenciaCategoria: '',
    licenciaVence: null,
    cartaMedicaVence: null,
    areaId: null,
    creadoEn: haceDias(600),
  },
  {
    id: 'usr-103',
    nombre: 'Alejandra Quintero',
    email: 'ale.quintero@gmail.com',
    rol: 'supervisor_personal',
    empresaId: 'flota-quintero',
    conduce: true,
    perfilCompleto: true,
    cedula: 'V-14.528.390',
    telefono: '+58 4149982213',
    direccion: 'Av. Bella Vista, Maracaibo',
    fechaNacimiento: '1985-07-30',
    licenciaNumero: '21447805',
    licenciaCategoria: '3',
    licenciaVence: enDias(320),
    cartaMedicaVence: enDias(180),
    areaId: null,
    creadoEn: haceDias(230),
  },
  {
    id: 'usr-104',
    nombre: 'Douglas Prieto',
    email: 'douglas.prieto@lagosur.com.ve',
    rol: 'conductor',
    empresaId: 'desempleados-ca', // eliminado: salió de su empresa
    conduce: true,
    perfilCompleto: true,
    cedula: 'V-19.882.706',
    telefono: '+58 4127760391',
    direccion: 'Carretera Lara-Zulia, Cabimas',
    fechaNacimiento: '1990-01-25',
    licenciaNumero: '19882706',
    licenciaCategoria: '4',
    licenciaVence: enDias(150),
    cartaMedicaVence: enDias(90),
    areaId: null,
    creadoEn: haceDias(520),
  }
)

// Pagos del servicio FOM por empresa (los administra solo el admin)
export const PAGOS = [
  { id: 'pag-001', empresaId: 'transporte-lago-sur', monto: 780, moneda: 'USD', periodo: '2026-07', estado: 'pagado', pagadoEn: haceDias(18), nota: '', creadaEn: haceDias(28) },
  { id: 'pag-002', empresaId: 'transporte-lago-sur', monto: 780, moneda: 'USD', periodo: '2026-08', estado: 'pendiente', pagadoEn: null, nota: '', creadaEn: haceDias(2) },
  { id: 'pag-003', empresaId: 'transporte-sampieri', monto: 420, moneda: 'USD', periodo: '2026-07', estado: 'pagado', pagadoEn: haceDias(11), nota: 'Transferencia Banesco', creadaEn: haceDias(26) },
  { id: 'pag-004', empresaId: 'transporte-sampieri', monto: 420, moneda: 'USD', periodo: '2026-08', estado: 'pendiente', pagadoEn: null, nota: '', creadaEn: haceDias(2) },
  { id: 'pag-005', empresaId: 'flota-quintero', monto: 60, moneda: 'USD', periodo: '2026-06', estado: 'vencido', pagadoEn: null, nota: 'Servicio suspendido por falta de pago', creadaEn: haceDias(56) },
  { id: 'pag-006', empresaId: 'flota-quintero', monto: 60, moneda: 'USD', periodo: '2026-07', estado: 'vencido', pagadoEn: null, nota: '', creadaEn: haceDias(26) },
]

// Inventario de GPS sin asociar (los de la flota viven dentro de cada vehículo)
export const GPS_LIBRES = [
  { id: 'gps-101', modelo: 'Teltonika FMB920', imei: '860000000000101', linea: '+58 424 5550101', empresaId: null, verificado: true, pinSupport: true, panicoProbado: true },
  { id: 'gps-102', modelo: 'Coban GPS303F', imei: '860000000000102', linea: '+58 414 5550102', empresaId: null, verificado: true, pinSupport: false, panicoProbado: false },
  { id: 'gps-103', modelo: 'Queclink GV55', imei: '860000000000103', linea: '+58 412 5550103', empresaId: 'transporte-lago-sur', verificado: false, pinSupport: true, panicoProbado: false },
  { id: 'gps-104', modelo: 'Concox GT06N', imei: '860000000000104', linea: '+58 416 5550104', empresaId: null, verificado: false, pinSupport: false, panicoProbado: false },
]

// Bitácora de auditoría (acciones de administración registradas)
export const AUDITORIA = [
  { id: 'aud-001', tipo: 'crear_empresa', actorId: 'usr-000', actorNombre: 'Marco Pacheco', empresaId: 'transporte-sampieri', objetivo: 'Transporte Sampieri, C.A.', detalle: 'Alta de contratista asignada a Petrolera del Lago', fecha: haceDias(410) },
  { id: 'aud-002', tipo: 'crear_usuario', actorId: 'usr-000', actorNombre: 'Marco Pacheco', empresaId: 'transporte-sampieri', objetivo: 'Renzo Sampieri', detalle: 'Perfil Administrador con clave por defecto', fecha: haceDias(410) },
  { id: 'aud-003', tipo: 'crear_vehiculo', actorId: 'usr-000', actorNombre: 'Marco Pacheco', empresaId: 'transporte-lago-sur', objetivo: 'Unidad 26', detalle: 'Alta con GPS Teltonika FMB920 verificado', fecha: haceDias(92) },
  { id: 'aud-004', tipo: 'servicio_empresa', actorId: 'usr-000', actorNombre: 'Marco Pacheco', empresaId: 'flota-quintero', objetivo: 'Flota Quintero', detalle: 'Servicio suspendido por pago vencido del período 2026-06', fecha: haceDias(20) },
  { id: 'aud-005', tipo: 'eliminar_usuario', actorId: 'usr-001', actorNombre: 'Yeison Márquez', empresaId: 'transporte-lago-sur', objetivo: 'Douglas Prieto', detalle: 'Salió de la empresa; su cuenta pasó a Desempleados C.A.', fecha: haceDias(35) },
  { id: 'aud-006', tipo: 'registrar_pago', actorId: 'usr-000', actorNombre: 'Marco Pacheco', empresaId: 'transporte-lago-sur', objetivo: '2026-08 · 780 USD', detalle: 'Cuota mensual del servicio', fecha: haceDias(2) },
]
