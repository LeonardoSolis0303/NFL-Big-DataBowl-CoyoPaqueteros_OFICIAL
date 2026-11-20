import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
function script(mark){
 const tag='<script>/* '+mark,pos=html.indexOf(tag);
 assert(pos>=0,'Falta script '+mark);
 const end=html.indexOf('</script>',pos);
 assert(end>pos,'Script incompleto '+mark);
 return html.slice(pos+'<script>'.length,end);
}
const AH={data:{demo:{replays:{}},replays:{}},fmt:{},motion:{reduced:()=>true},
 api:{isBackend:()=>false,suggestion:()=>Promise.resolve({}),play:()=>Promise.reject(Error('unavailable')),catalog:()=>Promise.resolve([]),detectBackend:()=>Promise.resolve(false)}};
const queue=[];let now=0;
const ctx=vm.createContext({window:{AH},console,Promise,
 performance:{now:()=>now},
 requestAnimationFrame:cb=>{queue.push(cb);return queue.length;},
 cancelAnimationFrame:()=>{}});
for(const label of ['js/api/adapters.js','AL HUDDLE · MODO PÚBLICO CON DATOS REALES','js/replay/normalize.js','js/replay/playback.js']){
 vm.runInContext(script(label),ctx,{filename:label,timeout:15000});
}
const cat=await AH.api.catalog();
assert.equal(cat.items.length,5,'catálogo real');
for(const item of cat.items){
 const raw=await AH.api.play(item.gameId,item.playId,{revelar:false});
 assert.equal(raw.desenlace,null,'sin spoilers');
 assert(raw.tracking.length>1,'más de un cuadro');
 assert.equal(raw.tracking.length,item.cuadros,'número de cuadros');
 assert(raw.tracking[0].jugadores.length>=22,'22 jugadores');
 const norm=AH.normalize(raw,item);
 assert.equal(norm.frames.length,item.cuadros,'normalización completa');
 assert(norm.frames[0].byId.has('ball'),'balón real');
 const revealed=await AH.api.play(item.gameId,item.playId,{revelar:true});
 assert(revealed.desenlace&&typeof revealed.desenlace.convirtio==='boolean','resultado revelado');
}
const sample=cat.items.find(x=>x.gameId===2021090900&&x.playId===97);
assert(sample,'Brady caso principal');
assert.equal(sample.snap,6,'snap en 6');
assert.equal(sample.lanzamiento,40,'pase en 40');
const raw=await AH.api.play(sample.gameId,sample.playId,{});
const p=AH.normalize(raw,sample);
assert.equal(p.frames.length,43);
assert.equal(p.events.snap,5);
assert.equal(p.events.pass,39);
assert.equal(p.fps,10);
const seen=[];let ended=false;
const player=new AH.Playback({count:p.frames.length,fps:p.fps,events:p.events,onFrame:i=>seen.push(i),onEvent:e=>{if(e==='end')ended=true;}});
player.play();
let count=0;
while(queue.length&&count++<200){now+=100;queue.shift()(now);if(ended)break;}
assert(ended,'reproductor llega al final');
assert(Math.max(...seen)>=42,'llega al cuadro 43');
assert(p.frames[0].byId.get(25511).x!==p.frames[42].byId.get(25511).x,'posición del jugador cambia');
console.log('OK: 5 replays, 43 cuadros, reproducción completa, eventos y spoiler protegido');
