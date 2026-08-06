/**
 * Servicio del conductor (capa de datos abstracta) — jornada, inicio e
 * inspección preoperacional.
 *
 * Alimenta el INICIO y la INSPECCIÓN de FOM-DRIVER. Hoy devuelve datos
 * simulados con la misma forma async que tendrá la API real de Juan; migrar es
 * reescribir SOLO el cuerpo de cada función (marcado con «TODO API»), sin tocar
 * tipos ni pantallas.
 */

import type {
  Alerta,
  AlertaCategoria,
  AlertaSeveridad,
  AptitudDelDia,
  Documento,
  EnviarInspeccionInput,
  FaultType,
  InspeccionCategoria,
  InspeccionDiaria,
  InspeccionEstado,
  InspeccionItem,
  InspeccionPlantilla,
  NoAptoMotivo,
  ResultadoInspeccion,
  ResumenAvisos,
  User,
  VehicleType,
  WorkOrder,
} from '@/types';

import { subirFotosCloudinary } from '@/lib/cloudinary';
import { supabase } from '@/lib/supabase';
import { encolar } from '@/sync/outbox';
import { formatFecha } from '@/utils/date';

import { esIdDb } from './db';
import { fakeNetwork, seed } from './network';
import { notificar } from './notificationService';
import { crearOrdenDeTrabajo } from './workOrderService';

// ───────────────────────────── DATOS MOCK ─────────────────────────────────

/** Fecha ISO del día de hoy (sin hora), para anclar los mocks al día actual. */
function hoyISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** ISO de hoy con una hora concreta (para simular salidas y avisos del día). */
function hoyAlas(hora: number, minuto = 0): string {
  const d = new Date();
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

/** ISO a N días de hoy (para vencimientos de documentos). */
function enDias(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Estado de la inspección del día. Es MUTABLE: al enviar la inspección se
// actualiza para que el Inicio refleje el resultado (aprobada / bloqueada).
let _inspeccionDia: InspeccionDiaria = {
  fecha: hoyISO(),
  estado: 'pendiente',
  totalItems: 12,
  itemsRevisados: 0,
  completadaEn: null,
};

// Documentos del vehículo y del conductor (mock).
// Documentos del vehículo según FOM-02 (§1.2 paso 2 / §8-2): trimestres, RCV,
// carné de circulación y póliza de seguro (sustituyen los datos colombianos
// del mock inicial — cambio de datos, no de forma).
const MOCK_DOCS_VEHICULO: Documento[] = seed<Documento>([
  { id: 'doc-trimestres', tipo: 'Trimestres', ambito: 'vehiculo', estado: 'vigente', venceEn: enDias(80) },
  { id: 'doc-rcv', tipo: 'Responsabilidad civil (RCV)', ambito: 'vehiculo', estado: 'por_vencer', venceEn: enDias(18) },
  { id: 'doc-carnet', tipo: 'Carné de circulación', ambito: 'vehiculo', estado: 'vigente', venceEn: enDias(900) },
  { id: 'doc-poliza', tipo: 'Póliza de seguro', ambito: 'vehiculo', estado: 'vigente', venceEn: enDias(210) },
]);

// Documentos de la persona según FOM-02 (§5.2/§6.1): licencia, carta médica y
// cédula.
const MOCK_DOCS_CONDUCTOR: Documento[] = seed<Documento>([
  { id: 'doc-licencia', tipo: 'Licencia de conducir', ambito: 'conductor', estado: 'vigente', venceEn: enDias(430) },
  { id: 'doc-carta-medica', tipo: 'Carta médica', ambito: 'conductor', estado: 'por_vencer', venceEn: enDias(25) },
  { id: 'doc-cedula', tipo: 'Cédula de identidad', ambito: 'conductor', estado: 'vigente', venceEn: enDias(1600) },
]);

/**
 * Genera alertas por excepción a partir de los documentos por vencer o vencidos
 * (operación por excepciones, brief §8). Cada una enlaza a Documentos.
 */
function alertasDeDocumentos(docs: Documento[]): Alerta[] {
  return docs
    .filter((d) => d.estado !== 'vigente')
    .map((d) => ({
      id: `al-doc-${d.id}`,
      titulo: d.estado === 'vencido' ? `${d.tipo} vencido` : `${d.tipo} por vencer`,
      detalle: `${d.ambito === 'vehiculo' ? 'Documento de tu unidad' : 'Tu documento'} vence el ${formatFecha(d.venceEn)}. Tenlo al día.`,
      severidad: d.estado === 'vencido' ? ('critica' as const) : ('advertencia' as const),
      categoria: 'documento' as const,
      // Documentos propios de la persona → alerta PERSONAL; los del vehículo, de la unidad.
      ambito: d.ambito === 'conductor' ? ('personal' as const) : ('vehiculo' as const),
      // La alerta entra DIRECTO al documento (su detalle), no a la lista.
      enlace: `/documento?id=${d.id}`,
      creadaEn: hoyAlas(7, 5),
      leida: false,
    }));
}

// Alertas del conductor (mutable: se pueden marcar como leídas). Se arman a
// partir de excepciones reales; las de documentos salen de los vencimientos.
let _alertas: Alerta[] = seed<Alerta>([
  {
    id: 'al-mant',
    titulo: 'Mantenimiento próximo',
    detalle: 'Tu unidad alcanza los 90.000 km en pocos días. Programa el servicio.',
    severidad: 'advertencia',
    categoria: 'mantenimiento',
    ambito: 'vehiculo',
    creadaEn: hoyAlas(7, 15),
    leida: false,
  },
  {
    id: 'al-seg',
    titulo: 'Zona de precaución',
    detalle: 'Vía con obras en la ruta a Planta Norte. Reduce la velocidad.',
    severidad: 'critica',
    categoria: 'seguridad',
    ambito: 'vehiculo',
    creadaEn: hoyAlas(6, 50),
    leida: true,
  },
  ...alertasDeDocumentos([...MOCK_DOCS_VEHICULO, ...MOCK_DOCS_CONDUCTOR]),
]);

/** Calcula el resumen de avisos a partir del estado actual de las alertas. */
function calcularResumen(): ResumenAvisos {
  const noLeidas = _alertas.filter((a) => !a.leida);
  return {
    alertasNoLeidas: noLeidas.length,
    // La más reciente sin leer.
    ultimaAlerta:
      [...noLeidas].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))[0] ?? null,
  };
}

// Plantilla del checklist preoperacional (12 ítems en 6 categorías). Los ítems
// críticos, al fallar, bloquean la salida y generan una OT automática.
const MOCK_CATEGORIAS: InspeccionCategoria[] = [
  {
    nombre: 'Llantas',
    items: [
      { id: 'insp-llantas-1', categoria: 'Llantas', nombre: 'Presión y estado de las llantas', critico: true, ayuda: 'Sin cortes, desgaste parejo, sin objetos clavados.' },
      { id: 'insp-llantas-2', categoria: 'Llantas', nombre: 'Llanta de repuesto y herramientas', critico: false },
    ],
  },
  {
    nombre: 'Frenos',
    items: [
      { id: 'insp-frenos-1', categoria: 'Frenos', nombre: 'Pedal de freno y freno de mano', critico: true, ayuda: 'Firme, sin ir hasta el fondo; el de mano retiene.' },
      { id: 'insp-frenos-2', categoria: 'Frenos', nombre: 'Nivel de líquido de frenos', critico: true },
    ],
  },
  {
    nombre: 'Luces',
    items: [
      { id: 'insp-luces-1', categoria: 'Luces', nombre: 'Luces delanteras y traseras', critico: true, ayuda: 'Altas, bajas, freno y reversa encienden.' },
      { id: 'insp-luces-2', categoria: 'Luces', nombre: 'Direccionales y estacionarias', critico: false },
    ],
  },
  {
    nombre: 'Motor y fluidos',
    items: [
      { id: 'insp-motor-1', categoria: 'Motor y fluidos', nombre: 'Nivel de aceite', critico: false },
      { id: 'insp-motor-2', categoria: 'Motor y fluidos', nombre: 'Nivel de refrigerante', critico: false },
      { id: 'insp-motor-3', categoria: 'Motor y fluidos', nombre: 'Fugas visibles bajo el vehículo', critico: true, ayuda: 'Manchas de aceite, refrigerante o combustible.' },
    ],
  },
  {
    nombre: 'Cabina y seguridad',
    items: [
      { id: 'insp-cabina-1', categoria: 'Cabina y seguridad', nombre: 'Cinturones de seguridad', critico: true },
      { id: 'insp-cabina-2', categoria: 'Cabina y seguridad', nombre: 'Espejos y limpiaparabrisas', critico: false },
    ],
  },
  {
    nombre: 'Documentos',
    items: [
      { id: 'insp-docs-1', categoria: 'Documentos', nombre: 'Documentos del vehículo al día', critico: false, ayuda: 'SOAT, tecnomecánica y tarjeta de propiedad.' },
    ],
  },
];

// Ítems extra para camiones (carga y acople) — no aplican a camioneta/auto.
const CATEGORIA_CAMION: InspeccionCategoria = {
  nombre: 'Carga y acople',
  items: [
    { id: 'insp-carga-1', categoria: 'Carga y acople', nombre: 'Quinta rueda / acople', critico: true, ayuda: 'Enganche firme y asegurado.' },
    { id: 'insp-carga-2', categoria: 'Carga y acople', nombre: 'Amarres y sujeción de la carga', critico: true },
    { id: 'insp-carga-3', categoria: 'Carga y acople', nombre: 'Frenos de aire (presión y fugas)', critico: true },
  ],
};

// Plantilla del checklist SEGÚN el tipo de vehículo. El camión suma la categoría
// de carga y acople; camioneta/auto/otro usan la base.
const PLANTILLAS: Record<VehicleType, InspeccionCategoria[]> = {
  camioneta: MOCK_CATEGORIAS,
  auto: MOCK_CATEGORIAS,
  otro: MOCK_CATEGORIAS,
  camion: [...MOCK_CATEGORIAS, CATEGORIA_CAMION],
};

/** Índice de TODOS los ítems por id (de todas las plantillas), para resolver las
 * respuestas al enviar. */
const ITEMS_POR_ID: Record<string, InspeccionItem> = Object.fromEntries(
  Object.values(PLANTILLAS)
    .flatMap((cats) => cats.flatMap((c) => c.items))
    .map((it) => [it.id, it]),
);

/** Traduce una categoría del checklist al tipo de falla de la OT. */
function categoriaAFalla(categoria: string): FaultType {
  const c = categoria.toLowerCase();
  if (c.includes('llanta')) return 'neumaticos';
  if (c.includes('freno')) return 'frenos';
  if (c.includes('luces') || c.includes('luz')) return 'electrico';
  if (c.includes('motor') || c.includes('fluido')) return 'motor';
  if (c.includes('cabina')) return 'carroceria';
  return 'otro';
}

// ───────────────────────────── SERVICIOS ──────────────────────────────────

/**
 * Estado de inspección del día de UN vehículo, para que el admin lo vea reflejado
 * (lo que hace el conductor aparece solo). El vehículo real (`veh-014`) devuelve
 * el estado en vivo; el resto, un mock determinista.
 *
 * TODO API: GET /vehiculos/:vehicleId/inspeccion-del-dia/estado
 */
export async function getInspeccionVehiculo(vehicleId: string): Promise<InspeccionEstado> {
  // BD provisional: la inspección de HOY de esa unidad (de quien sea).
  if (supabase && esIdDb(vehicleId)) {
    const { data } = await supabase
      .from('inspecciones')
      .select('resultado')
      .eq('vehiculo_id', vehicleId)
      .eq('fecha', new Date().toISOString().slice(0, 10))
      .limit(1)
      .maybeSingle();
    return ((data as { resultado: InspeccionEstado } | null)?.resultado ?? 'pendiente');
  }
  if (vehicleId === 'veh-014') return fakeNetwork(_inspeccionDia.estado, 120);
  const estados: InspeccionEstado[] = ['aprobada', 'pendiente', 'aprobada_con_observaciones', 'bloqueada'];
  const n = [...vehicleId].reduce((a, c) => a + c.charCodeAt(0), 0) % estados.length;
  return fakeNetwork(estados[n], 120);
}

/**
 * Inspección preoperacional del día para el conductor. Determina si puede salir
 * o si debe completar el chequeo primero.
 *
 * TODO API: GET /conductores/me/inspeccion-del-dia
 */
export async function getInspeccionDelDia(_user?: User): Promise<InspeccionDiaria> {
  // BD provisional: la inspección de HOY del conductor real.
  if (supabase && _user && esIdDb(_user.id)) {
    const hoy = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('inspecciones')
      .select('id, resultado, creada_en, respuestas:inspeccion_respuestas(item_id)')
      .eq('driver_id', _user.id)
      .eq('fecha', hoy)
      .limit(1)
      .maybeSingle();
    const f = data as unknown as {
      resultado: InspeccionDiaria['estado'];
      creada_en: string;
      respuestas: { item_id: string }[];
    } | null;
    if (f) {
      return {
        fecha: hoy,
        estado: f.resultado,
        totalItems: f.respuestas.length,
        itemsRevisados: f.respuestas.length,
        completadaEn: f.creada_en,
      };
    }
    return { fecha: hoy, estado: 'pendiente', totalItems: 12, itemsRevisados: 0, completadaEn: null };
  }
  return fakeNetwork(_inspeccionDia);
}

/** Aptitud del día a partir del estado actual de la inspección. */
function aptitudActual(): AptitudDelDia {
  const estado = _inspeccionDia.estado;
  // Aprobada (con o sin observaciones) habilita salir; bloqueada/pendiente no.
  const apto = estado === 'aprobada' || estado === 'aprobada_con_observaciones';
  const motivo: NoAptoMotivo | null = apto
    ? null
    : estado === 'bloqueada'
      ? 'inspeccion_bloqueada'
      : 'inspeccion_pendiente';
  return { apto, motivo, inspeccion: _inspeccionDia };
}

/**
 * Aptitud del conductor para salir hoy (el hilo del día): apto solo con la
 * inspección aprobada. Lo usa el Inicio para guiar la jornada.
 *
 * TODO API: GET /conductores/me/aptitud-del-dia
 */
export async function getAptitudDelDia(_user?: User): Promise<AptitudDelDia> {
  // BD provisional: la aptitud se deriva de la inspección real del día.
  if (supabase && _user && esIdDb(_user.id)) {
    const inspeccion = await getInspeccionDelDia(_user);
    const apto = inspeccion.estado === 'aprobada' || inspeccion.estado === 'aprobada_con_observaciones';
    const motivo: NoAptoMotivo | null = apto
      ? null
      : inspeccion.estado === 'bloqueada'
        ? 'inspeccion_bloqueada'
        : 'inspeccion_pendiente';
    return { apto, motivo, inspeccion };
  }
  return fakeNetwork(aptitudActual());
}

/**
 * Plantilla del checklist preoperacional SEGÚN el tipo de vehículo (Módulo 7).
 *
 * TODO API: GET /vehiculos/tipos/:tipo/inspeccion/plantilla
 */
export async function getPlantillaInspeccion(
  tipo: VehicleType = 'otro',
): Promise<InspeccionPlantilla> {
  // BD provisional: el checklist vive en `inspeccion_items` ('{}' = todos).
  if (supabase) {
    const { data } = await supabase
      .from('inspeccion_items')
      .select('id, categoria, nombre, critico, ayuda, tipos')
      .order('id');
    if (data && data.length > 0) {
      const filas = data as unknown as {
        id: string;
        categoria: string;
        nombre: string;
        critico: boolean;
        ayuda: string | null;
        tipos: VehicleType[];
      }[];
      const aplican = filas.filter((f) => f.tipos.length === 0 || f.tipos.includes(tipo));
      const categorias: InspeccionCategoria[] = [];
      for (const f of aplican) {
        let cat = categorias.find((c) => c.nombre === f.categoria);
        if (!cat) {
          cat = { nombre: f.categoria, items: [] };
          categorias.push(cat);
        }
        cat.items.push({ id: f.id, categoria: f.categoria, nombre: f.nombre, critico: f.critico, ayuda: f.ayuda ?? undefined });
      }
      return { tipo, categorias };
    }
  }
  return fakeNetwork({ tipo, categorias: PLANTILLAS[tipo] ?? MOCK_CATEGORIAS });
}

/**
 * Notifica al supervisor (mock). Se llama al bloquear una unidad por inspección
 * crítica, para escalar y decidir reasignar o esperar reparación.
 *
 * TODO API: POST /supervisores/notificar
 */
export async function notificarSupervisor(_motivo: string): Promise<void> {
  return fakeNetwork(undefined, 300);
}

/**
 * El conductor pide otra unidad tras un bloqueo (reasignación).
 *
 * TODO API: POST /conductores/me/solicitar-reasignacion
 */
export async function solicitarOtraUnidad(_user?: User): Promise<void> {
  return fakeNetwork(undefined, 400);
}

/**
 * Envía la inspección completa (FOM-02 §4.1, tres respuestas: Conforme /
 * Observación / Falla). Cada falla NO crítica pregunta "¿crear ODT?"; las
 * fallas en ítems CRÍTICOS crean su ODT SIEMPRE y bloquean la salida (regla
 * nuestra que se conserva). Actualiza el estado del día para el Inicio.
 *
 * TODO API: POST /conductores/me/inspeccion (con evidencia adjunta). El backend
 * decidirá el bloqueo y creará las ODT; aquí se simula de punta a punta.
 */
export async function enviarInspeccion(input: EnviarInspeccionInput): Promise<ResultadoInspeccion> {
  // Resuelve las respuestas en falla contra la plantilla.
  const fallas = input.respuestas
    .filter((r) => r.estado === 'falla')
    .map((r) => ({ r, item: ITEMS_POR_ID[r.itemId] }))
    .filter((x) => x.item);
  const criticas = fallas.filter((x) => x.item.critico);
  const observaciones = input.respuestas.filter((r) => r.estado === 'observacion');
  // ODT a crear: TODAS las críticas (automático) + las no críticas donde el
  // conductor respondió "sí" a ¿crear ODT? (§4.1).
  const conOdt = fallas.filter((x) => x.item.critico || x.r.crearOdt === true);

  const ordenesGeneradas: WorkOrder[] = [];
  for (const { r, item } of conOdt) {
    const ot = await crearOrdenDeTrabajo({
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      descripcion: `Inspección diaria — ${item.categoria}: ${item.nombre}.${
        r.nota ? ` ${r.nota.trim()}` : ''
      }`,
      tipoFalla: categoriaAFalla(item.categoria),
      ubicacionTexto: input.ubicacionTexto,
      evidenciaUris: r.evidenciaUris ?? [],
    });
    ordenesGeneradas.push(ot);
  }

  // Resultado: crítica → bloqueada; falla no crítica u observación →
  // aprobada con observaciones; todo conforme → aprobada.
  const estado: ResultadoInspeccion['estado'] =
    criticas.length > 0
      ? 'bloqueada'
      : fallas.length > 0 || observaciones.length > 0
        ? 'aprobada_con_observaciones'
        : 'aprobada';
  const completadaEn = new Date().toISOString();

  // Refleja el resultado en el estado del día (lo lee el Inicio).
  _inspeccionDia = {
    ..._inspeccionDia,
    estado,
    itemsRevisados: input.respuestas.length,
    completadaEn,
  };

  // Falla crítica → avisa al supervisor para reasignar o esperar reparación.
  if (estado === 'bloqueada') {
    await notificarSupervisor(
      `Vehículo ${input.vehicleId} bloqueado en inspección preoperacional (${criticas.length} falla(s) crítica(s)).`,
    );
  }

  // BD provisional: la inspección del día se guarda de verdad (una por
  // conductor/vehículo/día: reenviar reemplaza las respuestas).
  if (supabase && esIdDb(input.vehicleId) && esIdDb(input.driverId)) {
    const { data: insp } = await supabase
      .from('inspecciones')
      .upsert(
        {
          vehiculo_id: input.vehicleId,
          driver_id: input.driverId,
          resultado: estado,
          ubicacion: input.ubicacionTexto,
        },
        { onConflict: 'vehiculo_id,driver_id,fecha' },
      )
      .select('id')
      .single();
    const inspeccionId = (insp as { id: string } | null)?.id;
    if (inspeccionId) {
      await supabase.from('inspeccion_respuestas').delete().eq('inspeccion_id', inspeccionId);
      const respuestas = [] as {
        inspeccion_id: string;
        item_id: string;
        estado: string;
        nota: string | null;
        evidencia_urls: string[];
        crear_odt: boolean | null;
      }[];
      for (const r of input.respuestas) {
        respuestas.push({
          inspeccion_id: inspeccionId,
          item_id: r.itemId,
          estado: r.estado,
          nota: r.nota?.trim() || null,
          evidencia_urls: r.evidenciaUris?.length ? await subirFotosCloudinary(r.evidenciaUris) : [],
          crear_odt: r.crearOdt ?? null,
        });
      }
      if (respuestas.length > 0) {
        await supabase.from('inspeccion_respuestas').insert(respuestas);
      }
    }
  }

  // Encola el envío de la inspección (offline-first). Las OT ya se encolaron
  // dentro de `crearOrdenDeTrabajo`.
  await encolar('inspeccion', 'Inspección preoperacional', async () => {
    await fakeNetwork(undefined, 600);
    // TODO API: POST /conductores/me/inspeccion
  });

  return {
    estado,
    fallas: fallas.length,
    fallasCriticas: criticas.length,
    ordenesGeneradas,
    completadaEn,
  };
}

/**
 * Resumen de avisos (alertas sin leer) para la tarjeta de inicio.
 *
 * TODO API: GET /conductores/me/avisos/resumen
 */
export async function getResumenAvisos(_user?: User): Promise<ResumenAvisos> {
  // BD provisional: el resumen sale de las alertas reales del conductor.
  if (supabase && _user && esIdDb(_user.id)) {
    const alertas = await getAlertas(_user);
    const noLeidas = alertas.filter((a) => !a.leida);
    return {
      alertasNoLeidas: noLeidas.length,
      ultimaAlerta: [...noLeidas].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))[0] ?? null,
    };
  }
  return fakeNetwork(calcularResumen());
}

/**
 * Lista de alertas del conductor (para la pestaña Alertas), más recientes
 * primero.
 *
 * TODO API: GET /conductores/me/alertas
 */
/** Fila de `alertas_conductor` en la BD. */
type AlertaRow = {
  id: string;
  titulo: string;
  detalle: string;
  severidad: AlertaSeveridad;
  categoria: AlertaCategoria;
  ambito: 'personal' | 'vehiculo';
  foto_urls: string[];
  enlace: string | null;
  leida: boolean;
  creada_en: string;
};

export async function getAlertas(_user?: User): Promise<Alerta[]> {
  // BD provisional: las guardadas + las derivadas de TUS documentos por vencer.
  if (supabase && _user && esIdDb(_user.id)) {
    const [{ data }, docs] = await Promise.all([
      supabase
        .from('alertas_conductor')
        .select('id, titulo, detalle, severidad, categoria, ambito, foto_urls, enlace, leida, creada_en')
        .eq('user_id', _user.id)
        .order('creada_en', { ascending: false }),
      getDocumentosConductor(_user),
    ]);
    const guardadas: Alerta[] = ((data ?? []) as unknown as AlertaRow[]).map((f) => ({
      id: f.id,
      titulo: f.titulo,
      detalle: f.detalle,
      severidad: f.severidad,
      categoria: f.categoria,
      ambito: f.ambito,
      fotoUrls: f.foto_urls.length > 0 ? f.foto_urls : undefined,
      enlace: f.enlace ?? undefined,
      creadaEn: f.creada_en,
      leida: f.leida,
    }));
    const derivadas = alertasDeDocumentos(docs);
    return [...guardadas, ...derivadas];
  }
  const ordenadas = [..._alertas].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
  return fakeNetwork(ordenadas);
}

/**
 * Marca una alerta como leída.
 *
 * TODO API: POST /conductores/me/alertas/:id/leida
 */
export async function marcarAlertaLeida(id: string): Promise<void> {
  if (supabase && esIdDb(id)) {
    await supabase.from('alertas_conductor').update({ leida: true }).eq('id', id);
    return;
  }
  _alertas = _alertas.map((a) => (a.id === id ? { ...a, leida: true } : a));
  return fakeNetwork(undefined, 150);
}

/**
 * Marca todas las alertas como leídas.
 *
 * TODO API: POST /conductores/me/alertas/leidas
 */
export async function marcarTodasAlertasLeidas(): Promise<void> {
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      await supabase.from('alertas_conductor').update({ leida: true }).eq('user_id', data.user.id);
      return;
    }
  }
  _alertas = _alertas.map((a) => ({ ...a, leida: true }));
  return fakeNetwork(undefined, 150);
}

let _alertaSeq = 100;

/** Datos con los que el conductor crea su propia alerta. */
export interface NuevaAlertaInput {
  titulo: string;
  detalle: string;
  severidad: AlertaSeveridad;
  categoria: AlertaCategoria;
  /** De qué es: personal (documentos, perfil) o del vehículo. */
  ambito: 'personal' | 'vehiculo';
  /** Fotos adjuntas (URIs locales; suben a Cloudinary). */
  fotoUris?: string[];
  /** Autor (para notificar al panel de su empresa). */
  user?: User;
}

/**
 * Crea una alerta PROPIA del conductor: entra a su lista de alertas y notifica
 * al panel de su empresa para que el supervisor también la vea.
 *
 * TODO API: POST /conductores/me/alertas
 */
export async function crearAlerta(input: NuevaAlertaInput): Promise<Alerta> {
  const titulo = input.titulo.trim();
  if (!titulo) throw new Error('Ponle un título a la alerta.');
  // Las fotos van a Cloudinary; sin credenciales quedan con su URI local (mock).
  const fotoUrls = input.fotoUris?.length ? await subirFotosCloudinary(input.fotoUris) : undefined;

  // BD provisional: la alerta se guarda de verdad y el panel se entera.
  if (supabase && input.user && esIdDb(input.user.id)) {
    const { data, error } = await supabase
      .from('alertas_conductor')
      .insert({
        user_id: input.user.id,
        titulo,
        detalle: input.detalle.trim(),
        severidad: input.severidad,
        categoria: input.categoria,
        ambito: input.ambito,
        foto_urls: fotoUrls ?? [],
        // La creó él mismo: nace leída para él.
        leida: true,
      })
      .select('id, creada_en')
      .single();
    if (error || !data) throw new Error('No se pudo crear la alerta. Intenta de nuevo.');
    const f = data as unknown as { id: string; creada_en: string };
    if (input.user.companyId) {
      notificar({
        companyId: input.user.companyId,
        tipo: 'otro',
        titulo: `Alerta de ${input.user.name}: ${titulo}`,
        detalle: input.detalle.trim() || 'Reportada desde la app del conductor.',
      });
    }
    return {
      id: f.id,
      titulo,
      detalle: input.detalle.trim(),
      severidad: input.severidad,
      categoria: input.categoria,
      ambito: input.ambito,
      fotoUrls,
      creadaEn: f.creada_en,
      leida: true,
    };
  }

  const alerta: Alerta = {
    id: `al-${++_alertaSeq}`,
    titulo,
    detalle: input.detalle.trim(),
    severidad: input.severidad,
    categoria: input.categoria,
    ambito: input.ambito,
    fotoUrls,
    creadaEn: new Date().toISOString(),
    // La creó el propio conductor: nace leída para él.
    leida: true,
  };
  _alertas = [alerta, ..._alertas];
  if (input.user?.companyId) {
    notificar({
      companyId: input.user.companyId,
      tipo: 'otro',
      titulo: `Alerta de ${input.user.name}: ${titulo}`,
      detalle: alerta.detalle || 'Reportada desde la app del conductor.',
    });
  }
  return fakeNetwork(alerta, 400);
}

/** Fila de `documentos` en la BD → Documento (estado derivado del vencimiento). */
type DocumentoRow = {
  id: string;
  tipo: string;
  ambito: 'vehiculo' | 'persona';
  vence_en: string;
  foto_urls: string[];
};

function rowToDocumento(f: DocumentoRow): Documento {
  const dias = Math.floor((new Date(f.vence_en).getTime() - Date.now()) / 86_400_000);
  return {
    id: f.id,
    tipo: f.tipo,
    ambito: f.ambito === 'vehiculo' ? 'vehiculo' : 'conductor',
    estado: dias < 0 ? 'vencido' : dias <= 30 ? 'por_vencer' : 'vigente',
    venceEn: f.vence_en,
    fotoUrls: f.foto_urls.length > 0 ? f.foto_urls : undefined,
  };
}

const DOC_SELECT = 'id, tipo, ambito, vence_en, foto_urls';

/**
 * Documentos del vehículo (trimestres, RCV, carné, póliza).
 *
 * TODO API: GET /vehiculos/:vehicleId/documentos
 */
export async function getDocumentosVehiculo(_vehicleId: string): Promise<Documento[]> {
  if (supabase && esIdDb(_vehicleId)) {
    const { data } = await supabase
      .from('documentos')
      .select(DOC_SELECT)
      .eq('vehiculo_id', _vehicleId)
      .order('vence_en');
    if (data) return (data as unknown as DocumentoRow[]).map(rowToDocumento);
    return [];
  }
  return fakeNetwork(MOCK_DOCS_VEHICULO);
}

/**
 * Documentos del conductor (licencia, manejo defensivo, examen médico…).
 *
 * TODO API: GET /conductores/me/documentos
 */
export async function getDocumentosConductor(_user?: User): Promise<Documento[]> {
  if (supabase && _user && esIdDb(_user.id)) {
    const { data } = await supabase
      .from('documentos')
      .select(DOC_SELECT)
      .eq('user_id', _user.id)
      .order('vence_en');
    if (data) return (data as unknown as DocumentoRow[]).map(rowToDocumento);
    return [];
  }
  return fakeNetwork(MOCK_DOCS_CONDUCTOR);
}

/**
 * UN documento por id (detalle: foto, vencimiento, estado).
 *
 * TODO API: GET /documentos/:id
 */
export async function getDocumento(id: string): Promise<Documento | null> {
  if (supabase && esIdDb(id)) {
    const { data } = await supabase.from('documentos').select(DOC_SELECT).eq('id', id).maybeSingle();
    return data ? rowToDocumento(data as unknown as DocumentoRow) : null;
  }
  const doc =
    MOCK_DOCS_VEHICULO.find((d) => d.id === id) ??
    MOCK_DOCS_CONDUCTOR.find((d) => d.id === id) ??
    null;
  return fakeNetwork(doc);
}

let _docSeq = 500;

/**
 * CREA un documento con su vencimiento y sus fotos: PERSONAL (cédula,
 * licencia, carta médica, permiso de trabajo — de CUALQUIER rol, no solo
 * conductores) o del VEHÍCULO en uso. Las fotos suben a Cloudinary; la RLS
 * deja a cada quien escribir los suyos (migración 0009).
 *
 * TODO API: POST /documentos
 */
export async function crearDocumento(input: {
  ambito: 'persona' | 'vehiculo';
  userId?: string;
  vehicleId?: string;
  tipo: string;
  /** Vencimiento AAAA-MM-DD (de aquí saltan las alertas por vencer). */
  venceEn: string;
  fotoUris: string[];
}): Promise<Documento> {
  const tipo = input.tipo.trim();
  const vence = input.venceEn.trim();
  if (!tipo) throw new Error('Ponle nombre al documento (ej. Cédula, RCV, Permiso de trabajo).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vence)) {
    throw new Error('El vencimiento va como AAAA-MM-DD (ej. 2027-03-31).');
  }

  const enDb =
    (input.ambito === 'persona' && input.userId && esIdDb(input.userId)) ||
    (input.ambito === 'vehiculo' && input.vehicleId && esIdDb(input.vehicleId));
  if (supabase && enDb) {
    const urls = input.fotoUris.length > 0 ? await subirFotosCloudinary(input.fotoUris) : [];
    const { data, error } = await supabase
      .from('documentos')
      .insert({
        ambito: input.ambito,
        user_id: input.ambito === 'persona' ? input.userId : null,
        vehiculo_id: input.ambito === 'vehiculo' ? input.vehicleId : null,
        tipo,
        vence_en: vence,
        foto_urls: urls,
      })
      .select(DOC_SELECT)
      .single();
    if (error || !data) throw new Error('No se pudo guardar el documento.');
    return rowToDocumento(data as unknown as DocumentoRow);
  }

  // Mock: el documento nace en la lista que corresponda.
  const dias = Math.floor((new Date(vence).getTime() - Date.now()) / 86_400_000);
  const doc: Documento = {
    id: `doc-${++_docSeq}`,
    tipo,
    ambito: input.ambito === 'persona' ? 'conductor' : 'vehiculo',
    estado: dias < 0 ? 'vencido' : dias <= 30 ? 'por_vencer' : 'vigente',
    venceEn: vence,
    fotoUrls: input.fotoUris.length > 0 ? [...input.fotoUris] : undefined,
  };
  (input.ambito === 'persona' ? MOCK_DOCS_CONDUCTOR : MOCK_DOCS_VEHICULO).unshift(doc);
  return fakeNetwork(doc, 400);
}

/**
 * Adjunta fotos a un documento (van a Cloudinary; con la BD provisional se
 * guardarán sus URLs). Así el documento queda a mano para verlo al necesitarlo.
 *
 * TODO API: POST /documentos/:id/fotos (multipart)
 */
export async function agregarFotosDocumento(id: string, uris: string[]): Promise<Documento> {
  if (supabase && esIdDb(id)) {
    const { data: actual } = await supabase.from('documentos').select('foto_urls').eq('id', id).maybeSingle();
    if (!actual) throw new Error('Documento no encontrado.');
    const urls = await subirFotosCloudinary(uris);
    const nuevas = [...((actual as { foto_urls: string[] }).foto_urls ?? []), ...urls];
    const { data, error } = await supabase
      .from('documentos')
      .update({ foto_urls: nuevas })
      .eq('id', id)
      .select(DOC_SELECT)
      .single();
    if (error || !data) throw new Error('No se pudieron guardar las fotos. Intenta de nuevo.');
    return rowToDocumento(data as unknown as DocumentoRow);
  }
  const doc =
    MOCK_DOCS_VEHICULO.find((d) => d.id === id) ?? MOCK_DOCS_CONDUCTOR.find((d) => d.id === id);
  if (!doc) throw new Error('Documento no encontrado.');
  const urls = await subirFotosCloudinary(uris);
  doc.fotoUrls = [...(doc.fotoUrls ?? []), ...urls];
  return fakeNetwork({ ...doc }, 400);
}

/**
 * Cambia la FECHA DE VENCIMIENTO de un documento (dentro de su detalle). El
 * estado (vigente/por vencer/vencido) se recalcula solo, y con él las alertas.
 *
 * TODO API: PATCH /documentos/:id { vence_en }
 */
export async function actualizarVencimientoDocumento(id: string, venceEn: string): Promise<Documento> {
  const vence = venceEn.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vence)) {
    throw new Error('El vencimiento va como AAAA-MM-DD (ej. 2027-03-31).');
  }
  if (supabase && esIdDb(id)) {
    const { data, error } = await supabase
      .from('documentos')
      .update({ vence_en: vence })
      .eq('id', id)
      .select(DOC_SELECT)
      .single();
    if (error || !data) throw new Error('No se pudo actualizar el vencimiento.');
    return rowToDocumento(data as unknown as DocumentoRow);
  }
  const doc =
    MOCK_DOCS_VEHICULO.find((d) => d.id === id) ?? MOCK_DOCS_CONDUCTOR.find((d) => d.id === id);
  if (!doc) throw new Error('Documento no encontrado.');
  const dias = Math.floor((new Date(vence).getTime() - Date.now()) / 86_400_000);
  doc.venceEn = vence;
  doc.estado = dias < 0 ? 'vencido' : dias <= 30 ? 'por_vencer' : 'vigente';
  return fakeNetwork({ ...doc }, 350);
}
