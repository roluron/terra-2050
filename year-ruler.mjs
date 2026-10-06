export function createYearRuler(slider, ruler) {
  ruler.replaceChildren(...Array.from({length:25},()=>document.createElement('i')));
  const bars=[...ruler.children], heights=bars.map(()=>1), opacity=bars.map(()=>.25);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let hover=null, drag=null;
  const moveYear=event=>{
    const rect=slider.getBoundingClientRect();
    if(!rect.width)return;
    const min=Number(slider.min),max=Number(slider.max),step=Number(slider.step)||1;
    const position=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
    const value=String(Math.min(max,min+Math.round(position*(max-min)/step)*step));
    if(slider.value===value)return;
    slider.value=value;
    slider.dispatchEvent(new Event('input',{bubbles:true}));
  };
  slider.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'||event.isPrimary===false||slider.disabled||drag)return;
    event.preventDefault();
    drag={id:event.pointerId,value:slider.value};
    slider.focus({preventScroll:true});
    slider.setPointerCapture(event.pointerId);
    moveYear(event);
  });
  slider.addEventListener('pointermove',event=>{
    if(drag?.id===event.pointerId)moveYear(event);
    // Keep the pointer position continuous: rounding lights the endpoint early.
    const first=bars[0].getBoundingClientRect(), last=bars.at(-1).getBoundingClientRect();
    const start=first.left+first.width/2, end=last.left+last.width/2;
    hover=Math.max(0,Math.min(24,(event.clientX-start)/(end-start)*24));
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])slider.addEventListener(type,event=>{
    if(drag?.id!==event.pointerId)return;
    const previous=drag;drag=null;
    if(slider.hasPointerCapture(event.pointerId))slider.releasePointerCapture(event.pointerId);
    if(type==='pointerup'&&slider.value!==previous.value)slider.dispatchEvent(new Event('change',{bubbles:true}));
  });
  slider.addEventListener('pointerleave',()=>{hover=null;});
  return function update() {
    if(!ruler.getClientRects().length)return;
    const active=Number(slider.value)-2026;
    bars.forEach((bar,i)=>{
      const distance=i-active;
      let height=i===active?3.1:1+1.6*Math.exp(-distance*distance/7);
      let alpha=i===active?1:i<active?.55:.25;
      if(!reduced.matches&&hover!==null){height+=.9*Math.exp(-((i-hover)**2)/5);if(i<=hover)alpha=Math.max(alpha,.25+.6*Math.exp(-((i-hover)**2)/.3));}
      const nextHeight=reduced.matches?height:heights[i]+(height-heights[i])*.22;
      const nextOpacity=reduced.matches?alpha:opacity[i]+(alpha-opacity[i])*.22;
      if(Math.abs(nextHeight-heights[i])>.0015){heights[i]=nextHeight;bar.style.transform=`scaleY(${nextHeight.toFixed(3)})`;}
      if(Math.abs(nextOpacity-opacity[i])>.0015){opacity[i]=nextOpacity;bar.style.opacity=nextOpacity.toFixed(3);}
    });
  };
}
