# Dirección Visual v2 — Proyecto FOM

> **FASE 0** de la elevación de diseño. Propuesta de criterio unificado para toda la app, **antes**
> de tocar código de pantallas. Extiende (no reemplaza) `DISENO_DIRECCION.md` v1 y respeta el
> `BRIEF_PROYECTO.md`. Nada aquí cambia funcionalidad: es lenguaje de presentación.
>
> **Estado:** pendiente de tu aprobación. Los tokens nuevos de la §12 **no se añaden** hasta que los
> confirmes uno por uno.

---

## 0. Restricción técnica dura (marco de todo el documento)

Esto es **React Native + Expo, NO web**. Traducción de cualquier idea de las skills web al equivalente nativo:

| Concepto web | Equivalente nativo en FOM |
|---|---|
| CSS / Tailwind / styled-components | `StyleSheet.create` + `useTheme()` |
| CSS variables / design tokens | `src/theme/tokens.ts` (consumidos vía `useTheme()`) |
| `box-shadow` | `shadows.*` del tema (`boxShadow` string, ya cross-platform en RN 0.81) |
| Framer Motion / CSS transitions | `react-native-reanimated` (instalado) o `Animated` del core |
| `:hover` | **no existe** en móvil → usar `pressed`/`focused` |
| `:focus-visible` | estado `focused` de inputs + realce con `primary` |
| `prefers-reduced-motion` | `useReducedMotion()` (ya implementado) |
| `rem`/`em`, media queries | escalas de `spacing`/`typography` + `useWindowDimensions` |
| SVG/HTML gradients | `react-native-svg` (`Defs`/`LinearGradient`/`RadialGradient`) |

Si una skill sugiere algo sin equivalente nativo razonable, se **descarta**.

---

## 1. Filosofía visual: "calma con precisión"

La v1 fijó el tono (moderno, profesional, calmado, "cuidar a la gente"). La v2 lo **afila** con una
idea rectora:

> **Calma con precisión.** Cada pantalla respira, pero cada elemento está exactamente donde debe,
> alineado a una rejilla y a una escala. La confianza no viene de adornos: viene de la **consistencia
> milimétrica** y de que lo importante resalta **solo**.

Tres principios operativos:

1. **Jerarquía por estructura, no por ruido.** Tamaño, peso y espacio ordenan la información; el
   color pleno se reserva para marca y estado. Un admin apurado o un conductor en campo encuentran el
   dato clave en < 1 segundo.
2. **Restraint (contención) — filosofía de Emil Kowalski aplicada al movimiento y al adorno.** El
   movimiento se **siente, no se ve**: orienta y confirma, nunca decora. Lo mismo con el color y las
   sombras: si un elemento no gana claridad con un efecto, el efecto sobra.
3. **Una app, un sistema.** El mismo tipo de elemento se ve e interactúa **idéntico** en toda la app.
   Un badge de OT, una fila de lista, un botón: uno solo, reutilizado, no copias divergentes.

Actitud de referencia (del v1): Samsara (mapa protagonista, densidad calmada), Linear/Apple
(contención, tipografía, microinteracciones discretas). Copy siempre de **cuidado**, nunca de
vigilancia.

---

## 2. Color y superficies

**Intocable:** el sistema de marca por empresa (`createTheme` + overlay de `primary`/`onPrimary`).
El acento de cada pantalla = color de la empresa activa. Los semánticos (verde/amarillo/rojo) son
**solo estado y seguridad** (semáforo, en marcha/parado, estados de OT, alertas). Nunca decoración.
`info` (azul) es neutro e independiente de la marca.

**Sistema de capas (elevación por superficie, no por sombra):**

```
background   → lienzo de la pantalla
surface      → tarjetas y bloques sobre el lienzo
surfaceElevated → elementos que flotan/destacan (píldoras sobre mapa, menús, hoja)
+ borde sutil (hairline) para separar capas contiguas del mismo tono
```

- En **oscuro** la escala ya es nítida (`#0A0D12 → #141A22 → #1D2530`). ✅
- En **claro** hay un hueco: `background` y `surfaceElevated` son ambos `#FFFFFF`, así que **la tercera
  capa se pierde** (un elemento "elevado" dentro de una tarjeta no se distingue). → Ver propuesta de
  refinamiento de paleta clara en §12 (token `surfaceSunken` + ajuste de capas), **a consultar**.

**Contraste (regla dura, ambos modos):** texto principal ≥ 7:1, secundario ≥ 4.5:1, tenue solo para
metadatos no críticos (≥ 3:1 y nunca para datos que el usuario deba leer). Auditar con accesslint por
pantalla. El semáforo debe distinguirse también por **forma/etiqueta**, no solo por color
(daltonismo): punto + texto ("En marcha"), no solo verde.

---

## 3. Elevación y sombras

Escala de elevación como **ladder de intención**, no de estética:

| Nivel | Qué es | Cómo se logra |
|---|---|---|
| **E0** | Contenido sobre el lienzo | sin sombra; `background` |
| **E1** | Tarjeta / bloque | `surface` + borde hairline; **`shadows.card`** muy suave |
| **E2** | Encabezado fijo / barra pegajosa | `background` + borde inferior hairline (sin sombra) |
| **E3** | Flotante: FAB, SOS, píldora sobre mapa, popover | `surfaceElevated` + **`shadows.floating`** (token nuevo, §12) |
| **E4** | Hoja inferior / modal | `surfaceElevated` + **`shadows.sheet`** |

Regla: **las sombras solo para lo que realmente flota (E3/E4).** Las tarjetas se separan por
capa+borde, con una sombra apenas perceptible. Hoy hay una `floatShadow` **hardcodeada** en el Inicio
del conductor (FABs de Reportar/SOS) — eso viola "todo del tema" y se migrará al token `shadows.floating`.

---

## 4. Tipografía

Escala vigente (en `tokens.ts`, se mantiene): `xs12 · sm14 · md16 · lg20 · xl24 · xxl32 · display40`,
pesos `400/500/600/700`. La v2 fija **roles** y su mapeo a las variantes de `ThemedText`:

| Rol | Tamaño/peso | Variante | Uso |
|---|---|---|---|
| Título de pantalla | xxl(32)/700, tracking negativo | `title` (revisar a 28–32) | encabezado principal |
| Dato hero | display(40)/700, **cifras tabulares** | `display` | velocidad, score, total de costos |
| Título de sección (eyebrow) | xs(12)/600, MAYÚS, **tracking amplio**, tenue | `overline` | "TU JORNADA", "POR CATEGORÍA" |
| Título de tarjeta | lg(20)/600 | `subtitle` | nombre de vehículo, título de card |
| Cuerpo | md(16)/400 | `body` | descripciones, texto corrido |
| Etiqueta / pie | sm(14)/500, tenue | `caption` | metadatos, ayudas |
| Texto de botón | md(16)/600, centrado | `button` | acciones (nunca MAYÚS salvo micro) |

Reglas:
- **Tracking (letter-spacing):** hoy **no existe** como token. Los títulos piden tracking ligeramente
  **negativo** y los eyebrows tracking **amplio** (v1 §3). → Propuesta `typography.letterSpacing` en §12.
- **Cifras tabulares** en todo número que cambie en vivo (velocidad, score, %): `fontVariant:
  ['tabular-nums']` para que no "bailen". Ya se usa puntualmente; se sistematiza vía `ThemedText`.
- **Line-height** ya alineado a la escala: respetarlo, no fijar alturas a mano.
- Máx. 2 pesos por pantalla como norma (600 para jerarquía, 400 para cuerpo); 700 solo en hero.

---

## 5. Densidad y ritmo espacial

Escala de espaciado vigente (4→48) se mantiene; la v2 fija **dos densidades** según contexto:

- **Cómoda (conductor, hero, formularios):** márgenes de pantalla `lg(16)`, padding de tarjeta
  `lg(16)`–`xl(24)`, gap entre bloques `lg(16)`. Targets grandes: se usa manejando.
- **Compacta (listas de admin: flota, personal, OT, costos):** filas densas pero con **alto táctil
  ≥ 44px**, separadores hairline, padding vertical `md(12)`. Más información por pantalla sin
  agobiar.

Ritmo: un solo `gap` por contenedor (no márgenes sueltos por hijo). Alinear todo a la rejilla de 4.
Ancho máx. de contenido centrado ya usado (`maxWidth` 640–900) — mantener por legibilidad en
pantallas anchas/tablet.

---

## 6. Tarjetas y superficies (tratamiento)

- **Radios:** inputs/botones `md(10)` (subir a 12 si aprobamos, ver §12); tarjetas `lg(16)`;
  chips/pills `pill`; contenedor de mapa `lg(16)`; hoja/modal `xl(24)`.
- **Borde:** hairline en `border`; `borderStrong` solo para foco/separadores fuertes.
- **Tarjeta tocable:** al presionar, realce por **escala `pressedScale` (0.97)** + un leve cambio de
  superficie (no sombra saltarina). Nunca cambiar el layout al presionar.
- **Jerarquía interna de tarjeta:** eyebrow → título → dato → pie, con el `gap` del tema. El dato
  clave manda visualmente.

---

## 7. Lenguaje de movimiento (restraint de Emil Kowalski, nativo)

**Tesis:** el movimiento existe para **orientar y confirmar**. Si no comunica, se elimina. Nada
rebotón, nada que llame la atención sobre sí mismo, nada que retrase al usuario.

**Duraciones** (usar los tokens de `motion.durations`, hoy `fast120/base220/slow360`):
- Feedback al presionar: `fast` (~100–120ms).
- Entrada de contenido / llenado / desvanecer: `base` (~200–260ms).
- Transición de pantalla: nativa del Stack (~260ms, ya configurada) + gesto de regreso.
- **Nada por encima de ~360ms.** `slow` se reserva para un énfasis puntual (aparición del hero), no
  para uso general.

**Curvas:** hoy no hay easing centralizado. Propuesta `motion.easing` + `motion.spring` en §12.
- Entradas: **decelerate** (ease-out) — el elemento llega y se asienta.
- Interacción/resortes: **spring de baja oscilación** con `overshootClamping` cuando un rebote podría
  revelar un hueco (lección ya aplicada al bottom-sheet).
- Salidas: acelerar o simplemente desvanecer; nunca competir con la entrada de lo siguiente.

**Reglas de contención:**
- **Stagger** de entrada solo en los **primeros 3–5 elementos** y con `delay` 40–80ms; **jamás**
  animar ítem por ítem una lista larga (coste + distracción). En listas largas: una sola aparición
  del bloque.
- **Motor:** preferir `react-native-reanimated` (instalado, corre en el hilo de UI a 60fps) para
  animación nueva/elevada. **No** reescribir en masa lo que ya funciona con `Animated` del core; se
  migra pantalla por pantalla solo si aporta.
- **Respeta `useReducedMotion()` SIEMPRE.** Con "reducir movimiento": sin translate/scale/loop; solo
  aparición instantánea o un fade mínimo.
- **Loops permitidos, mínimos:** el pulso "EN VIVO" (comunica estado real) y —con reservas— el fondo
  ambiental.

**Política del fondo ambiental (`ScreenBackground`):** hoy está en ~30 pantallas. Recomendación de
restraint: **mantenerlo en pantallas hero/de entrada** (login, empresas, Inicio del conductor sin
chip, quizá Resumen) y **retirarlo o bajarlo aún más** en listas densas de admin (flota, personal,
mantenimiento, costos), donde compite con el dato. Es "atmósfera de marca", no debe distraer de una
tabla. → A decidir contigo en FASE 2.

---

## 8. Anatomía de un "componente pulido" (por estado)

Definición de "pulido" = correcto en **todos** sus estados, no solo en reposo. Estados a cubrir:
**reposo · presionado · foco (inputs) · seleccionado · cargando · vacío · error · deshabilitado.**

**Botón**
- Primario: fondo `primary`, texto `onPrimary` (contraste calculado), md/600, alto ≥ 48, radio.
- Presionado: escala `pressedScale` + `darken(primary, 0.08)`.
- Deshabilitado: relleno neutro con **texto aún legible** (`textSecondary`), no un botón "apagado"
  (v1 §5, ya implementado — mantener y auditar contraste).
- Cargando: spinner en el color del texto, ancho estable (no salta).
- Secundario: `surface` + borde. Terciario/ghost: solo texto en `primary`. Destructivo (Salir): texto
  `danger` discreto.

**Fila de lista (vehículo / usuario / OT / viaje)**
- Punto de estado a la izquierda (8–10px, con pulso si "en vivo") → contenido al centro → dato a la
  derecha. Separador hairline. Alto táctil ≥ 44. Presionado: realce sutil de superficie.

**Input (TextField)**
- Reposo: `surface` + borde hairline. Foco: borde `primary` (1.5px) — ya existe. Error: borde
  `danger` + texto de error `danger` (caption). Deshabilitado: opacidad de estado, texto legible.
  Ojito de contraseña coherente. Label siempre presente (accesibilidad).

**Chip / SegmentedControl**
- No seleccionado: `surface` + borde. Seleccionado: `primary` + `onPrimary`. Transición de selección
  con `base`/spring corto. Alto táctil ≥ 44.

**Badge / pill de estado (OT, EN VIVO)**
- Fondo = `${tono}Surface` (~10–15% del semántico), texto en el tono pleno, overline/600 MAYÚS.
  Cada estado su color, reconocible de un vistazo (ya implementado en `OTStatusBadge` — es el patrón
  canónico a reutilizar).

**Dato / MetricCard**
- Eyebrow tenue → número hero tabular → helper. El número es el protagonista. Opción de conteo
  ascendente al aparecer (solo hero, respeta reduce-motion).

**Anillo de score ("Mi manejo")**
- Grosor consistente, color del semáforo, número tabular centrado, **animación de llenado** al entrar
  (con reduce-motion: aparece lleno). Copy de cuidado, no de castigo.

**Estados transversales (los tres que hoy faltan más):**
- **Cargando:** **skeletons** con la forma real del contenido (no spinners) en listas y paneles;
  spinner solo para acciones puntuales. Shimmer sutil, respeta reduce-motion.
- **Vacío:** ícono/gráfico tenue + una línea de qué pasa + (si aplica) una acción. Tono amable
  ("Cuando te asignen un viaje, aparecerá aquí"), nunca un vacío frío.
- **Error:** mensaje claro y humano + acción de reintento. Nunca un throw crudo ni una pantalla en
  blanco. Color `danger` con mesura.

---

## 9. Accesibilidad (no negociable)

- **Contraste** correcto en claro y oscuro (§2). Auditar con accesslint pantalla por pantalla.
- **Targets táctiles ≥ 44px** (idealmente 48 en botones primarios y en la vista de conducción).
- **Labels de accesibilidad** en todo control sin texto visible (íconos, FAB SOS, ojito, cerrar).
  `accessibilityRole` correcto (button/header/image). Estados anunciados (seleccionado, deshabilitado).
- **No depender solo del color** para el significado (semáforo con etiqueta/forma).
- **Reduce-motion** respetado en toda animación.
- Orden de foco lógico; `hitSlop` en objetos pequeños tocables.

---

## 10. Definition of Done visual (checklist por pantalla, para FASE 2+)

Una pantalla está "elevada" cuando:
- [ ] Cero valores hardcodeados: todo color/spacing/radio/tipografía/sombra sale de `useTheme()`.
- [ ] Jerarquía tipográfica según §4; datos hero tabulares.
- [ ] Densidad y espaciado según §5 (rejilla de 4, un `gap` por contenedor).
- [ ] Los 4+ estados relevantes resueltos (reposo/cargando/vacío/error, + foco/seleccionado/
      deshabilitado donde aplique).
- [ ] Microinteracciones según §7 (feedback al presionar, entrada contenida, reduce-motion).
- [ ] Accesibilidad §9 verificada (contraste, targets, labels).
- [ ] `npx tsc --noEmit` y ESLint en **0**.
- [ ] Sin cambios en lógica/servicios/navegación (salvo bug aprobado en FASE 1).

---

## 11. Qué NO se toca

- `src/theme/createTheme.ts` y el overlay de marca: sagrados. Solo se **extiende** `tokens.ts` (con
  tu aprobación).
- Capa de servicios (`src/services/*`) y contratos de datos: intactos.
- Navegación, rutas, guards y lógica de sesión: intactos (los **bugs** de navegación se tratan en
  FASE 1, aparte del rediseño estético).

---

## 12. Tokens nuevos propuestos (PENDIENTE DE TU APROBACIÓN — no añadidos aún)

Cada uno es aditivo (no rompe `createTheme` ni el overlay de marca). Los añadiría a `src/theme/tokens.ts`
(+ su tipo en `src/theme/types.ts`) **solo tras tu OK**, uno por uno.

| # | Token | Valor propuesto | Por qué / dónde |
|---|---|---|---|
| T1 | `typography.letterSpacing` | `{ tight: -0.4, normal: 0, wide: 0.8 }` (px) | Tracking negativo en títulos y amplio en eyebrows (v1 §3). Hoy no existe → se hace a ojo. |
| T2 | `motion.easing` | `{ standard: Easing.out(Easing.cubic), emphasized: Easing.inOut(Easing.cubic) }` | Curvas centralizadas para que toda entrada/transición comparta el mismo "sentir" (restraint). |
| T3 | `motion.spring` | `{ damping: 22, stiffness: 260, mass: 0.9 }` | Config única para resortes de interacción (reanimated `withSpring` / `Animated.spring`), sin rebote excesivo. |
| T4 | `motion.durations.micro` | `100` | Separar el feedback de presión (~100ms) de las transiciones (`fast` pasa a ~150). Opcional. |
| T5 | `shadows.floating` | claro `0 6 16 rgba(16,24,40,.12)` · oscuro `0 6 18 rgba(0,0,0,.5)` | Nivel E3 (FAB, SOS, píldoras sobre mapa, popovers). Elimina la `floatShadow` hardcodeada del Inicio. |
| T6 | `opacity` | `{ disabled: 0.5, pressedSurface: 0.08 }` | Formaliza el atenuado de estados sin inventar valores por pantalla. |
| T7 | `borderWidths` | `{ hairline: StyleSheet.hairlineWidth, thin: 1, focus: 1.5 }` | Centraliza los anchos de borde (hoy hairline y `1.5` de foco están sueltos). |
| T8 | `radii.md` → 12 (ajuste) | de `10` a `12` | v1 pide inputs/botones 12–14. Cambio menor, propaga a toda la app. **A confirmar** (afecta look global). |
| T9 | Paleta clara: `surfaceSunken` + ajuste de capas | p.ej. `background #FAFBFC`, `surface #FFFFFF` (tarjeta), `surfaceSunken #F1F3F6` (tracks/inset), `surfaceElevated #FFFFFF` con sombra | Arregla el hueco de la 3ª capa en modo claro (§2). Es un **retoque de paleta**: lo consulto contigo con muestras antes de aplicar. |

> Recomendación de prioridad: **T1, T2, T3, T5** dan el mayor salto de calidad con el menor riesgo.
> T8 y T9 son decisiones de "look" que conviene ver contigo con ejemplos antes de decidir.

---

## 13. Cómo seguimos

1. **Tú apruebas (o ajustas) esta dirección y el set de tokens de la §12.**
2. Paso a **FASE 1**: auditoría de bugs (login/navegación) + inconsistencias visuales + lista
   priorizada de pantallas → `AUDITORIA_UI.md`. Me detengo y te la muestro.
3. Arreglamos bugs primero; luego **FASE 2**: componentes base compartidos, y de ahí pantalla por
   pantalla, deteniéndome en cada bloque con `tsc`/lint en 0 y explicación.

*Fin de la propuesta de FASE 0. No he tocado código de pantallas ni el tema. Espero tu aprobación.*
