import test from 'node:test';
import assert from 'node:assert/strict';
import {jumpersIntersect,wireIntersections,assertGeneratedConnections} from '../breadboard-connections.js';
import {dressLabWire,setLabWireMode} from '../lab-wires.js';
import {breadboardPlan,circuitFromBreadboard,addBoardWire} from '../breadboard-model.js';
import {templates} from '../content.js';
const h=(column,row)=>({board:0,column,row});
const wire=(id,a,b)=>({id,from:a,to:b,node:0,kind:'lab-kit'});
const brownA=dressLabWire(wire('BrownA',h(1,'c'),h(11,'c')));
const brownB=dressLabWire(wire('BrownB',h(6,'a'),h(6,'h')));
test('two 11-hole brown wires crossing perpendicularly are rejected on the same net',()=>{
 assert.equal(brownA.kitName,'Brown');assert.equal(brownB.kitName,'Brown');
 assert.equal(jumpersIntersect(brownA,brownB),true);assert.equal(jumpersIntersect(brownB,brownA),true);
 const p={ports:[],references:[],jumpers:[brownA,brownB],nets:[]};
 assert.deepEqual(wireIntersections(p),[['BrownA','BrownB']]);assert.throws(()=>assertGeneratedConnections(p),/intersecting/);
});
test('overlaps, shared endpoints and an endpoint touching a wire interior are intersections',()=>{
 const a=wire('a',h(1,'b'),h(11,'b'));
 for(const b of [wire('b',h(5,'b'),h(15,'b')),wire('b',h(11,'b'),h(16,'b')),wire('b',h(6,'a'),h(6,'b'))])assert.ok(jumpersIntersect(a,b));
 assert.equal(jumpersIntersect(a,wire('b',h(12,'b'),h(16,'b'))),false);
 assert.equal(jumpersIntersect(a,wire('b',h(1,'c'),h(11,'c'))),false);
 assert.equal(jumpersIntersect(a,{...a,from:{...a.from,board:1},to:{...a.to,board:1}}),false);
});
test('manual wire drawing rejects crossings in both modes without changing the existing plan',()=>{
 for(const labMode of [false,true]){
  const p={ports:[],jumpers:[brownA],labMode,nets:[]};assert.throws(()=>addBoardWire(p,brownB.from,brownB.to),/intersect/);
  assert.equal(p.jumpers.length,1);
 }
});
test('older saved crossing routes are repaired without changing any electrical connection',()=>{
 const c=structuredClone(templates.find(t=>t.id==='bridge').data),p=setLabWireMode(breadboardPlan(c),true);
 p.labRoutingVersion=2;p.jumpers.push(dressLabWire(wire('OldBrown',h(17,'a'),h(17,'h'))));
 assert.ok(wireIntersections(p).length);
 const repaired=setLabWireMode(p,true);assert.deepEqual(wireIntersections(repaired),[]);assert.equal(repaired.labRoutingVersion,3);assert.deepEqual(repaired.ports,p.ports);
 assert.deepEqual(circuitFromBreadboard(c,repaired).wires,c.wires);
});
for(const t of templates)test(t.id+': unrestricted generated wires never intersect',()=>{
 assert.deepEqual(wireIntersections(breadboardPlan(t.data)),[]);
});
