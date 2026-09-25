"""Contact sheet: resize images to one width and lay them out in columns.

Usage: python scripts/v7-sheet.py <out.png> <columns> <width> <image> [image ...]
"""
import sys
from PIL import Image
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); fs = sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in fs]
ims = [im.resize((w, round(im.height * w / im.width))) for im in ims]
rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
H = sum(max(i.height for i in r) + 4 for r in rows)
sheet = Image.new('RGB', (cols * (w + 4), H), (255, 0, 140))
y = 0
for r in rows:
    for c, im in enumerate(r): sheet.paste(im, (c * (w + 4), y))
    y += max(i.height for i in r) + 4
sheet.save(out)
