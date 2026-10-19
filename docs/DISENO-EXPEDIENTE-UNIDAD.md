# Ficha y usuarios de la unidad

El expediente conserva la identidad y los tokens existentes del panel. No modifica el fondo, la marca, la navegación global ni las preferencias Azul FOM / Glass gris.

El orden de las pestañas sigue la lectura de la operación: Resumen (panorama), Ficha de la unidad (identificación), Telemetría (estado actual), Usuarios (responsables e historial de uso), Inspecciones (detección de fallas), Mantenimiento (atención de fallas y servicios), Documentos (vigencia y respaldo) y Costos (impacto económico). Inspecciones precede a Mantenimiento para mantener juntos los pasos de detectar y atender.

- Resumen conserva el vehículo y el recorrido. La ficha se encuentra en su propia pestaña, con identificación, GPS, área y enlace a Usuarios.
- La cabecera muestra la foto registrada junto al alias y la placa en todas las pestañas. Reutiliza la foto vigente y su ampliación; si no existe, muestra «Sin foto». La variante compacta no cambia la foto de Resumen ni sus controles de edición. Referencia aprobada: `output/propuesta-foto-cabecera-unidad-v1/01-cabecera-con-foto.png`.
- Usuarios muestra las asignaciones vigentes, distingue principal y secundarios y permite cambiar el principal con las guardas de rol existentes.
- Historial de uso consulta jornadas por `vehicleId`, con filtro de estado y páginas de 25 registros. La búsqueda por nombre filtra la página visible. Se actualiza cada 60 segundos mientras la página esté visible.
- Una asignación vigente no equivale a una jornada activa. No se inventan jornadas ni períodos de uso. En demostración se explica la ausencia de jornadas.
- Ver perfil usa el identificador del usuario y abre `/panel/personal/:id`. No se modifica la implementación del perfil, que se trabaja en otra conversación.
- La pestaña se guarda en `?vista=ficha` o `?vista=usuarios`; al volver del perfil se conserva la vista.
- Los errores del directorio se muestran con reintento. Un secundario nunca ocupa la titularidad por ausencia de un principal.

## Propuestas y evidencia

`output/propuesta-expediente-unidad-v1/` contiene las imágenes iniciales descartadas, las propuestas corregidas basadas en una captura real y capturas de implementación. Las primeras dos imágenes no son autoridad visual: cambiaron incorrectamente el fondo y la marca. La página real y los tokens del proyecto prevalecen. `prompts-corregidos.json` registra los prompts y la herramienta integrada empleada.

## Verificación

- Build de Vite y suite de pruebas del proyecto.
- Página conectada: ad-132 muestra Marco Pacheco como principal y Juan Guerra como secundario; la API no devuelve jornadas para esta unidad.
- El enlace de Marco abre su expediente con su identidad y su unidad correcta.
- Inspección de escritorio y móvil; los componentes nuevos usan los tokens compartidos y las tablas mantienen desplazamiento horizontal propio.

El historial cubre jornadas de uso registradas. La API actual no expone una lectura del historial de asignaciones revocadas, por lo que no se presenta esa colección como si existiera.
