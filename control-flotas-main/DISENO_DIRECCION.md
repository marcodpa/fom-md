# Dirección de diseño — Control de Flotas

> Guía concreta para la pasada de pulido visual. Destila lo mejor de las apps de referencia (Samsara, Fleetio, Azuga, Motive) en reglas accionables. **No cambia funcionalidad: solo presentación.** Léela junto con BRIEF_PROYECTO.md.

## 1. Filosofía

Moderno y profesional, con **calma y confianza**, no llamativo ni recargado. La app cuida a la gente: el diseño debe sentirse claro, serio y tranquilo, como una herramienta de trabajo en la que se confía. Referentes de actitud: Samsara y Apple/Linear. Menos es más: cada pantalla respira, la información importante resalta sola, nada compite por atención.

## 2. Color

- Mantén INTACTO el sistema de tema por empresa. El color de acento de cada pantalla = el color de la empresa activa.
- Fondo en capas (dark): un fondo base, una capa de "superficie" para tarjetas, y una capa más clara para elementos dentro de tarjetas. La jerarquía se logra con estas capas + bordes sutiles (1px, baja opacidad), no con sombras fuertes.
- Sombras suaves SOLO para elementos flotantes (hojas inferiores, popovers, el menú de cambiar empresa).
- Colores semánticos (verde / amarillo / rojo) RESERVADOS para estado y seguridad (semáforo, en marcha/parado, estados de OT). Nunca como decoración.
- Contraste accesible siempre: ningún texto importante en gris ilegible sobre fondo oscuro.

## 3. Tipografía

Aplica una escala consistente en toda la app (valores de referencia para móvil):

- Título de pantalla: 28–32, peso 700, tracking ligeramente negativo.
- Eyebrow / título de sección: 12–13, peso 600, MAYÚSCULAS, tracking amplio, color tenue.
- Título de tarjeta: 17–20, peso 600.
- Cuerpo: 15–16, peso 400.
- Etiqueta / pie: 13–14, peso 500, color tenue.
- Dato grande (velocidad, score, números clave): 28–40, peso 700, con cifras tabulares (que no "bailen" al cambiar).

**Texto dentro de botones (importante):** 16–17, peso 600, centrado vertical y horizontalmente, con padding generoso para que NUNCA se vea apretado ni cortado. Altura mínima del botón 48px (área táctil cómoda). No usar mayúsculas dentro de los botones salvo micro-etiquetas.

## 4. Espaciado, radios y elevación

- Escala de espaciado: 4, 8, 12, 16, 20, 24, 32. Úsala de forma consistente.
- Padding interno de tarjetas: 16–20. Separación entre tarjetas: 12–16. Márgenes de pantalla: 16–20.
- Radios: inputs y botones 12–14; tarjetas 16–20; chips y pills redondeados completos; contenedor del mapa 16.

## 5. Componentes

- **Botón primario:** fondo = color de empresa, texto de alto contraste, peso 600, altura ≥48, radio 12–14. Estado al presionar: escala 0.98 + tono un poco más oscuro. Estado deshabilitado: opacidad reducida pero TEXTO AÚN LEGIBLE (hoy el "Entrar" deshabilitado se ve demasiado apagado: súbele legibilidad).
- **Botón secundario:** fondo de superficie, borde sutil, texto claro.
- **Botón terciario / ghost:** sin fondo, solo texto en color de empresa.
- **Acción destructiva (Salir):** texto rojo discreto, sin gritar.
- **Tarjetas:** superficie + borde sutil; al presionar (si son tocables) un leve realce. Jerarquía clara entre título, dato y pie.
- **Inputs:** superficie, borde sutil, foco con un realce en color de empresa; el ojito de contraseña ya existe, mantén su estilo coherente.
- **Chips (tipo de falla, filtros):** pill, seleccionado = color de empresa, no seleccionado = superficie con borde.
- **Filas de lista (vehículos, usuarios, OT):** punto de estado a la izquierda, contenido al centro, dato a la derecha; separadores muy sutiles.
- **Anillo de score ("Mi manejo"):** grosor consistente, color del semáforo, número tabular centrado, animación de llenado al entrar.

## 6. Indicadores de estado

- **Punto de estado:** 8–10px. Cuando está "en vivo", halo suave que late (pulse).
- **Pills de estado** (EN VIVO, ENVIADA, REVISADA, EN PROCESO, REALIZADA): fondo con ~10–15% de opacidad del color semántico, texto en el color pleno, 11–12, peso 600, mayúsculas. Que cada estado tenga su color y sea reconocible de un vistazo.
- **Barras de progreso** (índice seguro): track tenue, relleno en color, extremos redondeados.

## 7. Movimiento y animación

Discreto y con propósito; nunca rebotón ni distractor:

- Feedback al presionar en TODO lo tocable (escala ~0.97–0.98, ~100ms).
- Transiciones de pantalla suaves (deslizar/desvanecer nativo).
- Skeletons (esqueletos de carga) en vez de spinners para listas y paneles.
- Pulse en el indicador "EN VIVO".
- Opcional y sutil: conteo ascendente en números grandes (velocidad, score) al aparecer.
- Respetar SIEMPRE "reducir movimiento" del sistema.

## 8. Qué tomar de cada referencia

- **Samsara:** mapa protagonista, densidad de datos calmada, jerarquía limpia.
- **Fleetio:** claridad de estados y jerarquía de tarjetas para OT e historial.
- **Azuga:** presentación motivadora del score (anillo, color, sensación de progreso).
- **Motive:** simpleza y botones grandes en la vista de conductor (se usa manejando).
- **Apple / Linear (actitud):** contención, buena tipografía, microinteracciones discretas.

## 9. Reglas duras

- NO cambiar funcionalidad, navegación, lógica ni datos. Solo presentación.
- Centralizar TODOS los tokens (colores por capa, escala tipográfica, espaciado, radios, duraciones) en el sistema de tema, en un solo lugar, para que el cambio propague a toda la app.
- Mantener el tema por empresa intacto.
- Consistencia total: el mismo tipo de elemento se ve igual en toda la app.
- Áreas táctiles cómodas (≥44–48px) y contraste legible en todo.
