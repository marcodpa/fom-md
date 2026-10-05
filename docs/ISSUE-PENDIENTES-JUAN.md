# Pendientes del servidor para la web de FOM (un solo issue)

Lo que la web ya tiene hecho y necesita del servidor para funcionar completo. Cada punto dice qué se ve mal, la causa probable y qué se pide.

## 1. Transferencias da 403 al Administrador FOM
- **Qué se ve:** el Administrador FOM no puede ver ni abrir transferencias de personas ni de vehículos entre empresas.
- **Causa:** las políticas de la base (`vehicle_transfers_manager_scope`, que usa `fom.actor_manages_identity_tenant`) solo dejan pasar a quien está en `fom.map_platform_administrators` o es admin/supervisor activo del origen o del destino. Los servicios (`vehicle-transfer.service.ts`, `identity-transfer.service.ts`) comprueban solo `actor.platformAdmin`.
- **Se pide:**
  1. Registrar al usuario administrador en `map_platform_administrators`, en pruebas y en producción.
  2. Alinear la función de la base y los dos servicios para que usen el mismo criterio (`isPlatformAdministrator`).

## 2. Rutas por empresa (#594): confirmar despliegue
- **Qué se ve:** el administrador entra a una empresa y la web usa `/api/v1/console/tenants/{id}/...`.
- **Se pide:** confirmar que las rutas del #594 (A–F) están desplegadas en el servidor publicado, no solo integradas en main. Lista completa en `docs/RUTAS-POR-EMPRESA-PARA-JUAN.md`.

## 3. Falta espejo por empresa para avisos
- **Qué se ve:** dentro de una empresa, marcar un aviso como leído o descartado responde "sin ruta por empresa" (501 local).
- **Se pide:** rutas `/tenants/{id}/notifications/...` para leer y descartar.

## 4. GPS
- **Desmontar desde la web:** `GET /gps-devices` debería devolver el id de la instalación activa de cada equipo (por ejemplo `installationId`). Sin eso la web no puede llamar a `gps-installations/{id}/remove`.
- **Verificar por ping y probar el pánico:** hoy solo se hacen en campo. Decidir si se ofrece una vía para hacerlo desde la web.
- **Saltos de posición:** equipos parados que reportan puntos a cientos de metros y vuelven. La web ya los descarta, pero conviene filtrarlos o marcarlos en el servidor.

## 5. Odómetro
- **Qué se ve:** muchos equipos no mandan odómetro y la ficha decía "Sin dato". La web ahora calcula los km del GPS (hoy y 7 días) y los marca como cálculo.
- **Se pide:** decir qué devuelve `GET /vehicles/{v}/odometer` (campos, unidad, fecha de la lectura) para usarlo como lectura oficial.

## 6. Inspecciones
- **Regla en la base:** una inspección diaria por vehículo y por día (índice único), y que cada intento deje registro.
- **Tipo de inspección:** hoy la web deduce "Programada" si una cita enlaza la inspección, y "Diaria" si no. Mejor un campo explícito (`kind: daily | scheduled`) en la inspección.

## 7. Mapa único para web y app
- **Se pide:** decidir el proveedor y el servidor de rutas. Detalle en `docs/ISSUE-MAPA-UNICO.md` y `docs/OSRM-PROPIO-PARA-JUAN.md`.

## 8. App del conductor (repo fom-driver-juan)
Cambios sin subir en su repo: `costService.ts` (función `dia()`), `screen-header.tsx` (botón atrás) y las ediciones anteriores de contraseña y `validate.ts`. Revisar y subir.
