import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {labCircuits} from '../lab-circuits.js';
import {labReport,batteryFromMeasurements,loadPoint} from '../lab-analysis.js';
import {solve,pins,topology,nodeLabels} from '../solver.js';
import {loopAnalysis} from '../network-analysis.js';
import {breadboardPlan,circuitFromBreadboard,auditBreadboard} from '../breadboard-model.js';
import {homework} from '../homework.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),a+' != '+b);
for(const t of labCircuits)test(t.id+': topology, power, loops and breadboard preserve the lab circuit',()=>{
 const c=structuredClone(t.data),top=topology(c),labels=nodeLabels(c,top);
 for(const edge of t.connections){const part=c.components.find(p=>p.id===edge.id);pins(part).forEach((p,i)=>{const node=top.node(p),label=i?edge.b:edge.a;assert.ok(label==='0'?node===-1:labels['N'+(node+1)].aliases.includes(label),edge.id+' '+i);});}
 const s=solve(c),loops=loopAnalysis(c);near(loops.power,0);for(const l of loops.loops)near(l.residual,0);
 const plan=breadboardPlan(c);assert.ok(auditBreadboard(plan));const after=solve(circuitFromBreadboard(c,plan));
 for(const [id,r] of Object.entries(s.results)){near(after.results[id].v.re,r.v.re);near(after.results[id].i.re,r.i.re);}
});
test('Procedure 1 node and mesh results reproduce the reference circuit',()=>{
 const c=labCircuits[0].data,r=labReport(c);near(r.loaded.voltage,3.065051020408163);near(r.loaded.current,0.00015325255102040816);
 const ctx={};ctx.self=ctx;vm.runInNewContext(fs.readFileSync(new URL('../vendor/nerdamer.js',import.meta.url),'utf8'),ctx);
 near(homework(c,{kind:'voltage',component:'RLoad'},ctx.nerdamer).numeric,r.loaded.voltage);
 const loop=loopAnalysis(c),row=loop.rows.find(r=>r.id==='RLoad');
 near(row.terms.reduce((sum,t)=>sum+t.sign*loop.loops.find(l=>l.name===t.loop).current,0),r.loaded.current);
});
test('Procedure 3 agrees with independent parallel-branch Thévenin calculation',()=>{
 const c=labCircuits[1].data,r=labReport(c),rth=1/(1/14700+1/31500),vth=(9/14700+1.5/31500)*rth;
 near(r.rth,rth);near(r.vth,vth);near(r.isc,vth/rth);near(r.loaded.voltage,4.405753217259653);
 for(const p of r.loads){const copy=structuredClone(c);copy.components.find(p=>p.id==='RLoad').value=p.resistance;const s=solve(copy).results.RLoad;near(p.voltage,s.v.re);near(p.power,s.p.re);}
 const half=loadPoint(vth,rth,rth);near(half.voltage,vth/2);near(half.power,vth*vth/(4*rth));
 assert.equal(r.loads.reduce((a,b)=>a.power>b.power?a:b).resistance,10000);
 assert.ok(half.power>loadPoint(vth,rth,rth*0.99).power);assert.ok(half.power>loadPoint(vth,rth,rth*1.01).power);
});
test('Procedure 2 uses measured series resistance and rejects impossible readings',()=>{
 const r=batteryFromMeasurements(1.5,0.012,100);near(r.total,125);near(r.internal,25);
 near(batteryFromMeasurements(1.5,0.012,98).internal,27);
 for(const values of [[1.5,0,100],[NaN,1,100],[1.5,0.02,100],[1.5,Infinity,100],[1.5,-1,100]])assert.throws(()=>batteryFromMeasurements(...values));
 for(const values of [[1,0,100],[1,1,-1]])assert.throws(()=>loadPoint(...values));
});
