# Publicación de la web v7 — 25 de septiembre de 2026

Destino: `https://15.204.105.201` (misma IP pública y certificado que la publicación del
21-09-2026, ver `ops/deploy/README.md`). Estado: **preparada, no publicada**.

Qué cambia: solo la carpeta que sirve la web, de `releases/20260921-public-original-v2` a
`releases/20260925-web-v7`. La API, la base de datos, los certificados y las rutas móviles
no se tocan. Compilación con `VITE_FOM_API=/fom-api`; sin valores privados en `dist`.

`activate-publication.sh` (adaptado del 21-09): comprueba que la configuración de Nginx es
la que dejó la republicación del sitio original del 22-09 (`releases/20260921-public-original-v2`, huella `2148712f…`), verifica las huellas del paquete,
instala `dist` en la nueva versión, respalda la configuración, recarga Nginx y comprueba
portada, ruta profunda, sesión anónima 401, rutas internas 404 y salud de la API. Si algo
falla, restaura la configuración anterior. Volver atrás a mano: copiar el respaldo que
imprime el script sobre `/etc/nginx/sites-available/fom-mobile.conf` y recargar Nginx.

## Pasos (con la VPN WireGuard activa)

```bash
scp ops/deploy-20260925/fom-web-publication-20260925.tar.gz fomadmin@10.20.30.10:~/
ssh fomadmin@10.20.30.10
tar -xzf fom-web-publication-20260925.tar.gz
sudo bash ~/fom-web-publication-20260925/activate-publication.sh
```

El comprimido (≈100 MB) se genera localmente y no se sube a Git; `SHA256SUMS` identifica
su contenido. Para regenerarlo: `VITE_FOM_API=/fom-api npm run build` y repetir el empaquetado.
