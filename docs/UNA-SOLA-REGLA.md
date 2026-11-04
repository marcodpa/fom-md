# Una sola regla por dato

Un mismo dato (si un carro tiene señal, cuántas órdenes están abiertas, cómo se escribe la hora…) se
decide en **un solo archivo**. Las pantallas llaman a ese archivo y nunca lo vuelven a calcular por su
cuenta. Así el mismo carro sale igual en Flota, Resumen, Centro de control, la ficha y el mapa.

Origen: el 4 nov 2026 el mismo carro salía «Reportando» en una pantalla y «Sin señal» en otra, porque
más de 20 sitios decidían el estado cada uno a su manera.

| Dato | Único lugar | Prueba que lo vigila |
|---|---|---|
| Estado de la unidad: con señal, sin ubicación, sin señal, sin GPS; marcha (En marcha ≥3 km/h, Detenida); «hace X» | `src/panel/datos/sinSenal.js` (`estadoSenal`, `haceCuanto`) y `estadoUnidad.js` | `test/regla-senal.test.js` |
| Excepción de la señal: si lo único al día es la recepción del equipo (Meitrack/Coban sin posición publicada), «Sin ubicación» llega a los 5 min y no a los 30, porque esa trama no dice dónde está ni si se mueve | `sinSenal.js` (`soloRecepcion`) | `test/recepcion-unidad.test.js` |
| Vencimientos de documentos (días de calendario local, 30 días por vencer, 7 urgente) y unidades que piden atención | `src/panel/datos/vencimientos.js`, `atencionUnidad.js` | `test/regla-vencimientos.test.js` |
| Órdenes (Abierta / En revisión / Resuelta), alertas sin leer, inspecciones pendientes de hoy, conteo de empresas | `odtGrupos.js`, `alertas-presentacion.js` (`contarSinLeer`), `inspeccionesHoy.js`, `contarEmpresas.js` | `test/regla-conteos.test.js` |
| Hora (12 h), fechas, números («1.234»), nombre visible de la unidad, placa, roles, puertos e IP del receptor GPS | `formato.js`, `nombreUnidad.js`, `placas.js`, `roles.js`, `gps.js` | `test/regla-formatos.test.js` |
| Errores del servidor: nunca se disfrazan de «no hay datos» | — (se avisa con «Reintentar») | `test/regla-errores.test.js` |

## Para quien cambie el código (personas o agentes)

1. Antes de calcular algo en una pantalla, busca si ya existe en la tabla de arriba. Si existe, úsalo.
2. Si hace falta un dato nuevo que van a mostrar dos pantallas o más, créalo primero en `src/panel/datos/`
   con su prueba, y después úsalo en las pantallas.
3. Si una de las pruebas `regla-*` falla, no la apagues: mueve tu cálculo al archivo de la regla. Solo se
   agrega una excepción a la lista de la prueba cuando el caso no es ese dato (por ejemplo, una caché de
   5 minutos no es la regla de señal), y siempre con su motivo escrito.
4. La app (`fom-driver-juan`) debe usar las mismas reglas: si cambias una aquí, cámbiala allá.
