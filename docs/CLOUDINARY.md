# Imágenes en Cloudinary (web y app del conductor)

FOM no guarda imágenes. Cada foto vive en Cloudinary con una **dirección fija** que lleva el id de FOM de lo que retrata. Subir otra foto con la misma dirección la **reemplaza**; no se borra nada. Como la dirección se conoce de antemano, **no hace falta consultar listas**, así que la cuenta puede tener bloqueada la «lista de recursos».

## Qué hay que configurar (una vez)

1. En Cloudinary (Settings, Upload, Upload presets): un preset **Unsigned** (por ejemplo `fom_web`) con **Overwrite** activado. Si el modo es *Signed*, Cloudinary responde «Upload preset must be whitelisted for unsigned uploads».
2. En el `.env.local` de la web (no se sube a Git):
   ```
   VITE_CLOUDINARY_CLOUD_NAME=<nombre de la nube>
   VITE_CLOUDINARY_UPLOAD_PRESET=fom_web
   ```
   Nunca poner el API secret en el navegador: la web no lo necesita.
3. Reiniciar la web (y volver a compilar y publicar si es la versión publicada).

Sin esas variables la web funciona igual y avisa que falta conectar Cloudinary.

## Direcciones fijas

| Qué | Dirección (public_id) | Etiqueta (tag) que también se pone |
|---|---|---|
| Foto de una unidad | `fom/vehiculo/<id>` | `fom_vehiculo_<id>` |
| Foto de perfil | `fom/avatar/<userId>` | `fom_avatar_<userId>` |
| Documento, frente | `fom/documento/<id>/frente` | `fom_documento_<id>` |
| Documento, reverso | `fom/documento/<id>/reverso` | `fom_documento_<id>` |

La foto se ve en `https://res.cloudinary.com/<nube>/image/upload/<transformaciones>/<public_id>`. Las etiquetas son las de la app del conductor (`fom_documento_<id>`, etc.), por si más adelante se activa la lista pública y la app las quiere leer.

## Cómo se reemplaza

- La unidad, la persona y cada cara de un documento tienen UNA foto: «Editar foto» / «Reemplazar» sube otra a la misma dirección y la sustituye.
- Justo después de subir, Cloudinary tarda unos segundos en servir la nueva; la web reintenta sola y mientras tanto muestra la anterior o la ilustración.
- El número `?v=` al final de la URL fuerza a los navegadores a pedir de nuevo la imagen cambiada.

## Límites

- Solo imágenes (JPG, PNG, WebP, HEIC), hasta 10 MB cada una. Los PDF no se suben.
- La web no puede borrar (exige firmar con el API secret, que no va en el navegador). Si hace falta borrar, se hace desde el panel de Cloudinary.
- Una persona sin sesión que conozca el id de una unidad podría adivinar la dirección de su foto: las fotos son públicas por diseño (como en la app). No subir nada confidencial.
