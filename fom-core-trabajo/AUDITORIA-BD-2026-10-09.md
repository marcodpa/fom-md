# Auditoría: qué valores NO se están guardando en la base (9 de octubre de 2026)

Pedida por Marco tras ver que «Marcar todas como leídas» en Alertas no hacía
nada. Se revisó el panel (lo que manda), el servidor (lo que acepta y lo que de
verdad escribe en cada tabla) y producción (qué versión corre). Todo lo de
abajo está comprobado contra el código de `fom-core` en `main` y contra el
servidor publicado en https://15.204.105.201.

## 1. El caso de las alertas: la base sí guarda; faltan dos cosas en el servidor

- Las marcas de «leído» y «descartado» se guardan **por persona y por empresa**
  en la tabla `fom.notification_receipts`. No se pierden.
- **Producción corre el commit `ce4def3` del 3 de octubre.** Las rutas para
  marcar o descartar avisos **dentro de otra empresa** (`/tenants/{id}/notifications/…`)
  las hizo Juan en el PR #633 del 6 de octubre y **no están publicadas**.
  Dentro de una empresa el panel lee los avisos (esa ruta sí existe) y al
  marcar recibe un 404. Comprobado con llamadas directas a producción.
- **Aun cuando Juan publique el #633, dentro de una empresa seguirá sin verse
  nada como leído.** La lectura por empresa (`listTenantNotifications`) no
  consulta los recibos: la respuesta nunca trae `readAt` ni `dismissedAt`, y
  tampoco oculta los descartados. El contador del resumen por empresa sí los
  consulta, así que el badge dirá «0 sin leer» mientras la lista muestra todo
  sin leer. Es un bug del servidor, pendiente de reportar a Juan.
- Fuera de la empresa (vista propia) todo funciona: leer, marcar y descartar.

## 2. Lo que el panel manda: nada se pierde del lado del panel

Revisión automática de cada formulario y cada función de envío del panel:
todo campo que la persona escribe viaja al servidor. Cero campos huérfanos.

## 3. Valores que el servidor ACEPTA y luego NO guarda (del lado de Juan)

Ordenados por lo que afecta al panel:

| Dónde | Qué se pierde | Detalle |
|---|---|---|
| Mantenimiento → orden → **Reasignar** | la **nota** | Solo se guarda cuando la orden pasa de aprobada a asignada. Si ya estaba asignada y se reasigna, la nota se acepta y se descarta sin dejar rastro. |
| Transferencias → **Liberar en origen** y **Aceptar en destino** | el **motivo** | El servidor lo valida y no lo escribe en ninguna columna ni en la auditoría. (El panel hoy no manda motivo en esos dos pasos, así que no se nota, pero el hueco existe.) |
| Transferencias → **Rechazar** y **Cancelar** | el motivo se guarda pero **nunca se devuelve** | La columna `closed_reason` existe y se escribe, pero las lecturas no la incluyen. El panel no puede mostrar por qué se rechazó. |
| Crear orden desde una acción de mantenimiento | el **plan** del que nace | Se guarda `maintenance_plan_id`, pero ni la lista ni el detalle de órdenes lo devuelven. |
| GPS → desmontar | la **ubicación de almacén** | Solo se guarda si el equipo estaba en estado `active`; si no, queda solo en auditoría. |
| Gente → crear persona que ya existía en otra empresa | la **clave temporal** | Si la persona ya tenía clave, la nueva no se aplica. El servidor lo avisa con `passwordSet: false` y el panel ya lo muestra bien. |

Motivos y notas que **solo quedan en la bitácora de auditoría** (no en el
registro mismo): cambiar rol o estado de una persona, reincorporar, reiniciar
clave, rotar PIN, editar o suspender una empresa, descolgar un contratista,
cambiar estado de un pago, archivar una unidad, mover una acción de
mantenimiento. Se ven en la pantalla Auditoría; no en la ficha del registro.

## 4. Valores que SIEMPRE llegan vacíos al panel porque nadie los escribe

| Campo | Por qué está vacío | Qué hacer |
|---|---|---|
| Licencia y certificado médico de una persona | La consola no tiene ruta para escribirlos; solo los escribe la app del teléfono. | El conductor los carga desde la app. |
| Línea (SIM), ICCID, operadora, firmware, técnico y lugar de instalación de un GPS | Solo los escribe la consola interna de GPS de Juan; las rutas públicas no los aceptan. | Pedirle a Juan que las rutas públicas acepten esos campos, o registrar los equipos por su consola interna. |
| Número interno de flota (`fleet_number`) de una unidad | Nadie lo escribe en todo el servidor. | Pedirle a Juan que lo acepte al crear o editar la unidad, o quitarlo del panel. |
| Fecha de archivo de un plan de mantenimiento | No existe ruta de archivar planes; solo apagar. | Está bien así: el panel ofrece apagar. |
| Hora del evento (`eventTime`) de cada posición GPS | El servidor la guarda siempre en NULL; solo hay hora de recepción. | El panel ya usa la hora de recepción. |
| Índice de manejo seguro, nivel de aceite, temperatura de motor, dirección en texto | El servidor no los calcula ni los sirve. El score de manejo (#634) ya está en el código, sin publicar. | Llegan con el próximo despliegue (score) o nunca (aceite, temperatura). |

## 5. Rutas que el panel usa dentro de una empresa, contra producción

92 revisadas: 85 existen, 7 responden «no existe». Las 7 son las de avisos
(#633) y las del score de manejo (#634), todas en el código de Juan y sin
publicar. El mapa de rutas del panel está bien; es cuestión de despliegue.

## 6. Pendiente de publicar en producción (9 cambios de Juan desde el 3 de octubre)

74625f7 score de manejo (#634) · 0be52b8 clasificar inspecciones (#638) ·
bd02a82 contrato de odómetro (#637) · da3e9f2 instalación activa del GPS (#636) ·
18d3bc4 mantenimiento web del conductor (#635) · c65d56c acciones de avisos por
empresa (#633) · 1a1f9fc transferencias de plataforma (#632) · y dos de
operaciones (#628, #630).

## 7. Para Juan, en orden de importancia

1. Publicar producción (9 cambios pendientes).
2. En `listTenantNotifications`: unir los recibos como hace `listNotifications`,
   devolver `readAt`/`dismissedAt` y ocultar descartados.
3. Guardar la nota al reasignar una orden ya asignada.
4. Devolver `closedReason` en transferencias y `maintenancePlanId` en órdenes.
5. Guardar el motivo en liberar/aceptar transferencias.
6. Aceptar en las rutas públicas los datos de SIM/técnico del GPS y el número
   interno de la unidad, o retirarlos de las respuestas.

Lo no auditado a fondo: la ruta `POST /vehicles/:id/work-orders` (delega al
servicio móvil), las lecturas de emergencias y de score de manejo, y la
existencia de triggers de base que rellenen alguno de los campos del punto 4
(se comprobó solo en tres casos).
