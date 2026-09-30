# Auditoría funcional del dashboard FOM

Fecha: 29 de septiembre de 2026. Ejecución: `qa-1790688406645`.

## Resultado y alcance

Se revisaron las pantallas del menú del dashboard y se ejercitaron operaciones reales con registros identificados como **PRUEBA QA**. La web local de `127.0.0.1:5174` está conectada al servidor de producción: las pruebas de escritura dejaron historial real de auditoría. No se modificaron vehículos operativos, no se dispararon emergencias y no se cobraron fondos.

**No está certificado el funcionamiento completo de todos los apartados.** Se corrigieron errores del frontend y se verificó un ciclo completo de mantenimiento. Persisten bloqueos del backend y funciones sin integración completa, enumerados abajo. La publicación pública de estos cambios sigue pendiente; el estado actualizado de roles está en `ROLES-GLOBALES.md`.

Sesión utilizada: administrador FOM de FOM OPERATIONS. No se hicieron pruebas de sesión independientes como supervisor, conductor o usuario de otra empresa; las pruebas unitarias de roles no sustituyen ese ensayo de aislamiento.

## Errores corregidos

| Apartado | Error encontrado | Corrección y evidencia |
|---|---|---|
| Vehículos | Crear devolvía un ID vacío aunque el servidor había creado la unidad. | Se acepta `vehicleId`, además de la forma anidada. Segunda unidad QA creada y archivada con su ID correcto. |
| Empresas y áreas | Mismo desacuerdo de respuesta: `tenantId` / `areaId`. | Se adaptaron las respuestas. Empresa y área recuperadas, utilizadas y retiradas de operación. |
| Planes | Código incompatible con el patrón del servidor; acciones preventivas sin ciclo y pérdida de ceros. | Normalización/validación de código, ciclo obligatorio, vencimiento requerido; se conservan odómetro y costo cero. Plan, cobertura y acción real verificados. |
| Órdenes | La orden creada desde una acción perdía el vínculo `maintenanceActionId`. | El ID llega al backend; cerrar la ODT completó la acción original. También se conserva `alertEventId`. |
| Inspecciones programadas | Se enviaba una fecha-hora donde el contrato exige fecha civil. | Se envía `YYYY-MM-DD`. Cita creada, consultada y cancelada. |
| Plantillas | Faltaban controles para crear y publicar plantillas. | Formulario con puntos y criticidad; crear borrador, publicar y archivar conectados. Flujo real comprobado. |
| Inspecciones realizadas | El detalle reconstruía respuestas supuestas. | Se consulta el detalle real del servidor y se muestran sus respuestas. No había inspecciones realizadas para verificar ese detalle con un caso real. |
| Reglas de alerta | No se enviaban las unidades seleccionadas. | Selector de vehículos y envío de `vehicleIds`; regla QA activada y desactivada exclusivamente sobre una unidad ficticia. |
| Personal | Editar nombre enviaba un cuerpo sin cambios reconocidos. | `nombre` se traduce a `displayName`; nombre QA actualizado y leído nuevamente. |
| Pagos | El frontend trataba el módulo como inexistente aunque hay endpoints. | Lectura, creación, cambio de estado y registro de abono conectados. Cuota real QA creada; el cambio de estado falla en backend. Abono no ejecutado. |
| Sesión | Fallos temporales de red/429 se interpretaban como sesión cerrada. | Error recuperable con reintento; solo un fallo de autenticación confirmado invalida la sesión. |
| Lecturas | Varias consultas fallidas terminaban como listas vacías. | Se propaga el error a la pantalla para distinguir fallo de carga de ausencia de registros. Regresión automatizada con HTTP 500. |
| Consultas | Llamadas GET simultáneas duplicadas. | Se comparte la petición en curso, sin guardar caché permanente ni deduplicar escrituras. |
| Reportes | Filtro por área no restringía realmente la flota; conductor se comparaba como objeto aunque su unidad es un ID. | Ambos filtros corregidos. Flota QA filtrada por área y comprobada contra el servidor. |
| Indicadores | Se presentaban ceros, puntuaciones o ausencia de SOS sin datos suficientes. | Datos desconocidos se muestran como no disponibles; el odómetro acumulado no se presenta como distancia recorrida durante el período. |
| Empresas | Filtros ignorados, usuarios `NaN`, tipos vacíos y “Al día” sin conocer la deuda. | Filtros reales, etiquetas y ausencia de datos explícita; se remite a Pagos para consultar deuda. |
| Empresas | “Eliminar” en realidad suspendía el servicio. | La acción se describe como retirar de operación, conservando historial. |
| Transferencias | Permitía elegir empresas de destino no activas, causando conflictos. | Selector restringido a destinos activos. Aun con destino activo, el servidor denegó la creación: queda pendiente. |
| GPS | Un equipo inactivo seguía ofreciendo instalación; instalado se describía como reportando. | Estado inactivo visible, instalación deshabilitada para inactivos y etiqueta que distingue asignación de señal. |
| Áreas | Las áreas archivadas seguían apareciendo como filtro operativo. | Se excluyen del listado operativo. Confirmado en la tabla de flota. |

## Verificación por pantalla

| Pantalla | Comprobado | Límite pendiente |
|---|---|---|
| Resumen | Carga, contadores y mapa | No se garantiza disponibilidad continua del proveedor de mapas. |
| Centro de control | Mapa cargado y marcadores con placa; lectura de flota | No se simuló movimiento físico del GPS. |
| Alertas | Lectura; aviso QA marcado leído y descartado | No se generó una infracción vial física. |
| Eventos y SOS | Regla creada, asignada, activada/desactivada | SOS real y atención de emergencia no ejecutados. |
| Vehículos | Crear, editar, consultar, asignar/revocar conductor, área y archivar | No se recorrieron todas las combinaciones de pestañas de expediente. |
| Exportación de flota | CSV descargado con tres filas, correspondiente a la flota activa | El evento de descarga del navegador automatizado venció; se verificó el archivo real en Descargas. |
| Jornadas | Pantalla y consulta vacía | Inicio/PIN/cierre requieren flujo del conductor; no probados. |
| Mantenimiento | Crear y recorrer todos los estados de la ODT QA | No hubo reparación física ni gasto. |
| Planes | Plan, cobertura, acción preventiva, desactivación | No se esperó a un vencimiento futuro del programador. |
| Inspecciones | Pantalla y estado vacío | Registro en app, respuestas, fotos y hallazgos reales pendientes de prueba. |
| Programa | Borrador, publicación, cita, cancelación y archivo | Cierre de cita mediante inspección móvil pendiente. |
| Documentos | Registrar, renovar vencimiento y archivar | Adjuntar archivos no está integrado en el panel. |
| Gente | Directorio, alta QA, edición, suspensión/reactivación, asignación | Falta ensayo autenticado independiente con supervisor de otra empresa. |
| Mi perfil | Lectura real; pruebas unitarias de edición y validación | No se modificó el perfil real del administrador. |
| Reportes | Carga, filtros y presentación de datos ausentes | Costos consolidados e índice seguro carecen de respaldo integrado suficiente. |
| Empresas | Crear, listar, filtrar, activar/suspender | Asociaciones compañía/contratista necesitan completar la integración, ver abajo. |
| Toda la plataforma | Lectura global y alta QA a través del adaptador de usuarios | Expedientes de usuarios ajenos al tenant no están certificados. |
| Transferencias | Formularios y lectura; errores reproducidos | Creación denegada aun con destino activo. No se pudo probar liberación/aceptación/cierre. |
| Pagos | Cuota creada y visible | Anulación/cambio de estado bloqueado por auditoría SQL; abonos no probados. |
| GPS | Registro, instalación, lectura, desmontaje QA e inactivación | La API de inventario no devuelve ID de instalación para desmontar normalmente desde UI. Verificación física y pánico pendientes. |
| Auditoría | Registros de operaciones QA visibles | No se editaron ni eliminaron eventos. |

### Ciclo de mantenimiento verificado

`abierta → en_revision → aprobada → asignada → en_ejecucion → pausada → en_ejecucion → en_calidad → cerrada`.

ODT: `6818d856-2eb4-4310-99e9-611be9119f66`. Acción vinculada: `a6050d3b-4bf7-4d76-b7df-937de8b46c20`, comprobada como `completed` tras cerrar la orden. Costo cero y resolución identificada como prueba sin reparación física.

## Bloqueos y trabajo todavía necesario

### 1. Pagos: cambio de estado rechazado por auditoría

Error reproducido: `new row for relation "audit_log" violates check constraint "audit_log_changes_shape_check"`.

En `fom-core`, commit `1156af3e9931ced71004fac5460640d5411f8b25`, el cambio de estado escribe `changes.before` y `changes.after` como cadenas. La restricción exige objetos cuando existen esas claves. **La creación sí funciona; lo que falló fue anular la cuota.**

Se entrega `backend-payment-audit.patch`, que cambia esos valores a `{ status: ... }`. Se comprobó que el parche aplica sobre el archivo de esa versión. No se compiló ni probó el backend corregido: falta aplicarlo, ejecutar sus pruebas y desplegarlo. No es necesario eliminar ni debilitar la restricción de auditoría.

El acceso SSH disponible no permite `sudo` sin contraseña. No se modificó el servicio protegido ni se alteró directamente la base de datos.

### 2. Transferencias

Los primeros intentos devolvieron conflictos porque el destino QA estaba en `onboarding`, no activo. Se activó el destino y se repitió con una unidad nueva, sin asignaciones, y con el usuario QA activo. Ambas creaciones devolvieron 403. No se crearon solicitudes, y no se alteró el dueño de unidades/personas reales.

Debe diagnosticarse la autorización del actor efectivo y las políticas de transferencia en el backend. No se ampliaron permisos ni se esquivaron controles para forzar la prueba. La revisión del código muestra controles de autorización también en base de datos; todavía no se aisló cuál denegó estas dos solicitudes.

### 3. GPS: contrato de desmontaje incompleto

El inventario informa vehículo y fecha de instalación, pero no el identificador de instalación requerido por la operación de desmontar. Para limpiar únicamente el equipo QA se recuperó ese ID de su evento autorizado de auditoría. Esto prueba el endpoint de desmontaje, pero **no constituye una solución de producto**. El backend debe exponer ese ID y la UI integrar el botón correspondiente.

### 4. Integraciones que no deben darse por terminadas

- Asociaciones compañía/contratista: la selección de compañías al crear un ente no está integrada; el adaptador existente de asociaciones tiene la dirección de argumentos contraria a la intención del formulario y no sincroniza relaciones removidas. No se modificaron relaciones reales. Requiere consulta de relaciones vigentes, sincronización y prueba con dos entes QA.
- Expedientes desde Toda la plataforma: el enlace no transporta el contexto de empresa y el detalle consulta el directorio del tenant actual. Revisar el contrato autorizado para consultar otra membresía antes de ofrecer el expediente global.
- Archivos de documentos: existe superficie de almacenamiento en backend, pero falta la integración completa de selección, subida y asociación en este panel.
- Reportes: falta integrar costos consolidados y una fuente válida para índice de manejo seguro. No se sustituyen por números de muestra.
- Flujos de campo: jornadas, inspección realizada, SOS, telemetría y pánico necesitan app/GPS y una prueba controlada específica.

## Registros QA y limpieza

Los identificadores completos están en `ejecucion.json`. Estado al cierre:

- Dos vehículos QA archivados; conductor desvinculado y cuenta QA suspendida.
- Plan desactivado y cobertura retirada; acción completada y ODT cerrada.
- Regla de alerta desactivada; documento archivado.
- Plantilla archivada y cita cancelada.
- GPS desmontado e inactivo; área archivada; empresa QA suspendida.
- **Excepción: cuota QA de USD 1 pendiente**, sin cobro, con concepto `PRUEBA QA SIN COBRO REAL`, en la empresa QA suspendida. ID `aa83f4f0-a357-45fd-919b-7049d4265a57`. Anularla después de aplicar y verificar el parche de auditoría. Se dejó visible y trazable, no se borró directamente.
- Se conserva el historial QA de mantenimiento y auditoría.

## Evidencias y reproducibilidad

- `ejecucion.json`: bitácora de 67 intentos, con 44 PASS y 23 FAIL históricos. **No son 23 fallos finales independientes**: incluye reintentos antes/después de correcciones, errores del arnés y bloqueos pendientes.
- Los 403 iniciales del arnés sin `Origin` fueron un error del arnés, corregido para cumplir CSRF; no se cuentan como defectos del producto.
- El intento de archivar área con `inactive` fue otro error del arnés. Se repitió con el estado contractual `archived` y pasó.
- `ops/qa-dashboard.mjs`: pruebas reales optativas con `FOM_QA_WRITE=1`; no ejecutar todas las fases a ciegas, algunas mutaciones ya se completaron. No se ejecuta con `npm test`.
- `npm test`: **27 pruebas aprobadas, cero fallidas** el 30/09/2026. Incluye contratos, roles, perfil, códigos, enlaces de mantenimiento y errores visibles.
- `npm run build`: **correcto**, 277 módulos transformados el 30/09/2026.
- CSV comprobado: `C:/Users/home/Downloads/flota-fom-2026-09-29.csv`, tres unidades.
- `plantilla-verificada.png`: captura del formulario integrado.

Para certificar todo el dashboard faltan cerrar los bloqueos anteriores, repetir las operaciones afectadas con el backend corregido, probar roles en sesiones separadas y ejecutar los flujos de campo. Una compilación exitosa no sustituye esas pruebas.
