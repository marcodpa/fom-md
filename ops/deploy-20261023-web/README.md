# Publicación preparada — 23 de octubre de 2026

Web y panel con todo lo de hoy (T-133 a T-137): escena de teléfonos sobre el fondo de la página,
microinteracciones, texto mínimo 13 px, más aire entre secciones, foco redondeado, arreglos de
la revisión (hoja de la empresa validada, impresión aislada, mapa de flota sin tirones, caché por
usuario y empresa, filtro de fecha a medianoche). Reemplaza al paquete del 22 oct.

Solo cambia la carpeta de la web en Nginx. No toca la API, la base de datos, certificados ni
red. Funciona sea cual sea la web activa. Si algo falla, restaura la configuración anterior sola.

Release nuevo: `/var/www/fom-web/releases/20261023-web` (no debe existir antes de activar).

## Subir (desde la carpeta de fom, en Windows, con la VPN encendida)

```
tar -cf ops/deploy-20261023-web.tar -C ops deploy-20261023-web
ssh -i infra\fom-app fomadmin@10.20.30.10 "mkdir /home/fomadmin/subida-20261023-r1"
scp -i infra\fom-app ops/deploy-20261023-web.tar fomadmin@10.20.30.10:/home/fomadmin/subida-20261023-r1/
ssh -i infra\fom-app fomadmin@10.20.30.10 "cd /home/fomadmin/subida-20261023-r1 && sha256sum deploy-20261023-web.tar && tar -xf deploy-20261023-web.tar && cd deploy-20261023-web && sha256sum --quiet -c SHA256SUMS && echo PAQUETE_OK"
```

## Activar (pide la clave de sudo)

```
ssh -t -i infra\fom-app fomadmin@10.20.30.10 "sudo bash /home/fomadmin/subida-20261023-r1/deploy-20261023-web/activate-publication.sh"
```

Debe terminar con `FOM_WEB_PUBLISHED`. Si sale `FOM_WEB=FAIL`, la web anterior queda activa.
Después: https://15.204.105.201/ (puerto 443, el normal de HTTPS) y recargar con Ctrl+F5.

## Volver atrás

Respaldo en `/var/backups/fom-web/20261023-web-*` (incluye `raiz-anterior.txt`): copiar ese
`fom-mobile.conf` sobre `/etc/nginx/sites-available/fom-mobile.conf`, `sudo nginx -t` y
`sudo systemctl reload nginx`.
