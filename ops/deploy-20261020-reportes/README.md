# Publicación preparada — 20 de octubre de 2026

Reemplaza al paquete del 19 oct (ops/deploy-20261019-normalizado): trae además Reportes nuevo,
PDF A4, la web en el teléfono igual a la app y el formato IOGP listo para publicar.
Commit de la web: `b55c722` (rama `codex/rediseno-v6-fiel` en marcodpa/fom-md).

**Estado: subida y verificada en el servidor (190 archivos contra SHA256SUMS), pendiente de
activar con sudo.** Está en `/home/fomadmin/deploy-20261020-reportes` de `fom-app-01`. La web
activa sigue siendo `releases/20261006-apariencia-ordenes-v2`.

Solo cambia la raíz de la web en Nginx. No toca la API, la base de datos ni los contenedores.
Si algo falla, restaura la configuración anterior sola.

## Activar

En fom-app-01:

```bash
sudo bash /home/fomadmin/deploy-20261020-reportes/activate-publication.sh
```

Debe terminar con `FOM_WEB_PUBLISHED`. Si sale `FOM_WEB=FAIL`, la web anterior queda activa.
Después abrir https://15.204.105.201/ y recargar con Ctrl+F5.

## Volver atrás

Respaldo de la configuración en `/var/backups/fom-web/20261020-reportes-*`: copiar ese
`fom-mobile.conf` sobre `/etc/nginx/sites-available/fom-mobile.conf`, `sudo nginx -t` y
`sudo systemctl reload nginx`.
