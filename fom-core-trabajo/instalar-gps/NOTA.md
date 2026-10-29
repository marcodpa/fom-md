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

---

# T-209 · El administrador global debe ver TODOS los GPS (nota para Juan)

Regla de Marco: «el administrador global de FOM no está en ninguna empresa: debe ver TODOS los GPS de
todas las empresas». Hoy, en la web, el Inventario GPS solo muestra los de la empresa propia (FOM).

## Qué se revisó en fom-core (`origin/main`, solo lectura)

| Ruta | Sirve a la web (cookie `__Host-fom_session`) | Motivo |
| --- | --- | --- |
| `GET /api/v1/console/gps-devices` (+ `/page`, `/:id`, `/telemetry`) | Sí, pero solo la empresa de la sesión | `console-gps-inventory.controller.ts:63/113`, `gps-console.service.ts:106` (`context()` usa el tenant del actor) |
| `GET /api/v1/console/gps-devices/unpaired` | Sí, global | Solo IMEI que no están en NINGUNA empresa: un equipo registrado en otra empresa ya no sale ahí |
| `/api/v1/console/tenants/:tenantId/...` | Sí | `console-tenant-fleet-admin.controller.ts` solo tiene escrituras de GPS (`POST/PATCH gps-devices`, `installation`, `remove`, `capabilities`), ninguna lectura |
| `GET /api/v1/mobile/tenants/:tenantId/gps-devices[/:id]` | NO | `mobile-tenant-scope.controller.ts:1023/1037`, `MobileSessionGuard` exige `Authorization: Bearer` de la app; la web no tiene ese token (ni debe guardarlo) |
| `/gps-console-internal/api/devices` | NO | Exige el token interno; no se puede publicar al navegador (Issue #173) |

Conclusión: la web no tiene hoy ninguna vía para leer los GPS de otra empresa. La APP sí: usa
`GET /api/v1/mobile/tenants/{id}/gps-devices` empresa por empresa con su Bearer, y ya junta todas.

## Qué hace la web mientras tanto

En la pantalla del Inventario GPS hay un aviso en llano («Los GPS registrados dentro de otras empresas se
ven entrando a esa empresa, hasta que el servidor permita verlos desde aquí») con el botón
«Buscar en otra empresa», que lleva a Empresas → «Entrar a empresa».

## Parche de servidor que haría falta (listado global para el admin FOM)

Opción A (la que recomiendo, no rompe nada): en `ConsoleGpsInventoryController` agregar

- `GET /api/v1/console/gps-devices/all` — `requireFomAdministrator()` (igual que `unpaired`).
  Devuelve `{ devices: [{ ...mismo formato que el listado actual..., tenantId, tenantName }] }`
  de TODAS las empresas activas, sin archivados. En `GpsConsoleService` basta una variante de
  `listDevices` sin `WHERE tenant_id = $1` (con `JOIN fom.tenants t`) y que no use `currentActor().tenantId`.
- `GET /api/v1/console/gps-devices/all/page` si el inventario crece (mismo patrón que `/page`).

Opción B (por empresa, la que ya anticipaba T-208): `GET /api/v1/console/tenants/:tenantId/gps-devices`
y `.../gps-devices/:deviceId` en `ConsoleTenantFleetAdminController`, con
`tenantScope.requireVisible(tenantId)` y `GpsConsoleService.listDevices({ tenantId, userId })` /
`device(id, { tenantId, userId })` (ya aceptan `contextOverride`). Con A la web hace una sola llamada;
con B recorre las empresas (como hace la app) y el espejo de `rutaPorEnte.js` ya cubre
`/tenants/{id}/gps-devices/:d/installation`.

Con cualquiera de las dos, en la web solo hay que cambiar `api.equiposGps` y quitar el aviso; las
acciones «Ver», «Probar» e «Instalar» deben abrir el equipo con la ruta de SU empresa (el instalar exige
equipo y unidad de la misma empresa, ver arriba).

## T-209 · Parche hecho (listo para revisar)

Worktree `C:\Users\home\projects\fom-core-gps-global`, rama `feature/gps-admin-global` (cortada de `origin/main`,
commit local `817a5d4`, sin push). Parche: `fom-core-trabajo/gps-admin-global/0001-GPS-el-administrador-FOM-ve-y-opera-los-equipos-de-t.patch`.

- Para el administrador FOM (`isPlatformAdministrator`): `GET /console/gps-devices` y `/page` devuelven los equipos de
  todas las empresas; `/:deviceId`, `/telemetry`, `/position/latest`, `/positions`, `POST /commissioning` y
  `POST /gps-commissioning/:id/complete` resuelven en el servidor la empresa dueña y reutilizan la lógica por empresa.
  El cliente nunca manda la empresa. Supervisores: sin cambios.
- Cada equipo trae `tenantId` y `tenantName` (campos nuevos, aditivos).
- `/unpaired` ya era global: solo lista IMEI que no están en NINGUNA empresa (uno registrado en otra empresa ya no sale ahí, y es lo correcto).
- Instalar no necesita cambio de servidor: la web usa `POST /console/tenants/{tenantId}/gps-devices/{id}/installation`
  (ya existe) con el `tenantId` del equipo.
- Pruebas locales: inventario HTTP (admin global / supervisor / OpenAPI), paginación global, SQL ajustado. Sin base real
  local: la consulta global usa `($1::uuid IS NULL OR d.tenant_id = $1)` y `JOIN fom.tenants`, por revisar contra Postgres.
