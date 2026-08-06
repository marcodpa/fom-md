/**
 * Validadores de datos reutilizables (formularios de empresas, usuarios,
 * perfiles y vehículos). Cada función devuelve un MENSAJE de error legible o
 * `null` si el valor es válido. Regla general: los identificadores y
 * combinaciones (RIF, cédula, teléfono, placa, id de vehículo) NO llevan
 * espacios; solo los textos humanos (nombre, apellido, dirección) los admiten.
 */

/** Letras (con acentos y ñ), espacios y los conectores de nombres legítimos
 *  (guion y apóstrofe: "María-José", "O'Brien"). No admite números ni símbolos. */
const RE_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü '-]+$/;
/** Solo dígitos, sin espacios. */
const RE_DIGITOS = /^\d+$/;
/** Correo electrónico. */
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Placa: letras y números (sin espacios); guiones opcionales. */
const RE_PLACA = /^[A-Za-z0-9-]+$/;
/** Id de vehículo: letras, números y caracteres especiales, SIN espacios. */
const RE_ID_VEHICULO = /^[A-Za-z0-9._\-#/]+$/;

/** Nombre/apellido: solo letras y espacios. */
export function validarLetras(valor: string, campo = 'Este campo'): string | null {
  const v = valor.trim();
  if (!v) return `${campo} es obligatorio.`;
  if (!RE_LETRAS.test(v)) return `${campo} solo admite letras.`;
  return null;
}

/** Correo electrónico válido. */
export function validarEmail(valor: string): string | null {
  const v = valor.trim();
  if (!v) return 'El correo es obligatorio.';
  if (!RE_EMAIL.test(v)) return 'Escribe un correo válido (ej. nombre@empresa.com).';
  return null;
}

/** Solo números (sin espacios) con longitud opcional. */
export function validarNumerico(
  valor: string,
  opts: { campo?: string; min?: number; max?: number } = {},
): string | null {
  const { campo = 'Este campo', min, max } = opts;
  const v = valor.trim();
  if (!v) return `${campo} es obligatorio.`;
  if (/\s/.test(v)) return `${campo} no puede tener espacios.`;
  if (!RE_DIGITOS.test(v)) return `${campo} solo admite números.`;
  if (min != null && v.length < min) return `${campo} debe tener al menos ${min} dígitos.`;
  if (max != null && v.length > max) return `${campo} no puede tener más de ${max} dígitos.`;
  return null;
}

/** Parte numérica del RIF (tras la letra): 8 a 10 dígitos, sin espacios. */
export function validarRif(numero: string): string | null {
  return validarNumerico(numero, { campo: 'El RIF', min: 8, max: 10 });
}

/** Teléfono: solo números; la longitud la valida el país elegido. */
export function validarTelefono(numero: string, longitudEsperada?: number): string | null {
  const base = validarNumerico(numero, { campo: 'El teléfono' });
  if (base) return base;
  if (longitudEsperada && numero.trim().length !== longitudEsperada) {
    return `El teléfono de este país debe tener ${longitudEsperada} dígitos.`;
  }
  return null;
}

/**
 * Contraseña fuerte: al menos 8 caracteres, una mayúscula, un número y un
 * carácter especial.
 */
export function validarClave(valor: string): string | null {
  const v = valor;
  if (v.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Z]/.test(v)) return 'Incluye al menos una letra mayúscula.';
  if (!/\d/.test(v)) return 'Incluye al menos un número.';
  if (!/[^A-Za-z0-9]/.test(v)) return 'Incluye al menos un carácter especial (ej. !, @, #).';
  return null;
}

/** Placa: letras y números (sin espacios). */
export function validarPlaca(valor: string): string | null {
  const v = valor.trim();
  if (!v) return 'La placa es obligatoria.';
  if (/\s/.test(v)) return 'La placa no puede tener espacios.';
  if (!RE_PLACA.test(v)) return 'La placa solo admite letras y números.';
  return null;
}

/** Id de vehículo: letras, números o especiales combinables, sin espacios. */
export function validarIdVehiculo(valor: string): string | null {
  const v = valor.trim();
  if (!v) return 'El id del vehículo es obligatorio.';
  if (/\s/.test(v)) return 'El id no puede tener espacios.';
  if (!RE_ID_VEHICULO.test(v)) return 'El id solo admite letras, números y caracteres como . _ - # /';
  return null;
}

/** Año de 4 dígitos dentro de un rango razonable. */
export function validarAnio(valor: string): string | null {
  const v = valor.trim();
  if (!/^\d{4}$/.test(v)) return 'El año debe tener 4 dígitos (ej. 2021).';
  const n = Number(v);
  if (n < 1950 || n > 2100) return 'Indica un año válido.';
  return null;
}

/** Estado de una fecha de vencimiento (para las alertas de licencia/carta). */
export type EstadoVigencia = 'ok' | 'por_vencer' | 'vencido';

/**
 * Valida una fecha AAAA-MM-DD: día 1–31, mes 1–12, año ≥ 2000, y que sea una
 * fecha real. Devuelve el error o `null`. La comparación con hoy (vencida /
 * por vencer) se hace con `vigenciaDeFecha` una vez guardada.
 */
export function validarFecha(valor: string): string | null {
  const v = valor.trim();
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return 'La fecha va como AAAA-MM-DD (ej. 2027-03-31).';
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (anio < 2000) return 'El año debe ser 2000 o posterior.';
  if (mes < 1 || mes > 12) return 'El mes debe estar entre 01 y 12.';
  if (dia < 1 || dia > 31) return 'El día debe estar entre 01 y 31.';
  // Fecha real (rechaza 31 de febrero, etc.).
  const d = new Date(`${v}T00:00:00`);
  if (d.getFullYear() !== anio || d.getMonth() + 1 !== mes || d.getDate() !== dia) {
    return 'Esa fecha no existe. Revísala.';
  }
  return null;
}

/**
 * Estado de vigencia de una fecha de vencimiento respecto a hoy: vencido si ya
 * pasó, por vencer si faltan 30 días o menos, ok si no.
 */
export function vigenciaDeFecha(iso: string): EstadoVigencia {
  const dias = Math.floor((new Date(`${iso.slice(0, 10)}T00:00:00`).getTime() - Date.now()) / 86_400_000);
  if (dias < 0) return 'vencido';
  if (dias <= 30) return 'por_vencer';
  return 'ok';
}
