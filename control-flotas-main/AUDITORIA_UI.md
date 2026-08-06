# Auditoría UI — Proyecto FOM (FASE 1)

> Barrido de toda la app **antes** del rediseño estético. Objetivo: arreglar primero lo roto (login,
> navegación, estados) y catalogar inconsistencias, para no pulir pantallas rotas. No he tocado
> código en esta fase (salvo lo ya aprobado en FASE 0: tokens T1–T7 y restraint del fondo ambiental).
> Severidad: 🔴 alta · 🟡 media · 🟢 baja.

Método: lectura del flujo de login (`login → mfa → sedes → dashboard`), de los providers de sesión
(`Auth/Tenant/Admin/Driving`), de `useLoginDestino`, del `_layout` raíz y de las 34 pantallas +
componentes; y grep de patrones (botones de volver, carga, ancho de contenido, manejo de error,
labels de accesibilidad, `router.replace` a tabs).

---

## A. Bugs de login y navegación

**Conclusión primero (honesta):** el flujo de **login en sí está bien construido**. `login`, `mfa` y
`sedes` derivan su destino del **mismo** `useLoginDestino()` y hacen `<Redirect>` cuando el paso ya no
les corresponde; MFA→sede→dashboard encadena sin bucles ni saltos. El logout (`useSignOut`) limpia
usuario + sesión de conducción + marca y resetea la pila (`dismissAll` + `replace('/login')`). **No
encontré un bug crítico de login.** Lo que sí hay:

| # | Sev | Dónde | Problema | Arreglo propuesto |
|---|-----|-------|----------|-------------------|
| A1 | 🟡 | `asignar-viaje.tsx:131` | Tras asignar, `router.replace('/panel/operaciones')`. La pantalla fue **empujada** desde la tab Operaciones; hacer *replace* a una ruta de tab monta una **segunda instancia** del navegador de panel encima de la existente → pila rara y gesto de regreso confuso. | Usar `router.back()` (vuelve a la tab Operaciones que ya está debajo). La lista se refresca sola por `useFocusEffect`. |
| A2 | 🟡 | 30/34 pantallas | **Sin manejo de error en las cargas.** Solo 4/34 tienen `try/catch`. Si un servicio rechaza, `setCargando(false)` nunca corre → el **loader gira para siempre**, sin estado de error ni reintento. Hoy no se ve porque los mocks no fallan; con la API real es una trampa. | Patrón común de carga con estado `error` + acción "Reintentar" (entra en FASE 2 al elevar los componentes base y las pantallas). |
| A3 | 🟢 | `(driver)/index.tsx:132-180` | **Doble carga**: `useFocusEffect` y `useEffect` piden inspección/próximo viaje/agenda a la vez al montar. Redundante (doble fetch, posible parpadeo de datos). | Unificar en un solo efecto de carga; `useFocusEffect` solo para lo que debe refrescarse al volver. |
| A4 | 🟢 | `chats.tsx:81` → `chat.tsx` | A `/chat` se le pasan `conductorId` y `nombre`, pero **no** `companyId`; `chat.tsx` no fija la marca. Si la marca se hubiera reseteado, el hilo se vería con el acento por defecto en vez del de la empresa. Hoy funciona porque la marca persiste del panel. | Pasar `companyId` y fijar marca en foco (como hacen `orden`/`perfil`), por robustez. |
| A5 | 🟢 | `(driver)/_layout.tsx` | Si un **admin puro** (no conductor) llegara a `/` (no ocurre por `useLoginDestino`, pero es alcanzable por deep-link), el layout no lo bloquea: `esConductor` es `false`, así que **omite** el gate de chip y renderiza las tabs del conductor. | Guard explícito: si `!puedeConducir(user)` redirigir a su dashboard. |

**Transiciones:** el Stack raíz ya tiene `slide_from_right` + gesto de regreso (bien). Login→dashboard
usa `<Redirect>` (replace, sin slide) — correcto (no "entras deslizando" a tu panel). No hay
transiciones rotas; la única rareza de pila es A1.

---

## B. Inconsistencias visuales entre pantallas

| # | Sev | Qué | Evidencia | Norma v2 |
|---|-----|-----|-----------|----------|
| B1 | 🟡 | **Botón de volver sin un solo patrón.** Mezcla de etiqueta "Atrás" (8) vs "Volver" (5), y `orden.tsx` usa un **Pressable plano** `‹ Atrás` en vez del `PillButton back`. | `orden.tsx:127-131` vs `chat/costos/perfil…` con `PillButton label="Atrás" back` | Un solo componente y una sola etiqueta ("Atrás") para retroceso en todas las pantallas de pila. |
| B2 | 🟡 | **Carga: spinner vs skeleton.** 25 pantallas usan `ActivityIndicator`; solo 4 usan `Skeleton` (`comparar`, `empresas`, `orden`, `perfil`). | grep | v2 §8/DoD: **skeletons** con la forma real en listas/paneles; spinner solo para acciones puntuales. |
| B3 | 🟡 | **Estados vacío/error desiguales.** Algunas pantallas tienen buen vacío (`operaciones`, `mantenimiento`, `flota`); otras no distinguen "cargando" de "sin datos", y **ninguna** tiene estado de error visible (ver A2). | varias | v2 §8: los 4 estados (reposo/cargando/vacío/error) resueltos y consistentes. |
| B4 | 🟢 | **Ancho de contenido dispar:** 6 valores distintos de `maxWidth` (460, 480, 560, 640, 720, 900). | grep | v2 §5: fijar 2–3 anchos con criterio (formularios angostos ~460–560; listas/detalle ~640–720; paneles anchos ~900) y aplicarlos por tipo, no ad hoc. |
| B5 | 🟢 | **Encabezados de pila no idénticos:** el `topBar` (PillButton + subtítulo + spacer) repite en cada pantalla con `spacer` de ancho variable (44/48/52) y a mano. | `perfil/costos/chats/…` | Extraer un `ScreenHeader` compartido (título + volver + acción opcional), como ya existe `AdminHeader` para el panel. |
| B6 | 🔴 | **Accesibilidad: 0 pantallas** usan `accessibilityLabel`/`Role`; solo 2 componentes (`text-field`, `empresa-chips`). Controles solo-ícono sin nombre: **SOS FAB**, enviar `➤` (chat/mensajes), cerrar `✕` (Resumen), chevrons de retroceso. | grep | v2 §9: label + rol en todo control sin texto; estados anunciados; auditar con accesslint por bloque. |
| B7 | 🟢 | **Etiqueta de tab abreviada:** "Mantto." mientras el resto va completo (Resumen/Flota/Personal/Viajes/Más). | `panel/_layout.tsx` | Coherencia: o todas caben completas ("Mantenim." / repensar) o se decide un criterio de truncado. |
| B8 | 🟢 | **Disciplina tipográfica dispar:** cifras que cambian en vivo sin `tabular-nums` en varios sitios; eyebrows sin tracking (hasta ahora no había token — ya está T1). | varios | v2 §4: sistematizar roles + tracking (T1) + tabulares vía `ThemedText`. |
| B9 | 🟢 | **Sombra hardcodeada:** `floatShadow` a mano en los FAB del Inicio del conductor. | `(driver)/index.tsx` styles | Migrar a `shadows.floating` (T5, ya añadido). |
| B10 | ✅ | **Fondo ambiental en pantallas densas** (flota/personal/mantenimiento/costos…). | — | **Ya resuelto en esta sesión** (restraint aprobado): ambient solo en hero (login/empresas/Inicio sin chip/Resumen). |

---

## C. Lista priorizada de pantallas (mayor → menor impacto visual)

Criterio: frecuencia de uso × primera impresión × brecha de pulido actual. Coincide y refina el orden
que propusiste.

**Tier 0 — Fundaciones (elevarlas mejora TODO de golpe):**
1. **Componentes base compartidos** — `button`, `card`, `text-field`, `themed-text`, `themed-view`,
   `metric-card`, `segmented-control`, `ot-status-badge`/badges, `pill-button`, `skeleton`,
   `pulse-dot`, + un `ScreenHeader` nuevo (B5) y un patrón `EmptyState`/`ErrorState` (A2/B3).

**Tier 1 — Primera impresión / uso diario:**
2. **Login + MFA + Sedes** — lo primero que ve todo el mundo. Login ya tuvo una pasada; MFA y Sedes
   se quedaron atrás y deben igualar el nivel.
3. **Inicio del conductor (map-first)** — el hogar del conductor, en campo, a diario. Máxima
   exigencia de claridad y target grande. (Aquí viven A3, B6-SOS, B9.)
4. **Panel · Resumen** (`panel/index`) — aterrizaje del admin; KPIs + mapa.

**Tier 2 — Núcleo de administración (listas densas):**
5. **Flota** · 6. **Personal** · 7. **Mantenimiento** · 8. **Operaciones (Viajes)** — patrón de fila
   de lista, estados, densidad compacta (v2 §5). Alto tráfico del admin.

**Tier 3 — Detalle y expediente:**
9. **Orden de trabajo** (`orden`, corrige B1) · 10. **Perfil/Expediente** · 11. **Costos** ·
   12. **Reportes** (`reporte`, `reporte-usuarios`, `reporte-multi`) · 13. **Comparar**.

**Tier 4 — Comunicación:**
14. **Chats** · 15. **Chat** (corrige A4) · 16. **Mensajes** (conductor).

**Tier 5 — Conductor secundario:**
17. **Viajes** · 18. **Inspección** · 19. **Alertas** · 20. **Más** (conductor).

**Tier 6 — Flujos puntuales:**
21. **Emergencia** · 22. **Reportar falla** · 23. **Asignar viaje** (corrige A1) · 24. **Documentos**
    · 25. **Sincronización** · 26. **Empresas** (ya decente) · 27. **Más** (admin).

---

## D. Recomendación de secuencia

1. **Arreglar bugs primero (rápidos):** A1 (`router.back()`), A3 (unificar carga), A4 (companyId+marca
   en chat), A5 (guard driver). A2/B3 (estados de error) y B6 (accesibilidad) se resuelven mejor
   **dentro** del Tier 0 (al crear los componentes/patrones base `ErrorState`, `EmptyState`,
   `ScreenHeader` y añadir labels), porque son transversales.
2. **Tier 0 — componentes base** (incluye B1, B2, B5, B8, B9 y las bases de A2/B3/B6). Un solo salto
   que eleva toda la app y deja los patrones listos.
3. De ahí, **Tier 1 → Tier 6**, un bloque coherente a la vez, con `tsc`/lint en 0 y explicación,
   deteniéndome en cada uno para tu confirmación.

> Nota sobre accesslint: la skill no está disponible como herramienta invocable en este entorno; la
> accesibilidad (B6, contraste, targets, labels) la auditaré **a mano contra los criterios de la v2 §9**
> en cada bloque. Si me confirmas otra vía para correr accesslint, la integro.

*Fin de FASE 1. No avanzo al rediseño hasta tu confirmación. Sugerencia: aprobar arreglar A1/A3/A4/A5
ya (bugs baratos) y arrancar el Tier 0 (componentes base) como primer bloque de FASE 2.*
