"""Clean photographic plates for the v7 pages.

Each selected v7 slide (output/laminas-secciones-v7/<page>/<file>) is turned into a
background photo without website typography, cards or buttons, so the real
HTML content can sit on top at the same position. Nothing is generated: the
masked regions are reconstructed from their own surroundings with OpenCV.

Mask modes, in 1672x941 slide coordinates:
  text  [x, y, w, h]  removes only glyph-like strokes inside the box (keeps texture)
  block [x, y, w, h]  replaces the whole box (cards, buttons, icons, headers)
  poly  [[x, y], ...] replaces a polygon (e.g. a physical phone the page redraws itself)
  keep  [[x, y], ...] polygons protected from every mask (e.g. fingers in front of that phone)

Masks live in scripts/v7-plates/<page>.json, keyed by '<page>/<id>'.

Usage: python scripts/v7-plates.py [page-or-id ...]
Requires opencv-python-headless and numpy.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SLIDES = ROOT / 'output' / 'laminas-secciones-v7'
OUT = ROOT / 'src' / 'assets' / 'marketing' / 'v7'
CONFIGS = ROOT / 'scripts' / 'v7-plates'


def text_mask(img, box):
    """Glyphs are bright (white or FOM blue) thin shapes: a white top-hat with a kernel
    wider than the thickest stroke isolates them from the photo. An optional fifth box
    value sets that kernel for very large titles."""
    x, y, w, h = box[:4]
    kernel = box[4] if len(box) > 4 else 45
    pad = kernel
    x0, y0 = max(x - pad, 0), max(y - pad, 0)
    x1, y1 = min(x + w + pad, img.shape[1]), min(y + h + pad, img.shape[0])
    crop = img[y0:y1, x0:x1]
    shape = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel, kernel))
    value = crop.max(axis=2)
    bright = cv2.morphologyEx(value, cv2.MORPH_TOPHAT, shape)
    dark = cv2.morphologyEx(value, cv2.MORPH_BLACKHAT, shape)
    blue = crop[:, :, 0].astype(np.int16) - crop[:, :, 2].astype(np.int16)
    blue_hat = cv2.morphologyEx(np.clip(blue, 0, 255).astype(np.uint8), cv2.MORPH_TOPHAT, shape)
    strokes = ((bright > 22) | (blue_hat > 40) | (dark > 60)).astype(np.uint8) * 255
    strokes = cv2.dilate(strokes, np.ones((5, 5), np.uint8), iterations=2)
    full = np.zeros(img.shape[:2], np.uint8)
    full[y0:y1, x0:x1] = strokes
    limit = np.zeros_like(full)
    limit[y:y + h, x:x + w] = 255
    return cv2.bitwise_and(full, limit)


def block_mask(img, box):
    x, y, w, h = box
    mask = np.zeros(img.shape[:2], np.uint8)
    mask[max(y, 0):y + h, max(x, 0):x + w] = 255
    return mask


def grain(shape, seed, strength):
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, strength, shape[:2]).astype(np.float32)
    return cv2.GaussianBlur(noise, (0, 0), 0.6)[:, :, None]


def reconstruct(img, mask, seed):
    """Coarse-to-fine fill: a low resolution pass carries tone and gradients into big
    areas, a full resolution pass restores detail at the borders, grain hides smears."""
    h, w = mask.shape
    small = cv2.resize(img, (w // 6, h // 6), interpolation=cv2.INTER_AREA)
    small_mask = cv2.resize(mask, (w // 6, h // 6), interpolation=cv2.INTER_AREA)
    small_mask = (small_mask > 20).astype(np.uint8) * 255
    coarse = cv2.inpaint(small, small_mask, 7, cv2.INPAINT_TELEA)
    coarse = cv2.GaussianBlur(cv2.resize(coarse, (w, h), interpolation=cv2.INTER_CUBIC), (0, 0), 5)
    fine = cv2.inpaint(img, mask, 4, cv2.INPAINT_TELEA)
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    near_edge = np.clip(1 - dist / 10, 0, 1)[:, :, None]
    filled = fine.astype(np.float32) * near_edge + coarse.astype(np.float32) * (1 - near_edge)
    filled += grain(img.shape, seed, 2.2)
    alpha = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), 1.6)[:, :, None]
    out = img.astype(np.float32) * (1 - alpha) + filled * alpha
    return np.clip(out, 0, 255).astype(np.uint8)


def build(key, spec):
    source = SLIDES / spec['file']
    img = cv2.imread(str(source), cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit(f'No se pudo leer {source}')
    if img.shape[:2] != (941, 1672):
        img = cv2.resize(img, (1672, 941), interpolation=cv2.INTER_AREA)
    mask = np.zeros(img.shape[:2], np.uint8)
    for box in spec.get('text', []):
        mask |= text_mask(img, box)
    for box in spec.get('block', []):
        mask |= block_mask(img, box)
    for poly in spec.get('poly', []):
        cv2.fillPoly(mask, [np.int32(poly)], 255)
    for poly in spec.get('keep', []):
        cv2.fillPoly(mask, [np.int32(poly)], 0)
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8))
    seed = sum(map(ord, key))
    plate = reconstruct(img, mask, seed) if mask.any() else img
    target = OUT / f'{key}.webp'
    target.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(target), plate, [cv2.IMWRITE_WEBP_QUALITY, 82])
    return target


def main():
    config = {}
    for path in sorted(CONFIGS.glob('*.json')):
        config.update(json.loads(path.read_text(encoding='utf-8')))
    wanted = sys.argv[1:]
    for key, spec in config.items():
        if key.startswith('_') or (wanted and not any(key.startswith(w) for w in wanted)):
            continue
        print(build(key, spec).relative_to(ROOT))


if __name__ == '__main__':
    main()
