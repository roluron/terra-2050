export function createYearRuler(slider, ruler) {
  ruler.replaceChildren(...Array.from({length:25},()=>document.createElement('i')));
  const bars=[...ruler.children], heights=bars.map(()=>1), opacity=bars.map(()=>.25);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let hover=null;
  slider.addEventListener('pointermove',event=>{
    // Keep the pointer position continuous: rounding lights the endpoint early.
    const first=bars[0].getBoundingClientRect(), last=bars.at(-1).getBoundingClientRect();
    const start=first.left+first.width/2, end=last.left+last.width/2;
    hover=Math.max(0,Math.min(24,(event.clientX-start)/(end-start)*24));
  });
  slider.addEventListener('pointerleave',()=>{hover=null;});
  // le pouce, c'est la barre de l'année : elle grandit tant qu'on appuie
  let appui=false;
  slider.addEventListener('pointerdown',()=>{appui=true;});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])addEventListener(type,()=>{appui=false;},true);

  /* Au doigt, le curseur natif ne bougeait que si l'on attrapait sa poignée,
     invisible : taper la règle ne faisait rien, et un glissé était souvent
     pris par le défilement de la fiche. Sur écran tactile, l'input laisse
     passer le doigt (finitions.css) et c'est toute la bande de la règle qui
     répond : un tap saute à l'année, un glissé la fait défiler. Le clavier et
     les lecteurs d'écran gardent l'input natif. */
  const zone=slider.parentElement;
  const valeurAuPoint=x=>{
    const box=ruler.getBoundingClientRect(),min=+slider.min,max=+slider.max;
    return Math.round(min+Math.max(0,Math.min(1,(x-box.left)/box.width))*(max-min));
  };
  const surLaRegle=event=>{
    const a=slider.getBoundingClientRect(),b=ruler.getBoundingClientRect();
    return event.clientY>=Math.min(a.top,b.top)-12&&event.clientY<=Math.max(a.bottom,b.bottom)+12;
  };
  const poser=x=>{
    const valeur=String(valeurAuPoint(x));
    if(valeur===slider.value)return;
    slider.value=valeur;
    slider.dispatchEvent(new Event('input',{bubbles:true}));
  };
  let doigt=null,depart=0,glisse=false;
  zone.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'||slider.disabled||event.target.closest('button,a,summary')||!surLaRegle(event))return;
    doigt=event.pointerId;depart=event.clientX;glisse=false;appui=true;
    hover=Math.round((valeurAuPoint(event.clientX)-+slider.min));
  });
  zone.addEventListener('pointermove',event=>{
    if(event.pointerId!==doigt)return;
    // un glissé horizontal prend la main ; un glissé vertical reste au défilement
    if(!glisse&&Math.abs(event.clientX-depart)>6){glisse=true;zone.setPointerCapture?.(doigt);}
    if(glisse){hover=Math.round(valeurAuPoint(event.clientX)-+slider.min);poser(event.clientX);}
  });
  const fin=event=>{
    if(event.pointerId!==doigt)return;
    if(event.type==='pointerup'&&!glisse)poser(event.clientX);   // un tap saute à l'année
    if(glisse||event.type==='pointerup')slider.dispatchEvent(new Event('change',{bubbles:true}));
    doigt=null;glisse=false;hover=null;
  };
  zone.addEventListener('pointerup',fin);
  zone.addEventListener('pointercancel',fin);

  // lissage indépendant de la fréquence d'affichage (0,22 par image à 60 Hz)
  return function update(time,deltaTime=16.7) {
    if(!ruler.getClientRects().length)return;
    const k=reduced.matches?1:1-Math.pow(1-.22,Math.min(deltaTime,50)/16.7);
    const active=Number(slider.value)-2026;
    bars.forEach((bar,i)=>{
      const distance=i-active;
      let height=i===active?(appui?3.7:3.1):1+1.6*Math.exp(-distance*distance/7);
      let alpha=i===active?1:i<active?.55:.25;
      if(!reduced.matches&&hover!==null){height+=.9*Math.exp(-((i-hover)**2)/5);if(i<=hover)alpha=Math.max(alpha,.25+.6*Math.exp(-((i-hover)**2)/.3));}
      const nextHeight=heights[i]+(height-heights[i])*k;
      const nextOpacity=opacity[i]+(alpha-opacity[i])*k;
      if(Math.abs(nextHeight-heights[i])>.0015){heights[i]=nextHeight;bar.style.transform=`scaleY(${nextHeight.toFixed(3)})`;}
      if(Math.abs(nextOpacity-opacity[i])>.0015){opacity[i]=nextOpacity;bar.style.opacity=nextOpacity.toFixed(3);}
    });
  };
}
