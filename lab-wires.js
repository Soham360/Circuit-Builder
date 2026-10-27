import {assertGeneratedConnections,jumperConnectionProblems,jumpersIntersect,wireIntersections} from './breadboard-connections.js';
import {busKey,holeKey,boardColumns,rows,boardGraph} from './breadboard-model.js';
// Lengths count both end holes: a 3-hole wire connects positions 1 and 3.
export const labWireKit=[
 [51,'Long green','#31834d'],[41,'Long yellow','#e5c52d'],[31,'Long orange','#ed8a27'],[21,'Long red','#ce4542'],
 [11,'Brown','#895535'],[10,'White','#f4f1e7'],[9,'Gray','#8a9095'],[8,'Purple','#9255b0'],[7,'Blue','#3975cb'],
 [6,'Short green','#31834d'],[5,'Short yellow','#e5c52d'],[4,'Short orange','#ed8a27'],[3,'Short red','#ce4542'],[2,'Bare','#b7a28c']
].map(([holes,name,color])=>({holes,name,color}));
// The rail artwork is offset slightly for readability. Physical rows use 0.1-inch
// pitches, including four pitches across the center channel.
const rowPitch={p:-4,n:-3,a:0,b:1,c:2,d:3,e:4,f:8,g:9,h:10,i:11,j:12,q:13,r:14};
export function labWireFor(from,to){
 if(from.board!==to.board)return null;
 const distance=from.row===to.row?Math.abs(from.column-to.column):from.column===to.column?Math.abs(rowPitch[from.row]-rowPitch[to.row]):NaN;
 return labWireKit.find(w=>w.holes===distance+1)||null;
}
export function dressLabWire(w){const kit=labWireFor(w.from,w.to);if(!kit)throw Error('Lab mode only allows your listed wire lengths in a straight row or column.');return {...w,color:kit.color,kitName:kit.name,holes:kit.holes,bare:kit.name==='Bare'};}
export function validLabPlan(plan){return plan.jumpers.every(w=>{const kit=labWireFor(w.from,w.to);return kit&&w.holes===kit.holes&&w.color===kit.color&&w.kitName===kit.name;});}
export function setLabWireMode(original,enabled){
 if(!enabled){const next=structuredClone(original);next.labMode=false;for(const w of next.jumpers){delete w.kitName;delete w.holes;delete w.bare;w.color=next.nets.find(n=>n.node===w.node)?.color||'#668153';}return next;}
 if(original.labMode&&original.labRoutingVersion===3&&validLabPlan(original)&&!wireIntersections(original).length&&(!jumperConnectionProblems(original).length||original.jumpers.some(w=>w.kind==='manual')))return structuredClone(original);
 const plan=structuredClone(original),graph=boardGraph(original),owner=new Map(),targets=new Map(),holesByBus=new Map();
 const put=(h)=>{const key=busKey(h),net=graph.root(h);owner.set(key,net);if(!targets.has(net))targets.set(net,new Map());targets.get(net).set(key,h);};
 for(const p of plan.ports)put(p.hole);
 for(const r of plan.references)put(r.hole);
 for(let board=0;board<plan.boardCount;board++)for(let column=1;column<=boardColumns;column++)for(const row of rows+'pnqr'){
  const h={board,column,row},key=busKey(h);if(!holesByBus.has(key))holesByBus.set(key,[]);holesByBus.get(key).push(h);
 }
 const occupied=new Set(plan.ports.map(p=>holeKey(p.hole))),jumpers=[];
 const overlap=(from,to,extra=[])=>[...jumpers,...extra].some(w=>jumpersIntersect({from,to},w));
 const candidates=(from)=>{
  const result=[];for(const kit of labWireKit){const span=kit.holes-1;for(const direction of [-1,1]){const column=from.column+direction*span;if(column>=1&&column<=boardColumns)result.push({...from,column});}
   for(const row of rows+'pnqr')if(Math.abs(rowPitch[row]-rowPitch[from.row])===span)result.push({...from,row});
  }return result;
 };
 const priority=[...targets.entries()].sort((a,b)=>b[1].size-a[1].size);
 for(const [net,group]of priority){
  const pending=new Set(group.keys()),connected=new Set([pending.values().next().value]);pending.delete([...connected][0]);
  while(pending.size){
   const queue=[...connected].map(bus=>({bus,arrival:null,cost:0,path:[]})),best=new Map();let found=null;
   for(let visits=0;queue.length&&visits<20000;visits++){
    queue.sort((a,b)=>b.cost-a.cost);const state=queue.pop(),stateKey=state.bus+'|'+(state.arrival?holeKey(state.arrival):'start');
    if(best.has(stateKey)&&best.get(stateKey)<state.cost)continue;
    if(pending.has(state.bus)){found=state;break;}
    for(const from of holesByBus.get(state.bus)||[]){
     if(occupied.has(holeKey(from))||state.arrival&&holeKey(from)===holeKey(state.arrival))continue;
     for(const to of candidates(from)){
      const bus=busKey(to);if(bus===state.bus||connected.has(bus)||occupied.has(holeKey(to))||owner.has(bus)&&owner.get(bus)!==net||state.path.some(w=>busKey(w.from)===bus)||overlap(from,to,state.path))continue;
      const cost=state.cost+1000+labWireFor(from,to).holes,k=bus+'|'+holeKey(to);if(best.has(k)&&best.get(k)<=cost)continue;
      best.set(k,cost);queue.push({bus,arrival:to,cost,path:[...state.path,{from,to}]});
     }
    }
   }
   if(!found)throw Error('Your wire kit cannot fit this placement. Free some holes or move components, then try Lab again.');
   for(const edge of found.path){
    const node=plan.ports.find(p=>graph.root(p.hole)===net)?.node??null;
    jumpers.push(dressLabWire({...edge,id:'J'+(jumpers.length+1),node,kind:'lab-kit'}));
    for(const h of [edge.from,edge.to]){occupied.add(holeKey(h));owner.set(busKey(h),net);connected.add(busKey(h));pending.delete(busKey(h));}
   }
  }
 }
 plan.jumpers=jumpers;plan.labMode=true;plan.labRoutingVersion=3;assertGeneratedConnections(plan);return plan;
}
