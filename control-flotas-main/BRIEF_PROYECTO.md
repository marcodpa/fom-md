# Brief — Proyecto FOM

> Documento vivo y fuente de verdad del proyecto. Cualquiera que entre (Claude Code, Marco, Juan Pacheco) debe leer esto PRIMERO.
>
> **Versión 5.** Reconcilia el brief con los tres documentos maestros del proyecto (Contexto maestro FOM, Arquitectura de información FOM-02-UX-IA-001, e Infraestructura FOM-02-ARQ-001). Cambios clave: (1) el proyecto se llama **Proyecto FOM** — no se usa ningún nombre comercial todavía; (2) hay **cuatro productos documentados** (FOM-WEB, FOM-DRIVER, FOM-TECH, FOM-CONTROL) más un **instalador** por definir; (3) el sistema es **multi-tenant** (raíz = Cuenta/Tenant); (4) FOM es una plataforma SaaS integral, no solo GPS. Esta versión reemplaza el nombre provisional "Control de Flotas" usado antes.

---

## 0. Cómo usar este brief (para Claude Code)

La VISIÓN completa del proyecto es grande (plataforma SaaS, 4 productos, 17 módulos). **No se construye todo de una.** Lo que se construye AHORA está en las secciones "Estado actual" y "Qué sigue". Si algo no está ahí, es visión/futuro: NO lo construyas sin confirmar. Ante cualquier duda de alcance, pregunta.

## 1. Qué es

**FOM = Fleet Operations & Maintenance.** Plataforma SaaS integral para gestión de flotas y activos móviles: GPS/telemática, operaciones y despacho, mantenimiento, taller, seguridad vial, conductores, combustible, neumáticos, inventario, compras, costos, documentos y reportes. NO es un simple sistema GPS ni una app aislada de mantenimiento: es una plataforma que conecta toda la información alrededor de un **expediente digital único del vehículo**.

## 2. Regla de nombre (obligatoria)

El nombre comercial está **pendiente** y se define al final. Hasta entonces NO se usa ningún nombre provisional (ni "Control de Flotas") en documentos, diseños, código, BD ni repos. Usar solo: "Proyecto FOM", "la plataforma", "el sistema", "la aplicación".

## 3. Mercado

Cliente inicial y mercado de entrada: industria **petrolera, energética y de operaciones de campo** (primer cliente: Samfor; admin general de ejemplo: Chevron). Pero la plataforma NO debe limitarse a ese sector: debe servir a transporte, logística, construcción, minería, servicios públicos, agricultura, maquinaria pesada, flotas corporativas, etc. Identidad industrial/empresarial pero **neutral** para adaptarse a varios sectores.

## 4. Principio central: expediente digital único

El vehículo es el centro. Cada vehículo/activo tiene un expediente centralizado (info técnica, fotos, documentos, ubicación, recorridos, km, horas de motor, conductores, viajes, inspecciones, fallas, mantenimientos, OT, repuestos, mano de obra, costos, garantías, telemetría, estado). La información fluye en cadena:

Vehículo → Conductor → Viaje → Ubicación y telemetría → Inspección → Falla → Orden de trabajo → Repuestos y mano de obra → Costo → Disponibilidad → Decisión de reparar o reemplazar.

## 5. Modelo multi-tenant

La raíz del sistema es una **Cuenta / Tenant**, que puede ser:
- **Persona natural** → flota personal → vehículo (experiencia simplificada: NO elige empresa/sede/flota; el sistema le crea una estructura personal por defecto).
- **Persona jurídica** → Organización → Sedes → Flotas → Vehículos/Activos.

Login: validar credenciales → MFA cuando aplique → elegir cuenta si el usuario tiene varias → elegir sede/flota solo si la estructura lo requiere → dashboard según rol, permisos y módulos contratados.

La plataforma es multiempresa, multisede, multiflotas, multitaller, multialmacén, multimoneda y multizona horaria.

## 6. Los productos

**Documentados (4):**
1. **FOM-WEB** — consola web: control GPS, operaciones, mantenimiento, taller, inventario, costos y administración. Usuarios: gerentes, operadores, supervisores, administrativos.
2. **FOM-DRIVER** — app móvil del conductor: inspecciones, viajes, fallas, emergencia, mensajes y modo offline. Usuarios: conductores. *(Es la app que ya tenemos construida como base.)*
3. **FOM-TECH** — app móvil del técnico de mantenimiento: órdenes, diagnóstico, checklist, repuestos, evidencias y firma. Usuarios: técnicos de taller.
4. **FOM-CONTROL** — consola interna del proveedor (nosotros): tenants, planes, licencias, soporte, consumo y operación SaaS. Usuarios: administradores internos FOM.

**Por definir (sin documento aún):**
5. **Instalador** — app aparte para el onboarding: instalar y migrar el GPS/vehículo al sistema. Es un producto distinto de FOM-TECH (que es mantenimiento). Se le hará su documento y su tablero cuando se defina.

## 7. Arquitectura técnica (componentes internos)

Inicio con **monolito modular** para el núcleo transaccional (FOM-API, contratos REST) + servicios desacoplados:
- **FOM-WORKER** (tareas asíncronas/colas), **FOM-SCHEDULER** (mantenimientos, alertas, vencimientos), **FOM-REALTIME** (WebSocket para mapas/alertas/estados), **FOM-MOBILE-SYNC** (sincronización offline de DRIVER y TECH), **FOM-GPS-GATEWAY** (recepción TCP/UDP/MQTT/HTTP/webhooks), **FOM-GPS-PROCESSOR** (decodificación y evaluación de eventos).
- **Independencia del fabricante GPS:** debe integrar Teltonika, Queclink, Ruptela, Traccar, Wialon, Navixy, APIs, webhooks, etc. (capa 0 de Juan Pacheco).
- Aislamiento multi-tenant en app, BD, caché, mensajería y archivos. Ambientes separados: DEV, TEST, QA, UAT, DEMO, STAGE, PILOT, PROD. Microservicios solo cuando haya necesidad técnica comprobada.

## 8. Roles

Perfiles de uso: gerentes, supervisores, operadores, conductores, técnicos, almacenistas, administrativos. Sobre la jerarquía de acceso que ya usamos: Conductor → Operador → Supervisor → Admin de Empresa → Admin General → Super Admin (este último opera vía FOM-CONTROL). La interfaz se adapta al nivel técnico del usuario. **Operación por excepciones:** el sistema resalta lo que requiere atención (falla crítica, mantenimiento vencido, exceso de velocidad, uso no autorizado, desvío de ruta, pérdida de comunicación, documento vencido, emergencia, etc.); el usuario no revisa todo a mano.

## 9. Módulos de la consola web (17)

Resumen ejecutivo · Centro de control (GPS) · Flota + Expediente del vehículo · Operaciones y despacho · Mantenimiento (preventivo/correctivo/predictivo) · Taller · Inspecciones · Conductores + Expediente del conductor · Seguridad · Combustible · Neumáticos · Inventario · Compras · Costos (TCO) · Documentos · Reportes · Administración. Todos diagramados en Figma (ver sección 15).

## 10. Los dos planos de métricas

- **Plano del vehículo (GPS/telemática):** posición, encendido, velocidad, recorridos, geocercas, tiempo detenido/ralentí, km, horas de motor, combustible, temperatura, OBD-II/CAN/J1939, códigos de falla, inmovilización segura, botón de emergencia, identificación del conductor.
- **Plano del conductor (desempeño):** exceso de velocidad, frenadas bruscas, aceleraciones bruscas, giros agresivos → **índice de manejo seguro** (100 = perfecto, más alto es mejor) con semáforo verde/amarillo/rojo y rankings.

Reportes y estadísticas de vehículos = solo del vehículo (un vehículo puede tener varios conductores). Métricas por conductor = en su propio expediente.

## 11. Flujo de mantenimiento correctivo / OT

Reporte → Revisión → Aprobación → Diagnóstico → Planificación → Reparación → Prueba → Control de calidad → Liberación → Cierre. Estados de OT en la app/consola: Enviada → Revisada → En proceso → Realizada (solo cuentan como "abiertas" las no realizadas). Origen de una falla: conductor, supervisor, GPS, taller, inspección, código OBD/CAN, sensor, accidente, mantenimiento anterior, análisis predictivo. Toda OT tiene autor (un vehículo sin conductor no genera OT). El conductor lo ve como "Reportar una falla"; el admin/técnico lo ve como "Órdenes de trabajo".

## 12. Principios rectores

Operación por excepciones · independencia del fabricante GPS · trazabilidad total (toda acción registra usuario, fecha, hora, valor anterior/nuevo, IP, motivo, evidencia) · multiempresa/multisede · uso sencillo adaptado al rol.

## 13. Posicionamiento de seguridad

Para el mercado de entrada (petrolero/energético), el gancho es **cuidar a la gente: que todos lleguen a casa a salvo**, no vigilancia. En la app, el score/semáforo se enmarca como manejo seguro con copy de cuidado; la inspección crítica que bloquea un vehículo inseguro y el botón de emergencia lo refuerzan. El mensaje se mantiene aunque el producto sea neutral y multisector.

## 14. Estado actual (qué ya está construido)

Prototipo funcional en React Native / Expo + TypeScript (SDK 54), con datos mock y una capa de servicios lista para conectar la BD real. Es la **base de FOM-DRIVER** más varios paneles que corresponden a FOM-WEB:
- Login (con mostrar/ocultar contraseña), tema por empresa (claro/oscuro).
- Inicio + emparejamiento por chip (con/sin vehículo).
- Vista de conductor: mapa en vivo, telemetría, índice de manejo seguro con copy de cuidado, ficha del vehículo.
- Reportar falla (OT) con evidencia.
- Menú de empresas (admin general) con volver.
- Panel de empresa: resumen, mapa de flota, selector Vehículos/Usuarios, tarjeta de OT.
- Lista de vehículos y de usuarios; perfil de usuario con datos y métricas.
- Generadores de reporte (empresa y multiempresa, con Vehículos/Usuarios, chips de empresa por color, rango de tiempo) y comparador.
- Pasada de pulido visual aplicada (ver DISENO_DIRECCION.md).

**Pendiente inmediato en código:** terminar el **detalle de la OT + cambio de estado** (Enviada→Revisada→En proceso→Realizada con evidencia) y la **pantalla de resultado del reporte** (listar cada vehículo/usuario según alcance y período).

## 15. Arquitectura diagramada en Figma

Tableros por producto (para no mezclar):
- **FOM · Arquitectura general** ✅ (mapa maestro, relaciones entre productos, roles).
- **FOM-WEB · Consola** ✅ (mapa general + los 17 módulos detallados, cada uno en su sección).
- **FOM-DRIVER · App conductor** ⬜ (pendiente).
- **FOM-TECH · App técnico** ⬜ (pendiente).
- **FOM-CONTROL · Consola interna** ⬜ (pendiente).
- **Instalador** ⬜ (pendiente, sin documento aún).

No pasar a alta fidelidad hasta que el equipo apruebe la arquitectura.

## 16. Qué sigue

1. Terminar en código el detalle de OT + resultado del reporte (prototipo).
2. Completar en Figma los tableros pendientes (FOM-DRIVER, FOM-TECH, FOM-CONTROL, Instalador).
3. Aprobar la arquitectura con el equipo antes de alta fidelidad.

## 17. Reglas de construcción

- App en Expo (React Native) + TypeScript (SDK 54 estable). Web futura en React. Backend/tiempo real por definir con la arquitectura (monolito modular + servicios).
- Datos mock detrás de una capa de servicios, lista para enchufar la BD/API real en un solo lugar.
- Todo el color sale del tema por empresa; colores semánticos (verde/amarillo/rojo) solo para estado y seguridad.
- Trabajar por bloques/pantallas: terminar, mostrar, confirmar, seguir. No rehacer lo que ya funciona.
- Código limpio, comentado, responsive. Respetar el tono de "cuidar a la gente".

## 18. Decisiones y pendientes

- Nombre comercial (pendiente; no usar provisional).
- El instalador necesita su documento y definición.
- Google Maps vs Apple Maps (implica API key y development build).
- Cuándo se separa FOM-WEB como producto web propio (hoy son paneles dentro de la app).
- Creación de usuarios/credenciales y cambio de clave.
- Compra/activación de paquetes (pasarela de pago; se gestiona vía FOM-CONTROL).
- Contrato de datos con Juan Pacheco: tecnología de BD, tiempo real (WebSocket), frecuencia y campos de cada reporte de posición, y protocolos de GPS soportados.
