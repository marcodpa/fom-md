# Tokens de la app en el panel del teléfono (T-152)

`tokens-app.css` copia los valores de diseño de la app (FOM-DRIVER,
`C:\Users\home\Downloads\fom-driver-juan`, rama `diseno-como-web`) como variables
CSS con el prefijo `--app-`. Las usan solo las hojas del panel en el teléfono
(≤ 767 px): `movil-app.css` (que importa `tokens-app.css`), `movil-modulos.css`,
`mi-unidad-movil.css`, `mantenimiento-movil.css`, `perfil-movil.css` y
`supervisor-movil.css`. En la computadora nada las lee.

Además, `movil-app.css` hace que en el teléfono las variables `--e-*` del panel
valgan lo de la app (`.pnl.fom-dark[data-diseno][data-movil]`), para que las
piezas compartidas con la computadora (tarjetas, cifras, etiquetas) se vean
también como en la app.

Si un valor cambia en la app, se cambia aquí y en `tokens-app.css`.
Rutas relativas a `fom-driver-juan/src/`. Las líneas son las de la rama
`diseno-como-web` al 23 oct 2026.

## Escalas (no dependen del modo)

| Variables | Valores | De dónde sale |
|---|---|---|
| `--app-esp-xs … --app-esp-xxxl` | 4, 8, 12, 16, 24, 32, 48 | `theme/tokens.ts` 46–55 (`spacing`) |
| `--app-r-sm/md/lg/xl/pill` | 10, 16, 24, 28, 999 | `theme/tokens.ts` 58–67 (`radii`) |
| `--app-op-inactivo`, `--app-op-press` | 0.5, 0.08 | `theme/tokens.ts` 70–73 (`opacity`) |
| `--app-borde-hairline/fino/foco` | 1 (hairline en web), 1, 1.5 | `theme/tokens.ts` 76–80 (`borderWidths`) |
| `--app-fuente` | Spline Sans 400/500/600/700 | `theme/fuentes.ts` 73–87; `theme/tokens.ts` 85–89 |
| `--app-t-xs … --app-t-display` | 12, 14, 16, 20, 24, 32, 40 | `theme/tokens.ts` 90–98 (`fontSize`) |
| `--app-lh-xs … --app-lh-display` | 16, 20, 24, 28, 32, 40, 48 | `theme/tokens.ts` 105–113 (`lineHeight`) |
| `--app-peso-*` | 400, 500, 600, 700 | `theme/tokens.ts` 99–104 (`fontWeight`) |
| `--app-track-ajustado/normal/amplio` | −0.4, 0, 0.8 | `theme/tokens.ts` 115–119 (`letterSpacing`) |
| `--app-display/title/subtitle/body/caption/overline/button` | 40/48 700 · 32/40 700 · 20/28 600 · 16/24 400 · 14/20 500 · 12/16 600 · 16/24 600 | `components/themed-text.tsx` 44–83 (variantes) |
| `--app-d-micro/rapido/base/lento` | 100, 120, 220, 360 ms | `theme/tokens.ts` 34 (`motion.durations`) |
| `--app-curva`, `--app-curva-enfasis` | out-cubic, in-out-cubic | `theme/tokens.ts` 36–39 (`motion.easing`) |
| `--app-escala-press` | 0.97 | `theme/tokens.ts` 42 (`pressedScale`) |

## Colores

| Variables | Oscuro (por defecto) | Glass gris | Claro (`.app-claro`) | De dónde sale |
|---|---|---|---|---|
| `--app-fondo` | #0A0D12 | #60656C | #F6F7F9 | `tokens.ts` 170 / 218 / 130 |
| `--app-sup`, `-alta`, `-baja` | #141A22, #1D2530, #0F141B | rgba(39,42,48,.88), rgba(53,56,63,.94), rgba(32,35,41,.78) | #FFF, #FFF, #EEF1F4 | `tokens.ts` 171–173 / 219–221 / 131–133 |
| `--app-texto`, `-2`, `-3`, `-inv` | #F3F5F8, #ABB3BF, #8C97A7, #0A0D12 | #F3F5F8, #E6E9EE, #E1E5EA | #111418, #5A626E, #8A919E, #FFF | `tokens.ts` 175–179 / 226–228 / 135–138 |
| `--app-borde`, `-fuerte` | #262E39, #39424F | blanco al 13 % y al 24 % | #E2E5EA, #C7CCD4 | `tokens.ts` 181–182 / 229–230 / 140–141 |
| `--app-primario`, `--app-sobre-primario` | #3D9BF5, #08121C (fijos) | iguales | iguales | `theme/createTheme.ts` 12–13 (`AZUL_FOM`, `SOBRE_AZUL_FOM`) |
| `--app-activo-sup/texto/borde` | #173553, #8BC6FF, #2D5D88 | #184573, #C6E5FF, #2D5D88 | #E6F2FE, #0B5CAD, #A9D0F7 | `tokens.ts` 187–189 / 231–234 / 146–148 |
| `--app-exito`, `-sup`, `--app-sobre-exito` | #3DD68C, #13281D, #06210F | iguales | #1E9E5A, #E6F6EC, #FFF | `tokens.ts` 191–193 / 150–152 |
| `--app-aviso`, `-sup`, `--app-sobre-aviso` | #F5C242, #2A2410, #241B00 | iguales | #C98A00, #FFF6DC, #FFF | `tokens.ts` 194–196 / 153–155 |
| `--app-peligro`, `-sup`, `--app-sobre-peligro` | #FF6369, #2A1416, #2A0A0B | iguales | #E5484D, #FDEAEA, #FFF | `tokens.ts` 197–199 / 156–158 |
| `--app-info`, `-sup`, `--app-sobre-info` | #3D9BF5, #10202E, #08121C | info-sup #21374A | #208AEF, #E6F2FE, #FFF | `tokens.ts` 200–202 / 235 / 159–161 |
| `--app-acento`, `-sup`, `--app-sobre-acento` | #B478FF, #1E1630, #1A0B2E | iguales | #7C4DFF, #F0EAFF, #FFF | `tokens.ts` 203–205 / 162–164 |
| `--app-sombra-tarjeta` | ninguna | 0 6 18 negro 16 % | 0 2 8 al 6 % | `tokens.ts` 252 (`buildShadows.card`) |
| `--app-sombra-flotante` | 0 6 18 negro 50 % | 0 6 18 negro 16 % | 0 6 16 al 12 % | `tokens.ts` 254–259 |
| `--app-sombra-hoja` | 0 −8 24 negro 55 % | igual | 0 −6 20 al 10 % | `tokens.ts` 261–263 |
| `--app-fondo-pantalla` | lavado azul + 2 orbes quietos | degradado gris 150° + luz arriba a la derecha | — | `components/screen-background.tsx` 109–117 (`ScreenBackground`), 64–90 (`FondoGlass`) |

El panel siempre va en oscuro (Consola pone `data-tema="oscuro"`); el Glass lo
activa `data-diseno="glass"`. La paleta clara queda en `.app-claro` solo como
referencia.

## Piezas

| Variables | Valor | De dónde sale |
|---|---|---|
| `--app-cab-arriba`, `--app-cab-lado`, `--app-cab-hueco` | 12, 14, 8 | `components/encabezado-fom.tsx` 257 y 208 |
| `--app-cab-capsula-alto/pad/hueco/radio` | 52, 8×14, 10, 24 | `encabezado-fom.tsx` 324–333, 209 |
| `--app-cab-divisor-alto` | 22 | `encabezado-fom.tsx` 334 |
| `--app-cab-logo-ancho` | 67 | `encabezado-fom.tsx` 117 (`LogoFomCompleto width={67}`) |
| `--app-cab-ceja`, `--app-cab-ceja-track` | 10/13 600, 1.4 | `encabezado-fom.tsx` 335; `screen-header.tsx` 94 |
| `--app-cab-nombre` | 14/18 600 | `encabezado-fom.tsx` 336 |
| `--app-cab-titulo-pila` | 15/20 600 | `components/screen-header.tsx` 95 |
| `--app-cab-circulo`, `--app-cab-icono` | 44, 20 | `encabezado-fom.tsx` 337, 234 |
| `--app-cab-insignia`, `--app-cab-insignia-texto` | 18, 11/14 700 | `encabezado-fom.tsx` 338–349 |
| `--app-avatar-fondo/aro/texto`, `--app-avatar-letra` | #194A74, #31608B, #EEF7FF, 14/18 600 | `encabezado-fom.tsx` 35–37, 351 |
| `--app-sobre-mapa` | rgba(20,26,34,.94) | `encabezado-fom.tsx` 39 |
| `--app-titulo-pantalla`, `-track` | 28/32 700, −0.8 | `encabezado-fom.tsx` 353 (`TituloPantalla`) |
| `--app-bajada` | 14/20 | `encabezado-fom.tsx` 354 |
| `--app-titulo-arriba` | 14 bajo la barra | `encabezado-fom.tsx` 300 |
| `--app-dock-alto`, `--app-dock-margen`, `--app-dock-lado` | 64, 8, 16 | `components/app-tab-bar.tsx` 41, 52, 208 |
| `--app-dock-radio` | 28 (`radii.xl`) | `app-tab-bar.tsx` 229 |
| `--app-dock-pildora-ancho/alto`, `--app-dock-hueco`, `--app-dock-icono` | 48, 26, 3, 20 | `app-tab-bar.tsx` 43–54 |
| `--app-dock-etiqueta` | 11/14 600 | `app-tab-bar.tsx` 296 |
| `--app-tarjeta-radio`, `--app-tarjeta-pad` | 24, 16 | `components/card.tsx` 17–20 |
| `--app-boton-alto`, `--app-boton-pad`, `--app-boton-icono` | 48, 12×24, 18 | `components/button.tsx` 123, 91–92, 111 |
| `--app-boton-pildora-pad`, `-icono` | 8×14, 15 | `components/pill-button.tsx` 61–67, 51 |
| `--app-nuevo-*` | alto 40, 0×14, hueco 6, ícono 15, 13 600, sombra azul 30 % | `components/boton-nuevo.tsx` 40–58 |
| `--app-pastilla-*` | alto 22, 0×9, hueco 5, tinte 12 %, 14/20 600, punto 6 | `components/pastilla.tsx` 46, 62–71 |
| `--app-chip-*` | 3×10, tinte 14 %, 12/16 600 | `components/chip.tsx` 41, 52–62 |
| `--app-filtro-*`, `--app-cuenta*` | alto 36, 0×14, hueco 6, 13 600, ícono 14; cuenta 18, 11 700 | `components/pastilla-filtro.tsx` 65, 91–99 |
| `--app-fila-menu-*`, `--app-fila-chevron` | 12×16, caja 32, ícono 20, chevron 16 | `components/fila-menu.tsx` 57, 66, 80, 89 |
| `--app-fila-unidad-alto`, `--app-fila-retrato` | 70, 60×46 | `app/panel/flota.tsx` 73, 934 |
| `--app-fila-persona-alto`, `-pad`, `--app-fila-avatar`, `-letra` | 64, 10×16, 44, 15 (44 × 0.35) | `app/panel/personal.tsx` 47, 409, 414; `components/avatar.tsx` 69 |
| `--app-fila-titulo`, `--app-fila-detalle` | variante `button`, variante `caption` | `app/panel/flota.tsx` (FilaUnidad), `app/panel/personal.tsx` |
| `--app-kpi-*` | 14, casilla 10 con esquina 14, 20/26 700, 11/14 | `components/kpi-fila.tsx` 40–43 |
| `--app-buscar-*` | alto 46, 0×12, 15, acción 30, ícono 18 | `components/search-bar.tsx` 123–126, 94 |
| `--app-campo-alto`, `--app-campo-pad` | 46, 12 | `components/text-field.tsx` 137–142 |
| `--app-segmento-alto`, `-radio` | 44, 14 | `components/segmented-control.tsx` 178, 109 |
| `--app-seccion`, `--app-seccion-tick` | 15/20 600, 3×15 | `components/etiqueta-seccion.tsx` 70–71 |
| `--app-seccion-asignadas` | 17/22 600 | `components/odt-asignada-seccion.tsx` 99 |
| `--app-accion-alto`, `-icono`, `-etiqueta` | 62, 22, 11.5/15 500 | `components/perfil-acciones.tsx` 91, 57, 103 |
| `--app-hoja-velo` | #06080B | `components/bottom-sheet.tsx` 187 |
