# Capturas de la APP real (T-147, repetidas en T-161)

La app de Juan (`fom-driver-juan`, Expo web) con datos de demostración del servidor falso
`tools/app-demo-api` (Transporte Lago Sur, Zulia). Teléfono 390 × 844 px CSS a 3x (1170 × 2532),
modo oscuro, «reducir movimiento». Cómo se sacan: ver los comentarios de
`tools/app-demo-api/servidor.mjs`, `app-expo.mjs` y `capturar.mjs`.

**T-161 (23 oct 2026):** repetidas 41 de 44 con la app después de los arreglos de T-159
(encabezados, pastillas, barra de abajo y fondo), la Hilux con licencia libre y SIN fotos de
órdenes. Se sacan todas en lote con `node tools/app-demo-api/lote.mjs` (con servidor.mjs,
app-expo.mjs y capturar.mjs encendidos); `lote.mjs m-cond-inicio m-sup-mapa` saca solo ésas.
La hoja de «Mi unidad» se abre con un arrastre de PointerEvents de ratón sintéticos (los clics y
toques de DevTools no le llegan a gesture-handler en la web).
Los ids de la demo cambiaron (datos.mjs → uuid): antes todas las órdenes salían con el código
«ODT-D0000000»; ahora cada una tiene el suyo (p. ej. «ODT-B68429A6»).

Cuentas: conductor@fom.com.ve (Carlos Méndez, Unidad U-001 · Z69FC7W, Toyota Hilux 2022) y
supervisor@fom.com.ve (Yeison Márquez).

Ajuste en las capturas: en la web de la app, react-native-web ignora el `paddingTop` /
`paddingLeft` de las tarjetas de cifras con ícono (`KpiResumen`) y el ícono tapa el título. En el
teléfono salen bien. Antes de cada foto se les pone el relleno que pide el código
(70 px arriba / 80 px a la izquierda). Afecta a m-sup-resumen y m-sup-resumen-cifras.

## Cada captura

Columna «T-161»: **sí** = repetida; **NO** = no se repitió y el archivo que hay es el viejo de
T-147 (con la Hilux del disco y fotos de orden hechas con IA): no usar hasta que haya fotos de
órdenes con licencia.

| Archivo (3x/) | Rol | Pantalla | Reemplaza a (web) | T-161 |
|---|---|---|---|---|
| m-cond-inicio.png | Conductor | Mi unidad, hoja abierta: Hilux (foto con licencia), 61 km/h, placa | cap-movil-cond-inicio | sí |
| m-cond-inicio-indice.png | Conductor | Mi unidad: índice 83/100 «Puedes mejorar» | — (extra) | sí |
| m-cond-inicio-telemetria.png | Conductor | Mi unidad: telemetría y odómetro | — (extra) | sí |
| m-cond-mapa.png | Conductor | Mi mapa (la unidad en el mapa, SOS) | cap-movil-cond-mapa | sí |
| m-cond-perfil.png | Conductor | Mi perfil: índice 83/100 y eventos por 100 km | cap-movil-cond-perfil | sí |
| m-cond-inspeccion.png | Conductor | Inspección diaria (hoja por llenar) | — (extra) | sí |
| m-cond-insp-foto.png | Conductor | Inspección: falla crítica (luces) con nota y observación, sin foto | — (extra) | sí |
| m-insp-resultado.png | Conductor | Resultado de inspección bloqueada (2 fallas críticas, 1 observación) | cap-movil-insp-resultado | sí |
| m-insp-bloqueada.png | Conductor | Inspección bloqueada (no puede salir) | cap-movil-insp-bloqueada | sí |
| m-cond-mantenimiento.png | Conductor | Mantenimiento de mi unidad: cifras, U-001, buscador y filtros | cap-movil-cond-mantenimiento | sí |
| m-cond-mantenimiento-lista.png | Conductor | Mantenimiento: lista de órdenes y realizadas | — (extra) | sí |
| m-cond-asignadas.png | Conductor | Asignadas a ti (2 órdenes) | cap-movil-mnt-asignadas | sí |
| m-cond-reportar.png | Conductor | Reportar una falla (frenos, alta), Hilux con licencia | cap-movil-mnt-reportar | sí |
| m-cond-reportar-fotos.png | Conductor | Reportar una falla con fotos | cap-movil-mnt-reportar-fotos | NO: sin fotos sale igual que m-cond-reportar |
| m-cond-reportar-larga.png | Conductor | Reportar una falla, un poco más alta: se ven Tomar foto / Galería sin fotos | — (extra) | sí |
| m-cond-orden-resuelta.png | Conductor | Orden resuelta (cierre y costo) | — (extra) | sí |
| m-cond-orden-fotos.png | Conductor | Orden: fotos del reporte y del cierre | — (extra) | NO: sin fotos solo enseña dos recuadros vacíos (lo mismo sale en m-orden-historial) |
| m-cond-orden-larga.png | Conductor | Orden resuelta entera, pantalla larga (fotos: «Sin fotos adjuntas») | — (extra) | sí |
| m-orden-historial.png | Conductor | Orden: la unidad, fotos vacías e historial | — (extra) | sí |
| m-sup-resumen.png | Supervisor | Resumen: flota 26 · 15 en marcha, ODT, alertas, mapa | cap-movil-sup-resumen | sí |
| m-sup-resumen-unidad.png | Supervisor | Resumen: vehículo seleccionado (U-001 con foto con licencia) | — (extra) | sí |
| m-sup-resumen-cifras.png | Supervisor | Resumen: inspecciones, mantenimiento, documentos, manejo | — (extra) | sí |
| m-sup-vehiculos.png | Supervisor | Vehículos: cifras y mapa | cap-movil-sup-vehiculos | sí |
| m-sup-vehiculos-lista.png | Supervisor | Vehículos: No pueden salir / Atención | — (extra) | sí |
| m-sup-unidad.png | Supervisor | Ficha de la Unidad U-001 (con foto con licencia) | — (extra) | sí |
| m-sup-mapa.png | Supervisor | Mapa de la flota (26 unidades) | cap-movil-sup-mapa | sí |
| m-sup-mapa-unidad.png | Supervisor | Mapa con U-001 elegida | cap-movil-sup-mapa-unidad | sí |
| m-sup-recorrido.png | Supervisor | Recorrido de U-001 (viajes y paradas) | — (extra) | sí |
| m-sup-mantenimiento.png | Supervisor | Mantenimiento: abiertas, en revisión, resueltas | cap-movil-sup-mantenimiento | sí |
| m-sup-mantenimiento-lista.png | Supervisor | Mantenimiento: «Atender ahora», lo más nuevo arriba | — (extra) | sí |
| m-sup-orden.png | Supervisor | Orden abierta (frenos U-019) | — (extra) | sí |
| m-sup-nueva-odt.png | Supervisor | Nueva ODT llena (U-004, motor, alta) | — (extra) | sí |
| m-sup-planes.png | Supervisor | Control de la flota: planes de mantenimiento | — (extra) | sí |
| m-sup-plan.png | Supervisor | Plan «Cambio de aceite y filtro» por unidad | cap-movil-mnt-plan (la web muestra «Nuevo plan») | sí |
| m-sup-fotos.png | Supervisor | Orden: fotos del reporte y del cierre | cap-movil-mnt-fotos | NO: sin fotos no enseña nada propio |
| m-sup-resuelta.png | Supervisor | Orden resuelta (con «Reabrir») | cap-movil-mnt-resuelta | sí |
| m-sup-inspecciones.png | Supervisor | Inspecciones: 17 de 26 hoy, requiere atención | cap-movil-sup-inspecciones | sí |
| m-sup-insp-historial.png | Supervisor | Inspecciones: historial por persona | cap-movil-insp-historial | sí |
| m-sup-usuarios.png | Supervisor | Usuarios | — (extra) | sí |
| m-sup-conductor.png | Supervisor | Perfil de Carlos Méndez (índice y eventos) | cap-movil-sup-conductor | sí |
| m-sup-reportes.png | Supervisor | Reportes (tipo, período, alcance) | cap-movil-sup-reportes | sí |
| m-sup-alertas.png | Supervisor | Alertas (8 sin leer) | cap-movil-sup-alertas | sí |
| m-sup-perfil.png | Supervisor | Mi perfil (Más) | — (extra) | sí |
| m-sup-areas.png | Supervisor | Áreas de la empresa | cap-movil-areas-vehiculos (parcial) | sí |

## Las 23 cap-movil-* de la web y su pareja

| Web (`src/assets/marketing/v8/`) | App (3x/) |
|---|---|
| cap-movil-areas-vehiculos | m-sup-areas (parcial: la app lista las áreas, no las unidades de cada una) |
| cap-movil-cond-inicio | m-cond-inicio |
| cap-movil-cond-mantenimiento | m-cond-mantenimiento |
| cap-movil-cond-mapa | m-cond-mapa |
| cap-movil-cond-perfil | m-cond-perfil |
| cap-movil-insp-bloqueada | m-insp-bloqueada |
| cap-movil-insp-historial | m-sup-insp-historial |
| cap-movil-insp-resultado | m-insp-resultado |
| cap-movil-mnt-asignadas | m-cond-asignadas |
| cap-movil-mnt-fotos | m-sup-fotos (vieja, con fotos IA: no usar; falta decidir las fotos de órdenes) |
| cap-movil-mnt-plan | m-sup-plan (la web enseña el formulario «Nuevo plan»; la app, el plan con sus unidades) |
| cap-movil-mnt-reportar | m-cond-reportar |
| cap-movil-mnt-reportar-fotos | m-cond-reportar-fotos (vieja, con fotos IA: no usar; mientras, m-cond-reportar-larga) |
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

Todas tienen pareja; la de áreas y la de plan son parciales, y la de fotos y reportar-fotos esperan
las fotos de órdenes.

## Fotos con mano (INDICE.md) y qué captura de la app llevan

| Foto | Pantalla que muestra | Captura de la app |
|---|---|---|
| conductor-cabina | Mi unidad (Reportando, 83/100) | m-cond-inicio |
| conductor-sos | Mi unidad | m-cond-inicio |
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

Las demás unidades (p. ej. la Ford F-150 de m-sup-nueva-odt) salen con la silueta de la app.

## Textos cortados o raros que quedan (T-161)

- m-cond-inspeccion, m-cond-insp-foto: los botones dicen «Observaci…» (no cabe «Observación»).
- m-cond-inspeccion: «Revisa tu unidad antes de salir.» sale dos veces (subtítulo y texto).
- m-cond-mantenimiento, m-sup-mantenimiento, m-sup-alertas, m-sup-conductor: la fila de filtros
  se corta a la derecha («En…», «Aceleraciones 5 de…»); se desliza de lado, es a propósito.
- m-sup-resumen-cifras: la tabla de manejo corta la columna «Por 100 km» (se desliza de lado).
- m-sup-usuarios: «Con…» y «Dete…» junto al punto verde; «Carlos Méndez» y «Pedro Villalobos»
  parten el nombre en dos líneas por la pastilla del índice.
- m-sup-vehiculos-lista: «Responsabilidad civil (RC…», «Carné de circulación 11/2…», «Occiden…»,
  «Costa ori…».
- Encabezado del supervisor: «Transporte Lago Su…»; m-sup-perfil: «supervisor@fom.com…».
- m-sup-unidad: la fila de pestañas corta «Usu…» (se desliza de lado).
- m-cond-inicio-telemetria: «Temp. motor 0 °C» (la demo no manda temperatura).
- m-sup-inspecciones: «Abre el resultado para ver fallas y observaciones -…».
- Mi perfil del conductor (más abajo de lo que sale en m-cond-perfil): «documentos al d…».
- m-cond-perfil: la campana no lleva el número de avisos (en Mi unidad sí sale «3»).
- Reportar una falla: sin fotos el formulario cabe sin desplazarse y el botón fijo «Crear ODT»
  tapa los botones Tomar foto / Galería (por eso m-cond-reportar-larga es un poco más alta).
