# Verificación del rediseño oscuro de FOM

Fecha: 21 de septiembre de 2026.

Estado final: por petición del usuario se restauró el sitio publicitario original,
incluidas su intro y páginas informativas. El panel, administrador y Mi perfil
conservan el nuevo diseño. Las comprobaciones siguientes registran la revisión
del rediseño previo; la restauración se documenta en
`../../ops/deploy/public-original-v2/README.md`. El login permanece original.

## Alcance

31 pantallas corresponden a los diseños aprobados: 8 páginas públicas (incluido 404), 19 módulos operativos y administrativos, 2 expedientes, Mi unidad y cambio inicial de contraseña. Iniciar sesión conserva sus archivos y estilos originales.

Los componentes compartidos de tarjetas, métricas, tablas, pestañas, formularios, mapas y modales usan el nuevo tema oscuro. Las cifras autenticadas continúan viniendo del repositorio existente. Las vistas ilustrativas del sitio público están rotuladas como ejemplos.

## Comprobaciones

- Compilación de producción con Vite: correcta.
- Las 9 pruebas existentes de contratos del repositorio y permisos: correctas.
- 19 rutas del panel comprobadas en escritorio y a 390 × 844; listas, datos de ejemplo, estados vacíos y errores controlados.
- Las 8 páginas públicas comprobadas a 390 × 844, sin desbordamiento horizontal de página.
- Expedientes de vehículo y persona, vista del conductor y cambio inicial de contraseña revisados visualmente.
- Filtro de funciones, búsqueda sin resultados, limpiar búsqueda, desplegables de ayuda y navegación móvil comprobados.
- Modal de programación comprobado: foco inicial, ciclo inverso de Tab dentro del diálogo, cierre con Escape y retorno del foco.
- Lista de citas corregida después de detectar un desbordamiento de 4 píxeles en móvil. Nueva medición: 380 píxeles de contenido para 380 de área disponible.
- Menú móvil del panel corregido para evitar superposición con la marca y ocultar los enlaces de la barra cerrada del árbol accesible.
- Se corrigió la referencia inexistente `recargar` que impedía abrir Vehículos.
- Comparación Git sin cambios en `Entrar.jsx`, `login.css`, `global.css` y `GloboCanvas.jsx`.

## Entornos y límites

La revisión conectada se hizo en el servidor local habitual, mediante navegación de lectura. Eventos y SOS, jornadas, planes, programa de inspecciones, plataforma y transferencias cargaron sin errores al comprobar su conexión. Durante la navegación rápida se recibió temporalmente un límite HTTP 429; tras esperar, transferencias cargó sin alertas. Se añadió un mensaje legible para ese error.

La revisión masiva de vistas se realizó en un servidor aislado (127.0.0.1:5174), sin conexión al API, usando los datos demo originales y fixtures locales para módulos que requieren servidor. `server.mjs`, `fixtures.js` y `states.html` pertenecen exclusivamente a esta revisión: no se importan en el código de producción ni aparecen en el paquete compilado. Eventos y SOS se verificó conectado; en demo conserva su aviso original de conexión requerida.

No se enviaron formularios de negocio, cambios de asignación, pagos, transferencias ni contraseñas durante las pruebas. No se ejecutó un despliegue.
