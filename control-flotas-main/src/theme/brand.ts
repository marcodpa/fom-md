/**
 * Marca por empresa (CompanyBrand).
 *
 * La marca es el overlay que re-pinta el acento del tema por empresa.
 * Aquí vive solo la marca por defecto ("la app"); los datos reales de cada
 * empresa llegan desde la capa de servicios (hoy mock, mañana la API de Juan).
 */

import type { CompanyBrand } from './types';

/**
 * Marca neutra por defecto: la identidad general de la app (vista de
 * conductor). Se usa mientras no haya una empresa activa seleccionada.
 */
export const DEFAULT_BRAND: CompanyBrand = {
  name: 'Control de Flotas',
  primaryColor: '#208AEF',
  logo: null,
};
