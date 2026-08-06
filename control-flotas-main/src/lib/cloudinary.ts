/**
 * Subida de fotos a Cloudinary (evidencias de ODT y alertas).
 *
 * Usa un UNSIGNED UPLOAD PRESET (sin secretos en la app): configura en tu
 * cuenta de Cloudinary un preset sin firma y pon en `.env`:
 *   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=<tu cloud name>
 *   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<tu preset unsigned>
 *
 * Sin esas variables la app sigue funcionando en modo local: las fotos se
 * guardan con su URI del teléfono (mock), igual que hasta ahora.
 */

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/** ¿Hay credenciales de Cloudinary en el entorno? */
export function cloudinaryConfigurado(): boolean {
  return !!CLOUD_NAME && !!UPLOAD_PRESET;
}

/**
 * Sube UNA foto local a Cloudinary y devuelve su URL pública (`secure_url`).
 * Si Cloudinary no está configurado o la subida falla, devuelve la URI local
 * (la app no se bloquea por la nube en el modo de pruebas).
 */
export async function subirFotoCloudinary(uri: string): Promise<string> {
  // Las URLs ya remotas (http/https) no se re-suben.
  if (!cloudinaryConfigurado() || /^https?:\/\//.test(uri)) return uri;

  try {
    const body = new FormData();
    // React Native acepta este objeto {uri, name, type} como archivo.
    body.append('file', { uri, name: `evidencia-${Date.now()}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    body.append('upload_preset', UPLOAD_PRESET as string);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body,
    });
    if (!res.ok) return uri;
    const json = (await res.json()) as { secure_url?: string };
    return json.secure_url ?? uri;
  } catch {
    return uri;
  }
}

/** Sube varias fotos en paralelo (con el mismo fallback local por foto). */
export async function subirFotosCloudinary(uris: string[]): Promise<string[]> {
  return Promise.all(uris.map(subirFotoCloudinary));
}
