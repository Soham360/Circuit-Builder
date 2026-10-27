import {pins,key} from './solver.js';
const on=(p,a,b)=>Math.abs((p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x))<1e-5&&p.x>=Math.min(a.x,b.x)-1e-5&&p.x<=Math.max(a.x,b.x)+1e-5&&p.y>=Math.min(a.y,b.y)-1e-5&&p.y<=Math.max(a.y,b.y)+1e-5;
const edges=ps=>ps.slice(1).map((b,i)=>[ps[i],b]);
export function tidySchematicWires(circuit,clusters){
 const parts=new Map(circuit.components.map(c=>[c.id,c]));
 const nets=[...clusters.values()].map(rs=>rs.map(r=>pins(parts.get(r.id))[r.pin]));
 const all=nets.flat(),xs=new Set(),ys=new Set(),wires=[];
 for(const p of all)for(const d of [-48,-24,0,24,48]){xs.add(p.x+d);ys.add(p.y+d);}
 for(const [net,ps]of nets.entries()){
  const tree=[ps[0]],pending=ps.slice(1),foreign=nets.flatMap((ps,i)=>i===net?[]:ps);
  while(pending.length){
   let best=null;
   for(const [index,b]of pending.entries())for(const a of tree){
    const candidates=[[a,b],[a,{x:a.x,y:b.y},b],[a,{x:b.x,y:a.y},b]];
    for(const x of xs)candidates.push([a,{x,y:a.y},{x,y:b.y},b]);
    for(const y of ys)candidates.push([a,{x:a.x,y},{x:b.x,y},b]);
    for(const raw of candidates){
     const path=[];for(const p of raw){if(path.length&&key(path.at(-1))===key(p))continue;while(path.length>1&&on(path.at(-1),path.at(-2),p))path.pop();path.push(p);}
     const es=edges(path);if(es.some(([a,b])=>a.x!==b.x&&a.y!==b.y))continue;
     if(foreign.some(p=>es.some(([a,b])=>on(p,a,b))))continue;
     // Crossings are allowed only inside segments, never at unrelated vertices.
     if(wires.some(w=>w.net!==net&&(w.points.some(p=>es.some(([a,b])=>on(p,a,b)))||path.some(p=>edges(w.points).some(([a,b])=>on(p,a,b))))))continue;
     let score=es.reduce((s,[a,b])=>s+Math.abs(a.x-b.x)+Math.abs(a.y-b.y),0)+Math.max(0,path.length-2)*24;
     for(const c of circuit.components.filter(c=>c.type!=='ground'))for(const [a,b]of es)if(a.x===b.x&&Math.abs(a.x-c.x)<36&&Math.max(a.y,b.y)>c.y-30&&Math.min(a.y,b.y)<c.y+30||a.y===b.y&&Math.abs(a.y-c.y)<30&&Math.max(a.x,b.x)>c.x-36&&Math.min(a.x,b.x)<c.x+36)score+=10000;
     if(!best||score<best.score)best={score,path,index};
    }
   }
   if(!best)return null;
   tree.push(pending.splice(best.index,1)[0]);if(best.path.length>1)wires.push({net,points:best.path,routing:'orthogonal'});
  }
 }
 return wires.map(({net,...w})=>w);
}
