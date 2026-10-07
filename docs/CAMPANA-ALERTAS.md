# Campana de alertas — 7 oct 2026

La cabecera tenía una campana deshabilitada para administradores sin empresa gestionada. Además, la guarda de rutas les impedía abrir `/panel/alertas`.

Ahora la campana del administrador abre Alertas incluso sin empresa gestionada. Un administrador global elige una empresa desde esa pantalla; el acceso se confirma mediante `entrarEmpresa` antes de montar la bandeja. No se consultan notificaciones de una empresa sin contexto confirmado. «Cambiar empresa» devuelve al selector conservando la identidad del administrador. Las demás cuentas conservan su bandeja habitual.

El contador utiliza la misma lectura y la misma regla de lectura que la bandeja. Se comprobó con la API real que ambos muestran los 9 avisos sin leer de FOM OPERATIONS.

Se retiró el bloqueo antiguo de acciones por empresa del issue #631: el cliente ya tiene las rutas de lectura y descarte del #633 integradas. Estas acciones siguen usando la ruta del tenant seleccionado y la autorización del servidor; los errores del servidor se muestran en la bandeja. Esta comprobación no marcó ni descartó avisos reales.

Validación: clic en la campana desde administración global, selección de empresa, carga de bandeja, contador y regreso al selector. 85 pruebas aprobadas y compilación correcta. Capturas reales locales en `.impeccable/review/perfil-alertas/`.
