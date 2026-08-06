# Arquitectura y flujos — Proyecto FOM

> Descripción en texto de los 5 tableros de arquitectura diseñados en Figma. Este documento es para que Claude Code (y el equipo) entiendan la estructura completa del proyecto sin necesidad de abrir Figma. Cada flujo se lee como: PASO → PASO, y las decisiones como {pregunta} con sus ramas.
>
> Léelo junto con BRIEF_PROYECTO.md (v5).

---

## TABLERO 1 — FOM · Arquitectura general

### Mapa maestro
Inicio de sesión → Validación de credenciales → Empresa / Sede / Rol → Dashboard según rol → (Resumen ejecutivo | Centro de control GPS | Operaciones | Mantenimiento) → todos desembocan en el **Expediente del vehículo** → que despliega: Telemetría, Mantenimiento y OT, Inspecciones, Costos, Documentos, Conductor, Historial.

### Relaciones entre productos
APP CONDUCTOR (inspección, reporte de falla, viaje, emergencia) → BACKEND FOM → CONSOLA WEB (operador valida, supervisor aprueba, crea orden de trabajo) → APP TÉCNICO (diagnóstico, reparación, evidencia) → vuelve a CONSOLA WEB → Control de calidad.

### Roles y permisos
- **Conductor (app):** su vehículo y telemetría; reportar falla (OT); inspección preoperacional; botón de emergencia.
- **Operador (web):** monitorear mapa en vivo; reconocer alertas.
- **Supervisor (web):** validar y aprobar OT; escalar alertas y aprobar acciones críticas.
- **Técnico (app):** ejecutar órdenes de trabajo; diagnóstico y evidencias.
- **Admin de Empresa:** panel de su empresa; usuarios, vehículos y reportes de su empresa.
- **Admin General:** varias empresas con selector; comparar y reportes multiempresa.
- **Super Admin (equipo, vía FOM-CONTROL):** crear empresas y paquetes; "entrar como"; todo el sistema.
Los roles heredan hacia abajo.

---

## TABLERO 2 — FOM-WEB · Consola

### Mapa general de la consola (17 módulos)
Login · Dashboard/Resumen ejecutivo · Centro de control · Flota (→ Expediente del vehículo) · Operaciones · Mantenimiento · Taller · Inspecciones · Conductores (→ Expediente del conductor) · Seguridad · Combustible · Neumáticos · Inventario · Compras · Costos · Documentos · Reportes · Administración.

### Módulo 1 — Resumen ejecutivo
Dashboards (general, por sede, por flota, comparación de períodos) e indicadores (operacionales, mantenimiento, seguridad, financieros, acciones pendientes). Los indicadores son NAVEGABLES: indicador → listado filtrado → seleccionar vehículo → Expediente del vehículo → crear o abrir orden de trabajo.

### Módulo 2 — Centro de control
Mapa en vivo, lista de vehículos, alertas, mensajes/notificaciones, geocercas, rutas, historial de recorridos, comandos remotos, dispositivos GPS, estado de comunicaciones.
- Mapa: buscar/filtrar → vehículo seleccionado → (ver expediente/historial/recorrido | enviar mensaje o comandos).
- Alertas: bandeja (nuevas/reconocidas/escaladas) → detalle → (reconocer/asignar/escalar) → crear OT o incidente.

### Módulo 3 — Flota y Expediente del vehículo
Listado de vehículos, tipos, marcas/modelos, componentes, asignaciones, importación masiva, baja de activos.
- Expediente del vehículo (pestañas): Resumen, Telemetría, Mantenimiento, Inspecciones, Costos, Documentos, Conductores, Viajes, Componentes, Alertas, Historial.

### Módulo 4 — Operaciones
Solicitudes de vehículos, reservaciones, planificación, despacho, viajes, rutas, paradas, clientes, contratos, evidencias de entrega, historial operacional.
- Estados del viaje: solicitado/aprobado/planificado → asignado/en inspección/listo → en progreso/pausado/en destino → completado o cancelado.

### Módulo 5 — Mantenimiento
Resumen, planes preventivos, próximos, vencidos, reportes de fallas, solicitudes de trabajo, órdenes de trabajo, calendario, lecturas de medidores, garantías, historial.
- Flujo preventivo: asignar vehículos y monitorear km/horas/fecha → próximo a vencer genera solicitud → crear OT → ejecutar/control de calidad/cerrar → calcular próximo servicio.

### Módulo 6 — Taller
Tablero kanban: Nueva → Aprobada → Asignada → En ejecución → Esperando repuestos → En prueba → Control de calidad → Cerrada. Además: asignación de técnicos, registro de tiempo, solicitud de repuestos, evidencias.

### Módulo 7 — Inspecciones
Plantillas (ítems por tipo de vehículo, criticidad de cada ítem), programación, resultados, historial.
- Resultado: ítem ok o con falla → evidencia → {falla crítica?} → No: aprobada con observaciones / Sí: vehículo bloqueado + genera OT.

### Módulo 8 — Conductores y Expediente del conductor
Listado, asignaciones a vehículos, licencias y vencimientos, capacitaciones, desempeño y score.
- Expediente del conductor: datos personales y foto, cédula y dirección, licencia y documentos, vehículos usados, métricas de manejo (km, horas, recargas, eventos por 100 km), viajes/historial, fallas u OT reportadas.

### Módulo 9 — Seguridad
Eventos de manejo, incidentes, score/índice seguro, rankings de conductores, acciones correctivas.
- Flujo de incidente: evento detectado → validación → clasificación → asignar responsable → recopilar evidencias → investigar → acción correctiva → cierre y registro.

### Módulo 10 — Combustible
Cargas, tanques/estaciones, tarjetas/vales, consumo por vehículo, rendimiento (km/litro), alertas de consumo anormal, reportes.
- Flujo de carga: registrar carga (litros y monto) → asociar a vehículo y conductor → validar contra odómetro → detectar posible fuga o robo.

### Módulo 11 — Neumáticos
Inventario, asignación por posición, rotaciones, desgaste y profundidad, presión, reencauche, costos, alertas de cambio.
- Desgaste: registrar medición → {desgaste crítico?} → Sí: genera OT de cambio / No: seguimiento normal.

### Módulo 12 — Inventario
Repuestos y partes, almacenes y ubicaciones, stock y mínimos, movimientos (entradas/salidas), punto de reorden, costos y valorización.
- Flujo de repuesto: técnico solicita → almacén revisa disponibilidad → {hay stock?} → Sí: entrega y descuenta stock / No: genera solicitud de compra → actualiza OT y costos.

### Módulo 13 — Compras
Solicitudes de compra, proveedores, cotizaciones, órdenes de compra, recepción de mercancía, facturas y pagos.
- Flujo: nace de un repuesto sin stock → solicitar cotizaciones → aprobar proveedor y costo → generar orden de compra → recibir e ingresar a inventario.

### Módulo 14 — Costos
TCO por vehículo, costo por km, centros de costo, presupuestos, comparativos por flota y sede, reportes.
- TCO desglosado en: combustible, mantenimiento, neumáticos, repuestos, mano de obra, depreciación.

### Módulo 15 — Documentos
Documentos del vehículo, del conductor y de la empresa; vencimientos y alertas; pólizas y seguros; repositorio y búsqueda.
- Vencimientos: monitorea fechas → {próximo a vencer?} → Sí: genera alerta y notifica / No: seguimiento normal.

### Módulo 16 — Reportes
Alcance (un vehículo, un grupo/flota, una sede, general de la empresa); tipos (operacionales, mantenimiento y OT, seguridad y manejo, costos y combustible); rango de tiempo; exportar y programar; comparar períodos o empresas.

### Módulo 17 — Administración
Usuarios, roles y permisos, empresas y sedes, flotas y grupos, paquetes y plan de servicio, configuración general, auditoría y bitácora, integraciones y GPS.
- Usuarios: crear usuario y asignar empresa → asignar rol y permisos → credenciales y cambio de clave.

---

## TABLERO 3 — FOM-DRIVER · App conductor

### Mapa de la app del conductor
Login y MFA → selección de cuenta (si aplica) → Inicio del conductor. Navegación inferior: Inicio, Viajes, Inspección, Alertas, Más (mensajes, documentos, perfil, sincronización offline). Desde inicio: identificación por chip → vehículo asignado → vista de conductor (telemetría y mapa) + índice de manejo seguro. También: inspección preoperacional, viaje/ruta, reportar falla (OT), botón de emergencia.

### Flujo móvil del conductor
Abre la app e inicia sesión → Inicio → {¿pasó el chip?} → No: ve el mapa con su nombre sin métricas / Sí: emparejado al vehículo → inspección preoperacional → {¿vehículo apto?} → No: bloqueado, avisa al supervisor / Sí: vista de conductor → inicia y ejecuta el viaje (puede reportar falla/activar emergencia/recibir mensajes) → cierra el viaje → sincroniza online u offline.

### Flujo de inspección preoperacional
Abre inspección → carga plantilla del tipo de vehículo → recorre checklist → marca cada ítem ok/con falla → {¿hay fallas?} → No: aprobada, inicia viaje / Sí: agrega evidencia → {¿falla crítica?} → No: aprobada con observaciones, inicia viaje / Sí: vehículo bloqueado → genera OT automática → notifica al supervisor → reasignar vehículo o esperar reparación.

### Flujo de viaje del conductor
Recibe viaje asignado → revisa origen/destino/ruta → inspección preoperacional → registra kilometraje inicial → inicia viaje → navegación y monitoreo en vivo → registra paradas → llega al destino → adjunta evidencia de entrega → registra kilometraje final → inspección postoperacional → cierra el viaje → sincroniza.

### Flujo de emergencia
Presiona botón de emergencia → confirmación rápida (evita falsa alarma) → se activa la alerta → envía ubicación en vivo y datos del vehículo → notifica al centro de control → el operador lo contacta → elige tipo (mecánica/salud/seguridad) → recibe instrucciones y seguimiento → se resuelve o llega asistencia → cierra el caso.

---

## TABLERO 4 — FOM-TECH · App técnico (mantenimiento)

### Mapa de la app del técnico
Login → Inicio del técnico → órdenes asignadas, agenda del día, sincronización offline, perfil. Detalle de la orden: datos del vehículo y falla → iniciar trabajo → (diagnóstico, checklist de reparación, registro de tiempo, solicitud de repuestos, escáner QR de partes, evidencias/fotos, prueba funcional) → firma → enviar a control de calidad.

### Flujo de trabajo del técnico
Recibe orden asignada → abre el detalle → revisa vehículo y falla → inicia el trabajo → diagnóstico → ejecuta checklist de reparación → {¿necesita repuestos?} → Sí: solicita a inventario → {¿hay stock?} → No: espera compra/repuesto y vuelve al checklist / Sí: recibe y registra repuesto, vuelve al checklist → No: registra tiempo y evidencias → prueba funcional → {¿quedó bien?} → No: vuelve a iniciar trabajo / Sí: firma del técnico → envía a control de calidad → {¿aprueba QC?} → No: vuelve a trabajo / Sí: libera el vehículo y cierra la orden.

---

## TABLERO 5 — FOM-CONTROL · Consola interna (proveedor)

### Mapa de la consola interna
Tenants y cuentas cliente, planes y paquetes, licencias y suscripciones, facturación y consumo, soporte y tickets, monitoreo de la plataforma, usuarios internos FOM, configuración global y catálogos, auditoría y trazabilidad.
- Tenants: alta de cliente, estado (activo/suspendido), "entrar como" soporte.
- Planes: definir módulos y límites. Licencias: vencimientos y renovaciones.

### Flujo de alta de cliente
Nuevo cliente contrata un plan → se crea el tenant/cuenta cliente → {¿persona natural o jurídica?} → Natural: estructura personal automática / Jurídica: configura organización, sedes y flotas → asignar plan, módulos y límites → crear admin del cliente y credenciales → generar licencia y suscripción → activar el servicio → el cliente ya puede entrar y cargar sus vehículos.

### Flujo de soporte y "entrar como"
Cliente reporta un problema → se crea un ticket → se clasifica por prioridad → agente interno FOM lo revisa → {¿necesita ver la cuenta del cliente?} → No: responde y resuelve / Sí: "entrar como" en modo soporte → accede en solo lectura o con permiso → queda registrado en auditoría (usuario, fecha, motivo) → diagnostica → aplica solución o escala → responde/resuelve → cierra el ticket con registro.

---

## Pendiente
- **Instalador** (app de onboarding: instalar y migrar GPS/vehículo al sistema): su documento y su tablero aún no existen.
