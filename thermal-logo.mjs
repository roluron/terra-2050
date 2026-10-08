const vertex = `attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+4.7)+.15*noise(p*4.11+9.2);}
`;
const simulation = `precision highp float;varying vec2 uv;
uniform sampler2D field;uniform vec2 texel,mouse,previous,velocity;uniform float dt,time,active,pressed,seed,sweep,cooling;
${noise}
void main(){
 vec4 state=texture2D(field,uv);vec2 flow=(state.gb-.5)*.1;
 float n=fbm(uv*vec2(26.,9.)+vec2(0.,time*.12));
 vec2 curl=vec2(cos(n*9.),sin(n*9.))*state.r*.006;
 vec2 back=clamp(uv-(flow+curl)*dt,texel,1.-texel);
 vec4 advected=texture2D(field,back);
 float spread=(texture2D(field,back+vec2(texel.x,0.)).r+texture2D(field,back-vec2(texel.x,0.)).r+texture2D(field,back+vec2(0.,texel.y)).r+texture2D(field,back-vec2(0.,texel.y)).r)*.25;
 float heat=max(0.,mix(advected.r,spread,min(.24,dt*6.))*exp(-dt*(2.4+cooling*3.))-dt*.016);
 vec2 ratio=vec2(3.58,1.);vec2 a=(uv-previous)*ratio,b=(mouse-previous)*ratio;
 float along=clamp(dot(a,b)/max(dot(b,b),.000001),0.,1.);
 float radius=1.2*(.17+pressed*.025+min(length(velocity)*.065,.032));
 vec2 distance=(a-b*along)/radius;
 float stamp=exp(-dot(distance,distance)*1.7)*active;
 heat=mix(heat,max(heat,stamp*.98),1.-exp(-dt*(22.+pressed*14.)));
 float pocket1=exp(-dot((uv-vec2(.524,.61))*ratio/.085,(uv-vec2(.524,.61))*ratio/.085));
 float pocket2=exp(-dot((uv-vec2(.79,.67))*ratio/.077,(uv-vec2(.79,.67))*ratio/.077));
 heat=max(heat,max(pocket1,pocket2)*seed*.88);
 float wave=exp(-pow((uv.x-sweep)/.05,2.))*step(0.,sweep)*.88;
 heat=max(heat,wave*exp(-pow((uv.y-.51)/.24,2.)));
 flow=mix((advected.gb-.5)*.1,velocity*.025,stamp*.55)*exp(-dt*2.8);
 heat=clamp(heat+(hash(gl_FragCoord.xy+time*103.)-.5)/255.,0.,1.);
 gl_FragColor=vec4(heat,clamp(flow/.1+.5,0.,1.),1.);
}`;
const material = `precision highp float;varying vec2 uv;
uniform sampler2D field,glyph;uniform vec2 resolution;uniform vec3 paperColor;uniform float time,bleed,effectScale,overlay;
${noise}
vec3 thermal(float h){
 vec3 blue=vec3(.025,.24,1.),cyan=vec3(.06,.65,.88),green=vec3(.30,.73,.38),yellow=vec3(1.,.87,.47),orange=vec3(.96,.25,.035),red=vec3(.50,.025,.012);
 if(h<.40)return mix(blue,cyan,smoothstep(.30,.40,h));
 if(h<.435)return mix(cyan,green,smoothstep(.40,.435,h));
 if(h<.50)return mix(green,yellow,smoothstep(.435,.50,h));
 if(h<.72)return mix(yellow,orange,smoothstep(.50,.72,h));
 return mix(orange,red,smoothstep(.72,.98,h));
}
void main(){
 float heat=texture2D(field,uv).r;
 float n=fbm(uv*vec2(42.,12.)+vec2(time*.65,-time*.46));
 vec2 warp=vec2(n-.5,noise(uv*vec2(26.,7.5)+time*.55)-.5)*vec2(.025,.09)*heat*bleed*effectScale;
 vec2 slope=vec2(texture2D(field,uv+vec2(.006,0.)).r-texture2D(field,uv-vec2(.006,0.)).r,texture2D(field,uv+vec2(0.,.02)).r-texture2D(field,uv-vec2(0.,.02)).r);
 warp+=slope*vec2(.018,.064)*bleed*effectScale;
 vec4 edge=texture2D(glyph,uv+warp),baseGlyph=texture2D(glyph,uv);
 float strength=smoothstep(.025,.45,heat);
 float distance=(edge.g-.5)*.12+heat*.023*(.28+n)*bleed*effectScale;
 float fleck=noise(gl_FragCoord.xy*.35);
 float softness=1./resolution.x+strength*.0012*effectScale;
 float ink=mix(edge.a,smoothstep(-softness,softness,distance+(fleck-.5)*.00025*strength*effectScale),strength*bleed);
 float band=.0015+heat*.021*effectScale;
 float depth=max(0.,distance)/band;
 float mottling=fbm(uv*vec2(115.,32.)+vec2(time*.32,-time*.23))-.5;
 float pigment=clamp(.34+depth*.72+mottling*.18+(fleck-.5)*.025,0.,1.);
 vec3 paper=paperColor;
 float colored=strength*(1.-smoothstep(.65,1.8,depth));
 vec3 color=mix(paper,thermal(pigment),colored);
 vec3 clean=mix(paper,thermal(heat),smoothstep(.055,.19,heat));
 color=mix(clean,color,bleed);
 float grain=(fleck-.5)*.045*colored*effectScale;
 float diffusion=exp(-pow(max(0.,-distance)/max(1./resolution.x,(.003+heat*.011)*effectScale),2.)*2.2);
 float dust=diffusion*(.65+.35*fleck)*.78*strength*bleed;
 float alpha=ink+(1.-ink)*dust;
 vec3 fringe=thermal(pow(clamp((distance+.010)/.010,0.,1.),2.)*.32);
 vec3 pigmentColor=(color+grain)*ink+fringe*(1.-ink)*dust;
 float coverage=baseGlyph.r+(1.-baseGlyph.r)*alpha;
 gl_FragColor=vec4((paper*baseGlyph.r+pigmentColor*(1.-baseGlyph.r))/max(coverage,.00001),coverage*mix(1.,strength,overlay));
}`;

function contourDistance(pixels,width,height) {
  const measure=inside=>{
    const distance=new Float32Array(width*height);
    for(let i=0;i<distance.length;i++)distance[i]=(pixels[i*4+3]>127)===inside?width:0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=y*width+x;
      if(x)distance[i]=Math.min(distance[i],distance[i-1]+1);
      if(y){distance[i]=Math.min(distance[i],distance[i-width]+1);if(x)distance[i]=Math.min(distance[i],distance[i-width-1]+Math.SQRT2);if(x+1<width)distance[i]=Math.min(distance[i],distance[i-width+1]+Math.SQRT2);}
    }
    for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
      const i=y*width+x;
      if(x+1<width)distance[i]=Math.min(distance[i],distance[i+1]+1);
      if(y+1<height){distance[i]=Math.min(distance[i],distance[i+width]+1);if(x)distance[i]=Math.min(distance[i],distance[i+width-1]+Math.SQRT2);if(x+1<width)distance[i]=Math.min(distance[i],distance[i+width+1]+Math.SQRT2);}
    }
    return distance;
  };
  const inside=measure(true),outside=measure(false);
  for(let i=0;i<inside.length;i++)pixels[i*4+1]=Math.round(255*Math.max(0,Math.min(1,.5+(inside[i]-outside[i])/(width*.12))));
}

export async function mountThermalLogo(element,mode='bleed',layout='display') {
  await Promise.all([300,600].map(weight=>document.fonts.load(`${weight} 100px "TWK Lausanne"`)));
  let lockup;
  if(layout==='display'){lockup=new Image();lockup.src=new URL('./thermal-wordmark.png',import.meta.url);await lockup.decode();}
  const inkColor=getComputedStyle(element).color.match(/[\d.]+/g).slice(0,3).map(value=>Number(value)/255);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');
  const gl = canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
  if(!gl) return null;
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let programs,fields,mask,width=0,height=0,frame=0,last=0,until=0,visible=true,lost=false,pressed=false,hover=false,sweepStart=0;
  let pointer=[.5,.5],previous=pointer.slice(),moveTime=0;
  let materialMix=mode==='bleed'?1:0,targetMix=materialMix;
  const uniforms = new Map();
  const metrics={frames:0,intervals:[],started:0};
  const compile=(type,source)=>{
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(error);}
    return shader;
  };
  function program(source){
    const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,source);
    gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function uniform(p,name,...values){
    const key=programs.indexOf(p)+name;
    if(!uniforms.has(key))uniforms.set(key,gl.getUniformLocation(p,name));
    const location=uniforms.get(key);
    if(name==='field'||name==='glyph')gl.uniform1i(location,values[0]);
    else if(values.length===2)gl.uniform2f(location,...values);
    else gl.uniform1f(location,values[0]);
  }
  function texture(w,h,data){
    const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,data);return t;
  }
  function use(p){
    gl.useProgram(p);const location=gl.getAttribLocation(p,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
  }
  function present(time){
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,width,height);use(programs[1]);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,fields[0].texture);uniform(programs[1],'field',0);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,mask);uniform(programs[1],'glyph',1);
    uniform(programs[1],'resolution',width,height);uniform(programs[1],'time',time);uniform(programs[1],'bleed',materialMix);
    gl.uniform3f(gl.getUniformLocation(programs[1],'paperColor'),...inkColor);
    uniform(programs[1],'effectScale',layout==='inline'?.3:1);uniform(programs[1],'overlay',layout==='inline'?1:0);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function clear(){
    if(lost||!fields)return;
    for(const field of fields){gl.bindFramebuffer(gl.FRAMEBUFFER,field.buffer);gl.clearColor(0,128/255,128/255,1);gl.clear(gl.COLOR_BUFFER_BIT);}
    sweepStart=0;until=0;hover=false;pressed=false;cancelAnimationFrame(frame);frame=0;present(0);
  }
  function resize(){
    if(lost)return;
    const style=getComputedStyle(element),box={width:parseFloat(style.width),height:parseFloat(style.height)};if(!box.width||!box.height)return;
    const padding=layout==='inline'?20:0;
    const ratio=Math.min(devicePixelRatio||1,2,2560/box.width);
    width=Math.max(1,Math.round((box.width+padding*2)*ratio));height=Math.max(1,Math.round((box.height+padding*2)*ratio));
    canvas.width=width;canvas.height=height;
    const shape=document.createElement('canvas');shape.width=width;shape.height=height;
    const ctx=shape.getContext('2d');let size=width*.22;
    if(layout==='inline'){
      const name=element.querySelector('.brand-name'),nameStyle=getComputedStyle(name),nameBox=name.getBoundingClientRect(),elementBox=element.getBoundingClientRect();
      const sx=box.width/elementBox.width,sy=box.height/elementBox.height;
      size=parseFloat(nameStyle.fontSize)*ratio;
      ctx.font=`300 ${size}px "TWK Lausanne"`;
      ctx.letterSpacing=`${(parseFloat(nameStyle.letterSpacing)||0)*ratio}px`;
      const metrics=ctx.measureText('fromearth'),x=(padding+(nameBox.left-elementBox.left)*sx)*ratio;
      const y=(padding+(nameBox.top-elementBox.top+nameBox.height/2)*sy)*ratio+(metrics.fontBoundingBoxAscent-metrics.fontBoundingBoxDescent)/2;
      ctx.fillStyle='#fff';const advance=ctx.measureText('from').width;
      ctx.font=`600 ${size}px "TWK Lausanne"`;ctx.fillText('earth',x+advance,y);
    }else{
    ctx.font=`300 ${size}px "TWK Lausanne"`;ctx.letterSpacing=`${-size*.045}px`;
    const from=ctx.measureText('from').width;ctx.font=`600 ${size}px "TWK Lausanne"`;ctx.letterSpacing=`${-size*.01}px`;
    size*=width*.924/(from+ctx.measureText('earth').width+size*.035);
    ctx.letterSpacing=`${-size*.045}px`;ctx.fillStyle='#fff';ctx.font=`300 ${size}px "TWK Lausanne"`;
    const advance=ctx.measureText('from').width;
    ctx.font=`600 ${size}px "TWK Lausanne"`;ctx.letterSpacing=`${-size*.01}px`;ctx.strokeStyle='#fff';ctx.lineJoin='miter';ctx.lineWidth=size*.035;
    ctx.strokeText('earth',width*.044+advance+size*.0175,height*.755);ctx.fillText('earth',width*.044+advance+size*.0175,height*.755);
    }
    const pixels=ctx.getImageData(0,0,width,height).data;
    contourDistance(pixels,width,height);
    ctx.clearRect(0,0,width,height);
    if(layout==='display'){
      ctx.font=`300 ${size}px "TWK Lausanne"`;ctx.letterSpacing=`${-size*.045}px`;
      const from=ctx.measureText('from');
      ctx.drawImage(lockup,27,61,884,331,width*.044-from.actualBoundingBoxLeft,height*.755-from.actualBoundingBoxAscent,from.actualBoundingBoxLeft+from.actualBoundingBoxRight,from.actualBoundingBoxAscent+from.actualBoundingBoxDescent);
      ctx.font=`300 ${width*.024}px monospace`;ctx.letterSpacing=`${-width*.0008}px`;ctx.textAlign='right';
      ctx.fillText('/ 2050',width*.965,height*.867);
    }
    const yearPixels=ctx.getImageData(0,0,width,height).data;
    for(let i=0;i<pixels.length;i+=4)pixels[i]=yearPixels[i+3];
    const flipped=new Uint8Array(pixels.length),row=width*4;
    for(let y=0;y<height;y++)flipped.set(pixels.subarray(y*row,(y+1)*row),(height-y-1)*row);
    if(mask)gl.deleteTexture(mask);mask=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,mask);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,flipped);
    if(fields)for(const field of fields){gl.deleteTexture(field.texture);gl.deleteFramebuffer(field.buffer);}
    const w=Math.min(768,Math.max(192,Math.round(box.width*.6))),h=Math.round(w/3.58);
    fields=[0,1].map(()=>{
      gl.activeTexture(gl.TEXTURE0);const t=texture(w,h,null),buffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,buffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Thermal framebuffer unavailable');
      gl.viewport(0,0,w,h);gl.clearColor(0,128/255,128/255,1);gl.clear(gl.COLOR_BUFFER_BIT);return{texture:t,buffer,w,h};
    });
    present(0);element.classList.add('thermal-ready');
    if(!reduced.matches)wake(4200);
  }
  function tick(now){
    frame=0;if(document.hidden||!visible||lost||reduced.matches)return;
    const dt=Math.min(.035,(now-last)/1000||.016);if(last&&metrics.intervals.length<900)metrics.intervals.push(now-last);last=now;metrics.frames++;
    materialMix+=(targetMix-materialMix)*(1-Math.exp(-dt*12.));
    const p=programs[0],target=fields[1];gl.bindFramebuffer(gl.FRAMEBUFFER,target.buffer);gl.viewport(0,0,target.w,target.h);use(p);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,fields[0].texture);uniform(p,'field',0);
    uniform(p,'texel',1/target.w,1/target.h);uniform(p,'dt',dt);uniform(p,'time',now/1000);
    uniform(p,'mouse',...pointer);uniform(p,'previous',...previous);
    const moving=now-moveTime<100;uniform(p,'velocity',moving?(pointer[0]-previous[0])/dt:0,moving?(pointer[1]-previous[1])/dt:0);
    uniform(p,'active',hover?1:0);uniform(p,'pressed',pressed?1:0);uniform(p,'seed',now-metrics.started<1100?1:0);
    uniform(p,'cooling',hover?0:Math.min(1,Math.max(0,(now-(until-2000))/2000)));
    uniform(p,'sweep',sweepStart?(now-sweepStart)/700:-1);
    gl.drawArrays(gl.TRIANGLES,0,6);fields.reverse();previous=pointer.slice();present(now/1000);
    if(sweepStart&&now-sweepStart>800)sweepStart=0;
    if(hover||now<until)frame=requestAnimationFrame(tick);else clear();
  }
  function wake(duration=2200){
    if(reduced.matches||lost||document.hidden||!visible)return;
    until=performance.now()+duration;if(!frame){last=0;frame=requestAnimationFrame(tick);}
  }
  function point(event){
    const box=canvas.getBoundingClientRect();pointer=[Math.min(1,Math.max(0,(event.clientX-box.left)/box.width)),Math.min(1,Math.max(0,1-(event.clientY-box.top)/box.height))];
    if(!hover)previous=pointer.slice();hover=true;moveTime=performance.now();wake();
  }
  function leave(){hover=false;pressed=false;wake();}
  function pulse(){if(reduced.matches)return;sweepStart=performance.now();wake();}
  function initialize(){
    programs=[program(simulation),program(material)];uniforms.clear();
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    metrics.started=performance.now();fields=null;mask=null;resize();
  }
  try{initialize();}catch(error){console.error('Thermal logo:',error);return null;}
  element.append(canvas);element.classList.add('thermal-logo');
  element.addEventListener('pointermove',point,{passive:true});element.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')point(event);},{passive:true});
  element.addEventListener('pointerdown',event=>{if(reduced.matches)return;pressed=true;point(event);element.setPointerCapture(event.pointerId);});
  element.addEventListener('pointerup',event=>{pressed=false;if(event.pointerType!=='mouse')leave();});
  element.addEventListener('pointerleave',leave);element.addEventListener('pointercancel',leave);element.addEventListener('lostpointercapture',()=>{pressed=false;});
  element.addEventListener('keydown',event=>{if(event.code==='Space'||event.code==='Enter'&&element.tagName!=='A'){event.preventDefault();pulse();}});
  document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(frame);frame=0;hover=false;pressed=false;if(!document.hidden&&visible)wake();});
  window.addEventListener('blur',leave);
  reduced.addEventListener('change',()=>{clear();if(!reduced.matches)wake();});
  new ResizeObserver(resize).observe(element);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;hover=false;pressed=false;}else wake();}).observe(element);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;element.classList.remove('thermal-ready');});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;try{initialize();}catch(error){element.classList.remove('thermal-ready');console.error('Thermal logo restore:',error);}});
  return {clear,pulse,canvas,metrics,setMode(mode){targetMix=mode==='bleed'?1:0;if(reduced.matches){materialMix=targetMix;present(0);}else wake();}};
}
export {vertex,material,contourDistance};
