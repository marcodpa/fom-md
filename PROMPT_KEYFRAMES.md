# FOM — Keyframes de la intro (imágenes inicial y final por shot)

Complemento de [prompt-intro-4000.md](prompt-intro-4000.md). Prompts de
**imagen fija** para generar los fotogramas que alimentan el image-to-video
(primer frame + último frame).

Versión fotoreal, con el recorrido de cámara **arriba-atrás → lateral → atrás
→ dentro**. La cámara nunca pasa al frente del vehículo y la entrada a la
cabina es **por el cristal trasero**.

## Cómo se encadenan

Son **8 imágenes para 7 shots**, no 14. El frame final de cada shot es el
frame inicial del siguiente. La continuidad queda forzada por construcción.

| Shot | Inicial | Final | Movimiento |
|---|---|---|---|
| 1 | K0 | K1 | Aérea oblicua alta sobre Maracaibo, descenso lento |
| 2 | K1 | K2 | Sigue bajando, ángulo suaviza a 50° |
| 3 | K2 | K3 | Baja sobre un distrito, centrándose en la avenida |
| 4 | K3 | K4 | Baja a 40 m, se coloca **detrás y arriba** de la unidad |
| 5 | K4 | K5 | Baja a 3 m y sale al **costado izquierdo**: perfil puro |
| 6 | K5 | K6 | La unidad se adelanta; la cámara queda **justo detrás** |
| 7 | K6 | K7 | Entra **por el cristal trasero** hasta el puesto de conducción |

**Por qué se entra por atrás y no por el parabrisas.** Entrando por el cristal
trasero la cámara **ya viene mirando hacia adelante**: no hay giro que
interpolar. La entrada frontal obligaba a un pivote de 180° dentro de la
cabina, y ahí es donde los modelos disuelven el cristal o meten un corte.

**Orden de generación:** K0 primero. Cada keyframe siguiente se genera usando
el anterior como **referencia de imagen** (image-to-image o style reference al
40–60%). Sin eso, la ciudad cambia de arquitectura entre fotogramas y el video
se rompe en cada empalme.

**La camioneta:** antes de K4, genera **una sola imagen de referencia limpia**
de la unidad (perfil lateral, fondo neutro) y úsala en K4, K5 y K6. Si cada
keyframe la inventa, cambia de forma y de color entre shots.

---

## Bloque de estilo (antepónlo a TODOS los keyframes)

```
Photoreal cinematic still frame, ARRI Alexa 35, filmic dynamic range, 35mm
grain, atmospheric haze. Night — black-blue sky, no sun, no stars. Wet asphalt
with specular reflections. Photoreal, NOT a stylized 3D map, NOT a video game.
Location: Maracaibo, Zulia, Venezuela. Real city: low-rise flat-roofed
concrete blocks with black water tanks, a few pale mid-rise towers downtown,
wide palm-lined avenues.
Color: the lake is a LUMINOUS SATURATED TEAL (#1C7591), glowing, almost
backlit, never dark or black. Land is deep navy-teal (#0A1626) and cool
steel-blue (#26415F). Streets read brighter than blocks. Warm sodium-amber
streetlights are the only warm accent. Electric blue (#208AEF) in headlights.
High contrast, crushed blacks, ACES filmic.
Subject (K4-K7): one clean white double-cab pickup, no badges, no plates,
identical across frames.
NO PEOPLE ANYWHERE — no drivers, passengers, pedestrians, faces, hands or
silhouettes. Every vehicle empty, every street deserted.
Negative: no text, no numbers, no logos, no license plates, no watermarks, no
people, no faces, no hands, no lens flare, no fisheye, no dark water, no
daylight, no cartoon, no low-poly, no motion blur.
```

> **`no motion blur` es deliberado en las imágenes.** El desenfoque lo genera
> el modelo de video al interpolar. Si ya viene quemado en el keyframe, el
> movimiento sale sucio.

> **`no dark water` es la corrección más importante.** Todo generador pinta el
> agua negra de noche. El lago teal luminoso es la firma visual de la pieza;
> sin él es una ciudad nocturna genérica cualquiera.

---

## K0 — Apertura aérea

```
High oblique aerial view over Maracaibo, Venezuela at night, looking down at
roughly 55 degrees from about 1200 meters. The city fills the left two thirds:
a dense grid of low dark concrete blocks veined with brightly lit avenues
running to the horizon. The right third is filled by Lake Maracaibo, rendered
as a LUMINOUS SATURATED TEAL surface, glowing and almost backlit, with a
natural irregular coastline running from top to bottom of frame. Sodium-amber
streetlights trace the avenues. Deep haze on the far horizon. Nothing moves.
```

## K1 — Cierre de la aérea alta

```
High oblique aerial over Maracaibo at night, roughly 55 degrees, now from
about 900 meters. Identical city and coastline, larger in frame. The luminous
teal lake still fills the right third. Individual rooftops begin to separate;
the avenues read wider and brighter. Composition and framing unchanged.
```

## K2 — Volumen de la ciudad

```
Oblique aerial over Maracaibo at night at roughly 50 degrees, about 400 meters
up. The grid now has real volume: flat concrete rooftops with black cylindrical
water tanks, cast shadows between blocks, a cluster of pale mid-rise towers in
the middle distance. A wide divided avenue runs diagonally across frame toward
the luminous teal lake on the right. Palm trees line the central median.
```

## K3 — Sobre la avenida

```
Low oblique aerial at roughly 120 meters over a single district of Maracaibo at
night, centred on one wide divided avenue lined with palm trees and sodium
streetlights. Rooftops, parked cars along the kerb and low warehouses are fully
resolved. Wet asphalt reflects the amber lights in long streaks. The teal lake
still glows at the right edge of frame. Street completely deserted.
```

## K4 — Detrás y arriba de la unidad

```
Aerial view from 40 meters altitude, positioned BEHIND AND ABOVE a single clean
white double-cab pickup truck driving AWAY from the camera down a wide wet
avenue in Maracaibo at night. We see the vehicle's REAR three-quarter — tailgate
and roof, never the front. It sits centred in the lower third of frame. Lane
markings and sodium streetlights converge to a vanishing point ahead of it,
casting warm amber pools on glossy asphalt. Cabin empty. No other traffic.
```

## K5 — Perfil lateral, con espacio negativo

```
Low lateral view from 3 meters height at the LEFT SIDE of a clean white
double-cab pickup truck driving on a wet avenue in Maracaibo at night. Pure
side profile, perfectly perpendicular to the vehicle, which is razor sharp and
occupies only the middle band of frame. Behind it, palms, streetlights and
building facades are smeared into strong horizontal motion blur. Deliberate
empty negative space above and to both sides of the truck: dark sky above,
glossy wet asphalt below. Cabin empty, seats visible through the windows but no
occupants. Balanced, minimal, generous margins.
```

> El espacio vacío **no es un descuido**: ahí entran los datos de telemetría en
> HTML. Si el generador llena el cuadro, ese keyframe no sirve aunque sea bonito.

## K6 — Justo detrás, centrado en la compuerta

```
View from 2 meters height positioned DIRECTLY BEHIND a clean white double-cab
pickup truck, 6 meters back, on a wide wet avenue in Maracaibo at night. Full
symmetrical rear view: tailgate square to camera, two red tail lights lit, the
dark cabin and its rear window above the truck bed, and the spill of its
headlights washing the road far ahead. Sodium streetlights and lane markings
converge symmetrically on both sides. Cabin empty, no silhouettes in the rear
window. Centered, symmetrical, deliberate.
```

## K7 — Dentro, en el puesto de conducción

```
Interior point-of-view from the driver's seat of a modern double-cab pickup at
night, looking FORWARD through the windshield, wide-angle lens. The cabin is
EMPTY — no driver, no hands, no passengers. Foreground: the top arc of a black
steering wheel across the lower third, a dark matte dashboard with soft blue
instrument backlighting, a black A-pillar and the door mirror visible at the
left edge, the centre infotainment screen faintly lit at the right. Through the
windshield: a wide avenue in Maracaibo receding into blue haze between building
facades, sodium streetlights in two converging rows, wet asphalt reflecting
them. Interior lit only by instrument glow and the city outside. Symmetrical,
centered, calm, resolved.
```

> **El parabrisas es el lienzo del cierre.** Ahí va el mensaje final ("Toda tu
> flota. Una sola plataforma.") en HTML. Ese tercio superior tiene que quedar
> limpio: sin retrovisor colgando en el centro, sin calcomanías, sin adornos.

> **K6 → K7 es el único salto delicado.** Pero es mucho más fácil que la
> entrada frontal: la cámara ya mira hacia adelante en K6 y sigue mirando hacia
> adelante en K7, así que el modelo sólo tiene que avanzar y atravesar el
> cristal trasero. No hay rotación. Si aun así no sale limpio, ese shot
> renderízalo con la escena Three.js.

---

## Variante vertical (móvil)

**No recortes el 16:9.** Regenera cada keyframe en 9:16 añadiendo al final:

```
Vertical 9:16 composition. Recompose for a tall frame: more sky above and more
road below, subject centered on the vertical axis. Do not crop — reframe.
```

En K5 el espacio negativo pasa de los lados a **arriba y abajo**, porque en
móvil la telemetría se apila en vertical:

```
Vertical 9:16 composition. The truck occupies the middle third of the tall
frame with generous empty space above and below it. Do not crop — reframe.
```

---

## Checklist antes de mandar al modelo de video

- [ ] Los 8 keyframes comparten arquitectura, hora y dirección de luz
- [ ] El lago es teal luminoso en K0–K3, nunca agua negra
- [ ] La camioneta es idéntica en K4, K5 y K6 (misma imagen de referencia)
- [ ] **Nunca se ve el frente del vehículo** en ningún keyframe
- [ ] No hay una sola persona, silueta ni mano en ningún frame
- [ ] Ningún keyframe tiene texto, números ni matrícula legible
- [ ] K5 conserva el espacio negativo
- [ ] K6 es simétrico y centrado en la compuerta
- [ ] K7 es interior vacío, con el tercio superior del parabrisas libre
- [ ] Ninguno trae motion blur quemado
- [ ] Set completo en 16:9 y set completo en 9:16
