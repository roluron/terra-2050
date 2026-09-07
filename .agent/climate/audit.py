import pathlib,json,struct,math,collections,hashlib,csv,sys
repo=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else pathlib.Path(__file__).resolve().parents[2]
r=repo/'data';names=json.loads((r/'places.json').read_text())['villes'];b=(r/'places.bin').read_bytes();th=(r/'thermo.bin').read_bytes();tide=(r/'maree.bin').read_bytes()
keys=['thermique','eau','feux','mer','fleuves','stabilite'];weights=[.22,.18,.12,.20,.16,.12]
assert len(b)==24*len(names) and len(th)==6*len(names) and len(tide)==2*len(names)
cal=json.loads((r/'calibration.json').read_text())
assert abs(sum(weights)-1)<1e-10
for values in cal['quantiles'].values(): assert all(a<=z for a,z in zip(values,values[1:]))
rows=[];errors=[]
for i,n in enumerate(names):
 o=i*24;lat,lon=struct.unpack_from('<hh',b,o);p=[v/250 for v in b[o+4:o+16]];nodata=b[o+4]==255
 if not(-9000<=lat<=9000 and -18000<=lon<=18000):errors.append([i,'coordinates'])
 if not nodata and any(v>1 or v<0 for v in p):errors.append([i,'penalty-range'])
 scores={};detail={}
 for yr,pp in [(2026,p[:6]),(2050,p[6:])]:
  mean=sum(x*w for x,w in zip(pp,weights));worst=max(pp);score=math.floor(100*(1-.5*mean-.5*worst)+.5)
  scores[yr]=None if nodata else score;detail[yr]={'penalties':dict(zip(keys,pp)),'weightedPenalty':mean,'worstPenalty':worst,'worstAxes':[k for k,x in zip(keys,pp) if x==worst]}
 row={'id':i,'name':n[0],'country':n[1],'population':n[2],'lat':lat/100,'lon':lon/100,'nodata':nodata,'scores':scores,'detail':detail,'raw':{'f50':b[o+16]/250,'f5':b[o+17]/250,'medianElevation':(struct.unpack_from('<H',b,o+18)[0]-5000)/10,'subsidence2050':b[o+20]/100,'riverFraction':b[o+21]/250,'riverP90':b[o+22]/10,'countryPopDelta':None if b[o+23]==255 else b[o+23]-128,'tide':struct.unpack_from('<H',tide,i*2)[0]/100,'thermalDays':dict(zip(['heat32_2026','heat32_2050','frost2026','frost2050','heat40_2026','heat40_2050'],[round(x/255*m,2) for x,m in zip(th[i*6:i*6+6],[300,300,200,200,200,200])]))}}
 rows.append(row)
valid=[x for x in rows if not x['nodata']]
summary={'count':len(rows),'valid':len(valid),'nodata':sum(x['nodata'] for x in rows),'errors':errors,'sizes':{'places':len(b),'thermal':len(th),'tide':len(tide)},'unchanged':{k:sum(x['detail'][2026]['penalties'][k]==x['detail'][2050]['penalties'][k] for x in valid) for k in keys},'scoreRange':{y:[min(x['scores'][y] for x in valid),max(x['scores'][y] for x in valid)] for y in [2026,2050]},'comparisons':[rows[7],rows[191]],'nodataCities':[x['name'] for x in rows if x['nodata']],'hashes':{f:hashlib.sha256((r/f).read_bytes()).hexdigest() for f in ['places.bin','places.json','thermo.bin','maree.bin','pays.json']}}
assert not errors, errors
out=pathlib.Path(__file__).with_name('evidence');out.mkdir(exist_ok=True)
summary['validations']=['record lengths','coordinates','penalty bounds','weights sum','monotonic calibration quantiles','all city endpoint score arithmetic']
(out/'data-audit.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False))
with (out/'city-model-scores.csv').open('w',newline='') as f:
 writer=csv.writer(f);writer.writerow(['city','country','latitude','longitude','population','no_data','model_score_2026','model_score_2050']+[str(y)+'_'+k+'_exposure' for y in [2026,2050] for k in keys])
 for x in rows:writer.writerow([x['name'],x['country'],x['lat'],x['lon'],x['population'],x['nodata'],x['scores'][2026],x['scores'][2050]]+[None if x['nodata'] else x['detail'][y]['penalties'][k]*100 for y in [2026,2050] for k in keys])
print(json.dumps({'records':len(rows),'scored':len(valid),'errors':errors,'scientificAccuracy':'UNVERIFIED','output':str(out)}))
