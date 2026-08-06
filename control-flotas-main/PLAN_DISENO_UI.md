# Plan de Revolución de Diseño — FOM (nativo RN)

> Análisis de toda la app con la lente de la skill **impeccable** (traducida a React Native) +
> filosofía de movimiento de Emil Kowalski. Objetivo: **+200% de mejora notable** en cada pantalla,
> botón, tab, animación y acabado — sin romper lógica. Todo del tema (cero hardcodeados).

## 1. Diagnóstico honesto (qué nos delata como "diseño de plantilla")

`impeccable` marca varios patrones que HOY usamos por reflejo y que restan carácter:

| Patrón actual | Problema | Hacia dónde |
|---|---|---|
| **Eyebrow en cada sección** (`overline` "TU JORNADA", "POR CATEGORÍA"…) | "AI grammar": aparece en el 55–95% de generaciones. | Eyebrows solo cuando aportan; jerarquía por **tamaño/peso**, no por kicker repetido. |
| **`MetricCard` = hero-metric** (número grande + etiqueta chica) | Cliché SaaS repetido. | KPIs con **contexto** (tendencia, delta, mini-spark), no solo un número suelto. |
| **Tarjetas anidadas** (MetricCard=Card dentro de grid dentro de Card) | "Nested cards are always wrong". | **Una** superficie con divisores; métricas sin caja propia. |
| **Ghost-card** (borde hairline + sombra en la misma tarjeta) | Delator de IA. | Elegir **uno**: borde limpio **o** sombra definida, no ambos. |
| **Grids de tarjetas idénticas** | Monótono. | Ritmo: tamaños/pesos variados, jerarquía real. |
| Todo resuelto con **Card** | "Cards are the lazy answer". | Listas con divisores, secciones con aire, tarjeta solo cuando es la mejor pieza. |

**Lo que SÍ está bien y se queda:** tema por empresa, semáforo de estado, fondo degradé (hero),
accesibilidad, `useAsyncData` + estados. La base es sólida; falta **carácter y movimiento**.

## 2. Dirección "200%" (los movimientos audaces)

1. **Profundidad real, no plana.** Sistema de elevación con intención: lienzo → superficie → flotante.
   Sombras suaves solo donde algo flota (FAB, tab bar, hoja). Ya hay tokens (`shadows.floating`, T5).
2. **Movimiento con propósito (restraint de Emil).** Entradas *ease-out* (nunca rebote), resortes de
   baja oscilación en interacción, **stagger no uniforme** (cada revelado a la medida de lo que revela),
   números que cuentan al aparecer (hero), y transición fluida entre pantallas. Todo respeta
   reduce-motion.
3. **Tipografía con jerarquía audaz.** Menos eyebrows; titulares más grandes y con carácter; cifras
   **tabulares**; tracking del token T1. El dato manda visualmente.
4. **Color de marca como protagonista** en los momentos hero (login, inicio, resumen), no solo un
   acento tímido — pero legible en campo.
5. **Acabado fino en cada toque.** Feedback de escala en todo lo tocable, estados (reposo/press/
   foco/cargando/vacío/error) resueltos y consistentes, targets ≥44.

## 3. Checklist por superficie

### ✅ Ya ejecutado en este bloque (se siente en TODA la app)
- **Barra de pestañas premium** (`app-tab-bar.tsx`): pill de acento que **se desliza con resorte** a la
  pestaña activa, ícono/etiqueta activos en color de marca, **lift** sutil del contenido activo,
  feedback de escala al tocar, respeta área segura y reduce-motion, accesible. Conductor **y** admin.
- **Botones con profundidad**: los rellenos (primario/danger) ganan elevación sutil; el secundario
  con borde **no** lleva sombra (evita el ghost-card). Press con `micro` + curva estándar.

### ⏭️ Siguiente (pantallas hero, una a la vez, para calibrar el nivel contigo)
- [ ] **Inicio del conductor**: telemetría con **medidores animados** (combustible/aceite que se
      llenan), velocidad con conteo, lengüeta con más vida, SOS/Reportar con acabado. (La más wow.)
- [ ] **Login**: de "bonito" a "increíble" — profundidad, marca protagonista, entrada más rica.
- [ ] **Resumen del admin**: KPIs con contexto (no hero-metric suelto), mapa integrado, entrada
      escalonada a medida.

### ⏭️ Sistema compartido (elevar una vez → toca todo)
- [ ] **Card**: resolver ghost-card (borde **o** sombra), variante tocable con realce, quitar anidamiento.
- [ ] **MetricCard → KPI**: contexto (delta/tendencia), sin caja propia en grids.
- [ ] **Fila de lista**: patrón único (punto de estado · contenido · dato), divisores sutiles, press.
- [ ] **ScreenHeader**: propagarlo a todas las pantallas de pila (unifica el "Atrás").
- [ ] **SegmentedControl**: highlight deslizante animado (hoy cambia instantáneo).
- [ ] **Badges/pills de estado**: ya es el patrón canónico; pulir tracking.

### ⏭️ Pantallas secundarias
- [ ] Flota · Personal · Mantenimiento · Operaciones · Costos · Reportes · Perfil · Orden · Chats ·
      Viajes · Inspección · Alertas · Emergencia · Documentos — aplicar el sistema elevado + entrada.

## 4. Cómo seguimos
Una pantalla (o grupo coherente) a la vez, con `tsc`/lint en 0 y explicación, deteniéndome para que
la veas en Expo antes de propagar. Empezamos por la que elijas de la sección hero.
