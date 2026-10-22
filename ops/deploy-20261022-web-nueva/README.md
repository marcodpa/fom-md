# Publicación preparada — 22 de octubre de 2026

Web nueva estilo Apple (11 páginas en las rutas reales: /, /plataforma, /app, /funciones,
/seguridad, /areas, /quienes-somos, /que-ofrecemos, /beneficios, /preguntas-frecuentes, /contacto)
y el panel con todo lo de esta semana (mapa, manejo brusco, sin señal, GPS, mantenimiento,
reportes con tablero, empresas grandes). Reemplaza a los paquetes del 19, 20 y 21 oct.

Solo cambia la carpeta de la web en Nginx. No toca la API, la base de datos, certificados ni
red. Funciona sea cual sea la web activa. Si algo falla, restaura la configuración anterior sola.

## Subir (desde la carpeta de fom, en Windows, con la VPN encendida)

```
tar -cf - -C ops deploy-20261022-web-nueva | ssh -i infra\fom-app fomadmin@10.20.30.10 "tar -xf - -C /home/fomadmin"
```

## Activar (pide la clave de sudo)

```
ssh -t -i infra\fom-app fomadmin@10.20.30.10 "sudo bash /home/fomadmin/deploy-20261022-web-nueva/activate-publication.sh"
```

Debe terminar con `FOM_WEB_PUBLISHED`. Si sale `FOM_WEB=FAIL`, la web anterior queda activa.
Después: https://15.204.105.201/ (puerto 443, el normal de HTTPS) y recargar con Ctrl+F5.

## Volver atrás

Respaldo en `/var/backups/fom-web/20261022-web-nueva-*` (incluye `raiz-anterior.txt`): copiar ese
`fom-mobile.conf` sobre `/etc/nginx/sites-available/fom-mobile.conf`, `sudo nginx -t` y
`sudo systemctl reload nginx`.
