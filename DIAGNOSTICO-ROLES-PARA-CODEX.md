# Diagnóstico de roles y permisos: app control-flotas frente a fom-core

Documento para el asistente de Juan (Codex). Autocontenido: no requiere abrir
ninguna URL. Fecha: 2026-08-26. Autor: Claude (sesión de Marco).

Fuentes leídas: `JuanPablo-1810/control-flotas` (copia local en
`C:\Users\home\Downloads\fom\control-flotas-main`), `juancpachecog/fom-core`
(rama `feature/console-directory`, PR #199) y la web FOM en
`C:\Users\home\Downloads\fom`.

---

## 1. Hallazgo crítico: escalamiento de privilegios en la web

`src/panel/auth.js:33-40` traduce los roles heredados así:

    const ROL_CANONICO = {
      owner: 'admin_fom',          // <-- INCORRECTO
      administrator: 'supervisor',
      fleet_manager: 'supervisor',
      operator: 'conductor',       // <-- INCORRECTO
      viewer: 'usuario',
      admin: 'admin_fom',          // <-- valor inexistente en la base
    }

`fom.canonical_membership_role()`
(`src/database/migrations/files/20260818090000000_create_identity_and_organization.ts:396-411`)
traduce:

    owner         -> supervisor
    administrator -> supervisor
    fleet_manager -> supervisor
    operator      -> operator     (se preserva a propósito)
    viewer        -> usuario

Consecuencias:

1. `esAdminFom()` (`src/panel/auth.js:245`) sólo compara contra `admin_fom`.
   Con `owner -> admin_fom`, cualquier `owner` de cualquier tenant abre la
   capa de administración de plataforma en la web (AdminUsuarios,
   AdminEmpresas, AdminGps, AdminPagos, AdminAuditoria). Un `owner` es dueño
   de SU ente, no de todos.
2. Hoy el daño está contenido porque `/api/v1/console` es de sólo lectura y
   el tenant se deriva en el servidor. Al conectar las escrituras del
   directorio (PR #199) deja de estarlo.
3. `operator -> conductor` contradice la decisión explícita de la base: el
   operador telemático atiende la consola, no conduce; el hecho de conducir
   vive en `fom.vehicle_driver_assignments`, no en el rol.
4. `admin` no pertenece al CHECK de `fom.tenant_memberships`
   (`admin_fom|supervisor|conductor|usuario` más el legado
   `owner|administrator|fleet_manager|operator|viewer`).

Corrección propuesta: el alcance global proviene EXCLUSIVAMENTE de (a) el rol
canónico `admin_fom`, o (b) la capacidad `platformAdmin`, que ya resuelve
`ActorContextService` desde `fom.map_platform_administrators`
(`src/authentication/actor-context.service.ts:82-85`). Los cinco roles
heredados se traducen exactamente igual que en la base. Se añadirán pruebas
que fijen que `owner`, `administrator`, `fleet_manager`, `operator` y
`viewer` nunca resultan en administrador FOM.

---

## 2. Correspondencia de modelos (Supabase -> fom-core)

| Concepto en la app | Equivalente en fom-core | Estado |
|---|---|---|
| `perfiles.rol` (5 roles en una tabla) | `tenant_memberships.role` por ente + `map_platform_administrators` para lo global | existe |
| `empresas.tipo`: estandar / predefinida / personal | `tenants.category`: `contratista` / `compania` / `personal` | existe |
| `empresa_predefinidas` (M:N) | `tenant_relationships` (`company_tenant_id`, `contractor_tenant_id`, `started_at`, `ended_at`) | existe |
| Alcance del supervisor de compañía | Vista `fom.actor_tenant_scope`: `scope_kind` `home` y `contractor`, sólo para `admin_fom`/`supervisor`, escrituras sólo sobre `home` | existe |
| `perfiles.perfil_completo` | `user_profiles.profile_completed_at` (más `national_id`, `phone`, `address`, `birth_date`) | existe |
| Licencia y carta médica | `user_credentials` (`kind`, `number`, `category`, `expires_at`, `superseded_at`) | existe |
| Clave (Supabase Auth) | `user_password_credentials` Argon2id más `must_change_password` | existe |
| `conduce` (bandera) | `vehicle_driver_assignments` (hecho con vehículo, rol principal/secundario, PIN hasheado y vigencia) | existe |
| "Desempleados C.A." (ente de respaldo al eliminar) | Sin equivalente: la membresía se revoca (`status`, `revoked_at`) y la persona queda sin ente | DECIDIR |
| Persona en varios entes | Las membresías lo permiten, pero la sesión de consola rechaza a quien tenga más de una activa en vez de elegir por él | DECIDIR |

---

## 3. Mapa de roles propuesto

Un rol de la app equivale al par (rol canónico de FOM, categoría del ente):

| Rol app | Rol fom-core | Categoría de ente | Etiqueta | Rango |
|---|---|---|---|---|
| `admin` | `admin_fom` o `platformAdmin` | cualquiera (global) | Administrador FOM | 4 |
| `supervisor_company` | `supervisor` | `compania` | Supervisor | 3 |
| `supervisor_company` | `supervisor` | `contratista` | Administrador | 3 |
| `supervisor_personal` | `supervisor` | `personal` | Supervisor | 3 |
| `conductor` | `conductor` | `contratista` | Conductor | 1 |
| `usuario_personal` | `usuario` | `personal` | Usuario | 1 |
| (sin equivalente en la app) | `operator` (heredado) | `contratista` | Operador | 1 |

---

## 4. Estado de las quince reglas obligatorias

| # | Regla | Dónde vive | Estado |
|---|---|---|---|
| 1 | `admin` crea perfiles en cualquier ente | El alta ocurre siempre en el ente del actor | POR CONSTRUIR |
| 2 | `admin` nunca se asigna desde el formulario | `ROLES_OTORGABLES` sin `admin_fom`, con prueba | HECHO |
| 3 | Supervisor de estándar: sólo conductores de su empresa | Hoy un gestor puede otorgar cualquier rol no-supervisor en su ente | POR CONSTRUIR |
| 4 | Supervisor de predefinida alcanza a sus asociadas | `actor_tenant_scope` ya lo calcula; la superficie no lo usa | POR CONSTRUIR |
| 5 | `supervisor_personal` sólo en su cuenta | Se cumple por el ente del actor | PARCIAL |
| 6 | Predefinida no admite conductores | Trigger `maintain_tenant_membership_record` | EN LA BASE |
| 7 | Personal sólo admite `supervisor` y `usuario` | Mismo trigger | EN LA BASE |
| 8 | Roles personales no caben en otros entes | Mismo trigger | EN LA BASE |
| 9 | Jerarquía admin=4, supervisores=3, conductor/usuario=1 | Existe en la web (`src/panel/datos/catalogos.js`); no en el servidor | POR CONSTRUIR |
| 10 | Nadie se gestiona a sí mismo ni a iguales o superiores | Sin equivalente en el servidor | POR CONSTRUIR |
| 11 | Validación en backend dentro de la transacción | El alta es transaccional; faltan dentro 1, 3, 4, 9 y 10 | PARCIAL |
| 12 | Alta con datos mínimos; el resto al primer ingreso | `user_profiles` y `user_credentials` ya modelan el resto | PARCIAL |
| 13 | Nace con perfil incompleto y obligación de completarlo | `profile_completed_at` nulo más `must_change_password`; falta que la sesión lo exija | POR CONSTRUIR |
| 14 | Contraseña nunca en claro, ni en listados ni en registros | Argon2id; listados sin la columna; prueba runtime real | HECHO |
| 15 | Alta atómica y auditable | Transacción, autoría inmutable y `fom.audit_log` | HECHO |

---

## 5. Superficie propuesta bajo `/api/v1/console`

| Ruta | Función | Autorización |
|---|---|---|
| `GET /scope/tenants` | Entes alcanzables por el actor, con su categoría (alimenta el selector) | gestor |
| `GET /users` | Directorio del alcance completo, paginado, filtros por texto, ente y rol, orden determinista | gestor |
| `POST /tenants/:tenantId/users` | Alta: nombre, apellido, correo, teléfono, clave inicial, perfil | reglas 1, 3, 4, 5 |
| `PATCH /users/:userId` | Cambiar rol, mover de ente, revocar | rango estrictamente mayor (reglas 9 y 10) |
| `POST /auth/password` | Cambio inicial obligatorio (ya implementado en PR #199) | su dueño |
| `POST /auth/profile` | Completar cédula, dirección, nacimiento, licencia y carta médica | su dueño |

---

## 6. Dos decisiones que bloquean la implementación

### 6.1 Ente destino en las altas

El contrato del Issue #202 exige que ningún DTO acepte `tenantId`. Las reglas
1 y 4 exigen crear usuarios en un ente distinto al del actor.

Propuesta: el ente destino viaja en la RUTA
(`POST /api/v1/console/tenants/:tenantId/users`), nunca en el cuerpo, y el
servidor lo valida contra `fom.actor_tenant_scope` antes de cualquier
escritura; un ente fuera del alcance responde 404 uniforme, igual que hoy
responde lo ajeno. Así se conserva la regla donde importa (nadie DECLARA su
tenant) y el alcance real del producto queda expresable.

Pregunta: ¿se acepta esta forma, o se prefiere otra?

### 6.2 Baja de una persona

La app mueve al usuario a un ente de respaldo ("Desempleados C.A.") para que
una recontratación no obligue a crear otra cuenta. fom-core revoca la
membresía y la persona queda sin ninguna; el efecto sobre la cuenta es el
mismo, pero la sesión de consola hoy rechaza a quien no tiene membresía
activa.

Pregunta: ¿se replica el ente de respaldo, o basta la revocación de membresía?

---

## 7. Plan de trabajo propuesto (sin tocar producción)

1. Corregir `ROL_CANONICO` en `src/panel/auth.js` y añadir pruebas de
   no-escalamiento para los cinco roles heredados.
2. Llevar las reglas 1, 3, 4, 9 y 10 al servidor, dentro de la transacción
   del alta, apoyándose en `fom.actor_tenant_scope`.
3. Exigir perfil completo igual que ya se exige el cambio de clave inicial.
4. Conectar la pantalla: reemplazar el bloque `sinRespaldo` de
   `admin.usuarios` en `src/panel/datos/repo.js:80` por las rutas reales, y
   ajustar el formulario de `src/panel/modulos/AdminUsuarios.jsx` a los
   campos del alta (nombre, apellido, correo, teléfono, clave inicial, ente,
   perfil).
5. Pruebas: autorización por rol, compatibilidad rol/ente, alcance sobre
   asociadas, duplicados, reversión transaccional, aislamiento entre entes y
   escalamiento de privilegios, ejecutadas contra PostgreSQL real, no sólo
   con comprobaciones de texto.
6. Entregar informe de archivos cambiados, contratos, pruebas y migraciones.

Restricciones respetadas: no se toca producción, no se ejecutan migraciones
productivas, no se despliega y no se alteran tablas a mano.
