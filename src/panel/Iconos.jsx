// Set de íconos del panel web, portado desde la app móvil FOM.
//
// Los trazos marcados como "app" son COPIA LITERAL de
// control-flotas-main/src/components/tab-icon.tsx (y de eye-icon.tsx,
// search-bar.tsx, screen-header.tsx, option-picker.tsx, error-state.tsx),
// para que la app y el panel compartan exactamente la misma iconografía.
// Mismos atributos de trazo que allá: strokeWidth 2, linecap/linejoin "round",
// fill "none", stroke "currentColor", viewBox "0 0 24 24".
//
// Íconos que NO existen en la app y tuve que dibujar yo, siguiendo el mismo
// lenguaje de trazo (outline, esquinas redondeadas, coordenadas enteras):
//   mapa, documento, menu, filtro, mas, descargar, check, reloj, pin,
//   velocidad, combustible, cerrar, llamar.
//
// Nota de mapeo: la app llama "alertas" a la campana; en el panel la campana
// vive en `campana` y `alerta` conserva el triángulo de advertencia (trazo
// literal de src/app/(driver)/index.tsx). Igual con `check`: la app solo tiene
// el portapapeles de "inspeccion" (disponible aquí como `inspeccion`), pero en
// el panel `check` se usa suelto dentro de botones, así que es un visto simple.

const TRAZOS = {
  /* ---- Trazos literales de la app (tab-icon.tsx) ---- */

  // app: resumen (cuadrícula de indicadores)
  resumen: (
    <>
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" />
      <path d="M4 14h6v6H4z" />
      <path d="M14 14h6v6h-6z" />
    </>
  ),

  // app: flota (camión)
  camion: (
    <>
      <path d="M3 6h11v9H3z" />
      <path d="M14 9h4l3 3v3h-7z" />
      <circle cx="7" cy="17.5" r="1.6" />
      <circle cx="17" cy="17.5" r="1.6" />
    </>
  ),

  // app: personal (dos personas)
  gente: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 6" />
      <path d="M17.5 20a5.5 5.5 0 0 0-3-4.9" />
    </>
  ),

  // app: ot (llave inglesa)
  llave: (
    <path d="M15.5 7a3.5 3.5 0 0 1-4.6 4.6L5 17.5 6.5 19l5.9-5.9A3.5 3.5 0 0 1 17 8.5l-2 2-1.5-1.5 2-2A3.5 3.5 0 0 1 15.5 7z" />
  ),

  // app: reporte (documento con barras)
  reporte: (
    <>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M15 3v4h4" />
      <path d="M9 17v-4" />
      <path d="M12 17v-6" />
      <path d="M15 17v-2" />
    </>
  ),

  // app: salir (puerta con flecha)
  salir: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),

  // app: editar (lápiz)
  editar: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),

  // app: auditoria (escudo con visto)
  escudo: (
    <>
      <path d="M12 3 5 5.6V11c0 4.2 3 6.9 7 8.4 4-1.5 7-4.2 7-8.4V5.6z" />
      <path d="M9 11.8l2 2 4-4.2" />
    </>
  ),

  // app: alertas (campana)
  campana: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),

  // app: src/app/(driver)/index.tsx (triángulo de advertencia)
  alerta: (
    <>
      <path d="M12 3.6 L21.5 20 H2.5 Z" />
      <path d="M12 9.5 V14" />
      <path d="M12 17.2 h0.01" />
    </>
  ),

  // app: search-bar.tsx (lupa)
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),

  // app: screen-header.tsx (chevron de volver)
  volver: <path d="M15 18l-6-6 6-6" />,

  /* ---- Nombres propios de la app, por si el panel los usa más adelante ---- */

  // app: inicio (casa)
  inicio: (
    <>
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M9 21v-7h6v7" />
    </>
  ),

  // app: inspeccion (portapapeles con visto)
  inspeccion: (
    <>
      <path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      <path d="M9 3h6v4H9z" />
      <path d="M9.5 13.5 11 15l3.5-3.5" />
    </>
  ),

  // app: alertas (alias del nombre que usa la app)
  alertas: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),

  // app: ot (alias del nombre que usa la app)
  ot: (
    <path d="M15.5 7a3.5 3.5 0 0 1-4.6 4.6L5 17.5 6.5 19l5.9-5.9A3.5 3.5 0 0 1 17 8.5l-2 2-1.5-1.5 2-2A3.5 3.5 0 0 1 15.5 7z" />
  ),

  // app: mensaje (burbuja de chat)
  mensaje: (
    <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
  ),

  // app: sync (dos flechas circulares)
  sync: (
    <>
      <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8" />
      <path d="M20 3v5h-5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.7L4 16" />
      <path d="M4 21v-5h5" />
    </>
  ),

  // app: costos (moneda con signo)
  costos: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9" />
      <path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.9-2.5 2s1.1 1.8 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5" />
    </>
  ),

  // app: empresa (edificio)
  empresa: (
    <>
      <path d="M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17" />
      <path d="M15 9h4a1 1 0 0 1 1 1v11" />
      <path d="M3 21h18" />
      <path d="M8.5 7h3M8.5 11h3M8.5 15h3" />
    </>
  ),

  // app: auditoria (alias del nombre que usa la app)
  auditoria: (
    <>
      <path d="M12 3 5 5.6V11c0 4.2 3 6.9 7 8.4 4-1.5 7-4.2 7-8.4V5.6z" />
      <path d="M9 11.8l2 2 4-4.2" />
    </>
  ),

  // app: comparar (barras lado a lado)
  comparar: (
    <>
      <path d="M5 20v-8" />
      <path d="M10 20V6" />
      <path d="M15 20v-5" />
      <path d="M20 20V9" />
    </>
  ),

  // app: ver (ojo) — coincide con eye-icon.tsx
  ver: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),

  /* ---- Dibujados aquí (no existen en la app), mismo lenguaje de trazo ---- */

  // Mapa plegado: mismos ángulos rectos y esquinas redondeadas de la familia.
  mapa: (
    <>
      <path d="M9 4 3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z" />
      <path d="M9 4v13.5" />
      <path d="M15 6.5V20" />
    </>
  ),

  // Documento: reutiliza el contorno de "reporte" de la app, con renglones.
  documento: (
    <>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M15 3v4h4" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),

  // Visto suelto (la app solo lo tiene dentro de "inspeccion" y "auditoria").
  check: <path d="M5 12.5 10 17.5 19.5 7" />,

  menu: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </>
  ),

  filtro: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,

  mas: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),

  descargar: (
    <>
      <path d="M12 3v12" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),

  // Reloj: mismo radio que la moneda de "costos" de la app.
  reloj: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),

  pin: (
    <>
      <path d="M12 21s7-6.8 7-11a7 7 0 1 0-14 0c0 4.2 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),

  velocidad: (
    <>
      <path d="M4.5 17.5a8.5 8.5 0 1 1 15 0" />
      <path d="m12 12.5 4-3.5" />
      <circle cx="12" cy="13" r="1.3" />
    </>
  ),

  combustible: (
    <>
      <path d="M4.5 20.5V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v15.5" />
      <path d="M3 20.5h12" />
      <path d="M13.5 9H16a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0v-6.5L18.5 8" />
      <path d="M7 7.5h4.5" />
    </>
  ),

  cerrar: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),

  llamar: (
    <path d="M6.5 3.5h3l1.5 4-2 1.5a11.5 11.5 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />
  ),

  // Cambio de modo claro/oscuro (la app lo alterna desde su menú de perfil).
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),

  luna: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />,
}

export function Icono({ nombre, tam = 18 }) {
  const trazo = TRAZOS[nombre]
  if (!trazo) return null
  return (
    <svg
      className="ico"
      viewBox="0 0 24 24"
      width={tam}
      height={tam}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {trazo}
    </svg>
  )
}

export default Icono
