# Reporte de pruebas del panel como supervisor (producción)

Fecha: 9 de octubre de 2026. Cuenta: supervisor de **FOM OPERATIONS**. Ambiente: **producción**, web local conectada a producción. Todo lo creado lleva el prefijo `[PRUEBA-IA]`.

Cómo se probó: se abrió cada pantalla, se pulsó cada botón que escribe datos y se comprobó la respuesta. Además se consultaron en solo lectura las rutas del servidor para separar "falta código" de "falta permiso" o "no está desplegado".

---

## 1. Lo que funciona

| Área | Probado |
|---|---|
| Mantenimiento: órdenes | Crear orden, pasar a revisión, aprobar, asignar responsable, volver a revisión, resolver sin taller con costo, historial de la orden |
| Alertas | Marcar leída, descartar |
| Reglas de alerta | Crear regla de velocidad, activar y apagar |
| Inspecciones | Crear plantilla, publicar, archivar, programar inspección, cancelar cita |
| Documentos | Registrar, renovar, archivar |
| Vehículos | Nueva área, cambiar el área de una unidad (se devolvió a la original) |
| Planes | Crear plan, asignar unidad |
| Próximos servicios | Crear acción (el "Servicio n.º" se pone solo), iniciar, completar (después del arreglo de abajo) |
| Centro de control | Carga, selección de unidad, recorrido con viajes y paradas, ordenado del más reciente al más antiguo |
| Expediente de unidad | Pestañas Resumen, Telemetría, Mantenimiento, Inspecciones, Documentos, Costos; revisión previa de "Archivar unidad" |
| Otras | Usuarios (lista), Jornadas (vacía), Mi perfil, Reportes (parcial) |

## 2. Fallos de la web que ya se corrigieron

1. **Completar una acción de mantenimiento fallaba** con "Progress only applies while in progress". La web mandaba un dato de progreso que el servidor rechaza al completar. Corregido y verificado.
2. **La fecha de vencimiento de una acción se corría un día** (puse 1 dic y quedó 30 nov, por la zona horaria). Corregido.

## 3. Fallos que son de CÓDIGO de la web (pendientes)

1. **La lista no se actualiza sola** después de crear una orden o de cambiarla de estado: hay que recargar la página para ver el cambio.
2. **Expediente, pestaña Telemetría:** muestra "Temperatura del motor null °C" y "Aceite 0%". Son valores vacíos que se dibujan como si fueran datos.
3. **Expediente, equipo GPS:** dice "Sin GPS / IMEI sin registrar" y "Alta —", aunque la revisión de "Archivar" dice que hay **1 equipo GPS instalado**. La web no está uniendo el equipo con la unidad.
4. **Conductor distinto según la pantalla:** la lista y el mapa dicen "Juan Guerra" y el expediente dice "Marco Pacheco (prueba)". La revisión previa dice "2 conductores asignados" a esa unidad: la web no resuelve cuando hay más de una asignación.
5. **Archivar documento no pide confirmación.**
6. **No hay forma de apagar, editar o borrar un plan, un área ni una regla** desde la web. Lo que se crea queda ahí.
7. **Mensajes del servidor en inglés** sin traducir (por ejemplo el de arriba).
8. **Texto técnico a la vista** en "Nuevo usuario": "El repositorio valida rol contra tipo de empresa".
9. **Mi perfil:** Dirección y Fecha de nacimiento dicen "No disponible en la web".

## 4. Lo que falta en el SERVIDOR (producción no lo tiene desplegado)

Consulta directa a producción, con la sesión del supervisor:

| Ruta | Respuesta | Qué rompe en la web |
|---|---|---|
| `fleet-expenses` y `fleet-expenses/months` | 404 | Reportes: "Costos: no disponible" y "Reporte parcial: faltan costos" |
| `driver-metrics` | 404 | Métricas por conductor |
| `operational-report` | 404 | Reporte operativo |
| `me/driving-score`, `driving-scores` | 404 | Score de manejo del conductor y ranking del supervisor |

Esas rutas existen en el código de Juan (`main`), pero **no están desplegadas en producción**. Lo mismo pasa con lo que ya reportamos: Transferencias, avisos por empresa y el reporte de fallas del conductor. Todo depende de la ventana de despliegue del Issue #640.

## 5. Permisos

- `platform/users` responde 403 "requiere administrador FOM": es lo esperado para un supervisor.
- El supervisor puede leer transferencias (200). Lo que falla (403) es el **administrador FOM** al abrirlas; está pendiente del despliegue del #640.
- El alta de usuarios solo ofrece los roles **Conductor** y **Usuario**. Si el supervisor debe poder crear supervisores, falta decidirlo.

## 6. Lo que NO se pudo probar y por qué

- **SOS:** no hay emergencias abiertas, y el SOS lo origina la app del conductor, no la web. Reconocer y resolver queda sin probar.
- **Crear usuario real, resetear clave, suspender, revocar:** crearía o modificaría cuentas reales.
- **Alertas de velocidad:** no se disparan sin movimiento de las unidades. Solo se probó crear, activar y apagar la regla.
- **Eventos de manejo:** sin datos hasta que se despliegue el score.
- **Transferencias, GPS, Auditoría, Empresas:** son del administrador FOM.
- **Flujos del conductor** (reportar falla, Mi unidad, su score): necesitan una cuenta de conductor.

## 7. Datos de prueba que quedaron en producción

- Orden `[PRUEBA-IA] Prueba automática…` (cerrada, costo $0) en la unidad AD132UV, y su aviso (descartado).
- Plantilla `[PRUEBA-IA] Revisión de prueba` (archivada) y su cita (cancelada).
- Documento `prueba_ia` en AD132UV (archivado).
- Regla de velocidad 250 km/h para 1 unidad (apagada).
- Área `[PRUEBA-IA] Área de prueba` (vacía; no se puede borrar desde la web).
- Plan `[PRUEBA-IA] Servicio de prueba` (activo, con la unidad AD132UV; no se puede apagar desde la web) y su acción (completada).

## 8. Orden sugerido para avanzar

1. **Servidor (Juan):** ventana de despliegue del #640. Desbloquea Transferencias, avisos por empresa, reportes de costos, métricas, score de manejo y el reporte de fallas del conductor.
2. **Web, de más a menos importante:** refrescar listas tras escribir (3.1), unir GPS y conductor en el expediente (3.3 y 3.4), quitar valores vacíos de Telemetría (3.2), poder apagar planes, áreas y reglas (3.6), confirmación al archivar (3.5).
3. **Pruebas pendientes:** repetir con una cuenta de conductor y, cuando haya ambiente de pruebas, SOS y acciones sobre cuentas.
