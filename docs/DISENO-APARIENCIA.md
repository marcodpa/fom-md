# Apariencia de la plataforma FOM

La plataforma autenticada dispone de **Azul FOM** y **Glass gris**. Ambos diseños conservan la misma organización, módulos, datos y acciones. Azul mantiene sus colores existentes; Glass utiliza fondo gris medio y paneles de grafito translúcido. Los tokens normativos están en [DESIGN.md](../DESIGN.md), en la familia `panel-`; la extensión técnica está en [.impeccable/design.json](../.impeccable/design.json).

## Uso y persistencia

1. Abre **Mi perfil** desde el perfil de la cabecera o la navegación lateral.
2. En **Apariencia de la web**, selecciona **Azul FOM** o **Glass gris**.
3. El cambio aparece inmediatamente en todos los apartados de tu plataforma. El mensaje indica si el navegador pudo guardarlo.

La selección se guarda en `localStorage` por cuenta, bajo `fom.apariencia.v1:<identidad codificada>`. La identidad utiliza `userId`, `id` o correo, en ese orden; nunca la empresa. Cambiar de empresa gestionada conserva la preferencia personal. Otra cuenta tiene su propia selección. Las pestañas del mismo navegador reciben el evento de almacenamiento. Un valor ausente o inválido usa Azul FOM.

No hay persistencia en backend ni sincronización entre dispositivos, perfiles de navegador o navegadores distintos. Si el almacenamiento no está disponible, el diseño se aplica en memoria y el mensaje explica que puede perderse al cerrar la sesión. Borrar los datos del sitio también puede borrar la selección.

## Composición y accesibilidad

Ambos materiales comparten tarjetas de 28px, lateral de 32px y margen exterior de 14px. La cabecera combina contexto, notificaciones circulares y perfil. Hasta 900px, la navegación se convierte en cajón; hasta 600px, las tarjetas adoptan 24px y las opciones de Apariencia se apilan.

Glass conserva el fondo expuesto máximo `#62676e`, texto secundario `#edf0f5` y terciario `#e2e6ec`. La revisión documentó relaciones de contraste de 4.99:1 y 4.55:1 sobre ese fondo, respectivamente; estas cifras corresponden a esa combinación y no certifican todos los estados de la aplicación. Se mantienen radios nativos, etiquetas, foco visible y anuncio de estado. Con `prefers-reduced-transparency: reduce`, Glass usa paneles opacos sin filtro de fondo.

## Marca, órdenes y mapas

La marca oficial de las superficies vivas utiliza los SVG `public/brand/fom-logo.svg` y `public/brand/fom-symbol.svg`, con tres chevrones azules crecientes. Se comparte en panel, sitio público, acceso, carga y favicon. Las fotografías y maquetas históricas conservan el branding que forma parte de la imagen.

El detalle de mantenimiento prioriza problema, unidad y resultado o estado actual. Los cierres muestran solución registrada, fecha, costo y duración humana; los datos completos se abren en **Datos del reporte**. El historial conserva registros reales y las acciones mantienen sus controles por rol. Una nota de solución ausente se declara expresamente.

El centro de control conserva un mapa nítido a pantalla completa con cabecera redondeada y herramientas flotantes. El conductor dispone de **Mapa** en su menú: se resuelve su asignación actual y se consulta su vehículo por identificador, sin solicitar el listado de flota para dibujarlo. La actualización ocurre cada 15 segundos. Se contemplan carga, error con reintento, falta de asignación y falta de posición GPS válida. La ficha móvil tiene cierre accesible y desplazamiento interno.

## QA de esta entrega

La revisión de acabado [.impeccable/review/apariencia/review-v3.md](../.impeccable/review/apariencia/review-v3.md) emitió **ship**. El agente principal reportó **79 pruebas aprobadas** y la compilación más reciente aprobada; este pase de documentación no ejecutó nuevamente esos comandos.

La evidencia visual está en [.impeccable/review/apariencia/](../.impeccable/review/apariencia/), con escritorio de 1440×900 y móvil de 390×844:

| Caso | Evidencia |
|---|---|
| Glass y contraste | `glass-desktop.png`, `glass-mobile.png` |
| Orden cerrada en ambos materiales | `orden-desktop.png`, `orden-glass-desktop.png` |
| Orden abierta y detalle móvil | `orden-abierta.png`, `orden-mobile.png` |
| Marca en acceso, sitio público y perfil | `logo-login.png`, `logo-publico.png`, `perfil-real.png` |
| Mapa del conductor en escritorio y móvil | `conductor-mapa-desktop.png`, `conductor-mapa-mobile.png` |
| Mapa del conductor conectado a la API real | `conductor-mapa-real.png` |
| Ficha del conductor en móvil | `conductor-ficha-mobile.png` |

La comprobación adicional del agente principal utilizó una sesión de conductor existente en la aplicación conectada a la API real: `/panel/mapa` mostró AB538RM, su unidad asignada, con un solo marcador en el mapa a pantalla completa. No se realizó un nuevo inicio de sesión real ni se modificaron asignaciones. La compilación más reciente finalizó en 12.29 segundos.

Para una regresión futura, comprobar selección inmediata, recarga, separación de cuentas, cambio de empresa, almacenamiento bloqueado, foco y teclado. Revisar ambos materiales en los módulos, cabecera, cajón, mapa y órdenes. Comprobar que una nueva asignación actualiza la unidad visible y que ninguna unidad de otra cuenta queda visible durante el cambio.

## Límites verificados

Las mutaciones de alertas al gestionar una empresa ajena están deshabilitadas y explicadas porque faltan rutas del servidor: **issue #631, punto 3**. La acción **Marcar todas como leídas** pasó en la demostración del supervisor de su propia empresa. Esta entrega no resuelve ese problema de backend ni acredita CRUD completo o una auditoría de permisos en producción.

Los resultados del mapa son evidencia de interfaz y consulta por asignación; no constituyen una auditoría de autorización del servidor. La entrega conserva el alcance de las pruebas reportadas. No se hizo commit ni despliegue en este pase.

## Fuentes de implementación

- Materiales y geometría: `src/styles/apariencia.css`, `src/styles/panel.css`, `src/styles/redesign.css`.
- Preferencia personal: `src/panel/apariencia-store.js`, `src/panel/useApariencia.js`, `src/panel/comp/Apariencia.jsx`.
- Cabecera, menú y rutas: `src/panel/Consola.jsx`.
- Órdenes: `src/panel/modulos/Mantenimiento.jsx`, `src/panel/modulos/mantenimiento.css`.
- Mapa del conductor: `src/panel/modulos/MapaConductor.jsx`.
- Marca: `src/styles/brand.css`, `public/brand/*.svg`.
