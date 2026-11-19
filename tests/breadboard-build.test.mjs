import test from 'node:test';
import assert from 'node:assert/strict';
import {templates} from '../content.js';
import {breadboardPlan,boardGraph,busKey,holeKey,opampBatteryConnections,opampPowerLeads} from '../breadboard-model.js';
import {buildGuide,meterCheck} from '../breadboard-build.js';
import {setLabWireMode} from '../lab-wires.js';

test('build guide includes power, placement, jumper counts and meter checks',()=>{
 const circuit=templates.find(t=>t.id==='lm741-summing').data;
 const plan=breadboardPlan(circuit);
 const guide=buildGuide(circuit,plan,(value,unit)=>`${value} ${unit}`);
 assert.equal(guide.simulationError,'');
 assert.equal(guide.parts.get('DC battery or supply · 9 V').length,3);
 assert.equal([...guide.wires.values()].flat().length,plan.jumpers.length);
 assert.match(guide.placement.find(p=>p.id==='U1').text,/6 → Board 1/);
 assert.equal(guide.supplySteps.length,2);
 const ground=guide.probes.find(p=>p.id===guide.groundId);
 const amp=plan.devices.find(d=>d.id==='U1');
 const [low,high]=opampPowerLeads(amp).map(lead=>guide.probes.find(p=>p.id===busKey(lead.hole)));
 assert.deepEqual(meterCheck(high,low),{sameNet:false,dc:18});
 assert.deepEqual(meterCheck(low,ground),{sameNet:false,dc:-9});
 assert.deepEqual(meterCheck(ground,ground),{sameNet:true,dc:0});
 const kit=setLabWireMode(plan,true);
 assert.ok(kit.jumpers.every(w=>![low.id,high.id].includes(busKey(w.from))&&![low.id,high.id].includes(busKey(w.to))));
});

test('both op-amp battery returns use distinct free holes on the input batteries’ shared ground',()=>{
 const circuit=templates.find(t=>t.id==='lm741-summing').data;
 for(const lab of [false,true]){
  const original=breadboardPlan(circuit);
  const plan=lab?setLabWireMode(original,true):original;
  const graph=boardGraph(plan),ground=graph.root(plan.references[0].hole);
  const supplies=plan.devices.filter(c=>c.battery);
  for(const supply of supplies)assert.ok(supply.ports.some(p=>graph.root(p.hole)===ground));
  const connections=opampBatteryConnections(plan);
  const occupied=new Set([...plan.ports.map(p=>p.hole),...plan.jumpers.flatMap(w=>[w.from,w.to])].map(holeKey));
  assert.equal(connections.length,2);
  for(const {hole,groundHole} of connections){
   assert.ok(groundHole);
   assert.equal(graph.root(groundHole),ground);
   assert.notEqual(graph.root(hole),ground);
   assert.ok(!occupied.has(holeKey(groundHole)));
   occupied.add(holeKey(groundHole));
  }
  const guide=buildGuide(circuit,plan,(value,unit)=>`${value} ${unit}`);
  assert.ok(guide.supplySteps.every((step,i)=>step.includes(connections[i].groundHole.row.toUpperCase()+connections[i].groundHole.column+' (shared GND)')));
 }
});
