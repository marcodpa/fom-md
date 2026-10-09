# Fotos completas en marcos estables

La ficha de la unidad conserva la paleta Azul FOM o Glass gris. Las fotos horizontales, verticales, cuadradas, panorámicas y transparentes se centran sobre la superficie baja del tema, sin deformación, recorte, desenfoque ni ampliación de la tarjeta según la proporción del archivo.

`FotoUnidad` comparte el marco entre Resumen, Centro de control y fichas de unidades. Altura: 180 px; Resumen: 124 px; miniatura del mapa móvil: 66 px. La foto puede ampliarse con ratón o teclado, muestra el original y cierra con Escape devolviendo el foco. La ventana se monta fuera del contenedor que desplaza la ficha para evitar que se corte. La identificación de la unidad reinicia el estado de la foto al cambiar de vehículo.

La transformación `ajuste: 'contener'` usa `c_limit` en Cloudinary antes de `object-fit: contain` en la web. También se aplica a las miniaturas de flota y las caras de documentos. Los avatares mantienen su recorte circular. Se conserva el original y la subida de versiones existentes, sin activar nuevos servicios de procesamiento de pago. Si falla una foto se mantiene la ilustración de referencia; el fallo al abrir un original ofrece un mensaje visible.

Vista de diseño y prueba local: `/output/propuesta-fotos-uniformes/index.html`. La elección de archivo allí solo crea una vista previa en el navegador; no carga fotos al servidor. La vista emplea imágenes ilustrativas ya existentes en el proyecto.

Validación: prueba de regresión para URLs sin recorte en fichas/documentos/miniaturas, compilación de producción y revisión del marco y de la ampliación en escritorio y móvil.
