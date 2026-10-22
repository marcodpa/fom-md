"""Prepara las fotos y capturas de la web v8 con NOMBRES ESTABLES.

Cada imagen queda como varias copias del mismo nombre, una por ancho:
    <nombre>-<ancho>x<alto>.<ext>      p. ej. hero-monitor-carretera-1672x941.jpg

src/components/v8/fotosV8.js las encuentra solas (import.meta.glob) y arma el srcset con
esos anchos. Para cambiar una foto NO se toca código: se vuelve a correr este script con
el mismo nombre y la fuente nueva; borra las copias viejas de ese nombre y crea las nuevas.

Reglas de calidad (pedido de Marco: que las capturas se vean nítidas):
  - Nunca se agranda: los anchos que superan el ancho real de la fuente se descartan.
  - La copia más grande es la fuente tal cual cuando ya es JPG o WebP (sin recomprimir).
  - Fotos: copias menores en WebP calidad 90, reducción LANCZOS.
  - Capturas del panel y de la app (tipo panel / telefono): WebP SIN PÉRDIDA, para que el
    texto de la interfaz se lea limpio.
  - Las imágenes con transparencia (objetos recortados) la conservan en WebP con alfa.
  - Una copia menor que pesa más del 70 % de la grande se descarta (no ahorra nada).

Uso (desde la raíz del repo):
    python src/assets/marketing/v8/preparar_fotos.py <nombre> <ruta-fuente> [foto|panel|telefono]
    python src/assets/marketing/v8/preparar_fotos.py --lista src/assets/marketing/v8/fuentes.txt
fuentes.txt: una línea por imagen «nombre  tipo  ruta» (las líneas con # se ignoran).
"""
import os
import shutil
import sys

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ANCHOS = {
    'foto': [828, 1280, 1920, 2560, 3200],
    'panel': [1080, 1440, 2160, 2880],
    'telefono': [390, 585, 780, 1170],
}
EXTS = ('.webp', '.jpg', '.jpeg', '.png', '.avif')


def borrar_copias(nombre):
    for f in os.listdir(AQUI):
        base, ext = os.path.splitext(f)
        if ext.lower() not in EXTS:
            continue
        cab, _, medida = base.rpartition('-')
        if cab == nombre and 'x' in medida and medida.replace('x', '').isdigit():
            os.remove(os.path.join(AQUI, f))


def preparar(nombre, fuente, tipo='foto'):
    if tipo not in ANCHOS:
        raise SystemExit(f'tipo desconocido: {tipo}')
    if not os.path.isfile(fuente):
        raise SystemExit(f'no existe la fuente: {fuente}')
    im = Image.open(fuente)
    W, H = im.size
    # Objetos recortados (teléfono, laptop, GPS, Hilux...): se conserva la transparencia para
    # que se apoyen directo sobre el fondo de la página, sin caja de otro tono.
    alfa = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info)
    modo = 'RGBA' if alfa else 'RGB'
    ext = os.path.splitext(fuente)[1].lower()
    borrar_copias(nombre)
    hechos = []
    anchos = [W] + [a for a in reversed(ANCHOS[tipo]) if a < W]
    peso_total = None
    for a in anchos:
        h = round(H * a / W)
        destino = os.path.join(AQUI, f'{nombre}-{a}x{h}')
        if a == W and tipo == 'foto' and ext in ('.jpg', '.jpeg', '.webp') and not alfa:
            destino += '.jpg' if ext in ('.jpg', '.jpeg') else '.webp'
            shutil.copyfile(fuente, destino)
        else:
            copia = im.convert(modo) if a == W else im.convert(modo).resize((a, h), Image.LANCZOS)
            destino += '.webp'
            if tipo == 'foto':
                copia.save(destino, 'WEBP', quality=90, method=6, exact=alfa)
            else:
                copia.save(destino, 'WEBP', lossless=True, quality=100, method=4)
        peso = os.path.getsize(destino)
        if peso_total is None:
            peso_total = peso
        elif peso > peso_total * 0.7:
            # Una copia menor que casi no ahorra peso no sirve: el navegador reduce la grande
            # sin perder nitidez (pasa con las capturas sin pérdida).
            os.remove(destino)
            continue
        hechos.append(f'{os.path.basename(destino)} ({peso // 1024} KB)')
    print(nombre, '->', ', '.join(hechos))


def main(args):
    if len(args) >= 2 and args[0] == '--lista':
        with open(args[1], encoding='utf-8') as lista:
            for linea in lista:
                linea = linea.strip()
                if not linea or linea.startswith('#'):
                    continue
                nombre, tipo, ruta = linea.split(None, 2)
                preparar(nombre, ruta, tipo)
        return
    if len(args) < 2:
        raise SystemExit(__doc__)
    preparar(args[0], args[1], args[2] if len(args) > 2 else 'foto')


if __name__ == '__main__':
    main(sys.argv[1:])
