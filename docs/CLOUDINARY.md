# Imágenes en Cloudinary (web y app del conductor)

FOM no guarda imágenes: cada foto va a Cloudinary con una **etiqueta** que lleva el id de FOM de lo que retrata. Web y app usan la misma convención, así una foto subida en una se ve en la otra.

## Qué hay que configurar (una vez)

1. En Cloudinary (Settings → Upload → Upload presets): crear un preset **Unsigned** (por ejemplo `fom_web`). Carpeta libre; permitir imágenes.
2. En Settings → Security → *Restricted media types*: dejar **desmarcado** «Resource list». Es lo que permite volver a leer las fotos por etiqueta (`.../image/list/<etiqueta>.json`). La app del conductor ya depende de lo mismo.
3. En el `.env` de la web:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=<nombre de la nube>
   VITE_CLOUDINARY_UPLOAD_PRESET=fom_web
   ```
   Son los mismos valores que usa la app del conductor (`EXPO_PUBLIC_CLOUDINARY_*`). Nunca poner el API secret en el navegador.
4. Volver a compilar y publicar la web.

Sin esas variables la web funciona igual y avisa en cada lugar de fotos que falta conectar Cloudinary.

## Etiquetas

| Qué | Etiqueta | Quién la usa |
|---|---|---|
| Fotos de un documento | `fom_documento_<id>` | app y web |
| Credencial de una persona | `fom_credencial_<tipo>_<userId>` | app |
| Fotos de una orden | `fom_odt_<id>` (cierre: `fom_odt_cierre_<id>`) | app |
| Inspección | `fom_inspeccion_<id>` | app |
| **Fotos de una unidad** | `fom_vehiculo_<id>` | web (nueva; la app puede adoptarla) |
| **Foto de perfil** | `fom_avatar_<userId>` | web (nueva; la app puede adoptarla) |

La foto principal de una unidad o de una persona es la **más reciente** con su etiqueta. Carpeta de subida: `fom/<etiqueta>`.

## Límites

- Solo imágenes (JPG, PNG, WebP, HEIC), hasta 10 MB cada una. Los PDF no se listan por etiqueta (la lista pública de Cloudinary es de imágenes).
- **No se borra, se reemplaza.** La web no puede borrar (exige firmar con el API secret, que no va en el navegador). En vez de eso, subir una foto nueva REEMPLAZA a la actual: la unidad y la persona muestran solo la más reciente, y un documento muestra el último juego de caras subido junto (cada subida lleva un `lote` en su contexto). Lo anterior queda en Cloudinary pero deja de mostrarse. Si algún día hace falta borrar de verdad, se hace desde el panel de Cloudinary.
- **Foto por carro en las listas:** la lista de Vehículos pide la foto de cada unidad solo cuando su fila se ve en pantalla, y recuerda lo ya pedido.
