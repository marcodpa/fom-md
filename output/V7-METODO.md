# Método v7: cómo se implementa cada sección

Complementa [CONTINUAR-REDISENO.md](../CONTINUAR-REDISENO.md) y [PLAN-IMPLEMENTACION-V7.md](PLAN-IMPLEMENTACION-V7.md). Referencia completa: **Plataforma** (`src/pages/v7/Plataforma.jsx`, `src/styles/v7/plataforma.css`, `scripts/v7-plates/02-plataforma.json`).

## Idea

Cada lámina seleccionada (`output/laminas-secciones-v7/manifest.json`, campo `file`) se convierte en una sección de 1672 × 941:

1. **Fotografía limpia** (`src/assets/marketing/v7/<página>/<id>.webp`): la propia lámina sin textos, tarjetas ni botones web. No se genera nada: `scripts/v7-plates.py` borra las zonas indicadas en `scripts/v7-plates/<página>.json` y reconstruye el fondo con sus alrededores (OpenCV). Persona, vehículos, dispositivos, marcas físicas y encuadre quedan idénticos.
2. **Capturas originales** proyectadas en cada pantalla física (`src/assets/marketing/real/*.webp`) con `screenProjection`. Si una persona u objeto tapa la pantalla, un polígono `clip` deja visible solo la parte correcta.
3. **HTML real** encima, en la misma posición medida en la lámina: títulos, textos, iconos, tarjetas, botones, preguntas y pie.

## Requisitos

```sh
pip install opencv-python-headless numpy pillow
npm run dev -- --host 127.0.0.1 --port 5174
```

Si Python no encuentra `cv2` tras instalarlo (entornos con `site-packages` de usuario deshabilitado): `pip install --target <carpeta> opencv-python-headless` y `PYTHONPATH=<carpeta>`.

## Pasos por sección

1. **Mirar la lámina** y su `content` en el manifiesto. El texto factual sale de `src/content/pages.js` (páginas de producto) o del `content` del manifiesto / `src/pages/ReferenceMarketing.jsx` (páginas informativas). Si la lámina acortó o deformó un texto, manda el contenido real.
2. **Máscaras**: en `scripts/v7-plates/<página>.json`, por lámina:
   - `text: [x, y, w, h]` borra solo trazos claros/azules (letras, iconos) conservando la textura de la foto. Para títulos muy gruesos, quinto valor = tamaño del núcleo (p. ej. `61`).
   - `block: [x, y, w, h]` reemplaza la caja entera (tarjetas, botones, logotipos rellenos, cabecera `[0,0,1672,76]` en los héroes).
   - Generar: `python scripts/v7-plates.py <página>` y revisar con `python scripts/v7-sheet.py <out.png> 2 836 <webp...>`. Las zonas que quedan bajo tarjetas HTML opacas pueden quedar difusas; las visibles deben quedar limpias.
3. **Pantallas**: medir las cuatro esquinas interiores (superior izquierda, superior derecha, inferior derecha, inferior izquierda) con `python scripts/v7-zoom.py <lámina> <out.png> x,y x,y x,y x,y` (rejilla cada 10 px en coordenadas de lámina). Comprobar con `python scripts/v7-fit.py <foto.webp> <captura.png> <out.png> <8 números> [polígono visible]`. `scripts/v7-screens.py` intenta localizar la pantalla automáticamente, pero la pantalla pintada por el generador rara vez es una copia proyectiva exacta: medir a mano manda. Usar la captura que indica `refs`; el índice de conducción se enseña siempre con `app-perfil`.
4. **Componente** con `V7Section` y las piezas de `src/components/v7/V7Kit.jsx` (`Features`, `StatCard`, `DemoButton`, `FaqList`, `MailPrompt`, `V7Footer`, `V7Icon`). Composiciones propias de una lámina se escriben en la página con HTML y clases de esa página.
5. **Geometría** en la hoja de la página, dentro de `@media(min-width:761px)`, en píxeles de lámina: `left:calc(60*var(--u)); top:calc(215*var(--u)); font-size:calc(56*var(--u))`. `--u` es 1/1672 del ancho de la sección.
6. **Móvil** (≤ 760 px): el kit apila texto → foto → tarjetas. Cada sección elige el recorte de la foto con `--m-w` (ancho) y `--m-x` (desplazamiento), para que la persona o el dispositivo queden reconocibles. Reordenar con `order` si hace falta.
7. **Verificar**: `node scripts/v7-shots.mjs <ruta> <carpeta>` (escritorio 1672 × 941) y `... --mobile` (390 × 844) capturan cada sección; `python scripts/v7-compare.py <lámina> <captura> <out.png>` pone la lámina encima de la web. Revisar composición, tamaños, cortes, fotos, pantallas y desbordamiento (`overflow` debe ser 0).

## Reglas de código

- Una página = `src/pages/v7/<Página>.jsx` + `src/styles/v7/<página>.css`. Todas las reglas de la hoja empiezan por la clase raíz de la página o un prefijo propio (`pf-`, `ap-`, `fn-`, `sg-`, `ar-`, `qs-`, `qo-`, `bn-`, `pq-`, `ct-`): las hojas de páginas visitadas permanecen cargadas.
- Iconos que no estén en el kit: pasar los trazos SVG (24 × 24) directamente como `icon`/`name`.
- Un solo `h1` por página (el héroe), `h2` por sección, `aria-labelledby` en cada sección, textos alternativos de capturas con «Datos de demostración».
- El formulario de contacto es `ContactForm` (prepara un correo; no envía). No inventar teléfonos, precios, clientes, garantías ni cifras: solo las de `pages.js`/manifiesto.
- No cambiar `/entrar`, `/panel/*`, autenticación ni backend.
