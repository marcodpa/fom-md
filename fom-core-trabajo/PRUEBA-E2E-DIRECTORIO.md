# Prueba de punta a punta del directorio en FOM-PROD

Fecha: 2026-08-27. Ejecutada contra producción con autorización de Marco.
Cuenta de prueba: `marcodpa324@gmail.com` (correo alterno del propio Marco).
Actor que ejecuta las altas: `marcodpacheco@gmail.com`, rol `fleet_manager`
(canónico `supervisor`), tenant `996e4f53…`.

Ninguna credencial se registra en este archivo.

## Resultado: 12 de 12 comprobaciones en verde

| # | Qué se comprobó | Resultado |
|---|---|---|
| 1 | Alta de usuario con clave temporal | 201 · `createdUser=true`, `passwordSet=true`, `mustChangePassword=true` |
| 2 | Aparece en el directorio del ente con su rol y estado | Sí: 3 de 3 personas listadas, la nueva como `conductor` / `active` |
| 3 | Entra en producción con la clave temporal | 201 · sesión válida, rol `conductor` |
| 4 | Con el cambio pendiente, la consola le queda cerrada | `vehicles` 403 · `users` 403 · `summary` 403 |
| 5 | Cambio inicial con clave actual equivocada | 400, rechazado |
| 6 | Cambio inicial con la clave correcta | 201 · `changed=true` |
| 7 | La sesión abierta con la clave temporal queda revocada | 401 con la cookie anterior |
| 8 | Entra con la clave nueva | Sí · `mustChangePassword=false` |
| 9 | Ya ve la flota, pero no el directorio (no es gestor) | `vehicles` 200 · `summary` 200 · `users` 403 |
| 10 | La clave temporal ya no sirve | 401 |
| 11 | Asignación como conductor principal y aparición en la lista | 201 · figura en `drivers` |
| 12 | Un segundo principal en la misma unidad se rechaza | 409 |

Además: la revocación de la asignación devolvió la unidad a su estado previo
(200, `revoked=true`, 0 conductores vigentes), de modo que la prueba no dejó
cambios sobre la flota.

## Otros hechos verificados de paso

- La protección CSRF de mutaciones está activa: sin `Origin`, sin la cabecera
  `x-fom-csrf` o sin `Content-Type: application/json`, toda escritura responde
  403 `Untrusted browser mutation`.
- El proyector de estado vivo está desplegado y funcionando: las unidades
  `ad-132` y `vm-ls-538` reportan con `lastReportAt` al minuto y
  `hasPosition=true`.
- La corrección del escalamiento de privilegios está activa en la web:
  `owner → supervisor`, `operator → operator`, y sólo `admin_fom` obtiene
  alcance global. Las 3 pruebas de `test/roles.test.js` pasan.

## Limitación encontrada

No existe superficie para **administrar** usuarios ya creados: no hay
endpoint para cambiar el rol, mover de ente, suspender o revocar a una
persona, ni para reiniciar su contraseña. El alta funciona; la administración
posterior todavía no. Mientras eso no exista:

- La cuenta de prueba queda activa y sólo puede retirarla alguien con acceso
  a la base.
- Una persona que olvide su clave no tiene forma de recuperarla desde la
  consola.

Es el siguiente hueco a cubrir, y coincide con las reglas 9 y 10 del contrato
del Issue #202 (jerarquía de mando y quién puede administrar a quién), que
siguen pendientes.
