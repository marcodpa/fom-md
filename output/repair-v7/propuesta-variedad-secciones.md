# FOM: alternativas para romper la repetición de secciones

Fecha: 28 de septiembre de 2026. Estado: propuesta documentada, sin cambios de diseño aplicados en esta revisión.

## Dirección

Web comercial para responsables de flota, con fotografía de operaciones, superficies oscuras y azul FOM. Conservar esa identidad y las capturas reales. Variar la composición según la función del contenido, sin convertir cada grupo de ideas en tres cajas iguales. Los títulos de nuevas secciones que aparecen aquí son propuestas editoriales; no agregan prestaciones al producto.

## Evidencia y alcance

Revisión de los componentes de las once páginas en `src/pages/v7`, junto con las capturas actuales aportadas por el usuario. No es una auditoría funcional ni de accesibilidad completa.

En Inicio hay cinco llamadas a `TextCards columns={3}`: `in-02`, `in-03`, `in-05`, `in-06` e `in-07`. La primera y segunda aparecen consecutivas; la quinta sección, la sexta y la séptima vuelven a encadenar la misma estructura. Comparten borde, icono pequeño, título y párrafo. También repiten ideas de conexión oficina/campo. Cambiar solo colores, radios o animaciones no resolvería esa monotonía.

En otras páginas se repiten bloques similares: Plataforma (`pf-03`, `pf-05`), Qué ofrecemos (`qo-02`), Áreas (`ar-05`), Seguridad (`sg-04`) y Contacto (`ct-03`, `ct-05`). Funciones usa tarjetas en mantenimiento, pero ya cuenta con composiciones diferentes de recorrido GPS, telemetría y panel: conviene conservar esa variedad.

## Skills encontradas y seleccionadas

| Skill | Aporte concreto | Disponibilidad |
| --- | --- | --- |
| find-skills | Buscar y comprobar fuentes, en vez de instalar paquetes por nombre | Instalada |
| redesign-existing-projects | Detectar filas genéricas de tres tarjetas y proponer sustituciones en el proyecto existente | Instalada y consultada |
| design-taste-frontend | Elegir jerarquía, densidad y composiciones según el contenido y la identidad existente | Instalada y consultada |
| impeccable | Ya disponible para documentar decisiones y comprobar la implementación posterior | Instalada; no se ejecutó una crítica formal en esta revisión |
| gsap-framer-scroll-animation | Para implementar después el movimiento de las composiciones elegidas, con alternativa estática | Instalada; no hace falta ejecutarla para decidir el diseño |

Fuentes comprobadas: [catálogo de skills](https://skills.sh/), [repositorio Taste Skill](https://github.com/Leonxlnx/taste-skill), [redesign-existing-projects](https://skills.sh/leonxlnx/taste-skill/redesign-existing-projects), [design-taste-frontend](https://skills.sh/leonxlnx/taste-skill/design-taste-frontend). El catálogo consultado mostraba aproximadamente 385.200 y 530.900 instalaciones para las dos últimas, respectivamente; el repositorio tenía 90.804 estrellas según GitHub al consultar. Son señales de adopción, no garantías de calidad. No se necesita instalar duplicados.

Se usan selectivamente: las sugerencias genéricas de cambiar tipografía, añadir ruido, carruseles o animación constante no sustituyen la dirección aprobada por el usuario.

## Inicio: opciones concretas

### 1. Todo ese control. Ahora en tu mano.

**Recomendada: conexión entre dos vistas.** Una captura amplia del panel y un teléfono real al lado, con una sola frase que explique qué información comparten. Los tres beneficios pasan a una línea breve debajo, sin cajas ni iconos repetidos. La imagen demuestra la conexión en lugar de repetirla en tres párrafos.

**Alternativa:** conservar la foto actual del teléfono y acompañarla de un texto editorial corto con tres renglones separados por espacio, sin bordes. Es la opción más discreta y de menor trabajo.

En móvil: panel y teléfono se apilan; ninguno pierde legibilidad por intentar mostrar ambos en un ancho pequeño. La versión definitiva de las capturas espera la nueva app.

### 2. La operación se entiende mejor cuando todos ven lo mismo.

**Recomendada: índice de servicios con imagen compartida.** Seguimiento, Cuidado y Decisiones se presentan como tres filas grandes con separadores finos. Seleccionar una fila cambia la captura contigua y muestra su explicación. Cada fila conserva un enlace explícito a su página; seleccionar y navegar son acciones distintas.

**Alternativa:** un bloque editorial de Quiénes somos con la foto de oficina y un enlace, moviendo los servicios al índice de Qué ofrecemos. Evita contar lo mismo dos veces, aunque requiere acordar esa reorganización.

En móvil: filas desplegables con su imagen debajo. El contenido debe estar disponible por teclado y sin depender de pasar el ratón.

### 3. La operación también viaja con tu equipo.

**Recomendada: los tres teléfonos de la propuesta aprobada.** Inicio, Inspección y Perfil a gran tamaño, con una etiqueta y una frase por pantalla. Quitar las tres tarjetas que ahora repiten las pestañas. Mantener el fondo fotográfico sobrio y las capturas auténticas; no reutilizar como interfaz real los dibujos de la propuesta.

**Alternativa:** un teléfono grande y una lista vertical de tres capítulos que cambia su pantalla. No sumar tarjetas además de la lista.

En móvil: un teléfono legible con selector Inicio / Inspección / Perfil. La composición puede prepararse, pero la captura definitiva depende de la app que el usuario avisará que está disponible.

### 4. Del primer chequeo al próximo servicio.

**Recomendada: secuencia de trabajo.** Inspección → reporte de falla → mantenimiento → historial, usando únicamente los pasos que ya aparecen en el contenido del sitio. Una línea de recorrido con fragmentos de las pantallas relevantes; cada paso explica qué ocurre y quién lo consulta. No volver a encerrar cada paso en una tarjeta.

**Alternativa:** una única orden de trabajo de demostración, con anotaciones exteriores que expliquen su relación con la inspección y el historial. Solo utilizar datos de demostración ya existentes.

En móvil: secuencia vertical con lectura natural. No forzar desplazamiento horizontal ni fijar varias pantallas de scroll.

### 5. Conducir mejor empieza por entender cada viaje.

**Recomendada: detalle ampliado del perfil real.** El índice de conducción es protagonista y las explicaciones aparecen como anotaciones breves a su lado. El color y la cifra deben corresponder a la captura actual, sin inventar un 94 ni métricas de mejora.

**Alternativa:** fila editorial con tres preguntas cortas y respuestas: qué muestra el índice, qué eventos se consultan y dónde ve el conductor su información. Acompañar de una captura, sin tres cajas.

En móvil: captura seguida de explicaciones. La composición final se ajusta al nuevo perfil cuando se reciba la app.

## Opciones para las once páginas

| Página | Conservar | Presentación que aportaría variedad |
| --- | --- | --- |
| Inicio | Identidad, fotos seleccionadas y contenidos actuales | Conexión de dispositivos → índice de servicios → galería de app → secuencia operativa → detalle del índice |
| Plataforma | Recorrido del panel y matriz de roles | Sustituir las cuatro tarjetas de datos por un esquema claro de registro y consulta. Para oficina/campo, comparación en dos columnas con filas abiertas |
| App | Capturas reales y relato del conductor | Organizar por momentos de la jornada; una pantalla protagonista en cada momento. Esperar las capturas nuevas |
| Funciones | Recorrido GPS, vehículo de telemetría y laptop | Mantenimiento como expediente con historial, en lugar de otro bloque de tarjetas; conservar controles de GPS y telemetría |
| Seguridad | Evento, vídeo y panel reales | Relato de un evento: detectar, revisar y atender, separando demostración de capacidades reales. Evitar repetir el mismo índice de Inicio |
| Áreas | Mapa, geocercas y filtro de sedes | Gestión de usuarios como relación entre sede, área y responsable. Lista o esquema organizativo en lugar de cinco cajas pequeñas |
| Quiénes somos | Camión y tarjetas Conectar/Entender/Actuar de la propuesta | Mantener aquí ese grupo visual distintivo; rodearlo de relato editorial y FAQ sobre la carretera aprobada |
| Qué ofrecemos | Los tres grupos actuales y enlaces al producto | Catálogo vertical de servicios, con una imagen diferente por grupo y explicación de su uso. Alternativa: índice con una vista compartida |
| Beneficios | Nueva foto de carretera y vistas del panel | Beneficios ordenados como preguntas de la operación, cada una con evidencia visual. No inventar ahorros o comparaciones antes/después |
| Preguntas | Categorías y respuestas existentes | Índice de temas y acordeón amplio; evitar otro bloque comercial de tres ventajas. Mantener acceso directo a cada tema |
| Contacto | Foto de reunión y formulario | Proceso de contratación como lista de pasos. Instalación con foto grande y columna lateral, siguiendo la propuesta enviada |

## Nuevas secciones que sí aportarían información

Estas ideas reorganizan información existente; primero deben sustituir repeticiones antes de alargar la página.

- **Una jornada con FOM:** recorrido desde la inspección hasta el seguimiento en oficina. Puede reemplazar dos bloques que hoy repiten funciones.
- **Quién hace qué:** una vista breve de conductor y supervisor, enlazada a la matriz de roles. Útil para entender el producto sin repetir prestaciones.
- **De una alerta a su revisión:** mostrar un evento de demostración existente, su ubicación y dónde se consulta. No prometer automatizaciones que no estén verificadas.
- **Cómo empezamos contigo:** unir solicitud de demo, coordinación e instalación con el contenido existente de Contacto; incluir enlaces al formulario.

## Reglas para la siguiente implementación

1. No repetir la misma composición en dos secciones contiguas. La variedad debe responder al contenido.
2. Conservar las tarjetas cuando comparan opciones reales o cuando pertenecen a una propuesta aprobada, no por defecto.
3. Evitar dos controles para lo mismo: las tres tarjetas de app y las tres pestañas actuales duplican la explicación.
4. Mantener la paleta FOM y la fotografía existente que funciona. No introducir personas ni nuevas imágenes por rellenar espacio.
5. Animar solo lo que explica una relación o cambia una vista. Fotos, manos y pantallas deben permanecer alineadas durante todo el movimiento.
6. Usar capturas reales, con datos de demostración identificados. No inventar clientes, porcentajes, resultados ni prestaciones.
7. Verificar cada composición en escritorio y móvil. El texto tiene que ser HTML y las funciones accesibles por teclado.

## Orden propuesto

Primero: resolver Inicio con las cinco alternativas recomendadas y compararlo con las referencias. Después: Plataforma, Qué ofrecemos y Contacto, donde la repetición es más evidente en los componentes. Finalmente: ajustes específicos del resto, conservando las secciones que ya tienen una composición propia.

Esta revisión solo agrega documentación. No modifica los componentes de la web ni ejecuta una publicación.
