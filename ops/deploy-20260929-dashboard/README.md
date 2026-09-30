# Publicación del dashboard — 29/09/2026

Build de producción con `VITE_FOM_API=/fom-api`. Incluye los cambios locales de mapas y las correcciones de la auditoría funcional. No instala el parche de backend de pagos ni declara resueltas las integraciones pendientes del informe `docs/qa-dashboard/INFORME.md`.

El módulo de cuotas se describe como registro administrativo: no procesa cobros ni mueve dinero.

## Activación

Paquete remoto: `/home/fomadmin/fom-web-publication-20260929-dashboard`.

Ejecutar **en el servidor Linux**, mediante SSH:

```sh
sudo bash /home/fomadmin/fom-web-publication-20260929-dashboard/activate-publication.sh
```

El script requiere contraseña de sudo. Verifica SHA256 de los archivos y de la configuración Nginx observada al preparar el paquete; conserva las rutas API y `Referrer-Policy: strict-origin`. Cambia exclusivamente la raíz de archivos estáticos a `/var/www/fom-web/releases/20260929-dashboard`.

Antes de activar respalda Nginx. Valida configuración, portada, ruta profunda, sesión sin autenticar, bloqueo de rutas internas y salud API. Si la validación falla, restaura la configuración anterior. Solo `FOM_WEB_PUBLISHED` confirma activación exitosa.

Estado de preparación: compilación correcta, 179 archivos incluidos en el manifiesto. La falta de sudo sin contraseña impide activación automática desde el agente.
