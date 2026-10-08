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
- **Quitar fotos:** borrar de verdad exige firmar con el API secret, que no puede ir en el navegador. Lo que sí hay sin firma es el «token de borrado» que Cloudinary devuelve al subir (vale 10 minutos): en ese lapso aparece «Quitar esta foto» para corregir un error. Para que el preset devuelva el token hay que activar **Return delete token** en el upload preset.
- **Quitar fotos viejas:** requiere una ruta del servidor (por ejemplo `DELETE /api/v1/console/media` con `publicId`, que valide que la foto pertenece a la empresa del supervisor y firme la petición con el secret guardado en el servidor). Pendiente de pedirle a Juan.
- **Foto por carro en las listas:** la lista de Vehículos pide la foto de cada unidad solo cuando su fila se ve en pantalla, y recuerda lo ya pedido.
