# BD provisional en Supabase — guía de puesta en marcha

> Base de datos de PRUEBAS para depurar la app con datos y validaciones reales.
> Cuando exista la BD final, se apunta la app a ella y esta se descarta. El
> esquema cubre TODO el dominio FOM-02 que la app maneja hoy en mocks.

## 1 · Crear el proyecto (5 minutos)

1. Entra a [supabase.com](https://supabase.com) → **New project** (el plan Free basta).
2. Elige nombre (ej. `fom-flotas-dev`), región cercana y una contraseña de BD (guárdala).
3. Cuando el proyecto esté listo: **SQL Editor** → **New query**.

## 2 · Correr las migraciones (en orden)

1. Pega el contenido de [`supabase/migrations/0001_esquema.sql`](supabase/migrations/0001_esquema.sql) y ejecuta (**Run**).
2. Pega el contenido de [`supabase/migrations/0002_seed.sql`](supabase/migrations/0002_seed.sql) y ejecuta.
   - El bloque A crea los usuarios del elenco en `auth.users` con la clave de
     demo `Flotas2026..`. Si tu versión de Supabase rechaza esos inserts,
     créalos a mano en **Authentication → Users → Add user** (mismos emails,
     "Auto confirm" activado) y vuelve a correr el seed **desde el bloque B**:
     todo lo demás se resuelve por email, no por UUID.

## 3 · Conectar la app

1. **Settings → API**: copia la **Project URL** y la **anon public key**.
2. En la raíz del repo: copia `.env.example` a `.env` y pega ambos valores.
3. Reinicia el dev server: `npx expo start -c`.

El cliente vive en [`src/lib/supabase.ts`](src/lib/supabase.ts). Sin `.env`, la
app sigue funcionando en modo mock (no se rompe nada); con `.env`, el cliente
queda listo para que los servicios se conecten.

## 4 · Qué cubre el esquema

| Dominio | Tablas |
|---|---|
| Empresas y asignación a predefinidas | `empresas`, `empresa_predefinidas` |
| Personas (6 roles, perfil obligatorio) | `perfiles` (1:1 con `auth.users`), `supervisor_predefinidas` |
| Estructura | `areas` (ubicación/sector/contrato) |
| GPS y vehículos | `gps` (IMEI único), `vehiculos` (GPS obligatorio y verificado) |
| Titularidad | `conductores_secundarios` (PIN), `sesiones_uso` |
| ODT | `odts` (3 estados, tipo, cierre completo, autor vía) |
| Inspección diaria | `inspeccion_items` (plantilla), `inspecciones`, `inspeccion_respuestas` |
| Reglas de alerta | `reglas_alerta`, `regla_vehiculos` (contador por vehículo) |
| Notificaciones in-app | `notificaciones` |
| Documentos con vencimiento | `documentos` (vehículo y persona) |
| Alertas del conductor | `alertas_conductor` |
| Auditoría (solo Admin) | `auditoria` |

**Validaciones de proceso en la BD** (triggers, no solo en la app):

- No existe vehículo sin GPS **verificado** (§1.2) · IMEI único (§8-4).
- Al **cerrar** una ODT se fija `resuelta_en`; al reabrir se limpia (§3.3).
- Cerrar una ODT **preventiva** reinicia el contador de su regla (§3.4).
- ODT nueva → **notificación** automática al panel de su empresa (§3.3).
- Secundarios solo en unidades cuyo GPS **soporta PIN** (§3.5).

**RLS (seguridad por fila)**: el Admin ve todo; cada supervisor/conductor solo
su empresa; el supervisor de predefinida SOLO LECTURA de sus empresas asignadas
(§2.1); la auditoría es exclusiva del Admin (§1.3). El backend (service_role)
la ignora, la app (anon key + sesión) la respeta.

## 5 · Usuarios iniciales (regla del producto)

El sistema nace SOLO con los 3 desarrolladores como **admin FOM** (ven y
administran todo). Todos los demás usuarios los crean ellos desde la **Consola**
de la app, eligiendo el perfil (conductor / supervisor / general) y la empresa
— eso define qué vista y qué permisos tiene cada quien.

| Email | Rol |
|---|---|
| `jguerracaldera@gmail.com` (Juan Guerra) | admin |
| `marcodpacheco@gmail.com` (Marco Pacheco) | admin |
| `juancpachecog@gmail.com` (Juan Pacheco) | admin |

Pasos: crearlos en **Authentication → Add user** (✅ Auto Confirm, clave
`Flotas2026..`) y correr `0002_seed.sql`, que les asigna el rol admin por email.

## 5b · Edge Function `crear-usuario` (creación de cuentas desde la app)

Crear cuentas requiere la llave de servicio, que NUNCA va en la app: vive en
esta función del servidor (`supabase/functions/crear-usuario/index.ts`). La
función valida QUIÉN llama (admin FOM = cualquier perfil y empresa; supervisor
= solo conductores de su empresa) y crea el usuario confirmado con su clave.

**Desplegarla (opción fácil, desde el dashboard):**
1. supabase.com → tu proyecto → **Edge Functions** (ícono ⚡ en la barra).
2. **"Deploy a new function"** → método **"Via Editor"**.
3. Nombre: `crear-usuario` (exacto, con guion).
4. Borra el código de ejemplo, pega TODO el contenido de
   `supabase/functions/crear-usuario/index.ts` y toca **Deploy**.

(Alternativa por terminal: `npx supabase login`, `npx supabase link`,
`npx supabase functions deploy crear-usuario`.)

Sin la función desplegada, "Crear usuario" en la app mostrará un error claro;
todo lo demás sigue funcionando.

## 6 · Siguiente paso (cuando confirmes que la BD responde)

Conectar servicio por servicio: cada función de `src/services/*` tiene su
cuerpo marcado `TODO API`; se reescribe con `supabase.from('tabla')...` sin
tocar pantallas ni tipos. Orden sugerido: auth → empresas/perfiles → vehículos
→ ODT → inspección → reglas/notificaciones. La app cae a mocks automáticamente
si `.env` no está, así que la migración puede ser gradual y sin riesgo.
