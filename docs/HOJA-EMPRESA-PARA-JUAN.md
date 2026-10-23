# Hoja de tu empresa: pedido para fom-core (Juan)

Fecha: 23 oct 2026 · Tarea T-133

## Qué pasa hoy

«Crear desde la hoja de tu empresa» (Inspecciones › Plantillas) guarda dos cosas:

1. **Las imágenes de la hoja**: van a Cloudinary en `fom/hoja/<empresa>/<codigo>-v<version>/<n>`.
   Cloudinary no deja pisar una imagen ya subida y el panel guarda el `public_id` exacto de cada
   página, así que esto está bien.
2. **El mapa** (dónde va cada X, la fecha, la unidad, la firma…): decide qué se escribe en la hoja
   impresa. Antes se subía a Cloudinary como JSON en una ruta que cualquiera puede adivinar, y con
   el preset sin firma un tercero podía subir otro. **Ya no se sube.** Ahora se queda en el
   navegador de quien lo creó, marcado como *provisional*: en otra computadora la inspección se
   imprime con la planilla de siempre.

## Qué necesitamos

Un campo en la plantilla de inspección donde guardar el mapa, escrito con la sesión del gestor:

- `printSheet` (JSON, opcional) en `inspection_templates`.
- Se manda en `POST /console/inspection-templates` (o con un `PUT/PATCH …/{id}/print-sheet`
  aparte, para pegarlo después de crearla).
- Se devuelve en `GET /console/inspection-templates/{id}` (y, si no pesa, en la lista).
- **No** se manda a la app del conductor (`/mobile/.../inspection-templates`): es solo para imprimir.
- Tamaño: el mapa ocupa unos pocos KB (máx. 12 páginas, 60 grupos, 400 preguntas). Un tope de
  64 KB sobra.

Forma del mapa (`formato: 1`):

```json
{
  "formato": 1, "codigo": "chequeo", "version": 1, "nombre": "Chequeo",
  "papel": "a4 | carta | oficio", "orientacion": "vertical | horizontal", "marca": "x | check",
  "paginas": [{ "ancho": 1654, "alto": 2339 }],
  "grupos": [{ "id": "g1", "pagina": 0, "modo": "columnas | unica",
               "x": { "conforme": 0.62, "falla": 0.74, "observacion": 0.68 }, "notas": { "x0": 0.78, "x1": 0.95 } }],
  "preguntas": [{ "codigo": "chequeo.01", "nombre": "Luces delanteras funcionan", "grupo": "g1", "pagina": 0, "y": 0.2 }],
  "campos": { "unidad": { "pagina": 0, "x": 0.1, "y": 0.1, "ancho": 0.3, "alto": 0.03 } },
  "imagenes": ["fom/hoja/<empresa>/chequeo-v1/1"]
}
```

Todas las posiciones son fracciones de 0 a 1. Si el servidor valida esto mismo (papel y
orientación de la lista, números en 0–1, listas acotadas), mejor; el panel igual lo revisa al
leerlo (`validarMapa` en `src/panel/datos/hojaEmpresa.js`) y descarta lo que no cuadre.

## Qué no sirve

- `description` de la plantilla: no sabemos su tope en la API ni si la lista la devuelve, y la
  lee cualquiera que vea la plantilla.
- `helpText` de un ítem: la app se lo **muestra al conductor** como ayuda (y tiene tope de 500).

Cuando exista `printSheet`, el panel lo escribe al crear la plantilla y lo lee al imprimir; el
almacén local queda solo para la demostración.
