import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const source=html.match(/<script id="core">([\s\S]+?)<\/script>/)[1];
const {createScenario,matches}=vm.runInNewContext(source+';({createScenario,matches})');
const now=100000;
for(const [name,expected] of Object.entries({unknown:false,bank:true,expired:false,client:false,call:false})){
  test(name,()=>assert.equal(matches(createScenario(name,now,1),now),expected));
}
test('valid until, but excluding, expiry',()=>{
  const sim=createScenario('bank',now,1);
  assert.ok(matches(sim,now+59999));
  assert.equal(matches(sim,now+60000),false);
  assert.equal(matches(sim,now-1),false);
});
test('previous request cannot validate a new call',()=>{
  const first=createScenario('bank',now,1);
  const second=createScenario('bank',now,2);
  assert.equal(matches({...second,record:first.record},now),false);
});
