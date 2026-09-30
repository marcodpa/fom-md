# Gestión de cualquier empresa por administrador FOM

El administrador selecciona una empresa en Administración FOM → Empresas →
Entrar a empresa. Se muestran sus módulos operativos y se conserva el rol de
administrador. Salir de empresa restaura la vista global. Esta selección no
crea una membresía del administrador en la empresa.

Antes de abrir la empresa, la web consulta
`GET /api/v1/console/company-context` con `x-fom-console-tenant`.
Solo acepta la selección cuando el servidor devuelve el mismo identificador.
Las lecturas y escrituras de consola posteriores llevan ese contexto. Las
rutas de autenticación no lo reciben. Las consultas compartidas y la caché de
flota se separan por empresa; los módulos se desmontan al cambiar de contexto.

El backend autentica la cookie, comprueba el cambio inicial de contraseña,
resuelve la identidad y valida capacidad de administrador, UUID y existencia
del destino mediante TenantScopeService. La selección solo dura una petición.
No se modifica la cookie, el usuario, su rol ni sus membresías. Se conservan
los controles de CSRF, de recursos y de dominio de cada operación.

Validación local: compilación web y TypeScript backend; 27 pruebas web
existentes, una prueba nueva de cabeceras de contexto y 40 pruebas backend de
sesión, aislamiento y administración de usuarios. No se han realizado cambios
de datos ni probado escrituras contra una empresa real con el nuevo contexto.

Pendiente de publicación conjunta del backend y frontend. El servidor público
respondió 404 a company-context el 30 de septiembre de 2026. La web conserva
la selección anterior si el servidor rechaza una nueva; no simula permisos.
Las operaciones con validaciones adicionales de base de datos deben comprobarse
con sesiones administrativas reales después de publicar el backend.

El parche backend de esta capacidad se entrega en
`backend-company-context.patch`; su base es la rama
`codex/web-platform-roles-main` de fom-core (PR 557).
