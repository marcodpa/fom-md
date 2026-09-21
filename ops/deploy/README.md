# Publicación de la web FOM — 21 de septiembre de 2026

Destino: `https://15.204.105.201`. El servidor ya tiene un certificado TLS válido.
Estado: **publicada y verificada el 21 de septiembre de 2026 a las 18:07 UTC**.
El primer intento restauró la configuración original. Se reprodujo un fallo de
sincronización: inmediatamente después de recargar, Nginx todavía respondía 404;
500 ms después, la nueva configuración ya respondía 200. El script corregido
espera el HTML exacto de la nueva versión antes de evaluar el resultado. Reutiliza
los archivos instalados únicamente tras verificar sus huellas y crea un respaldo
nuevo para cada intento. Tras la segunda activación, la raíz pública responde 200.

## Activación

Desde una terminal de `fom-app-01` con acceso administrativo:

```bash
sudo bash /home/fomadmin/fom-web-publication-20260921/activate-publication.sh
```

El usuario ejecutó la activación con sudo. No se modificaron los privilegios;
la configuración activa sirve ahora la web y mantiene las rutas existentes de API.

El script comprueba las huellas de los archivos y el estado original de Nginx,
instala exclusivamente `dist` en una versión bajo `/var/www/fom-web/releases`,
respalda la configuración, valida Nginx y recarga el servicio. Verifica la portada,
una ruta profunda, la frontera de autenticación, el bloqueo de rutas internas y
la salud de la API. Restaura la configuración anterior si falla la activación.
No ejecuta migraciones ni reinicia los contenedores de la API.

## Conexión y alcance

- Compilación con `VITE_FOM_API=/fom-api`.
- HTTP redirige a HTTPS en la IP pública; el desafío ACME existente se conserva.
- `/fom-api/api/v1/console/*` reutiliza las rutas y límites existentes de la consola.
- Las cookies HttpOnly viajan directamente entre cada navegador y la API.
- El proxy de desarrollo y su sesión compartida no se publican.
- Las rutas móviles, certificados y configuración de base de datos se conservan.
- Los endpoints internos y archivos ocultos no quedan publicados.
- Mi perfil conserva las limitaciones descritas en `output/design-review/MI-PERFIL.md`.

## Verificación realizada

- `npm run build`: correcto; 100 módulos.
- `npm test`: 12 pruebas aprobadas.
- No se encontraron los valores privados del servidor en los assets compilados.
- Los 14 archivos de `dist` y la configuración candidata coinciden por SHA-256
  entre el equipo local y el servidor.
- Sintaxis del script Bash y de la configuración Nginx de prueba: correctas.
- Una instancia temporal de Nginx, ligada solo a loopback y detenida al terminar,
  sirvió `/`, `/entrar`, `/panel/mi-perfil` y `/panel/admin/gps` con HTTP 200.
- La sesión anónima devolvió 401 y la salud de la API 200.
- El endpoint interno, `/.env` y un asset inexistente devolvieron 404.
- Verificación pública posterior: portada y ruta profunda HTTP 200, HTTP redirige
  a HTTPS con 308, sesión anónima 401, salud 200 y rutas internas/`.env` 404.
- El HTML público coincide exactamente con el build verificado.
- Se abrió la portada pública en el navegador y se comprobó que entrar directamente
  a `/panel/mi-perfil` sin sesión redirige a `/entrar`, con el formulario visible.
- No se realizó un inicio de sesión con credenciales reales en el sitio publicado.

## Archivos

`fom-mobile.before.conf` conserva el punto de partida de Nginx;
`prepare-publication.mjs` genera `fom-mobile.after.conf` con las rutas nuevas.
`activate-publication.sh` aplica el cambio con respaldo.
`SHA256SUMS` identifica el paquete subido. `qa-nginx.conf` se usó únicamente
para las comprobaciones locales al servidor, sin TLS y sin exposición pública.

Respaldo del primer intento: `/var/backups/fom-web/20260921-redesign-v1/fom-mobile.conf`.
Los nuevos respaldos añaden fecha, hora y PID al nombre de directorio.
Versión prevista: `/var/www/fom-web/releases/20260921-redesign-v1`.
