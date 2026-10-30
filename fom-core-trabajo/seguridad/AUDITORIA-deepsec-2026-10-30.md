# Auditoría de seguridad FOM — 30 oct 2026

Herramienta: deepsec 2.3.10 (vercel-labs/deepsec), solo escaneo de patrones (gratis, sin IA de pago).
Revisión de los candidatos hecha a mano por revisores de código. Nada se modificó.

Alcance: panel web (`fom`), app (`fom-driver-juan`), servidor (`fom-core`, origin/main al 30 oct).
Escaneo: ~2.700 coincidencias → 286 candidatos útiles → los de abajo son los reales.

## Alta

1. **Clave por defecto `Flot…` escrita en el código público y en la web publicada.**
   `src/panel/datos/catalogos.js:204` (`CLAVE_POR_DEFECTO`), también en el bundle `dist/` y en copias
   bajo `.claude/worktrees/`. Quien la lea puede probarla con los correos de administradores.
   Arreglo: rotar la clave en todas las cuentas que la usen; cambiar la constante por un texto no real
   (solo la usa el modo demo, `repoSemilla.js`). El historial de git ya la tiene: rotar sí o sí.

2. **Subidas a Cloudinary sin firma, con el nombre del archivo elegido por el cliente.**
   Web `src/panel/datos/cloudinary.js:385-454`, app `src/lib/cloudinary.ts:595`.
   La nube y el preset `fom_web` están en la app y en la web. Con eso cualquiera puede subir
   `fom/persona/<id>/cedula/frente/<n+1>` y reemplazar la foto «vigente» (cédula, licencia, logo,
   foto de unidad, evidencia de ODT). Las lecturas son públicas.
   Arreglo: que fom-core firme las subidas (`public_id` fijo, `overwrite=false`); mientras tanto
   restringir el preset en Cloudinary (carpeta, formatos, tamaño) y servir documentos como `authenticated`.
   A confirmar: configuración actual del preset.

## Media

3. **Login sin límite por IP** (`src/authentication/auth-session.service.ts:83-103`). Solo bloquea por
   cuenta: permite probar una clave contra muchos correos y bloquear a propósito la cuenta del admin.
   Arreglo: límite por IP y por correo (`@nestjs/throttler` o nginx) en los login de consola y móvil.

4. **Proxy de gps-web se sale de su prefijo con `..`**
   (`apps/gps-web/app/api/core/[...path]/route.ts:15-18`, igual en `api/maps/[...path]`).
   Con `curl --path-as-is` y `%2e%2e` se llega a otras rutas del backend con el token interno.
   Arreglo: rechazar segmentos `.`, `..` o vacíos y comprobar el prefijo final.

## Para confirmar en producción (Juan)

- `FOM_MAP_IDENTITY_MODE` no debe ser `sites`: en ese modo el usuario sale de una cabecera sin verificar
  (`apps/gps-web/app/api/identity.js:43`) y cualquiera podría hacerse pasar por el admin.
- `FOM_MAP_INTERNAL_AUTH_TOKEN`: con ella más un correo se actúa como cualquier usuario. Rotarla si
  alguna vez se compartió, y que `/gps-console-internal` no se alcance desde fuera.
- `photoObjectId` / `logoObjectId` se guardan sin comprobar que el archivo sea de la misma empresa.
- `isTrustedBrowserMutation` (`apps/gps-web/app/api/auth/security.js:24`) no compara el Origin con el propio.
- App: el enlace de recuperar clave usa el esquema `controlflotas://`, que otra app de Android puede registrar.
- App: funciones Supabase heredadas (`supabase/functions/administrar-usuario`) dejan a un supervisor
  cambiar roles y correos; comprobar si siguen desplegadas y, si no, borrarlas.

## Baja

- Token Mapbox `pk.` en la app y la web (normal): limitar sus permisos y vigilar el consumo.
- IP del receptor GPS visible en la web (no es secreta).

## Limpio

SQL (todo parametrizado), JWT y cookies, redirecciones, workflows de GitHub, `spawn`, SSRF de mapas,
HTML de mapas y PDF (escapado), tokens de la app (SecureStore), cuentas demo (no van al bundle publicado).
