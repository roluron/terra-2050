import json,re,math
from PIL import Image
from pathlib import Path
p=Path(__file__).parent
bg=Image.open(p/'contrast-background.png').convert('RGB'); rows=[]
def lum(c):
 v=[x/255 for x in c];v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v];return sum(a*b for a,b in zip(v,[.2126,.7152,.0722]))
for m in json.loads((p/'contrast-meta.json').read_text()):
 c=list(map(float,re.findall(r'[\d.]+',m['color'])));alpha=(c[3] if len(c)>3 else 1)
 for a in m['ancestors']:alpha*=float(a['opacity'])
 vals=[]
 for y in range(max(0,math.ceil(m['y'])),min(bg.height,math.floor(m['y']+m['h']))):
  for x in range(max(0,math.ceil(m['x'])),min(bg.width,math.floor(m['x']+m['w']))):
   b=bg.getpixel((x,y));fg=[c[i]*alpha+b[i]*(1-alpha) for i in range(3)];vals.append((lum(fg)+.05)/(lum(b)+.05))
 rows.append({'selector':m['s'],'minContrast':min(vals) if vals else None,'maxContrast':max(vals) if vals else None,'method':'CSS foreground alpha composited against photographed background; conservative rectangle sampling; source visibility requires separate capture'})
(p/'contrast-results.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
