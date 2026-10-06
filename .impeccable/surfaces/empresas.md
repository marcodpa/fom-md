# Empresas — extensión de la consola FOM

Modo Operate. El usuario autoriza rediseñar y aplicar directamente; la paleta actual está fijada explícitamente. Se heredan tipografía, navegación, componentes y tokens `--e-*` de la consola. Código como entrega directa, sin nueva propuesta raster ni cambio del sistema global.

## Dirección
Directorio compacto con selección y ficha de contexto: resumen horizontal, búsqueda, tipo y estado, filas de identidad y estado; ficha lateral en escritorio y expansión junto a la empresa en pantallas estrechas. Entrar a empresa es la acción principal. Datos ausentes se declaran, no se convierten en cero. Ninguna fotografía decorativa.

## Primer viewport y recorrido
Título y Nueva empresa; resumen estable de las empresas disponibles; directorio que evita ocho columnas con valores desconocidos; empresa seleccionada con entrada y contacto. Buscar y filtrar localmente sobre el listado autorizado, seleccionar, entrar mediante `entrarEmpresa`, gestionar servicio con confirmación existente. Retirar conserva historial.

## Interacción y estados
Nueva empresa mantiene datos reales, tipo y contacto en grupos, formulario nativo con validación, acciones de cancelar/guardar y protección durante escritura. Asociaciones mantienen contrato actual del repositorio y muestran carga/error/reintento. No cambiar endpoints, permisos o asignaciones reales durante la verificación. No se prueba con escrituras en producción.

## Frontera y calidad
Solo AdminEmpresas.jsx y empresas.css. Mantener cambios previos y marketing/mapa fuera de alcance. Cero colores literales nuevos. Comparación visual desktop 1672×941, móvil390×844 y viewport del usuario996×884, incluida creación y ficha expandida. Legibilidad, selección por teclado, foco, estados honestos y ausencia de overflow. No se atribuyen a esta superficie los gates históricos del marketing.
