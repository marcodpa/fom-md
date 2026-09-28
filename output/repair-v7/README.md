# Reparación de fotografías y movimiento — 28 septiembre 2026

Se conserva el diseño v7 actual. Alcance: las once páginas publicitarias; no panel ni autenticación.

## Causa y correcciones

- `scripts/v7-plates.py` borraba elementos de las propuestas con OpenCV. Sus máscaras dejaban rectángulos, manchas y fragmentos de manos que se descubrían al animar las capas.
- Se repararon 18 fotografías con `image_gen.imagegen`. Los archivos finales están en `src/assets/marketing/v7/`; `asset-manifest.json` registra cada destino y el original generado local. Los PNG de esta carpeta son hojas de inspección **anteriores** a la reparación.
- En App, cuatro fondos completos sustituyen los teléfonos borrados. El teléfono HTML mantiene las capturas reales de Inicio, Inspección y Perfil. Se eliminaron las manos recortadas por polígonos; se redujo el desplazamiento lateral y el retraso del teléfono; su fondo ya no tiene un parallax independiente. La interpolación se cancela al salir de la página.
- Las pantallas proyectadas permanecen visibles junto a sus fotografías. Se retiraron los destellos, los recortes de títulos y la sucesión arbitraria de cortinas, desenfoques y zooms. Se conserva una entrada breve del texto, además de recorridos GPS, llamadas de telemetría, pestañas, geocercas y feedback de controles.
- El observador de entrada admite secciones altas. Movimiento reducido evita desplazamiento magnético, inclinación y animaciones decorativas.
- Contacto coloca la métrica de 48 h después de la lista, sin superponerla; telemetría deja crecer su sección para mostrar todo el texto. Preguntas corrige el encaje del monitor y la etiqueta de demostración. Seguridad conserva el encuadre del reproductor al entrar en pantalla completa.
- El contraste se resuelve con una sombra gradual en CSS, no con parches pintados dentro de la fotografía.

## Conservación

Las entradas reparadas de `scripts/v7-plates/*.json` tienen `repaired: true`. El generador antiguo las omite para no volver a destruir las reparaciones. Restaurar los WebP desde Git si faltan. Para futuras correcciones fotográficas usar el editor de imágenes; mantener el lienzo 1672 × 941 y la posición de las esquinas de los dispositivos. Las capturas de `src/assets/marketing/real/` siguen siendo las originales, superpuestas en HTML.

## Verificación

- Navegación de las once rutas en escritorio y a 390 px; sin desbordamiento horizontal ni imágenes cargadas rotas detectadas.
- Inspección visual de fondos, transiciones del teléfono, GPS, telemetría, geocercas, pestañas y preguntas desplegables.
- Comprobación de límites de texto y separación de la métrica de Contacto.
- `npm test`: 14 pruebas aprobadas.
- `npm run build`: compilación correcta.

Los cambios están en la copia local. No se ha realizado despliegue ni publicación remota en esta tarea.
