/**
 * Estado de vigencia (documentos / permisos / licencias). Hoy es un mock
 * determinista por id, para poder ver de un vistazo qué está al día y qué no en
 * las listas del panel (operación por excepciones). Mañana lo dará el backend a
 * partir de las fechas reales de vencimiento.
 */

export type Vigencia = 'al_dia' | 'por_vencer' | 'vencido';

/** Tono semántico y etiqueta de una vigencia. */
export const VIGENCIA_VISTA: Record<Vigencia, { tone: 'success' | 'warning' | 'danger'; label: string }> = {
  al_dia: { tone: 'success', label: 'Al día' },
  por_vencer: { tone: 'warning', label: 'Por vencer' },
  vencido: { tone: 'danger', label: 'Vencido' },
};

/** Vigencia simulada (determinista) a partir de un id. TODO API: fechas reales. */
export function vigenciaMock(id: string): Vigencia {
  const n = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 10;
  if (n < 6) return 'al_dia';
  if (n < 9) return 'por_vencer';
  return 'vencido';
}
