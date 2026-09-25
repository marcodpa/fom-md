"""Preview an original FOM capture projected onto a plate with given corners (and an
optional visibility polygon for people/objects in front), cropped around the device.

Usage: python scripts/v7-fit.py <plate.webp> <capture.png> <out.png> tlx,tly,trx,try,brx,bry,blx,bly [x,y,x,y,...]
"""
import sys, cv2, numpy as np
plate=cv2.imread(sys.argv[1]); shot=cv2.imread(sys.argv[2]); out=sys.argv[3]
c=np.float32(list(map(float,sys.argv[4].split(',')))).reshape(4,2)
h,w=shot.shape[:2]
H=cv2.getPerspectiveTransform(np.float32([[0,0],[w,0],[w,h],[0,h]]),c)
warp=cv2.warpPerspective(shot,H,(plate.shape[1],plate.shape[0]))
m=cv2.warpPerspective(np.full((h,w),255,np.uint8),H,(plate.shape[1],plate.shape[0]))
if len(sys.argv)>5:
    poly=np.int32(list(map(float,sys.argv[5].split(',')))).reshape(-1,2)
    clip=np.zeros_like(m); cv2.fillPoly(clip,[poly],255); m=cv2.bitwise_and(m,clip)
comp=plate.copy(); comp[m>0]=warp[m>0]
x0,y0=np.maximum(c.min(0)-40,0).astype(int); x1,y1=np.minimum(c.max(0)+40,[plate.shape[1],plate.shape[0]]).astype(int)
crop=comp[y0:y1,x0:x1]
s=min(2.0, 1400/max(crop.shape[:2]))
cv2.imwrite(out,cv2.resize(crop,None,fx=s,fy=s))
