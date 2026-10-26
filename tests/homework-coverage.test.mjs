import nodeTest from 'node:test';
// The app creates a fresh algebra worker for each request. Match that lifecycle.
const test=(name,fn)=>nodeTest(name,()=>{n=algebra();return fn();});
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {homeworkCircuits} from '../homework-circuits.js';
import {homework} from '../homework.js';
import {solve,pins,nodeLabels,topology} from '../solver.js';
import {portEquivalent,loopAnalysis,sourceTransformation,waveformPower,powerBalance} from '../network-analysis.js';
const algebra=()=>{const ctx={};ctx.self=ctx;vm.runInNewContext(fs.readFileSync(new URL('../vendor/nerdamer.js',import.meta.url),'utf8'),ctx);return ctx.nerdamer;};let n;
const get=id=>structuredClone(homeworkCircuits.find(t=>t.id===id).data),near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const resolve=t=>{const c=structuredClone(t.data);if(t.query?.kind==='unknown'){const r=homework(c,t.query,n);for(const p of c.components.filter(p=>p.unknown)){if(p.id===t.query.component)Object.assign(p,{unknown:false,value:r.numeric});else Object.assign(p,{unknown:false,value:1000});}}if(t.query?.kind==='constraints'){const r=homework(c,t.query,n);for(const v of r.values)Object.assign(c.components.find(p=>p.id===v.id),{value:v.value,unknown:false});}return c;};

test('the library covers all 19 circuit diagrams, retaining unspecified values',()=>{assert.equal(homeworkCircuits.length,19);assert.equal(get('hw3-p4').components.find(c=>c.id==='Rbridge').unknown,true);assert.equal(get('hw2-p5').components.filter(c=>c.unknown).length,2);});
for(const t of homeworkCircuits)test(`${t.id}: finite solution, KCL, KVL, loop reconstruction and power conservation`,()=>{
 const c=resolve(t),top=topology(c),labels=nodeLabels(c,top);assert.equal(top.count,Object.keys(c.junctionNames).length);for(const edge of t.connections){const part=c.components.find(p=>p.id===edge.id);pins(part).forEach((p,i)=>{const node=top.node(p),label=i?edge.b:edge.a;assert.ok(label==='0'?node===-1:labels['N'+(node+1)].aliases.includes(label),edge.id+' pin '+i);});}const r=loopAnalysis(c),currents=Object.fromEntries(r.loops.map(l=>[l.name,l.current]));
 for(const row of r.rows){assert.ok([row.v,row.i,row.p].every(Number.isFinite));near(row.terms.reduce((sum,e)=>sum+e.sign*currents[e.loop],0),row.i);}
 for(const k of r.kcl)near(k.terms.reduce((sum,e)=>sum+e.sign*r.rows.find(row=>row.id===e.id).i,0),0);
 for(const l of r.loops)near(l.residual,0);near(r.power,0);
 const solved=solve(c),scope={...currents};for(const row of r.rows)scope['W'+row.id]=row.v;
 for(const equation of [...r.loopEquations,...r.constraints]){const [a,b]=equation.replace(/V\(([^)]+)\)/g,(_,id)=>'W'+id).split('=');near(Number(n(`(${a})-(${b})`,scope).evaluate().toDecimal(14)),0,1e-7);}
 assert.ok(solved.results);
});
test('unknown values reproduce the given currents, voltages and balanced bridge',()=>{
 for(const [id,expected]of [['hw1-p3',1],['hw1-p4',41.4],['hw2-p2',15],['hw2-p6',-9],['hw3-p4',1406.25]]){const t=homeworkCircuits.find(t=>t.id===id);near(homework(t.data,t.query,n).numeric,expected);}
 const c=resolve(homeworkCircuits.find(t=>t.id==='hw2-p6')),s=solve(c);near(s.results.R12top.i.re,2);near(s.results.R12bottom.i.re,4);
});
test('two measured nodes determine Vs and R4, with rejection of conflicting measurements',()=>{
 const t=homeworkCircuits.find(t=>t.id==='hw2-p5'),r=homework(t.data,t.query,n);near(r.values.find(v=>v.id==='Vs').value,11.961541739395);near(r.values.find(v=>v.id==='R4').value,12694.181468563);
 assert.throws(()=>homework(t.data,{kind:'constraints',measurements:[...t.query.measurements,{kind:'node',nodeA:'N2',value:20}]},n),/unique|satisfy/);
 assert.throws(()=>homework(t.data,{kind:'constraints',measurements:[t.query.measurements[0]]},n),/unique/);
});
test('resistor power is available as a worked target and an inverse measurement',()=>{
 const c=get('hw2-p1'),r=homework(c,{kind:'power',component:'R1'},n);near(r.numeric,solve(c).results.R1.p.re);const simple={components:[{id:'V1',type:'voltage',x:96,y:0,rot:0,value:10},{id:'R1',type:'resistor',x:96,y:0,rot:0,value:1,unknown:true},{id:'G',type:'ground',x:144,y:0,rot:0,value:0}],wires:[]};near(homework(simple,{kind:'unknown',component:'R1',given:{kind:'power',component:'R1',value:0.1}},n).numeric,1000);
});
test('HW1 waveform has exact finite and total energy, including sign reversal',()=>{
 const v=[[1,500],[-1,1500]],i=[[0.03,0],[-0.04,500],[0.01,1500]],r=waveformPower(v,i),t=0.001;
 near(r.power,(Math.exp(-500*t)-Math.exp(-1500*t))*(0.03-0.04*Math.exp(-500*t)+0.01*Math.exp(-1500*t)));
 const total=waveformPower(v,i,{end:Infinity});near(total.energy,0.03/500-0.04/1000-0.03/1500+0.05/2000-0.01/3000,1e-12);
 near(waveformPower(v,i,{end:Infinity,sign:-1}).energy,-total.energy,1e-12);
 assert.equal(waveformPower([[1,0]],[[1,0]],{end:Infinity}).diverges,true);
 assert.throws(()=>waveformPower([[1,-2]],i),/nonnegative/);
 assert.throws(()=>waveformPower(v,i,{end:-1}),/nonnegative/);
});
test('HW1 power table observes all eight reference arrows',()=>{
 const voltages=[6,10,-8,-2,-2,4,-6,2],currents=[0.5,0.1,-0.4,0.3,0.3,-0.2,0.2,-0.4],signs=[1,-1,-1,-1,1,-1,-1,1];
 const rows=voltages.map((voltage,i)=>({voltage,current:currents[i],sign:signs[i]})),r=powerBalance(rows);assert.equal(r.balanced,true);near(r.net,0);rows[1].sign=1;assert.equal(powerBalance(rows).balanced,false);
});
for(const [id,expected]of [['hw4-p1',{vth:17/14,rth:26000/7}],['hw4-p2',{vth:-4,rth:2625}]])test(`${id}: independent open/short/test methods and arbitrary loaded verification`,()=>{
 const c=get(id),r=portEquivalent(c,{component:'RLoad'});near(r.vth,expected.vth);near(r.rth,expected.rth);near(r.isc,r.vth/r.rth);
 for(const value of [100,2000,10000]){c.components.find(p=>p.id==='RLoad').value=value;const e=portEquivalent(c,{component:'RLoad'}),s=solve(c);near(e.loadVoltage,s.results.RLoad.v.re);near(e.loadCurrent,s.results.RLoad.i.re);}
 assert.ok(c.components.some(p=>p.id==='RLoad')); // Input is not mutated.
});
test('zero open-circuit voltage still yields a finite test-source resistance',()=>{const c=get('hw4-p1');for(const p of c.components)if(['voltage','current'].includes(p.type))p.value=0;const r=portEquivalent(c,{component:'RLoad'});near(r.vth,0);near(r.isc,0);near(r.rth,26000/7);});
test('arbitrary node port and reversed terminals preserve the resistance',()=>{const c=get('hw4-p1'),load=c.components.find(p=>p.id==='RLoad'),t=topology(c),[a,b]=pins(load).map(t.node).map(i=>i<0?'0':'N'+(i+1));c.components=c.components.filter(p=>p!==load);const r=portEquivalent(c,{nodeA:a,nodeB:b}),reverse=portEquivalent(c,{nodeA:b,nodeB:a});near(reverse.rth,r.rth);near(reverse.vth,-r.vth);near(reverse.isc,-r.isc);});
test('Norton transformation has the correct polarity for both current directions',()=>{const c=get('hw4-p3'),r=sourceTransformation(c,'I4');near(r.value,-20);near(r.resistance,5);c.components.find(p=>p.id==='I4').value=-4;near(sourceTransformation(c,'I4').value,20);assert.throws(()=>sourceTransformation(c,'R4'),/source/);});
test('series source transformation respects outer-terminal direction and shared-node degree',()=>{const c=get('hw4-p3'),r=sourceTransformation(c,'V10');near(r.value,0.25);near(r.resistance,40);});
