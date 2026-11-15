import test from 'node:test';
import assert from 'node:assert/strict';
import {solve,transient,magnitude} from '../solver.js';
import {templates} from '../content.js';
const get=id=>structuredClone(templates.find(t=>t.id===id).data);
function near(a,b,tol=1e-8){assert.ok(Math.abs(a-b)<tol,`${a} ≠ ${b}`);}
test('balanced bridge has 5 V midpoints and zero bridge current',()=>{const s=solve(get('bridge'));near(s.results.R2.v.re,5);near(s.results.R4.v.re,5);near(s.results.R5.i.re,0);near(s.results.V1.i.re,-.01);});
test('unbalanced bridge includes loading and conserves power',()=>{const c=get('bridge');c.components.find(c=>c.id==='R4').value=2000;const s=solve(c);near(s.results.R2.v.re,70/13);near(s.results.R4.v.re,80/13);near(s.results.R5.i.re,-1/1300);near(Object.values(s.results).reduce((a,r)=>a+r.p.re,0),0);});
test('voltage divider includes ratio and signed source current',()=>{const c=get('divider');c.components.find(c=>c.id==='R2').value=2000;const s=solve(c);near(s.results.R2.v.re,20/3);near(s.results.V1.i.re,-1/300);});
test('parallel branch currents obey KCL',()=>{const s=solve(get('parallel'));near(s.results.R1.i.re,.012);near(s.results.R2.i.re,.006);near(s.results.V1.i.re,-.018);});
test('RC transient agrees with exponential at one and five time constants',()=>{const points=transient(get('rc'),{duration:.05});near(points[59].results.C1.v.re,10*(1-Math.exp(-1)),.04);near(points.at(-1).results.C1.v.re,10*(1-Math.exp(-5)),.004);near(solve(get('rc')).results.C1.i.re,0);near(solve(get('rc')).results.C1.v.re,10);});
test('RL transient agrees with exponential and DC inductor is a short',()=>{const s=transient(get('rl'),{duration:.005});near(s[59].results.L1.i.re,.01*(1-Math.exp(-1)),.00004);near(solve(get('rl')).results.L1.i.re,.01);near(solve(get('rl')).results.L1.v.re,0);});
test('AC low-pass cutoff gain and phase use peak phasors',()=>{const s=solve(get('filter'),{mode:'ac',frequency:1/(2*Math.PI*.001)});const v=s.results.C1.v;near(magnitude(v),5/Math.sqrt(2));near(Math.atan2(v.im,v.re)*180/Math.PI,-45);near(Object.values(s.results).reduce((a,r)=>a+r.p.re,0),0);});
test('closed and open switches limit current',()=>{const c=get('switch');near(solve(c).results.R1.i.re,.005,1e-7);c.components.find(c=>c.id==='S1').closed=false;assert.ok(Math.abs(solve(c).results.R1.i.re)<1e-9);});
test('floating and shorted ideal sources produce useful errors',()=>{const c=get('divider');c.wires=[];assert.throws(()=>solve(c),/cannot be solved/);const b=get('divider');b.wires.push({points:[{x:144,y:240},{x:144,y:336}]});assert.throws(()=>solve(b),/cannot be solved/);});
test('missing ground and invalid resistance are rejected',()=>{const c=get('divider');c.components=c.components.filter(c=>c.type!=='ground');assert.throws(()=>solve(c),/ground/);const b=get('divider');b.components[1].value=0;assert.throws(()=>solve(b),/positive/);});
test('DC current source orientation and resistor load',()=>{const c=get('parallel');c.components[0].type='current';c.components[0].value=-.018;const s=solve(c);near(s.results.R1.v.re,12);near(s.results.R1.i.re,.012);});

test('wire-only groups have no voltage equation in DC or transient analysis',()=>{
 const circuit=get('divider');
 const points=[{x:-100,y:-100},{x:-50,y:-100}];
 const expected=solve(circuit).results.R1.v.re;
 circuit.wires.push({points});
 const dc=solve(circuit);
 near(dc.results.R1.v.re,expected);
 assert.ok(Number.isNaN(dc.voltage(points[0]).re));
 const samples=transient(circuit,{steps:2});
 near(samples[1].results.R1.v.re,expected);
 assert.equal(samples[0].topology,samples[1].topology);
});

test('a 5 fA source across 200 teraohms develops one volt',()=>{
 const circuit={components:[
  {id:'I1',type:'current',value:5e-15,x:48,y:0,rot:0},
  {id:'R1',type:'resistor',value:2e14,x:48,y:0,rot:0},
  {id:'GND',type:'ground',x:0,y:0}
 ],wires:[]};
 near(Math.abs(solve(circuit).results.R1.v.re),1);
});
