/**
 * Servicio de emergencias / SOS (capa de datos abstracta).
 *
 * Sigue el flujo del documento: se activa primero (compartiendo ubicación y
 * datos del vehículo), el operador contacta por el seguimiento, el conductor
 * elige el tipo, recibe instrucciones y el caso se cierra al resolverse. Hoy es
 * un mock con la misma forma async que tendrá la API de Juan; migrar es
 * reescribir el cuerpo marcado con «TODO API».
 */

import { encolar } from '@/sync/outbox';
import type {
  Emergencia,
  EmergenciaAutor,
  EmergenciaMensaje,
  EmergenciaTipo,
  EnviarSOSInput,
  User,
} from '@/types';

import { fakeNetwork } from './network';

/** Teléfono de la central (mock; vendrá de la configuración de la empresa). */
const TELEFONO_CENTRAL = '+573000000000';

/** Etiqueta legible de cada tipo (para el seguimiento). */
const TIPO_LABEL: Record<EmergenciaTipo, string> = {
  accidente: 'Accidente',
  mecanica: 'Falla mecánica',
  salud: 'Salud',
  seguridad: 'Seguridad',
  otro: 'Otro',
};

/** Instrucción del operador según el tipo elegido (mock). */
const TIPO_INSTRUCCION: Record<EmergenciaTipo, string> = {
  accidente: 'Ponte a salvo fuera de la vía si puedes. Vamos en camino y avisamos a emergencias.',
  mecanica: 'Enciende las balizas y ubícate en un lugar seguro. Enviamos asistencia mecánica.',
  salud: 'Mantén la calma y no te muevas si te sientes mal. Coordinamos ayuda médica.',
  seguridad: 'No te expongas. Si es seguro, aléjate del área. Alertamos a las autoridades.',
  otro: 'Cuéntanos qué ocurre por aquí y te guiamos. Ya estamos contigo.',
};

let _secuencia = 500;

// Emergencia activa en curso (mock en memoria). En la app real la fuente de
// verdad es el backend; aquí se guarda para reanudar el estado y seguirla.
let _emergenciaActiva: Emergencia | null = null;

/** Crea un mensaje de seguimiento. */
function mensaje(autor: EmergenciaAutor, texto: string): EmergenciaMensaje {
  return { id: `em-${Date.now()}-${++_secuencia}`, autor, texto, hora: new Date().toISOString() };
}

/**
 * Activa un SOS: comparte ubicación y notifica al operador, que contacta de
 * inmediato pidiendo el tipo de emergencia. Devuelve la emergencia "activa".
 *
 * TODO API: POST /emergencias { ubicacion } → abre el canal en tiempo real.
 */
export async function enviarSOS(input: EnviarSOSInput): Promise<Emergencia> {
  const emergencia: Emergencia = {
    id: `sos-${++_secuencia}`,
    tipo: null,
    estado: 'activa',
    creadaEn: new Date().toISOString(),
    ubicacionTexto: input.ubicacionTexto,
    operador: 'Central de operaciones',
    telefonoCentral: TELEFONO_CENTRAL,
    seguimiento: [
      mensaje('sistema', 'Alerta activada. Compartiendo tu ubicación en vivo.'),
      mensaje('operador', 'Recibimos tu alerta y ya vamos contigo. ¿Qué tipo de emergencia es?'),
    ],
  };
  _emergenciaActiva = emergencia;
  // El SOS es prioritario: se encola para que salga primero al reconectar.
  await encolar('sos', 'Aviso de emergencia (SOS)', async () => {
    await fakeNetwork(undefined, 700);
    // TODO API: POST /emergencias
  });
  return emergencia;
}

/**
 * Define el tipo de la emergencia (ya en contacto con el operador), que
 * responde con instrucciones según el caso.
 *
 * TODO API: POST /emergencias/:id/tipo { tipo }
 */
export async function definirTipoEmergencia(
  id: string,
  tipo: EmergenciaTipo,
): Promise<Emergencia | null> {
  if (_emergenciaActiva?.id === id) {
    _emergenciaActiva = {
      ..._emergenciaActiva,
      tipo,
      seguimiento: [
        ..._emergenciaActiva.seguimiento,
        mensaje('conductor', `Tipo: ${TIPO_LABEL[tipo]}`),
        mensaje('operador', TIPO_INSTRUCCION[tipo]),
      ],
    };
  }
  return fakeNetwork(_emergenciaActiva, 400);
}

/**
 * Envía un mensaje del conductor al seguimiento (y el operador acusa recibo).
 *
 * TODO API: POST /emergencias/:id/mensajes { texto }
 */
export async function enviarMensajeEmergencia(id: string, texto: string): Promise<Emergencia | null> {
  if (_emergenciaActiva?.id === id) {
    _emergenciaActiva = {
      ..._emergenciaActiva,
      seguimiento: [
        ..._emergenciaActiva.seguimiento,
        mensaje('conductor', texto.trim()),
        mensaje('operador', 'Recibido. Seguimos contigo.'),
      ],
    };
  }
  return fakeNetwork(_emergenciaActiva, 300);
}

/**
 * Emergencia activa del conductor, si hay una en curso (para reanudar el estado
 * al volver a la pantalla).
 *
 * TODO API: GET /conductores/me/emergencia-activa
 */
export async function getEmergenciaActiva(_user?: User): Promise<Emergencia | null> {
  return fakeNetwork(_emergenciaActiva);
}

/**
 * Cierra el caso: la emergencia se resolvió o llegó la asistencia.
 *
 * TODO API: POST /emergencias/:id/cerrar
 */
export async function cerrarEmergencia(id: string): Promise<Emergencia | null> {
  if (_emergenciaActiva?.id === id) {
    const cerrada: Emergencia = {
      ..._emergenciaActiva,
      estado: 'atendida',
      seguimiento: [
        ..._emergenciaActiva.seguimiento,
        mensaje('sistema', 'Caso cerrado. Nos alegra que estés bien.'),
      ],
    };
    _emergenciaActiva = null;
    return fakeNetwork(cerrada, 400);
  }
  return fakeNetwork(null, 400);
}

/**
 * Cancela la emergencia activa (falsa alarma).
 *
 * TODO API: POST /emergencias/:id/cancelar
 */
export async function cancelarSOS(id: string): Promise<Emergencia | null> {
  if (_emergenciaActiva?.id === id) {
    _emergenciaActiva = { ..._emergenciaActiva, estado: 'cancelada' };
    const cancelada = _emergenciaActiva;
    _emergenciaActiva = null;
    return fakeNetwork(cancelada, 400);
  }
  return fakeNetwork(null, 400);
}
