import test from 'node:test';
import assert from 'node:assert/strict';
import {nodeLabels,topology,key,pins} from '../solver.js';
import {templates} from '../content.js';

test('labels at different points on ideal wire become equal-potential aliases',()=>{
 const c=structuredClone(templates.find(t=>t.id==='divider').data),t=topology(c);
 const points=[...t.points.values()],byNode=new Map();for(const p of points){const n=t.node(p);if(n<0)continue;if(!byNode.has(n))byNode.set(n,[]);byNode.get(n).push(p);}
 const [n,ps]=[...byNode].find(([,ps])=>ps.length>=2);c.junctionNames={[key(ps[0])]:'VA',[key(ps[1])]:'VC','999999,999999':'Stale'};
 const entry=nodeLabels(c,t)['N'+(n+1)];assert.equal(entry.name,'VA');assert.deepEqual(entry.aliases,['VA','VC']);assert.ok(!Object.values(nodeLabels(c,t)).some(e=>e.name==='Stale'));
});
test('ground labels keep their zero-volt reference and distinct nets keep distinct labels',()=>{
 const c=structuredClone(templates.find(t=>t.id==='divider').data),t=topology(c),points=[...t.points.values()];
 const g=points.find(p=>t.node(p)<0),a=points.find(p=>t.node(p)===0),b=points.find(p=>t.node(p)===1);c.junctionNames={[key(g)]:'VG',[key(a)]:'VA',[key(b)]:'VB'};
 const labels=nodeLabels(c,t);assert.equal(labels['0'].name,'0');assert.deepEqual(labels['0'].aliases,['VG']);assert.equal(labels.N1.name,'VA');assert.equal(labels.N2.name,'VB');
});
