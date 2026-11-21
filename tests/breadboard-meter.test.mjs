import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {auditBreadboard,boardGraph,breadboardPlan,opampBatteryConnections} from '../breadboard-model.js';
import {jumperConnectionProblems,wireIntersections} from '../breadboard-connections.js';
import {measureBreadboard} from '../breadboard-meter.js';
import {decodeCircuit} from '../circuit-file.js';
import {pins} from "../solver.js";
import {p1Details} from "../schematic-figure.js";
import {setLabWireMode} from '../lab-wires.js';

const {circuit}=decodeCircuit(readFileSync(new URL('../examples/p1-inverting-amplifier.json',import.meta.url),'utf8'));
for(const lab of [false,true])test(`P1-1 breadboard connectivity and meter readings (Lab ${lab?'on':'off'})`,()=>{
 const plan=setLabWireMode(breadboardPlan(circuit),lab);
 assert.ok(auditBreadboard(plan));
 assert.deepEqual(jumperConnectionProblems(plan),[]);
 assert.deepEqual(wireIntersections(plan),[]);
 const graph=boardGraph(plan),ground=plan.references[0].hole;
 const hole=(component,pin)=>plan.ports.find(p=>p.component===component&&p.pin===pin).hole;
 const probe=(red,black=ground,mode='voltage')=>measureBreadboard(circuit,plan,{red,black,mode});
 const output=hole('U1','A'),minus=hole('U1','B'),plus=hole('U1','C');
 assert.ok(Math.abs(probe(output)+3)<0.0001);
 assert.ok(Math.abs(probe(minus)-0.000015)<1e-9);
 assert.ok(Math.abs(probe(plus))<1e-10);
 assert.equal(probe(hole('Vs','A')),1.5);
 for(const lead of opampBatteryConnections(plan)){
  assert.ok(lead.groundHole);
  assert.equal(graph.root(lead.groundHole),graph.root(ground));
  assert.equal(probe(lead.hole),lead.pin===4?-9:9);
 }
 assert.equal(probe(plus,ground,'resistance'),1e6);
 assert.equal(probe(output,minus,'resistance'),2e4);
 assert.equal(probe(minus,ground,'resistance'),Infinity);

 const feedback=plan.jumpers.find(w=>graph.root(w.from)===graph.root(output));
 assert.ok(feedback);
 const current=(red,black)=>measureBreadboard(circuit,plan,{red,black,mode:'current',gap:feedback.id});
 const measured=current(feedback.from,feedback.to);
 assert.ok(Math.abs(Math.abs(measured)-0.00015)<1e-8);
 assert.equal(current(feedback.to,feedback.from),-measured);
 assert.throws(()=>current(feedback.from,ground),/each side/);
 assert.ok(auditBreadboard(plan),'series measurement preserves the original wiring');
});

test('P1-1 schematic pins and wire vertices align to the 24-unit grid',()=>{
 const onGrid=({x,y})=>x%24===0&&y%24===0;
 const points=[...circuit.components,...circuit.components.flatMap(pins),...circuit.wires.flatMap(w=>w.points)];
 assert.ok(points.every(onGrid));
 const details=p1Details(circuit,(value,unit)=>value+' '+unit,String);
 assert.match(details,/lab-figure-terminal" cx="504" cy="192"/);
 assert.match(details,/lab-figure-terminal" cx="504" cy="312"/);
 assert.equal((details.match(/9 V/g)||[]).length,2);
});
