import test from 'node:test';
import assert from 'node:assert/strict';
import {templates} from '../content.js';
import {solve} from '../solver.js';
import {breadboardPlan,auditBreadboard,circuitFromBreadboard,addBoardWire,holeKey,busKey} from '../breadboard-model.js';
import {labWireKit,labWireFor,setLabWireMode,validLabPlan} from '../lab-wires.js';
const hole=(column,row='b')=>({board:0,column,row});
test('the exact user kit counts both endpoints and uses 51-hole long green',()=>{
 assert.deepEqual(labWireKit.map(w=>[w.holes,w.name]),[[51,'Long green'],[41,'Long yellow'],[31,'Long orange'],[21,'Long red'],[11,'Brown'],[10,'White'],[9,'Gray'],[8,'Purple'],[7,'Blue'],[6,'Short green'],[5,'Short yellow'],[4,'Short orange'],[3,'Short red'],[2,'Bare']]);
 for(const kit of labWireKit)assert.equal(labWireFor(hole(1),hole(kit.holes)),kit);
 for(const n of [12,13,20,22,32,42,52])assert.equal(labWireFor(hole(1),hole(n)),null);
 assert.equal(labWireFor(hole(1),hole(2,'c')),null);
 assert.equal(labWireFor(hole(1,'a'),hole(1,'b')).name,'Bare');
 assert.equal(labWireFor(hole(1,'e'),hole(1,'f')).holes,5);
 assert.equal(labWireFor(hole(1,'p'),hole(1,'a')).holes,5);
});
for(const template of templates)test(template.id+': kit routes retain every net, free hole and solver result',()=>{
 const c=structuredClone(template.data),normal=breadboardPlan(c),lab=setLabWireMode(normal,true);
 assert.ok(auditBreadboard(lab));assert.ok(validLabPlan(lab));assert.equal(normal.labMode,undefined);
 assert.deepEqual(lab.ports,normal.ports);
 const occupied=new Set(lab.ports.map(p=>holeKey(p.hole)));
 for(const w of lab.jumpers)for(const h of [w.from,w.to]){assert.ok(!occupied.has(holeKey(h)),w.id+' reuses '+holeKey(h));occupied.add(holeKey(h));}
 const next=circuitFromBreadboard(c,lab),restored=breadboardPlan(JSON.parse(JSON.stringify(next)));
 assert.ok(restored.labMode);assert.ok(validLabPlan(restored));assert.ok(auditBreadboard(restored));assert.deepEqual(next.wires,c.wires);
 if(!c.components.some(p=>p.unknown)){
  const options={mode:template.mode==='ac'?'ac':'dc',frequency:100},before=solve(c,options),after=solve(next,options);
  for(const [id,r]of Object.entries(before.results)){assert.ok(Math.abs(r.v.re-after.results[id].v.re)<1e-8,id);assert.ok(Math.abs(r.i.re-after.results[id].i.re)<1e-8,id);}
 }
 const disabled=setLabWireMode(lab,false);assert.equal(disabled.labMode,false);assert.ok(disabled.jumpers.every(w=>!w.kitName&&!w.holes));assert.ok(auditBreadboard(disabled));
});
test('manual wiring respects the active mode without silently changing the chosen endpoints',()=>{
 const base={labMode:true,ports:[],jumpers:[],nets:[]};
 assert.throws(()=>addBoardWire(base,hole(1),hole(12)),/Lab mode/);
 const added=addBoardWire(base,hole(1),hole(11));assert.equal(added.jumpers[0].kitName,'Brown');assert.equal(added.jumpers[0].holes,11);
 assert.deepEqual(added.jumpers[0].from,hole(1));assert.deepEqual(added.jumpers[0].to,hole(11));
 assert.equal(addBoardWire({...base,labMode:false},hole(1),hole(12)).jumpers.length,1);
});
test('kit routing never silently uses arbitrary lengths when the board is full',()=>{
 const ports=[];for(let column=1;column<=60;column++)for(const row of 'abcdefghijpnqr')ports.push({component:'X'+column+row,pin:'A',node:column,hole:hole(column,row)});
 const plan={ports,jumpers:[{from:hole(1),to:hole(12)}],references:[],boardCount:1,nets:[]};
 assert.throws(()=>setLabWireMode(plan,true),/cannot fit/);
 assert.equal(plan.labMode,undefined);assert.equal(plan.jumpers.length,1);
});
