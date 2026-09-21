# Restauración del sitio publicitario original

Estado: preparada, compilada, probada y subida; pendiente de activación con sudo.

Se restauraron `src/App.jsx` y `src/pages/ProductPage.jsx` desde HEAD, conservando
la exclusión de la cabecera publicitaria en `/cambiar-clave-inicial`. Vuelven
Home, CinematicIntro, Header, Footer, las páginas informativas y sus estilos
originales. El CSS oscuro permanece limitado al panel y el cambio de contraseña.
No se modificó ningún módulo del panel, administrador, Mi perfil ni el login.

Activación en fom-app-01:

```bash
sudo bash /home/fomadmin/fom-web-public-original-20260921/activate-publication.sh
```

Publica en `https://15.204.105.201` cambiando únicamente la raíz de archivos de
Nginx a `/var/www/fom-web/releases/20260921-public-original-v2`. Conserva HTTPS,
las rutas de API, sesiones, límites y configuración de producción. El script
comprueba el hash de la configuración activa, respalda y restaura si falla.
La versión anterior queda disponible como respaldo y los vídeos originales
se reutilizaron verificando su SHA-256. No hay migraciones ni cambios de datos.

Verificación: build correcto (129 módulos), 12 pruebas aprobadas, diff sin errores,
portada y página Plataforma originales revisadas en navegador. Los 21 archivos
de dist y la configuración candidata coinciden por SHA-256 en el servidor.
Nginx de prueba en loopback sirvió las siete páginas públicas y Mi perfil con 200,
sesión sin autenticar con 401 y salud con 200. Instancia de prueba detenida.

El acceso SSH disponible continúa requiriendo contraseña para sudo. Hasta que el
usuario active esta versión, la IP pública conserva el diseño publicado anterior.
