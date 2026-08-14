# FOM — Intro a partir de las 3 imágenes

Cuatro generaciones encadenadas. Cada una usa una imagen como **primer frame** y
la siguiente como **último frame**. Duración 5 s cada una, 1920×1080, 30 fps.

| Clip | Primer frame | Último frame | Qué pasa |
|---|---|---|---|
| 1 | Imagen 1 (aérea alta) | Imagen 2 (avenida) | Descenso sobre la ciudad |
| 2 | Imagen 2 (avenida) | Imagen 3 (camioneta) | Baja hasta la unidad en marcha |
| 3 | Imagen 3 (camioneta) | Imagen 4 (puerta abierta)\* | Lateral en movimiento, se abre la puerta |
| 4 | Imagen 4 (puerta abierta)\* | Imagen 5 (interior)\* | Entra por la puerta y se detiene dentro |

\* Las imágenes 4 y 5 no existen todavía: al final del documento están los
prompts para generarlas. Sin ellas el modelo improvisa el interior y cambia el
tablero entre intentos.

---

## Bloque de estilo — antepónlo a los cuatro prompts

```
Cinematográfico fotorrealista, cámara ARRI Alexa 35, rango dinámico fílmico,
grano de 35 mm, bruma atmosférica. Noche cerrada, cielo azul-negro, sin sol.
Asfalto mojado con reflejos especulares. Fotorrealista, NO un mapa 3D
estilizado, NO un videojuego.
Maracaibo, Venezuela: bloques bajos de concreto con techos planos y tanques de
agua negros, torres pálidas de mediana altura al fondo, avenidas anchas con
palmeras. El lago es un TURQUESA LUMINOSO Y SATURADO, brillante, nunca oscuro.
La tierra es azul marino profundo y azul acero frío. Las luces de sodio ámbar
son el único acento cálido. Negros profundos, ACES filmic.
Una sola toma continua. Sin cortes. Sin cambios de velocidad. Distancia focal
constante. La cámara NUNCA pasa al frente del vehículo ni ve su parte delantera.
SIN PERSONAS: ningún conductor, pasajero, peatón, rostro, mano ni silueta. Calle
desierta, vehículo vacío.
```

**Negativo** (en el campo de negative prompt, no en el texto):

```
texto, números, logotipos, matrículas, marcas de agua, personas, rostros, manos,
siluetas, cortes, cambios de velocidad, destellos de lente, ojo de pez, agua
oscura, luz de día, dibujo animado, baja poligonización, temblor de cámara
```

---

## CLIP 1 — De la aérea alta a la avenida

**Primer frame: imagen 1 · Último frame: imagen 2**

```
Descenso aéreo lento y continuo sobre la ciudad de noche, manteniendo el ángulo
oblicuo hacia abajo sin variarlo. La altura baja de forma constante y la ciudad
crece parejo hacia los bordes del cuadro: primero se separan los techos, luego
las palmeras y los postes de alumbrado ganan detalle. La avenida principal se va
centrando en el eje vertical del encuadre hasta quedar alineada de abajo hacia
el punto de fuga. El lago turquesa se mantiene siempre a la derecha del cuadro.
Sin giro, sin balanceo, sin cambio de inclinación: solo altura. Velocidad de
descenso uniforme de principio a fin.
```

**Negativo del clip:** `vista cenital, órbita, rotación, barrido lateral, cambio de horizonte`

---

## CLIP 2 — De la avenida a la camioneta en marcha

**Primer frame: imagen 2 · Último frame: imagen 3**

```
El descenso continúa por el eje de la avenida y termina situando la cámara a
unos cinco metros de altura, por detrás y a la izquierda de una camioneta pickup
doble cabina que avanza por la calle mojada. La camioneta está EN MOVIMIENTO
durante todo el plano: rueda de forma constante, sus luces traseras encendidas
se reflejan en el asfalto y el reflejo se desplaza con ella. La cámara iguala su
velocidad y se estabiliza detrás en tres cuartos traseros, viendo el costado
izquierdo y la compuerta, nunca el frente. Las palmeras y las luces de sodio
pasan a los lados. La cabina está vacía. Velocidad constante, sin frenar.
```

**Negativo del clip:** `vehículo detenido, frente del vehículo, adelantar, atravesar el vehículo, vista cenital`

> Aquí es donde se declara el movimiento. Si no dices "EN MOVIMIENTO" y
> "sus luces se reflejan y el reflejo se desplaza", el modelo copia la imagen
> fija y te entrega una camioneta congelada en un cruce.

---

## CLIP 3 — Lateral en movimiento y la puerta se abre

**Primer frame: imagen 3 · Último frame: imagen 4**

```
Manteniendo la velocidad exacta de la camioneta, la cámara desciende hasta
metro y medio del suelo y se desplaza lateralmente hasta quedar perpendicular al
costado IZQUIERDO del vehículo, a la altura de la puerta del conductor. El
desplazamiento es puramente lateral y descendente: la distancia entre la cámara
y la camioneta no cambia en ningún momento, no se acerca ni se aleja. La
camioneta queda inmóvil y nítida en el centro del cuadro mientras la ciudad, las
palmeras y las luces se convierten en estelas horizontales al fondo. Queda
espacio vacío deliberado encima y a los lados del vehículo. En los últimos dos
segundos la puerta del conductor se abre hacia afuera con un movimiento suave y
continuo, revelando el asiento vacío y el brillo azulado del tablero. La
camioneta nunca se detiene.
```

**Negativo del clip:** `acercarse, avanzar hacia el vehículo, adelantar, entrar en la cabina, interior, frente del vehículo, cuadro lleno, conductor, manos`

> **Este es el plano que se pierde siempre.** El modelo tiende a avanzar hacia el
> vehículo en vez de acompañarlo de lado. Si el clip que sale muestra que la
> cámara se acerca, se descarta y se regenera. El movimiento es lateral y
> descendente, la distancia es constante.

---

## CLIP 4 — Entra por la puerta y termina dentro

**Primer frame: imagen 4 · Último frame: imagen 5**

```
La cámara cruza el vano de la puerta abierta y entra en la cabina en un solo
movimiento continuo, sin acelerar. Al pasar el umbral gira suavemente hacia
adelante y se eleva hasta la altura de los ojos del conductor, deteniéndose justo
encima y detrás del volante, mirando hacia el parabrisas. El giro se reparte de
manera pareja durante todo el recorrido: empieza antes de cruzar la puerta y
termina ya dentro, sin latigazos ni cambios de velocidad. Las luces de la calle
barren la carrocería y su barrido continúa sin cortarse sobre el tablero. La
camioneta sigue rodando todo el tiempo. La cámara se asienta y se queda quieta.
CUADRO FINAL: punto de vista desde el asiento del conductor, gran angular,
mirando POR ENCIMA del arco superior del volante negro que cruza el tercio
inferior, no a través de él. Pilar A negro y grueso en el tercio izquierdo,
espejo lateral más allá del cristal, pantalla central tenuemente encendida a la
derecha, tablero mate oscuro con un filo de luz azul cian. Por el parabrisas, la
avenida se aleja entre fachadas pálidas con una farola cálida a la derecha y
cielo oscuro arriba. Punto de fuga justo encima del volante. Sin retrovisor en el
centro del cuadro. Cabina vacía.
```

**Negativo del clip:** `giro brusco, barrido de cámara, retrovisor en el centro, conductor, manos en el volante, pasajeros, marcha atrás, cristal roto, reflejo de la cámara en el cristal`

> El tercio superior del parabrisas tiene que quedar limpio: ahí va el mensaje
> final ("Toda tu flota. Una sola plataforma.") sobreimpreso en HTML.

---

## Las dos imágenes que faltan

Genera ambas usando la **imagen 3 como referencia de estilo al 50 %**, para que
la camioneta, la calle y la luz sean las mismas.

### Imagen 4 — Perfil izquierdo con la puerta abierta

```
Fotograma fotorrealista nocturno. Vista lateral baja, a metro y medio del suelo,
perpendicular al costado IZQUIERDO de una camioneta pickup doble cabina sobre
una avenida mojada. Perfil puro, el vehículo nítido ocupando la banda central
del cuadro. La puerta del conductor está ABIERTA hacia afuera en unos setenta
grados, mostrando el asiento vacío y el tablero con luz azulada tenue. Al fondo,
palmeras, fachadas y luces de sodio ámbar reflejadas en el asfalto. Espacio vacío
generoso encima y a los lados del vehículo: cielo oscuro arriba, asfalto
brillante abajo. Cabina vacía, sin personas. Sin desenfoque de movimiento.
```

### Imagen 5 — Interior, puesto de conducción

```
Fotograma fotorrealista nocturno. Punto de vista desde el asiento del conductor
de una camioneta pickup doble cabina moderna, mirando hacia adelante por el
parabrisas, gran angular. La cabina está VACÍA: sin conductor, sin manos, sin
pasajeros. En primer plano el arco superior de un volante negro cruzando el
tercio inferior, tablero mate oscuro con retroiluminación azul suave, pilar A
negro y espejo lateral al borde izquierdo, pantalla central tenuemente encendida
a la derecha. Por el parabrisas, una avenida ancha que se aleja entre fachadas
pálidas, dos hileras convergentes de luces de sodio y asfalto mojado que las
refleja. Interior iluminado solo por el tablero y la ciudad. El tercio superior
del parabrisas queda despejado. Sin retrovisor en el centro. Sin desenfoque.
```

---

## Unir los cuatro clips

```bash
printf "file 'c1.mp4'\nfile 'c2.mp4'\nfile 'c3.mp4'\nfile 'c4.mp4'\n" > lista.txt
```

```bash
ffmpeg -f concat -safe 0 -i lista.txt -c copy fom-intro.mp4
```

Si algún clip salió con otra resolución o fps, normaliza antes:

```bash
for f in c1 c2 c3 c4; do ffmpeg -i "$f.mp4" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30" -c:v libx264 -crf 16 -preset slow -an "n_$f.mp4" -y; done
```

Y la versión para la web, comprimida y sin audio:

```bash
ffmpeg -i fom-intro.mp4 -c:v libx264 -crf 23 -preset slow -movflags +faststart -an fom-intro-web.mp4
```
