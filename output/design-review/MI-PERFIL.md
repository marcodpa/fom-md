# Mi perfil en la web

Ruta: `/panel/mi-perfil`. Disponible para todas las áreas del panel, desde el menú lateral y el nombre de la cuenta.

Referencia visual y funcional: `control-flotas-main/src/app/mi-perfil.tsx`.

Implementado: identidad y avatar, información personal, edición de nombre/cédula/teléfono/dirección/nacimiento para gestores, documentos propios, tarjeta de índice cuando hay datos y sección de seguridad. Estilo oscuro adaptable a escritorio y móvil. El correo se presenta como solo lectura. Iniciar sesión no cambió.

## Conexión disponible

La consola publicada exige un gestor para leer el directorio y modificar perfiles. La web busca exclusivamente el correo exacto de la sesión, vuelve a comprobar la cuenta y resuelve de nuevo su identificador antes de guardar. El formulario solo envía los campos modificados y no borra datos que la lectura actual no devuelve. No se almacenan perfiles reales en localStorage.

## Paridad pendiente del servidor

El servidor móvil tiene `GET/PATCH /api/v1/mobile/profile` con Bearer; el panel usa una sesión de consola por cookie. No son credenciales intercambiables. La consola no ofrece todavía una lectura y edición de perfil propio para todos los roles, ni el cambio habitual de contraseña: `POST /api/v1/console/auth/password` sirve únicamente para el cambio inicial.

Por eso la interfaz indica las opciones que siguen disponibles desde la app: foto, licencia/carta médica, eventos e índice personal y cambio de contraseña. No se envían cambios de contraseña al endpoint de clave temporal ni se simula un guardado conectado.

Para completar la paridad hace falta publicar una superficie de autoservicio de consola que derive usuario y tenant de la cookie, con la misma autorización propia de la superficie móvil, y conectar los archivos/credenciales e índice personal. No se modificaron permisos ni se publicó código del backend en esta tarea.

## Verificación

- Compilación Vite correcta.
- 12 pruebas correctas; nuevas pruebas de identidad exacta, campos permitidos, preservación de datos y validación de fechas/teléfonos.
- Vista de administrador con sesión real y formulario abierto/cancelado sin escribir datos reales.
- Revisión a 390 píxeles sin desbordamiento horizontal.
- Acceso del conductor probado en demo; índice y tres documentos personales visibles.
- Guardado, recarga y restauración de dirección probados únicamente en datos demo.
