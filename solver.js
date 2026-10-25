// Ideal linear circuit solver. Branch current is positive from terminal A to B.
const z=(re=0,im=0)=>({re,im});
const add=(a,b)=>z(a.re+b.re,a.im+b.im);
const neg=a=>z(-a.re,-a.im);
const mul=(a,b)=>z(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
const div=(a,b)=>{const d=b.re*b.re+b.im*b.im;return z((a.re*b.re+a.im*b.im)/d,(a.im*b.re-a.re*b.im)/d);};
export const magnitude=a=>Math.hypot(a.re,a.im);
export const roundCoord=v=>Math.round(v*1e7)/1e7;
export function pins(c){if(c.type==='ground')return [{x:c.x,y:c.y}];const a=(c.rot||0)*Math.PI/180,h=(c.length||96)/2,dx=Math.cos(a)*h,dy=Math.sin(a)*h;return [{x:roundCoord(c.x-dx),y:roundCoord(c.y-dy)},{x:roundCoord(c.x+dx),y:roundCoord(c.y+dy)}];}
export const key=p=>`${roundCoord(p.x)},${roundCoord(p.y)}`;
function onSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);return length<1e-9?Math.hypot(p.x-a.x,p.y-a.y)<1e-6:Math.abs((p.x-a.x)*dy-(p.y-a.y)*dx)/length<1e-6&&(p.x-a.x)*dx+(p.y-a.y)*dy>=-1e-6&&(p.x-b.x)*dx+(p.y-b.y)*dy<=1e-6;}
export function routeWire(a,b,{mode='orthogonal',angle=45}={}){const p=[{...a}];if(mode==='direct'){p.push({...b});return p;}if(mode==='angle'){const t=angle*Math.PI/180,dx=Math.cos(t),dy=Math.sin(t),options=[];if(Math.abs(dx)>1e-8){const k=(b.x-a.x)/dx;options.push({x:b.x,y:roundCoord(a.y+k*dy)});}if(Math.abs(dy)>1e-8){const k=(b.y-a.y)/dy;options.push({x:roundCoord(a.x+k*dx),y:b.y});}options.sort((p,q)=>Math.hypot(p.x-a.x,p.y-a.y)+Math.hypot(p.x-b.x,p.y-b.y)-Math.hypot(q.x-a.x,q.y-a.y)-Math.hypot(q.x-b.x,q.y-b.y));const bend=options[0];if(bend&&key(bend)!==key(a)&&key(bend)!==key(b))p.push(bend);}else if(a.x!==b.x&&a.y!==b.y)p.push({x:b.x,y:a.y});p.push({...b});return p;}
export function topology(circuit){
 const points=new Map(),parent=new Map();
 const put=p=>{points.set(key(p),p);parent.set(key(p),key(p));};
 circuit.components.forEach(c=>pins(c).forEach(put));circuit.wires.forEach(w=>w.points.forEach(put));
 const find=a=>{if(parent.get(a)!==a)parent.set(a,find(parent.get(a)));return parent.get(a);};
 const union=(a,b)=>parent.set(find(a),find(b));
 for(const w of circuit.wires){for(let i=1;i<w.points.length;i++){const a=w.points[i-1],b=w.points[i];for(const [k,p]of points)if(onSegment(p,a,b))union(key(a),k);}}
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
export const dependentTypes=['vcvs','ccvs','vccs','cccs'];
export const voltageControlled=c=>['vcvs','vccs'].includes(c.type);
export const currentControlled=c=>['ccvs','cccs'].includes(c.type);
export function terminal(circuit,ref){
 if(typeof ref!=='string')throw Error('Choose the controlling + and − terminals in Properties.');
 const split=ref.lastIndexOf(':'),c=circuit.components.find(c=>c.id===ref.slice(0,split)),pin=ref.slice(split+1)==='B'?1:0;
 if(!c||!pins(c)[pin])throw Error('A controlling terminal is missing. Select valid terminals in Properties.');
 return pins(c)[pin];
}
export function solve(circuit,{mode='dc',frequency=50,dt=0.001,time=0,history={}}={}){
 if(!circuit.components.some(c=>['voltage','ac','current',...dependentTypes].includes(c.type)))throw Error('Add a voltage or current source to your circuit.');
 if(mode==='ac'&&!(frequency>0))throw Error('AC frequency must be positive.');
 const top=topology(circuit),cs=circuit.components.filter(c=>c.type!=='ground');
 for(const c of cs){if(c.unknown)throw Error('This circuit has undefined values. Open Homework to solve symbolically or provide known values.');if(!Number.isFinite(c.value)||(['resistor','capacitor','inductor'].includes(c.type)&&c.value<=0))throw Error('Component values must be finite; R, L, and C must be positive.');}
 const branches=cs.filter(c=>['voltage','ac','current',...dependentTypes].includes(c.type)||(c.type==='inductor'&&mode!=='ac'));
 const branchIndex=c=>top.count+branches.indexOf(c);
 const size=top.count+branches.length,A=Array.from({length:size},()=>Array.from({length:size},()=>z())),b=Array.from({length:size},()=>z());
 const stamp=(r,c,v)=>{if(r>=0&&c>=0)A[r][c]=add(A[r][c],v);};
 const rhs=(r,v)=>{if(r>=0)b[r]=add(b[r],v);};
 const adm=(a,d,g)=>{stamp(a,a,g);stamp(d,d,g);stamp(a,d,neg(g));stamp(d,a,neg(g));};
 const inj=(a,d,i)=>{rhs(a,neg(i));rhs(d,i);};
 const yFor=c=>c.type==='resistor'?z(1/c.value):c.type==='switch'?z(c.closed?1e6:1e-12):c.type==='capacitor'?mode==='ac'?z(0,2*Math.PI*frequency*c.value):mode==='transient'?z(c.value/dt):z():c.type==='inductor'&&mode==='ac'?z(0,-1/(2*Math.PI*frequency*c.value)):z();
 const offset=c=>c.type==='capacitor'&&mode==='transient'?z(-c.value/dt*(history[c.id]?.v||0)):z();
 // Every ideal source has a branch-current unknown. This also lets a dependent
 // source sense any component's signed current without inserting a fake resistor.
 function currentLaw(id){const c=cs.find(c=>c.id===id);if(!c)throw Error('Choose a valid controlling branch in Properties.');if(branches.includes(c))return {terms:[[branchIndex(c),z(1)]],constant:z()};const [a,d]=pins(c).map(top.node),g=yFor(c);return {terms:[[a,g],[d,neg(g)]],constant:offset(c)};}
 for(const c of cs){const [a,d]=pins(c).map(top.node),g=yFor(c);adm(a,d,g);inj(a,d,offset(c));if(!branches.includes(c))continue;
 const j=branchIndex(c),isCurrent=['current','vccs','cccs'].includes(c.type);stamp(a,j,z(1));stamp(d,j,z(-1));
 if(isCurrent)stamp(j,j,z(1));else{stamp(j,a,z(1));stamp(j,d,z(-1));}
 if(voltageControlled(c)){const p=top.node(terminal(circuit,c.controlPositive)),n=top.node(terminal(circuit,c.controlNegative));stamp(j,p,z(-c.value));stamp(j,n,z(c.value));}
 else if(currentControlled(c)){const law=currentLaw(c.control);for(const [col,k]of law.terms)stamp(j,col,mul(z(-c.value),k));rhs(j,mul(z(c.value),law.constant));}
 else if(c.type==='inductor'){if(mode==='transient'){stamp(j,j,z(-c.value/dt));rhs(j,z(-c.value/dt*(history[c.id]?.i||0)));}}
 else if(c.type==='current')rhs(j,z(mode==='ac'?0:c.value));
 else rhs(j,mode==='ac'?(c.type==='ac'?z(c.value):z()):c.type==='ac'?z(mode==='transient'?c.value*Math.sin(2*Math.PI*(c.frequency||50)*time):0):z(c.value));
 }
 const solution=gaussian(A,b),voltage=p=>{const i=top.node(p);return i<0?z():solution[i];},results={},next={};
 for(const c of cs){const pp=pins(c),v=add(voltage(pp[0]),neg(voltage(pp[1]))),i=branches.includes(c)?solution[branchIndex(c)]:add(mul(yFor(c),v),offset(c));results[c.id]={v,i,p:mul(v,z(i.re,-i.im))};next[c.id]={v:v.re,i:i.re};}
 return {results,history:next,voltage,topology:top};
}
export function transient(circuit,{duration=0.1,steps=300}={}){let history={},out=[];const dt=duration/steps;for(let k=1;k<=steps;k++){const t=k*dt,s=solve(circuit,{mode:'transient',dt,time:t,history});history=s.history;out.push({time:t,...s});}return out;}
