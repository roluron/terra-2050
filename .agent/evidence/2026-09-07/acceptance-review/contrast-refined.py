import json,re,math
from PIL import Image
from pathlib import Path
p=Path(__file__).parent
rows=[]
def lum(c):
 v=[x/255 for x in c];v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v];return sum(a*b for a,b in zip(v,[.2126,.7152,.0722]))
for m in json.loads((p/'contrast-refined-meta.json').read_text()):
 bg=Image.open(p/(m['name']+'-contrast-background.png')).convert('RGB');org=Image.open(p/(m['name']+'-contrast-original.png')).convert('RGB');c=list(map(float,re.findall(r'[\d.]+',m['color'])));a=(c[3] if len(c)>3 else 1)*m['alpha'];vals=[]
 for y in range(max(0,math.ceil(m['y'])),min(bg.height,math.floor(m['y']+m['h']))):
  for x in range(max(0,math.ceil(m['x'])),min(bg.width,math.floor(m['x']+m['w']))):
   b=bg.getpixel((x,y));o=org.getpixel((x,y))
   if min(o[i]-b[i] for i in range(3))<20:continue
   fg=[c[i]*a+b[i]*(1-a) for i in range(3)];vals.append((lum(fg)+.05)/(lum(b)+.05))
 rows.append({'selector':m['s'],'pixels':len(vals),'minContrast':min(vals) if vals else None,'maxContrast':max(vals) if vals else None})
(p/'contrast-refined-results.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows,indent=2))
