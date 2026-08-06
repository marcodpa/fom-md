/**
 * Exportación a PDF de los reportes (directriz: "toda la información que
 * puedan sacar de las empresas… en un PDF").
 *
 * - Nativo (iOS/Android): expo-print genera el archivo y expo-sharing abre la
 *   hoja de compartir/guardar.
 * - Web: se abre el diálogo de impresión del navegador (Guardar como PDF).
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Genera el PDF del HTML dado y lo comparte/imprime según la plataforma. */
export async function exportarPdf(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Guardar o compartir el PDF',
      UTI: 'com.adobe.pdf',
    });
  }
}

/** Una sección del documento: pares dato-valor, una tabla o un párrafo. */
export type SeccionPdf =
  | { tipo: 'datos'; titulo?: string; filas: [string, string][] }
  | { tipo: 'tabla'; titulo?: string; headers: string[]; rows: string[][] }
  | { tipo: 'texto'; titulo?: string; texto: string };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Arma el HTML de un reporte con la identidad FOM: encabezado con título y
 * subtítulo, secciones de datos/tablas y pie con la fecha de generación.
 */
export function htmlReporte(opts: {
  titulo: string;
  subtitulo?: string;
  secciones: SeccionPdf[];
}): string {
  const cuerpo = opts.secciones
    .map((s) => {
      const t = s.titulo ? `<h2>${esc(s.titulo)}</h2>` : '';
      if (s.tipo === 'texto') return `${t}<p>${esc(s.texto)}</p>`;
      if (s.tipo === 'datos') {
        const filas = s.filas
          .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`)
          .join('');
        return `${t}<table class="datos">${filas}</table>`;
      }
      const head = `<tr>${s.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
      const rows = s.rows
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
        .join('');
      return `${t}<table class="tabla">${head}${rows}</table>`;
    })
    .join('');

  const generado = new Date().toLocaleString('es', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, 'Segoe UI', sans-serif; color: #16212e; margin: 28px; }
  header { border-bottom: 3px solid #1f6feb; padding-bottom: 10px; margin-bottom: 18px; }
  .marca { font-size: 11px; letter-spacing: 2px; color: #5b6b7c; text-transform: uppercase; }
  h1 { font-size: 22px; margin: 4px 0 2px; }
  .sub { color: #5b6b7c; font-size: 13px; margin: 0; }
  h2 { font-size: 14px; letter-spacing: 1px; text-transform: uppercase; color: #1f6feb; margin: 22px 0 8px; }
  p { font-size: 13px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .datos td { padding: 6px 8px; border-bottom: 1px solid #e3e8ee; }
  .datos .k { color: #5b6b7c; width: 45%; }
  .datos .v { font-weight: 600; text-align: right; }
  .tabla th { text-align: left; padding: 7px 8px; background: #f0f4f9; border-bottom: 2px solid #d5dde6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #45566a; }
  .tabla td { padding: 6px 8px; border-bottom: 1px solid #e9edf2; }
  footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e3e8ee; color: #8494a6; font-size: 10px; }
</style></head><body>
<header>
  <div class="marca">FOM · Control de Flotas</div>
  <h1>${esc(opts.titulo)}</h1>
  ${opts.subtitulo ? `<p class="sub">${esc(opts.subtitulo)}</p>` : ''}
</header>
${cuerpo}
<footer>Generado el ${esc(generado)} · FOM</footer>
</body></html>`;
}
