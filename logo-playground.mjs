import {mountThermalLogo} from './thermal-logo.mjs?v=20261008-type';
import {experienceUICopy} from './experience-ui-copy.mjs';

const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./thermal-logo.css?v=20261008-type',import.meta.url).href;
const styled=new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=reject;});document.head.append(style);await styled;
const copy={
  fr:['Jouer avec le logo','Effacer','Déplace la souris ou dessine avec le doigt. Espace pour une vague de couleur.'],
  en:['Play with the logo','Clear','Move the mouse or draw with your finger. Space for a wave of colour.'],
  es:['Jugar con el logo','Borrar','Mueve el ratón o dibuja con el dedo. Espacio para una ola de color.'],
  it:['Gioca con il logo','Cancella','Muovi il mouse o disegna con il dito. Spazio per un’onda di colore.'],
  vi:['Chơi với logo','Xóa','Di chuyển chuột hoặc vẽ bằng ngón tay. Nhấn dấu cách để tạo sóng màu.'],
  ja:['ロゴで遊ぶ','消去','マウスを動かすか指で描いてください。スペースキーで色の波。'],
  zh:['与标志互动','清除','移动鼠标或用手指绘画。按空格键产生色彩波浪。'],
  'zh-Hant':['與標誌互動','清除','移動滑鼠或用手指繪畫。按空白鍵產生色彩波浪。']
};
const dialog=document.createElement('dialog');dialog.id='logo-playground';dialog.setAttribute('aria-label','fromearth / 2050');
dialog.innerHTML='<button id="logo-play-close" type="button">×</button><div class="logo-play-stage"><div class="thermal-logo logo-play-large" tabindex="0" role="img" aria-label="fromearth / 2050" aria-describedby="logo-play-hint"><span class="thermal-fallback">from<strong>earth</strong><small>/ 2050</small></span></div></div><div class="logo-play-footer"><p id="logo-play-hint"></p><button id="logo-play-clear" type="button"></button></div>';
document.body.append(dialog);
const large=dialog.querySelector('.logo-play-large'),close=dialog.querySelector('#logo-play-close'),clear=dialog.querySelector('#logo-play-clear'),hint=dialog.querySelector('#logo-play-hint');
let enlarged,mounting,opener;
const logos=await Promise.all([...document.querySelectorAll('#wordmark,#v-wordmark')].map(async element=>{
  const name=element.querySelector('.brand-name'),from=document.createElement('span');from.className='brand-from';from.textContent='from';name.firstChild.replaceWith(from);
  element.classList.add('thermal-inline');element.removeAttribute('aria-hidden');element.removeAttribute('tabindex');
  const effect=await mountThermalLogo(element,'bleed','inline');
  const trigger=document.createElement('button');trigger.type='button';trigger.className='thermal-trigger';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',dialog.id);element.append(trigger);
  trigger.addEventListener('keydown',event=>{if(event.code==='Space'||event.code==='Enter')event.stopPropagation();});
  trigger.addEventListener('pointerdown',event=>event.stopPropagation());
  trigger.addEventListener('click',async()=>{
    if(dialog.open)return;opener=trigger;sync();logos.forEach(logo=>logo.effect?.clear());dialog.showModal();
    mounting??=mountThermalLogo(large);enlarged=await mounting;if(dialog.open)large.focus({preventScroll:true});else enlarged?.clear();
  });
  return {effect,trigger};
}));
function sync(){
  const lang=document.documentElement.lang,c=copy[lang]||copy.en;
  logos.forEach(logo=>logo.trigger.setAttribute('aria-label',c[0]));clear.textContent=c[1];hint.textContent=c[2];close.setAttribute('aria-label',experienceUICopy(lang).close);
}
close.addEventListener('click',()=>dialog.close());clear.addEventListener('click',()=>enlarged?.clear());
dialog.addEventListener('keydown',event=>{
  event.stopPropagation();
  if(event.key==='Tab'){
    if(event.shiftKey&&document.activeElement===close){event.preventDefault();clear.focus();}
    else if(!event.shiftKey&&document.activeElement===clear){event.preventDefault();close.focus();}
  }
});
dialog.addEventListener('click',event=>{if(event.target===dialog||event.target.classList.contains('logo-play-stage'))dialog.close();});
dialog.addEventListener('close',()=>{enlarged?.clear();if(opener?.isConnected)opener.focus({preventScroll:true});});
window.addEventListener('terra-language',sync);sync();
