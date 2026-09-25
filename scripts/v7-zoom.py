"""Zoom windows (160px, x3, 10px grid in slide coordinates) around given points, to
measure screen corners on a v7 slide.

Usage: python scripts/v7-zoom.py <slide.png> <out.png> x,y [x,y ...]
"""
import sys, cv2, numpy as np
slide=cv2.imread(sys.argv[1]); out=sys.argv[2]; pts=[tuple(map(int,p.split(','))) for p in sys.argv[3:]]
R=80; Z=3; tiles=[]
for (cx,cy) in pts:
    x0,y0=cx-R,cy-R
    pad=cv2.copyMakeBorder(slide,R,R,R,R,cv2.BORDER_CONSTANT,value=(60,0,60))
    crop=pad[y0+R:y0+R+2*R, x0+R:x0+R+2*R]
    big=cv2.resize(crop,None,fx=Z,fy=Z,interpolation=cv2.INTER_NEAREST)
    for i in range(0,2*R+1):
        X=x0+i; Y=y0+i
        if X%10==0:
            cv2.line(big,(i*Z,0),(i*Z,2*R*Z),(0,255,255) if X%50==0 else (0,110,110),1)
            if X%50==0: cv2.putText(big,str(X),(i*Z+2,12),cv2.FONT_HERSHEY_SIMPLEX,.4,(0,255,0),1)
        if Y%10==0:
            cv2.line(big,(0,i*Z),(2*R*Z,i*Z),(0,255,255) if Y%50==0 else (0,110,110),1)
            if Y%50==0: cv2.putText(big,str(Y),(2,i*Z-2),cv2.FONT_HERSHEY_SIMPLEX,.4,(0,255,0),1)
    cv2.putText(big,f'{cx},{cy}',(5,2*R*Z-8),cv2.FONT_HERSHEY_SIMPLEX,.6,(255,255,0),2)
    tiles.append(big)
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]
cv2.imwrite(out,np.vstack(rows))
