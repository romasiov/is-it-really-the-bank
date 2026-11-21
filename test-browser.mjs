import assert from 'node:assert/strict';
const port=Number(process.argv[2]);
assert.ok(Number.isInteger(port) && port>0 && port<65536,'Pass the port of a fresh test Chrome instance');
const targets=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const target=targets.find(tab=>tab.type==='page');
assert.ok(target,'Open a page in the test browser');
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r=>socket.onopen=r);
let id=0;const pending=new Map();
socket.onmessage=e=>{const m=JSON.parse(e.data);pending.get(m.id)?.(m)};
async function send(method,params={}){const key=++id;const p=new Promise(r=>pending.set(key,r));socket.send(JSON.stringify({id:key,method,params}));const m=await p;assert.ok(!m.error,JSON.stringify(m.error));return m.result}
async function run(expression){const res=await send('Runtime.evaluate',{expression,returnByValue:true});assert.ok(!res.exceptionDetails,JSON.stringify(res.exceptionDetails));return res.result.value}
async function click(selector){const [x,y]=await run('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');e.scrollIntoView({block:"center"});const b=e.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]})()');for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1})}
const contains=async t=>assert.ok((await run('document.querySelector("#pane").innerText')).includes(t),t);
const action=name=>click('[data-action="'+name+'"]');
await send('Page.navigate',{url:new URL('./index.html',import.meta.url).href});
for(let i=0;i<100&&!await run('!!document.querySelector("[data-action=check]")');i++)await new Promise(r=>setTimeout(r,30));
for(const width of [1150,375]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:new URL('./index.html',import.meta.url).href});
 for(let i=0;i<100&&!await run('!!document.querySelector("[data-action=check]")');i++)await new Promise(r=>setTimeout(r,30));
 assert.equal(await run('document.documentElement.lang'),'ru');
 await contains('Банк сейчас мне звонит?');assert.equal(await run('!!document.querySelector(".app-content .ai-box")'),false);
 for(const mode of ['unknown','bank','edge']){
  await click('[data-mode="'+mode+'"]');assert.equal(await run('document.querySelector(".caller").textContent'),'Mashreq');
  await action('check');
  if(mode==='bank'){await contains('Найдено обращение банка');await contains('Личность звонящего по телефону остаётся неизвестной');await action('chat');await contains('Чат в приложении');await action('reply');await contains('запланирована на завтра');await action('back');await contains('Банк сейчас мне звонит?')}
  else{await contains('Звонок не подтверждён');if(width===375){const geometry=await run('(()=>{const a=document.querySelector("#result").getBoundingClientRect(),b=document.querySelector(".ai-box").getBoundingClientRect();return {resultTop:a.top,aiTop:b.top,height:innerHeight}})()');assert.ok(geometry.resultTop>=-1&&geometry.resultTop<geometry.height&&geometry.aiTop<geometry.height,'Result and AI entry visible after checking on mobile')}await action('support');await action('reply');await contains('только в этой демо-сессии')}
 }
 for(const edge of ['call','client','expired']){
  await run('document.querySelector("#edge").value='+JSON.stringify(edge)+';document.querySelector("#edge").dispatchEvent(new Event("change"))');
  await action('check');await contains('Звонок не подтверждён');
 }
 await click('#en');await contains('Is the bank calling me?');
 await click('[data-mode="bank"]');await action('check');await contains('Bank outreach found');
 await run('document.querySelector("#aiQuestion").value="I already hung up. What should I do now?"');await click('#aiAsk');
 assert.ok((await run('document.querySelector("#aiAnswer").innerText')).includes('contact') || (await run('document.querySelector("#aiAnswer").innerText')).includes('secure'));
 assert.equal(await run('document.querySelector("#aiAnswer strong").textContent'),'Model selected: Next step');
 // Simulate +59.2s of the 60s TTL, then observe the automatic transition at +60s.
 await run('simulation.record.created=Date.now()-59200;simulation.record.expires=simulation.record.created+60000;check()');
 await run('document.querySelector("#aiQuestion").value="What does outreach found mean?"');await click('#aiAsk');
 assert.ok((await run('document.querySelector("#aiAnswer").innerText')).includes('current record'));
 await new Promise(r=>setTimeout(r,1050));
 await contains('Call unconfirmed');
 assert.equal(await run('document.querySelector("#aiAnswer").hidden'),true);
 assert.equal(await run('!!document.querySelector("[data-action=chat]")'),false);
 await click('[data-mode="bank"]');await action('check');
 await action('chat');await contains('no messages are sent');
 await click('#ru');
 await contains('Локальная переписка');
 await click('[data-mode="unknown"]');await action('check');
 await click('[data-action=ai-example]');assert.ok((await run('document.querySelector("#aiQuestion").value')).includes('последние цифры карты'));
 assert.equal(await run('document.querySelector("#aiAnswer strong").textContent'),'Модель выбрала: Личность звонящего');assert.equal(await run('!!document.querySelector(".controls .ai-box")'),false);
 assert.ok((await run('document.querySelector("#aiAnswer").innerText')).includes('не подтверждает, кто говорит'));
 assert.equal(await run('document.querySelector("#pane .result strong").textContent'),'Звонок не подтверждён');
 await run('document.querySelector("#aiQuestion").value="космический паровоз"');await click('#aiAsk');
 assert.equal(await run('document.querySelector("#aiAnswer strong").textContent'),'Модель выбрала: Безопасный ответ');
 assert.ok((await run('document.querySelector("#aiAnswer").innerText')).includes('Звонок не подтверждён'));
 await run('document.querySelector("#aiQuestion").value="используется ли микрофон"');await click('#aiAsk');assert.ok((await run('document.querySelector("#aiAnswer").innerText')).includes('памяти открытой страницы'));
 await click('[data-mode="bank"]');assert.equal(await run('!!document.querySelector(".app-content .ai-box")'),false);
 await action('check');assert.equal(await run('document.querySelector("#aiQuestion").value'),'');assert.equal(await run('document.querySelector("#aiAnswer").hidden'),true);
 await run('clearTimeout(timer);simulation.record.expires=Date.now()-1;document.querySelector("#aiQuestion").value="что означает найдено обращение"');await click('#aiAsk');await contains('Звонок не подтверждён');assert.ok((await run('document.querySelector("#aiAnswer").innerText')).includes('не подтверждён'));
 assert.ok(await run('document.documentElement.scrollWidth<=innerWidth'));
 console.log('Passed real clicks and chat at width',width);
}
socket.close();
