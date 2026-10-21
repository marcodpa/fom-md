# Publicación preparada — 21 de octubre de 2026

Reemplaza a los paquetes del 19 y 20 oct. Trae todo lo del 20 oct (Reportes nuevo, PDF A4, web en
el teléfono como la app, formato IOGP) y además: Mantenimiento como la app (tarjetas, filtros
arriba, la más nueva primero), «Llegada» en el mapa sin lluvia/tráfico/alcance, imprimir la
planilla de inspección, inspecciones por persona con fines de semana, ODT asignadas, y los arreglos
para empresas grandes (todas las unidades y conductores, «Faltan hoy» completo).
Commit de la web: ver `git log` de la rama `codex/rediseno-v6-fiel` en marcodpa/fom-md (21 oct).

Solo cambia la raíz de la web en Nginx. No toca la API, la base de datos ni los contenedores.
Funciona sea cual sea la web activa (6 oct o 20 oct). Si algo falla, restaura la configuración
anterior sola.

## Subir (desde la carpeta de fom, en Windows, con la VPN encendida)

```
tar -cf - -C ops deploy-20261021-escala | ssh -i infra\fom-app fomadmin@10.20.30.10 "tar -xf - -C /home/fomadmin"
```

## Activar (pide la clave de sudo)

```
ssh -t -i infra\fom-app fomadmin@10.20.30.10 "sudo bash /home/fomadmin/deploy-20261021-escala/activate-publication.sh"
```

Debe terminar con `FOM_WEB_PUBLISHED`. Si sale `FOM_WEB=FAIL`, la web anterior queda activa.
Después abrir https://15.204.105.201/ y recargar con Ctrl+F5.

## Volver atrás

Respaldo en `/var/backups/fom-web/20261021-escala-*` (incluye `raiz-anterior.txt`): copiar ese
`fom-mobile.conf` sobre `/etc/nginx/sites-available/fom-mobile.conf`, `sudo nginx -t` y
`sudo systemctl reload nginx`.
