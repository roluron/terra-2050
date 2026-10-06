import {experienceUICopy} from './experience-ui-copy.mjs';
import {humanCopy,impactSources} from './human-impact-copy.mjs';
import {readingCopy,legendCopy} from './reading-copy.mjs';
const icon=(kind)=>kind==='eye'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="5" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8 11 8-5M8 13l8 5"/></svg>';
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const sourceURLs={chaleur:'https://www.worldclim.org/data/cmip6/cmip6climate.html',secheresse:'https://www.worldclim.org/data/cmip6/cmip6climate.html',stabilite:'https://www.worldclim.org/data/cmip6/cmip6climate.html',feux:'https://essd.copernicus.org/articles/15/2153/2023/',mer:'https://www.wri.org/data/aqueduct-floods-hazard-maps',fleuves:'https://www.wri.org/data/aqueduct-floods-hazard-maps',declin:'https://population.un.org/wpp/'};
export function createExperienceUI(api){
 const $=id=>document.getElementById(id), eye=$('layer-visibility'), share=$('share-view');
 eye.innerHTML=icon('eye');share.innerHTML=icon('share')+'<span></span>';
 const menuSource=el('button',undefined,'ux-source-link');menuSource.id='menu-sources';menuSource.type='button';
 $('model-notice').append(menuSource);
 const summarySource=menuSource.cloneNode();summarySource.id='summary-sources';$('filter-summary').append(summarySource);
 const dialogs={};let opener=null,sourceContext='world';
 for(const name of ['sources','share','compare']){
  const d=el('dialog',undefined,'ux-dialog');d.id='view-'+name;d.setAttribute('aria-labelledby',d.id+'-title');
  const title=el('h2');title.id=d.id+'-title';const close=el('button','×','ux-close');close.type='button';
  const content=el('div',undefined,'ux-dialog-content');d.append(title,close,content);document.body.append(d);
  close.addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
  d.addEventListener('close',()=>{const target=opener?.isConnected&&opener.getClientRects().length?opener:$('map-toggle');target.focus({preventScroll:true});});
  dialogs[name]={d,title,close,content};
 }
 const row=(root,title,text)=>{if(!text)return;const section=el('section',undefined,'ux-row');section.append(el('h3',title),el('p',text));root.append(section);return section;};
 function viewURL(){
  api.prepareURL();const state=api.getState(),url=new URL(location.href);
  for(const key of ['layer','mode','year','hidden','lat','lon'])url.searchParams.delete(key);
  url.searchParams.set('lang',state.language);url.searchParams.set('year',state.year);
  if(state.filter){url.searchParams.set('layer',state.filter);url.searchParams.set('mode',state.mode);if(state.hidden)url.searchParams.set('hidden','1');}
  if(state.point){url.searchParams.set('lat',state.point.lat.toFixed(5));url.searchParams.set('lon',state.point.lon.toFixed(5));}
  return url.href;
 }
 function render(name){
  const state=api.getState(),c=experienceUICopy(state.language),{d,title,close,content}=dialogs[name];
  const expanded=content.querySelector('.ux-data-details')?.open;
  title.textContent=c[name];close.setAttribute('aria-label',c.close);content.replaceChildren();
  const filterName=state.filter?document.querySelector(`.calque[data-cle="${state.filter}"] .nom`).textContent:c.choose;
  const modeName=document.querySelector(`[data-map-mode="${state.mode}"]`)?.textContent||'';
  if(name==='sources'){
   const source=api.getSource(sourceContext);title.textContent=c.sources+' · '+filterName+(sourceContext==='local'&&state.location?' · '+state.location:'');
   const plain=source.plain;
   if(plain){row(content,plain.measureLabel,plain.measure);row(content,plain.comparisonLabel,plain.comparison);row(content,plain.valuesLabel,plain.values);}
   else row(content,c.measure,source.description);
   const details=el('details',undefined,'ux-data-details');details.open=!!expanded;details.append(el('summary',readingCopy(state.language).more));
   const full=el('div');details.append(full);content.append(details);
   row(full,c.summary,source.summary);
   row(full,c.reading,modeName+' · '+state.year);
   const scale=$('layer-context').querySelector('.map-scale');if(scale)full.append(scale.cloneNode(true));
   row(full,c.method,[source.method,source.technical].filter(Boolean).join('\n\n'));
   const r=row(full,c.source,source.source);if(r&&sourceURLs[state.filter]){const a=el('a',c.source);a.href=sourceURLs[state.filter];a.target='_blank';a.rel='noopener';r.append(a);}
   row(full,c.limits,[source.notice,source.animation].filter(Boolean).join('\n\n'));
   const human=humanCopy(state.language),impact=row(full,human.effectLabel,[human.effects[state.filter],human.effectScope].filter(Boolean).join('\n'));
   if(impact&&impactSources[state.filter]){const reference=impactSources[state.filter],link=el('a',reference.name);link.href=reference.url;link.target='_blank';link.rel='noopener';impact.append(link);}
  }else if(name==='share'){
   row(content,c.reading,filterName+' · '+state.year+(state.filter?'\n'+modeName+'\n'+(state.hidden?c.hide:c.show):''));
   row(content,c.location,state.location);
   const label=el('label',c.link),input=el('input');input.type='url';input.readOnly=true;input.value=viewURL();input.setAttribute('aria-label',c.link);input.addEventListener('click',()=>input.select());label.append(input);content.append(label);
   const status=el('p',undefined,'ux-status');status.setAttribute('role','status');
   const copy=el('button',c.copy,'ux-primary');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(input.value);status.textContent=c.copied;}catch{status.textContent=c.failed;input.focus();input.select();}});
   content.append(copy);
   if(navigator.share){const native=el('button',c.share,'ux-source-link');native.type='button';native.addEventListener('click',async()=>{try{await navigator.share({title:'TERRA/2050',text:filterName+' · '+state.year,url:input.value});}catch(e){if(e.name!=='AbortError')status.textContent=c.failed;}});content.append(native);}
   content.append(status);
  }else{
   title.textContent=c.compare+' · '+state.location;
   row(content,c.reading,filterName+'\n'+modeName);
   const grid=el('div',undefined,'ux-year-comparison');
   for(const year of [2026,state.year===2026?2050:state.year]){
    const reading=api.readYear(year),article=el('article');article.append(el('h3',String(year)),el('strong',reading?.diagnostic?.value||c.noData),el('p',reading?.diagnostic?.detail||''));grid.append(article);
   }
   content.append(grid);row(content,c.details,api.readYear(state.year)?.note);row(content,c.limits,api.getSource().notice);
  }
 }
 function open(name,event){
  if(name!=='share'&&!api.getState().filter)return;
  opener=event?.currentTarget||document.activeElement;
  if(name==='sources')sourceContext=event?.currentTarget?.matches('[data-hover-action="source"]')?'local':'world';
  render(name);dialogs[name].d.showModal();
 }
 menuSource.addEventListener('click',e=>open('sources',e));summarySource.addEventListener('click',e=>open('sources',e));
 $('survol').querySelector('[data-hover-action="source"]').addEventListener('click',e=>open('sources',e));
 $('survol').querySelector('[data-hover-action="compare"]').addEventListener('click',e=>open('compare',e));
 eye.addEventListener('click',api.toggleLayer);share.addEventListener('click',e=>open('share',e));
 function translateHover(){
  const state=api.getState(),c=experienceUICopy(state.language),tip=$('survol');tip.querySelector('summary').textContent=c.details;
  for(const name of ['source','compare','explore','close']){const b=tip.querySelector(`[data-hover-action="${name}"]`);b.textContent=c[name==='source'?'sources':name];b.disabled=['source','compare'].includes(name)&&!state.filter;}
 }
 function layout(){
  const r=$('map-inspector').getBoundingClientRect();eye.style.left=(r.right+8)+'px';
  const search=$('recherche').getBoundingClientRect();share.style.right=Math.max(12,innerWidth-search.left+14)+'px';
 }
 function sync(){
  const state=api.getState(),c=experienceUICopy(state.language);
  eye.hidden=!state.filter;eye.setAttribute('aria-label',state.hidden?c.show:c.hide);eye.setAttribute('aria-pressed',String(!state.hidden));eye.classList.toggle('layer-hidden',state.hidden);
  share.querySelector('span').textContent=c.share;share.setAttribute('aria-label',c.share);
  menuSource.textContent=summarySource.textContent=c.sources;menuSource.hidden=!state.filter;
  const legend=$('visible-legend'),scale=$('layer-context').querySelector('.map-scale');legend.replaceChildren();
  if(scale){const clone=scale.cloneNode(true),simple=legendCopy(state.filter,state.language,state.mode);clone.classList.replace('map-scale','ux-scale');
   clone.querySelectorAll('small').forEach(node=>node.remove());
   [...clone.querySelector('span').children].forEach((node,i)=>{if(simple.ticks[i])node.textContent=simple.ticks[i];});
   legend.append(el('p',simple.caption,'ux-legend-mode'),clone);}
  $('filter-summary').classList.toggle('layer-hidden',state.hidden);
  translateHover();for(const [name,{d}]of Object.entries(dialogs))if(d.open)render(name);
  layout();
 }
 new ResizeObserver(layout).observe($('map-inspector'));new ResizeObserver(layout).observe($('recherche'));addEventListener('resize',layout);
 const params=new URLSearchParams(location.search);
 if(params.has('layer')||params.has('year')||params.has('lat')){
  const restore=()=>{if(document.body.classList.contains('pret')){observer.disconnect();api.restore(params);}};
  const observer=new MutationObserver(restore);observer.observe(document.body,{attributes:true,attributeFilter:['class']});restore();
 }
 return {sync,translateHover,viewURL};
}
