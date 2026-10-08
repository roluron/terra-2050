import {vertex,material,contourDistance} from './thermal-logo.mjs?v=20261008-heavy';

export async function mountEarthLoop(element,options={}){
  await Promise.all([300,600].map(w=>document.fonts.load(`${w} 100px "TWK Lausanne"`)));
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=500;canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});
  if(!gl)return null;
  const fragment=material
    .replace('void main(){',`vec4 sampleHeat(vec2 p){
      vec2 a=(p-vec2(.528+.024*sin(time),.61+.06*cos(time)))*vec2(3.2,1.);
      vec2 b=(p-vec2(.80+.018*cos(time),.64+.11*sin(time)))*vec2(3.2,1.);
      return vec4(max(exp(-dot(a,a)/.010),exp(-dot(b,b)/.009))*.88);
    }
    void main(){`)
    .replaceAll('texture2D(field,','sampleHeat(')
    .replace('vec2(time*.65,-time*.46)','vec2(sin(time),cos(time))*.65')
    .replace('+time*.55','+vec2(cos(time),sin(time))*.55')
    .replace('vec2(time*.32,-time*.23)','vec2(sin(time),cos(time))*.32')
    .replace('paper=paperColor',options.dark?'paper=vec3(.945,.937,.910)':'paper=vec3(.075)')
    .replace('gl_FragColor=vec4((paper*baseGlyph.r+pigmentColor*(1.-baseGlyph.r))/max(coverage,.00001),coverage*mix(1.,strength,overlay));',
      'vec3 videoPigment=mix(vec3(dot(pigmentColor,vec3(.2126,.7152,.0722))),pigmentColor,'+Number(options.saturation??1).toFixed(3)+'); vec3 result=paper*baseGlyph.r+videoPigment*(1.-baseGlyph.r)+'+(options.dark?'vec3(.075)':'vec3(.945,.937,.910)')+'*(1.-coverage); gl_FragColor=vec4(result,1.);');
  const program=gl.createProgram();
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program,shader);gl.deleteShader(shader);
  }
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const shape=document.createElement('canvas');shape.width=canvas.width;shape.height=canvas.height;
  const ctx=shape.getContext('2d'),w=canvas.width,h=canvas.height;let size=w*.22;
  ctx.font=`300 ${size}px "TWK Lausanne"`;ctx.letterSpacing=`${-size*.045}px`;const from=ctx.measureText('from').width;
  ctx.font=`600 ${size}px "TWK Lausanne"`;ctx.letterSpacing=`${-size*.01}px`;size*=w*.88/(from+ctx.measureText('earth').width+size*.035);
  ctx.font=`300 ${size}px "TWK Lausanne"`;ctx.letterSpacing=`${-size*.045}px`;const advance=ctx.measureText('from').width;
  const left=w*.06,baseline=h*.755;
  ctx.fillStyle='#fff';ctx.strokeStyle='#fff';ctx.font=`600 ${size}px "TWK Lausanne"`;ctx.letterSpacing=`${-size*.01}px`;ctx.lineJoin='miter';ctx.lineWidth=size*.035;
  ctx.strokeText('earth',left+advance+size*.0175,baseline);ctx.fillText('earth',left+advance+size*.0175,baseline);
  const pixels=ctx.getImageData(0,0,w,h).data;contourDistance(pixels,w,h);
  ctx.clearRect(0,0,w,h);ctx.font=`300 ${size}px "TWK Lausanne"`;ctx.letterSpacing=`${-size*.045}px`;ctx.fillText('from',left,baseline);
  ctx.font=`300 ${w*.024}px monospace`;ctx.letterSpacing=`${-w*.0008}px`;ctx.textAlign='right';ctx.fillText('/ 2050',w*.94,h*.867);
  const fixed=ctx.getImageData(0,0,w,h).data;
  if(options.lockup){
    const image=new Image();image.src=options.lockup;await image.decode();
    ctx.clearRect(0,0,w,h);ctx.textAlign='left';ctx.font=`300 ${size}px "TWK Lausanne"`;ctx.letterSpacing=`${-size*.045}px`;
    const from=ctx.measureText('from');ctx.drawImage(image,27,61,884,331,left-from.actualBoundingBoxLeft,baseline-from.actualBoundingBoxAscent,from.actualBoundingBoxLeft+from.actualBoundingBoxRight,from.actualBoundingBoxAscent+from.actualBoundingBoxDescent);
    ctx.font=`300 ${w*.024}px monospace`;ctx.letterSpacing=`${-w*.0008}px`;ctx.textAlign='right';ctx.fillText('/ 2050',w*.94,h*.867);fixed.set(ctx.getImageData(0,0,w,h).data);
  }
  for(let i=0;i<pixels.length;i+=4)pixels[i]=fixed[i+3];
  const flipped=new Uint8Array(pixels.length),row=w*4;
  for(let y=0;y<h;y++)flipped.set(pixels.subarray(y*row,(y+1)*row),(h-y-1)*row);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,flipped);
  gl.uniform1i(gl.getUniformLocation(program,'glyph'),0);gl.uniform2f(gl.getUniformLocation(program,'resolution'),w,h);gl.uniform1f(gl.getUniformLocation(program,'bleed'),options.bleed??1);
  gl.uniform1f(gl.getUniformLocation(program,'effectScale'),1);gl.uniform1f(gl.getUniformLocation(program,'overlay'),0);
  const time=gl.getUniformLocation(program,'time');let frame=0,paused=false,visible=true,lost=false,restored=null,elapsed=0,last=0;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  function render(seconds){if(restored)return restored.render(seconds);const period=options.period??8;gl.uniform1f(time,((seconds%period)+period)%period/period*Math.PI*2);gl.drawArrays(gl.TRIANGLES,0,6);}
  function tick(now){frame=0;if(paused||lost||reduced.matches||!visible||document.hidden)return;if(last)elapsed+=(now-last)/1000;last=now;render(elapsed);frame=requestAnimationFrame(tick);}
  function sync(){cancelAnimationFrame(frame);frame=0;last=0;if(!paused&&!lost&&!reduced.matches&&visible&&!document.hidden)frame=requestAnimationFrame(tick);}
  element.append(canvas);element.classList.add('thermal-ready');render(0);sync();
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});observer.observe(element);
  const preferenceChanged=()=>{render(0);sync();};
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',preferenceChanged);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;sync();element.classList.remove('thermal-ready');});
  canvas.addEventListener('webglcontextrestored',async()=>{observer.disconnect();document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',preferenceChanged);canvas.remove();restored=await mountEarthLoop(element,options);restored?.setPaused(paused);});
  return {get canvas(){return restored?.canvas||canvas;},render,fixedMask:fixed,setPaused(value){paused=value;if(restored)restored.setPaused(value);else sync();}};
}
