# Roles y administración global — 30 de septiembre de 2026

## Estado de la web

El administrador FOM entra a **Toda la plataforma** (`/panel/admin/plataforma`). Allí puede filtrar por empresa, buscar personas, crear usuarios en una empresa elegida y solicitar un cambio de rol sobre una membresía concreta. **Gente** sigue siendo el directorio de la empresa del supervisor; el administrador FOM ya no ve los módulos operativos de esa empresa en su menú.

El cambio de rol identifica expresamente usuario y empresa. La pantalla no permite cambiar el propio rol, una membresía revocada ni el rol de otro administrador FOM. El servidor permite administrar supervisor, conductor y usuario; `admin_fom` no es un rol otorgable por ese directorio. La opción obsoleta Operador no aparece en los formularios.

El reemplazo del conductor principal revoca la asignación anterior y después crea la nueva. Si la segunda operación falla, intenta restaurar la anterior. Es un flujo de dos operaciones y no es atómico en el servidor.

## Backend y publicación

La API explícita para otra empresa está en [fom-core PR #557](https://github.com/juancpachecog/fom-core/pull/557), todavía en borrador. Añade `POST /api/v1/console/tenants/:tenantId/users` y `PATCH /api/v1/console/tenants/:tenantId/users/:userId`, reservados al administrador FOM. Reutiliza las comprobaciones de alcance, jerarquía y auditoría del servicio existente. Pasaron `Validate backend` y `Validate real MQTT authentication`; no hay migración para estas dos rutas.

La publicación web `ops/deploy-20260930-global-admin` está empaquetada y verificada en el servidor, **sin activar**. Primero hay que revisar, integrar y desplegar la PR del backend; después activar la web con el procedimiento de publicación del servidor y hacer una prueba autenticada de cambio de rol entre empresas. La sesión SSH de automatización no tiene `sudo` sin contraseña. La web pública sigue sirviendo la publicación anterior.

## Límite arquitectónico pendiente

La identidad de `admin_fom` todavía requiere exactamente una membresía activa para iniciar sesión. El backend también usa esa membresía en auditoría y en módulos que asumen un `tenantId` del actor. Por eso el administrador se presenta como global en la interfaz y puede elegir empresa en las operaciones nuevas, pero **aún no es una cuenta físicamente sin empresa**. Quitar su membresía hoy impediría el inicio de sesión y rompería auditoría. Resolverlo requiere cambiar de forma coordinada la autenticación, el contexto del actor, auditoría y los módulos dependientes; no se debe simular con un cambio de texto ni borrar membresías en producción.

Los módulos administrativos GPS y auditoría todavía necesitan revisión de alcance para una identidad sin tenant. Tampoco existe en este directorio un flujo autorizado para otorgar `admin_fom` a otra persona. Estas dos capacidades no están terminadas.

No se modificó ningún rol real ni la asignación de un vehículo operativo durante la preparación de este cambio.
