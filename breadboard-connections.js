import {busKey,holeKey,position,rows,boardGraph,validHole} from './breadboard-model.js';

// Include relay strips used only by jumpers, not just strips with component legs.
export function boardConnections(plan){
 const graph=boardGraph(plan),groups=new Map(),portNodes=new Map();
 for(const p of plan.ports)portNodes.set(graph.root(p.hole),p.node);
 const add=(hole,contact)=>{const id=busKey(hole);if(!groups.has(id))groups.set(id,{id,hole:{...hole},node:portNodes.get(graph.root(hole))??null,contacts:[]});groups.get(id).contacts.push({...contact,hole:{...hole}});};
 for(const p of plan.ports)add(p.hole,{kind:'component',id:p.component+'.'+p.pin});
 for(const r of plan.references||[])add(r.hole,{kind:'reference',id:r.component});
 for(const w of plan.jumpers){add(w.from,{kind:'jumper',id:w.id,end:'from'});add(w.to,{kind:'jumper',id:w.id,end:'to'});}
 return [...groups.values()].map(group=>({...group,relay:!group.contacts.some(c=>c.kind!=='jumper'),rail:'pnqr'.includes(group.hole.row)}));
}
export function jumperConnectionProblems(plan){
 const groups=boardConnections(plan),byBus=new Map(groups.map(g=>[g.id,g])),graph=boardGraph(plan),anchors=new Set([...plan.ports.map(p=>graph.root(p.hole)),...(plan.references||[]).map(r=>graph.root(r.hole))]);
 return plan.jumpers.flatMap(w=>['from','to'].flatMap(end=>{
  const h=w[end],g=byBus.get(busKey(h)),peers=g.contacts.filter(c=>c.kind!=='jumper'||c.id!==w.id);
  return !anchors.has(graph.root(h))?[{wire:w.id,end,hole:h,reason:'isolated'}]:peers.length?[]:[{wire:w.id,end,hole:h,reason:'unconnected end'}];
 }));
}
export function assertGeneratedConnections(plan){
 const occupied=new Set();
 for(const h of [...plan.ports.map(p=>p.hole),...plan.jumpers.flatMap(w=>[w.from,w.to])]){
  if(!validHole(h)||occupied.has(holeKey(h)))throw Error('Generated breadboard reuses or misses a physical hole.');
  occupied.add(holeKey(h));
 }
 for(const w of plan.jumpers){if(w.from.board!==w.to.board||w.from.column!==w.to.column&&w.from.row!==w.to.row)throw Error('Generated jumper must connect two aligned holes on one board.');}
 const problems=jumperConnectionProblems(plan);
 if(problems.length)throw Error('Generated breadboard has an unconnected jumper: '+problems.map(p=>p.wire).filter((id,i,a)=>a.indexOf(id)===i).join(', '));
 return true;
}
export function connectionSVG(plan,{board,highlight='all',esc=s=>String(s)}){
 return boardConnections(plan).filter(g=>g.hole.board===board).map(g=>{
  const active=highlight==='all'||String(g.node)===highlight,color=g.node===null?'#ad754b':plan.nets.find(n=>n.node===g.node)?.color||'#526c61';
  const contacts=g.contacts.map(c=>c.id+' at '+c.hole.row.toUpperCase()+c.hole.column),label=(g.rail?'Continuous power rail':g.relay?'Wire join inside five-hole strip':'Connected five-hole strip')+': '+contacts.join(', ');
  const ys=g.contacts.map(c=>position(c.hole).y),xs=g.contacts.map(c=>position(c.hole).x),h=g.hole,p=position(h);
  const first=g.rail?{x:Math.min(...xs),y:p.y}:position({...h,row:rows.indexOf(h.row)<5?'a':'f'}),last=g.rail?{x:Math.max(...xs),y:p.y}:{x:first.x,y:first.y+72};
  const joins=g.contacts.length>1?(g.rail?'<path d="M'+Math.min(...xs)+' '+p.y+'H'+Math.max(...xs)+'" stroke="'+color+'" stroke-width="2" stroke-dasharray="3 3"/>':'<path d="M'+p.x+' '+Math.min(...ys)+'V'+Math.max(...ys)+'" stroke="'+color+'" stroke-width="2" stroke-dasharray="3 3"/>'):'';
  return '<g class="board-bus-connection" data-board-bus="'+esc(g.id)+'" data-relay="'+g.relay+'" data-net="'+g.node+'" role="img" aria-label="'+esc(label)+'" opacity="'+(active?1:.18)+'"><title>'+esc(label)+'</title><rect x="'+(first.x-6)+'" y="'+(first.y-7)+'" width="'+Math.max(12,last.x-first.x+12)+'" height="'+Math.max(14,last.y-first.y+14)+'" rx="5" fill="'+color+'" fill-opacity="'+(g.relay?'.22':'.1')+'"/>'+joins+'</g>';
 }).join('');
}
