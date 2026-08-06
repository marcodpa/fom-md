# Plan de adaptación a los documentos — Proyecto FOM

> Cómo llevar lo que YA tenemos construido a lo que dicen los documentos
> (`BRIEF_PROYECTO.md` v5 + `FLUJOS_ARQUITECTURA_FOM.md`). Para cada pantalla:
> el **flujo objetivo** (según los tableros), el **estado actual** y la **acción**
> (mantener · adaptar · crear · eliminar). Pensado para retomar por fases.
>
> Foco: **FOM-DRIVER** (Tablero 3). Los paneles que hoy viven dentro de la app
> son la **semilla de FOM-WEB** (Tablero 2, 17 módulos) y se tratan aparte.

---

## 0. Principios que rigen TODO (del brief)

Estas reglas aplican a cada cambio de abajo; no se repiten en cada punto:

1. **Regla de nombre (§2):** nada visible dice "Control de Flotas". Solo "Proyecto FOM" / "la plataforma" / "FOM". El nombre de carpeta y repo se mantiene; lo visible ya usa FOM (auditar strings sueltos).
2. **Expediente digital único (§4):** el vehículo es el centro; toda la info fluye en cadena: Vehículo → Conductor → Viaje → Telemetría → Inspección → Falla → OT → Repuestos/Mano de obra → Costo → Decisión.
3. **Capa de servicios (§17):** toda pantalla pide datos por `src/services` con `TODO API`. Migrar a la BD/GPS de Juan = cambiar cuerpos de funciones, nunca pantallas.
4. **Operación por excepciones (§8, §12):** la app resalta lo que requiere atención (falla crítica, mantenimiento vencido, exceso de velocidad, documento vencido, emergencia…); el usuario no revisa todo a mano.
5. **Cuidar a la gente (§13):** score/semáforo como manejo seguro con copy de cuidado; inspección crítica y emergencia lo refuerzan.
6. **Multi-tenant (§5):** raíz = Cuenta/Tenant. Todo el color sale del tema por empresa; semánticos (verde/amarillo/rojo) solo para estado y seguridad.
7. **Método de trabajo:** por pantalla — terminar, mostrar, confirmar, seguir. No rehacer lo que funciona.
8. **Diseño (`DISENO_DIRECCION.md`):** cada pantalla nueva o adaptada respeta la dirección visual — calma y confianza, mapa protagonista, jerarquía limpia, **botones grandes en la vista de conducción** (se usa manejando), pills de estado con color semántico, anillo de score con animación de llenado, **skeletons** en vez de spinners, feedback al tocar, y **respetar "reducir movimiento"**. Tokens (color por capa, tipografía, espaciado, radios, duraciones) centralizados en el tema; el mismo tipo de elemento se ve igual en toda la app.

---

## 1. Estado del código hoy (punto de partida)

**FOM-DRIVER (lo nuestro):** `login` · `(driver)/index` (Inicio) · `inspeccion` · `viajes` + `viaje` (ruta) · `alertas` · `mas` · `mensajes` · `documentos` · `perfil` · `reportar` · `emergencia` · `sincronizacion` · `conductor` (vista de conducción). Gate por chip al iniciar sesión, capa de servicios mock, sincronización offline (outbox).

**FOM-WEB (paneles dentro de la app, semilla):** `admin` · `empresas` · `reporte` · `reporte-multi` · `reporte-usuarios` · `comparar` · `orden` · `ordenes`.

**No existe aún:** FOM-TECH, FOM-CONTROL, Instalador; capa Tenant/Sede; MFA; selección de cuenta; expediente del vehículo completo.

---

## 2. FOM-DRIVER — pantalla por pantalla

### 2.1 Login  →  *adaptar*
- **Flujo objetivo (Tablero 3):** validar credenciales → **MFA cuando aplique** → **selección de cuenta si el usuario tiene varias** → (elegir sede/flota solo si la estructura lo requiere) → Inicio.
- **Hoy:** correo + contraseña (mock), marca FOM. Sin MFA, sin selección de cuenta/sede.
- **Acción:**
  - **Crear** paso opcional de **MFA** (pantalla de código; mock verificable). Detrás de bandera `mfaRequerido` por usuario.
  - **Crear** **selección de cuenta** cuando el usuario pertenece a >1 Cuenta/Tenant (hoy asumimos 1). Y **selección de sede/flota** solo si la estructura lo pide.
  - Mantener login como está para el caso simple (1 cuenta, sin MFA).

### 2.2 Inicio del conductor  →  *adaptar*
- **Flujo objetivo:** Inicio → {¿pasó el chip?} → **No:** mapa con su nombre, **sin métricas** / **Sí:** emparejado al vehículo → vista con telemetría, mapa e índice de manejo seguro; accesos a inspección, viaje, reportar falla, emergencia.
- **Hoy:** ✅ gate por chip al login (José sin chip → aviso "entrar sin chip"; resto directo), saludo, telemetría rápida, tarjetas de jornada, emergencia siempre. Sin-chip muestra "mientras tanto" (perfil/mensajes/alertas).
- **Acción:**
  - **Adaptar** el sin-chip para que sea exactamente "mapa con su nombre, sin métricas" (hoy ya se acerca; revisar copy y que no filtre nada del vehículo).
  - **Encadenar** el flujo maestro (ver §3): desde Inicio, el CTA principal cuando hay chip debe empujar a **inspección → viaje**, no solo mostrar tarjetas sueltas.
  - Añadir **índice de manejo seguro** resumido en el Inicio (hoy vive en perfil).

### 2.3 Inspección preoperacional  →  *adaptar*
- **Flujo objetivo (Tablero 3 + Módulo 7):** cargar **plantilla del tipo de vehículo** → checklist → marcar ok/falla → {¿fallas?} → No: **aprobada** / Sí: evidencia → {¿crítica?} → No: **aprobada con observaciones** / Sí: **vehículo bloqueado → OT automática → notifica al supervisor → reasignar vehículo o esperar reparación**.
- **Hoy:** ✅ checklist (12 ítems, 6 categorías), ítem crítico bloquea + genera OT, evidencia por foto, resultado aprobada/bloqueada.
- **Acción:**
  - **Crear** el estado intermedio **"aprobada con observaciones"** (falla NO crítica → registra observación pero deja salir).
  - **Adaptar** plantilla para que dependa del **tipo de vehículo** (`getPlantillaInspeccion(vehicleId)` ya recibe id; falta que el mock varíe por tipo).
  - **Crear** "notificar al supervisor" y "reasignar/esperar" (mock + `TODO API`) al bloquear.
  - **Crear** **inspección postoperacional** (al cerrar el viaje) reusando el mismo motor.

### 2.4 Viajes + Ruta  →  *adaptar (el más incompleto vs. documentos)*
- **Flujo objetivo (Tablero 3):** recibe viaje asignado → revisa origen/destino/ruta → **inspección preoperacional** → **registra km inicial** → inicia → navegación y monitoreo en vivo → **registra paradas** → llega → **evidencia de entrega** → **km final** → **inspección postoperacional** → cierra → sincroniza.
  - **Estados (Módulo 4):** solicitado/aprobado/planificado → asignado/en inspección/listo → en progreso/pausado/en destino → completado/cancelado.
- **Hoy:** agenda (en curso / próximos / historial), iniciar/finalizar, ruta animada en el mapa, navegación paso a paso mock.
- **Acción:**
  - **Adaptar** el tipo `Viaje` y el flujo para incluir: **km inicial/final**, **paradas**, **evidencia de entrega**, enlace a **inspección pre y postoperacional**, y los **estados** del Módulo 4 (hoy solo programado/en_curso/completado).
  - **Adaptar** "iniciar viaje" para que exija **inspección aprobada** antes (ver §3).
  - Mantener la ruta animada; conectar paradas/estado al recorrido.

### 2.5 Emergencia (SOS)  →  *adaptar*
- **Flujo objetivo (Tablero 3):** botón → confirmación rápida → activa → **envía ubicación en vivo + datos del vehículo** → **notifica al centro de control** → **el operador lo contacta** → **elige tipo** (mecánica/salud/seguridad) → **recibe instrucciones y seguimiento** → se resuelve o llega asistencia → cierra el caso.
- **Hoy:** ✅ botón + confirmación, elige tipo, estado "ayuda en camino", cancelar. El tipo se elige ANTES de activar.
- **Acción:**
  - **Adaptar** el orden: activar primero (compartir ubicación) y **elegir tipo dentro del seguimiento** con el operador.
  - **Crear** el **seguimiento bidireccional** (mensajes/instrucciones del operador) y el **cierre del caso**.
  - **Crear** compartir **ubicación en vivo** (hoy es un texto); conectar al plano GPS.

### 2.6 Alertas  →  *adaptar*
- **Flujo objetivo (§8 operación por excepciones):** avisos accionables: exceso de velocidad, mantenimiento vencido, documento vencido, desvío de ruta, pérdida de comunicación, uso no autorizado, emergencia.
- **Hoy:** ✅ lista con severidad (info/advertencia/crítica), marcar leída, contador en Inicio.
- **Acción:** **adaptar** el origen de datos para que cada alerta represente una **excepción real** con su tipo y enlace (ej. "documento vencido → Documentos"; "mantenimiento próximo → OT"). Mantener la UI.

### 2.7 "Más": Mensajes · Documentos · Perfil · Sincronización  →  *mantener + adaptar*
- **Mensajes** — ✅ chat con el operador. Mantener; conectar a `FOM-REALTIME` a futuro.
- **Documentos** — hoy solo del **vehículo**. **Adaptar** (Módulo 15): documentos **del vehículo + del conductor** (licencia, certificados), con vencimientos que alimentan Alertas.
- **Perfil (= Expediente del conductor, Módulo 8)** — ✅ datos, licencia, índice de manejo seguro, métricas. **Adaptar**: añadir **vehículos usados**, **viajes/historial** y **OT reportadas** enlazadas.
- **Sincronización** — ✅ outbox offline con estado. Mantener; conectar a `FOM-MOBILE-SYNC`.

### 2.8 Reportar falla (OT)  →  *mantener*
- **Flujo objetivo (§11):** el conductor lo ve como "Reportar una falla"; genera OT con autor, evidencia y ubicación; entra a la cadena Enviada→Revisada→En proceso→Realizada.
- **Hoy:** ✅ funciona y cae en la bandeja del admin. Mantener; ya encolado offline.

### 2.9 Vista de conductor (`conductor.tsx`)  →  *revisar/adaptar*
- **Flujo objetivo:** telemetría en vivo, mapa, índice de manejo seguro, ficha del vehículo; es el "durante el viaje".
- **Acción:** **adaptar** para integrarla al flujo de viaje (monitoreo en progreso, paradas, reportar falla/emergencia desde ahí). Evaluar si es una pantalla o una pestaña del viaje en curso.

---

## 3. El flujo MAESTRO del conductor (hoy está suelto)

Los documentos encadenan una secuencia que hoy tenemos como **pestañas independientes**. Adaptar para que exista el "hilo" del día:

```
Login → (chip) → Inicio
  └─ con chip → Inspección preoperacional
        └─ apto → Vista de conductor → Iniciar viaje (km inicial)
              → navegación/monitoreo → paradas → destino
              → evidencia de entrega → km final
              → Inspección postoperacional → Cerrar viaje → Sincronizar
        └─ NO apto → bloqueado → avisa supervisor → reasignar/esperar
```

**Acción:** introducir un concepto de **"aptitud del día"** (estado en `driverService`): iniciar un viaje **exige inspección aprobada**; si está bloqueada, no deja arrancar y notifica. El Inicio guía el siguiente paso según dónde vas en el hilo.

---

## 4. Modelo de datos a adaptar (multi-tenant + expediente)

- **Crear capa Tenant (§5):** hoy el modelo arranca en `Company`. Falta **Cuenta/Tenant** (raíz) → {Persona natural | Persona jurídica → Organización → **Sedes** → Flotas → Vehículos}. Añadir tipos y resolver login/selección de cuenta/sede.
- **Persona natural:** experiencia simplificada (no elige empresa/sede/flota; estructura personal automática).
- **Viaje:** ampliar con km, paradas, evidencia, estados del Módulo 4 (ver 2.4).
- **Inspección:** plantillas por **tipo de vehículo**; estado "aprobada con observaciones"; inspección postoperacional.
- **Documentos:** del vehículo **y** del conductor; vencimientos → alertas.
- **Expediente del vehículo (§4, Módulo 3):** aún no existe como pantalla; es sobre todo FOM-WEB, pero el conductor ve un subconjunto (ficha + telemetría).

---

## 5. Roles y permisos  →  *centralizar + adaptar*

- **Hoy:** validación de rol **dispersa** (un `Redirect` por pantalla). Modelo de capas acumulativas (Conductor → Operador → Supervisor → Admin Empresa → Admin General → Super Admin).
- **Acción:**
  - **Centralizar** permisos en un solo lugar (helper/guard reutilizable) en vez de checks sueltos.
  - **Crear** el **cambio de contexto del admin** ("Mi conducción ↔ Panel"); un admin que **no conduce** entra **directo al panel** (no a la vista de conductor). *(Este es el ítem que quedó pendiente.)*
  - Operador/Supervisor/Técnico son de FOM-WEB/FOM-TECH (futuro).

---

## 6. FOM-WEB — los paneles actuales  →  *decisión + mapeo*

Los paneles de admin son la **semilla de la consola (Tablero 2, 17 módulos)**. Hoy tenemos, muy en pequeño: Resumen (parte de Módulo 1), mapa de flota (Módulo 2), Flota/usuarios (Módulos 3 y 8), OT (Módulos 5/6), Reportes (Módulo 16), comparar.

- **Corto plazo:** mantenerlos dentro de la app detrás del **cambio de contexto** (§5) y pulir su coherencia.
- **Mediano plazo (decisión §18):** **separar FOM-WEB** como producto **web (React)** propio y dejar esta app solo para conductores. Los 17 módulos se construyen allá, no aquí.
- **Acción de plan:** documentar el mapeo panel→módulo y no crecer los paneles dentro de la app móvil más de lo necesario.

---

## 7. Futuro (no ahora, pero en el radar)

- **FOM-TECH (Tablero 4):** app del técnico — órdenes asignadas, diagnóstico, checklist de reparación, repuestos, evidencias, firma → control de calidad. Reutilizará OT, evidencia y sincronización que ya tenemos.
- **FOM-CONTROL (Tablero 5):** consola interna — tenants, planes, licencias, soporte, "entrar como". Es donde vive el Super Admin.
- **Instalador:** onboarding de GPS/vehículo. Sin documento aún.

---

## 8. Limpieza y deudas transversales

- **Auditar strings** por si queda "Control de Flotas" visible (debe ser FOM). Nota: el propio `DISENO_DIRECCION.md` aún se titula "Control de Flotas" — actualizar los documentos también (§2).
- **MFA** y **selección de cuenta/sede** (login).
- **Trazabilidad (§12):** toda acción registra usuario/fecha/valor anterior-nuevo/motivo (preparar en la capa de servicios).
- **Independencia GPS (§7):** el emparejamiento y la telemetría ya están tras servicios; dejarlos listos para `FOM-GPS-GATEWAY`.

---

## 9. Checklist accionable (por fases)

> Marca aquí a medida que avanzamos. Cada fase remite a la sección de arriba con
> el porqué y el flujo. Convención: `[ ]` pendiente · `[x]` hecho · `[~]` en progreso.
> Todo por la capa de servicios (`TODO API`), respetando `DISENO_DIRECCION.md`.

### Hecho hasta hoy (base FOM-DRIVER)

- [x] Login (FOM), tema por empresa, mostrar/ocultar contraseña
- [x] Navegación por tabs (Inicio · Viajes · Inspección · Alertas · Más)
- [x] Verificación de chip al iniciar sesión (por usuario); José sin chip → aviso "entrar sin chip"; resto directo
- [x] Gate de funciones que dependen del vehículo (inspección, viajes, documentos, reportar)
- [x] Inicio del conductor (saludo, telemetría rápida, jornada, emergencia, sin-chip)
- [x] Inspección preoperacional (checklist, crítica bloquea + OT)
- [x] Viajes + Ruta con vehículo animado
- [x] Emergencia (SOS) con estado "ayuda en camino"
- [x] Alertas (severidad, marcar leída)
- [x] Más: Mensajes, Documentos, Perfil (mi perfil + expediente básico), Sincronización
- [x] Reportar falla (OT) con evidencia
- [x] Offline-first (outbox) con indicador global

### Fase 1 — Cerrar el admin (cambio de contexto)  · *§5*  ✅

- [x] Centralizar permisos/rol en un guard reutilizable (`src/auth/permissions.ts`: `esAdmin`, `puedeConducir`, `esConductorPuro`, `esMultiempresa`); quitados los `role === 'driver'` sueltos
- [x] Cambio de contexto claro **"Mi conducción ↔ Panel de empresa"** (en los encabezados del panel)
- [x] Admin que **no conduce** → entra **directo al panel** (landing por rol en el login)
- [x] Admin que conduce → ve ambas cosas con el cambio de contexto
- [x] El Inicio ya no muestra "No estás en un vehículo" a un admin (no aterriza ahí)

### Fase 2 — Encadenar el flujo maestro del conductor  · *§3*  ✅

- [x] Concepto de **"aptitud del día"** en `driverService` (`getAptitudDelDia`; inspección aprobada habilita el viaje)
- [x] Iniciar viaje **exige inspección aprobada** (Viajes y Ruta lo bloquean; `iniciarViaje` como red de seguridad)
- [x] El Inicio guía el **siguiente paso** (la tarjeta "Próximo viaje" muestra "Tras inspección" / "Bloqueado")
- [~] Bloqueo por inspección crítica → aviso al supervisor + reasignar/esperar (copy listo; la **notificación real** al supervisor queda para la Fase 4)

### Fase 3 — Completar el viaje (Módulo 4)  · *§2.4*  ✅

- [x] Ampliar tipo `Viaje`: **km inicial/final**, **paradas**, **evidencia de entrega**, `inicioReal`
- [x] Estados del viaje: `programado` · `en_curso` · `completado` · `cancelado` (con `cancelarViaje`)
- [x] Registrar **km inicial** al iniciar y **km final** al cerrar (odómetro)
- [x] Registrar **paradas** durante el recorrido (`agregarParada`)
- [x] **Evidencia de entrega** (foto obligatoria) al cerrar
- [x] **Inspección postoperacional** al cerrar (sin novedad / reportar novedad → genera OT)
- Nota: el subconjunto de estados de dispatch (solicitado/aprobado/planificado) es de FOM-WEB (operador), no del conductor.

### Fase 4 — Inspección más completa (Módulo 7)  · *§2.3*  ✅

- [x] Estado intermedio **"aprobada con observaciones"** (falla no crítica deja salir; es apto)
- [x] **Plantilla por tipo de vehículo** (`Vehicle.tipo`; el camión suma "Carga y acople")
- [x] Notificar al supervisor al bloquear (`notificarSupervisor`) + acciones **"Pedir otra unidad" / "Esperar reparación"**
- [x] Inspección **postoperacional** enlazada al cierre del viaje (hecha en la Fase 3)

### Fase 5 — Emergencia como el flujo del documento  · *§2.5*  ✅

- [x] Reordenar: **activar primero** (un toque comparte ubicación) y elegir el tipo dentro del seguimiento
- [x] **Ubicación en vivo** (mapa que sigue el GPS del teléfono) mientras la emergencia está activa
- [x] **Seguimiento bidireccional** con el operador (instrucciones automáticas por tipo + chat)
- [x] **Cierre del caso** ("Marcar como resuelto") y cancelación por falsa alarma

### Fase 6 — Documentos y Alertas por excepción  · *§2.6, §2.7*  ✅

- [x] Documentos **del conductor** (licencia, manejo defensivo, examen médico) + los del vehículo, en secciones; `Documento` con `ambito`
- [x] Vencimientos (`por_vencer`/`vencido`) → **generan alertas** automáticamente
- [x] Alertas como **excepciones reales**: `categoria` (seguridad/mantenimiento/documento/operador) + `enlace` tocable (ej. → Documentos)

### Fase 7 — Multi-tenant en el login  · *§2.1, §4*  ✅

- [x] Tipos **Cuenta/Tenant** (`TenantTipo` natural/jurídica) y **Sede**; `accountService` (contexto de login) + `TenantProvider`
- [x] **MFA** cuando aplica (pantalla `/mfa`, código demo 123456), por usuario
- [x] **Selección de sede** cuando la cuenta jurídica tiene varias (pantalla `/sedes`, admin de una empresa); se muestra en el encabezado del panel
- [x] Flujo de login unificado con `useLoginDestino`: MFA → sede → dashboard, sin bucles
- [~] Selección de **cuenta/empresa** para admin de varias: la cubre el menú de empresas existente
- [~] **Persona natural**: representada (`tipo: 'natural'` → sin selección de sede); falta un usuario natural de ejemplo
- Nota: cablear la **sede** en las consultas de datos (reportes por sede, etc.) queda para cuando exista el backend.

### Fase 8 — Perfil = Expediente del conductor (Módulo 8)  · *§2.7*  ✅

- [x] **Vehículos usados** (ids resueltos a etiquetas legibles)
- [x] **Últimos viajes** (historial del conductor, con `ViajeCard`)
- [x] **OT reportadas** por el conductor (filtradas de las de su empresa, con badge de estado)

### Fase 9 — Vista de conductor integrada al viaje  · *§2.9*  ✅

- [x] `conductor.tsx` muestra el **viaje en curso** (destino, paradas) con **parada rápida** de un toque y "Abrir viaje"
- [x] **Emergencia** y **Reportar falla** como botones grandes en la vista de conducción (DISEÑO §8)

### Deudas transversales  · *§8*

- [ ] Auditar strings visibles: nada dice "Control de Flotas" (debe ser FOM)
- [ ] Actualizar título de `DISENO_DIRECCION.md` ("Control de Flotas" → FOM)
- [ ] Preparar **trazabilidad** en la capa de servicios
- [ ] Dejar telemetría/emparejamiento listos para `FOM-GPS-GATEWAY`; Mensajes → `FOM-REALTIME`; sync → `FOM-MOBILE-SYNC`

### Futuro (otros productos)  · *§6, §7*

- [ ] **Decisión:** cuándo separar **FOM-WEB** como producto web (React)
- [ ] Documentar mapeo panel actual → módulo (de los 17 de FOM-WEB)
- [ ] **FOM-TECH** (app técnico) · **FOM-CONTROL** (consola interna) · **Instalador**

### Decisiones abiertas  · *brief §18*

- [ ] Nombre comercial · Google Maps vs Apple Maps · creación de usuarios/credenciales
- [ ] Compra/activación de paquetes (vía FOM-CONTROL) · contrato de datos con Juan Pacheco

> Cada tarea se hace por pantalla: terminar → mostrar → confirmar → seguir, sin
> romper lo que ya funciona, y todo a través de la capa de servicios.
