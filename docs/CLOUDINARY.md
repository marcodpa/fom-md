# Imágenes en Cloudinary (web y app del conductor)

FOM no guarda imágenes. Cada foto vive en Cloudinary bajo una **dirección base** que lleva el id de FOM de lo que retrata. Cloudinary **no deja sobrescribir** en una subida sin firma, así que reemplazar se hace con **versiones numeradas**: la primera foto es `<base>/1`, la siguiente `<base>/2`, y la vigente es la de número más alto (la web la encuentra con consultas livianas). Nada se borra. No hace falta la «lista de recursos»: la cuenta puede tenerla bloqueada.

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

- La unidad, la persona y cada cara de un documento tienen UNA foto vigente: «Editar foto» / «Reemplazar» sube la versión siguiente y esa pasa a mostrarse.
- **Quitar el fondo** (Cloudinary AI, `e_background_removal`) es un complemento de pago que consume créditos, por eso viene **apagado**. Para encenderlo: `VITE_CLOUDINARY_SIN_FONDO=1` en `.env.local`. Encendido, la ficha muestra el carro sin fondo sobre un escenario de FOM; apagado, o si Cloudinary no puede procesar la foto, se muestra la foto normal en un marco 3:2.
- Justo después de subir, Cloudinary tarda unos segundos en servir la nueva; la web reintenta sola y mientras tanto muestra la anterior o la ilustración.
- El número `?v=` al final de la URL fuerza a los navegadores a pedir de nuevo la imagen cambiada.

## Límites

- Solo imágenes (JPG, PNG, WebP, HEIC), hasta 10 MB cada una. Los PDF no se suben.
- La web no puede borrar (exige firmar con el API secret, que no va en el navegador). Si hace falta borrar, se hace desde el panel de Cloudinary.
- Una persona sin sesión que conozca el id de una unidad podría adivinar la dirección de su foto: las fotos son públicas por diseño (como en la app). No subir nada confidencial.
