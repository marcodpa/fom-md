# Implementación de Inicio · propuesta variedad

Las cinco imágenes aprobadas se implementan en `src/components/v7/HomeStories.jsx`, montadas desde `src/pages/v7/Inicio.jsx`, con estilos en `src/styles/v7/home-stories.css`.

- Panel + móvil: capturas originales en dispositivos CSS.
- Servicios: índice desplegable que cambia el panel proyectado sobre la laptop.
- App: tres capturas originales, en columnas en escritorio y apiladas en móvil.
- Mantenimiento: dos pantallas y recorrido de cuatro pasos.
- Conducción: perfil original y ampliación CSS de su índice real.

Fondos fotográficos derivados de las propuestas aprobadas: `src/assets/marketing/v7/inicio-variedad/{servicios,galeria,recorrido}.webp`. Se solicitaron ediciones para conservar ambiente y composición, retirar textos y dispositivos superpuestos; en servicios se conservó la laptop con pantalla vacía. Las interfaces se añaden en HTML con las capturas originales de `src/assets/marketing/real/`. Los prompts de las propuestas están en `prompts.json` de esta carpeta.

El tratamiento azul oscuro con iluminación suave está centralizado en `--v7-surface` en `src/styles/v7-kit.css`, aplicado a páginas y secciones publicitarias y a las superficies nuevas de Inicio. Las fotos mantienen su composición. El panel privado y el inicio de sesión no usan este selector.

Validación: compilación de producción, 14 pruebas existentes y revisión visual de escritorio y móvil; comprobación de cambio de servicios y carga de capturas.
