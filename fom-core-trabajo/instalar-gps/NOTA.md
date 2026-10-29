# T-208 · «Instalar en una unidad» daba 404 (nota para Juan)

Pantalla: panel web, Administración FOM → Inventario GPS → Equipo → «Instalar en una unidad»
(`/panel/admin/gps/:id/instalar`). Salía a pantalla completa «Ese recurso no existe en el servidor».

## Lo que hace el servidor (fom-core, `origin/main`)

1. `GET /api/v1/console/gps-devices/:deviceId` — `src/console-api/console-gps-inventory.controller.ts:113`
   ("Consultar un equipo GPS del tenant actual"). Llama a `GpsConsoleService.device()`
   (`src/gps-console/gps-console.service.ts:262`), que usa el tenant del ACTOR
   (`context()`, línea 106) y responde `NotFoundException('GPS not found')` (línea 265) si el
   equipo no es de esa empresa, está archivado, o la consulta no devuelve exactamente una fila.
   El listado `GET /gps-devices` usa la misma consulta y el mismo tenant, así que un equipo que
   sale en el inventario del administrador no debería dar 404 ahí; el 404 aparece cuando el id
   es de un equipo de OTRA empresa (p. ej. registrado con `POST /tenants/{id}/gps-devices`).
2. No existe lectura de equipos GPS por empresa en la consola: en
   `console-tenant-fleet-admin.controller.ts` solo están `POST gps-devices` (l. 189),
   `PATCH gps-devices/:id`, `POST gps-devices/:id/installation` (l. 210), `PATCH gps-installations/:id/remove`
   y `PUT .../capabilities`. Sí hay `GET /api/v1/mobile/tenants/:tenantId/gps-devices[/:id]`
   (`mobile-tenant-scope.controller.ts:1023/1037`), pero solo con sesión de la app.
3. Instalar busca el equipo Y la unidad en la MISMA empresa
   (`console-directory.service.ts:1875-1901`, `installGpsDevice`: `WHERE tenant_id = scope.tenantId AND id = deviceId`
   y luego `requireVehicle(scope.tenantId, vehicleId)`). Un equipo del inventario de FOM no se
   puede montar en una unidad de otra empresa; da 404 «Not found».

## Qué cambió en la web (T-208)

- El equipo se pide al detalle; si el servidor dice 404, se busca en el inventario (`GET /gps-devices`)
  por id antes de rendirse. Si tampoco está, mensaje claro: no está entre los equipos de tu empresa.
- La instalación va por la ruta PROPIA (sin `/tenants/{id}`) cuando la unidad es de la empresa del
  administrador, aunque esté «dentro» de otra empresa. Si elige una unidad de otra empresa, la
  pantalla avisa y, si el servidor rechaza, lo dice en llano.

## Parche de servidor que haría falta (solo si se quiere ver/instalar equipos de OTRA empresa)

Agregar en `ConsoleTenantFleetAdminController` (mismo guard que `POST gps-devices`, lectura
permitida a admin FOM y supervisor):

- `GET /api/v1/console/tenants/:tenantId/gps-devices` → `this.gps.listDevices({ tenantId, userId })`
- `GET /api/v1/console/tenants/:tenantId/gps-devices/:deviceId` → `this.gps.device(deviceId, { tenantId, userId })`

`GpsConsoleService` ya acepta `contextOverride` en `listDevices`, `listDevicesPage` y `device`; falta
validar `tenantId` con `tenantScope.requireVisible(tenantId)` como hacen las demás lecturas por
empresa, y (si se quiere) `telemetry`/`position/latest` con el mismo patrón. Con eso la web puede
mostrar el inventario de la empresa en gestión y la ruta `/tenants/{id}/gps-devices/:id/installation`
(que ya existe) encuentra el equipo y la unidad en la misma empresa.

Pendiente de confirmar con Juan: si lo publicado en producción es `origin/main` o la rama `main`
local (más vieja, sin `contextOverride`); no se pudo consultar el servidor real.
