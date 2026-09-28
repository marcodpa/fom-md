# Publicación del 28-09-2026

Build local actual, con VITE_FOM_API=/fom-api. Incluye cambios publicitarios y selección por empresa para transferencias.

Estado: paquete preparado; activación pendiente de sudo en fom-app-01.

En el servidor, ejecutar:

sudo bash /home/fomadmin/fom-web-publication-20260928-web-update/activate-publication.sh

La activación verifica SHA256SUMS, conserva y respalda la configuración actual, cambia únicamente la raíz estática a /var/www/fom-web/releases/20260928-web-update y comprueba portada, ruta profunda, autenticación y salud. Ante fallo restaura la configuración anterior. La configuración candidata se deriva de la configuración real del servidor y mantiene sus rutas API/móviles.
