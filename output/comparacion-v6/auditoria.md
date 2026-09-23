# Comparación visual de las 11 páginas

Revisión independiente de las 11 propuestas PNG originales en `output/rediseno-completo-v6`, las 11 capturas actuales `resto-*.png`, `src/pages/FomMarketing.jsx` y `src/styles/fom-v6.css`. El hero de Inicio y su secuencia animada quedan expresamente fuera del diagnóstico y de cualquier cambio propuesto.

## Resultado

La diferencia es estructural y afecta a todas las páginas revisadas. La implementación conserva temas y parte del contenido, pero reduce composiciones distintas a una misma fila de dos mitades. Corregir únicamente el orden izquierda/derecha no recupera las propuestas.

| Página | Diferencias verificadas | Causa principal |
|---|---|---|
| Inicio, debajo del hero | Las tres tarjetas de Seguimiento/Cuidado/Decisiones pertenecen al bloque de presentación en la propuesta; la web crea una sección adicional. Desaparecen las listas ilustradas de plataforma, app, funciones y seguridad. Seguridad y Áreas comparten una banda de tres columnas en la propuesta, pero son dos filas completas en la web. Aparece un bloque Beneficios adicional. El formulario compacto de dos columnas se convierte en una columna alta. | `Home` separa y simplifica módulos que la propuesta combina; reutiliza `Section` en todos. |
| Plataforma | La alternancia actual ya coincide, pero faltan tarjetas flotantes de métricas, portátil integrado en la escena y fotografías específicas. Roles muestra una reunión en vez de conductor junto a la flota; seguridad de datos repite el monitor en vez de servidores. El mapa queda pequeño sobre mucho fondo vacío. FAQ es una lista vertical donde la propuesta usa dos columnas compactas. | `SCENES` asigna escenas distintas y `Media` centra el mismo monitor; `Stat` queda debajo del texto. |
| App | La propuesta conserva texto a la izquierda, teléfono grande en el centro y fotografía a la derecha; la web alterna dos mitades. Las filas de estado y perfil pierden las tres viñetas ilustradas y reciben botones. Estado utiliza captura Mantenimiento donde la propuesta muestra Inicio. El cierre pierde la escena oficina/teléfono. | `AppPage` usa `Section`, omite listas y aplica una captura y un CTA genéricos. |
| Funciones | La alternancia coincide, pero las métricas deberían estar en tarjetas al costado o sobre la escena; hoy son renglones inferiores. Monitores y teléfono son menores, con más espacio vacío. Mantenimiento añade un teléfono que no está en esa escena propuesta. FAQ pierde la distribución horizontal y respuestas visibles. | Plantilla de dos mitades con alturas/padding uniformes y un solo estilo para estadísticas y FAQ. |
| Seguridad | Detección de riesgos y SOS agregan monitores donde la propuesta utiliza fotografía narrativa. Las tarjetas 3 seg, 72 h, 0–100 y <5 seg pierden contorno, posición e icono. Se reemplazan titulares editoriales por nombres de categorías. Los iconos no corresponden a frenadas, velocidad o privacidad. | Reutilización de `SCENES`, `Stat` y lista de iconos asignada por posición. |
| Áreas | Hero interior propuesto centrado sobre la flota; actual alineado a la izquierda con CTA. La captura de flota pierde escala. Multi-sitio pierde el collage de tres sedes rotuladas. Acceso por área está invertido. FAQ y CTA deberían compartir una fila y hoy están apilados. | `ProductPage` aplica la misma alternancia y cierre a todas las páginas; no modela collage ni cierre combinado. |
| Quiénes somos | Hero interior pierde la escena humana con pantalla integrada. «De cada dato...» es una foto panorámica con texto superpuesto izquierdo en la propuesta; actual la divide e invierte. Principios pierde título general, iconos y tarjetas, y las imágenes quedan excesivamente altas. Falta toda la FAQ de la propuesta. | `AboutPage` simplifica composición y omite FAQ. Las imágenes de principios declaran altura HTML 941 sin `height:auto` en la regla que cambia su ancho. |
| Qué ofrecemos | Las tres filas quedan orientadas al contrario de las propuestas. Se pierden la fotografía continua, los dispositivos de gran escala y el solapamiento entre escena y texto. Titulares explicativos grandes se convierten en categorías pequeñas más párrafo y botón. Faltan los tres indicadores bajo el hero interior. | `ServicesPage` aplica alternancia genérica e interpreta las categorías como titulares principales. |
| Beneficios | Aunque la alternancia coincide, desaparecen números 01–06 y las tres viñetas con iconos de cada beneficio; se sustituyen por botones. Las escenas pierden anchura. Áreas muestra otro monitor en vez del plano satelital con marcadores; comunicación pierde la cabina. Hero interior cambia pickup en carretera por camiones estacionados. | Datos `BENEFITS` sin numeración ni listas y escenas limitadas a las mismas fotos y dispositivos. |
| Preguntas frecuentes | Buscador largo superior pasa a campo pequeño lateral. Faltan iconos y subtítulos de los cinco grupos. Los acordeones pierden tarjeta, contorno y primera respuesta abierta. El conjunto queda como renglones cerrados con grandes espacios. CTA usa carretera en vez de conductor con teléfono. | `HelpPage` y `FAQs` no representan la jerarquía ni el estado visual de la propuesta. |
| Contacto | Canales pierde cuatro tarjetas en cuadrícula 2×2. Instalación cambia de lado y pierde sus viñetas en 2×2. Métricas pierden tarjetas. Proceso usa números diminutos donde propuesta presenta iconos grandes conectados por flechas. Soporte cambia primer plano del vehículo por flota lejana. FAQ pierde respuestas visibles y contacto lateral. | `ProductPage` aplica `Section`/`Facts` genéricos a módulos que requieren composiciones particulares. |

## Causa compartida

`Section` fija texto y `Media` como dos mitades iguales; `.f-section-inner` usa `grid-template-columns:1fr 1fr` y altura mínima de 580 px. `Media` centra una captura enmarcada sobre una foto. `Stat` coloca el valor al final del texto, sin la tarjeta ni posición de la referencia. `Facts` cicla cinco iconos según el índice, sin significado específico. El mismo FAQ y el mismo fondo de carretera cierran casi todas las páginas. Esta abstracción conserva uniformidad, pero elimina composición, escala, densidad, fotografía e iconografía de las propuestas.

## Orden recomendado para una corrección posterior

1. Conservar intacto el hero de Inicio, incluida su animación.
2. Recuperar estructura específica de cada sección: mosaicos, tres columnas, tarjetas, superposiciones y cierres combinados.
3. Asignar fotografías adecuadas y ajustar escala/encuadre de dispositivos con las capturas reales del producto.
4. Reponer listas, métricas e iconos semánticos; mantener contenido real verificable.
5. Ajustar alturas, márgenes y FAQ, y revisar visualmente cada página contra su propuesta.

No se cambió la implementación durante esta auditoría.
