/**
 * Catálogo de vehículos para el alta: MARCAS con sus MODELOS (buscables) y los
 * TIPOS de vehículo (incluyendo industriales). Cada tipo tiene una CLASE que se
 * cruza con el grado de licencia del conductor (lib/licencias.ts) para que al
 * asignar solo aparezcan quienes pueden manejarlo, y una PLANTILLA de
 * inspección (VehicleType) que ya usa el resto de la app.
 *
 * Es una lista curada y razonable, ampliable sin tocar la UI.
 */

import type { VehicleType } from '@/types';

/** Marcas → sus modelos más comunes (área laboral/flota en la región). */
export const MARCAS: Record<string, string[]> = {
  Toyota: ['Hilux', 'Land Cruiser', 'Fortuner', 'Corolla', 'Camry', 'Coaster', 'Dyna', '4Runner'],
  Chevrolet: ['Silverado', 'D-Max', 'Luv', 'Aveo', 'Optra', 'NPR', 'Cheyenne', 'Blazer'],
  Ford: ['F-150', 'F-350', 'Ranger', 'Cargo', 'Triton', 'Explorer', 'Fiesta'],
  Mitsubishi: ['L200', 'Montero', 'Canter', 'Fuso', 'Lancer'],
  Nissan: ['Frontier', 'NP300', 'Patrol', 'Titan', 'Sentra'],
  Hyundai: ['H100', 'HD65', 'HD78', 'Tucson', 'Accent', 'County'],
  Kia: ['K2500', 'K2700', 'Sportage', 'Rio', 'Pregio'],
  'Mercedes-Benz': ['Sprinter', 'Actros', 'Atego', 'Axor', 'Accelo'],
  Volkswagen: ['Amarok', 'Constellation', 'Delivery', 'Gol', 'Worker'],
  Iveco: ['Daily', 'Tector', 'Stralis', 'Trakker'],
  Mack: ['Granite', 'Vision', 'CH', 'Titan'],
  Kenworth: ['T800', 'T370', 'W900', 'T680'],
  International: ['Durastar', '4300', '9200', 'ProStar'],
  Volvo: ['FH', 'FM', 'VNL', 'FMX'],
  Freightliner: ['Cascadia', 'M2', 'Columbia'],
  Jeep: ['Wrangler', 'Cherokee', 'Grand Cherokee'],
  Renault: ['Kangoo', 'Master', 'Duster', 'Logan'],
  Caterpillar: ['Retroexcavadora 420', 'Montacargas', 'Cargador 950'],
  Yamaha: ['YBR 125', 'Crypton', 'XTZ 250'],
  Bera: ['BR 150', 'Socialista', 'Brisa'],
  Otra: [],
};

export const LISTA_MARCAS = Object.keys(MARCAS);

/** Clase de vehículo (se cruza con `cubre` del grado de licencia). */
export type VehiculoClase = 'moto' | 'liviano' | 'transporte' | 'pesado' | 'articulado' | 'industrial';

export interface TipoVehiculo {
  value: string;
  label: string;
  clase: VehiculoClase;
  /** Plantilla de inspección que usa el resto de la app. */
  plantilla: VehicleType;
}

export const TIPOS_VEHICULO: TipoVehiculo[] = [
  { value: 'moto', label: 'Motocicleta', clase: 'moto', plantilla: 'otro' },
  { value: 'auto', label: 'Automóvil / Sedán', clase: 'liviano', plantilla: 'auto' },
  { value: 'camioneta', label: 'Camioneta / Pickup', clase: 'liviano', plantilla: 'camioneta' },
  { value: 'suv', label: 'SUV / Todoterreno', clase: 'liviano', plantilla: 'camioneta' },
  { value: 'van', label: 'Van / Furgoneta', clase: 'transporte', plantilla: 'camioneta' },
  { value: 'microbus', label: 'Microbús', clase: 'transporte', plantilla: 'camion' },
  { value: 'autobus', label: 'Autobús', clase: 'articulado', plantilla: 'camion' },
  { value: 'camion_liviano', label: 'Camión liviano', clase: 'transporte', plantilla: 'camion' },
  { value: 'camion_pesado', label: 'Camión pesado', clase: 'pesado', plantilla: 'camion' },
  { value: 'chuto', label: 'Chuto / Tractocamión', clase: 'articulado', plantilla: 'camion' },
  { value: 'cisterna', label: 'Cisterna', clase: 'pesado', plantilla: 'camion' },
  { value: 'volqueta', label: 'Volqueta', clase: 'pesado', plantilla: 'camion' },
  { value: 'grua', label: 'Grúa (industrial)', clase: 'industrial', plantilla: 'camion' },
  { value: 'montacargas', label: 'Montacargas (industrial)', clase: 'industrial', plantilla: 'otro' },
  { value: 'maquinaria', label: 'Maquinaria pesada (industrial)', clase: 'industrial', plantilla: 'otro' },
  { value: 'otro', label: 'Otro', clase: 'liviano', plantilla: 'otro' },
];

export function tipoVehiculoPorValor(value?: string): TipoVehiculo | undefined {
  return TIPOS_VEHICULO.find((t) => t.value === value);
}
