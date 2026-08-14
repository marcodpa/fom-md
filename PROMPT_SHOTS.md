# FOM — Intro cinematográfica · los 7 shots, uno por generación

Complemento operativo de [PROMPT_KEYFRAMES.md](PROMPT_KEYFRAMES.md). Aquí está
lo que se pega en el generador de video, **una vez por shot**. Siete
generaciones de 5 s, encadenadas por keyframes, unidas después con ffmpeg.

## Por qué así y no de una sola vez

Se probó pegar el documento completo en una sola generación. Resultado: un clip
de **7 segundos** que hace aérea → detrás de la unidad → dentro de la cabina, y
que **se salta el lateral por completo**.

No es un fallo del generador, es cómo funciona: interpola una trayectoria
continua entre el primer y el último frame. Primer frame aérea, último frame
cabina — la recta entre esos dos puntos pasa por la compuerta trasera. El
desvío al costado izquierdo no está sobre esa recta, así que desaparece. Y los
únicos dos tramos donde la cámara deja de avanzar hacia adelante (el lateral y
el perfil) son siempre los primeros en caerse.

**Regla que se deriva de eso, y que gobierna todo este documento:**

> El prompt de un shot describe **únicamente el movimiento de ese shot**. No
> menciona la cabina, ni el destino final, ni lo que viene después. Si el shot 5
> nombra el interior, el modelo empieza a correr hacia allá y se come el lateral.

---

## Configuración del generador (igual en los 7)

| Parámetro | Valor |
|---|---|
| Duración | 5 s |
| Resolución | 1920×1080 mínimo (los clips de prueba salieron a 1280×720) |
| FPS | 30 |
| Modo | Image-to-video con **primer frame + último frame** |
| Relación | 16:9 (y set completo aparte en 9:16, reencuadrado, nunca recortado) |

Si tu plan solo admite **primer frame**, el prompt igual funciona: la
descripción del destino ya va escrita en el texto. Pierdes precisión en el
empalme, así que revisa el corte entre clips con más cuidado.

---

## Bloque global — antepónlo a los 7 prompts

```
Photoreal cinematic, ARRI Alexa 35, filmic dynamic range, 35mm grain,
atmospheric haze. Night, black-blue sky, no sun. Wet asphalt with specular
reflections. Photoreal — NOT a stylized 3D map, NOT a video game.
Maracaibo, Zulia, Venezuela: low-rise flat-roofed concrete blocks with black
water tanks, pale mid-rise towers downtown, wide palm-lined avenues.
Lake Maracaibo is a LUMINOUS SATURATED TEAL (#1C7591), glowing, never dark.
Land is deep navy-teal (#0A1626) and cool steel-blue (#26415F). Warm
sodium-amber streetlights are the ONLY warm accent. Crushed blacks, ACES filmic.
One continuous take. No cuts. No speed changes. Constant focal length.
The camera NEVER goes in front of the vehicle and NEVER sees its front.
NO PEOPLE ANYWHERE — no drivers, passengers, pedestrians, faces, hands or
silhouettes. Every street deserted, every vehicle empty.
```

**Negativo global** (en el campo de negative prompt, no en el texto):

```
text, numbers, logos, license plates, watermarks, people, faces, hands,
silhouettes, cuts, jump cuts, speed ramp, lens flare, fisheye, dark water,
daylight, cartoon, low-poly, camera shake, zoom
```

---

## SHOT 1 — Aérea alta, descenso lento

**Keyframes:** K0 → K1 · **Ruta:** 1200 m → 900 m

```
Slow steady vertical descent of a drone over Maracaibo at night, holding a
fixed 55-degree oblique downward angle. The city fills the left two thirds as a
dense grid of dark blocks veined with lit avenues; the glowing teal lake fills
the right third. The framing and the horizon line stay exactly where they are —
only the altitude decreases, so rooftops and avenues grow slowly and evenly
toward the edges of frame. No yaw, no roll, no tilt change. Nothing else moves.
```

**Negativo del shot:** `top-down view, nadir, orbit, rotation, pan, tilt`

> El error a vigilar: que el modelo empiece a orbitar. El descenso tiene que ser
> puramente vertical con el ángulo congelado, o el shot 2 no empalma.

---

## SHOT 2 — Sigue bajando, la ciudad gana volumen

**Keyframes:** K1 → K2 · **Ruta:** 900 m → 400 m, el ángulo suaviza de 55° a 50°

```
The descent continues without interruption. The downward angle eases very
slightly from 55 to 50 degrees as altitude drops. The grid gains real volume:
flat concrete rooftops with black cylindrical water tanks separate from one
another, cast shadows deepen between blocks, a cluster of pale mid-rise towers
resolves in the middle distance. A wide divided avenue lined with palms runs
diagonally across frame toward the luminous teal lake on the right. Same speed
as before, same direction, no acceleration.
```

**Negativo del shot:** `top-down view, orbit, rotation, new buildings, skyline change`

---

## SHOT 3 — Baja sobre el distrito, centra la avenida

**Keyframes:** K2 → K3 · **Ruta:** 400 m → 120 m

```
The descent continues and the camera drifts laterally just enough to centre one
wide divided avenue in frame, so the avenue runs from the bottom edge to the
vanishing point. Palm trees, sodium streetlights, parked cars along the kerb and
low warehouses resolve into full detail. Wet asphalt reflects the amber lights
in long vertical streaks. The teal lake still glows at the right edge. The
street is completely deserted. Descent speed constant throughout.
```

**Negativo del shot:** `top-down view, moving traffic, pedestrians, sudden dive`

> La avenida tiene que quedar **centrada y alineada con el eje vertical** al
> final del shot. Si termina torcida, el shot 4 nace descuadrado.

---

## SHOT 4 — Se coloca detrás y arriba de la unidad

**Keyframes:** K3 → K4 · **Ruta:** 120 m → 15 m, detrás de la camioneta

```
The descent continues down the axis of the avenue and settles BEHIND AND ABOVE a
single clean white double-cab pickup driving away from camera down the wet
avenue. The camera matches the vehicle's speed and holds station behind it,
seeing its REAR three-quarter — tailgate and roof only, never the front. The
truck sits centred in the lower third of frame. Lane markings and sodium
streetlights converge to a vanishing point ahead of it. The camera stops
descending once it is behind the truck and holds that distance. Cabin empty.
```

**Negativo del shot:** `front of vehicle, overtaking, passing the truck, entering the vehicle, top-down`

> **Ajuste respecto a `PROMPT_KEYFRAMES.md`: genera K4 a 15 m, no a 40 m.**
> Desde 40 m, el shot 5 tendría que bajar 37 m y salir al costado en 5 s — el
> modelo resuelve eso como una caída en picado y rompe el perfil. Desde 15 m el
> movimiento es cómodo.

---

## SHOT 5 — Sale al costado izquierdo · **el shot que se estaba perdiendo**

**Keyframes:** K4 → K5 · **Ruta:** detrás y arriba (15 m) → perfil lateral izquierdo (3 m)

```
Holding an exact speed match with the moving truck, the camera descends from 15
meters to 3 meters while sliding sideways to the vehicle's LEFT side. The
descent and the lateral slide happen together and at a constant rate, spread
evenly across the whole five seconds. The view rotates gradually from rear
three-quarter to pure lateral profile, finishing perpendicular to the driver's
door. The distance between camera and truck stays constant the entire time: the
camera never closes in and never falls back. It ends alongside the vehicle.
```

**Negativo del shot:** `approaching the vehicle, closing distance, entering the vehicle, cabin, interior, windshield, passing the truck, front of vehicle, orbit around the front`

> **Este es el shot que hay que vigilar.** Si el clip que sale muestra la cámara
> acercándose a la camioneta o adelantándola, se descarta y se regenera. El
> movimiento es lateral y descendente, la distancia es constante. Nada de avance.
>
> Truco si insiste en avanzar: pon en el negativo `forward motion, dolly in,
> approaching` y reduce a 4 s.

---

## SHOT 6 — Perfil puro con espacio negativo

**Keyframes:** K5 → K6 · **Ruta:** perfil lateral → la unidad se adelanta y la cámara queda detrás

```
Pure lateral tracking at 3 meters, perpendicular to the truck, locked on it so
the vehicle stays motionless and razor sharp while palms, streetlights and
building facades streak past in strong horizontal motion blur. Generous empty
negative space above and beside the vehicle: dark sky above, glossy wet asphalt
below. In the final second the truck pulls gently ahead and the camera eases
back and inward behind it, ending directly behind the tailgate at 2 meters
height, square and symmetrical. Cabin empty, no silhouettes through the glass.
```

**Negativo del shot:** `cluttered frame, filled frame, entering the vehicle, interior, cabin, front of vehicle, vertical camera movement`

> El espacio vacío arriba y a los lados **no es un descuido de composición**: ahí
> se sobreimprime la telemetría en HTML. Un cuadro lleno no sirve aunque sea el
> plano más bonito de los siete.

---

## SHOT 7 — Entra por el cristal trasero hasta el puesto de conducción

**Keyframes:** K6 → K7 · **Ruta:** detrás de la compuerta → asiento del conductor

```
The camera, already facing forward directly behind the moving truck, advances
smoothly along the vehicle's axis while rising to cabin height. It passes over
the truck bed, through the rear window, and continues forward until it rests
just above and behind the steering wheel, looking out through the windshield.
The truck never stops and the camera never changes speed. There is NO rotation
at any point: the camera looks forward before the rear glass, during the
crossing and after it. Crossing the glass, the sweeping streetlights carry over
unbroken from the white bodywork onto the dashboard.
FINAL FRAME: empty driver-seat POV, wide angle, looking OVER the top arc of a
black steering wheel that crosses the lower third — not through it. Thick black
A-pillar in the left third, door mirror beyond the side glass, faintly lit
centre screen at right, dark matte dash with a thin cyan-blue rim highlight.
Through the windshield the avenue recedes between pale facades, one warm
streetlamp centre right, dark sky above. Road vanishing point just above the
wheel. No rear-view mirror in centre frame. Cabin empty. Camera settles and holds.
```

**Negativo del shot:** `rotation, yaw, pan, turning, rear-view mirror in centre, driver, hands on wheel, passengers, reversing, glass shatter, glass reflection of camera`

> **Es el único empalme delicado de los siete, y aun así es el fácil.** La cámara
> ya mira hacia adelante en K6 y sigue mirando hacia adelante en K7: el modelo
> solo tiene que avanzar y atravesar. No hay pivote que interpolar — que es
> exactamente lo que hacía imposible la entrada por la ventanilla del conductor.
>
> Si después de 3 o 4 intentos no sale limpio, este shot se renderiza con la
> escena Three.js del repo ([src/scenes/](src/scenes/)) y se corta ahí. Es el
> único de los siete que tiene plan B.

---

## Unir los clips

Guarda los siete como `s1.mp4` … `s7.mp4` en la misma carpeta. Primero verifica
que salieron todos iguales — si uno difiere en resolución o fps, la unión sale
con saltos:

```bash
for f in s1 s2 s3 s4 s5 s6 s7; do ffprobe -v error -select_streams v:0 -show_entries stream=width,height,avg_frame_rate -of csv=p=0 "$f.mp4"; done
```

Si los siete imprimen lo mismo, une sin recodificar (rápido y sin pérdida):

```bash
printf "file 's1.mp4'\nfile 's2.mp4'\nfile 's3.mp4'\nfile 's4.mp4'\nfile 's5.mp4'\nfile 's6.mp4'\nfile 's7.mp4'\n" > lista.txt
```

```bash
ffmpeg -f concat -safe 0 -i lista.txt -c copy fom-intro.mp4
```

Si alguno salió distinto, normaliza todo a 1920×1080 / 30 fps antes de unir:

```bash
for f in s1 s2 s3 s4 s5 s6 s7; do ffmpeg -i "$f.mp4" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30" -c:v libx264 -crf 16 -preset slow -an "n_$f.mp4" -y; done
```

Y para la web, versión comprimida sin audio:

```bash
ffmpeg -i fom-intro.mp4 -c:v libx264 -crf 23 -preset slow -movflags +faststart -an fom-intro-web.mp4
```

---

## Control de calidad — qué se rechaza y se regenera

Por clip:

- [ ] Dura los 5 s completos y **no tiene ningún corte interno**
- [ ] La cámara nunca ve el frente del vehículo
- [ ] No aparece una sola persona, silueta ni mano
- [ ] No hay texto, números ni matrícula legible
- [ ] El lago es teal luminoso, nunca agua negra (shots 1–3)
- [ ] La camioneta es idéntica a la de los otros clips (shots 4–7)
- [ ] La hora y la dirección de la luz no cambian respecto al clip anterior
- [ ] La velocidad es constante: ni acelera ni frena

Específico, por ser los que fallaron:

- [ ] **Shot 5:** hay lateral de verdad. La cámara baja y se desplaza al costado
      **sin acercarse**. Si se aproxima a la camioneta o la adelanta, se rechaza.
- [ ] **Shot 6:** el cuadro conserva el espacio vacío arriba y al lado.
- [ ] **Shot 7:** entra por el cristal **trasero**, sin girar, y el parabrisas
      queda limpio en su tercio superior para el mensaje final.

Del empalme:

- [ ] El último frame de cada clip y el primero del siguiente son el mismo plano
- [ ] En la unión no se ve salto de arquitectura, de luz ni de encuadre

---

## Variante vertical (móvil)

**No recortes el 16:9**, regenera. Añade al final de cada prompt:

```
Vertical 9:16 composition. Recompose for a tall frame: more sky above and more
road below, subject centered on the vertical axis. Do not crop — reframe.
```

En el shot 6 el espacio negativo pasa de los lados a **arriba y abajo**, porque
en móvil la telemetría se apila en vertical:

```
Vertical 9:16 composition. The truck occupies the middle third of the tall frame
with generous empty space above and below it. Do not crop — reframe.
```
