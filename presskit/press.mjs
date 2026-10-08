import {ui,groupLabel,assetLocale,applyLanguage,initialLanguage,installLanguageSwitcher} from './press-language.mjs';
const $ = selector => document.querySelector(selector);
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url = path => path.split('/').map(encodeURIComponent).join('/');
const formatSize = bytes => bytes < 1e6 ? Math.ceil(bytes/1000)+' KB' : bytes >= 1e9 ? (bytes/1e9).toFixed(1)+' GB' : (bytes/1e6).toFixed(1)+' MB';
let media=[], group='Campaign images', limit=12,lang=initialLanguage(),copies={},copy,completeSize='';
const groups=['Campaign images','Motion loops','Campaign films','Interface footage','Logos'];
const archives={'Campaign images':'fromearth-images.zip','Motion loops':'fromearth-motion.zip','Campaign films':'fromearth-films.zip','Interface footage':'fromearth-interface.zip','Logos':'fromearth-logos.zip'};
function render(){
 const t=ui[lang];
 const query=$('#asset-search').value.toLowerCase().trim();
 const filtered=media.filter(a=>a.category===group).map(a=>({...assetLocale(a,lang,copies),originalTitle:a.title})).filter(a=>!query||[a.title,a.originalTitle,a.details,a.edition,a.path.split('.').pop(),...(a.extras||[]).map(x=>x.label+' '+x.path)].join(' ').toLowerCase().includes(query));
 $('#asset-count').textContent=t.selection(filtered.length);
 $('#collection-download').href='https://github.com/roluron/terra-2050/releases/download/presskit-2026-10-08-clean/'+archives[group];
 $('#collection-download').textContent=t.collection(groupLabel(group,lang));
 $('#show-more').hidden=filtered.length<=limit;
 $('#show-more').textContent=t.more(Math.min(12,filtered.length-limit));
 $('#assets').innerHTML=filtered.slice(0,limit).map(a=>{
  const src=url(a.path),poster=url(a.poster||a.path),label=escape(a.title+(a.edition?' · '+a.edition:''));
  const preview=a.kind==='video'?'<video class="preview" src="'+src+'" poster="'+poster+'" controls muted loop playsinline preload="none" aria-label="'+label+'"></video>':'<a href="'+src+'" target="_blank" rel="noopener" aria-label="'+t.view(label)+'"><img class="preview"'+(a.category==='Logos'&&a.path.includes('-white')?' style="background:#171616"':'')+' src="'+poster+'" alt="'+label+'" loading="lazy" width="1080" height="1350"></a>';
  const links=[{path:a.path,label:a.kind==='video'?'MP4':a.kind==='svg'?'SVG':a.path.endsWith('.png')?'PNG':'JPG'},...(a.extras||[])];
  return '<article class="asset-card">'+preview+'<h3 class="asset-title">'+escape(a.title)+'</h3><p class="asset-details">'+escape([a.edition,a.details,formatSize(a.bytes)].filter(Boolean).join(' · '))+'</p><div class="asset-downloads">'+links.map(x=>'<a href="'+url(x.path)+'" download>'+escape(x.label)+' ↘</a>').join('')+'</div><p class="asset-caption">'+escape(a.caption)+'</p></article>';
 }).join('');
}
function renderCopy(){
 copy=copies[lang];applyLanguage(lang);
 document.querySelectorAll('[data-copy]').forEach(el=>el.textContent=copy[el.dataset.copy]);
 $('#experience').innerHTML=copy.experience.map(x=>'<article><h3>'+escape(x.title)+'</h3><p>'+escape(x.text)+'</p></article>').join('');
 $('#facts').innerHTML=copy.facts.map(([k,v])=>'<div><dt>'+escape(k)+'</dt><dd>'+escape(v)+'</dd></div>').join('');
 $('#source-list').innerHTML=copy.sources.map(x=>'<article><h3><a href="'+escape(x.url)+'" target="_blank" rel="noopener">'+escape(x.name)+' ↗</a></h3><p>'+escape(x.text)+'</p></article>').join('');
 $('#caption-list').innerHTML=copy.captions.map(x=>'<article><h3>'+escape(x.name)+'</h3><p>'+escape(x.text)+'</p></article>').join('');
 $('#complete-size').textContent=completeSize+' · '+ui[lang].allMedia;
 $('#categories').innerHTML=groups.map(g=>'<button type="button" data-group="'+g+'" aria-pressed="'+(g===group)+'">'+escape(groupLabel(g,lang))+'</button>').join('');
}
installLanguageSwitcher(next=>{lang=next;$('#copy-status').textContent='';if(copy){renderCopy();render();}else applyLanguage(lang);});
applyLanguage(lang);
try{
 const [en,fr,library]=await Promise.all(['press-copy.json','press-copy-fr.json','media.json'].map(async path=>{const r=await fetch(path);if(!r.ok)throw new Error(path+' unavailable');return r.json();}));
 copies={en,fr};media=library.assets;completeSize=library.completeSize||formatSize(library.completeBytes);renderCopy();
 document.querySelectorAll('[data-clipboard]').forEach(button=>button.addEventListener('click',async()=>{
  const key=button.dataset.clipboard,text=key==='captions'?copy.captions.map(x=>x.name+'\n'+x.text).join('\n\n'):copy[key];
  try{await navigator.clipboard.writeText(text);$('#copy-status').textContent=ui[lang].copied;}
  catch{$('#copy-status').textContent=ui[lang].clipboardError;}
 }));
 $('#categories').addEventListener('click',e=>{if(!e.target.dataset.group)return;group=e.target.dataset.group;limit=12;document.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===group)));render();});
 $('#asset-search').addEventListener('input',()=>{limit=12;render();});
 $('#show-more').addEventListener('click',()=>{limit+=12;render();});
 document.addEventListener('play',e=>{if(e.target.tagName==='VIDEO')document.querySelectorAll('video').forEach(v=>{if(v!==e.target)v.pause();});},true);
 render();
}catch(error){$('#asset-count').textContent=ui[lang].unavailable;$('#library-error').hidden=false;console.error(error);}

import './logo-preview.mjs?v=20261008-heavy';
