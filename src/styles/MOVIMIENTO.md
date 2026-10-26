# Movimiento de FOM (web y app)

La consola web (T-184) y la app (T-185) se mueven igual. La fuente es la app:
`fom-driver-juan/src/theme/movimiento.ts`. En la web los mismos valores viven
en `src/styles/movimiento.css` (y los que necesita JavaScript, en
`src/panel/movimiento.js → MOV`). Si cambias uno, cambia los otros.

## Valores

| App (`movimiento.ts`) | Web (CSS) | Valor | Para qué |
|---|---|---|---|
| `DURACION.rapido` | `--mov-rapido` | 140 ms | toques, lo que se va, cambios pequeños |
| `DURACION.normal` | `--mov-normal` | 240 ms | fundidos, pestañas, bloques que entran |
| `DURACION.lento` | `--mov-lento` | 380 ms | pantallas, hojas, cambio de tema |
| `CURVA.salida` | `--mov-curva-salida` (y `--mov-curva`) | `cubic-bezier(0.22, 1, 0.36, 1)` | lo que ENTRA: llega rápido y se posa |
| `CURVA.entrada` | `--mov-curva-entrada` | `cubic-bezier(0.4, 0, 1, 1)` | lo que SE VA: arranca suave y acelera |
| `CURVA.enfasis` | `--mov-curva-enfasis` | `cubic-bezier(0.65, 0, 0.35, 1)` | cambio de tema, lo que late |
| `RESORTE.hoja` (30 / 230 / 1) | `--mov-resorte-hoja` en `--mov-hoja` 520 ms | sin rebote | hojas que suben, el dock que vuelve |
| `RESORTE.ventana` (22 / 260 / 0.9) | `--mov-resorte-ventana` en 380 ms | rebote 3,8 % | ventanas centradas (computadora) |
| `RESORTE.toque` (18 / 320 / 0.6) | `--mov-resorte-toque` en 380 ms | rebote 6,8 % | al soltar lo que se tocó |
| `ESCALA_PRESION` | `--mov-escala-toque` | 0,97 en 140 ms, curva de salida | botones, tarjetas, filas |
| `VELO` | (reglas del Modal) | abre 240 ms, cierra 140 ms | fondo de hojas y ventanas |
| `ESCALONADO` | `--mov-desplazamiento`, `--mov-escalon` | 10 px, 45 ms, hasta 12 | listas y bloques |
| `CONTEO.tablero` | `MOV.conteo` | 500 ms | cifras de un tablero |

Los resortes no existen en CSS: se simulan (masa-resorte, los mismos números
de Reanimated) y se muestrean con `linear()`. Sin `linear()`, la curva de
salida. La hoja dura 520 ms porque es lo que tarda su resorte en posarse.

## Qué se anima y cómo

| Momento | Cómo | Tiempo y curva |
|---|---|---|
| Cambio de pantalla (web) | View Transition: la vieja se apaga, la nueva se funde y sube 10 px; lateral, barras y dock quietos | sale 140 + entrada; entra 240 + salida |
| Pestañas de abajo (teléfono) | una sola píldora se desliza a la pestaña nueva | 380 + salida (como el segmented-control de la app) |
| Entrar a una ficha / volver a una pestaña | el dock baja entero o vuelve a subir | sale 240 + entrada; entra con el resorte de la hoja |
| Hoja (teléfono) | sube desde abajo (100 %) | resorte de la hoja; se va en 240 + entrada |
| Ventana (computadora) | sube 16 px y crece de 0,98 | resorte de la ventana; se va en 140 + entrada |
| Velo de hojas y ventanas | fundido, nunca se desliza | abre 240, cierra 140 |
| Listas | cada fila se funde y sube 10 px, 45 ms tras la anterior (12 como mucho), **una sola vez** | 380 + salida |
| Carga → contenido | el esqueleto espera 120 ms y entra en 140; el contenido se funde | 240 + salida |
| Al tocar | 0,97 al apretar; al soltar vuelve con el resorte del toque | 140 + salida / resorte del toque |
| Cifras | la primera vez desde 0; luego del valor anterior al nuevo | 500 + salida |
| Cambio de tema (Azul FOM ↔ Glass) | fundido de toda la pantalla | 380 + énfasis |

Diferencia que queda: en la app las pantallas empujadas (fichas) entran desde
la derecha (380 ms) y se vuelve con el gesto del borde; en la web, por ahora,
se funden y suben 10 px.

## Reglas

1. Solo `transform` y `opacity`. Nada que mueva el diseño: 60 fps.
2. Con «reducir movimiento» (web: `prefers-reduced-motion`; app:
   `useReducedMotion()`) todo se apaga: los cambios pasan de golpe.
3. Una lista anima sus filas una vez. Un refresco de datos no la vuelve a
   animar; solo entran las filas nuevas.
4. Lo que entra usa la curva de salida; lo que se va, la de entrada, y dura
   menos de lo que tardó en entrar.

## En la web, dónde está

- `src/styles/movimiento.css`: variables, fotogramas y reglas.
- `src/panel/movimiento.js`: View Transitions (pantalla y tema), entrada de
  respaldo con Web Animations, filas «una sola vez», `MOV` y `curvaSalida`.
- `src/panel/comp/movil-piezas.jsx`: píldora deslizante del dock.
- `src/panel/comp/ui.jsx`: `Modal` (se queda montado mientras se va) y `Cifra`.
- `src/panel/useApariencia.js`: el cambio de tema pasa por una View Transition.
