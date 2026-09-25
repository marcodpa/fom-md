"""Locate the physical screen of a v7 slide and compute where the original FOM
screenshot must be projected.

The generator painted an approximation of the real screenshot inside each device,
so SIFT features of the original capture are matched against the slide and a
homography gives the four corners (top-left, top-right, bottom-right,
bottom-left) in 1672x941 slide coordinates, ready for screenProjection().

With --occlusion OUT.png it also writes a mask (white = screen visible) marking
large regions where something in front of the screen (a head, a hand, a card)
differs from the warped screenshot.

When the painted screen is not a projective copy of the capture, measure the
corners by hand and pass --corners x,y,x,y,x,y,x,y to only build the occlusion mask.

Usage: python scripts/v7-screens.py <slide.png> <screenshot.png> [--roi x,y,w,h] [--corners ...] [--occlusion out.png]
"""
import argparse
import json

import cv2
import numpy as np


def load(path, size=None):
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit(f'No se pudo leer {path}')
    if size and img.shape[:2] != size:
        img = cv2.resize(img, size[::-1], interpolation=cv2.INTER_AREA)
    return img


def locate(slide, shot, roi=None):
    sift = cv2.SIFT_create(nfeatures=6000)
    mask = None
    if roi:
        x, y, w, h = roi
        mask = np.zeros(slide.shape[:2], np.uint8)
        mask[y:y + h, x:x + w] = 255
    # The slide shows the screen at a much smaller scale: match against a reduced capture.
    scale = 1.0
    if shot.shape[1] > 1200:
        scale = 1200 / shot.shape[1]
        shot_small = cv2.resize(shot, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    else:
        shot_small = shot
    k1, d1 = sift.detectAndCompute(cv2.cvtColor(shot_small, cv2.COLOR_BGR2GRAY), None)
    k2, d2 = sift.detectAndCompute(cv2.cvtColor(slide, cv2.COLOR_BGR2GRAY), mask)
    matches = cv2.BFMatcher().knnMatch(d1, d2, k=2)
    good = [m for m, n in (p for p in matches if len(p) == 2) if m.distance < 0.78 * n.distance]
    if len(good) < 12:
        raise SystemExit(f'Solo {len(good)} coincidencias: medir a mano')
    src = np.float32([k1[m.queryIdx].pt for m in good]) / scale
    dst = np.float32([k2[m.trainIdx].pt for m in good])
    H, inliers = cv2.findHomography(src, dst, cv2.RANSAC, 4.0)
    h, w = shot.shape[:2]
    corners = cv2.perspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]])[None], H)[0]
    return H, corners, int(inliers.sum()), len(good)


def occlusion(slide, shot, H, out):
    h, w = slide.shape[:2]
    warped = cv2.warpPerspective(shot, H, (w, h))
    inside = cv2.warpPerspective(np.full(shot.shape[:2], 255, np.uint8), H, (w, h))
    diff = cv2.absdiff(cv2.GaussianBlur(slide, (0, 0), 6), cv2.GaussianBlur(warped, (0, 0), 6))
    diff = diff.max(axis=2)
    front = ((diff > 38) & (inside > 0)).astype(np.uint8) * 255
    front = cv2.morphologyEx(front, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    front = cv2.morphologyEx(front, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    # Only large blobs are real occluders; small differences are painted UI details.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(front)
    keep = np.zeros_like(front)
    for i in range(1, count):
        if stats[i, cv2.CC_STAT_AREA] > 2500:
            keep[labels == i] = 255
    visible = cv2.GaussianBlur(255 - keep, (0, 0), 1.5)
    cv2.imwrite(out, visible)
    return int((keep > 0).sum())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('slide')
    parser.add_argument('shot')
    parser.add_argument('--roi')
    parser.add_argument('--corners')
    parser.add_argument('--occlusion')
    args = parser.parse_args()
    slide = load(args.slide, (941, 1672))
    shot = load(args.shot)
    roi = tuple(map(int, args.roi.split(','))) if args.roi else None
    if args.corners:
        corners = np.float32(list(map(float, args.corners.split(',')))).reshape(4, 2)
        h, w = shot.shape[:2]
        H = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), corners)
        result = {'corners': corners.astype(int).tolist()}
    else:
        H, corners, inliers, good = locate(slide, shot, roi)
        result = {'corners': [[round(float(x)), round(float(y))] for x, y in corners], 'inliers': inliers, 'matches': good}
    if args.occlusion:
        result['occludedPixels'] = occlusion(slide, shot, H, args.occlusion)
    print(json.dumps(result))


if __name__ == '__main__':
    main()
