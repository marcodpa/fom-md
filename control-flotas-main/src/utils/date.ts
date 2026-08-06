/**
 * Utilidades de fecha/hora para presentación. Formatos simples y sin depender de
 * `Intl` (que en algunos motores de React Native no está completo), para que se
 * vean igual en todos los dispositivos.
 */

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Parsea un valor de fecha respetando el día LOCAL. Un string date-only
 * ('AAAA-MM-DD', ej. un vencimiento o una fecha de nacimiento) lo interpreta
 * JS como medianoche UTC; en husos negativos (Venezuela = UTC-4) eso cae en el
 * día anterior y se mostraría un día menos. Añadiéndole la hora local
 * ('T00:00:00') se resuelve al día correcto. Los ISO completos pasan tal cual.
 */
function parseFecha(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(`${iso}T00:00:00`);
  return new Date(iso);
}

/** Hora legible a partir de un ISO (ej. "8:30 a. m."). */
export function formatHora(iso: string): string {
  const d = new Date(iso);
  const minutos = d.getMinutes().toString().padStart(2, '0');
  const ampm = d.getHours() < 12 ? 'a. m.' : 'p. m.';
  let hora = d.getHours() % 12;
  if (hora === 0) hora = 12;
  return `${hora}:${minutos} ${ampm}`;
}

/** Fecha corta a partir de un ISO (ej. "3 jul"). */
export function formatFechaCorta(iso: string): string {
  const d = parseFecha(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

/** Fecha con año a partir de un ISO (ej. "3 jul 2026"). */
export function formatFecha(iso: string): string {
  const d = parseFecha(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Duración legible a partir de minutos (ej. "55 min", "1 h 5 min"). */
export function formatDuracion(min: number): string {
  if (min < 60) return `${min} min`;
  const horas = Math.floor(min / 60);
  const resto = min % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
