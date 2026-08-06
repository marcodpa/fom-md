# Product

## Register

product

## Users

- **Supervisores de empresa (Yeison):** operan la flota desde el panel, a menudo apurados y entre tareas; necesitan el dato clave en menos de un segundo.
- **Conductores (Pedro, Luis):** usan la app en campo, con sol, guantes y señal intermitente; targets grandes, offline-first.
- **Supervisores de predefinida (Lino / Chevron):** consultan la capa gerencial en oficina; solo lectura, cero ruido operativo.
- **Cuentas personales (Ale, Santi):** flota doméstica; experiencia simple, mapa y alertas.
- **Admin (Marco, Juan):** administra todo el sistema; da de alta empresas y vehículos con GPS.

## Product Purpose

App de control de flotas (FOM) React Native + Expo: mapa en vivo, inspección diaria, ODT (órdenes de trabajo), reglas de alerta, reportes (incluido el formato que exige la contratante, ej. Chevron) y auditoría. La fuente de verdad funcional es `FOM-02-FUN-002-V0.2.md`. Éxito = cada rol encuentra y ejecuta su tarea sin fricción y los informes a la contratante mejoran radicalmente a los actuales (PDF SIRCOP).

## Brand Personality

**Calma con precisión.** Moderno, profesional, de cuidado (nunca de vigilancia). Referencias de actitud: Samsara (mapa protagonista, densidad calmada), Linear/Apple (contención, tipografía, microinteracciones discretas). La marca de la EMPRESA ACTIVA pinta el acento de cada pantalla (sistema multi-marca sagrado).

## Anti-references

- Dashboards genéricos de SaaS con gradientes morados, glows de neón y hero-metrics decorativos.
- Interfaces de "vigilancia" (copy punitivo, rojos agresivos): el semáforo es seguridad, no castigo.
- Sobre-animación: nada que rebote, gire o retrase al usuario; el movimiento se siente, no se ve.
- Web-isms: esto es RN + Expo nativo — nada de CSS/Tailwind/Framer Motion; todo se traduce a su equivalente nativo.

## Design Principles

1. **Jerarquía por estructura, no por ruido.** Tamaño, peso y espacio ordenan; el color pleno se reserva para marca y estado.
2. **Un sistema, cero divergencias.** El mismo elemento se ve e interactúa idéntico en toda la app (badge de ODT, fila de lista, botón: uno solo, reutilizado).
3. **Todos los estados o no está terminado.** Reposo, presionado, foco, seleccionado, cargando (skeleton con forma real), vacío amable y error con reintento.
4. **Restraint de movimiento (Emil Kowalski).** ≤360 ms, curvas decelerate, stagger solo en los primeros 3–5 elementos, `useReducedMotion()` siempre.
5. **Todo del tema.** Cero valores hardcodeados: color, spacing, radio, tipografía y sombra salen de `useTheme()`.

## Accessibility & Inclusion

Contraste: texto principal ≥7:1, secundario ≥4.5:1 en ambos modos. Targets ≥44 px (48 en acciones primarias y conducción). `accessibilityLabel`/`accessibilityRole` en todo control sin texto visible. El semáforo se distingue por forma/etiqueta además del color. Reduce-motion respetado en toda animación.
