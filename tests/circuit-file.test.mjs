import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {templates} from '../content.js';
import {solve} from '../solver.js';
import {breadboardPlan,boardGraph,circuitFromBreadboard} from '../breadboard-model.js';
import {analysisSettings,decodeCircuit,encodeCircuit} from '../circuit-file.js';

const defaults={frequency:100,duration:.05};

test('a circuit file restores its own frequency and duration',()=>{
 const saved={circuit:{components:[],wires:[]},mode:'ac',frequency:'1000',duration:'0.25'};
 const restored=decodeCircuit(encodeCircuit(saved));
 assert.deepEqual(analysisSettings(restored,defaults),{mode:'ac',frequency:1000,duration:.25});
 assert.deepEqual(analysisSettings({mode:'transient'},defaults),{mode:'transient',...defaults});
});

test('an existing autosave above the old file limits can be exported and reopened',()=>{
 const components=Array.from({length:101},(_,i)=>({id:'R'+i,type:'resistor',x:i,y:0,rot:0,value:1000}));
 const wires=Array.from({length:301},(_,i)=>({points:[{x:i,y:1},{x:i,y:2}]}));
 const original={version:1,circuit:{components,wires}};
 const autosave=decodeCircuit(JSON.stringify(original));
 assert.deepEqual(decodeCircuit(encodeCircuit(autosave)),original);
});

test('invalid wire geometry is still rejected',()=>{
 const circuit={components:[],wires:[{points:[{x:0,y:0},null]}]};
 assert.throws(()=>decodeCircuit(encodeCircuit({circuit})),/Invalid wire data/);
});

test('LM741 example imports and simulates both summing gains',()=>{
 const record=decodeCircuit(readFileSync(new URL('../examples/lm741-summing-amplifier.json',import.meta.url),'utf8'));
 const template=templates.find(t=>t.id===record.templateId);
 assert.deepEqual(record.circuit,template.data);
 const plan=breadboardPlan(record.circuit);
 const ports=plan.ports.filter(p=>p.component==='U1');
 const graph=boardGraph(plan);
 assert.deepEqual(ports.map(p=>p.hole.row),['f','e','e']);
 assert.equal(new Set(ports.map(p=>graph.root(p.hole))).size,3);
 const {circuit}=record;
 assert.equal(circuit.components.find(c=>c.id==='U1').type,'opamp');
 const va=circuit.components.find(c=>c.id==='Va'),vb=circuit.components.find(c=>c.id==='Vb');
 assert.deepEqual([va.value,vb.value],[9,1.5]);
 for(const [a,b,expected] of [[9,1.5,-2.85],[4,0,-1],[0,5,-2],[-4,5,-1]]){
  va.value=a;
  vb.value=b;
  const result=solve(circuit,{mode:record.mode});
  assert.ok(Math.abs(result.results.U1.v.re-expected)<0.00003);
  assert.ok(Math.abs(result.voltage({x:744,y:240}).re-expected)<0.00003);
 }
});

test('the screenshot circuit maps each LM741 pin to the correct breadboard net',()=>{
 const record=decodeCircuit(readFileSync(new URL('../examples/lm741-screenshot-circuit.json',import.meta.url),'utf8'));
 const {circuit}=record,plan=breadboardPlan(circuit),graph=boardGraph(plan);
 const root=(id,pin)=>graph.root(plan.ports.find(p=>p.component===id&&p.pin===pin).hole);
 assert.equal(root('U1','A'),root('R5','B'));
 assert.equal(root('U1','B'),root('R5','A'));
 assert.equal(root('U1','B'),root('R1','B'));
 assert.equal(root('U1','B'),root('R3','A'));
 assert.equal(root('U1','C'),root('V1','B'));
 assert.equal(root('U1','C'),root('V2','B'));
 assert.equal(new Set(['A','B','C'].map(pin=>root('U1',pin))).size,3);
 assert.equal(root('V1','A'),root('R2','A'));
 assert.equal(root('R2','B'),root('R1','A'));
 assert.equal(root('V2','A'),root('R4','B'));
 assert.equal(root('R4','A'),root('R3','B'));
 const expected=-(1000/40000*9+1000/21000*1.64);
 const rebuilt=circuitFromBreadboard(circuit,plan);
 assert.ok(Math.abs(solve(rebuilt).results.U1.v.re-expected)<0.00001);
});

test('the six-resistor summing amplifier routes on one board without jumper crossings',()=>{
 const {circuit}=decodeCircuit(readFileSync(new URL('../examples/lm741-screenshot-circuit.json',import.meta.url),'utf8'));
 circuit.components.find(c=>c.id==='R4').value=5000;
 circuit.components.find(c=>c.id==='R5').value=10000;
 circuit.components.find(c=>c.id==='V2').value=1.63;
 circuit.components.find(c=>c.id==='G1').y=360;
 circuit.components.push({id:'R6',type:'resistor',x:696,y:312,rot:90,value:1e6});
 circuit.wires.at(8).points.pop();
 const plan=breadboardPlan(circuit);
 assert.equal(plan.boardCount,1);
 assert.equal(plan.devices.filter(c=>c.type==='resistor').length,6);
 const graph=boardGraph(plan);
 const root=(id,pin)=>graph.root(plan.ports.find(p=>p.component===id&&p.pin===pin).hole);
 assert.equal(root('R6','A'),root('U1','C'));
 assert.equal(root('R6','B'),root('V1','B'));
 assert.notEqual(root('R6','A'),root('R6','B'));
 const expected=-(10000/40000*9+10000/25000*1.63);
 const original=solve(circuit).results.U1.v.re;
 assert.ok(Math.abs(original-expected)<0.0001);
 assert.equal(solve(circuitFromBreadboard(circuit,plan)).results.U1.v.re,original);
});
