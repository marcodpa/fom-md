/**
 * Servicio de órdenes de trabajo / reportes de falla (capa de datos mock).
 *
 * Misma forma async que tendrá la API real. Migrar = reescribir el cuerpo
 * marcado con «TODO API», sin tocar pantallas ni tipos.
 */

import { subirFotosCloudinary } from '@/lib/cloudinary';
import { supabase } from '@/lib/supabase';
import { encolar } from '@/sync/outbox';
import type { FaultType, WorkOrder } from '@/types';

import { registrarOrden } from './companyService';
import { esIdDb } from './db';
import { fakeNetwork } from './network';

/**
 * Datos que aporta el conductor + los que se rellenan solos (vehículo,
 * conductor, ubicación; la fecha/hora la pone el servidor). Ver brief, sección 8.
 */
export interface NuevaOrdenInput {
  vehicleId: string;
  driverId: string;
  /** Descripción de la falla (obligatoria). */
  descripcion: string;
  /** Tipo de falla (opcional). */
  tipoFalla?: FaultType;
  ubicacionTexto: string;
  /** URIs locales de la evidencia (foto obligatoria; se subirán al backend). */
  evidenciaUris: string[];
  /** A qué título la crea (§3.3): titular o secundario identificado por PIN. */
  autorVia?: 'principal' | 'secundario';
}

let _secuencia = 1000;

/**
 * Crea una ODT correctiva en estado inicial "abierta" (FOM-02 §4.2).
 *
 * Offline-first: la ODT se registra localmente de una vez y su envío al
 * servidor se encola (se manda ya si hay conexión, o al reconectar).
 *
 * TODO API: POST /odt (multipart: datos + archivos de evidencia).
 */
export async function crearOrdenDeTrabajo(input: NuevaOrdenInput): Promise<WorkOrder> {
  // Las fotos van a Cloudinary; sin credenciales quedan con su URI local (mock).
  const evidenciaUrls = await subirFotosCloudinary(input.evidenciaUris);

  // BD provisional: la ODT se crea de verdad. La empresa sale del vehículo y
  // el trigger de la BD notifica al panel (V5).
  if (supabase && esIdDb(input.vehicleId)) {
    const { data: veh } = await supabase
      .from('vehiculos')
      .select('empresa_id')
      .eq('id', input.vehicleId)
      .single();
    if (!veh) throw new Error('Vehículo no encontrado.');
    const { data, error } = await supabase
      .from('odts')
      .insert({
        empresa_id: (veh as { empresa_id: string }).empresa_id,
        vehiculo_id: input.vehicleId,
        creador_id: esIdDb(input.driverId) ? input.driverId : null,
        autor_via: input.autorVia ?? null,
        tipo: 'correctiva',
        estado: 'abierta',
        descripcion: input.descripcion.trim(),
        tipo_falla: input.tipoFalla ?? null,
        ubicacion: input.ubicacionTexto,
        evidencia_urls: evidenciaUrls,
      })
      .select('id, creada_en')
      .single();
    if (error || !data) throw new Error('No se pudo crear la ODT. Intenta de nuevo.');
    const f = data as unknown as { id: string; creada_en: string };
    return {
      id: f.id,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      descripcion: input.descripcion.trim(),
      tipoFalla: input.tipoFalla,
      tipo: 'correctiva',
      autorVia: input.autorVia,
      estado: 'abierta',
      creadaEn: f.creada_en,
      ubicacionTexto: input.ubicacionTexto,
      evidenciaUrls,
    };
  }

  const orden: WorkOrder = {
    id: `wo-${++_secuencia}`,
    vehicleId: input.vehicleId,
    driverId: input.driverId,
    descripcion: input.descripcion.trim(),
    tipoFalla: input.tipoFalla,
    tipo: 'correctiva',
    autorVia: input.autorVia,
    estado: 'abierta',
    creadaEn: new Date().toISOString(),
    ubicacionTexto: input.ubicacionTexto,
    evidenciaUrls,
  };
  // Persiste la ODT en el almacén que lee el supervisor (de punta a punta).
  registrarOrden(orden);
  // Encola el viaje al servidor (inmediato si hay red, diferido si no).
  await encolar('ot', `ODT ${orden.id}`, async () => {
    await fakeNetwork(undefined, 500);
    // TODO API: POST /odt
  });
  return orden;
}
