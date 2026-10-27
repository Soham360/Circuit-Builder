import test from 'node:test';
import assert from 'node:assert/strict';
import {templates} from '../content.js';
import {breadboardPlan,busKey,circuitFromBreadboard,boardGraph} from '../breadboard-model.js';
import {setLabWireMode,dressLabWire} from '../lab-wires.js';
import {boardConnections,jumperConnectionProblems,assertGeneratedConnections,connectionSVG} from '../breadboard-connections.js';
const h=(column,row='b')=>({board:0,column,row});
const relayPlan=()=>({boardCount:1,ports:[{component:'R1',pin:'A',node:0,hole:h(1,'e')},{component:'R2',pin:'A',node:0,hole:h(16,'e')}],references:[],nets:[{node:0,color:'#526c61'}],jumpers:[
 dressLabWire({id:'Green',node:0,from:h(1),to:h(6),kind:'lab-kit'}),
 dressLabWire({id:'Brown',node:0,from:h(6,'c'),to:h(16,'c'),kind:'lab-kit'})
]});
test('green and brown wires join through B6/C6 and that relay strip is drawn',()=>{
 const p=relayPlan(),groups=boardConnections(p),join=groups.find(g=>g.id===busKey(h(6)));
 assert.equal(join.relay,true);assert.deepEqual(join.contacts.map(c=>c.id),['Green','Brown']);
 assert.equal(boardGraph(p).root(p.ports[0].hole),boardGraph(p).root(p.ports[1].hole));
 assert.deepEqual(jumperConnectionProblems(p),[]);assert.equal(assertGeneratedConnections(p),true);
 const svg=connectionSVG(p,{board:0});assert.ok(svg.includes('data-board-bus="0:6:top"'));assert.ok(svg.includes('Green at B6, Brown at C6'));assert.ok(svg.includes('stroke-dasharray="3 3"'));
});
test('moving the brown endpoint across the channel exposes both dangling ends',()=>{
 const p=relayPlan();p.jumpers[1].from=h(6,'g');p.jumpers[1].to=h(16,'g');
 const problems=jumperConnectionProblems(p);assert.ok(problems.some(p=>p.wire==='Green'&&p.end==='to'));assert.ok(problems.some(p=>p.wire==='Brown'&&p.end==='from'));
 assert.throws(()=>assertGeneratedConnections(p),/unconnected jumper/);
 const groups=boardConnections(p);assert.notEqual(groups.find(g=>g.id==='0:6:top'),groups.find(g=>g.id==='0:6:bottom'));
});
test('checks reject detached wire islands and reused endpoint holes',()=>{
 const p=relayPlan();p.jumpers.push(dressLabWire({id:'Island',from:h(31),to:h(41)}));
 assert.ok(jumperConnectionProblems(p).some(p=>p.wire==='Island'&&p.reason==='isolated'));assert.throws(()=>assertGeneratedConnections(p),/unconnected/);
 const duplicate=relayPlan();duplicate.jumpers[1].from=h(6);assert.throws(()=>assertGeneratedConnections(duplicate),/reuses/);
});
test('cached lab routing is repaired instead of retaining stale dangling branches',()=>{
 const p=relayPlan();p.labMode=true;p.labRoutingVersion=1;p.jumpers.push(dressLabWire({id:'Stub',node:0,from:h(6,'a'),to:h(9,'a')}));
 assert.ok(jumperConnectionProblems(p).length);
 const fixed=setLabWireMode(p,true);assert.equal(fixed.labRoutingVersion,2);assert.deepEqual(jumperConnectionProblems(fixed),[]);assertGeneratedConnections(fixed);
 assert.equal(boardGraph(fixed).root(fixed.ports[0].hole),boardGraph(fixed).root(fixed.ports[1].hole));
});
for(const template of templates)for(const lab of [false,true])test(template.id+(lab?' lab':' normal')+': every generated end is useful and represented by its physical bus',()=>{
 const c=structuredClone(template.data),base=breadboardPlan(c),plan=lab?setLabWireMode(base,true):base;
 assertGeneratedConnections(plan);assert.deepEqual(jumperConnectionProblems(plan),[]);
 const svg=connectionSVG(plan,{board:0}),groups=boardConnections(plan);
 for(const w of plan.jumpers)for(const end of ['from','to']){
  const group=groups.find(g=>g.id===busKey(w[end]));assert.ok(group);assert.ok(group.contacts.some(c=>c.kind!=='jumper'||c.id!==w.id),w.id+' '+end);
  assert.ok(svg.includes('data-board-bus="'+busKey(w[end])+'"'),w.id+' bus not shown');
 }
 if(lab){const next=circuitFromBreadboard(c,plan);next.breadboard.labRoutingVersion=1;const restored=breadboardPlan(next);assertGeneratedConnections(restored);}
});
test('a stale saved layout cannot silently disagree with the schematic',()=>{
 const c=structuredClone(templates.find(t=>t.id==='divider').data),next=circuitFromBreadboard(c,breadboardPlan(c));
 next.breadboard.jumpers=[];const repaired=breadboardPlan(next);assert.ok(repaired.jumpers.length);assertGeneratedConnections(repaired);
});

test('manual open wire ends remain visible after saving instead of being silently removed',()=>{
 const c=structuredClone(templates.find(t=>t.id==='divider').data),plan=setLabWireMode(breadboardPlan(c),true);
 plan.jumpers.push(dressLabWire({id:'ManualOpen',kind:'manual',from:h(40),to:h(50)}));
 const restored=breadboardPlan(circuitFromBreadboard(c,plan));
 assert.ok(restored.jumpers.some(w=>w.id==='ManualOpen'));assert.equal(jumperConnectionProblems(restored).filter(p=>p.wire==='ManualOpen').length,2);
});
