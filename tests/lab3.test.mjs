import test from 'node:test';
import assert from 'node:assert/strict';
import {lab3Circuits} from '../lab3-circuits.js';
import {dcReading,inputResistance,outputResistance,summingDesign,summingRange} from '../lab3-analysis.js';
import {breadboardPlan,opampBatteryConnections} from '../breadboard-model.js';
import {buildGuide} from '../breadboard-build.js';
import {pins} from '../solver.js';

const circuit=id=>lab3Circuits.find(entry=>entry.id==='lab3-'+id).data;
const near=(actual,expected,tolerance=0.0003)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} vs ${expected}`);

test('Lab 3 presets reproduce every DC output and identify clipping',()=>{
 const expected={
  'inv-1':-1.5,'inv-2':-1.5*8.2/4.7,'inv-3':-4.7,'inv-4':-7,
  'non-1':3,'non-2':1.5*(1+8.2/4.7),'non-3':6.2,'non-4':7,
  output:-1.5,input:-1.5*4.7/5.7,
  'sum-1':-2.85,'sum-2':5.85,'sum-3':-0.375,'sum-4':-3.975,'sum-5':0.6
 };
 for(const [id,output] of Object.entries(expected)){
  const result=dcReading(circuit(id));
  near(result.output,output);
  assert.equal(result.saturation,id==='inv-4'?'low':id==='non-4'?'high':'linear');
 }
});

test('Lab 3 calculators use port readings, signed limits, and meter uncertainty',()=>{
 const base=dcReading(circuit('inv-1')),series=dcReading(circuit('input'));
 near(inputResistance(base.input,base.current,series.input,series.current),4700,0.1);
 near(outputResistance(base.output,dcReading(circuit('output')).output,1000).estimate,0);
 near(outputResistance(-1.5,-1.5,1000,0.005,0.005).upper,1000*(1.505/1.495-1));
 assert.throws(()=>outputResistance(-1.5,-1.5,999),/at least/);
 assert.deepEqual(summingDesign(10000,0.25,0.4),{ra:40000,rb:25000});
 const sum=structuredClone(circuit('sum-1'));
 sum.components.find(c=>c.id==='U1').supply.outputMin=-6;
 assert.deepEqual(summingRange(sum),{slope:-0.625,lower:-17.5,upper:15});
});

test('summing layouts reuse the input rail battery and keep both supply returns on ground',()=>{
 for(const id of ['sum-1','sum-2','sum-4']){
  const data=circuit(id),plan=breadboardPlan(data),supplies=opampBatteryConnections(plan);
  assert.equal(supplies.filter(s=>s.tap).length,1);
  assert.ok(supplies.every(s=>s.groundHole));
  const guide=buildGuide(data,plan,(value,unit)=>value+' '+unit);
  assert.equal(guide.parts.get('DC battery or supply · 9 V').length,2);
  assert.equal(guide.wires.get('Flexible supply jumper').length,1);
 }
});

test('Procedure 3 places both input paths and every connection on the editor grid',()=>{
 for(const entry of lab3Circuits.filter(t=>t.id.startsWith('lab3-sum-'))){
  const {components,wires}=entry.data;
  const points=[...components,...components.flatMap(pins),...wires.flatMap(w=>w.points)];
  assert.ok(points.every(({x,y})=>x%24===0&&y%24===0),entry.id);
  assert.ok(wires.every(w=>w.points.every((p,i)=>i===0||p.x===w.points[i-1].x||p.y===w.points[i-1].y)),entry.id);
  const [a,b]=['Ra','Rb'].map(id=>components.find(c=>c.id===id));
  assert.equal(a.x,b.x);
  assert.ok(a.y<b.y);
 }
});
