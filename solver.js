// Ideal linear circuit solver. Branch current is positive from terminal A to B.
const z=(re=0,im=0)=>({re,im});
const add=(a,b)=>z(a.re+b.re,a.im+b.im);
const neg=a=>z(-a.re,-a.im);
const mul=(a,b)=>z(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
const div=(a,b)=>{const d=b.re*b.re+b.im*b.im;return z((a.re*b.re+a.im*b.im)/d,(a.im*b.re-a.re*b.im)/d);};
export const magnitude=a=>Math.hypot(a.re,a.im);
export function pins(c){if(c.type==='ground')return [{x:c.x,y:c.y}];const dx=c.rot===90?0:48,dy=c.rot===90?48:0;return [{x:c.x-dx,y:c.y-dy},{x:c.x+dx,y:c.y+dy}];}
export const key=p=>`${p.x},${p.y}`;
function onSegment(p,a,b){return (a.x===b.x&&p.x===a.x&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y))||(a.y===b.y&&p.y===a.y&&p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x));}
export function topology(circuit){
 const points=new Map(),parent=new Map();
 const put=p=>{points.set(key(p),p);parent.set(key(p),key(p));};
 circuit.components.forEach(c=>pins(c).forEach(put));circuit.wires.forEach(w=>w.points.forEach(put));
 const find=a=>{if(parent.get(a)!==a)parent.set(a,find(parent.get(a)));return parent.get(a);};
 const union=(a,b)=>parent.set(find(a),find(b));
 for(const w of circuit.wires){for(let i=1;i<w.points.length;i++){const a=w.points[i-1],b=w.points[i];if(a.x!==b.x&&a.y!==b.y)throw Error('Wires must have horizontal or vertical segments.');for(const [k,p]of points)if(onSegment(p,a,b))union(key(a),k);}}
 const grounds=circuit.components.filter(c=>c.type==='ground');if(!grounds.length)throw Error('Add a ground reference to your circuit.');
 grounds.forEach(c=>union(key(pins(c)[0]),key(pins(grounds[0])[0])));
 const ground=find(key(pins(grounds[0])[0]));const roots=[...new Set([...points.keys()].map(find))].filter(r=>r!==ground);
 const node=p=>{const r=find(key(p));return r===ground?-1:roots.indexOf(r);};
 return {node,count:roots.length,points,find,ground};
}
function gaussian(A,b){
 const n=b.length;for(let col=0;col<n;col++){let pivot=col;for(let r=col+1;r<n;r++)if(magnitude(A[r][col])>magnitude(A[pivot][col]))pivot=r;
 if(magnitude(A[pivot][col])<1e-14)throw Error('Circuit cannot be solved: check floating terminals, disconnected sections, or shorted ideal sources.');
 [A[col],A[pivot]]=[A[pivot],A[col]];[b[col],b[pivot]]=[b[pivot],b[col]];
 for(let r=col+1;r<n;r++){const f=div(A[r][col],A[col][col]);if(magnitude(f)===0)continue;for(let j=col;j<n;j++)A[r][j]=add(A[r][j],neg(mul(f,A[col][j])));b[r]=add(b[r],neg(mul(f,b[col])));}}
 const x=Array.from({length:n},()=>z());for(let r=n-1;r>=0;r--){let v=b[r];for(let c=r+1;c<n;c++)v=add(v,neg(mul(A[r][c],x[c])));x[r]=div(v,A[r][r]);}return x;
}
export function solve(circuit,{mode='dc',frequency=50,dt=0.001,time=0,history={}}={}){
 if(!circuit.components.some(c=>['voltage','ac','current'].includes(c.type)))throw Error('Add a voltage or current source to power your circuit.');
 if(mode==='ac'&&!(frequency>0))throw Error('AC frequency must be positive.');
 const top=topology(circuit),cs=circuit.components.filter(c=>c.type!=='ground');
 for(const c of cs)if(!Number.isFinite(c.value)||(['resistor','capacitor','inductor'].includes(c.type)&&c.value<=0))throw Error('Component values must be finite; R, L, and C must be positive.');
 const branches=cs.filter(c=>['voltage','ac'].includes(c.type)||(c.type==='inductor'&&mode!=='ac'));
 const n=top.count+branches.length,A=Array.from({length:n},()=>Array.from({length:n},()=>z())),b=Array.from({length:n},()=>z());
 const stamp=(r,c,v)=>{if(r>=0&&c>=0)A[r][c]=add(A[r][c],v);};
 const rhs=(r,v)=>{if(r>=0)b[r]=add(b[r],v);};
 const adm=(a,d,g)=>{stamp(a,a,g);stamp(d,d,g);stamp(a,d,neg(g));stamp(d,a,neg(g));};
 const inj=(a,d,i)=>{rhs(a,neg(i));rhs(d,i);};
 const yFor=c=>c.type==='resistor'?z(1/c.value):c.type==='switch'?z(c.closed?1e6:1e-12):c.type==='capacitor'?mode==='ac'?z(0,2*Math.PI*frequency*c.value):mode==='transient'?z(c.value/dt):z():c.type==='inductor'&&mode==='ac'?z(0,-1/(2*Math.PI*frequency*c.value)):z();
 for(const c of cs){const [a,d]=pins(c).map(top.node);const g=yFor(c);adm(a,d,g);
 if(c.type==='capacitor'&&mode==='transient')inj(a,d,z(-c.value/dt*(history[c.id]?.v||0)));
 if(c.type==='current')inj(a,d,z(mode==='ac'?0:c.value));
 if(branches.includes(c)){const j=top.count+branches.indexOf(c);stamp(a,j,z(1));stamp(d,j,z(-1));stamp(j,a,z(1));stamp(j,d,z(-1));
 if(c.type==='inductor'){if(mode==='transient'){stamp(j,j,z(-c.value/dt));rhs(j,z(-c.value/dt*(history[c.id]?.i||0)));}}
 else{const v=mode==='ac'?(c.type==='ac'?z(c.value):z()):c.type==='ac'?z(mode==='transient'?c.value*Math.sin(2*Math.PI*(c.frequency||50)*time):0):z(c.value);rhs(j,v);}}
 }
 const solution=gaussian(A,b),voltage=p=>{const i=top.node(p);return i<0?z():solution[i];},results={},next={};
 for(const c of cs){const pp=pins(c),v=add(voltage(pp[0]),neg(voltage(pp[1])));let i=branches.includes(c)?solution[top.count+branches.indexOf(c)]:mul(yFor(c),v);
 if(c.type==='current')i=z(mode==='ac'?0:c.value);
 if(c.type==='capacitor'&&mode==='transient')i=add(i,z(-c.value/dt*(history[c.id]?.v||0)));
 results[c.id]={v,i,p:mul(v,z(i.re,-i.im))};next[c.id]={v:v.re,i:i.re};}
 return {results,history:next,voltage,topology:top};
}
export function transient(circuit,{duration=0.1,steps=300}={}){let history={},out=[];const dt=duration/steps;for(let k=1;k<=steps;k++){const t=k*dt;const s=solve(circuit,{mode:'transient',dt,time:t,history});history=s.history;out.push({time:t,...s});}return out;}
