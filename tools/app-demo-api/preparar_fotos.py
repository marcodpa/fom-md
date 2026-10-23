# Fotos de la demo de la app (T-147): recorta fotos de vehículos con LICENCIA LIBRE al tamaño
# que pide cada sitio de la app. Nada generado con IA ni sacado de las fotos de la web.
#
#   python tools/app-demo-api/preparar_fotos.py <nombre> <foto de origen> [x0 y0 x1 y1]
#
# <nombre> es uno de los de abajo; la caja opcional (px de la foto de origen) elige el recorte
# a mano; sin caja se centra. La foto queda en fotos/ y el servidor falso la sirve sola: lo que
# no está en fotos/ no sale en la app (la orden se ve sin fotos, la unidad sin vehículo).
#
# - toyota-hilux.png   la unidad (Toyota Hilux) en la tarjeta de Reportar, la ficha y Mi unidad.
#                       (datos.mjs → fotoDeVehiculo busca <marca>-<modelo>[-16x9|-4x3].jpg|.png aquí y
#                       en comparativa/fotos-vehiculos/recortes; solo la Hilux sale en la app).
#                       La app la pinta con «contain» sobre la tarjeta oscura: mejor recortada al
#                       vehículo entero, 3/4 delantero mirando a la izquierda, con poco aire.
#                       Si trae fondo, se ve como un rectángulo: lo ideal es fondo transparente.
# - falla-1.jpg / falla-2.jpg  fotos del reporte de una orden de frenos (rueda, caucho).
# - taller.jpg                 foto del trabajo terminado (la camioneta en el taller).
import sys
from pathlib import Path

from PIL import Image

SALIDA = Path(__file__).resolve().parent / 'fotos'

# nombre → (ancho, alto) final
TAMANOS = {
    'toyota-hilux.png': (1360, 820),
    'falla-1.jpg': (1000, 750),
    'falla-2.jpg': (1000, 750),
    'taller.jpg': (1000, 750),
}


def recortar(nombre, origen, caja=None):
    ancho, alto = TAMANOS[nombre]
    im = Image.open(origen)
    im = im.convert('RGBA' if nombre.endswith('.png') else 'RGB')
    if caja:
        im = im.crop(caja)
    # Recorte centrado a la proporción final, sin deformar.
    w, h = im.size
    objetivo = ancho / alto
    if w / h > objetivo:
        nw = round(h * objetivo)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w / objetivo)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im = im.resize((ancho, alto), Image.LANCZOS)
    SALIDA.mkdir(exist_ok=True)
    destino = SALIDA / nombre
    if nombre.endswith('.png'):
        im.save(destino, optimize=True)
    else:
        im.save(destino, quality=88)
    return destino


if __name__ == '__main__':
    if len(sys.argv) not in (3, 7) or sys.argv[1] not in TAMANOS:
        print(__doc__ or '', 'Nombres:', ', '.join(TAMANOS))
        sys.exit(1)
    caja = tuple(int(v) for v in sys.argv[3:7]) if len(sys.argv) == 7 else None
    print('lista:', recortar(sys.argv[1], sys.argv[2], caja))
