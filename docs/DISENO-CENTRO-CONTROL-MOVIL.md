# Centro de control en el teléfono: la parte de arriba

Hecho en la web el 4 nov 2026 (`CentroControl.jsx`, `control-map.css`, bloque
«TELÉFONO»). La app lo copia igual en `src/app/mapa-flota.tsx` (y en el mapa de
`src/app/panel/flota.tsx` si muestra filtros sobre el mapa).

## Idea

Más mapa y menos cajas. Arriba solo hay tres piezas, sin tarjeta que las
envuelva: la barra, el buscador y una fila de chips. La fila de chips hace de
filtro, de cifra y de leyenda a la vez. Todo termina a **166 px** del borde de
arriba (más el área segura). Antes eran unos 300 px.

## Orden y medidas (ancho 375, sin contar el área segura de arriba)

| # | Pieza | y (px) | Alto | Lados |
|---|-------|--------|------|-------|
| 1 | Barra: círculo «volver» 44 + cápsula 52 | 12–64 | 52 | 14 |
| 2 | Buscador en píldora | 72–116 | 44 | 12 |
| 3 | Fila de chips (padding 4 arriba y abajo) | 122–170 | 40 visibles (126–166) | de borde a borde, padding 12 |
| 4 | Botón de capas, círculo | 178–222 | 44 | derecha 12 |

Huecos: 8 entre la barra y el buscador, 6 entre el buscador y la fila, 12
entre los chips y el botón de capas.

### 1. Barra (ScreenHeader de pila)

- Círculo «‹» de 44 y la cápsula (alto mínimo 52, radio 24, padding 6/14). En el
  mapa se usa el fondo `sobre-mapa` (`rgb(20 26 34 / .94)`).
- Dentro de la cápsula, a la izquierda, dos líneas:
  - «Centro de control»: 600, 15/18, `texto`.
  - Debajo, la empresa: logo de **20×20** (radio 6, borde 1 `borde`; sin logo,
    el monograma con las iniciales en `primario`) + nombre en 500, 12/16,
    `texto-2`, en una línea con «…» si no cabe. Hueco de 6 entre logo y nombre.
- A la derecha, el logo FOM (67 de ancho), como en todas las barras de pila.
- Administrador FOM dentro de otra empresa: el logo lleva un aro azul de 1 px
  (`primario`). El lector de pantalla oye «… · Gestionando como administrador
  FOM». Es la misma regla que `marcaDe` y `MarcaEmpresa compacta` en la web.
- El conductor no ve esta línea: su mapa es otro.

### 2. Buscador

- Píldora de 44 de alto, radio 999, fondo `sobre-mapa`, borde 1 `borde`, sombra
  flotante. La lupa a 16 de la izquierda y el texto en 15.
- Texto de ayuda: «Placa, alias o conductor…». Filtra por placa, alias, número,
  marca, modelo y conductor.
- Dentro, a la derecha, el botón **Lista de unidades**: círculo de 36 a 4 px del
  borde (blanco táctil de 44), fondo `sup-alta` e icono de lista (tres
  renglones con viñeta) de 20. `accessibilityLabel="Lista de unidades"`. Con la
  lista abierta se pinta con `activo-sup` y el icono en `activo-texto`. Ya no se
  usa el camión.

### 3. Fila de chips

- Una sola fila que se desplaza de lado (`ScrollView horizontal`, sin barra), de
  borde a borde de la pantalla, con padding de 12 a cada lado. El chip cortado
  al final indica que hay más.
- Cada chip mide 40 de alto (con `hitSlop` de 2 arriba y abajo llega a 44),
  tiene padding 0/12, radio 10, hueco de 6 y letra 500 de 13. Fondo
  `sup-baja`, borde 1 `borde` y sombra flotante.
- Contenido: puntito de 8 del color del estado, el nombre y la cifra (600, 12,
  `texto-2`, cifras tabulares).
- Chip elegido: fondo `primario` al 24 % sobre `sup`, borde `primario`, texto
  `#E4F2FF`. La cifra hereda ese color al 85 %.
- Chips y colores (los mismos del marcador del mapa):

| Chip | Clave (`estadoUnidad`) | Punto | Cuándo se ve |
|------|------------------------|-------|--------------|
| Todas | — | sin punto | siempre |
| En marcha | `en_marcha` | verde `#35E888` | siempre |
| Detenidas | `parada` | azul `#5AA9FF` | siempre |
| Sin señal | `sin_senal` | gris `#A1AFBF` | siempre |
| Sin ubicación | `sin_ubicacion` | ámbar `#FFBF43` | si hay alguna o está elegido |
| Sin GPS | `sin_gps` | gris `#A1AFBF` | si hay alguna o está elegido |
| Área ▾ | — | — | si la empresa tiene áreas |
| «N sin posición · Ver» | — | texto `aviso` | si hay unidades sin coordenadas; abre la lista |

- **Las cifras salen de la regla única** (`estadoSenal` → `estadoUnidad` en
  `src/lib/sin-senal.ts` y `src/lib/estado-unidad.ts`). No se recalculan aparte.
  Se cuentan sobre la flota ya filtrada por área y buscador, antes de aplicar el
  estado. Así «Todas» siempre es la suma de las demás.
- El filtro de estado usa la misma clave: una unidad callada nunca entra en «En
  marcha» ni en «Detenidas».
- La línea «26 unidades · 14 en marcha · 23 con señal» desaparece: los chips ya
  dan esas cifras.
- **Chip de área**: muestra el área elegida («Todas las áreas», «Sur del lago»…)
  y una flecha ▾. Si hay un área elegida, se ve como chip activo. Al tocarlo se
  abre un menú justo debajo del chip, sin salirse de la pantalla: ancho
  `min(280, ancho − 24)`, radio 20, fondo `sup`, filas de 44, la elegida en
  `activo-sup` / `activo-texto` y con ✓. En la app puede ser una hoja inferior
  corta si resulta más cómodo, con las mismas filas.
  `accessibilityLabel="Área: <nombre>"`.

### 4. Capas y leyenda

- Botón de capas: círculo de 44, a la derecha a 12 px, 12 px bajo los chips. Su
  panel se abre hacia abajo.
- **En el teléfono no hay leyenda abajo**: los chips con puntito ya son la
  leyenda. En la computadora se queda.
- Cargando o «Ninguna unidad coincide»: el aviso va 12 px bajo los chips, con 68
  px libres a la derecha para no tapar el botón de capas.
- La hoja del recorrido crece como mucho hasta 12 px bajo el botón de capas. Le
  queda sitio arriba al logo de Mapbox, que la licencia obliga a mostrar.

## Comportamiento

- Al cambiar el estado, el área o el texto, si la unidad abierta deja de
  cumplir el filtro, su ficha se cierra. Un refresco de la flota no la cierra.
- Con la lista abierta, el botón de lista se ve activo. Si se abre una ficha,
  deja de verse activo.
- Menú de área: se cierra al elegir (el foco vuelve al chip), al tocar fuera o
  con «atrás».
- Accesibilidad: todo blanco táctil mide 44 o más. Ningún texto baja de 12. Los
  chips son botones con estado seleccionado (`accessibilityState={{ selected }}`).
- Reducir movimiento: sin animaciones nuevas. Si la fila se anima al elegir un
  chip, se respeta «reducir movimiento».

## Tokens

`sup` #141A22 · `sup-baja` #0F141B · `sup-alta` #1D2530 · `borde` #262E39 ·
`texto` #F3F5F8 · `texto-2` #ABB3BF · `primario` #3D9BF5 · `activo-sup` #173553 ·
`activo-texto` #8BC6FF · `sobre-mapa` rgb(20 26 34 / .94). Letra: Spline Sans.
