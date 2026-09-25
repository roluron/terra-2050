import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
const root=process.env.CAPTURE_ROOT||'/tmp/terra-capture',work=root+'/work/instagram',name='13-macro-planet-lens';
const html=(await readFile(root+'/outputs/cursor-lab.html','utf8')).replace('const cx=w<700?w*.74:w*.73,cy=h*.47,r=Math.min(w*.36,h*.37)','const cx=w*.5,cy=h*.72,r=w*.64').replace('r=down?18:25','r=240').replace('lens(fx,fy,r,.22)','lens(fx,fy,r,.76)').replace('vx=Math.min(2.6,speed*.12)','vx=0').replaceAll('#cceaff99','#ffffffbb').replaceAll('#f2b8de66','#ffffff77');
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({viewport:{width:1080,height:1080},recordVideo:{dir:work,size:{width:1080,height:1080}}});
const page=await context.newPage();
await page.route('**/outputs/cursor-lab.html',route=>route.fulfill({contentType:'text/html',body:html}));
await page.goto('http://127.0.0.1:8091/outputs/cursor-lab.html');await page.waitForFunction(()=>texture!==null);
await page.addStyleTag({content:'header,footer,main,.city,#text-lens{display:none!important}body{cursor:none!important}'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await page.mouse.move(740,620);await sleep(800);const began=Date.now();
while(Date.now()-began<12000){const t=(Date.now()-began)/12000*2*Math.PI;await page.mouse.move(740+45*Math.sin(t),570+50*Math.cos(t));await sleep(25)}
const length=(Date.now()-began)/1000;await page.screenshot({path:work+'/'+name+'-end.png'});await sleep(500);const video=page.video();await context.close();await writeFile(work+'/cuts-macro.json',JSON.stringify([{name,path:await video.path(),length,tail:.5}],null,2));await browser.close();console.log(name,length);
