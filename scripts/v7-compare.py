"""Stack a v7 slide (top) over the rendered section (bottom) at half size for review.

Usage: python scripts/v7-compare.py <slide.png> <render.png> <out.png> [--scale 0.5]
Requires Pillow.
"""
import sys
from PIL import Image

slide, render, out = sys.argv[1:4]
scale = float(sys.argv[sys.argv.index('--scale') + 1]) if '--scale' in sys.argv else 0.5
a = Image.open(slide).convert('RGB')
b = Image.open(render).convert('RGB')
w = round(a.width * scale)
a = a.resize((w, round(a.height * w / a.width)), Image.LANCZOS)
b = b.resize((w, round(b.height * w / b.width)), Image.LANCZOS)
sheet = Image.new('RGB', (w, a.height + b.height + 6), (255, 0, 140))
sheet.paste(a, (0, 0))
sheet.paste(b, (0, a.height + 6))
sheet.save(out)
