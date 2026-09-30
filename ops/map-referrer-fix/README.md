# Mapas: bloqueo de OpenStreetMap

El 2026-09-29 la web pública devolvía `Referrer-Policy: no-referrer`.
OSM exige el Referer real del sitio y prohíbe políticas que lo supriman:
https://operations.osmfoundation.org/policies/tiles/

`activate.sh` cambia solamente esa cabecera a `strict-origin`, conservando
privadas las rutas y los parámetros del panel. Respalda la configuración,
valida Nginx y restaura si falla la activación. No cambia la versión de la web.
Ejecutar con sudo en fom-app-01 y verificar la cabecera pública y el mapa
con una recarga del navegador. No añadir parámetros para saltarse la caché.

El componente MapaLibre también especifica `referrerPolicy: strict-origin`
en las imágenes y usa la URL canónica HTTPS de OSM para próximas publicaciones.
Estos cambios del componente necesitan una nueva compilación/publicación.

Esto corrige una infracción de configuración, pero no garantiza que OSM
levante inmediatamente un bloqueo ni la disponibilidad del servicio público.
Para una garantía contractual hace falta un proveedor con SLA o cartografía
propia; no rotar proveedores/subdominios para eludir bloqueos.
