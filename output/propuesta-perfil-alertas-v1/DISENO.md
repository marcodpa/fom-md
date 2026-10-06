# Propuesta de Mi perfil y Alertas

Fecha: 5 de octubre de 2026. Estado: propuesta aprobada, aplicada localmente y revisión final independiente completada; disposición ship local. No publicada, sin despliegue ni push.
Generación: image_gen integrada. Siete imágenes horizontales 1672×941, una por pantalla/ventana. Referencia de estilo: propuesta aprobada de Reportes. Prompts y correcciones exactos en prompts.json; originales conservados en generated_images.

## Dirección

Modo Operate, extensión del panel FOM oscuro. Superficies oscuras, azul para acciones, filas y divisores para información; evitar seis cajas para seis campos, indicadores decorativos, porcentajes de perfil o datos de manejo para supervisores. La navegación lateral real y los permisos del panel se conservan al implementar; la de las imágenes está abreviada para representar el contexto.

Corrección explícita del usuario: conservar los colores actuales de la web. La implementación hereda los tokens existentes de superficies, bordes, texto y estados; `perfil-alertas.css` no incorpora hexadecimales nuevos. Las imágenes siguen siendo referencia de composición, no autoridad para reemplazar la paleta vigente.

## Pantallas

1. 01-perfil: banda de identidad, seis campos, acceso a cuenta y tabla de documentos.
2. 02-editar-perfil: formulario de datos propios, guardar/cancelar, correo de solo lectura.
3. 03-documento: número, vencimiento, estado cuando disponible e instrucciones de la app.
4. 04-seguridad-cuenta: instrucciones para cambiar contraseña en la app.
5. 05-alertas-bandeja: avisos por fecha, lectura, filtros y acceso a mantenimiento.
6. 06-alertas-eventos: últimos 28 días, filtros por tipo, tabla y vínculo a Eventos y SOS.
7. 07-alertas-vacia: ausencia real de notificaciones, sin confundirla con ausencia de eventos.

## Fuentes verificadas

- src/panel/modulos/MiPerfil.jsx y src/panel/datos/miPerfil.js.
- Vista actual /panel/mi-perfil: identidad, edición autorizada, documentos y app para contraseña.
- src/panel/modulos/Alertas.jsx y repo.alertas: listar, marcarLeida, marcarTodasLeidas, descartar, descartarLeidos, eventos.
- Datos visuales ficticios y etiquetados: no se copiaron registros ni identificadores privados a la generación y no se crearon registros de prueba.

## Contrato de implementación

- Mi perfil es la cuenta autenticada, no el perfil de una persona elegida en Usuarios. Conservar la verificación de identidad al guardar y los límites de edición por rol. Supervisor y administrador usan sus datos reales; administrador global no recibe una empresa inventada.
- Campos existentes: nombre, cédula, teléfono, dirección y fecha de nacimiento. Correo de acceso solo lectura; cambios de roles no pertenecen a Mi perfil.
- Teléfono actual: input tel con código de país. El selector +58 ilustrado puede implementarse como ayuda, pero no requiere ni presupone un servicio de validación.
- Foto, licencia y cambio habitual de contraseña siguen en la app. No presentar carga de fotos, renovación documental, 2FA, sesiones, preferencias o contraseña en web sin contrato real.
- Índice de manejo solo para quien conduce y cuando exista dato; no inventar índices ni aplicar una puntuación al supervisor. Si se presenta esa variante después, respetar los umbrales actuales ≥80/≥60 y sus textos de MiPerfil, no los de Reportes.
- Documentos solo del usuario autenticado, no de compañeros. Número/vencimiento ausentes se distinguen. Estado solo si se puede derivar; una fecha faltante no confirma vigencia. Conservar error y reintento del listado y la distinción documento declarado/registrado.
- Edición muestra errores, espera y confirmación tras respuesta. Escape y foco correcto para ventanas. No alterar datos al cancelar.
- Alertas respeta el alcance autorizado: supervisor dentro de empresa autorizada; conductor solo sus avisos y los de su unidad asignada conforme API. La propuesta no amplía permisos ni reúne avisos de otras empresas.
- Notificación y evento son datos distintos. Leer/descartar no resuelve una avería ni cierra una ODT. Mantener tipos actuales odt_nueva/alerta_cumplida y representar los títulos que devuelva el servidor.
- Agrupación Hoy/Anteriores y botón Marcar leída son presentación de fecha/acción existentes. Estado Leída es texto, no un botón repetido. Derivar los conteos del mismo listado; no cargar los ejemplos en producción.
- Ver mantenimiento abre la ruta existente. La lista actual solo transporta odtId; no prometer selección directa de la orden si el módulo no admite esa apertura.
- Eventos usa últimos 28 días y tipos existentes. Severidad, conductor, valor y ubicación solo cuando existan. km/h únicamente para exceso de velocidad; no inferir unidades de otras magnitudes. Cantidades por severidad pueden derivarse de la lista cargada; no son puntuaciones de seguridad.
- Tabla sin clasificación, tasas por100km, tendencias o mapa añadidos. Vínculos a unidad y /panel/seguridad existentes; reconocer/resolver pertenece a Eventos y SOS.
- Las fuentes fallan independientemente. Error de eventos no vacía notificaciones; error no equivale a cero ni a buena conducción. Conservar datos previos al refrescar, mostrar motivo comprensible/reintento, registrar fallos de acciones y no silenciarlos al implementar.
- Empty: sin notificaciones solo si respondió el servicio. Bandeja al día solo si sinLeer===0. Ningún 0 de fallback ante errores.
- Móvil: identidad y datos apilados, filas de alerta reorganizadas, tablas con desplazamiento interno y filtros accesibles. Texto además de color, foco visible y controles cómodos.

## Ajustes de las imágenes

Se corrigieron los fondos de las ventanas para retirar preferencias/configuraciones inexistentes; se hicieron coincidir los tres avisos sin leer con las filas y los seis eventos con sus filtros. La foto generada puede variar en textos/iconos; este contrato prevalece. La imagen vacía divide visualmente las dos métricas: al implementar usar la misma banda de la bandeja principal. Sin nuevas funciones de pago ni clasificación de personas.

## Entrega

Galería: output/propuesta-perfil-alertas-v1/index.html. PNG originales sin compresión de texto, aptos para revisar y descargar. La implementación aprobada está en `MiPerfil.jsx`, `Alertas.jsx`, `perfil-alertas.css` y `alertas-presentacion.js`; el sistema observado y sus límites se documentan en `docs/DISENO-PERFIL-ALERTAS.md`.

Validación local comunicada por el coordinador: 72 pruebas aprobadas y build final aprobado; navegador para edición, cancelar, Escape, foco, nombre requerido, guardar sin cambios, instrucciones, filtros, notificaciones reales y eventos vacíos, además de móvil de 390px sin desbordamiento de página. Guardar sin cambios no escribió datos. No se insertaron registros ilustrativos ni se ampliaron permisos.

Revisión visual independiente completada mediante procedimiento alternativo de comparación manual, sin gates formales propios. La única corrección final muestra las acciones masivas y las métricas Sin leer/Avisos de hoy solo en Notificaciones; Eventos muestra el resumen de severidad real antes del detalle y lo omite sin registros. Captura eventos-desktop reemplazada y build final aprobado.

Documentos actualmente vacíos y eventos sin registros: tabla de documentos con registros, ventana documental, resumen de severidad con registros y tabla de eventos poblada no verificados visualmente en navegador. No se ejecutaron lectura ni descarte sobre avisos reales. El cierre corresponde a la implementación local; no hubo despliegue ni push. El detector solo indicó advisories de rampas históricas del sistema global de marketing, cuya deriva se conserva.
