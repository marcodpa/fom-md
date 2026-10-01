# Cambios sobre la app del conductor (repositorio fom-driver-juan, de Juan)

`regla-clave-5-caracteres.patch` (2026-10-01): baja el mínimo de contraseña de 16 a 5 caracteres y
añade reglas (mayúscula, número, símbolo, sin tres iguales seguidos, sin claves comunes, sin el
correo). Se aplica con `git apply` dentro de `fom-driver-juan`. Misma regla que el panel web
(`fom/src/lib/clave.js`).

IMPORTANTE: el mínimo de 16 lo exige también el servidor (fom-core). Hasta que Juan lo cambie allí
(de 16 a 5), el servidor rechazará las claves cortas aunque la pantalla las acepte.
