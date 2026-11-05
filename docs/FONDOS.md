# Fondos del panel

Especificación corta, para llevarla después a la app (fom-driver-juan).

## Qué es

En Configuración › Apariencia, debajo de «Diseño de la plataforma», la sección **Fondo** deja
elegir una imagen o degradado que se ve detrás de todo el panel autenticado.

**Son dos elecciones independientes** (decisión de Marco, 5 nov 2026: «el glass es para todo
menos el fondo, y los fondos son únicamente el fondo»):

- **Diseño** (Azul FOM / Glass gris): tarjetas, barra lateral, barra de arriba, botones, colores,
  acento, letra y logo. Todo menos el fondo.
- **Fondo**: SOLO la imagen o color de atrás. No cambia tarjetas, colores, acento, logo ni barras.
  Glass gris + Blanco con carros = tarjetas de vidrio gris sobre el blanco con carros (el fondo se
  ve a través del vidrio).

El fondo Se guarda por cuenta en este navegador
(`localStorage`, clave `fom.fondo.v1:<cuenta>`), igual que el diseño. Valor por defecto:
**Sin fondo**.

## Catálogo (`src/panel/apariencia-store.js` › `FONDOS`)

| id | Nombre | Tono de la imagen | Origen |
|---|---|---|---|
| `ninguno` | Sin fondo (por defecto) | — (el fondo liso del diseño) | — |
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
- **Centro de control (`/panel/mapa`)**: sin fondo; manda el mapa.

## Qué toca el fondo (`src/styles/apariencia-fondos.css`)

- `.pnl` pasa a transparente y se ve `.pnl-fondo`. También dejan ver el fondo las piezas que solo
  pintaban el color liso de la pantalla (`.mv-dock-zona`, `.mvu`).
- **Ningún token** `--e-*` ni `--app-*`: tarjetas, barras, botones, colores y logo quedan como en
  el diseño. Lo vigila `test/apariencia-fondos.test.js`.
- **Letra directo sobre el fondo, en todas las pantallas** (títulos, bajadas, errores, listas
  vacías, botones sutiles, rótulos de grupo): con fondo de tono **claro**, `.pnl-main` cambia los
  tokens de letra a tinta (`--e-texto #0F141B`, `--e-texto-2 #2F3742`, `--e-texto-3 #3D4654` y sus
  `--app-*`). Cada superficie que pinta (tarjetas, barras, chips, campos, botones, tablas, hojas,
  menús, mapas; se reconocen por familia de clase y por elemento) recibe de vuelta los tokens del
  diseño, copiados en `.pnl` como `--fondo-d-*`. Las tarjetas, barras y colores no cambian. Con
  fondo **oscuro** no hace falta: la letra del diseño ya es clara.
- Cómo se comprobó: se mide en pantalla toda la letra visible de `.pnl-main` contra lo que tiene
  detrás (captura con la letra quitada), en Resumen, Usuarios generales (error), Empresas,
  Vehículos, Alertas y Configuración, a 1280 y 375 px, con Glass gris + Blanco con carros +
  Intenso y Azul FOM + Perla. Ninguna letra suelta queda bajo AA.
- Si una pantalla nueva tiene una superficie con una clase que no está en la lista y su letra sale
  oscura sobre la tarjeta, añade su familia de clase a las dos listas de `apariencia-fondos.css`.
- Las miniaturas de Configuración muestran las piezas con el material del diseño elegido.

## Accesibilidad y rendimiento

- **Reducir transparencia**: el material de las tarjetas lo decide el diseño (Glass ya pasa a
  opaco) y el vidrio queda en Sólido.
- **Reducir movimiento**: la foto aparece sin fundido.
- **Impresión**: la capa no se imprime.

## Vidrio de las tarjetas (`src/styles/apariencia-vidrio.css`)

En Configuración › Apariencia, entre Diseño y Fondo: **Sólido · Suave · Medio · Intenso**, como la
transparencia de iOS. Tercera elección independiente (vale con cualquier diseño y cualquier fondo),
por cuenta en este navegador (`fom.vidrio.v1:<cuenta>`).

- Cambia solo la **opacidad** de las superficies del diseño (`--e-sup`, `--e-sup-alta`,
  `--e-sup-baja` y sus `--app-*`), el desenfoque, la saturación y un borde fino claro arriba.
  Nunca el color. Afecta tarjetas, barra lateral, barra de arriba y hojas.
- **Por defecto (sin elección): lo de hoy.** `.pnl` no lleva `data-vidrio` y el CSS es el de
  siempre; en Configuración se marca el paso del diseño (Azul FOM = Sólido, Glass gris = Medio).
  Un valor guardado que no sirve cae a ese defecto.
- **Tope de transparencia (AA)**: opacidad mínima de cada superficie para que texto, secundaria y
  tenue del diseño pasen 4,5:1 aun con blanco puro detrás.

| Paso | Azul FOM (sup / alta / baja) | Glass gris (sup / alta / baja) | Desenfoque |
|---|---|---|---|
| Sólido | 1 / 1 / 1 | 1 / 1 / 1 | ninguno |
| Suave | .97 / .98 / .97 | .94 / .97 / .88 | 12 px |
| Medio | .94 / .96 / .94 | .88 / .94 / .78 (el Glass de siempre) | 16 px |
| Intenso | .91 / .95 / .91 | .74 / .84 / .72 | 28 px, saturación 170 % |

- **Intenso** lleva además `brightness(.6)` en el desenfoque (el velo mínimo de iOS): oscurece lo
  que se ve a través para que la letra de color siga legible. Solo actúa donde el navegador aplica
  el desenfoque sobre el fondo (hoy, las barras).
- **Teléfono** (≤ 767 px, o táctil hasta 1024 px en Intenso): el desenfoque baja a 6 / 8 / 12 px
  para que el scroll no se trabe; la opacidad (y el contraste) no cambia.
- **Reducir transparencia** del sistema: queda en Sólido (atributo y CSS) y el control se apaga
  con un aviso.
- Pruebas: `test/apariencia-vidrio.test.js` (defecto, valor inválido, por cuenta, reducir
  transparencia, CSS = catálogo y contraste AA de cada paso).

## Para la app

- Mismo catálogo e ids; guardar con la misma clave por cuenta en el almacenamiento del teléfono.
- Usar las versiones `-movil.webp` como `ImageBackground` fijo detrás de las pantallas
  (no en Centro de control ni en mapas).
- El fondo no cambia tokens ni el tema: la app sigue con la paleta del diseño elegido. Hoy la app
  pone un velo detrás del título de cada pantalla (`VeloTexto`); para igualar la web, la letra
  suelta debería pasar a tinta con fondo claro.
- Vidrio: mismos pasos, ids y topes; en la app solo transparencia (sin `expo-blur` instalado).
- Respetar «Reducir transparencia» (`AccessibilityInfo.isReduceTransparencyEnabled`) y
  «Reducir movimiento».
