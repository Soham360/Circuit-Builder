import test from 'node:test';
import assert from 'node:assert/strict';
import {breadboardPlan,boardGraph,auditBreadboard,circuitFromBreadboard,jumperRoute} from '../breadboard-model.js';
import {solve} from '../solver.js';

// The user's seven-resistor, two-source circuit, transcribed from the screenshot.
export const screenshotCircuit={components:[
 {id:'V1',type:'voltage',value:9,x:144,y:288,rot:90},
 {id:'R1',type:'resistor',value:8200,x:288,y:144,rot:0},
 {id:'R2',type:'resistor',value:1000,x:720,y:48,rot:0},
 {id:'R3',type:'resistor',value:1500,x:576,y:144,rot:0},
 {id:'R4',type:'resistor',value:10000,x:432,y:432,rot:0},
 {id:'R5',type:'resistor',value:20000,x:720,y:288,rot:90},
 {id:'R6',type:'resistor',value:4700,x:864,y:144,rot:0},
 {id:'R7',type:'resistor',value:10000,x:1008,y:240,rot:90},
 {id:'V2',type:'voltage',value:1.5,x:1008,y:384,rot:90},
 {id:'G1',type:'ground',value:0,x:144,y:432,rot:0}
],wires:[
 [[144,240],[144,144],[240,144]],[[336,144],[432,144],[528,144]],
 [[432,144],[432,48],[672,48]],[[768,48],[1008,48],[1008,144]],
 [[624,144],[720,144],[816,144]],[[912,144],[1008,144],[1008,192]],
 [[1008,288],[1008,336]],[[720,144],[720,240]],[[720,336],[720,432]],
 [[144,336],[144,432],[384,432]],[[480,432],[720,432],[1008,432]]
].map(points=>({points:points.map(([x,y])=>({x,y}))}))};

test('screenshot breadboard preserves every explicitly transcribed junction',()=>{
 const p=breadboardPlan(screenshotCircuit),graph=boardGraph(p);
 const junctions=[['V1:A','R1:A'],['R1:B','R2:A','R3:A'],['R3:B','R5:A','R6:A'],['R2:B','R6:B','R7:A'],['R7:B','V2:A'],['V2:B','R4:B','R5:B'],['V1:B','R4:A']];
 const roots=junctions.map(refs=>{const values=refs.map(ref=>{const [id,pin]=ref.split(':');return graph.root(p.ports.find(p=>p.component===id&&p.pin===pin).hole);});assert.equal(new Set(values).size,1,refs.join(', '));return values[0];});
 assert.equal(new Set(roots).size,junctions.length,'Distinct schematic junctions must stay separate');
 assert.ok(auditBreadboard(p));
 const before=solve(screenshotCircuit),after=solve(circuitFromBreadboard(screenshotCircuit,p));
 for(const [id,result]of Object.entries(before.results)){assert.ok(Math.abs(result.v.re-after.results[id].v.re)<1e-8,id);assert.ok(Math.abs(result.i.re-after.results[id].i.re)<1e-8,id);}
 const links=p.jumpers.filter(w=>w.kind==='strip-link');
 assert.ok(links.length>1);
 for(const a of links)for(const b of links)if(a.node!==b.node)assert.notEqual(a.lane,b.lane,'Unrelated nets need separate horizontal wire lanes');
});

test('breadboard uses the same junction names as the schematic',()=>{const c=structuredClone(screenshotCircuit);c.junctionNames={'432,144':'v_1','720,144':'v_2','1008,144':'v_3','720,432':'v_4','1008,336':'v_5'};const p=breadboardPlan(c);for(const name of Object.values(c.junctionNames))assert.ok(p.nets.some(n=>n.name===name),name);const restored=breadboardPlan(circuitFromBreadboard(c,p));assert.deepEqual(restored.nets.map(n=>n.name).sort(),p.nets.map(n=>n.name).sort());});
