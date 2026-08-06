/**
 * Países para el selector de teléfono: código de marcación y cuántos dígitos
 * tiene el número local (para validar). Por defecto Venezuela. La lista cubre
 * la región y los destinos más comunes; se puede ampliar sin tocar la UI.
 */

export interface Pais {
  /** ISO-2 (clave estable). */
  codigo: string;
  nombre: string;
  bandera: string;
  /** Código de marcación (ej. "+58"). */
  discado: string;
  /** Dígitos del número local (sin el código de país). */
  longitud: number;
}

export const PAISES: Pais[] = [
  { codigo: 'VE', nombre: 'Venezuela', bandera: '🇻🇪', discado: '+58', longitud: 10 },
  { codigo: 'CO', nombre: 'Colombia', bandera: '🇨🇴', discado: '+57', longitud: 10 },
  { codigo: 'US', nombre: 'Estados Unidos', bandera: '🇺🇸', discado: '+1', longitud: 10 },
  { codigo: 'PA', nombre: 'Panamá', bandera: '🇵🇦', discado: '+507', longitud: 8 },
  { codigo: 'MX', nombre: 'México', bandera: '🇲🇽', discado: '+52', longitud: 10 },
  { codigo: 'PE', nombre: 'Perú', bandera: '🇵🇪', discado: '+51', longitud: 9 },
  { codigo: 'EC', nombre: 'Ecuador', bandera: '🇪🇨', discado: '+593', longitud: 9 },
  { codigo: 'CL', nombre: 'Chile', bandera: '🇨🇱', discado: '+56', longitud: 9 },
  { codigo: 'AR', nombre: 'Argentina', bandera: '🇦🇷', discado: '+54', longitud: 10 },
  { codigo: 'BR', nombre: 'Brasil', bandera: '🇧🇷', discado: '+55', longitud: 11 },
  { codigo: 'ES', nombre: 'España', bandera: '🇪🇸', discado: '+34', longitud: 9 },
];

export const PAIS_POR_DEFECTO = PAISES[0]; // Venezuela

export function paisPorCodigo(codigo?: string): Pais {
  return PAISES.find((p) => p.codigo === codigo) ?? PAIS_POR_DEFECTO;
}

/** Un teléfono guardado se compone del discado + el número local. */
export function componerTelefono(discado: string, numero: string): string {
  return `${discado} ${numero.trim()}`;
}

/**
 * Tipos de RIF venezolano (la letra inicial). J = jurídico (empresas), V =
 * venezolano, E = extranjero, P = pasaporte, G = gobierno, C = consejo comunal.
 */
export const TIPOS_RIF = ['J', 'V', 'E', 'P', 'G', 'C'] as const;
export type TipoRif = (typeof TIPOS_RIF)[number];

/** Etiqueta legible de cada tipo de RIF (para el selector). */
export const RIF_LABEL: Record<TipoRif, string> = {
  J: 'J · Jurídico (empresa)',
  V: 'V · Venezolano',
  E: 'E · Extranjero',
  P: 'P · Pasaporte',
  G: 'G · Gobierno',
  C: 'C · Consejo comunal',
};

/** Arma el RIF completo (ej. "J-30123456-7") a partir de la letra y los dígitos. */
export function componerRif(letra: TipoRif, numero: string): string {
  const n = numero.trim();
  // Formato LETRA-<todos menos el último>-<último> cuando hay dígito verificador.
  if (n.length >= 2) return `${letra}-${n.slice(0, -1)}-${n.slice(-1)}`;
  return `${letra}-${n}`;
}

/** Separa un RIF guardado ("J-30123456-7") en su letra y sus dígitos (inverso de componerRif). */
export function separarRif(rif: string): { letra: TipoRif; numero: string } {
  const raw = (rif ?? '').trim();
  const primera = raw.charAt(0).toUpperCase();
  const letra = (TIPOS_RIF as readonly string[]).includes(primera) ? (primera as TipoRif) : 'J';
  return { letra, numero: raw.replace(/\D/g, '') };
}

/** Separa un teléfono guardado ("+58 4141234567") en su país y su número (inverso de componerTelefono). */
export function separarTelefono(tel: string): { codigo: string; numero: string } {
  const raw = (tel ?? '').trim();
  if (!raw) return { codigo: PAIS_POR_DEFECTO.codigo, numero: '' };
  // El discado más largo que calza gana (evita que "+5" pise a "+58").
  const pais = PAISES.filter((p) => raw.startsWith(p.discado)).sort((a, b) => b.discado.length - a.discado.length)[0];
  if (!pais) return { codigo: PAIS_POR_DEFECTO.codigo, numero: raw.replace(/\D/g, '') };
  return { codigo: pais.codigo, numero: raw.slice(pais.discado.length).replace(/\D/g, '') };
}
