# ADN visual de la web FOM (v8)

Regla corta para quien toque `src/pages/v8` o `src/components/v8`. Sale de `v8-base.css` tal como
está aprobado (T-134). Si algo no está aquí, se copia de una página que ya funcione; no se inventa.

## Color

| Uso | Valor | Token |
|---|---|---|
| Fondo de la página (noche) | `#0a0d12` | `--v8-noche` |
| Banda (sección alterna, entra y sale con degradado largo) | `#0f141b` | `--v8-banda` |
| Superficie / vidrio | `#141a22` (vidrio: `rgba(20,26,34,.55)` + desenfoque 24 px) | `--v8-superficie` |
| Borde | `#262e39`; borde de vidrio `rgba(255,255,255,.11)` | `--v8-borde`, `--v8-borde-vidrio` |
| Texto / secundario / tenue | `#f3f5f8` / `#abb3bf` / `#8c97a7` | `--v8-texto`, `--v8-texto-2`, `--v8-tenue` |
| Azul FOM (botón, etiqueta, enlace) | `#3d9bf5`, hover `#5aabf7`, claro `#8bc6ff` | `--v8-azul`, `--v8-azul-hover`, `--v8-azul-claro` |
| Texto sobre azul | `#08121c` | `--v8-sobre-azul` |
| Estados | éxito `#3dd68c`, aviso `#f5c242`, peligro `#ff6369` | `--v8-ok`, `--v8-aviso`, `--v8-peligro` |

Contraste medido sobre `#0a0d12`: texto 17,8:1 · secundario 9,2:1 · tenue 6,6:1 · azul 6,7:1 ·
`#08121c` sobre el azul 6,5:1. Nada de colores sueltos: si hace falta uno nuevo, se crea token.

## Letra

- **Inter** (400/500/600/700), con Spline Sans de respaldo; se carga solo en la web v8.
- Titulares en 600, tracking en em (se aprieta con la talla):
  `h1` 42→80 px, interlínea 1,03, −0,03em · `h2` 34→56 px, 1,06, −0,026em ·
  `h3` 24→28 px, −0,018em · `h4` 17→19 px, −0,012em.
- Bajada (`.v8-lead`) 19→21 px, interlínea 1,45, color secundario.
- Etiqueta (`.v8-kick`): 15→17 px, 600, azul, 16 px sobre el titular. Sin números ni mayúsculas.
- Texto chico: `.v8-sm` 15 px; mínimo absoluto 13 px (`.v8-xs`, notas, chips, pie). Nunca 12 px.
- Titulares con `text-wrap: balance`; párrafos con `pretty`. En escritorio cada línea del titular
  va en su renglón (`Lineas`); en el teléfono corren seguidas.

## Espacio y ritmo

- Contenedor 1180 px, margen 22 px (20 en el teléfono).
- Sección: `--v8-sec-y` = 80→112 px arriba y abajo (72 en el teléfono).
- Encabezado → contenido: 48–64 px. Rejillas: 20 px de hueco (12 en el teléfono); cifras 48 px.
- Cortes: teléfono ≤ 599 · apilado < 900 · escena fija (pin) ≥ 1024.

## Forma

- Radios: pieza 10 · campo 16 · tarjeta 24 · hoja 28 · botones y pestañas en píldora.
- Vidrio oscuro redondeado para tarjetas, notas y la barra. Una sola cabecera flotante.
- Fotos de escena con esquinas de 28 px, sin velos ni degradados encima; las fotos a sangre se
  funden por el borde con máscara corta. Nada «pegado»: todo se apoya en el fondo de la página.
- Escena de teléfonos: sin caja propia; la cinta azul se funde en el fondo por los cuatro bordes.
- Sombras solo para dar altura (caída hacia abajo, negra azulada). Sin brillos de neón.

## Movimiento

- GSAP + ScrollTrigger vía `useMomentoV8`: solo `transform` y `opacity`; escena fija solo ≥ 1024 px;
  todo se limpia al desmontar; con «reducir movimiento» todo quieto y visible.
- Respuesta al cursor (CSS): `--v8-dur-1` .16 s (color, borde) · `--v8-dur-2` .28 s (pulsar,
  abrir, pestaña) · `--v8-dur-3` .5 s (brillo de tarjeta). Curva `--v8-ease`.
- Entradas al bajar: una vez, 0,8–1,1 s, `power3.out`, poca distancia (≤ 48 px) y giro corto.
- Botón: canto de luz arriba, sube 1 px al pasar, se encoge a 0,97 al pulsar.
  Enlace: subrayado que aparece y flecha que avanza 3 px. Barra: raya azul bajo la página actual.
- Foco visible siempre (anillo azul claro de 2 px que sigue la forma de la pieza).

## Lo que no se hace

Degradados en el texto, manchas de color difuminadas, brillos de neón, contadores animados,
números de sección («01 / 04»), datos inventados, textos de relleno, SIRCOP o Samfor.
