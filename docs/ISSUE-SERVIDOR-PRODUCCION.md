# Producción: dejar el servidor al día con lo que la web ya usa (todo de una vez)

Pruebas hechas el 9 de octubre de 2026, en **FOM-PROD**, con la web conectada a producción y una cuenta de **supervisor** de FOM OPERATIONS. Reporte completo (lo que funciona, lo que falla en la web y lo que falta aquí): `docs/REPORTE-PRUEBAS-SUPERVISOR-2026-10-09.md`.

Casi todo lo que la web necesita **ya está escrito en `main`**. Lo que falta es que producción lo tenga. Este Issue junta todo en una sola ventana, para no ir de a una cosa.

## 1. Desplegar `main` en FOM-PROD (ventana ya preparada en #640)

- Producción está en `ce4def3` (80 migraciones). Target propuesto en #640: `origin/main`.
- 4 migraciones pendientes, en orden:
  1. `20261005180000000_align_transfer_platform_admin_scope` (Transferencias para administración de plataforma)
  2. `20261006180000000_enable_platform_notification_receipts` (avisos en empresas administradas por plataforma)
  3. `20261006190000000_classify_inspections_and_record_attempts` (inspección diaria o programada)
  4. `20261006210000000_add_driver_behavior_events` (score de manejo)
- Con respaldo previo (`fom-prod backup`) y las pruebas de humo (`smoke` y `version`) al final, como en #640.
- **Este Issue no reemplaza al #640**: es la lista de lo que hay que comprobar cuando termine.

## 2. Rutas que HOY responden 404 en producción (consultadas con la sesión del supervisor)

Todas existen en `main`; en producción responden `Cannot GET`.

| Ruta (`/api/v1/console/...`) | Qué rompe en la web | Dónde está en `main` |
|---|---|---|
| `fleet-expenses`, `fleet-expenses/months` | Reportes: «Costos: no disponible» y «Reporte parcial: faltan costos» | `console-fleet-insights.controller.ts` |
| `driver-metrics` | Métricas por conductor | `console-fleet-insights.controller.ts` |
| `operational-report` | Reporte operativo | `console-fleet-insights.controller.ts` |
| `me/driving-score`, `me/driving-events` | Tarjeta «Mi score de manejo» del conductor | `console-driving-insights.controller.ts` (#634) |
| `driving-scores`, `drivers/:u/driving-score`, `drivers/:u/driving-events` | Ranking de manejo del supervisor | `console-driving-insights.controller.ts` (#634) |
| `POST vehicles/:v/work-orders` (conductor) | El conductor no puede reportar una falla desde la web | #635 |
| `PATCH/POST notifications/...` por empresa (4 rutas) | «Marcar leída» y «Descartar» dentro de una empresa | #633 |

**Prueba para cerrarlo:** con la sesión de un supervisor, esas rutas de lectura devuelven 200 (con lista vacía si no hay datos) y no 404.

## 3. Lo que ya funciona en producción (no tocar)

Mantenimiento (crear, revisar, aprobar, asignar, resolver sin taller), alertas, reglas de velocidad, plantillas e inspecciones programadas, documentos, áreas, planes y acciones. Se verificó que no hay errores de permisos en lo probado.

## 4. Permisos y datos a revisar

1. **Transferencias para el Administrador FOM** da 403 hasta aplicar la migración 1. Probar con el administrador después.
2. **Alta de usuarios por el supervisor**: la web solo ofrece los roles *Conductor* y *Usuario*. ¿Debe poder crear *Supervisor*? Decidirlo y reflejarlo en la ruta.
3. **Una unidad con dos conductores** (uno principal y uno secundario): `GET /drivers` devuelve las dos asignaciones; confirmar que `principal` es único por unidad.
4. **El detalle de un vehículo** (`GET /vehicles/:id`) no trae su equipo GPS ni sus conductores. La web los une desde otras listas (ya hecho), pero conviene que el detalle los incluya.
5. **Valores de telemetría** (`engineTemperature`, nivel de aceite): hoy llegan vacíos; si existen en algún equipo, exponerlos; si no, avisar para quitarlos de la pantalla.
6. **Fecha de alta del vehículo** (`createdAt`) no viene en el detalle.
7. **Mi perfil** del supervisor: dirección y fecha de nacimiento no llegan en `GET /directory` para la propia persona.
8. **Mensajes de error en inglés** (por ejemplo «Progress only applies while in progress»): la web ya traduce los conocidos; si pueden devolver un `code` estable por error, es más fácil.

## 5. Para verificar después del despliegue (lo que NO se pudo probar hoy)

Cada uno con su cuenta y sin tocar datos reales ajenos:

- Supervisor: asignar conductor a una unidad, editar vehículo, «Nueva ODT» desde el expediente, cancelar una orden, «Marcar todas como leídas», «Descartar leídos», reconocer y resolver un evento de alerta, descartar una acción de mantenimiento, editar Mi perfil.
- Supervisor: reconocer y resolver una emergencia (SOS) generada desde la app.
- Conductor: reportar una falla desde la web, ver solo las órdenes de su unidad, ver su score de manejo.
- Administrador FOM: abrir y crear una transferencia de persona y de vehículo.
- Datos con movimiento real de unidades: que se disparen la alerta de velocidad y los eventos de manejo.

## Cierre

Cuando termine la ventana, pasar el script de rutas del punto 2 y confirmar que todo da 200. Con eso la web queda sin pendientes del lado del servidor.
