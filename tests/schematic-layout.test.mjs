import test from 'node:test';
import assert from 'node:assert/strict';
import {templates} from '../content.js';
import {breadboardPlan,circuitFromBreadboard,addBoardWire} from '../breadboard-model.js';
import {pins,solve} from '../solver.js';

test('breadboard rewiring stays compact and preserves component placement',()=>{
 const circuit=structuredClone(templates.find(t=>t.id==='divider').data);
 const plan=addBoardWire(breadboardPlan(circuit),{board:0,column:6,row:'p'},{board:0,column:6,row:'a'});
 const updated=circuitFromBreadboard(circuit,plan);
 assert.deepEqual(updated.components,circuit.components);
 const terminals=updated.components.flatMap(pins),points=updated.wires.flatMap(w=>w.points);
 assert.ok(Math.min(...points.map(p=>p.y))>=Math.min(...terminals.map(p=>p.y))-48,'No overhead wire bundle');
 assert.ok(updated.wires.every(w=>w.points.length<=4),'Connections use at most two bends');
 assert.ok(Math.abs(solve(updated).results.R2.v.re-10)<1e-8);
 assert.deepEqual(circuitFromBreadboard(updated,breadboardPlan(updated)).wires,updated.wires,'Repeated updates preserve routing');
});
