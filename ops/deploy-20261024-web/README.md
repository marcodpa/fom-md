# Publicación preparada — 24 de octubre de 2026

Web y panel al día (commit `02c6030`). Reemplaza al paquete del 23 oct, que no se llegó a activar,
así que trae también todo lo que iba en él (T-133 a T-138) más lo nuevo:

- **T-150 / T-151 Manejo brusco:** fuera el botón de toda la flota en el Centro de control (queda
  «Ver manejo brusco» en la ficha de la unidad) y ya no sale el error «Ese recurso no existe» cuando
  la persona ya no es conductor activo (se ve una nota gris).
- **T-152 y T-158 Panel en teléfono igual a la app:** colores, barras, títulos y tarjetas de la app;
  íconos de las pestañas, encabezado del conductor, botón Reporte, Usuarios con cifras y filas de la
  app, Vehículos sin zoom con MAPA/SAT, «Asignadas a ti» y punto en línea en Mi perfil.
- **T-139 a T-149:** frases nuevas en Qué ofrecemos y página «App» (T-139); inicio del conductor
  como «Mi unidad» (T-140); laptop que se abre con el panel real (T-141); sección completa de
  Inspecciones (T-143); escenas en su sitio: televisor, monitores, aviso y cabina (T-142, T-144,
  T-149); hero de Quiénes somos (T-145); panel en teléfono de conductor y supervisor (T-146);
  datos de demo más realistas (T-147); Áreas rediseñada (T-148); laptop de aluminio con el logo (T-149).

Solo cambia la carpeta de la web en Nginx. No toca la API, la base de datos, certificados ni
red. Funciona sea cual sea la web activa. Si algo falla, restaura la configuración anterior sola.

Release nuevo: `/var/www/fom-web/releases/20261024-web` (no debe existir antes de activar).

## Subir (desde la carpeta de fom, en Windows, con la VPN encendida)

```
tar -cf ops/deploy-20261024-web.tar -C ops deploy-20261024-web
ssh -i infra\fom-app fomadmin@10.20.30.10 "mkdir /home/fomadmin/subida-20261024-r1"
scp -i infra\fom-app ops/deploy-20261024-web.tar fomadmin@10.20.30.10:/home/fomadmin/subida-20261024-r1/
ssh -i infra\fom-app fomadmin@10.20.30.10 "cd /home/fomadmin/subida-20261024-r1 && sha256sum deploy-20261024-web.tar && tar -xf deploy-20261024-web.tar && cd deploy-20261024-web && sha256sum --quiet -c SHA256SUMS && echo PAQUETE_OK"
```

## Activar (pide la clave de sudo)

```
ssh -t -i infra\fom-app fomadmin@10.20.30.10 "sudo bash /home/fomadmin/subida-20261024-r1/deploy-20261024-web/activate-publication.sh"
```

Debe terminar con `FOM_WEB_PUBLISHED`. Si sale `FOM_WEB=FAIL`, la web anterior queda activa.
Después: https://15.204.105.201/ (puerto 443, el normal de HTTPS) y recargar con Ctrl+F5.

## Volver atrás

Respaldo en `/var/backups/fom-web/20261024-web-*` (incluye `raiz-anterior.txt`): copiar ese
`fom-mobile.conf` sobre `/etc/nginx/sites-available/fom-mobile.conf`, `sudo nginx -t` y
`sudo systemctl reload nginx`.
