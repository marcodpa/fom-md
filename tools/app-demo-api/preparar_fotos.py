# Fotos de la demo de la app (T-147), sacadas de imágenes que ya están en el repo. Nada de IA.
#
#   python tools/app-demo-api/preparar_fotos.py
#
# - hilux-2022.png: la Hilux 2022 del panel (src/assets/hilux.png, render con transparencia
#   suave y bordes limpios), pintada en plata como la Unidad 01 y sin la matrícula de muestra. La de la app (fom-driver-juan/assets/.../hilux.png) tiene el borde serruchado y
#   un damero pegado detrás de los vidrios: capturar.mjs sirve ésta en su lugar.
# - falla-1/2, luz-trasera, taller: recortes de fotos del paquete de la web.
import colorsys
from pathlib import Path

from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = Path(__file__).resolve().parent / 'fotos'
SALIDA.mkdir(exist_ok=True)


def sombra_de_piso(im, dx=0, dy=0):
    # La sombra del piso viene en gris OPACO (pensada para fondo blanco): sobre la tarjeta
    # oscura se veía como una mancha clara. Debajo de la carrocería, todo lo gris que no es
    # caucho pasa a sombra de verdad: negro, más opaco donde la original era más oscura.
    w, h = im.size
    px = im.load()
    ruedas = [(692 + dx, 672 + dy, 140), (1234 + dx, 483 + dy, 112), (190 + dx, 615 + dy, 118)]  # centro y radio

    def en_piso(x, y):
        return y > h * 0.6

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not a or not en_piso(x, y) or max(r, g, b) - min(r, g, b) >= 30:
                continue
            # Los rines (claros) se respetan enteros; del caucho, lo oscuro.
            if any((x - cx) ** 2 + (y - cy) ** 2 < (rr * 0.66) ** 2 for cx, cy, rr in ruedas):
                continue
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            if lum < 58:
                continue
            px[x, y] = (0, 0, 0, int(min(190, max(0, (250 - lum) * 1.5)) * a / 255))


def hilux():
    im = Image.open(RAIZ / 'src/assets/hilux.png').convert('RGBA')
    w, h = im.size
    px = im.load()
    # Antes de pintar: la carrocería todavía es roja y no se confunde con la sombra gris.
    x0, y0, _, _ = im.getbbox()
    sombra_de_piso(im, x0, y0)
    # Rojo → plata: lo rojo (también los brillos rosados) pasa a gris con su mismo sombreado.
    # Las luces traseras (al fondo, a la derecha) se dejan rojas.
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            hue, sat, val = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            rojo = (hue < 0.06 or hue > 0.93) and (sat > 0.18 or (sat > 0.06 and val > 0.55))
            if rojo and not (x > w * 0.955 and y < h * 0.42):
                v = int(min(246, 10 + val * 255 * 0.9))
                px[x, y] = (v - 3, v, v + 4, a)
    # La matrícula de muestra («HUM3D»), en blanco liso, sin letras.
    d = ImageDraw.Draw(im)
    d.polygon([(64, 99 + 443), (208, 115 + 443), (208, 162 + 443), (61, 146 + 443)], fill=(232, 234, 237, 255))
    # Recorte a lo que de verdad se ve (sin la sombra tenue de los extremos): así ocupa en la
    # tarjeta lo mismo que la foto de la app, que es más apaisada.
    im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 110 else 0).getbbox())
    im.save(SALIDA / 'hilux-2022.png', optimize=True)
    return im


def recortes():
    a = Image.open(RAIZ / 'comparativa/web-v8-fotos/fotos-generadas-higgsfield/tecnico-telefono-vacio-4k.png').convert('RGB')
    a.crop((3200, 1300, 3840, 1780)).resize((1000, 750), Image.LANCZOS).save(SALIDA / 'falla-1.jpg', quality=88)
    a.crop((3160, 640, 3840, 1150)).resize((1000, 750), Image.LANCZOS).save(SALIDA / 'falla-2.jpg', quality=88)
    b = Image.open(RAIZ / 'comparativa/web-v8-fotos/maestros/taller-mantenimiento.jpg').convert('RGB')
    b.crop((0, 40, 1000, 790)).resize((1000, 750), Image.LANCZOS).save(SALIDA / 'taller.jpg', quality=88)
    b.crop((380, 0, 1100, 620)).resize((900, 775), Image.LANCZOS).save(SALIDA / 'luz-trasera.jpg', quality=88)


if __name__ == '__main__':
    recortes()
    hilux()
    print('fotos listas en', SALIDA)
