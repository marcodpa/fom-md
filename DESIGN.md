# Sistema de diseño: FOM — Control de flotas

> Documento para generar pantallas en Google Stitch que coincidan con el sitio real.
> Todo valor entre paréntesis es literal: cópialo, no lo aproximes.
> **Todo el texto visible va en español de Venezuela.** Nada de inglés en la interfaz.

---

## 1. Atmósfera visual

**Calma con precisión.** Una plataforma de control de flotas GPS para la Costa Oriental
del Lago de Maracaibo. La sensación es la de una sala de control bien iluminada de noche:
oscura, ordenada, con un solo color vivo que señala lo que importa. Nunca es una interfaz
de vigilancia ni de castigo; es de cuidado.

- **Densidad: 4 de 10.** Equilibrada. Respira, pero cada bloque carga información real.
- **Variación: 7 de 10.** Asimétrica y deliberada. Cada página tiene su propia estructura.
- **Movimiento: 6 de 10.** Fluido y con peso. Se siente, no se ve.

Referencias de actitud: Samsara (el mapa manda, densidad calmada) y Linear (contención,
tipografía, microinteracciones discretas). Anti-referencia: cualquier panel SaaS genérico
con degradados morados, resplandores de neón y métricas decorativas.

---

## 2. Paleta y funciones

### Base oscura (la del sitio)
- **Lienzo Nocturno** (`#0a0d12`) — fondo de toda la página. Negro azulado, **nunca `#000000`**
- **Superficie Elevada** (`#141a22`) — tarjetas, paneles, superficies sobre el lienzo
- **Superficie Alta** (`#1d2530`) — capas por encima de una tarjeta
- **Tinta Clara** (`#f3f5f8`) — texto principal
- **Acero Templado** (`#abb3bf`) — texto secundario, descripciones, metadatos
- **Filo de Cabello** (`rgba(171, 179, 191, 0.13)`) — bordes de 1 px, separadores, hairlines

### Acento único
- **Azul Operación** (`#3d9bf5`) — acento principal: enlaces, estados activos, foco, datos vivos
- **Azul Profundo** (`#208aef`) — el mismo acento en su versión de relleno para botones

**Solo hay un acento.** No se agregan segundos colores de marca.

### Semánticos, solo para estado (jamás decorativos)
- **Verde En Marcha** (`#3dd68c`) — unidad en movimiento, todo al día, conforme
- **Ámbar Atención** (`#f5c242`) — por vencer, con observaciones, requiere revisión
- **Rojo Alerta** (`#ff6369`) — vencido, bloqueado, falla crítica

Regla estricta: el semáforo **siempre lleva forma o etiqueta además del color**
(un punto más el texto "En marcha"), nunca solo color.

### Bandas claras (para meter luz entre secciones oscuras)
- **Gris Perla** (degradado `#dce1ea` → `#d1d7e2`) — fondo de las secciones claras
- **Tinta Profunda** (`#0d1526`) — títulos sobre gris
- **Pizarra Suave** (`#4a5468`) — cuerpo sobre gris
- **Nube** (`#eef1f6`) — tarjetas dentro de una banda clara

**El gris nunca es blanco puro.** Se probó blanco y deslumbraba: quedó descartado.

### Prohibido en color
Morado, magenta, neón, degradados arcoíris, resplandores exteriores de color,
sombras negras puras. Las sombras se tiñen del azul del fondo:
`0 24px 50px -34px rgba(4, 12, 28, 0.9)`.

---

## 3. Tipografía

- **Títulos: Space Grotesk** (500, 600, 700). Tracking apretado (`-0.02em` en grandes).
  Geométrica y con carácter, nunca neutra.
- **Cuerpo: Plus Jakarta Sans** (400, 500, 600). Interlineado `1.6`, máximo `65ch` de ancho.
- **Números: siempre `font-variant-numeric: tabular-nums`.** Todo dato que cambie en vivo
  (velocidad, kilometraje, contadores) debe usarlo para que no baile.

### Escala
| Uso | Tamaño | Peso | Tracking |
|---|---|---|---|
| Título de página (h1) | `clamp(34px, 5vw, 58px)` | 700 | `-0.02em` |
| Título de sección (h2) | `clamp(26px, 3.2vw, 40px)` | 600 | `-0.025em` |
| Título de tarjeta | `16px` | 600 | normal |
| Cuerpo | `15.5px` a `16px` | 400 | normal |
| Secundario | `13px` a `14px` | 400 | normal |
| **Eyebrow** | `12px` | 600 | `+0.16em`, MAYÚSCULAS, en Azul Operación |

Los títulos llevan `text-wrap: balance`; los párrafos, `text-wrap: pretty`.
Máximo dos pesos por pantalla. El 700 se reserva para el h1.

### Prohibido en tipografía
`Inter`, `Roboto`, `Arial`, `Open Sans`, fuentes de sistema genéricas, cualquier serif
(`Times New Roman`, `Georgia`, `Garamond`), MAYÚSCULAS dentro de botones, alturas de
línea fijadas a mano, y números en vivo sin cifras tabulares.

---

## 4. Componentes

### Barra de navegación
Ancho completo, transparente sobre el hero. Al hacer scroll aparece un velo oscuro
(`rgba(8, 11, 17, 0.92)`) con hairline inferior. Rejilla de tres zonas:
marca a la izquierda, navegación **centrada**, acciones a la derecha.

- La pestaña activa se marca con una cápsula (`background: rgba(255,255,255,0.1)`, radio 9 px)
- Dos pestañas abren un desplegable al pasar el mouse, con puente de 12 px para que no se
  cierre al mover el cursor: cada opción lleva nombre en negrita más una línea de descripción
- CTA: píldora de vidrio con `backdrop-filter: blur(10px)` y una **insignia circular** con
  la flecha diagonal embebida dentro del botón, pegada al borde interior derecho
- Sobre un hero claro, el texto de la barra pasa a `#253046`

### Botones
- **Primario:** píldora (`999px`), relleno de Azul Profundo, texto `#061019`, sombra teñida
  `0 18px 44px -20px rgba(61,155,245,0.75)`
- **Secundario:** píldora, borde hairline, fondo `rgba(255,255,255,0.03)`, sin sombra
- Al presionar: `scale(0.985)`. **Nunca resplandor exterior ni cursor personalizado**
- Todo botón declara su fondo: sin ello el navegador pinta el gris de sistema (`#f0f0f0`)
  y sobre fondo oscuro aparece una caja blanca. Es el error más fácil de cometer aquí.

### Tarjetas
Radio `18px`. Fondo `#141a22` o degradado sutil. Borde hairline. Sombra teñida de azul,
nunca negra. Se usan **solo cuando la elevación comunica jerarquía**; en listas densas se
sustituyen por separadores hairline y espacio en blanco.

Los contenedores premium usan **doble bisel**: carcasa exterior con relleno de 7 px y radio
22 px, y núcleo interior con radio calculado (`calc(22px - 7px)`) y filo de luz interno
(`inset 0 1px 0 rgba(255,255,255,0.05)`). Se ve como equipo físico, no como un div.

### Maquetas de interfaz (obligatorias en las páginas de producto)
Cada bloque de contenido se acompaña de una **interfaz real dibujada en SVG y CSS**, nunca
una foto de banco de imágenes:
- Marco de navegador con barra de direcciones `app.fom.com.ve/flota`, barra lateral con
  placas venezolanas, indicadores y mapa
- iPhone con la pantalla real de la app del conductor
- Tarjetas sueltas: alertas con riel de severidad, telemetría con barras, órdenes de
  trabajo, zonas con mapa, índice de manejo con anillo, roles con avatares

Las maquetas tienen vida con CSS puro: las barras crecen al entrar en pantalla, el punto
"en vivo" late, la ruta activa avanza con guiones animados.

### Formularios
Etiqueta arriba, error abajo. Altura de campo `46-54px`, radio `12px`. Foco: borde en el
acento más un halo `0 0 0 1.5px`. Sin etiquetas flotantes.

### Estados de carga, vacío y error
- **Carga:** esqueletos con la forma real del contenido. **Prohibidos los spinners circulares**
- **Vacío:** círculo de icono de 72 px, título, descripción amable y una acción.
  Nunca un vacío frío ni un "Sin datos" pelado
- **Error:** círculo en tono de peligro, mensaje humano y botón "Reintentar".
  Nunca una pantalla en blanco ni un error crudo

### Acordeón de preguntas
Tarjetas de azul oscuro (degradado `#121a2b` → `#0e1522`), radio `14px`, separadas 10 px.
Al abrir suben a `#16223a` → `#101a2c` con borde azul. El signo de más gira 135° hasta
formar una equis. Encima: buscador en píldora que filtra al escribir y resalta las
coincidencias, más chips de tema con contador.

---

## 5. Principios de composición

- **Contenedor máximo `1180px`**, centrado. Barra de navegación de `84px`.
- **CSS Grid, no cálculos con porcentajes.** Nada de `calc()` para repartir columnas.
- **Ningún elemento se superpone a otro.** Cada bloque ocupa su zona limpia.
- Secciones a pantalla completa con `min-height: 100dvh`, **nunca `100vh`**.

### El ritmo oscuro/claro (regla central del sitio)
Las páginas alternan secciones oscuras y bandas claras siguiendo un patrón **asimétrico**:

- **La primera sección de contenido nunca es clara.** Siempre abre en oscuro.
- **Nunca dos bandas claras seguidas.** Y jamás tres.
- El patrón varía por página: `oscura · CLARA · oscura · oscura · CLARA · oscura`
  es válido; `oscura · CLARA · oscura · CLARA` también. Lo prohibido es la simetría plana.
- Las bandas claras son **paneles flotantes**: radio `clamp(20px, 3vw, 36px)` y margen
  lateral `clamp(10px, 2vw, 28px)`, para que el fondo oscuro asome alrededor y la
  transición se lea como intencional y no como un corte.

### Tipos de sección (se combinan distinto en cada página)
1. **Fila** (oscura) — rejilla de dos columnas `0.92fr / 1.08fr`, texto y maqueta,
   alternando el lado en cada aparición. Las capacidades van como lista con hairlines,
   no como cajas.
2. **Banda** (clara) — cifra gigante (`clamp(44px, 6vw, 72px)`) como ancla visual, texto
   y maqueta grande al lado.
3. **Bento** (clara) — encabezado más rejilla asimétrica de 6 columnas: la maqueta ocupa
   3 columnas por 2 filas, las tarjetas 3 columnas cada una.
4. **Línea de tiempo** (oscura) — pasos numerados `01, 02, 03` unidos por un hilo con
   degradado, **solo cuando el contenido es realmente secuencial**.
5. **Registro** (oscura) — la misma línea pero con marcador de rombo en vez de número,
   para contenido que no lleva orden.

### Heros: uno distinto por página
- **Dividido:** título a la izquierda, maqueta de panel a la derecha, más una franja
  inferior de cuatro cifras separadas por hairlines verticales
- **Centrado con chips:** título centrado y una nube de píldoras con las capacidades
- **Métrico:** título a la izquierda y una columna de tres cifras grandes con borde
  izquierdo azul
- **Con formulario:** título a la izquierda y una tarjeta de formulario a la derecha
- **Claro:** el mismo dividido pero con fondo `#f6f8fc` → `#eef2f8` y texto oscuro

**Prohibido:** que dos páginas abran con el mismo hero, y que dos secciones seguidas usen
la misma maqueta o el mismo aparato (dos teléfonos consecutivos se leen como una repetición).

### Prohibido en composición
La fila de tres tarjetas iguales, todo centrado y simétrico, tarjetas de igual altura
forzadas por flexbox, radios uniformes en todo, y márgenes sueltos por hijo
(un solo `gap` por contenedor).

---

## 6. Movimiento

Curvas propias, con física de resorte y sin rebote:
- **Estándar:** `cubic-bezier(0.32, 0.72, 0, 1)`
- **Desaceleración:** `cubic-bezier(0.16, 1, 0.3, 1)`
- **Prohibidas:** `linear`, `ease-in-out`, y cualquier cambio de estado instantáneo

Duraciones: `0.25s` microinteracciones, `0.4s` transiciones, `0.7s` entradas.
Nada por encima de `1.1s`.

- **Entrada al hacer scroll:** desvanecido más subida de `52px` más desenfoque de `10px`
  que se resuelve. Escalonado solo en los primeros 3 a 5 elementos, con `60ms` de retraso
  entre ellos. **Jamás animar elemento por elemento una lista larga.**
- **Hover:** elevación de 1 a 3 px más cambio de color del borde. Sin rebotes.
- **Bucles permitidos: solo dos.** El punto "en vivo" que late y la ruta del mapa que avanza.
  Nada más se repite infinitamente.
- **Solo `transform` y `opacity`.** Nunca animar `top`, `left`, `width` ni `height`.
- `backdrop-filter` únicamente en elementos fijos (barra de navegación, superposiciones).
- **`prefers-reduced-motion` se respeta en toda animación.** Y el contenido debe ser
  legible aunque la animación no llegue a ejecutarse: nada arranca desde `opacity: 0`
  sin una red de seguridad.

---

## 7. Contenido y voz

Español de Venezuela, directo y sin adornos. El producto habla de cuidado, no de vigilancia.

- Datos verosímiles: placas venezolanas (`A48BF2C`), nombres reales
  (Carlos Méndez, Ana Rincón, Yeison Márquez), lugares reales (Maracaibo, Cabimas,
  Ciudad Ojeda, Lagunillas, Bachaquero)
- Cifras que sobrevivan la pregunta "¿cómo lo saben?". Nada de `99,99%` ni `50%`
- Sentence case en los títulos, nunca Title Case
- **Sin rayas largas (—) en el texto visible.** Se usan comas o dos puntos

### Prohibido en el texto
"Elevar", "sin fisuras", "revolucionario", "próxima generación", "potenciar",
"Acme", "John Doe", signos de exclamación en mensajes de éxito, "¡Ups!" en los errores,
y "Lorem ipsum" en cualquier forma.

---

## 8. Adaptación a pantallas

- Todo lo de varias columnas colapsa a una sola por debajo de `768px`. Sin excepciones.
- **El desbordamiento horizontal es un fallo crítico.** Las tablas y bloques anchos
  hacen scroll dentro de su propio contenedor.
- Títulos con `clamp()`. Cuerpo nunca menor a `14px`.
- Áreas táctiles mínimas de `44px`.
- En móvil el visual del bento va al final, no empujando las tarjetas.
- La navegación horizontal pasa a un panel lateral con velo.

---

## 9. Prohibiciones absolutas

1. Emojis en cualquier parte de la interfaz
2. `Inter` u otra fuente genérica de sistema
3. Negro puro `#000000`
4. Blanco puro como fondo de sección (se usa Gris Perla)
5. Sombras negras sin teñir y resplandores de neón
6. Más de un color de acento
7. Semánticos usados como decoración
8. Tres tarjetas iguales en fila
9. Dos bandas claras seguidas, y la primera sección jamás clara
10. Heros centrados repetidos entre páginas
11. Spinners circulares en lugar de esqueletos
12. Superposición de elementos
13. Cursores personalizados
14. Textos de relleno tipo "Desliza para explorar" o flechas que rebotan
15. Rayas largas (—) en el texto visible
16. Enlaces rotos de Unsplash. Si hace falta relleno visual, se dibuja en SVG
17. Botones sin fondo declarado (el navegador pinta gris de sistema)
