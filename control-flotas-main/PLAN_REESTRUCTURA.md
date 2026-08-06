# PLAN_REESTRUCTURA — Fase A: comprensión y contraste

> **Fuente de verdad ABSOLUTA:** `FOM-02-FUN-002-V0.2.md` (Flujos de Trabajo por Rol), hasta nueva orden del usuario. Cualquier contradicción con briefs o versiones anteriores se resuelve a favor de FOM-02 **sin consultar los documentos viejos**; vendrán más versiones que irán afinando detalles.
> **Estado (2026-07-09): FASE C EJECUTADA COMPLETA.** El usuario aprobó la tabla de decisiones y el plan v2 (2026-07-08 tarde), autorizó Bloques 1+1.1 explícitamente y luego ordenó continuar hasta completar todo el documento ("hay que completar todo lo que dice el archivo"). Los 11 bloques (1, 1.1, 2–11) están implementados con tsc/ESLint en 0 por bloque, sin eliminar nada (Fase B sigue congelada). Pendientes que dependen de insumos externos: formato real Chevron (D2/D3 → sub-bloque 3b), "información extra" de Lino (D1, placeholder), catálogo GPS real del Sr. Pacheco (D4/D9), backend/push (D7).
> **Regla de proceso reforzada:** ningún bloque se ejecuta sin aprobación EXPLÍCITA del usuario a ese bloque concreto. Aprobar el plan ≠ aprobar ejecutar.
> **Reglas vigentes:** nada se elimina sin lista aprobada · "no mencionado" ≠ "borrar" (confirmado: lo no mencionado NO se elimina por ahora) · bloques con `tsc`/ESLint en 0 · se respeta `DIRECCION_VISUAL_v2.md` y el tema por empresa · RN + Expo nativo · primero crear/migrar, eliminar al final.

---

## Veredictos recibidos (usuario, 2026-07-08)

1. **FOM-02 es verdad absoluta.** Los documentos anteriores (`FLUJOS_ARQUITECTURA_FOM.md`, brief v5, `PLAN_ADAPTACION_FOM.md`) **no se toman en cuenta** donde contradigan. C11 y P15: resueltos.
2. **Nada de lo no mencionado se elimina por ahora** (SOS/emergencia, viajes, mensajería, score, telemetría rica, costos, comparar, MFA…). Cuando toque, el usuario lo dirá y se hará sin afectar nada más. P1, P4, P5, P7, P8, P9, P10: resueltos → **todo se queda**. La lista de "candidatas" queda congelada como inventario informativo.
3. **Formato Chevron (D2/D3):** el usuario va a compartir el formato real usado este año (Samfor → Chevron, estadísticas de usuarios y vehículos) + "Cuestionario de mantenimiento de flota" + presentación de mantenimiento de flota vehicular. **Pendiente de recibir.** La esencia confirmada: la vista de Chevron es la de un administrador general de varias empresas que **exporta los registros de cada empresa en el formato que le pidan**, mejorando muchísimo los formatos actuales. Los reportes son una de las partes MÁS importantes del proyecto.
4. **Instalador (D10):** será una **aplicación aparte, nuestra**, para controlar el sistema en los GPS/vehículos, migrar vehículos/flotas y asignar empresas, personas y roles. No llega todavía; se construirá sobre la base de esta app. Solo contexto — no se diseña ahora.
5. **Todo lo específico del GPS** (ciclo de vida D9, KPIs D6, capacidades/catálogo D4, pruebas) lo maneja el **Sr. Pacheco**; se irá añadiendo cuando haya un GPS listo para pruebas. En el mock se simula con la forma async de siempre (`TODO API`).
6. **PDVSA (D11):** sí se crea en el mock como **"PDVSA Petroboscan"** — y OJO al matiz: es **una empresa más ASIGNADA a Chevron** (como Samfor), no una segunda predefinida. Chevron, como administrador general, necesita ver sus reportes igual que los de las demás asignadas.

---

## (a) Mi lectura del documento

### Los 6 roles

| # | Rol (documento) | Persona ejemplo | Qué hace | Qué NO hace |
|---|---|---|---|---|
| 1 | **Admin** | Marco, Juan | Ve TODO el sistema. Crea/edita empresas y supervisores. Crea vehículos (el GPS se instala dentro del alta, obligatorio). Asigna empresas → predefinidas. Única persona que ve la **auditoría**. | — |
| 2 | **Supervisor de empresa predefinida** | Lino (Chevron) | Solo lectura y solo gerencial: elige cuenta predefinida (si supervisa varias, ej. Chevron y PDVSA) → ve la lista de empresas asignadas a esa predefinida (ej. Samfor) → de cada una ve: **reporte gerencial**, **todos los reportes en el formato que la predefinida exige**, **histórico de ODT**, e "información extra" (alcance pendiente). | NO ve métricas operativas, ni vehículos/estado, ni kilometraje/disponibilidad, ni alertas de velocidad. NO crea, edita ni elimina nada. |
| 3 | **Supervisor de empresa** | Yeison (Samfor) | El operativo de SU empresa: llena su perfil obligatorio al entrar (cédula, licencia, carta médica); crea **áreas** (por ubicación, sector o contrato); crea usuarios (conductores); asigna vehículo→área, **conductor principal**→vehículo y **conductores secundarios** (con PIN); configura **alertas** (velocidad, mantenimiento) asignables a uno o varios vehículos (o por área); gestiona ODT (abre → en_revision → completa con costo+factura → cierra); genera reportes normales **y en formato de la predefinida**. Su dashboard: mapa (todos sus vehículos + SU propia ubicación), ODT pendientes, alertas nuevas, KPIs. | No crea vehículos (eso es del Admin). |
| 4 | **Conductor de empresa** | Pedro, Luis (Samfor) | App móvil offline-first. Primer uso: perfil obligatorio. **Inspección diaria** antes de arrancar (checklist ✅ Conforme / ⚠️ Observación / ❌ Falla → ¿crear ODT?), guarda con o sin señal. Durante el día: mapa de SU vehículo + su propia ubicación + métricas del GPS. Si pasa algo: **ODT correctiva** (vehículo automático, descripción + fotos) y ve el estado de SUS ODT. Emergencia = **botón de pánico FÍSICO del GPS** (no de la app). Un **secundario** (Luis) mete su PIN en el GPS del vehículo → el sistema lo reconoce como conductor actual temporal; su app muestra ese vehículo; todo lo que haga (eventos, ODT) queda a SU nombre; al dejarlo, todo vuelve al principal. | — |
| 5 | **Supervisor personal** | Ale Sampieri | Cuenta personal. El Admin ya le creó cuenta y vehículos. Ella: llena su perfil, crea sus usuarios (Santi, Sofi), asigna cada carro a su principal, crea alertas de mantenimiento multi-carro. Día a día: ve TODOS sus carros con toda su info (mapa con su propia ubicación, km, velocidad, alertas, documentos por vencer de carros y personas) y recibe notificaciones de alertas cumplidas. | No crea vehículos. |
| 6 | **Usuario personal** | Santi, Sofi | Lo mínimo: perfil al primer uso → ve mapa (su vehículo + su propia ubicación) y alertas (mantenimiento + documentos por vencer suyos y del carro). | **No crea ni edita nada** (ni inspección ni ODT — el documento no se las da). |

### Los 3 tipos de cuenta (de empresa)

| Tipo | Ejemplo | Qué es |
|---|---|---|
| **Estándar** | Samfor | Empresa operativa normal: flota, áreas, conductores, ODT, alertas, reportes. |
| **Predefinida** | Chevron | No opera flota propia en el sistema: es la contratante/fiscalizadora. Se le **asignan** empresas estándar (Samfor → Chevron) y su supervisor (Lino) ve solo la capa gerencial de esas empresas, en el formato de reporte que la predefinida exige. |
| **Personal** | Ale Sampieri | Flota doméstica: pocos carros, usuarios de familia. Sin áreas, sin ODT de taller, sin reportes corporativos: mapa + alertas + documentos. |

La asignación estándar→predefinida se hace al crear la empresa (opcional) y la administra el Admin.

### Los 8 cambios de la §8

1. **Alta de vehículo:** campo "asignar empresa" + campo **ALIAS** (nombre interno que cada empresa le da a su unidad: "Unidad 07").
2. **Documentos del vehículo:** se agrega **póliza de seguro** (junto a trimestres, RCV y carné de circulación).
3. **El GPS se instala DENTRO del alta del vehículo** — regla dura: no existe vehículo sin GPS instalado y verificado.
4. **Orden del instalador:** 1° modelo del equipo, 2° IMEI (único), 3° línea telefónica asociada. Luego asociar al vehículo (hereda su empresa) y verificar que reporta posición (+ prueba opcional del botón de pánico físico).
5. **Lino recortado:** solo reporte gerencial + reportes + histórico ODT. Sin métricas operativas de ningún tipo.
6. **Conductor principal + secundarios por PIN del GPS:** el conductor actual de un vehículo cambia dinámicamente; los eventos y las ODT del lapso se asocian a quien lo usaba. Si el GPS no soporta PIN → solo principal.
7. **Alertas asignables** a un vehículo, a varios, o por área (selección práctica).
8. **El mapa siempre muestra TU ubicación además de la del vehículo/vehículos** — en todos los roles con mapa.

### Reglas transversales que leo entre líneas

- **ODT** (nuevo nombre de las OT) con 3 estados: `abierta → en_revision → cerrada`. Dos orígenes: **correctiva** (conductor reporta) y **preventiva automática** (alerta de mantenimiento cumplida → ODT sola + notificación; al cerrarla, el contador se reinicia).
- **Perfil obligatorio al primer ingreso** para todo humano: cédula, licencia, carta médica.
- **Offline-first** explícito para el conductor (guardar local → sincronizar).
- **Auditoría** del alta de vehículo (quién, qué GPS, cuándo) — visible solo para Admin.
- **Notificaciones** dirigidas (nueva ODT → Yeison; alerta cumplida → Yeison/Ale).

---

## (b) Mapa de contraste (documento ↔ repo real)

Leyenda: ✅ ya existe y sirve · 🔧 existe pero hay que modificar · 🆕 no existe, hay que crear · ⚠️ existe hoy y el documento no lo contempla (candidato/pregunta — **no se toca**).

### Identidad, roles y sesión

| Pieza | Estado | Detalle |
|---|---|---|
| `Role` = driver/companyAdmin/generalAdmin/superAdmin ([types](src/types/index.ts#L14)) | 🔧 | Escalera acumulativa de 4 niveles vs. 6 roles no jerárquicos del documento. Ver choque C1. |
| Bandera `User.drives` | 🔧 | Sobrevive conceptualmente (Yeison podría conducir), pero su semántica cambia: Santi "usa" un carro y sin embargo NO tiene inspección/ODT. Ver C1. |
| `esAdmin` / `puedeConducir` / `esMultiempresa` ([permissions.ts](src/auth/permissions.ts)) | 🔧 | Los guards de hoy no distinguen "multiempresa gerencial de solo lectura" (Lino) de "multiempresa operativa" (Admin). Ver C1. |
| `useLoginDestino` ([useLoginDestino.ts](src/session/useLoginDestino.ts)) | 🔧 | Hoy resuelve 3 destinos (`/`, `/empresas`, `/panel`) + MFA + sedes. El documento pide al menos 6 aterrizajes (Admin, Lino con selector de predefinida, Yeison, conductor, Ale, Santi). Ver C3. |
| `TenantTipo` natural/juridica + `Cuenta` | 🔧 | personal≈natural y estándar≈juridica mapean; **predefinida no existe** ni la relación de asignación. Ver C2. |
| `TenantProvider` | 🔧 | Resuelve una sola cuenta o "ninguna" (multiempresa). No contempla "Lino elige entre SUS predefinidas y luego una empresa asignada". Ver C2/C3. |
| `AdminProvider` (empresa activa del panel) | 🔧 | La idea de "empresa activa" sirve; hay que sumarle el contexto de predefinida activa (Lino) sin romper lo actual. |
| MFA (`mfa.tsx`, `verificarMfa`) | ⚠️ | El documento no menciona MFA. Presumo omisión (es seguridad, no flujo) — pregunta P1. |
| Sedes (`Sede`, `sedes.tsx`, selección al login) | ⚠️ | El documento no menciona sedes; sí menciona **áreas** "por ubicación (Base Maturín)", que huelen a lo mismo. ¿Las sedes se absorben en áreas, conviven, o se quedan? Pregunta P2. |
| Usuarios mock hardcodeados (`authService.ts`) | 🔧 | Hay que poblar el mock con el elenco del documento (Marco/Juan admin, Lino, Yeison, Pedro/Luis/Carlos, Ale, Santi/Sofi) y sus roles nuevos. |
| Invitación de usuarios ("invitación → entra y llena su perfil") | 🆕 | No existe ningún flujo de invitación/alta de usuarios desde la app. |
| Perfil obligatorio al primer ingreso (cédula, licencia, **carta médica**) | 🆕 | `DriverProfile` tiene cédula y licencia; **falta carta médica** y falta el gate de "no pasas hasta llenar tu perfil". Aplica a TODOS los roles humanos, no solo conductores. |

### Empresas y estructura

| Pieza | Estado | Detalle |
|---|---|---|
| `Company` = {id, name} ([types](src/types/index.ts#L50)) | 🔧 | Faltan: RIF, datos de contacto, `tipo` (estándar/predefinida/personal), asignación a predefinida. |
| Crear/editar empresas desde la app (flujo Admin §1.1) | 🆕 | Hoy las empresas son mock estático (`MOCK_COMPANIES`); no hay CRUD ni pantalla de alta. |
| Asignación Samfor→Chevron | 🆕 | No existe la relación ni dónde administrarla. |
| `FleetGroup` (grupos de flota) | 🔧 | Concepto hermano de las **áreas** del documento (ubicación/sector/contrato), pero las áreas las crea el supervisor y sirven para asignar vehículos Y alertas. ¿Se renombra/extiende FleetGroup a Área o conviven? Pregunta P2. |
| Crear áreas (flujo Yeison §3.1) | 🆕 | No hay CRUD de grupos/áreas. |
| Marca por empresa (`brandService`, tema) | ✅ | Chevron ya existe como marca. El sistema de tema por empresa se extiende tal cual a los contextos nuevos (Lino ve marca de la predefinida, etc.). |

### Vehículos y GPS

| Pieza | Estado | Detalle |
|---|---|---|
| `Vehicle` (placa, marca, modelo, año, tipo, companyId) | 🔧 | Base sana. Falta: **alias** (¿evolución de `numero` "U-014"? ver P3), referencia a su GPS, estado de ciclo de vida ("activo y reportando"), auditoría de creación. |
| Entidad **GPS** (modelo, IMEI único, línea, asociación, verificación, soporte de PIN, botón de pánico físico) | 🆕 | No existe el concepto en ningún tipo/servicio. Ver C4. |
| Alta de vehículo (wizard 4 pasos con GPS obligatorio) | 🆕 | No hay creación de vehículos en la app; son mock. |
| Documentos del vehículo | 🔧 | El tipo `Documento` es genérico (sirve ✅); los datos mock dicen SOAT/tecnomecánica (Colombia) y el documento pide **trimestres, RCV, carné de circulación, póliza de seguro** (Venezuela). Cambio de datos + textos de ayuda de la inspección. |
| Telemetría rica (`VehicleTelemetry`: caja, combustible, aceite, temp, personas a bordo) | ⚠️ | El documento solo pide "kilometraje, velocidad, estado" + "métricas del GPS". No dice que sobre lo demás — pregunta P4. |

### Conductores y emparejamiento

| Pieza | Estado | Detalle |
|---|---|---|
| Gate por chip (`DrivingProvider`, `Emparejamiento`, `AvisoSinChip`, `RequiereChip`) | 🔧 | Hoy el conductor "no es nadie" hasta pasar el chip. El documento invierte el modelo: el **principal** tiene su vehículo asignado siempre; el **secundario** se activa por PIN. Ver C5. |
| Conductor principal por vehículo | 🆕 | No existe la titularidad; `FleetVehicle.conductorActual` es dinámico por chip (base útil). |
| Conductores secundarios + PIN | 🆕 | No existe: ni lista de autorizados, ni PIN, ni ventanas de uso temporal, ni atribución de eventos por lapso. Ver C5. |
| `WorkOrder.driverId` (quién reportó) | ✅/🔧 | Ya registra al creador real. Falta poder mostrar "la creó un secundario (identificado por PIN)" — ver C5/C6. |
| `DriverScore` / índice de manejo seguro (ScoreRing del inicio) | ⚠️ | El documento no menciona el score del conductor. Pregunta P5. |

### ODT / mantenimiento

| Pieza | Estado | Detalle |
|---|---|---|
| `WorkOrder` + `WorkOrderStatus` 4 estados + `OTStatusBadge` + `orden.tsx` | 🔧 | El documento usa **ODT** con 3 estados (`abierta → en_revision → cerrada`) y cierre con "qué se hizo, costo + factura/foto, fecha de resolución". Hoy hay `notaSolucion` y `costo` ✅ pero faltan factura/foto de resolución y `resueltaEn`, y el mapa de estados difiere. Opciones en C6 — **no decidido**. |
| ODT preventiva automática (alerta cumplida → ODT sola) | 🆕 | Hoy `PlanPreventivo`/`AlertaPredictiva` son lecturas mock; nada genera ODT. Falta además `tipo: correctiva/preventiva` en la orden. |
| OT automática por falla crítica de inspección | ✅/⚠️ | Existe y funciona; el documento dice "❌ Falla → **¿crear ODT?**" (pregunta, opcional) y no menciona ítems críticos que bloqueen la salida. Ver C10 y P6. |
| Reinicio del contador al cerrar ODT preventiva | 🆕 | No existe. |
| `reportar.tsx` (ODT correctiva del conductor: vehículo automático, fotos, offline) | ✅ | Encaja casi 1:1 con §4.2. Solo se le suma la lógica de secundario activo. |
| El conductor ve el estado de SUS ODT | ✅ | Existe en `mas`/inspección/orden (se re-etiqueta según C6). |

### Alertas

| Pieza | Estado | Detalle |
|---|---|---|
| `Alerta` (notificación al conductor, tab Alertas) | ✅/🔧 | Lo que hoy existe es la **notificación** recibida. Sirve, pero es la mitad del cuento. |
| **Reglas de alerta** configurables (exceso de velocidad con límite, mantenimiento cada X km) asignables a 1/N vehículos o por área | 🆕 | No existe nada: ni tipo, ni servicio, ni pantalla de creación/asignación. Respuesta directa a tu pregunta: **no hay nada así hoy**; lo más cercano es `PlanPreventivo` (lectura mock, no configurable). |
| Notificaciones dirigidas (nueva ODT → supervisor; alerta cumplida) | 🆕 | No hay sistema de notificaciones del panel; las alertas de hoy son solo del conductor. |

### Mapa

| Pieza | Estado | Detalle |
|---|---|---|
| `MapaVehiculo` modo single (conductor) | 🔧 | Matiz sobre lo que detectaste: **sí pide permiso** de ubicación, pero usa el teléfono COMO el vehículo (un solo punto, `showsUserLocation` de fondo). No hay dos marcadores diferenciados "yo" vs. "mi vehículo". Ver C8. |
| `MapaVehiculo` modo multi (panel) | 🔧 | Aquí sí: **no pide permiso** y `showsUserLocation={false}` — el supervisor nunca ve su propia ubicación. Ver C8. |
| Resumen al tocar un vehículo (conductor actual, km, velocidad, estado) | ✅/🔧 | Existe en `panel/index`; hay que sumar "principal o secundario" al conductor actual. |

### Reportes

| Pieza | Estado | Detalle |
|---|---|---|
| `FleetReport` + `reporte.tsx` (alcances general/flota/grupo/vehículo) | ✅ | Base sólida para "reportes normales de su empresa". |
| Reporte **en formato de la predefinida** ("formato Chevron") | 🆕 | No existe el concepto de formato por predefinida. |
| **Reporte gerencial** (lo que ve Lino) | 🆕 | No existe; hay que definir contenido (hueco D1). |
| Histórico de ODT consultable por Lino | 🔧 | `getOrdenesDeTrabajo` existe por empresa; falta la vista de solo lectura cruzando empresas asignadas. |
| `reporte-multi.tsx` / `comparar.tsx` / `reporte-usuarios.tsx` / `costos.tsx` | ⚠️ | El documento no los menciona (el costo solo aparece dentro del cierre de ODT). Pregunta P7. |

### Superficies / rutas

| Pieza | Estado | Detalle |
|---|---|---|
| `(driver)/` (5 tabs) | 🔧 | Sigue siendo la app del conductor de empresa; cambia el gate (C5) y la tab Inspección (C10). |
| `panel/` (6 tabs) | 🔧 | Sigue siendo la superficie de Yeison; se le suman áreas, alertas configurables, principal/secundarios. |
| Vista gerencial de Lino | 🆕 | No existe nada parecido (el `generalAdmin` de hoy ve el panel completo — justo lo que Lino NO debe ver). Ver C3. |
| Vista de Ale (supervisor personal) | 🆕 | No existe. Ver C3. |
| Vista de Santi/Sofi (usuario personal) | 🆕 | No existe. Ver C3. |
| Superficie de Admin (crear empresas/vehículos/GPS, auditoría) | 🆕 | `empresas.tsx` de hoy es un *selector*, no un administrador. Ver C3. |
| Auditoría (solo Admin) | 🆕 | No existe registro ni vista. |

### Lo que hoy existe y el documento NO contempla (⚠️ candidatos — no se toca nada)

| Pieza | Observación |
|---|---|
| **Módulo Viajes completo** (`(driver)/viajes`, `viaje.tsx`, `asignar-viaje.tsx`, `panel/operaciones`, `routingService`, `map-route-picker`, `viaje-card`, agenda/paradas/evidencia de entrega) | El documento no dice una palabra de viajes/rutas. Es demasiado grande para asumir omisión. Pregunta P8. |
| **Mensajería** (`mensajes.tsx` conductor↔"Operador", `chats.tsx`/`chat.tsx` del admin) | No mencionada. Además "Operador" es un rol del modelo viejo que el documento nuevo no tiene. Pregunta P9. |
| **Emergencia in-app** (`emergencia.tsx`, `emergencyService`, SOS FAB del inicio) | El documento pone el pánico en el **hardware del GPS** (§4.1). **Marcado candidato a eliminación** como pediste — sin tocar. Pregunta P10. |
| **SOS FAB** en `(driver)/index` | Ídem anterior (candidato, no tocado). |
| **Score/ScoreRing** del conductor | No mencionado (P5). |
| **Telemetría rica** (combustible, aceite, caja, temperatura, personas a bordo) | No mencionada (P4). |
| **Costos** (`costos.tsx`, `costService` con dashboard multi-empresa) | Solo existe "costo" dentro del cierre de ODT (P7). |
| **Comparar empresas** / **reporte-usuarios** / **reporte-multi** | No mencionados (P7). |
| **MFA** | No mencionado (P1). |
| **Sedes** | No mencionadas; posible solape con áreas (P2). |
| **Documentos mock colombianos** (SOAT/tecnomecánica) | Sustituir datos por los del documento (esto es 🔧 de datos, no eliminación). |

---

## (c) Choques de arquitectura

### C1 · Roles: escalera acumulativa vs. 6 roles con formas distintas

**Hoy:** `driver → companyAdmin → generalAdmin → superAdmin`, donde cada nivel SUMA capacidades, más la bandera transversal `drives`. Los guards (`esAdmin`, `esMultiempresa`, `puedeConducir`) y `useLoginDestino` asumen esa monotonía: más rol = más pantalla.

**Documento:** 6 roles que NO son una escalera:
- **Lino rompe la monotonía**: cruza varias empresas (como el `generalAdmin` de hoy) pero ve MENOS que Yeison (solo lectura gerencial). Con la escalera actual, cualquier multiempresa hereda el panel operativo completo — exactamente lo prohibido para Lino.
- **Ale no encaja**: administra "su empresa" (personal) con crear usuarios y alertas, pero sin áreas/ODT de taller/reportes corporativos. No es companyAdmin ni driver.
- **Santi tampoco**: usa un vehículo (¿`drives`?) pero NO tiene inspección ni ODT — la app del conductor de hoy le queda grande.

**Opciones (no decido):**
- **A. Reemplazo total del union `Role`** por los 6 del documento (`admin`, `supervisor_predefinida`, `supervisor_empresa`, `conductor_empresa`, `supervisor_personal`, `usuario_personal`). Los guards se reescriben como capacidades derivadas del rol (`puedeGestionarFlota()`, `veSoloGerencial()`, `puedeCrearVehiculos()`…). Más limpio contra el documento; migración más grande (todo lo que hoy pregunta por rol).
- **B. Rol = tipo de cuenta + cargo.** Dos ejes: `accountType` (estándar/predefinida/personal) × `cargo` (admin/supervisor/usuario). Los 6 roles emergen de la combinación. Modela mejor "Lino supervisa 2 predefinidas" y evita un union gigante; más abstracto de leer.
- **C. Conservador:** mantener los 4 niveles + `drives`, mapear (admin=superAdmin, supervisor_empresa=companyAdmin, conductor=driver) y agregar solo `supervisor_predefinida`, `supervisor_personal`, `usuario_personal`. Menos migración; deja conviviendo dos filosofías de rol y `generalAdmin` queda huérfano (¿nadie del documento lo usa? ver P11).

**Impacto común a las tres:** `useLoginDestino` pasa de 3 ramas a ~6; `esAdmin` deja de significar "ve el panel" (Lino es "admin" de mirar pero no de tocar); `puedeConducir` se divide en "opera un vehículo con obligaciones" (Pedro) vs. "ve su carro" (Santi).

### C2 · Tipos de cuenta y la asignación estándar→predefinida

**Hoy:** `TenantTipo = natural | juridica`; `TenantProvider` resuelve UNA cuenta (o ninguna para multiempresa) con sus sedes. No existe relación entre cuentas.

**Documento:** tres tipos (estándar/predefinida/personal) y una **relación de asignación** (Samfor→Chevron) que es la columna vertebral de la vista de Lino: predefinida elegida → empresas asignadas → empresa elegida → datos gerenciales.

**Implica:**
- `Company`/`Cuenta` necesitan `tipo` de 3 valores (¿se fusionan `Company` y `Cuenta`? Hoy son dos conceptos casi paralelos — ver P12).
- Nueva relación N:M o 1:N empresa↔predefinida (¿una empresa puede estar asignada a DOS predefinidas a la vez? — P13).
- `TenantProvider` (o un provider hermano) debe sostener el contexto de Lino: predefinida activa + empresa asignada activa. Es análogo al `AdminProvider` actual (empresa activa) — el patrón existente sirve de molde, extendido sin romperse.
- El tema por empresa se extiende: Lino navega con la marca de Chevron y "mira hacia" Samfor (¿qué marca pinta al entrar en los datos de Samfor? — P14, detalle visual).

### C3 · Superficies: de 2 a ~5 vistas

**Hoy:** `(driver)/` (tabs del conductor) y `panel/` (tabs del admin) + pantallas de pila compartidas. `useLoginDestino` reparte entre `/`, `/empresas`, `/panel`.

**Documento:** al menos 5 experiencias distintas: Admin (gestión global + auditoría), Lino (gerencial solo lectura), Yeison (panel operativo), Pedro/Luis (app conductor), Ale (panel personal simplificado), Santi (vista mínima mapa+alertas).

**Opciones (no decido):**
- **A. Un grupo de rutas por superficie:** `(driver)/`, `panel/`, `(gerencial)/`, `(personal)/`, `(admin)/`. Claridad máxima, guards simples por grupo; más árboles de navegación que mantener.
- **B. Superficies por capacidad sobre los grupos existentes:** `panel/` se vuelve camaleónico (tabs condicionales por rol: a Lino se le esconden 4 tabs, a Ale otras). Menos rutas nuevas; guards y layouts se llenan de condicionales y el "panel de Lino" arriesga enseñar de más (violación directa del §2).
- **C. Híbrido (mi lectura de menor riesgo, a confirmar):** `(driver)/` y `panel/` se conservan para Pedro y Yeison; se crean `(gerencial)/` para Lino y `(personal)/` para Ale+Santi (con variante interna); lo de Admin nace como pila sobre `empresas.tsx` evolucionado o grupo `(admin)/` propio. Crea solo lo que no existe y no toca lo que funciona.

### C4 · GPS como entidad de primera clase

**Hoy:** el GPS no existe. El "chip" es una abstracción de emparejamiento conductor↔vehículo (`getEmparejamientoActual`), y la telemetría llega "del vehículo" sin origen modelado.

**Documento:** el GPS es una entidad con ciclo de vida: registro (modelo → IMEI único → línea, en ese orden), asociación (GPS↔vehículo, hereda empresa), verificación (¿reporta posición?), capacidades (soporte de PIN sí/no; botón de pánico físico), y la **regla dura: no se termina de crear un vehículo sin GPS instalado y verificado**.

**Implica:** tipo `Gps` nuevo + servicio (`gpsService` o dentro de `fleetService`) + wizard de alta de vehículo con el paso 3 bloqueante + validación de IMEI único + campo de soporte de PIN que condiciona C5. La verificación "¿reporta posición?" en mock será un paso simulable (con el reintento del flujo). La auditoría del alta nace aquí.

### C5 · Conductor principal + secundarios con PIN

**Hoy:** un solo eje: `Emparejamiento` por chip decide TODO (si no hay chip, el conductor casi no tiene app; `WorkOrder.driverId` = quien reporta; `FleetVehicle.conductorActual` = el emparejado). No hay titularidad ni autorizados.

**Documento:** dos ejes: **titularidad** (principal fijo, asignado por el supervisor) + **uso temporal** (secundario autorizado que mete PIN). El conductor actual = secundario activo ?? principal. Los eventos y ODT del lapso se atribuyen a quien usaba.

**Qué cambia en el modelo de datos (borrador para discusión, no ejecutado):**
- `Vehicle.conductorPrincipalId` (o tabla de asignación aparte).
- Autorizaciones: `{vehicleId, userId, pin}` para secundarios (el PIN vive en el GPS real; en el mock, en el servicio).
- Sesión de uso: `{vehicleId, userId, desde, hasta|null, via: 'principal'|'pin'}` — la fuente de `conductorActual` y de la atribución de eventos.
- `WorkOrder/ODT`: `driverId` se conserva (quién la creó) + bandera/via de si era secundario al crearla (para el "QUIÉN LA CREÓ" del §3.3).
- **El gate del conductor se invierte:** hoy "sin chip casi no entras"; objetivo: el principal SIEMPRE ve su unidad asignada; el secundario ve la unidad mientras su PIN esté activo. `DrivingProvider` deja de ser un detector de chip y pasa a resolver "¿qué vehículo te corresponde ahora y a qué título?". `AvisoSinChip`/`RequiereChip` quedan como candidatos a rehacer/retirar (Fase B).
- Si `Gps.pinSupport === false` → la UI de secundarios de ese vehículo no existe (§3.5).

### C6 · ODT vs OT: nombre, estados y cierre

**Hoy:** `WorkOrder`, 4 estados con etiqueta en español capitalizada (`Enviada → Revisada → En proceso → Realizada`), `OTStatusBadge`, stepper en `orden.tsx`, `notaSolucion` y `costo` opcionales al cerrar.

**Documento:** "ODT", 3 estados en snake (`abierta → en_revision → cerrada`), cierre con qué se hizo + costo + **factura/foto** + fecha de resolución; y dos tipos (correctiva/preventiva) con las preventivas creándose solas.

**Opciones (no decido):**
- **A. Renombrar y remapear en el modelo:** `WorkOrder→ODT` (o alias de tipo), estados nuevos de 3, migrando `Enviada→abierta`, `Revisada/En proceso→en_revision`, `Realizada→cerrada`. Fiel al documento; pierde el matiz "en taller" (`En proceso`) que hoy distingue el badge.
- **B. Estados internos de 4 + etiquetas del documento:** el modelo conserva 4, la UI muestra 3 (Revisada y En proceso se presentan como "En revisión"). Cero pérdida de información; el código y el documento hablan idiomas distintos para siempre.
- **C. Los 3 del documento + subestado opcional:** `estado: abierta|en_revision|cerrada` + `subestado?: 'en_taller'`. Fiel y sin perder el matiz; un campo más.
- En cualquier opción: se agrega `tipo: correctiva|preventiva`, `resueltaEn`, `evidenciaResolucionUrls` (factura/foto), y el vocabulario visible pasa de "OT" a "ODT" (textos, `TANDA3_OT.md` queda histórico).

### C7 · Botón de pánico: hardware vs. app

**Documento §4.1:** "EMERGENCIA → botón de pánico FÍSICO del GPS". La app del conductor no tiene emergencia propia; la prueba del botón físico es parte del alta del GPS (§1.2, 3.3).

**Hoy:** SOS FAB en el inicio del conductor + `emergencia.tsx` (pantalla completa con seguimiento chat) + `emergencyService` + tarjeta de emergencia en el inicio sin chip.

**Acción en esta fase:** ✋ **marcados como candidatos a eliminación, sin tocar nada** (P10). Nota: si se retiran, también quedan huérfanos `EmergenciaTipo/Estado/Mensaje`, `EnviarSOSInput` en types y el fab del mapa — irán juntos en la lista de la Fase B si apruebas.

### C8 · Mapa: "tu ubicación + la del vehículo" en todos los roles

**Hoy (matizado tras leer el código):**
- Modo **single** (conductor): SÍ pide permiso (`requestForegroundPermissionsAsync`) y sigue la posición… pero el teléfono ES el vehículo (un marcador; tu posición y la del carro son la misma cosa). Correcto como simulación, incorrecto como modelo: cuando el GPS real exista, la posición del vehículo vendrá de la API y la tuya del teléfono — son dos puntos.
- Modo **multi** (panel): NO pide permiso y `showsUserLocation={false}` — Yeison nunca se ve a sí mismo. Incumple el §8-8 directamente.

**Implica:** `MapaVehiculo` gana un segundo plano de información: SIEMPRE tu ubicación (permiso + marcador "tú") + la(s) del vehículo(s) (mock hoy, API mañana). Manejo del "permiso denegado" en todos los roles (hoy solo el modo single lo maneja). Los `.web.tsx` espejo también. Diseño del marcador "tú" distinto del vehículo (DIRECCION_VISUAL: sin ruido, un punto secundario).

### C9 · Alertas: de notificación pasiva a regla configurable

**Hoy:** `Alerta` = aviso que el conductor recibe (mock estático). `PlanPreventivo`/`AlertaPredictiva` = lecturas derivadas, no configurables. **No existe nada asignable a vehículos** — confirmado.

**Documento:** el supervisor CREA reglas (exceso de velocidad con límite, mantenimiento cada X km) y las ASIGNA a 1/N vehículos o por área; cada regla monitorea; al cumplirse: notificación + (si es de mantenimiento) ODT preventiva automática.

**Implica:** tipo nuevo `ReglaAlerta` {tipo, umbral, vehicleIds[], creadaPor} + servicio + pantalla de creación/asignación en el panel + el motor mock que "cumple" reglas para demostrar el flujo §3.4 + conexión con C6 (ODT preventiva). Las `Alerta` actuales pasan a ser el RESULTADO de una regla (o de un vencimiento de documento).

### C10 · Inspección: 2 estados vs. 3, y el destino de la falla (choque extra que encontré)

**Hoy:** checklist con `ok | falla` (+nota, +evidencia); una falla en ítem `critico` **bloquea la salida** y genera OT automática sin preguntar.

**Documento §4.1:** tres respuestas (✅ Conforme / ⚠️ Observación / ❌ Falla) y en falla: "**¿crear ODT?**" — pregunta, no automatismo. No menciona ítems críticos ni bloqueo de salida.

**Opciones:** (a) adoptar 3 estados y ODT opcional tal cual; (b) 3 estados pero conservar el automatismo para críticos (el bloqueo es una protección valiosa que el documento quizá omitió). Pregunta P6.

### C11 · El documento nuevo contradice los documentos viejos — ✅ RESUELTO

`FLUJOS_ARQUITECTURA_FOM.md` y `BRIEF_PROYECTO.md` (v5) definen roles **Operador (web), Técnico (app), Supervisor (web)** y el flujo OT pasa por un técnico con app propia. FOM-02-FUN-002 no tiene nada de eso: Yeison gestiona la reparación de punta a punta. **Veredicto del usuario:** cualquier contradicción se ignora; FOM-02 es la verdad absoluta hasta nueva orden. Los .md viejos no se consultan para decisiones de dominio (no se borran; simplemente dejan de ser referencia). La mensajería con "Operador" (C-P9) es hija de este conflicto.

---

## (d) Huecos y ambigüedades del propio documento

| # | Hueco | Estado |
|---|---|---|
| D1 | **"Información extra" de Lino (§2.1)** — declarado "pendiente de definir alcance". | 🔴 ABIERTO. ¿Sección placeholder o fuera hasta definirse? |
| D2 | **Contenido del "reporte gerencial"** de Lino/Chevron. | 🟡 EN CAMINO — el usuario compartirá el formato real Samfor→Chevron de este año (estadísticas de usuarios y vehículos) + cuestionario y presentación de mantenimiento de flota. Se diseñará mejorando ese formato. |
| D3 | **"Formato que Chevron exige"** — plantilla visual, subconjunto de datos, ¿exportable? | 🟡 EN CAMINO — confirmado que la esencia es **exportar los registros de cada empresa asignada en el formato que pidan**, con mejoras sustanciales sobre el actual. Detalle al recibir los documentos. |
| D4 | **GPS sin PIN (§3.5)** — ¿catálogo de modelos con capacidades o casilla manual? | 🔵 DIFERIDO — todo lo específico del GPS lo maneja el Sr. Pacheco; llegará con el GPS real de pruebas. En el mock: boolean simulado. |
| D5 | **Qué pasa con lo existente no mencionado.** | ✅ RESUELTO — nada se elimina por ahora; se dirá cuándo y se hará sin afectar nada más. |
| D6 | **KPIs del dashboard de Yeison (§3.2)** — sin enumerar. | 🔵 DIFERIDO — ligado al GPS (Sr. Pacheco). Mientras: se mantiene el resumen actual. |
| D7 | **Notificaciones** — ¿push real, campana in-app, o ambos? | 🔴 ABIERTO (para el mock propongo in-app; push cuando haya backend). |
| D8 | **PIN: generación, entrega, revocación.** | 🔴 ABIERTO (detalle de UX; puede decidirse en su bloque). |
| D9 | **Ciclo de vida del vehículo** (¿inactivo/vendido/en taller?). | 🔵 DIFERIDO — dominio del GPS/Sr. Pacheco. |
| D10 | **¿Quién es el "instalador" (§8-4)?** | ✅ RESUELTO — es una **app aparte nuestra** (control del sistema en GPS/vehículos, migraciones, asignación de empresas/personas/roles). No llega todavía; solo contexto. En ESTA app, el paso 3 del alta es un wizard que ejecuta el Admin. |
| D11 | **PDVSA en el mock.** | ✅ RESUELTO — se crea **"PDVSA Petroboscan"** como una empresa más ASIGNADA a Chevron (no como segunda predefinida). Chevron ve sus reportes igual que los de Samfor. |

---

## (e) Preguntas abiertas (necesito tu respuesta antes de la Fase B)

**Sobre lo existente que el documento no menciona — ✅ RESUELTAS EN BLOQUE (2026-07-08): nada se elimina por ahora.**
- ~~**P1 · MFA**~~ → se queda.
- **P2 · Sedes vs. Áreas:** 🔴 ABIERTA — las sedes no se eliminan (regla general), pero sigo necesitando saber si las **áreas** nuevas conviven con las sedes o las absorben *funcionalmente* (dónde se cuelga cada cosa al crear la estructura de Yeison).
- **P3 · `Vehicle.numero` ("U-014") vs. ALIAS ("Unidad 07"):** 🔴 ABIERTA — ¿mismo campo renombrado o dos campos?
- ~~**P4 · Telemetría rica**~~ → se queda.
- ~~**P5 · Score**~~ → se queda.
- **P6 · Inspección:** 🔴 ABIERTA — ¿adopto los 3 estados (Conforme/Observación/Falla) con "¿crear ODT?" opcional? ¿Y el bloqueo por falla crítica actual se conserva como regla nuestra o se retira del flujo (sin borrar código todavía)?
- ~~**P7 · Costos/Comparar/Reporte usuarios/multi**~~ → se quedan (reporte-multi además es semilla natural de la vista de Chevron).
- ~~**P8 · Viajes**~~ → se queda.
- ~~**P9 · Mensajería**~~ → se queda (pendiente menor: re-etiquetar "Operador" cuando toque ese bloque, sin borrar nada).
- ~~**P10 · Emergencia/SOS**~~ → se queda; sigue solo *marcada* en el inventario para cuando el usuario decida.

**Sobre el modelo nuevo (siguen abiertas — necesarias para la Fase C):**
- **P11 · Roles:** de las opciones de C1 (A reemplazo total / B cuenta+cargo / C conservador), ¿cuál prefieres? Nota: con el veredicto de PDVSA, el `generalAdmin` actual (Andrea/Chevron) encaja natural como el futuro `supervisor_predefinida` — pero sigue siendo tu decisión.
- **P12 · `Company` vs. `Cuenta`:** ¿fusiono en una sola entidad con `tipo`, o mantengo ambos (Cuenta=tenant raíz, Company=empresa operativa)?
- **P13 · Asignación predefinida:** ¿una empresa estándar puede estar asignada a VARIAS predefinidas a la vez? (Con PDVSA Petroboscan como asignada, el caso multi-predefinida de Lino del §2.1 queda sin ejemplo en el mock — ¿lo dejamos previsto en el modelo igualmente?)
- **P14 · Marca en la vista de Chevron/Lino:** al entrar a los datos de Samfor, ¿se pinta con la marca de Chevron (su cuenta) o cambia a la de Samfor (la empresa mirada)?
- ~~**P15 · Documentos viejos**~~ → ✅ RESUELTA: FOM-02 es verdad absoluta; los viejos se ignoran donde contradigan (no se borran).
- **P16 · ODT:** de las opciones de C6 (A remapear a 3 / B 4 internos con etiqueta / C 3 + subestado), ¿cuál?
- **P17 · Superficies:** de las opciones de C3 (A grupo por superficie / B panel camaleónico / C híbrido), ¿cuál?
- **P18 · Elenco mock:** ✅ PARCIAL — PDVSA Petroboscan confirmada (asignada a Chevron). Falta: ¿AGREGO el elenco del documento (Marco, Juan, Lino, Yeison, Pedro, Luis, Carlos, Ale, Santi, Sofi) conservando los usuarios mock actuales, o los reemplazo? (Agregar es lo compatible con "nada se borra sin aprobar".)
- Además: D1 (información extra), D7 (canal de notificaciones) y D8 (PIN) cuando toquen sus bloques; D2/D3 al recibir los formatos.

---

## Candidatas a eliminación — ❄️ INVENTARIO CONGELADO

> **Veredicto (2026-07-08): NADA de esta lista se elimina por ahora.** Se conserva solo como inventario informativo de lo que el documento no contempla, para cuando el usuario decida en el futuro. La Fase B queda pospuesta hasta ese momento; la Fase C puede arrancar sin eliminar nada (crear/migrar conviviendo con lo existente).

1. `emergencia.tsx` + `emergencyService.ts` + tipos `Emergencia*`/`EnviarSOSInput` + SOS FAB + tarjeta de emergencia del inicio (§4.1 pánico = hardware).
2. `AvisoSinChip` / `RequiereChip` / concepto de gate por chip (sustituido por principal/PIN — probablemente se REHACE más que se borra).
3. Módulo Viajes completo (pendiente P8).
4. Mensajería (pendiente P9).
5. `costos.tsx`/`costService` como dashboard (pendiente P7).
6. `comparar.tsx`, `reporte-usuarios.tsx`, `reporte-multi.tsx` (pendiente P7; nota: reporte-multi podría ser la semilla de la vista de Lino).
7. Sedes (`sedes.tsx`, tipo `Sede`, rama de sedes en `useLoginDestino`) (pendiente P2).
8. Score del conductor (`ScoreRing`, `DriverScore`, `getMiScore`) (pendiente P5).
9. Rol `generalAdmin` y su usuario mock (pendiente P11).
10. Telemetría rica en `VehicleTelemetry` (pendiente P4).
11. `TANDA3_OT.md` / `TANDA3_OT_b.md` y docs de planificación viejos (pendiente P15 — serían "archivados", no borrados).

---

---

## Decisiones PROPUESTAS para la Fase C (pendientes de aprobación explícita del usuario)

> Criterio: donde FOM-02 dicta algo, se propone **literal**. Donde calla, se propone la opción que no rompe ni borra nada. NADA de esta tabla está en código (el Bloque 1 fue revertido); cada fila espera el visto bueno o veto del usuario.

| # | Decisión | Base |
|---|---|---|
| P11 | **Opción A — los 6 roles del documento**, con los nombres del propio archivo: `admin`, `supervisor_predefinida`, `supervisor_company` (literal en §1.1), `conductor`, `supervisor_personal`, `usuario_personal`. Los 4 roles viejos NO se borran: conviven como legado hasta que la migración termine (y su retiro pasará por la lista de Fase B). | El doc los define; regla "nada se elimina". |
| P16 | **Opción A — 3 estados literales**: `abierta → en_revision → cerrada` + `tipo: correctiva/preventiva` + cierre con costo/factura/fecha. `WorkOrderStatus` viejo convive hasta migrar todas las pantallas. | §3.3/§4.2 literales. |
| P6 | **3 estados de inspección** (✅ Conforme / ⚠️ Observación / ❌ Falla) con "¿crear ODT?" al marcar falla, literal del §4.1. El **bloqueo por falla crítica actual SE CONSERVA** (el doc no lo menciona → no se toca). | §4.1 + regla "no mencionado ≠ borrar". |
| P2 | **Áreas = concepto NUEVO** (ubicación/sector/contrato, las crea el supervisor). Sedes y FleetGroup quedan intactos (no mencionados). | §3.1 + regla. |
| P3 | **`alias` = campo NUEVO** del vehículo; `numero` no se toca. | §8-1 + regla. |
| P12 | **Se mantienen ambos**: `Cuenta` (tenant del login) y `Company` (empresa operativa); `Company` gana `tipo` (estándar/predefinida/personal), RIF, contacto y asignación a predefinida. Fusionarlas se re-evalúa cuando haya backend real. | Menor riesgo; el doc no lo dicta. |
| P13 | El modelo **prevé N predefinidas por empresa** (array), aunque el mock use una (Chevron). | §2.1 contempla multi-predefinida. |
| P14 | En la vista gerencial, la sesión de Lino **se pinta con la marca de su predefinida (Chevron)** incluso mirando datos de una asignada; la empresa mirada se identifica con texto/chip, no cambiando el tema. | Propuesta mía (menor sorpresa); vetable. |
| P17 | **Opción C — híbrido**: `(driver)/` y `panel/` se conservan para conductor y supervisor_company; la vista gerencial, las personales y la superficie de Admin nacen como grupos/pantallas nuevas en sus bloques. | Realiza el doc sin tocar lo que funciona. |
| P18 | **Se AGREGA el elenco del documento conservando los usuarios mock actuales.** Samfor existente ≈ "Samfor" del doc (no se renombra). Se suma PDVSA Petroboscan (asignada a Chevron). | Regla "nada se borra". |

## Plan de bloques — Fase C · v2 REORDENADA (PROPUESTA, pendiente de aprobación del usuario)

> Reordenada el 2026-07-08 a pedido del usuario: **la restricción de Lino no puede esperar**. Se inserta el bloque 1.1 (guard de seguridad) y la vista gerencial sube de la posición 8 a la 3. Cada bloque: tsc/eslint 0 → explicación → PAUSA y confirmación del usuario ANTES de empezar el siguiente. **Ningún bloque arranca sin aprobación explícita.**

| Orden | Bloque | Contenido | Depende de |
|---|---|---|---|
| 1 | Cimientos de identidad | PENDIENTE. (Se ejecutó una vez sin aprobación y fue **REVERTIDO por completo** el 2026-07-08 a pedido del usuario; el diff quedó documentado en la conversación como referencia. Se re-ejecutará SOLO con aprobación explícita.) Roles nuevos + capacidades + elenco mock + PDVSA Petroboscan + asignación + login. | — |
| **1.1** | **Guard de Lino (corrección de seguridad)** | `supervisor_predefinida` NO puede entrar a `panel/` (redirección estructural en el layout) + en el menú de empresas sus asignadas se muestran informativas, sin navegar al panel operativo, con estado "vista gerencial en preparación". Cierra la violación del §2.1 YA, sin esperar su vista. ~10 líneas aditivas. | 1 |
| 2 | ODT | Estados nuevos (3: `abierta → en_revision → cerrada`), tipo correctiva/preventiva, cierre completo (qué se hizo/costo/factura/fecha), vocabulario "ODT" en la UI. Sube porque la vista de Lino necesita el histórico de ODT. | 1 |
| 3 | Vista gerencial (Lino) | Grupo de rutas propio de SOLO LECTURA: empresas asignadas → reporte gerencial + reportes + histórico ODT. Reemplaza el guard 1.1 por la experiencia real. El "formato Chevron" se integra cuando lleguen los documentos (sub-bloque 3b). | 1.1, 2 |
| 4 | GPS + alta de vehículo | Entidad `Gps` (modelo→IMEI→línea), wizard de alta con GPS obligatorio y verificación, `alias`, póliza, auditoría del alta (solo Admin). | 1 |
| 5 | Áreas + titularidad | CRUD de áreas; vehículo→área; conductor principal; secundarios autorizados + PIN (modelo y panel). | 1 |
| 6 | Conductor actual dinámico | `DrivingProvider` reorientado (principal ve su unidad siempre; secundario por PIN); mapa con DOS puntos (tú + vehículo) en todos los modos; atribución de eventos/ODT por lapso. | 5 |
| 7 | Reglas de alerta | `ReglaAlerta` (velocidad/mantenimiento) + asignación a 1/N vehículos o por área + motor mock + **ODT preventiva automática** + notificaciones del panel. | 2, 5 |
| 8 | Inspección a 3 estados | Conforme/Observación/Falla + "¿crear ODT?"; bloqueo crítico se conserva. | 2 |
| 9 | Cuentas personales | Ale (supervisor_personal: sus carros, sus usuarios, alertas multi-carro) + Santi/Sofi (usuario_personal: mapa + alertas). | 1, 6, 7 |
| 10 | Superficie Admin | Crear/editar empresas y supervisores, asignar predefinidas, invitaciones, auditoría visible. | 1, 4 |
| 11 | Perfil obligatorio | Gate de primer ingreso (cédula, licencia, **carta médica**) para todos los roles humanos. | 1 |

*Fase B (eliminaciones) pospuesta: no se elimina nada. Los documentos del formato Chevron llegarán cuando nos enfoquemos en el bloque 3b.*

---

## PUNTO DE REANUDACIÓN (donde quedamos, 2026-07-08)

1. **Código:** intacto, igual al commit `a7034d8` (rediseño visual completo + fix de encabezados, pusheado). Nada de la reestructura está en código.
2. **Este documento** es la Fase A completa + veredictos + decisiones PROPUESTAS + plan de bloques v2 PROPUESTO. Nada de eso está aprobado aún, salvo los veredictos del §Veredictos (que vinieron del usuario).
3. **Esperando del usuario:** (a) el próximo archivo (formato real Samfor→Chevron + cuestionario y presentación de mantenimiento de flota, y/o nueva versión del documento FOM); (b) su aprobación explícita, bloque por bloque, empezando por el Bloque 1.
4. **Preguntas que siguen abiertas** cuando se retome: P2 (sedes vs áreas), P3 (numero vs alias), P6 (inspección/bloqueo crítico), P11–P14, P16–P18 (ver §(e)) — el usuario indicó "cumple todo como lo dice el archivo", y las propuestas derivadas están en la tabla de Decisiones PROPUESTAS, pero tras el reinicio de proceso quedan sujetas a su aprobación explícita.
5. **Regla de proceso:** ningún bloque se ejecuta sin aprobación explícita de ESE bloque. Cada bloque termina con tsc/eslint en 0, explicación, y PAUSA.
