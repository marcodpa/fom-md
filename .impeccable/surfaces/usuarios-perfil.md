# Usuarios y expediente de persona
Mode: Operate. Scope: Usuarios, Usuarios generales y /panel/personal/:id. Extensión del panel actual.

## Direction contract
THESIS: La persona y su ficha completa son accesibles desde la lista; las acciones administrativas permanecen separadas.
OWN-WORLD: Material y logo actuales de FOM, carbón y azul con alternativa Glass existente, barra lateral y cabecera en cápsulas, tarjetas 28px y controles 16px.
STORY: Supervisor encuentra una cuenta y abre sus datos, conducción, inspecciones y documentos; administrador confirma primero la empresa de esa membresía y abre la misma ficha.
FIRST VIEWPORT: Lista con cuatro KPIs actuales, nombres enlazados, Ver perfil y menú de acciones. Ficha con enlace de regreso, título del usuario, identidad, cuatro KPIs y las cuatro pestañas; Datos en dos columnas con información personal y unidad.
FORM: Referencia elegida por el usuario: output/propuesta-usuarios-supervisor-admin-v2/01-usuarios-supervisor.png a 07-editar-datos.png. seed: user-approved-v2. No nuevo sorteo.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Restricciones
Extensión confirmada: Mi perfil y Ver perfil comparten componentes y sus cuatro pestañas. La configuración de plantillas de apariencia, foto propia e instrucciones de contraseña se separó en /panel/configuracion por solicitud expresa del usuario.
Mi perfil usa los mismos componentes de identidad, métricas, datos, unidad, conducción, inspecciones, documentos y pestañas que Ver perfil. Las plantillas de apariencia, la foto propia y las instrucciones de contraseña viven en /panel/configuracion, con entrada Configuración en el menú para todos los roles. Esta separación fue pedida expresamente por el usuario; Mi perfil conserva sus cuatro pestañas.
No cambiar la identidad, el mapa ni los trabajos de otros módulos. Valores ilustrativos de las imágenes no entran en los datos vivos. Lecturas de persona por ID, alcance de empresa y errores explícitos. El servidor actual responde 404 a manejo; no fabricar índice ni presentar cero eventos como información disponible.
