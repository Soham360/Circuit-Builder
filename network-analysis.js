import {solve,topology,pins,dependentTypes} from './solver.js';

// Use actual terminal coordinates so node numbering may change after load removal.
export function portEquivalent(circuit,{component,nodeA,nodeB,loadResistance}={}){
 const original=topology(circuit),load=circuit.components.find(c=>c.id===component&&c.type==='resistor');
 if(component&&!load)throw Error('Choose the load resistor to detach for this port calculation.');
 const point=id=>{const index=id==='0'?-1:Number(String(id).slice(1))-1;if(!Number.isInteger(index)||index< -1||index>=original.count)throw Error('Choose two valid port nodes.');return [...original.points.values()].find(p=>original.node(p)===index);};
 const [a,b]=load?pins(load):[point(nodeA),point(nodeB)];
 if(!a||!b||original.node(a)===original.node(b))throw Error('The port must have two different electrical nodes.');
 const network=structuredClone(circuit);if(load)network.components=network.components.filter(c=>c.id!==load.id);
 if(network.components.some(c=>c.unknown))throw Error('Define component values before calculating a numerical port equivalent.');
 if(network.components.some(c=>!['resistor','voltage','current','ground',...dependentTypes].includes(c.type)))throw Error('Port equivalents support linear DC resistor/source networks.');
 // Preserve port points even when removing the load removes the only terminal there.
 network.wires.push({points:[{...a},{...a}]},{points:[{...b},{...b}]});
 let id='PortTest';while(network.components.some(c=>c.id===id))id+='X';
 const source=value=>({id,type:'voltage',value,x:(a.x+b.x)/2,y:(a.y+b.y)/2,length:Math.hypot(b.x-a.x,b.y-a.y),rot:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI});
 const open=solve(network),vth=open.voltage(a).re-open.voltage(b).re;
 const short=structuredClone(network);short.components.push(source(0));const isc=solve(short).results[id].i.re;
 const test=structuredClone(network);for(const c of test.components)if(['voltage','current'].includes(c.type))c.value=0;
 test.components.push(source(1));const itest=-solve(test).results[id].i.re;
 if(Math.abs(itest)<1e-14)throw Error('The port has infinite resistance; a finite Thévenin/Norton equivalent is unavailable.');
 const rth=1/itest,rl=loadResistance??load?.value;
 const result={vth,isc,rth,itest,port:[a,b],removedLoad:load?.id||null,dependent:network.components.filter(c=>dependentTypes.includes(c.type)).map(c=>c.id)};
 if(rl!==undefined){if(!Number.isFinite(rl)||rl<=0)throw Error('Load resistance must be positive.');if(Math.abs(rth+rl)<1e-12)throw Error('This load makes the equivalent singular.');result.loadResistance=rl;result.loadCurrent=vth/(rth+rl);result.loadVoltage=result.loadCurrent*rl;}
 return result;
}

// A spanning-tree cycle basis works for nonplanar layouts as well as planar meshes.
export function loopAnalysis(circuit){
 const s=solve(circuit),t=s.topology,edges=circuit.components.filter(c=>c.type!=='ground').map(c=>({c,nodes:pins(c).map(t.node)}));
 const tree=new Map(),cycles=[];
 const path=(from,to,seen=new Set())=>{if(from===to)return [];seen.add(from);for(const e of tree.get(from)||[]){if(seen.has(e.to))continue;const rest=path(e.to,to,seen);if(rest)return [{id:e.id,sign:e.sign},...rest];}return null;};
 for(const {c,nodes:[a,b]} of edges){const back=path(b,a);if(back){cycles.push([{id:c.id,sign:1},...back]);}else{if(!tree.has(a))tree.set(a,[]);if(!tree.has(b))tree.set(b,[]);tree.get(a).push({to:b,id:c.id,sign:1});tree.get(b).push({to:a,id:c.id,sign:-1});}}
 const rows=edges.map(({c,nodes})=>({id:c.id,nodes,v:s.results[c.id].v.re,i:s.results[c.id].i.re,p:s.results[c.id].p.re,terms:cycles.flatMap((cycle,j)=>{const edge=cycle.find(e=>e.id===c.id);return edge?[{loop:'M'+(j+1),sign:edge.sign}]:[];})}));
 const loops=cycles.map((cycle,j)=>({name:'M'+(j+1),current:s.results[cycle[0].id].i.re,edges:cycle,residual:cycle.reduce((v,e)=>v+e.sign*s.results[e.id].v.re,0)}));
 const branch=id=>{const row=rows.find(r=>r.id===id);if(!row)throw Error('A controlling branch is missing.');return '('+(row.terms.map(e=>(e.sign<0?'-':'+')+e.loop).join('').replace(/^\+/,'')||'0')+')';};
 const drop=c=>c.type==='resistor'?`(${c.value})*${branch(c.id)}`:c.type==='voltage'?`(${c.value})`:c.type==='ccvs'?`(${c.value})*${branch(c.control)}`:`V(${c.id})`;
 const loopEquations=cycles.map(cycle=>cycle.map(e=>(e.sign<0?'-':'+')+drop(edges.find(row=>row.c.id===e.id).c)).join('').replace(/^\+/,'')+' = 0');
 const constraints=edges.flatMap(({c})=>c.type==='current'?[`${branch(c.id)} = ${c.value}`]:c.type==='cccs'?[`${branch(c.id)} = (${c.value})*${branch(c.control)}`]:[]);
 return {rows,loops,loopEquations,constraints,power:rows.reduce((sum,r)=>sum+r.p,0),kcl:Array.from({length:t.count},(_,i)=>({node:'N'+(i+1),terms:rows.flatMap(r=>r.nodes[0]===i&&r.nodes[1]!==i?[{id:r.id,sign:1}]:r.nodes[1]===i&&r.nodes[0]!==i?[{id:r.id,sign:-1}]:[])}))};
}

export function sourceTransformation(circuit,id){
 const top=topology(circuit),s=circuit.components.find(c=>c.id===id);
 if(!s||!['voltage','current'].includes(s.type)||s.unknown)throw Error('Choose a known independent DC source.');
 const [a,b]=pins(s).map(top.node),parts=circuit.components.filter(c=>c.type!=='ground'),rs=parts.filter(c=>c.type==='resistor'&&!c.unknown);
 if(s.type==='current'){
  const r=rs.find(r=>{const [x,y]=pins(r).map(top.node);return x===a&&y===b||x===b&&y===a;});
  if(!r)throw Error('A current source needs a resistor in parallel across the same two nodes.');
  return {source:s.id,resistor:r.id,from:'Norton',to:'Thévenin',resistance:r.value,value:-s.value*r.value,unit:'V',explanation:'The equivalent voltage is V(A) − V(B) = −I(A → B) R. Put this voltage source in series with the resistor.'};
 }
 for(const r of rs){const [x,y]=pins(r).map(top.node),joint=[a,b].find(v=>(v===x||v===y)&&parts.filter(c=>pins(c).some(p=>top.node(p)===v)).length===2);if(joint===undefined)continue;
  const outerSource=a===joint?b:a,outerResistor=x===joint?y:x;
  return {source:s.id,resistor:r.id,from:'Thévenin',to:'Norton',resistance:r.value,value:(a===joint?1:-1)*s.value/r.value,unit:'A',port:[outerSource,outerResistor],explanation:'Current is referenced from the outer source terminal to the outer resistor terminal. Put the current source in parallel with the resistor. Only the two external terminals retain the same behavior.'};
 }
 throw Error('A voltage source needs a series resistor with an unbranched shared node.');
}

// Each waveform is a sum of A exp(-rate*t), including rate=0 constants.
export function waveformPower(voltage,current,{time=0.001,start=0,end=0.001,sign=1}={}){
 if(![time,start].every(Number.isFinite)||time<0||start<0||!(end>=start)||(!Number.isFinite(end)&&end!==Infinity)||![1,-1].includes(sign))throw Error('Use nonnegative times and an end time at or after the start.');
 for(const terms of [voltage,current])if(!Array.isArray(terms)||!terms.length||terms.length>32||terms.some(t=>!Array.isArray(t)||t.length!==2||!t.every(Number.isFinite)||t[1]<0))throw Error('Enter 1–32 [amplitude, decay rate] pairs with finite amplitudes and nonnegative rates.');
 const terms=new Map();for(const [v,a]of voltage)for(const [i,b]of current)terms.set(a+b,(terms.get(a+b)||0)+sign*v*i);
 const p=t=>[...terms].reduce((sum,[rate,amp])=>sum+amp*Math.exp(-rate*t),0);
 let energy=0;for(const [rate,amp]of terms){if(amp===0)continue;if(rate===0){if(end===Infinity)return {power:p(time),energy:null,diverges:true,time,start,end};energy+=amp*(end-start);}else energy+=amp*Math.exp(-rate*start)*(-Math.expm1(-rate*(end-start)))/rate;}
 return {power:p(time),energy,diverges:false,time,start,end,terms:[...terms].map(([rate,amplitude])=>({rate,amplitude}))};
}

export function powerBalance(rows){
 if(!Array.isArray(rows)||!rows.length||rows.some(r=>![r.voltage,r.current].every(Number.isFinite)||![1,-1].includes(r.sign)))throw Error('Each row needs finite voltage, current in amperes, and sign +1 or −1.');
 const powers=rows.map(r=>({...r,power:r.sign*r.voltage*r.current})),net=powers.reduce((s,r)=>s+r.power,0),scale=powers.reduce((s,r)=>s+Math.abs(r.power),0);
 return {powers,net,balanced:Math.abs(net)<=1e-9*Math.max(1,scale)};
}
