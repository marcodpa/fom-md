# Fondos del panel

Especificación corta, para llevarla después a la app (fom-driver-juan).

## Qué es

En Configuración › Apariencia, debajo de «Diseño de la plataforma», la sección **Fondo** deja
elegir una imagen o degradado que se ve detrás de todo el panel autenticado. Es independiente
del diseño (Azul FOM / Glass gris). Se guarda por cuenta en este navegador
(`localStorage`, clave `fom.fondo.v1:<cuenta>`), igual que el diseño. Valor por defecto:
**Sin fondo**.

## Catálogo (`src/panel/apariencia-store.js` › `FONDOS`)

| id | Nombre | Tono de tarjetas | Origen |
|---|---|---|---|
| `ninguno` | Sin fondo (por defecto) | el del diseño | — |
| `blanco-carros` | Blanco con carros | claro | recortes de `src/assets/vehiculos/` (Foton, Silverado, Iveco, F-150, JAC, Hilux) en fila sobre blanco, desenfocados y lavados |
| `perla` | Perla | claro | solo CSS (degradado blanco/gris con luz azul FOM) |
| `patio-noche` | Patio al anochecer | oscuro | `marketing/generated-v6/aerial-yard.png`, desenfoque 13 y luz al 52 % |
| `carretera` | Carretera | oscuro | `marketing/generated-v6/highway-dusk.png`, desenfoque 7 y luz al 62 % |
| `noche-azul` | Noche azul | oscuro | solo CSS (degradado azul noche) |

Cada fondo con foto trae tres webp en `src/assets/fondos/`: escritorio 1600×900, teléfono
vertical (600×1067 o 540×960) y miniatura 360×203. Todos pesan menos de 30 KB: el desenfoque va
**horneado** en el archivo, no se calcula en el navegador. Ninguna imagen se generó con IA ni con
servicios de pago; todas salen de archivos que ya estaban en el repo.

## Cómo se aplica

- `Consola.jsx` pone `data-fondo="<id>"` y `data-fondo-tono="claro|oscuro"` en `.pnl` y pinta
  `<FondoPanel>` (`.pnl-fondo`): capa `position: fixed`, `z-index: -1`, sin clics, `aria-hidden`.
- La foto se pide en un rato libre (`requestIdleCallback`, máx. 1,2 s) y entra con un fundido de
  520 ms; mientras, se ve un degradado del mismo tono. En el teléfono (≤ 767 px) baja la versión
  vertical.
- **Centro de control (`/panel/mapa`)**: sin fondo ni cambio de material; manda el mapa. Los
  mapas dentro de tarjetas siguen oscuros, con sus controles oscuros.

## Material de las tarjetas (`src/styles/apariencia-fondos.css`)

- **Claro** (vidrio blanco): superficies `rgb(255 255 255 / .74)`, blur 20 px, letra `#0F141B` /
  `#3D4654` / `#555F6D`, borde `rgb(15 20 27 / .10)`. El azul de acción baja a `#1769C2`
  (el `#3D9BF5` de marca no llega a AA sobre blanco). Éxito `#12784A`, aviso `#8A5A00`,
  peligro `#C42B33`. Todos ≥ 4,5:1 sobre la superficie. El logo usa «FOM» en tinta
  (`src/assets/fondos/fom-logo-tinta.svg`).
- **Oscuro** (vidrio azul noche): superficies `rgb(20 26 34 / .80)`, blur 18 px, letra
  `#F3F5F8` / `#C3CAD4` / `#9AA4B2`. Las fotos llevan un velo `rgb(10 13 18 / .30 → .55)` para
  que los títulos que van directo encima se lean.

## Accesibilidad y rendimiento

- **Teléfono**: sin `backdrop-filter` en las tarjetas; suben a 90 % de opacidad. La barra de
  arriba conserva su blur.
- **Reducir transparencia**: superficies opacas (blanco / `#141A22`) y sin blur.
- **Reducir movimiento**: la foto aparece sin fundido.
- **Impresión**: la capa no se imprime.

## Para la app

- Mismo catálogo e ids; guardar con la misma clave por cuenta en el almacenamiento del teléfono.
- Usar las versiones `-movil.webp` como `ImageBackground` fijo detrás de las pantallas
  (no en Centro de control ni en mapas).
- Tono claro: paleta clara de la app (`tokens.ts › light`) con el azul de acción `#1769C2` y
  tarjetas al 90 %, sin `BlurView` en listas largas.
- Tono oscuro: paleta oscura con tarjetas `rgb(20 26 34 / .9)`.
- Respetar «Reducir transparencia» (`AccessibilityInfo.isReduceTransparencyEnabled`) y
  «Reducir movimiento».
