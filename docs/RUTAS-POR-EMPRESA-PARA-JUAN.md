# Rutas por empresa y permisos — lo que falta para entrar a una empresa (Issue #567)

Para: Juan · De: MP · Fecha: 2 oct 2026 · Base: `origin/main` tras el PR #557 (fusionado el 1 oct)

## Resumen (para pegar en la Issue)

El PR #557 dejó listo el patrón: la empresa va **en la ruta** (`/api/v1/console/tenants/{tenantId}/...`),
el servidor la autoriza con `TenantScopeService` y la identidad de la sesión no cambia. La web ya usa ese
patrón (commit `91e3cb6` de fom-md): ya no manda `x-fom-console-tenant`, pide
`GET /tenants/{id}/company-context` y reescribe a la ruta por empresa lo que la tiene.

**Lo que no tiene ruta por empresa la web lo rechaza** (error 501 local) en vez de pedirlo: si lo pidiera tal
cual, el servidor respondería con los datos de la empresa propia del administrador. Por eso, hoy, al entrar a una
empresa solo funcionan: flota (lista), gente, métricas diarias, gastos, reporte operativo y alta/edición de
usuarios. **Faltan unas 80 rutas espejo (unas 34 filas abajo, varias con más de una ruta)** para el resto del panel; abajo van todas, por prioridad.

Regla para cada espejo: mismo cuerpo, mismos parámetros y misma respuesta que la ruta actual, con
`requireVisible` en lecturas y `requireWritable` en escrituras.

---

## 1 · Lo que ya existe en main (no hay que hacer nada)

| Ruta | Rol que exige hoy | Alcance |
|---|---|---|
| `GET  /tenants/{t}/company-context` | admin FOM | `requireWritable` |
| `GET  /tenants/{t}/vehicles` | gestor | `requireVisible` |
| `GET  /tenants/{t}/vehicles/{v}/daily-metrics` | gestor | `requireVisible` |
| `GET  /tenants/{t}/directory` | gestor | `requireVisible` |
| `POST /tenants/{t}/users` · `PATCH /tenants/{t}/users/{u}` | admin FOM | — |
| `GET/POST /tenants/{t}/fleet-expenses` · `GET …/fleet-expenses/months` | gestor | visible / escribible |
| `GET  /tenants/{t}/driver-metrics` · `GET …/operational-report` | gestor | `requireVisible` |
| `GET  /tenants/{t}/audit` · `POST /tenants/{t}/areas` · `PATCH /tenants/{t}` · `POST …/contractors` | gestor / admin | según el caso |
| `…/tenants/{t}/service-payments/…` (7 rutas) | admin FOM | — |

"Gestor" = `supervisor` o `admin_fom` (`requireManagerActor`).

---

## 2 · Lo que falta, por prioridad

La columna «Pantalla» es el módulo del panel que hoy se queda sin datos dentro de una empresa.

### Prioridad 1 — entrar a la empresa y ver la operación en vivo

| # | Ruta nueva | Espejo de | Pantalla |
|---|---|---|---|
| 1 | `GET /tenants/{t}/summary` | `GET /summary` | Resumen |
| 2 | `GET /tenants/{t}/vehicles/{v}` | `GET /vehicles/{v}` | Expediente de la unidad, ficha del mapa |
| 3 | `GET /tenants/{t}/vehicles/{v}/position/latest` | `…/position/latest` | Mapa |
| 4 | `GET /tenants/{t}/vehicles/{v}/positions?limit&from&to` | `…/positions` | **Recorrido** (6/12/24 h; la web pide hasta 1000) |
| 5 | `GET /tenants/{t}/vehicles/{v}/telemetry-capabilities` | `…/telemetry-capabilities` | Ficha de la unidad |
| 6 | `GET /tenants/{t}/areas` | `GET /areas` | Filtros de flota y mapa |
| 7 | `GET /tenants/{t}/drivers` | `GET /drivers` | Asignar conductor |
| 8 | `GET /tenants/{t}/alert-events` · `GET …/{id}` | `GET /alert-events` | Alertas |
| 9 | `POST /tenants/{t}/alert-events/{id}/acknowledge` · `…/resolve` | igual | Alertas (escritura) |
| 10 | `GET /tenants/{t}/emergencies` · `GET …/{id}` | `GET /emergencies` | Eventos y SOS |
| 11 | `POST /tenants/{t}/emergencies/{id}/acknowledge` · `…/resolve` | igual | Eventos y SOS (escritura) |
| 12 | `GET /tenants/{t}/driver-sessions` · `GET …/{id}` | `GET /driver-sessions` | Jornadas |
| 13 | `GET /tenants/{t}/notifications` | `GET /notifications` | Campana de avisos (ver decisión 3) |

### Prioridad 2 — operación diaria

| # | Ruta nueva (todas bajo `/tenants/{t}`) | Espejo de | Pantalla |
|---|---|---|---|
| 14 | `GET /work-orders` · `GET /work-orders/{id}` | `GET /work-orders` | Mantenimiento (tablero) |
| 15 | `POST /work-orders` (con `Idempotency-Key`) | `POST /work-orders` | Nueva ODT |
| 16 | `PATCH /work-orders/{id}/status` · `PUT …/assignee` · `GET …/execution` · `POST …/execution-events` | igual | ODT |
| 17 | `GET /inspections` · `GET /inspections/{id}` | `GET /inspections` | Inspecciones |
| 18 | `GET/POST /inspection-schedules` · `POST …/{id}/cancel` | igual | Programa de inspecciones |
| 19 | `GET /inspection-findings` · `GET/POST /inspections/{i}/findings/{a}/follow-up` | igual | Hallazgos |
| 20 | `GET /inspection-templates` · `GET …/{id}` · `POST` · `PATCH …/{id}/status` | igual | Plantillas |
| 21 | `GET /documents` · `POST /documents` · `PATCH /documents/{id}` | igual | Documentos |
| 22 | `GET /alert-rules` · `POST` · `PATCH /alert-rules/{id}` | igual | Reglas de alerta |
| 23 | `GET /maintenance/plans` · `GET …/{id}` · `PUT` · `PATCH` · `PUT/DELETE …/vehicles/{v}` | `maintenance/plans…` | Planes de mantenimiento |
| 24 | `GET /maintenance/actions` · `GET/PUT …/{id}` · `PATCH …/{id}/status` | `maintenance/actions…` | Acciones |
| 25 | `GET /vehicles/{v}/odometer` | `GET /vehicles/{v}/odometer` | **Odómetro** (siguiente tarea) |

### Prioridad 3 — administración de la flota de la empresa

| # | Ruta nueva (bajo `/tenants/{t}`) | Rol hoy | Nota |
|---|---|---|---|
| 26 | `POST /vehicles` | admin FOM | Alta de unidad en otra empresa |
| 27 | `PATCH /vehicles/{v}` | gestor | |
| 28 | `POST /vehicles/{v}/drivers` · `PATCH /driver-assignments/{a}/revoke` · `…/pin` | gestor | |
| 29 | `GET /vehicles/{v}/archive-preflight` · `POST …/archive` | gestor | |
| 30 | `POST /users/{u}/rehire` | admin FOM | |
| 31 | `POST /users/{u}/credential-reset` · `PATCH /users/{u}/profile` | gestor | |
| 32 | `PATCH /areas/{a}` | gestor | (`POST …/areas` ya existe) |
| 33 | `POST /gps-devices` (admin FOM) · `PATCH /gps-devices/{d}` · `POST …/installation` · `PATCH /gps-installations/{a}/remove` · `PUT /gps-devices/{d}/capabilities` | admin FOM / gestor | Hoy son globales; solo se vuelven por empresa si se quiere instalar equipos desde dentro |
| 34 | `/:collection/:parentId/uploads` · `…/objects` · `…/downloads` | — | Ver decisión 5: el padre ya determina la empresa |

**No necesitan espejo** (ya reciben la empresa en la ruta o en el cuerpo, o son globales del administrador):
`/tenants`, `/tenant-relationships`, `/platform/*`, `/audit`, `/identity-transfers`, `/vehicle-transfers`,
`/auth/*`, `/maps/*`, `/tenant-comparison`.

---

## 3 · Permisos

### 3.1 Tres capas, en este orden
1. **Sesión:** cookie + cambio inicial de clave hecho + CSRF en escrituras (`x-fom-csrf`).
2. **Rol:** `requireManagerActor` (supervisor o admin FOM) o `requireFomAdminActor` (admin FOM o `platformAdmin`).
3. **Alcance de empresa:** `TenantScopeService`.

### 3.2 Alcance de empresa (`TenantScopeService`)
| Quién | Empresa pedida | Resultado | ¿Escribe? |
|---|---|---|---|
| cualquier gestor | la suya (`actor.tenantId`) | `home` | sí |
| admin FOM / `platformAdmin` | cualquiera que exista | `platform` | sí |
| gestor de una compañía | uno de sus contratistas (vista `actor_tenant_scope`) | `contractor` | **no** (403: «una compañía lee a sus contratistas, no los administra») |
| cualquiera | empresa ajena o inexistente | **404 igual** (no se distingue) | — |

Consecuencia: **todo espejo por empresa exige gestor**, porque `requireVisible` empieza por `requireManagerActor`.
Un conductor nunca elige otra empresa y sigue usando las rutas sin `/tenants/{t}`.

### 3.3 Rol que exige cada operación hoy (sacado de los guardas del servicio)

**Solo admin FOM:** crear empresas · crear usuarios (`createUser`) · reincorporar (`rehire`) · crear vehículos ·
registrar equipo GPS · alta de transferencias de identidad · colgar/terminar contratistas · todo `service-payments`
· `platform/*`.

**Gestor (supervisor o admin FOM):** listar y editar la gente (`listDirectory`, `updateUserProfile`,
`updateMembership`, `resetCredential`) · editar vehículos · asignar/revocar conductor y rotar PIN · instalar/quitar
equipo GPS · crear/mover ODT, asignarlas · crear/editar documentos y reglas de alerta · marcar/descartar avisos ·
plantillas, programas y hallazgos de inspección · planes y acciones de mantenimiento · gastos, métricas y reporte ·
crear/editar áreas, auditoría · archivar vehículo · transferencias de vehículo (alta y cancelación).

**Sin compuerta de rol en el servicio** (el aislamiento es solo por empresa, por RLS): lecturas de vehículos,
posiciones, resumen, áreas, conductores, alertas, emergencias, jornadas, ODT, inspecciones, documentos y reglas.
Cualquier rol de la empresa puede leerlas en su propia empresa.

### 3.4 Lo que ve cada área en la web (`RUTAS_POR_AREA`, no cambia)
| Área | Quién es | Módulos del panel |
|---|---|---|
| `admin` | admin FOM | todos; dentro de una empresa suma el menú operativo |
| `operativo` | supervisor de un contratista | Resumen, Centro de control, Alertas, Eventos y SOS, Vehículos, Jornadas, Mantenimiento, Inspecciones, Documentos, Gente, Reportes |
| `gerencial` | supervisor de una compañía | solo **Gente** y **Reportes** de sus contratistas (lectura) |
| `conductor` | conductor | Mi unidad, Alertas |
| `personal` | cuenta personal | Mapa, Alertas, Documentos, Gente |

El selector «entrar a una empresa» es solo del admin FOM. La compañía ya lee a sus contratistas con las rutas
que existen (`directory`, `operational-report`, `driver-metrics`).

---

## 4 · Decisiones que necesito de ti

1. **Un solo guardián por empresa.** ¿Prefieres que los espejos sean controladores nuevos o que las rutas actuales
   acepten `tenantId` opcional (como hizo `directory`)? La web no distingue: solo necesita la ruta.
2. **Lecturas a contratistas.** ¿Los espejos de lectura (prioridad 1 y 2) también deben servir al gestor de una
   compañía sobre sus contratistas (`scopeKind: contractor`, solo lectura)? Con `requireVisible` ya ocurre; confirma que es lo querido.
3. **Avisos (`notifications`).** Marcar leído/descartar es por persona. Dentro de una empresa, ¿el admin lee los
   avisos de esa empresa en solo lectura, y sus marcas siguen siendo de su propia bandeja? Propongo: `GET` por
   empresa sí; `read/dismiss` no tienen espejo.
4. **Posiciones.** El máximo es 1000 por consulta y la web pide 24 h. Si una unidad reporta cada minuto, 24 h son
   1440 puntos y se corta. ¿Subimos el máximo a 2000 para este endpoint o prefieres paginar por `to`?
5. **Subidas y descargas.** `/:collection/:parentId/...` resuelve la empresa por el padre. ¿Basta con eso o quieres
   que el admin deba pasar por `/tenants/{t}/...` también aquí?
6. **Auditoría.** ¿Cada lectura de un admin en una empresa ajena deja rastro en `audit`, o solo las escrituras?
7. **Idempotencia.** Los `POST` de ODT y recibos ya piden `Idempotency-Key`: confirmo que se mantiene igual en los espejos.

---

## 5 · Criterios de aceptación por ruta (los mismos del PR #557)

Para cada espejo, pruebas runtime con base real:
- admin FOM lee y escribe en cualquier empresa existente → 200.
- gestor en su empresa → 200; gestor de una compañía sobre un contratista: lectura 200, escritura **403**.
- empresa ajena o inexistente → **404** idéntico.
- conductor / usuario / operador → **403** en el espejo.
- `actor.tenantId` y el rol de la sesión no cambian dentro de la petición.
- sin la cabecera `x-fom-console-tenant` (ya no existe) y sin leer datos de la empresa del administrador.

## 6 · Cómo lo engancho en la web cuando publiques una ruta

En `src/panel/datos/rutaPorEnte.js` hay una lista (`EXPLICITAS`) con una línea por ruta. Cuando una ruta nueva esté
en TEST, agrego su línea, quito el aviso de esa pantalla y subo el cambio. No hay que coordinar nada más.
Ahora mismo la web ya reescribe: `vehicles` (lista), `directory`, `daily-metrics`, `POST users`, `PATCH users/{u}`.
