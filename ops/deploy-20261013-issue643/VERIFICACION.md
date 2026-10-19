# Verificación — 13 de octubre de 2026

## Comprobado

- 113 pruebas automáticas de la web: 113 correctas, 0 fallos, 0 omitidas.
- Compilación de producción correcta: 337 módulos, sin errores.
- La edición de credenciales transmite PATCH, los valores normalizados y la misma clave de idempotencia al repetir explícitamente un intento. La interfaz exige una lectura independiente antes de mostrar confirmación.
- Permisos locales probados para identidad, empresa, jerarquía y estado de la membresía. El servidor sigue siendo la autoridad que concede o deniega el cambio.
- Edición parcial de GPS: no borra campos que no se tocaron; valida ICCID, límites y enumeraciones.
- Servidor de producción accesible por SSH y HTTPS. Salud publicada: base, Redis, RabbitMQ y MQTT correctos.
- Versión de producción observada: `ce4def3182187c4307d44505378a76a1f7621c80`. Objetivo preparado: `bf08e2e1d3847334d1ed53a49e4c9de9761b75c3`.
- No se ha usado la cuenta Docker para evitar el requisito de sudo. No se han modificado credenciales reales, migraciones, Nginx ni la API en ejecución.

## Pendiente

- Respaldo real en la máquina de base de datos y recibo verificable.
- Ejecución privilegiada del paquete. Los scripts incluyen testigos de base antes y después, pero esas comprobaciones aún no se han ejecutado.
- Pruebas manuales autenticadas de administrador, supervisor y conductor sobre la versión publicada. No se considera que funcionen todos los roles sólo porque la compilación y las pruebas automáticas pasen.

La cuenta SSH disponible requiere contraseña de sudo; esa es la intervención pendiente, no un error de conectividad.
