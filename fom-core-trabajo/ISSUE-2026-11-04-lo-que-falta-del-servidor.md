# Servidor: lo que falta para que la web y la app digan lo mismo (4 nov 2026)

La web y la app ya usan **una sola regla por dato**: el mismo carro sale igual en todas las
pantallas. Está explicado en `docs/UNA-SOLA-REGLA.md` de marcodpa/fom-md, rama `codex/rediseno-v6-fiel`. Esa rama ya incluye tus
cambios del 3 y 4 nov (recepción Coban y Meitrack). Para cerrar lo que queda hacen falta estas
cosas del servidor.

## 1. La app no puede saber si un carro está «Sin ubicación» (prioridad alta)
`GET /api/v1/mobile/vehicles` y `GET /api/v1/mobile/tenants/{id}/vehicles` no mandan los campos
que la consola sí manda desde `fom.vehicle_live_state`:

- `lastReportAt` (último mensaje de cualquier tipo, latidos incluidos)
- `lastPositionAt` (última posición válida)
- `motionState`
- `fleetNumber`

Sin ellos, la app solo ve `latestPosition.receivedAt`. Por eso un GPS que manda latidos sin
ubicación, como el Coban 868166050887355 del Camry AK116MA, sale «Sin señal» en la app y «Sin
ubicación» en la web. La app ya está lista para leerlos en cuanto lleguen; no hay que tocar nada más en
la app.

**Hecho cuando:** las dos rutas móviles devuelven esos 4 campos, con el mismo serializador que
`console-fleet.service.ts`.

## 2. Confirmar cómo cuentan dos resúmenes
- `/summary`: ¿`odtEnRevision` incluye `aprobada`, `asignada`, `en_ejecucion`, `pausada` y
  `en_calidad`? La web agrupa así: Abierta / En revisión (esos 6) / Resuelta. Si el servidor
  cuenta solo `en_revision`, el Resumen no cuadra con Mantenimiento.
- `/summary` de inspecciones de hoy: ¿cuenta registros o unidades distintas con inspección diaria? La web cuenta unidades.

## 3. Paginación que la web ya usa
- `GET /documents` y `GET /notifications` con `offset` y `limit=200`: confirmar que los aceptan
  como las demás listas. Antes se leía una sola página de 100.
- Documentos móviles: ¿mandan `daysToExpiry`? La app lo usa si llega.

## 4. GPS
- **Coban sin hora fiable:** tras reinstalar, las posiciones llegan con `eventTime` nulo y
  `timezoneStatus: unknown`. La última del Camry es del 2 nov a las 15:11 UTC, antes de la
  instalación de las 18:25 UTC. ¿El servidor descarta o no atribuye al vehículo las posiciones
  sin hora? El equipo sigue mandando latidos.
- **Meitrack AH533FD sin publicar nunca (5 nov):** el T399L 867869061378428 manda 61 tramas por
  hora (143 B, IMEI coincide) desde el 3 nov, pero el diagnóstico sigue en `clock_pending` y la
  unidad no tiene ninguna posición publicada. ¿Qué falta para dar la hora por comprobada y
  publicar? Si hace falta la respuesta DB4, decir cómo se carga.
- **Meitrack desde la app:** la app llama a `/api/v1/mobile/meitrack-setup/...` y esa ruta no
  existe. O se publica la ruta móvil, o la app esconde el registro Meitrack.
- **Instalar desde la app:** falta la ruta móvil para instalar un GPS del inventario en una
  unidad de otra empresa.

## 5. Seguridad (de la auditoría del 30 oct, `fom-core-trabajo/seguridad/`)
- Cloudinary: que el servidor firme las subidas (`public_id` fijo, `overwrite=false`).
- Login: límite por IP y por correo.
- Proxy de gps-web: rechazar `..` y segmentos vacíos.

## 6. Decisión pendiente (Marco)
El rol `operator` ve el panel completo en la web y entra como cuenta personal en la app. Hay que
decidir cuál de las dos es la correcta.
