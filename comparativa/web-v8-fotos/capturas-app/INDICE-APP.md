# Capturas de la APP real (T-147)

La app de Juan (`fom-driver-juan`, Expo web) con datos de demostración del servidor falso
`tools/app-demo-api` (Transporte Lago Sur, Zulia). Teléfono 390 × 844 px CSS a 3x (1170 × 2532),
modo oscuro, «reducir movimiento». Cómo se sacan: ver los comentarios de
`tools/app-demo-api/servidor.mjs`, `app-expo.mjs` y `capturar.mjs`.

Cuentas: conductor@fom.com.ve (Carlos Méndez, Unidad U-001 · Z69FC7W, Toyota Hilux 2022) y
supervisor@fom.com.ve (Yeison Márquez).

Ajuste en las capturas: en la web de la app, react-native-web ignora el `paddingTop` /
`paddingLeft` de las tarjetas de cifras con ícono (`KpiResumen`) y el ícono tapa el título. En el
teléfono salen bien. Antes de cada foto se les pone el relleno que pide el código
(70 px arriba / 80 px a la izquierda). Afecta a m-sup-resumen y m-sup-resumen-cifras.

## Cada captura

Columna «Repetir»: **foto** = sale la Hilux que traía el disco (no vale, hay que sacarla otra vez
con la foto con licencia); **IA** = salen fotos de orden recortadas de imágenes generadas con IA
(se borraron de `tools/app-demo-api/fotos`; hay que repetirla con fotos con licencia o sin fotos).

| Archivo (3x/) | Rol | Pantalla | Reemplaza a (web) | Repetir |
|---|---|---|---|---|
| m-cond-inicio.png | Conductor | Mi unidad, hoja abierta: Hilux, 61 km/h, placa | cap-movil-cond-inicio | foto |
| m-cond-inicio-indice.png | Conductor | Mi unidad: índice 83/100 «Puedes mejorar» | — (extra) | |
| m-cond-inicio-telemetria.png | Conductor | Mi unidad: telemetría y odómetro | — (extra) | |
| m-cond-mapa.png | Conductor | Mi mapa (la unidad en el mapa, SOS) | cap-movil-cond-mapa | |
| m-cond-perfil.png | Conductor | Mi perfil: índice 83/100 y eventos por 100 km | cap-movil-cond-perfil | |
| m-cond-inspeccion.png | Conductor | Inspección diaria (hoja por llenar) | — (extra) | |
| m-cond-insp-foto.png | Conductor | Inspección: falla con foto | — (extra) | IA |
| m-insp-resultado.png | Conductor | Resultado de inspección con observación | cap-movil-insp-resultado | |
| m-insp-bloqueada.png | Conductor | Inspección bloqueada (no puede salir) | cap-movil-insp-bloqueada | |
| m-cond-mantenimiento.png | Conductor | Mantenimiento de mi unidad | cap-movil-cond-mantenimiento | |
| m-cond-mantenimiento-lista.png | Conductor | Mantenimiento: lista de órdenes | — (extra) | |
| m-cond-asignadas.png | Conductor | Asignadas a ti (2 órdenes) | cap-movil-mnt-asignadas | |
| m-cond-reportar.png | Conductor | Reportar una falla (frenos, alta) | cap-movil-mnt-reportar | foto |
| m-cond-reportar-fotos.png | Conductor | Reportar una falla con fotos | cap-movil-mnt-reportar-fotos | foto + IA |
| m-cond-reportar-larga.png | Conductor | Reportar una falla, pantalla larga | — (extra) | foto + IA |
| m-cond-orden-resuelta.png | Conductor | Orden resuelta (cierre y costo) | — (extra) | |
| m-cond-orden-fotos.png | Conductor | Orden: fotos del reporte y del cierre | — (extra) | IA |
| m-cond-orden-larga.png | Conductor | Orden entera, pantalla larga | — (extra) | IA |
| m-orden-historial.png | Conductor | Orden: fotos e historial | — (extra) | IA |
| m-sup-resumen.png | Supervisor | Resumen: flota 26 · 15 en marcha, ODT, alertas, mapa | cap-movil-sup-resumen | |
| m-sup-resumen-unidad.png | Supervisor | Resumen: vehículo seleccionado (U-001 con foto) | — (extra) | |
| m-sup-resumen-cifras.png | Supervisor | Resumen: inspecciones, mantenimiento, documentos, manejo | — (extra) | |
| m-sup-vehiculos.png | Supervisor | Vehículos: cifras y mapa | cap-movil-sup-vehiculos | |
| m-sup-vehiculos-lista.png | Supervisor | Vehículos: No pueden salir / Atención | — (extra) | |
| m-sup-unidad.png | Supervisor | Ficha de la Unidad U-001 (con foto) | — (extra) | |
| m-sup-mapa.png | Supervisor | Mapa de la flota (26 unidades) | cap-movil-sup-mapa | |
| m-sup-mapa-unidad.png | Supervisor | Mapa con U-001 elegida | cap-movil-sup-mapa-unidad | |
| m-sup-recorrido.png | Supervisor | Recorrido de U-001 (viajes y paradas) | — (extra) | |
| m-sup-mantenimiento.png | Supervisor | Mantenimiento: abiertas, en revisión, resueltas | cap-movil-sup-mantenimiento | |
| m-sup-mantenimiento-lista.png | Supervisor | Mantenimiento: órdenes, lo más nuevo arriba | — (extra) | |
| m-sup-orden.png | Supervisor | Orden abierta (frenos U-019) | — (extra) | |
| m-sup-nueva-odt.png | Supervisor | Nueva ODT llena (U-004, motor, alta) | — (extra) | |
| m-sup-planes.png | Supervisor | Planes de mantenimiento | — (extra) | |
| m-sup-plan.png | Supervisor | Plan «Cambio de aceite y filtro» por unidad | cap-movil-mnt-plan (la web muestra «Nuevo plan») | |
| m-sup-fotos.png | Supervisor | Orden: fotos del reporte y del cierre | cap-movil-mnt-fotos | IA |
| m-sup-resuelta.png | Supervisor | Orden resuelta | cap-movil-mnt-resuelta | |
| m-sup-inspecciones.png | Supervisor | Inspecciones: 17 de 26 hoy, requiere atención | cap-movil-sup-inspecciones | |
| m-sup-insp-historial.png | Supervisor | Inspecciones: historial por persona | cap-movil-insp-historial | |
| m-sup-usuarios.png | Supervisor | Usuarios | — (extra) | |
| m-sup-conductor.png | Supervisor | Perfil de Carlos Méndez (índice y eventos) | cap-movil-sup-conductor | |
| m-sup-reportes.png | Supervisor | Reportes (tipo, período, alcance) | cap-movil-sup-reportes | |
| m-sup-alertas.png | Supervisor | Alertas (8 sin leer) | cap-movil-sup-alertas | |
| m-sup-perfil.png | Supervisor | Mi perfil (Más) | — (extra) | |
| m-sup-areas.png | Supervisor | Áreas de la empresa | cap-movil-areas-vehiculos (parcial) | |

## Las 23 cap-movil-* de la web y su pareja

| Web (`src/assets/marketing/v8/`) | App (3x/) |
|---|---|
| cap-movil-areas-vehiculos | m-sup-areas (parcial: la app lista las áreas, no las unidades de cada una) |
| cap-movil-cond-inicio | m-cond-inicio (repetir con la foto) |
| cap-movil-cond-mantenimiento | m-cond-mantenimiento |
| cap-movil-cond-mapa | m-cond-mapa |
| cap-movil-cond-perfil | m-cond-perfil |
| cap-movil-insp-bloqueada | m-insp-bloqueada |
| cap-movil-insp-historial | m-sup-insp-historial |
| cap-movil-insp-resultado | m-insp-resultado |
| cap-movil-mnt-asignadas | m-cond-asignadas |
| cap-movil-mnt-fotos | m-sup-fotos (repetir: fotos IA) |
| cap-movil-mnt-plan | m-sup-plan (la web enseña el formulario «Nuevo plan»; la app, el plan con sus unidades) |
| cap-movil-mnt-reportar | m-cond-reportar (repetir con la foto) |
| cap-movil-mnt-reportar-fotos | m-cond-reportar-fotos (repetir: foto + IA) |
| cap-movil-mnt-resuelta | m-sup-resuelta |
| cap-movil-sup-alertas | m-sup-alertas |
| cap-movil-sup-conductor | m-sup-conductor |
| cap-movil-sup-inspecciones | m-sup-inspecciones |
| cap-movil-sup-mantenimiento | m-sup-mantenimiento |
| cap-movil-sup-mapa | m-sup-mapa |
| cap-movil-sup-mapa-unidad | m-sup-mapa-unidad |
| cap-movil-sup-reportes | m-sup-reportes |
| cap-movil-sup-resumen | m-sup-resumen |
| cap-movil-sup-vehiculos | m-sup-vehiculos |

Todas tienen pareja; la de áreas y la de plan son parciales.

## Fotos con mano (INDICE.md) y qué captura de la app llevan

| Foto | Pantalla que muestra | Captura de la app |
|---|---|---|
| conductor-cabina | Mi unidad (Reportando, 83/100) | m-cond-inicio (repetir con la foto) |
| conductor-sos | Mi unidad | m-cond-inicio (repetir con la foto) |
| mano-app-perfil | Mi perfil del conductor, 83/100 y eventos | m-cond-perfil |
| tecnico-app-unidad | Inspecciones | m-sup-inspecciones (o m-cond-inspeccion) |
| fila-flota (tableta) | Alertas | m-sup-alertas |
| taller-mantenimiento (tableta) | Mantenimiento | m-sup-mantenimiento |
| inicio-hero-movil-v | Resumen | m-sup-resumen |
| plataforma-hero-movil-v | Centro de control (mapa) | m-sup-mapa |
| que-ofrecemos-hero-movil-v | Mantenimiento | m-sup-mantenimiento |

Las de monitor o laptop (hero-monitor-carretera, oficina-*, laptop-vehiculos, operadora-mapa,
patio-monitor-mapa) son del panel de escritorio: no llevan captura de la app.

## Foto del vehículo

La app solo pinta foto para la Toyota Hilux (su catálogo de imágenes); las demás marcas salen con
la silueta. `capturar.mjs` cambia esa imagen por la de `datos.mjs → fotoDeVehiculo('Toyota',
'Hilux')`: primero `tools/app-demo-api/fotos/toyota-hilux-16x9.jpg` (copia), si no
`comparativa/fotos-vehiculos/recortes/toyota-hilux-16x9.jpg`. Si no hay, sale vacío.

Dónde se ve y qué tamaño tiene en pantalla (px CSS, se pinta con «contain», sin recortar):
- Mi unidad del conductor (hoja abierta): ancho completo × 150.
- Reportar una falla / Nueva ODT: tarjeta de la unidad, unos 150 × 110.
- Resumen del supervisor, vehículo seleccionado: unos 225 × 150.
- Ficha de la unidad: recuadro de unos 84 × 84.
La 16:9 encaja bien en todas; con fondo transparente se vería mejor (ahora sale como rectángulo).
