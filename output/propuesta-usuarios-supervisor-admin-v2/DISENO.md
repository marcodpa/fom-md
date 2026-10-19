# Usuarios y perfil: propuesta basada en la web real

9 de octubre de 2026. Propuesta visual; no implementada ni aprobada.

La versión anterior fue rechazada porque no se parecía a la web actual. Esta versión parte de una captura en vivo de http://127.0.0.1:5174/panel/personal. La sesión observada era de supervisor. La vista global del administrador se contrastó con `src/panel/modulos/Plataforma.jsx`; no se observó una sesión de administrador.

## Referencia comprobada

- Material activo `data-diseno="azul"`: fondo #0a0d12, superficie #141a22, superficie alta #1d2530, borde #262e39, azul #3d9bf5, texto #f3f5f8, secundario #abb3bf.
- Logo real de flechas FOM, barra lateral flotante de 232px con radio 32px e inset de 14px. Cabecera con contexto, notificaciones y perfil en cápsulas separadas.
- Tarjetas y KPIs con radio 28px; controles 16px y chips 12px. Referencia visual recortada antes de las filas para no incluir datos personales reales.
- Fuentes: `src/styles/apariencia.css`, `src/panel/Consola.jsx`, `src/panel/comp/ui.jsx`, `src/panel/modulos/AdminUsuarios.jsx`, `src/panel/modulos/Plataforma.jsx`, `src/panel/modulos/ExpedienteConductor.jsx`.

## Flujo propuesto

En Usuarios, el nombre y «Ver perfil» abren la ficha de la persona. Las acciones de cuenta se mantienen independientes del enlace al perfil. En Usuarios generales, el administrador conserva su lista y panel lateral; «Abrir perfil completo» entra en el contexto de la membresía y empresa elegidas. La misma persona puede tener varias membresías: no se deben mezclar.

El perfil conserva las cuatro pestañas existentes: Datos, Conducción, Inspecciones y Documentos. Datos reúne los datos personales, licencia, certificado médico y unidad asignada. Conducción reúne el índice y los eventos disponibles. Inspecciones y Documentos conservan los campos del código actual. Editar datos conserva los cuatro campos del modal existente.

No se añaden pestañas de historial, acceso, resumen ni unidad. No se añaden curvas históricas, recorridos, carga de archivos ni datos que el perfil actual no devuelve. Las acciones visibles dependen de los permisos reales.

## Límites para implementar

El índice que muestra actualmente el expediente procede de la unidad asignada. Debe indicarse su origen y mostrar ausencia de datos sin sustituirla por cero. Tener un conductor asignado no acredita quién realizó cada viaje.

Los números y nombres de las láminas son demostrativos. Las imágenes generadas pueden alterar la densidad, algún texto o detalle: el logo SVG original, los tokens y los contratos del código prevalecen. La lámina del administrador puede distribuir el resumen en cuatro tarjetas, aunque el código actual usa una banda; conservar la banda si se implementa la mejora mínima.

La galería es un prototipo local para revisar imágenes y navegar por el perfil de demostración. No ejecuta asignaciones, cambios de clave, roles, suspensiones ni guardados reales. No modifica la web autenticada ni publica cambios.

Generación con `image_gen` integrado. Prompts y archivos en `prompts.json`.

## Verificación de la galería

Las siete imágenes se generaron y guardaron en esta carpeta. Se comprobó en navegador el clic sobre Carlos Mendoza desde la lista de supervisor, las cuatro pestañas, la apertura de Editar datos y el cierre con Escape. También se comprobó Abrir perfil completo desde la vista del administrador y que Volver a usuarios retorna al directorio correspondiente. Captura final en `verificacion-galeria.jpg`.
