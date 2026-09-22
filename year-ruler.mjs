export function createYearRuler(slider, ruler) {
  ruler.replaceChildren(...Array.from({length:25},()=>document.createElement('i')));
  const bars=[...ruler.children], heights=bars.map(()=>1), opacity=bars.map(()=>.25);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let hover=null;
  slider.addEventListener('pointermove',event=>{
    const box=ruler.getBoundingClientRect();
    hover=Math.max(0,Math.min(24,Math.round((event.clientX-box.left)/box.width*24)));
  });
  slider.addEventListener('pointerleave',()=>{hover=null;});
  return function update() {
    if(!ruler.getClientRects().length)return;
    const active=Number(slider.value)-2026;
    bars.forEach((bar,i)=>{
      const distance=i-active;
      let height=i===active?3.1:1+1.6*Math.exp(-distance*distance/7);
      let alpha=i===active?1:i<active?.55:.25;
      if(!reduced.matches&&hover!==null){height+=.9*Math.exp(-((i-hover)**2)/5);if(Math.abs(i-hover)<1)alpha=Math.max(alpha,.85);}
      const nextHeight=reduced.matches?height:heights[i]+(height-heights[i])*.22;
      const nextOpacity=reduced.matches?alpha:opacity[i]+(alpha-opacity[i])*.22;
      if(Math.abs(nextHeight-heights[i])>.0015){heights[i]=nextHeight;bar.style.transform=`scaleY(${nextHeight.toFixed(3)})`;}
      if(Math.abs(nextOpacity-opacity[i])>.0015){opacity[i]=nextOpacity;bar.style.opacity=nextOpacity.toFixed(3);}
    });
  };
}
