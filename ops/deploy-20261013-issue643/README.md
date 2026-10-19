# Publicación preparada — 13 de octubre de 2026

La web está preparada para el servidor del PR [fom-core #643](https://github.com/juancpachecog/fom-core/pull/643). El objetivo queda fijado a `bf08e2e1d3847334d1ed53a49e4c9de9761b75c3`; no se despliega automáticamente una versión futura de main.

**Estado: pendiente de activación con sudo.** Entrar por SSH funciona, pero la cuenta disponible pide contraseña de sudo. No se ha actualizado la API, ejecutado migraciones ni activado esta web.

## Qué tienes que hacer

1. Tú o Juan: abrir una terminal **dentro de la máquina de base de datos `fom-db-01`**, usando su acceso habitual. Ejecutar:

   ```bash
   sudo /usr/local/sbin/fom-prod backup
   ```

   Copiar la línea completa que comienza por `FOM_PROD_BACKUP_OK`. El respaldo debe tener menos de 30 horas. No copiar ni compartir contraseñas.

2. Abrir una terminal en la máquina de aplicación `fom-app-01`. Desde PowerShell de Windows puedes entrar así, estando en la carpeta del proyecto:

   ```powershell
   Set-Location C:\Users\home\Downloads\fom
   ssh -t -i infra/fom-app fomadmin@10.20.30.10
   ```

   **Después de entrar por SSH**, ejecutar este único comando de publicación:

   ```bash
   sudo bash /home/fomadmin/publication-20261013-issue643/finish-publication.sh
   ```

   Escribir la contraseña de sudo en esa terminal cuando la pida. Cuando aparezca `Paste the FOM_PROD_BACKUP_OK receipt`, pegar la línea del paso 1, completa y sin saltos de línea.

3. Esperar `FOM_PUBLICATION=PASS`. Si aparece `FAIL`, conservar la salida y revisar el punto que falló; no volver a ejecutar ni revertir la base a ciegas. La publicación comprueba el respaldo, las cinco migraciones mediante SQL de sólo lectura, la versión activa, las rutas, la web pública y sus recursos. Conserva la configuración de Nginx y restaura la raíz web anterior si su activación falla. Si falla después de migrar, la base no se revierte automáticamente.

4. Abrir [la web pública](https://15.204.105.201/) y actualizar con Ctrl+F5. Hacer la prueba por roles indicada abajo.

Si no tienes acceso a la máquina de base de datos o no conoces la contraseña de sudo, Juan debe ejecutar esos pasos con su acceso habitual. No hace falta cambiar permisos ni activar sudo en Windows.

## Cambios de la web

- Perfil → Documentos: consultar licencia y aptitud médica; un gestor autorizado puede registrar una nueva versión con motivo administrativo. Se conserva el historial. Antes de confirmar, la web vuelve a leer el registro guardado.
- Vehículos: registrar y editar el número interno de flota sin confundirlo con el alias.
- GPS: registrar y editar línea, ICCID, operador, APN, plan y estado de SIM, firmware y transporte; guardar técnico y lugar de instalación, y ubicación al desmontar.
- Transferencias: mostrar el motivo de cierre que entrega el servidor.
- Mantenimiento: reconocer las órdenes vinculadas a un plan y ofrecer acceso a los planes.
- Se incluyen las mejoras locales ya aprobadas de perfiles, expediente de unidad, fotos cuadradas e índice compacto.

## Las cinco migraciones

1. `20261005180000000_align_transfer_platform_admin_scope`
2. `20261006180000000_enable_platform_notification_receipts`
3. `20261006190000000_classify_inspections_and_record_attempts`
4. `20261006210000000_add_driver_behavior_events`
5. `20261010210000000_enable_managed_user_credentials`

El testigo exige 80 migraciones antes y 85 después. Si producción ya cambió, se detiene para revisar el inventario real. No ejecuta semillas, backfill ni migraciones de vuelta atrás.

## Prueba final con cuentas de prueba

Esta parte está pendiente hasta actualizar el servidor. Las pruebas automáticas y una respuesta 401 sin sesión no reemplazan estas comprobaciones.

| Cuenta | Comprobar |
| --- | --- |
| Administrador FOM | Elegir una empresa, ver sólo sus datos operativos, registrar una credencial de un usuario inferior y comprobar el valor al recargar; cambiar de empresa y verificar el aislamiento. |
| Supervisor | Ver su propia empresa, modificar una credencial de un conductor, marcar alertas como leídas y comprobarlas al recargar; no editar a otro supervisor ni a un administrador. |
| Conductor | Ver únicamente sus alertas y unidad asignada; abrir el mapa completo; no disponer de gestión de usuarios, credenciales ajenas ni administración GPS. |

Usar datos de prueba para editar credenciales, reasignar o desmontar GPS. No reemplazar documentación real para probar un botón. Conservar errores concretos y comprobar los valores mediante una nueva lectura después de guardar.
