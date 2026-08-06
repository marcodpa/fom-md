/**
 * Grados de licencia de conducir de Venezuela (INTT). Se usan como lista
 * desplegable de SOLO SELECCIÓN al completar el perfil, y para decidir qué
 * tipos de vehículo puede manejar un conductor (Paso 3, alta de vehículo).
 *
 * Cada grado cubre lo de los grados inferiores. `cubre` lista las CLASES de
 * vehículo que autoriza (ver `VEHICULO_CLASES` en lib/vehiculos.ts).
 */

export interface GradoLicencia {
  /** Código estable ('1'..'5'). */
  value: string;
  label: string;
  /** Clases de vehículo que autoriza este grado. */
  cubre: string[];
}

export const GRADOS_LICENCIA: GradoLicencia[] = [
  { value: '1', label: '1er grado · Motocicletas', cubre: ['moto'] },
  { value: '2', label: '2do grado · Vehículos particulares', cubre: ['moto', 'liviano'] },
  { value: '3', label: '3er grado · Transporte y carga liviana', cubre: ['moto', 'liviano', 'transporte'] },
  { value: '4', label: '4to grado · Carga pesada', cubre: ['moto', 'liviano', 'transporte', 'pesado'] },
  {
    value: '5',
    label: '5to grado · Transporte público / articulados',
    cubre: ['moto', 'liviano', 'transporte', 'pesado', 'articulado', 'industrial'],
  },
];

export function gradoPorValor(value?: string): GradoLicencia | undefined {
  return GRADOS_LICENCIA.find((g) => g.value === value);
}

/** ¿El grado de licencia autoriza a manejar esa clase de vehículo? */
export function gradoCubreClase(gradoValor: string | undefined, clase: string): boolean {
  const g = gradoPorValor(gradoValor);
  return !!g && g.cubre.includes(clase);
}
