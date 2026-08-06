# Design

> Sistema visual REAL del proyecto (capturado del código). Fuente de tokens:
> `src/theme/tokens.ts`, consumidos SOLO vía `useTheme()`. Dirección extendida:
> `DIRECCION_VISUAL_v2.md` ("calma con precisión"). Esto es React Native + Expo:
> los conceptos web se traducen (ver tabla en DIRECCION_VISUAL_v2 §0).

## Color

Doble esquema (claro/oscuro) + **overlay de marca por empresa**: `primary`/`onPrimary`
los re-pinta `createTheme` con el color de la empresa activa (Samfor verde,
Petrosur naranja, Chevron azul, PDVSA rojo). Los semánticos son SOLO estado.

### Capas de superficie (T9)

| Capa | Claro | Oscuro | Uso |
|---|---|---|---|
| `background` | `#F6F7F9` | `#0A0D12` | lienzo de la pantalla |
| `surface` | `#FFFFFF` | `#141A22` | tarjetas y bloques (E1: + borde hairline + `shadows.card`) |
| `surfaceSunken` | `#EEF1F4` | `#0F141B` | insets DENTRO de tarjetas: pistas, tiles de ícono, chips inactivos, avatares |
| `surfaceElevated` | `#FFFFFF` | `#1D2530` | flotantes (E3 `shadows.floating`) y hoja (E4 `shadows.sheet`) |

Texto: `text` / `textSecondary` / `textMuted` (tenue solo para metadatos).
Semánticos con superficie al ~12%: `success/warning/danger/info` + `*Surface` + `on*`.

## Typography

Una familia (sistema), escala fija: `xs12 · sm14 · md16 · lg20 · xl24 · xxl32 · display40`,
pesos 400/500/600/700. Variantes de `ThemedText` (único punto de verdad):
`display`/`title` (bold, tracking `tight` −0.4) · `subtitle` (lg/600) · `body` (md/400) ·
`caption` (sm/500) · `overline` (xs/600 MAYÚS, tracking `wide` +0.8) · `button` (md/600) · `mono`.
Cifras que cambian en vivo → prop `tabular` (tabular-nums).

## Components

- **Button**: primary (marca) / secondary (surface+borde, sin sombra) / danger. Press = escala 0.97 + darken 8%; disabled legible; loading con ancho estable. Alto ≥48.
- **Card**: `surface` + borde hairline + `radii.lg(16)` + `shadows.card`. Tocable = `PressableScale`.
- **TextField**: label siempre visible, foco = borde `primary` 1.5, error en `danger`.
- **SegmentedControl**: pista `surfaceSunken`, segmento activo `primary`; alto 44.
- **Chip / OTStatusBadge**: tinte del tono al ~14% + texto en tono pleno, overline. Patrón canónico de estado.
- **Skeleton** (forma real, no spinner) / **EmptyState** (glifo + copy amable + acción) / **ErrorState** (reintento).
- **TabIcon**: familia SVG outline propia, trazo 2, una sola familia en toda la app.
- **ScreenHeader** (pila) y **AdminHeader** (panel): patrones únicos de encabezado.
- Filas de lista: tile de ícono `surfaceSunken` 36–44 px → contenido → dato/chevron; separador hairline; alto táctil ≥44.

## Layout

Rejilla de 4. Densidad cómoda (conductor/formularios: padding `lg`) vs. compacta
(listas admin: filas `md`, hairlines). Contenido centrado `maxWidth` 640–900.
Un solo `gap` por contenedor.

## Motion

Tokens `motion.*`: duraciones `micro100/fast120/base220/slow360`, easing `standard`
(decelerate) / `emphasized`, spring único (damping 22 / stiffness 260 / mass 0.9),
`pressedScale 0.97`. Entradas con `Appear` (fade + subida 8–14 px), stagger solo
en los primeros 3–5 ítems (delay 40–80 ms). Transición de pantalla: slide nativo
260 ms + gesto de regreso. Loops solo "EN VIVO" (pulso) y fondo ambiental.
`useReducedMotion()` en TODA animación.

## Reglas duras

1. Cero hardcodeo: todo de `useTheme()`. Si falta un token, se propone (no se inventa).
2. Sombras solo para lo que flota (E3/E4); tarjetas se separan por capa + borde.
3. El movimiento comunica estado; si no comunica, no existe.
4. Semáforo con etiqueta/forma además de color; contraste §9 de DIRECCION_VISUAL_v2.
5. No re-plantillar lo elevado: consistencia sobre sorpresa (registro producto).
