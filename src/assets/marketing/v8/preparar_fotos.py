"""Prepara las fotos y capturas de la web v8 con NOMBRES ESTABLES.

Cada imagen queda como varias copias del mismo nombre, una por ancho y formato:
    <nombre>-<ancho>x<alto>.avif / .webp     p. ej. hero-monitor-carretera-1920x1085.avif

src/components/v8/fotosV8.js las encuentra solas (import.meta.glob) y arma un <picture> con
AVIF primero y WebP de respaldo, con los anchos reales. La versión para teléfono es otra entrada
con el sufijo «-movil» (p. ej. hero-monitor-carretera-movil): fotosV8.js la sirve sola con
<source media> en pantallas de teléfono. Para cambiar una foto NO se toca código: se vuelve a
correr este script con el mismo nombre y la fuente nueva; borra las copias viejas de ese nombre
y crea las nuevas.

Reglas de calidad (pedido de Marco: fotos nítidas y fondo compartido):
  - Siempre AVIF + WebP CON CANAL ALFA cuando la fuente lo trae: las fotos del paquete
    comparativa/web-v8-fotos llevan los bordes fundidos con transparencia. Nunca JPG.
  - Nunca se agranda: los anchos mayores que la fuente se descartan y, si la fuente queda entre
    dos anchos, su ancho real es la copia mayor.
  - Sin recomprimir de más: si junto a la fuente hay una carpeta «web/» con las copias ya
    optimizadas del paquete (<nombre>-<ancho>.avif|webp), se copian tal cual. Solo se codifica
    desde la fuente cuando no existen o cuando la fuente es más nueva que ellas.
  - Anchos: fotos 640, 1280, 1920 y 2880 (2880 solo si la fuente lo tiene); fotos «-movil»
    750 y 1170; capturas del panel 1280, 1920, 2880; capturas de la app 750 y 1170.
  - Capturas (panel / telefono): calidad alta para que el texto de la interfaz se lea limpio.

Uso (desde la raíz del repo):
    python src/assets/marketing/v8/preparar_fotos.py <nombre> <ruta-fuente> [foto|panel|telefono]
    python src/assets/marketing/v8/preparar_fotos.py --lista src/assets/marketing/v8/fuentes.txt
fuentes.txt: una línea por imagen «nombre  tipo  ruta» (las líneas con # se ignoran).
"""
import os
import re
import shutil
import sys

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ANCHOS = {
    'foto': [640, 1280, 1920, 2880],
    'movil': [750, 1170],
    'panel': [1280, 1920, 2880],
    'telefono': [750, 1170],
}
# Calidad al codificar desde la fuente (solo si no hay copias listas en web/).
CALIDAD = {
    'foto': {'avif': 60, 'webp': 84},
    'movil': {'avif': 60, 'webp': 84},
    'panel': {'avif': 80, 'webp': 92},
    'telefono': {'avif': 80, 'webp': 92},
}
EXTS = ('.webp', '.jpg', '.jpeg', '.png', '.avif')
FORMATOS = ('avif', 'webp')


def borrar_copias(nombre):
    for f in os.listdir(AQUI):
        base, ext = os.path.splitext(f)
        if ext.lower() not in EXTS:
            continue
        cab, _, medida = base.rpartition('-')
        if cab == nombre and re.fullmatch(r'\d+x\d+', medida):
            os.remove(os.path.join(AQUI, f))


def carpeta_lista(fuente):
    """La carpeta web/ del paquete de fotos que contiene la fuente (sube hasta 3 niveles)."""
    d = os.path.dirname(os.path.abspath(fuente))
    for _ in range(3):
        cand = os.path.join(d, 'web')
        if os.path.isdir(cand):
            return cand
        d = os.path.dirname(d)
    return None


def copias_listas(nombre, fuente, W, H):
    """{ancho: {formato: ruta}} con las copias ya optimizadas del paquete, si coinciden."""
    web = carpeta_lista(fuente)
    if not web:
        return {}
    listas = {}
    patron = re.compile(re.escape(nombre) + r'-(\d+)\.(avif|webp)$')
    for f in os.listdir(web):
        m = patron.fullmatch(f)
        if m:
            listas.setdefault(int(m.group(1)), {})[m.group(2)] = os.path.join(web, f)
    # Solo sirven si son la misma foto (misma proporción), traen los dos formatos y no son más
    # viejas que la fuente (si la fuente cambió después, p. ej. una captura repetida con el mismo
    # nombre, las copias de web/ son de la imagen anterior y hay que codificar la nueva).
    buenas = {}
    hecha = os.path.getmtime(fuente)
    for a, fmts in listas.items():
        if set(fmts) != set(FORMATOS) or a > W:
            continue
        if min(os.path.getmtime(r) for r in fmts.values()) < hecha:
            continue
        w, h = Image.open(fmts['webp']).size
        if w == a and abs(h - H * a / W) <= 2:
            buenas[a] = fmts
    return buenas


def preparar(nombre, fuente, tipo='foto'):
    if tipo not in ('foto', 'panel', 'telefono'):
        raise SystemExit(f'tipo desconocido: {tipo}')
    if not os.path.isfile(fuente):
        raise SystemExit(f'no existe la fuente: {fuente}')
    clase = 'movil' if tipo == 'foto' and nombre.endswith('-movil') else tipo
    im = Image.open(fuente)
    W, H = im.size
    alfa = im.mode in ('RGBA', 'LA', 'PA') or (im.mode == 'P' and 'transparency' in im.info)
    modo = 'RGBA' if alfa else 'RGB'
    anchos = [a for a in ANCHOS[clase] if a <= W]
    if W < ANCHOS[clase][-1] and (not anchos or W > anchos[-1] * 1.15):
        anchos.append(W)  # la fuente queda entre dos anchos: su ancho real es la copia mayor
    listas = copias_listas(nombre, fuente, W, H)
    if listas:
        # El paquete ya trae los anchos elegidos para esa foto (p. ej. sin 2880 cuando no va a
        # sangre): se respetan tal cual, sin codificar anchos extra.
        anchos = []
    borrar_copias(nombre)
    hechos = []
    base = None
    for a in sorted(set(anchos) | set(listas)):
        if a in listas:
            w, h = Image.open(listas[a]['webp']).size
            origen = 'lista'
        else:
            if base is None:
                base = im.convert(modo)
            w, h = a, round(H * a / W)
            copia = base if a == W else base.resize((w, h), Image.LANCZOS)
            origen = 'nueva'
        for fmt in FORMATOS:
            destino = os.path.join(AQUI, f'{nombre}-{w}x{h}.{fmt}')
            if origen == 'lista':
                shutil.copyfile(listas[a][fmt], destino)
            elif fmt == 'avif':
                copia.save(destino, 'AVIF', quality=CALIDAD[clase]['avif'], speed=4)
            else:
                copia.save(destino, 'WEBP', quality=CALIDAD[clase]['webp'], method=6, alpha_quality=100)
            hechos.append(f'{os.path.basename(destino)} {os.path.getsize(destino) // 1024} KB')
    print(nombre, f'({"alfa" if alfa else "sin alfa"}, {"copias listas" if listas else "codificada"}) ->', ', '.join(hechos))


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
