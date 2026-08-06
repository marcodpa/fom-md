/**
 * Tipos de dominio compartidos.
 *
 * Base derivada del brief (secciones 5–7). Se amplía conforme crecen los
 * módulos. Los tipos del tema viven en `@/theme`.
 */

// ───────────────────────────── Identidad / acceso ─────────────────────────

/**
 * Roles del sistema (FOM-02-FUN-002 §7). No son una escalera: cada rol es una
 * forma distinta de usar la app.
 *  - `admin`: ve TODO el sistema; crea empresas, supervisores y vehículos (§1).
 *  - `supervisor_company`: el operativo de SU ente. En una COMPAÑÍA se llama
 *    "Supervisor"; en contratistas y empresas, "Administrador" (§3, Yeison).
 *  - `conductor`: conductor de empresa, app móvil offline-first (§4, Pedro).
 *  - `supervisor_personal`: flota doméstica propia (§5, Ale).
 *  - `usuario_personal`: mapa + alertas de su vehículo, no crea nada (§6, Santi).
 *
 * Los 4 roles legados (driver → companyAdmin → generalAdmin → superAdmin, capas
 * acumulativas del brief §5) CONVIVEN hasta terminar la migración; su retiro
 * pasará por la lista aprobada de la Fase B.
 */
export type Role =
  // ── Legado (brief §5) ──
  | 'driver'
  | 'companyAdmin'
  | 'generalAdmin'
  | 'superAdmin'
  // ── FOM-02 §7 ──
  | 'admin'
  | 'supervisor_company'
  | 'conductor'
  | 'supervisor_personal'
  | 'usuario_personal';

/** Estado de la sesión de autenticación. */
export type AuthStatus = 'signedOut' | 'signedIn';

/**
 * Raíz del modelo multi-tenant (brief §5). Una Cuenta puede ser persona natural
 * (flota personal, experiencia simplificada) o jurídica (organización con sedes
 * y flotas).
 */
export type TenantTipo = 'natural' | 'juridica';

/** Cuenta / Tenant: la raíz a la que pertenece el usuario. */
export interface Cuenta {
  id: string;
  nombre: string;
  tipo: TenantTipo;
}

/** Contexto que la app resuelve al iniciar sesión. */
export interface ContextoLogin {
  /** Cuenta del usuario (o `null` si administra varias empresas). */
  cuenta: Cuenta | null;
  /**
   * ¿Ya llenó su perfil obligatorio (cédula, licencia, carta médica)? El primer
   * ingreso lo exige (FOM-02 §3.1/§4.1/§5.1/§6.1); `true` para roles sin gate.
   */
  perfilCompleto: boolean;
}

/**
 * Tipo de empresa (FOM-02 §1.1):
 *  - `estandar`: empresa operativa normal (flota, áreas, conductores, ODT).
 *  - `predefinida`: contratante/fiscalizadora sin flota propia; se le ASIGNAN
 *    empresas estándar y su supervisor ve solo la capa gerencial (§2).
 *  - `personal`: flota doméstica (pocos carros, usuarios de familia, §5).
 */
export type CompanyTipo = 'estandar' | 'predefinida' | 'personal';

/** Empresa cliente. La identidad visual (marca) se maneja en `@/theme`. */
export interface Company {
  id: string;
  name: string;
  /** Tipo de empresa (FOM-02 §1.1). Opcional mientras convive el modelo legado. */
  tipo?: CompanyTipo;
  /** RIF de la empresa (§1.1). */
  rif?: string;
  /** Datos de contacto (§1.1). */
  contacto?: string;
  /** Teléfono con su código de país (obligatorio al crear, ej. "+58 4141234567"). */
  telefono?: string;
  /** Correo electrónico de la empresa. */
  email?: string;
  /**
   * Empresas predefinidas a las que está asignada (ej. Samfor → Chevron, §1.1).
   * El modelo prevé N predefinidas por empresa aunque el mock use una.
   */
  predefinidaIds?: string[];
  /**
   * ¿El servicio FOM está ACTIVO para esta empresa? Lo controlan los admin
   * FOM desde su Consola; suspendido, sus usuarios no pueden entrar.
   */
  servicioActivo?: boolean;
}

// ─────────────────────── Pagos del servicio (admin FOM) ────────────────────

/** Estado de un pago del servicio. */
export type PagoEstado = 'pendiente' | 'pagado' | 'vencido';

/** Pago del servicio FOM de una empresa (lo monitorean los admin FOM). */
export interface Pago {
  id: string;
  companyId: string;
  monto: number;
  moneda: string;
  /** Período que cubre (ej. "2026-07"). */
  periodo: string;
  estado: PagoEstado;
  /** ISO de cuándo se pagó (si está pagado). */
  pagadoEn?: string;
  nota?: string;
  creadaEn: string;
}

/**
 * Usuario autenticado (datos públicos, sin credenciales).
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Empresa a la que pertenece. No aplica al super admin. */
  companyId?: string;
  /**
   * TIPO del ente al que pertenece (resuelto al iniciar sesión): decide su
   * superficie — la gente de una COMPAÑÍA va a /compania (monitoreo), no al
   * panel operativo.
   */
  companyTipo?: CompanyTipo;
  /** Cédula de identidad (editable desde el CRUD y su perfil). */
  cedula?: string;
  /** Teléfono con su código de país (ej. "+58 4141234567"). */
  telefono?: string;
  /**
   * Bandera transversal "conduce": además maneja un vehículo, por lo que
   * obtiene la vista base de conductor encima de su rol. Ver brief, sección 5.
   */
  drives: boolean;
}

/** Un llenado de tanque: cuándo y cuántos litros. */
export interface FuelFill {
  /** Fecha ISO del llenado. */
  fecha: string;
  litros: number;
}

/**
 * Métricas acumuladas de un conductor (para su perfil y sus reportes).
 * Hoy mock; mañana se calculan desde la BD según el rango de tiempo.
 */
export interface DriverMetrics {
  kmRecorridos: number;
  /** Ids de los vehículos que ha usado. */
  vehiculosUsados: string[];
  diasConducidos: number;
  horasConducidas: number;
  /** Llenados de tanque (veces y litros de cada uno). */
  recargas: FuelFill[];
  /** Órdenes de trabajo (fallas) que ha reportado. */
  otReportadas: number;
}

/** Licencia de conducir del conductor. */
export interface Licencia {
  numero: string;
  /** Categoría/tipo (ej. "5ta" o "C2"). */
  categoria: string;
  /** ISO de vencimiento. */
  venceEn: string;
}

/**
 * Perfil completo de un usuario conductor (datos personales + métricas).
 * `id` coincide con el `User.id` para enlazarlos.
 */
export interface DriverProfile {
  id: string;
  nombre: string;
  /** Foto de perfil (placeholder hoy; URL del avatar). */
  fotoUrl: string;
  cedula: string;
  direccion: string;
  companyId: string;
  /** Correo (cuenta de acceso). Opcional: los perfiles mock antiguos no lo traen. */
  email?: string;
  /**
   * Rol REAL de la persona (administrador, supervisor, conductor…). El roster
   * de una empresa mezcla perfiles: sin esto, todos se pintarían como
   * conductores. Opcional porque los perfiles mock antiguos no lo traen.
   */
  role?: Role;
  /** Licencia de conducir (opcional). */
  licencia?: Licencia;
  /** Carta médica con su vencimiento (FOM-02: parte del perfil obligatorio). */
  cartaMedica?: { venceEn: string };
  metrics: DriverMetrics;
}

// ──────────────────────────── Plano del vehículo ──────────────────────────

/** Vehículo de una flota. */
/** Tipo de vehículo (define, entre otras cosas, su plantilla de inspección). */
export type VehicleType = 'camioneta' | 'camion' | 'auto' | 'otro';

export interface Vehicle {
  id: string;
  companyId: string;
  marca: string;
  modelo: string;
  anio: number;
  /** Matrícula / placa. */
  placa: string;
  /** Número de unidad dentro de la flota (ej. "U-014"). */
  numero: string;
  /**
   * ALIAS: nombre interno que la empresa le da a su unidad (FOM-02 §8-1,
   * ej. "Unidad 07", "Camioneta de Producción"). Campo NUEVO; `numero` no se
   * toca (P3).
   */
  alias?: string;
  /** Tipo de vehículo (para elegir la plantilla de inspección). */
  tipo?: VehicleType;
  /** GPS instalado (obligatorio en el alta, FOM-02 §1.2). */
  gpsId?: string;
  /** Estado del alta: "activo y reportando" (§1.2 paso 4; el resto del ciclo, D9). */
  cicloEstado?: 'activo_reportando';
  /** Área de la empresa a la que está asignado (FOM-02 §3.1). */
  areaId?: string;
  /** Conductor PRINCIPAL: el titular de la unidad (FOM-02 §3.5). */
  conductorPrincipalId?: string;
}

// ─────────────────── Áreas y titularidad (FOM-02 §3.1/§3.5) ────────────────

/** Naturaleza de un área: por ubicación, por sector o por contrato (§3.1). */
export type AreaTipo = 'ubicacion' | 'sector' | 'contrato';

/**
 * Área de la empresa (FOM-02 §3.1): la crea el supervisor (ej. "Base Maturín",
 * "Producción", "Contrato Chevron 2026"). Sirve para asignar vehículos y para
 * asignar alertas "por área". Concepto NUEVO: convive con sedes y grupos de
 * flota (P2).
 */
export interface Area {
  id: string;
  companyId: string;
  nombre: string;
  tipo: AreaTipo;
}

/**
 * Conductor SECUNDARIO autorizado de un vehículo (FOM-02 §3.5): usa la unidad
 * temporalmente identificándose con su PIN en el GPS. Solo existe si el GPS
 * del vehículo soporta PIN. El PIN vive en el equipo real; en el mock, aquí.
 */
export interface ConductorSecundario {
  vehicleId: string;
  userId: string;
  nombre: string;
  pin: string;
}

// ───────────────────────────── GPS (FOM-02 §1.2) ──────────────────────────

/**
 * Equipo GPS: entidad de primera clase (FOM-02 §1.2 paso 3). Se registra en
 * orden estricto (1° modelo, 2° IMEI único, 3° línea), se asocia a un vehículo
 * (hereda su empresa) y se verifica que reporta posición. Sus capacidades
 * (PIN, botón de pánico) las definirá el catálogo real del Sr. Pacheco (D4);
 * en el mock son banderas simuladas.
 */
export interface Gps {
  id: string;
  /** 1° Modelo del equipo (ej. "Teltonika FMC150"). */
  modelo: string;
  /** 2° IMEI, único en el sistema. */
  imei: string;
  /** 3° Línea telefónica asociada. */
  linea: string;
  /** Vehículo asociado, o `null` si aún no se asocia. */
  vehicleId: string | null;
  /** Empresa (heredada del vehículo al asociar). */
  companyId: string | null;
  /** ¿Se verificó que reporta posición? (§1.2-3.3). */
  verificado: boolean;
  /** ¿Soporta identificación por PIN? (§3.5; sin PIN → solo conductor principal). */
  pinSupport: boolean;
  /** ¿Se probó el botón de pánico físico? (prueba opcional del alta). */
  panicoProbado?: boolean;
}

/**
 * Evento de auditoría del alta de vehículo (FOM-02 §1.2 paso 4): quién lo
 * creó, qué GPS se instaló y cuándo. Visible SOLO para el Admin (§1.3).
 */
/** Qué acción se registró en la auditoría. */
export type AuditoriaAccion = 'crear' | 'editar' | 'eliminar';
/** Sobre qué entidad. */
export type AuditoriaEntidad = 'empresa' | 'usuario' | 'vehiculo' | 'pago' | 'servicio';

export interface AuditoriaEvento {
  id: string;
  accion: AuditoriaAccion;
  entidad: AuditoriaEntidad;
  actorId: string;
  /** Nombre de quién hizo la acción. */
  actorNombre: string;
  /** Etiqueta legible de lo afectado (ej. "Samfor", "Unidad 07 · AB123CD"). */
  objetivo: string;
  /** Slug de la empresa relacionada (para el alcance de lectura). */
  companyId?: string;
  companyNombre?: string;
  /** Detalle libre opcional (ej. "servicio suspendido", "movido a Chevron"). */
  detalle?: string;
  /** Cuándo (ISO). */
  fecha: string;
}

/**
 * Emparejamiento del conductor con un vehículo, según la señal del chip/GPS.
 * Lo verifica la app al iniciar sesión: si no hay señal, el conductor no está
 * identificado en ninguna unidad y no puede entrar a la vista de conducción.
 */
export interface Emparejamiento {
  emparejado: boolean;
  /** Vehículo en el que pasó el chip (si `emparejado`). */
  vehicle: Vehicle | null;
}

/** Estado de marcha del vehículo (plano GPS). */
export type VehicleStatus = 'en_marcha' | 'parada';

/** Posición de la caja de cambios. */
export type Gear = 'P' | 'R' | 'N' | 'D';

/** Estado del aceite del motor. */
export type OilStatus = 'bueno' | 'regular' | 'malo';

/**
 * Telemetría del vehículo en un instante (plano GPS, brief sección 7).
 * Alimenta el mantenimiento P/C/P.
 */
export interface VehicleTelemetry {
  vehicleId: string;
  estado: VehicleStatus;
  caja: Gear;
  velocidadKmh: number;
  /** Combustible restante, 0–100 %. */
  combustiblePct: number;
  /** Nivel/vida útil del aceite, 0–100 %. */
  aceitePct: number;
  /** Temperatura del motor en °C. */
  tempMotorC: number;
  estadoAceite: OilStatus;
  personasABordo: number;
  /** Ubicación legible (geocodificada) para mostrar al usuario. */
  ubicacionTexto: string;
  /** Odómetro en km. */
  km: number;
  /** Marca de tiempo ISO de la última lectura GPS. */
  actualizadoEn: string;
}

// ──────────────────────────── Plano del conductor ─────────────────────────

/** Clasificación del semáforo: mapea a los colores semánticos del tema. */
export type ScoreRange = 'verde' | 'amarillo' | 'rojo';

/**
 * Desempeño del conductor (plano del conductor, brief sección 7).
 * Los eventos vienen normalizados por cada 100 km.
 *
 * Nota de escala: en el modelo crudo el backend SUMA eventos, así que más
 * eventos = peor. Para presentarlo como "cuidado" y no como castigo (brief
 * sección 13), exponemos un **índice de manejo seguro** ya invertido: 0–100
 * donde 100 = manejo perfecto (sin eventos) y más alto siempre es mejor.
 */
export interface DriverScore {
  userId: string;
  excesosVelocidad100km: number;
  frenadasBruscas100km: number;
  aceleracionesBruscas100km: number;
  /** Índice de manejo seguro: 0–100, 100 = perfecto. Más alto es mejor. */
  scoreTotal: number;
  rango: ScoreRange;
}

// ──────────────────── Jornada del conductor (inicio) ──────────────────────

/**
 * Estado de la inspección preoperacional del día (FOM-DRIVER, brief §22):
 * - `pendiente`: aún no se hace hoy; el conductor debe realizarla antes de salir.
 * - `aprobada`: hecha y sin fallas críticas; puede salir.
 * - `bloqueada`: una falla crítica impide la salida (se generó una OT).
 */
export type InspeccionEstado =
  | 'pendiente'
  | 'aprobada'
  | 'aprobada_con_observaciones'
  | 'bloqueada';

/** Resumen de la inspección preoperacional del día, para la tarjeta de inicio. */
export interface InspeccionDiaria {
  /** Fecha ISO (día) a la que corresponde. */
  fecha: string;
  estado: InspeccionEstado;
  /** Total de ítems del checklist (para mostrar el avance). */
  totalItems: number;
  /** Ítems ya revisados hoy. */
  itemsRevisados: number;
  /** Marca de tiempo ISO en que se completó, o `null` si aún no. */
  completadaEn: string | null;
}

/** Motivo por el que un conductor NO está apto para salir hoy. */
export type NoAptoMotivo = 'inspeccion_pendiente' | 'inspeccion_bloqueada';

/**
 * Aptitud del conductor para salir hoy (el "hilo" del día). Hoy se decide por
 * la inspección preoperacional; mañana el backend podrá sumar más condiciones
 * (documentos vigentes, licencia al día, etc.).
 */
export interface AptitudDelDia {
  apto: boolean;
  /** Motivo cuando no es apto (`null` si está apto). */
  motivo: NoAptoMotivo | null;
  /** La inspección del día en la que se basa. */
  inspeccion: InspeccionDiaria;
}

/**
 * Severidad de una alerta que se muestra al conductor. Mapea a los colores
 * semánticos del tema (info = azul, advertencia = amarillo, critica = rojo).
 */
export type AlertaSeveridad = 'info' | 'advertencia' | 'critica';

/**
 * Tipo de excepción que originó la alerta (operación por excepciones, brief §8):
 * seguridad, mantenimiento, documento vencido…
 */
export type AlertaCategoria = 'seguridad' | 'mantenimiento' | 'documento' | 'otro';

/** Aviso dirigido al conductor, originado por una excepción real. */
export interface Alerta {
  id: string;
  titulo: string;
  detalle: string;
  severidad: AlertaSeveridad;
  /** Tipo de excepción (para agrupar y etiquetar). */
  categoria: AlertaCategoria;
  /**
   * De qué es la alerta: PERSONAL (documentos propios, perfil) o del
   * VEHÍCULO (mantenimiento/seguridad de la unidad). Separa las dos listas
   * en la vista del conductor.
   */
  ambito?: 'personal' | 'vehiculo';
  /** Ruta a la que lleva la alerta (ej. "/documentos"), si aplica. */
  enlace?: string;
  /** Fotos adjuntas (URLs; en Cloudinary con el backend). */
  fotoUrls?: string[];
  /** ISO de creación. */
  creadaEn: string;
  leida: boolean;
}

/**
 * Resumen de avisos para la tarjeta de inicio: cuántas alertas sin leer, más la
 * alerta más reciente para mostrarla de un vistazo.
 */
export interface ResumenAvisos {
  alertasNoLeidas: number;
  /** La alerta más reciente sin leer (o `null` si no hay). */
  ultimaAlerta: Alerta | null;
}

/** Estado de vigencia de un documento del vehículo. */
export type DocumentoEstado = 'vigente' | 'por_vencer' | 'vencido';

/** Ámbito de un documento: del vehículo o del conductor. */
export type DocumentoAmbito = 'vehiculo' | 'conductor';

/** Documento (del vehículo o del conductor): SOAT, tecnomecánica, licencia… */
export interface Documento {
  id: string;
  /** Nombre del documento (ej. "SOAT", "Licencia de conducir"). */
  tipo: string;
  /** A quién pertenece: al VEHÍCULO o a la PERSONA (usuario). */
  ambito: DocumentoAmbito;
  estado: DocumentoEstado;
  /** ISO de vencimiento (de aquí saltan las alertas por vencer). */
  venceEn: string;
  /** Fotos del documento (URLs; en Cloudinary con el backend). */
  fotoUrls?: string[];
}

// ──────────────────────────────── Emergencia ─────────────────────────────

/** Tipo de emergencia que reporta el conductor. */
export type EmergenciaTipo = 'accidente' | 'mecanica' | 'salud' | 'seguridad' | 'otro';

/** Estado de una emergencia (SOS): activa → atendida (resuelta) o cancelada. */
export type EmergenciaEstado = 'activa' | 'atendida' | 'cancelada';

/** Quién escribe en el seguimiento de la emergencia. */
export type EmergenciaAutor = 'operador' | 'conductor' | 'sistema';

/** Mensaje del seguimiento en vivo de una emergencia. */
export interface EmergenciaMensaje {
  id: string;
  autor: EmergenciaAutor;
  texto: string;
  /** ISO. */
  hora: string;
}

/**
 * Emergencia (SOS) del conductor. Se activa primero (compartiendo ubicación) y
 * el tipo se define después, ya en contacto con el operador. La Consola Web la
 * ve en tiempo real (brief §22).
 */
export interface Emergencia {
  id: string;
  /** Tipo, elegido durante el seguimiento (`null` hasta que se define). */
  tipo: EmergenciaTipo | null;
  estado: EmergenciaEstado;
  /** ISO de creación. */
  creadaEn: string;
  /** Ubicación compartida al pedir ayuda. */
  ubicacionTexto: string;
  /** Quién atiende desde la central (mock). */
  operador?: string;
  /** Teléfono de contacto de la central. */
  telefonoCentral?: string;
  /** Seguimiento en vivo con el operador. */
  seguimiento: EmergenciaMensaje[];
}

/** Datos para activar un SOS (el tipo se define luego, en el seguimiento). */
export interface EnviarSOSInput {
  driverId: string;
  vehicleId: string;
  ubicacionTexto: string;
}

// ─────────────────── Inspección preoperacional (checklist) ────────────────

/**
 * Respuesta posible a un ítem del checklist (FOM-02 §4.1):
 * ✅ Conforme · ⚠️ Observación · ❌ Falla (→ ¿crear ODT?).
 */
export type InspeccionItemEstado = 'conforme' | 'observacion' | 'falla';

/**
 * Ítem del checklist preoperacional. Si es `critico` y el conductor lo marca en
 * falla, la app bloquea la salida y genera una OT automática (brief §22).
 */
export interface InspeccionItem {
  id: string;
  /** Categoría a la que pertenece (llantas, frenos, luces…). */
  categoria: string;
  /** Qué se revisa (ej. "Presión y estado de las llantas"). */
  nombre: string;
  /** Si falla, bloquea la salida y genera OT. */
  critico: boolean;
  /** Ayuda breve de qué mirar. */
  ayuda?: string;
}

/** Grupo de ítems del checklist bajo una categoría. */
export interface InspeccionCategoria {
  nombre: string;
  items: InspeccionItem[];
}

/** Plantilla del checklist preoperacional, según el tipo de vehículo. */
export interface InspeccionPlantilla {
  tipo: VehicleType;
  categorias: InspeccionCategoria[];
}

/** Respuesta del conductor a un ítem del checklist. */
export interface InspeccionItemRespuesta {
  itemId: string;
  estado: InspeccionItemEstado;
  /** Nota opcional (qué observó). */
  nota?: string;
  /** URIs locales de la evidencia (foto de la falla). */
  evidenciaUris?: string[];
  /**
   * "¿Crear ODT?" en fallas NO críticas (§4.1: pregunta, no automatismo). Las
   * fallas críticas generan su ODT siempre y bloquean la salida (regla nuestra
   * que se conserva).
   */
  crearOdt?: boolean;
}

/** Datos para enviar la inspección completa. */
export interface EnviarInspeccionInput {
  vehicleId: string;
  driverId: string;
  ubicacionTexto: string;
  respuestas: InspeccionItemRespuesta[];
}

/**
 * Resultado de enviar la inspección: si el conductor puede salir o si quedó
 * bloqueado por una falla crítica (con las OT que se generaron).
 */
export interface ResultadoInspeccion {
  /**
   * `aprobada` = sin fallas · `aprobada_con_observaciones` = fallas no críticas
   * (puede salir) · `bloqueada` = falla crítica, salida detenida.
   */
  estado: 'aprobada' | 'aprobada_con_observaciones' | 'bloqueada';
  /** Total de ítems marcados en falla. */
  fallas: number;
  /** Fallas en ítems críticos (las que bloquean). */
  fallasCriticas: number;
  /** ODT generadas automáticamente por las fallas críticas. */
  ordenesGeneradas: WorkOrder[];
  /** Marca de tiempo ISO de finalización. */
  completadaEn: string;
}

// ─────────────────── Reglas de alerta (FOM-02 §3.6) ───────────────────────

/** Tipo de regla: exceso de velocidad, o mantenimiento preventivo por km. */
export type ReglaAlertaTipo = 'velocidad' | 'mantenimiento';

/**
 * Regla de alerta configurable (FOM-02 §3.6): la crea el supervisor y se
 * asigna a UN vehículo o a VARIOS (en la práctica también "por área"). Cada
 * vehículo asignado se monitorea con esa regla; al cumplirse una de
 * mantenimiento, el sistema crea la ODT preventiva solo (§3.4).
 */
export interface ReglaAlerta {
  id: string;
  companyId: string;
  tipo: ReglaAlertaTipo;
  /** Límite: km/h (velocidad) o km entre servicios (mantenimiento). */
  umbral: number;
  /** Qué servicio controla (mantenimiento, ej. "Cambio de aceite"). */
  servicio?: string;
  /** Vehículos asignados (1..N). */
  vehicleIds: string[];
  /** Quién la creó. */
  creadaPor: string;
  activa: boolean;
  /** Km acumulados desde el último servicio, por vehículo (mock del contador §3.4). */
  progresoKm?: Record<string, number>;
}

/**
 * Notificación in-app del panel (D7: in-app en el mock; push con el backend).
 * Ej.: "Nueva ODT — Unidad 07", "Cambio de aceite: cumplido".
 */
export interface NotificacionPanel {
  id: string;
  companyId: string;
  tipo: 'odt_nueva' | 'alerta_cumplida' | 'otro';
  titulo: string;
  detalle: string;
  /** ODT relacionada (para abrirla directo). */
  odtId?: string;
  creadaEn: string;
  leida: boolean;
}

// ──────────────────────────── Órdenes de trabajo ─────────────────────────

/**
 * Estados de una ODT (orden de trabajo), en orden de avance (FOM-02 §3.3):
 * abierta → en_revision (el supervisor la abre y gestiona) → cerrada.
 */
export type OdtEstado = 'abierta' | 'en_revision' | 'cerrada';

/** Estados de ODT en su orden de avance (para selectores y stepper). */
export const ODT_ESTADOS: OdtEstado[] = ['abierta', 'en_revision', 'cerrada'];

/**
 * Origen de una ODT (FOM-02 §3.3–§3.4): `correctiva` la reporta un conductor;
 * `preventiva` la crea sola el sistema cuando se cumple una alerta de
 * mantenimiento (llega con el bloque de reglas de alerta).
 */
export type OdtTipo = 'correctiva' | 'preventiva';

/**
 * @deprecated Estados LEGADOS de la OT (brief §8), sustituidos por `OdtEstado`
 * (FOM-02 §3.3). Conviven hasta que la Fase B apruebe su retiro. Mapa de
 * migración: Enviada→abierta · Revisada/En proceso→en_revision · Realizada→cerrada.
 */
export type WorkOrderStatus = 'Enviada' | 'Revisada' | 'En proceso' | 'Realizada';

/** @deprecated Ver `WorkOrderStatus`; usar `ODT_ESTADOS`. */
export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'Enviada',
  'Revisada',
  'En proceso',
  'Realizada',
];

/** Tipo de falla (opcional al reportar). */
export type FaultType = 'motor' | 'frenos' | 'neumaticos' | 'electrico' | 'carroceria' | 'otro';

/** ODT (orden de trabajo) / reporte de falla. */
export interface WorkOrder {
  id: string;
  vehicleId: string;
  driverId: string;
  descripcion: string;
  /** Tipo de falla, si el conductor lo indicó. */
  tipoFalla?: FaultType;
  /** Origen de la ODT (§3.3–§3.4). Opcional mientras convive el modelo legado. */
  tipo?: OdtTipo;
  /**
   * A qué título la creó el conductor (FOM-02 §3.3 "QUIÉN LA CREÓ"): titular de
   * la unidad, o secundario identificado por su PIN.
   */
  autorVia?: 'principal' | 'secundario';
  /** Regla que la generó (solo preventivas, §3.4): al cerrarla, el contador se reinicia. */
  reglaAlertaId?: string;
  estado: OdtEstado;
  /** Marca de tiempo ISO de creación. */
  creadaEn: string;
  ubicacionTexto: string;
  /** Evidencia adjunta por el conductor (URLs de fotos). */
  evidenciaUrls?: string[];
  /** Qué se hizo para resolverla; lo escribe el supervisor al completar (§3.3). */
  notaSolucion?: string;
  /** Costo de la solución (§3.3). */
  costo?: number;
  /** Factura / foto de la resolución (URLs), parte del cierre (§3.3). */
  evidenciaResolucionUrls?: string[];
  /** Fecha de resolución (ISO); se fija al cerrar la ODT (§3.3). */
  resueltaEn?: string;
}

/**
 * Orden de trabajo enriquecida para listas de administración: añade las
 * etiquetas legibles (vehículo y conductor) que el admin necesita ver de un
 * vistazo, resueltas en la capa de servicios a partir de los ids.
 */
export interface WorkOrderListItem extends WorkOrder {
  /** Etiqueta del vehículo, ej. "U-014 · Toyota Hilux". */
  vehicleLabel: string;
  /** Nombre del conductor que generó el reporte. */
  driverName: string;
}

// ─────────────────────────── Dashboard de empresa ─────────────────────────

/** Coordenadas geográficas simples (mapa). */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Marcador de un vehículo en el mapa de flota (modo multi-vehículo).
 * Forma de presentación: lo construye el dashboard a partir de la flota.
 */
export interface MapMarker {
  id: string;
  /** Texto del globo del marcador (ej. número de unidad). */
  label: string;
  coords: LatLng;
  /** En marcha (verde) vs. parado (gris). */
  live: boolean;
}

/**
 * Vehículo de la flota con su estado resumido, para el dashboard del admin.
 * Combina el plano del vehículo (GPS) con el conductor actual (vía chip).
 */
export interface FleetVehicle {
  vehicle: Vehicle;
  estado: VehicleStatus;
  velocidadKmh: number;
  /** Odómetro acumulado (km) — lo pide la vista personal (FOM-02 §5.2). */
  km?: number;
  /** Conductor actual emparejado por chip, o `null` si nadie lo conduce. */
  conductorActual: string | null;
  /** Id del conductor actual (para enlazar a su perfil), o `null`. */
  conductorId: string | null;
  /** Posición actual en el mapa. */
  coords: LatLng;
}

/** Resumen de la flota: las tarjetas superiores del dashboard. */
export interface FleetSummary {
  totalVehiculos: number;
  enMarcha: number;
  parados: number;
  /** ODT abiertas (abierta o en_revision, sin cerrar). */
  reportesAbiertos: number;
}

// ───────────────────────── Reportes y estadísticas ────────────────────────

/**
 * Alcance de un reporte de VEHÍCULOS (brief §6). Los reportes son del vehículo,
 * no de quién lo maneja (un vehículo puede tener varios conductores).
 * - `general`: toda la empresa.
 * - `flota`: un área de la empresa (por ubicación, sector o contrato, §3.1).
 * - `grupo`: un subconjunto elegido a mano de vehículos.
 * - `vehiculo`: un único vehículo.
 */
export type ReportScopeType = 'general' | 'flota' | 'grupo' | 'vehiculo';

/**
 * Rango de tiempo de un reporte. Hoy el mock no filtra por fecha (los datos son
 * estáticos), pero el período viaja en el alcance y se muestra; la BD real
 * filtrará por `desde`/`hasta`.
 */
export interface ReportPeriod {
  /** ISO de inicio y fin del período. */
  desde: string;
  hasta: string;
  /** Etiqueta legible (ej. "Junio 2026" o "01/06 – 15/06"). */
  label: string;
}

/** Parámetros que definen un reporte concreto. */
export interface ReportScope {
  companyId: string;
  tipo: ReportScopeType;
  /** Vehículos elegidos (1 para `vehiculo`, N para `grupo`). */
  vehicleIds?: string[];
  /** Área de la empresa elegida (para `flota`, FOM-02 §3.1). */
  areaId?: string;
  /** Rango de tiempo del reporte. */
  periodo: ReportPeriod;
}

/**
 * Métricas agregadas de un alcance, acumuladas en el período del reporte.
 * Los eventos son conteos crudos del período (no normalizados).
 */
export interface ReportMetrics {
  vehiculos: number;
  kmRecorridos: number;
  /** Índice de manejo seguro promedio (0–100, 100 = perfecto). */
  indiceSeguroPromedio: number;
  rango: ScoreRange;
  excesosVelocidad: number;
  frenadasBruscas: number;
  aceleracionesBruscas: number;
  reportesAbiertos: number;
}

/**
 * Fila de desglose por vehículo dentro de un reporte. Es del VEHÍCULO (sin
 * conductor): incluye su área y sus datos del período.
 */
export interface VehicleReportRow {
  vehicle: Vehicle;
  /** Nombre del área de la empresa a la que pertenece. */
  areaName: string;
  /** Estado actual del vehículo (en marcha / parado). */
  estado: VehicleStatus;
  km: number;
  indiceSeguro: number;
  rango: ScoreRange;
  excesosVelocidad: number;
  frenadasBruscas: number;
  aceleracionesBruscas: number;
  /** ODT abiertas del vehículo (no cerradas). */
  otAbiertas: number;
}

/** Reporte generado para un alcance: métricas + desglose por vehículo. */
export interface FleetReport {
  scope: ReportScope;
  /** Texto legible del alcance (ej. "Grupo: Carga", "Vehículo U-014"). */
  titulo: string;
  /** Período cubierto (ej. "Junio 2026"). */
  periodo: string;
  metrics: ReportMetrics;
  /** Desglose: cada vehículo del alcance con sus datos. */
  porVehiculo: VehicleReportRow[];
}

/** Estadísticas de una empresa para la vista comparativa entre empresas. */
export interface CompanyStats {
  company: Company;
  metrics: ReportMetrics;
}

// ───────────────────── Vista gerencial (FOM-02 §2) ────────────────────────

/**
 * Reporte GERENCIAL de una empresa asignada: lo que ve el supervisor de la
 * predefinida (§2.1). Derivado del histórico de ODT y sus costos — NUNCA de
 * métricas operativas (vehículos/estado, kilometraje, velocidad, disponibilidad
 * están prohibidos para este rol, §8-5). El contenido definitivo se afinará al
 * recibir el formato real de la predefinida (D2).
 */
export interface ReporteGerencial {
  companyId: string;
  /** Período cubierto (ej. "Julio 2026"). */
  periodo: string;
  odtAbiertas: number;
  odtEnRevision: number;
  odtCerradas: number;
  odtCorrectivas: number;
  odtPreventivas: number;
  /** Costo total del mantenimiento cerrado. */
  costoTotal: number;
  /** Horas promedio entre apertura y resolución (ODT cerradas), o `null` sin datos. */
  horasPromedioResolucion: number | null;
}

// ──────────── Reporte en formato de la predefinida (D2/D3) ─────────────────

/**
 * Indicador con semáforo del informe estadístico (formato real Samfor→Chevron,
 * "INFORME ESTADISTICO SIRCOP"): valor obtenido vs. nivel óptimo esperado +
 * interpretación. Verde = conformidad · amarillo = alerta · rojo = atención
 * perentoria.
 */
export interface FormatoPredefIndicador {
  nombre: string;
  valor: string;
  optimo: string;
  rango: ScoreRange;
  interpretacion: string;
}

/** Fila de "DISTANCIAS RECORRIDAS": unidad, placa, mes actual y acumulado 6 meses. */
export interface FormatoPredefFilaUnidad {
  unidadLabel: string;
  placa: string;
  recorridoActual: number;
  recorridoU6m: number;
}

/** Fila del "Cuadro de resumen por estadística" (por conductor). */
export interface FormatoPredefFilaConductor {
  conductor: string;
  /** ¿Identificado (principal/PIN)? El formato viejo vivía lleno de "SIN IDENTIFICAR". */
  identificado: boolean;
  km: number;
  horas: number;
  aceleraciones: number;
  frenadas: number;
  excesos: number;
  velocidadMax: number;
  /** Eventos por cada 100 km (menor es mejor; óptimo < 1.5). */
  score: number;
}

/** Fila de "alertas por vehículo por cada 100 km". */
export interface FormatoPredefFilaAlertas {
  unidadLabel: string;
  alertas100km: number;
  rango: ScoreRange;
}

/**
 * Informe estadístico en el FORMATO QUE EXIGE LA PREDEFINIDA (FOM-02 §2.1 y
 * §3.2), modelado sobre el informe real Samfor→Chevron y mejorado: semáforo
 * aplicado en vivo, conductores identificados por principal/PIN (adiós "SIN
 * IDENTIFICAR"), y filtrable por área (sus informes reales van por contrato:
 * Oficina, Termoeléctrica, Desmalezado).
 */
export interface FormatoPredefReporte {
  companyId: string;
  companyNombre: string;
  /** Nombre de la predefinida cuyo formato se usa (ej. "Chevron"). */
  predefinidaNombre: string;
  /** Área/contrato del informe, o `null` si es de toda la empresa. */
  areaNombre: string | null;
  periodo: string;
  indicadores: FormatoPredefIndicador[];
  distancias: FormatoPredefFilaUnidad[];
  conductores: FormatoPredefFilaConductor[];
  alertasPorVehiculo: FormatoPredefFilaAlertas[];
}

// ─────────────────────────── Reportes de usuarios ─────────────────────────

/**
 * Alcance de un reporte de USUARIOS (brief §7), aparte de los de vehículos.
 * - `general`: todos los usuarios de la empresa.
 * - `flota`: los usuarios de un área (los que han usado sus vehículos).
 * - `grupo`: un conjunto de usuarios elegido a mano.
 * - `usuario`: un único usuario.
 */
export type UserReportScopeType = 'general' | 'flota' | 'grupo' | 'usuario';

export interface UserReportScope {
  companyId: string;
  tipo: UserReportScopeType;
  /** Usuarios elegidos (1 para `usuario`, N para `grupo`). */
  userIds?: string[];
  /** Área de la empresa elegida (para `flota`, FOM-02 §3.1). */
  areaId?: string;
  periodo: ReportPeriod;
}

/** Métricas agregadas de un conjunto de usuarios en el período. */
export interface UserReportMetrics {
  usuarios: number;
  kmRecorridos: number;
  diasConducidos: number;
  horasConducidas: number;
  /** Cantidad de llenados de tanque. */
  recargas: number;
  /** Litros totales cargados. */
  litros: number;
  otReportadas: number;
}

/** Reporte de usuarios: agregado + cada usuario con sus datos y métricas. */
export interface UserReport {
  scope: UserReportScope;
  titulo: string;
  periodo: string;
  metrics: UserReportMetrics;
  usuarios: DriverProfile[];
}
