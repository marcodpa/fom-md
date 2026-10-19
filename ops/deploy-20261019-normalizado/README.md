# Publicación preparada — 19 de octubre de 2026

Web con el diseño FOM normalizado (T-33 a T-36), mínimo de clave 16 y el trabajo
de perfiles, expediente de unidad, transferencias, GPS y credenciales.
Commit de la web: `e0d945e` (rama `codex/rediseno-v6-fiel` en marcodpa/fom-md).

**Estado: subida y verificada en el servidor, pendiente de activar con sudo.**
El paquete está en `/home/fomadmin/deploy-20261019-normalizado` de `fom-app-01`; sus
190 archivos coinciden con `SHA256SUMS`. La web activa sigue siendo
`releases/20261006-apariencia-ordenes-v2`.

Solo cambia la raíz de la web en Nginx. No toca la API, la base de datos ni los
contenedores. Si algo falla, restaura la configuración anterior sola.

## Activar

Desde PowerShell en `C:\Users\home\Downloads\fom`:

```powershell
ssh -t -i infra/fom-app fomadmin@10.20.30.10 "sudo bash /home/fomadmin/deploy-20261019-normalizado/activate-publication.sh"
```

Escribir la contraseña de sudo cuando la pida. Debe terminar con `FOM_WEB_PUBLISHED`.
Si sale `FOM_WEB=FAIL`, la web anterior queda activa; guardar la salida.

Después abrir https://15.204.105.201/ y recargar con Ctrl+F5.

## Para volver atrás

El script deja un respaldo de la configuración en `/var/backups/fom-web/20261019-normalizado-*`.
Copiar ese `fom-mobile.conf` sobre `/etc/nginx/sites-available/fom-mobile.conf`,
`sudo nginx -t` y `sudo systemctl reload nginx`.
