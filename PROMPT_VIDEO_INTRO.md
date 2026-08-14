# FOM — Brief de render para la intro cinematográfica (ciudad real)

Prompt maestro para producir el video de la intro que se controla por scroll en
la landing. Sustituye a la escena Three.js en tiempo real.

Los prompts van **en inglés** a propósito: los modelos de video (Veo, Sora,
Runway, Kling) están entrenados mayoritariamente en inglés y la fidelidad cae
notablemente en español. Las explicaciones van en español.

---

## 0. Restricciones duras (esto NO es negociable)

Estas reglas no son estética, son requisitos de que el video funcione con
scroll. Van en todos los shots.

1. **Sin texto, sin números, sin logos, sin matrículas legibles.** Los datos
   (velocidad, combustible, índice de manejo seguro, ficha de la unidad) se
   dibujan encima en HTML y siguen siendo texto real: nítido, accesible,
   traducible y editable sin re-renderizar.
2. **Sin cortes. Una sola toma continua por shot.** Un corte al hacer scroll
   hacia atrás se lee como un glitch.
3. **Velocidad de cámara constante y movimiento en una sola dirección.** El
   usuario va a recorrer el video hacia adelante y hacia atrás a velocidad
   variable. Cualquier aceleración brusca se siente rota al scrubbear.
4. **Sin personas, sin caras, sin manos.** Entran en valle inquietante y además
   obligan a lidiar con derechos de imagen.
5. **Sin destellos de lente que aparezcan de golpe, sin obturador rodante, sin
   parpadeos.** Un flare que nace en 3 frames parpadea al scrubbear.
6. **Movimiento continuo del tráfico de fondo, lento.** Nada que entre y salga
   de cuadro rápido.
7. **Iluminación constante entre shots.** Misma hora, misma dirección de luz.

---

## 1. ADN visual (bloque global — antepónlo a cada shot)

```
STYLE: Photoreal cinematic aerial cinematography, shot on ARRI Alexa 35 with
Zeiss Supreme Prime lenses, filmic dynamic range, subtle 35mm grain, shallow
atmospheric haze. Blue hour transitioning to night — deep indigo sky, no
visible sun. Wet asphalt with soft specular reflections after light rain.
COLOR: Dominant deep navy-teal (#0A1626) base. Cool steel-blue city surfaces
(#26415F). Warm sodium-amber streetlights as the ONLY warm accent. Selective
electric blue (#208AEF) in vehicle headlights and building glass. Occasional
emerald green (#3DD68C) light accents. High contrast, crushed blacks, ACES
filmic tone mapping, no washed-out lifted shadows.
MOOD: Calm precision. Controlled, surveillance-grade clarity — never chaotic,
never dystopian, never a movie about crime. This is competence and oversight,
not menace.
LOCATION: Cabimas and Maracaibo, Zulia, Venezuela — Costa Oriental del Lago.
Low-rise tropical Latin American industrial port city: flat concrete rooftops
with water tanks, corrugated metal warehouses, palm trees, wide boulevards,
oil infrastructure on the horizon, the vast dark water of Lake Maracaibo to
the west, and the Rafael Urdaneta Bridge as a distant silhouette of lights.
NEGATIVE: no text, no numbers, no logos, no license plates, no watermarks, no
people, no faces, no cuts, no jump cuts, no lens flare pops, no strobing, no
time-lapse, no hyperlapse, no drone propeller shadows, no fisheye distortion,
no Manhattan skyscrapers, no European architecture, no snow, no daylight.
```

---

## 2. Los 7 shots

Cada shot ~5 s. Total ~35 s. Renderizar a **30 fps** (≈1050 frames).

Encadena cada shot con **image-to-video usando el último frame del anterior**
como primer frame. Sin eso, la continuidad de ciudad y luz se rompe entre
tomas y el scroll delata el salto.

### Shot 1 — Mapa general (0–5 s)

```
Extreme high-altitude aerial top-down view, camera at 1200 meters looking
straight down at a tropical port city grid at blue hour. Orthographic-feeling
perspective, like a live navigation map. City blocks read as dark geometric
masses separated by softly glowing amber street grids. A vast body of dark
water occupies the right third of frame, its edge a natural irregular
coastline. Slow, perfectly steady descent — the camera drops 40 meters over
the shot, nothing else moves except tiny points of vehicle light crawling
along the arterial roads. Absolute stillness and control.
```

### Shot 2 — Acercamiento (5–10 s)

```
Continuous aerial descent from 1200 to 400 meters, camera tilting from
straight-down to a 50-degree oblique angle. The flat map-like blocks gain
volume and become real buildings with facades, rooftop water tanks and cast
shadows. Warehouse districts and a wide divided boulevard resolve out of the
grid. Lake on the right horizon catching the last indigo light. Motion is
smooth, gravityless, constant velocity — a controlled camera crane, not a
drone fighting wind.
```

### Shot 3 — Área operativa (10–15 s)

```
Aerial oblique at 400 meters, camera slowly pushing forward over an industrial
transport zone: a fenced logistics yard, rows of parked trucks, a fuel depot
with cylindrical tanks, palm trees along a perimeter road. Sodium streetlights
pool warm amber on wet asphalt. Camera continues its steady forward push and
gentle descent toward one specific stretch of boulevard. Depth haze separates
foreground yard from distant city glow.
```

### Shot 4 — Aproximación a la unidad (15–20 s)

```
Continuous descent from 400 to 80 meters, camera converging on a single white
pickup truck moving alone along a wide wet boulevard at night. The truck stays
centered in frame as everything else recedes. Surrounding traffic thins to
nothing. Streetlights streak past on both sides. The truck's headlights throw
two cold blue-white cones onto glossy asphalt. Steady, inevitable convergence.
```

### Shot 5 — La unidad en escena (20–25 s)

```
Low three-quarter tracking shot, camera at 1.5 meters height flying alongside
a clean white modern double-cab pickup truck driving at moderate speed on a
wet urban boulevard at night. Camera matches the truck's speed exactly so the
vehicle is locked motionless in frame while the city streaks past behind it in
soft motion blur. Sodium streetlights sweep rhythmically across the white
bodywork. Sharp specular highlights on the hood and door panels, crisp contact
shadow beneath the chassis, reflection of the truck on the wet road surface.
Shallow depth of field, background at f/2.8 bokeh.
```

> Nota: describe la camioneta genéricamente ("clean white modern double-cab
> pickup"). Nombrar la marca hace que el modelo intente escribir el logo, y ahí
> es donde se rompe. Si necesitas la Hilux exacta, ese shot se renderiza en 3D.

### Shot 6 — Recorrido con telemetría (25–30 s)

```
Continuous low three-quarter tracking shot alongside the same white pickup,
camera drifting slowly backward and outward from the door to a wider position
revealing the full side profile of the vehicle. Clean negative space opens up
around the truck — dark sky above, dark wet asphalt below, city lights soft and
distant. The composition deliberately leaves empty room on both sides of the
frame. Vehicle remains perfectly sharp and centered, background in continuous
gentle motion.
```

> Ese **espacio negativo a los lados es deliberado**: es donde entran los datos
> de telemetría en HTML. Si el modelo llena el cuadro, no hay dónde ponerlos.

### Shot 7 — Cierre (30–35 s)

```
Slow continuous pull-back to a wide three-quarter hero shot of the white pickup
truck, now seen from slightly above and behind at 20 meters distance, still
driving on the wet boulevard. The city opens up around it — distant bridge
lights across dark water on the horizon, the boulevard stretching ahead into
blue haze. Camera decelerates smoothly to an almost-still final frame.
Composition centered, symmetrical, calm. The final frame holds.
```

---

## 3. Entregables técnicos

Para que funcione con scroll hay que entregar **dos relaciones de aspecto**.
Un 16:9 recortado con `cover` en un móvil vertical pierde los lados y descuadra
todo el encuadre.

| Variante | Resolución | Uso |
|---|---|---|
| Horizontal | 1920×1080 | Escritorio y tablet |
| Vertical | 1080×1920 | Móvil (re-encuadrar, **no** recortar) |

- **30 fps**, ~35 s → ~1050 frames por variante
- Entregar además la **secuencia de frames** (PNG o WebP numerados), no solo el
  mp4: el scroll-scrub fiable se hace dibujando frames a canvas, no moviendo
  el `currentTime` de un `<video>`
- Sin audio
- Sin barras negras, sin viñeta quemada (la viñeta se pone en CSS y así se
  adapta al viewport)

---

## 4. Lo que este camino no te va a dar

Honestidad para que no lo descubras a mitad del proyecto:

- **La matrícula FOM-024, el logo y la Hilux exacta no van a salir bien.** Los
  modelos de video no controlan eso. Si son innegociables, esos shots (4, 5, 6)
  se renderizan con la escena Three.js que ya existe, en offline y a máxima
  calidad — el resultado es exacto y el coste por frame ya no importa.
- **Ruta híbrida recomendada:** shots 1–3 y 7 con modelo de video (ciudad real,
  fotoreal, es donde más ganas), shots 4–6 en 3D (control total sobre el
  vehículo). Se igualan en color en la post con la misma LUT.
- **Cada cambio de arte exige re-renderizar.** Ya no es tocar una constante y
  recargar.
