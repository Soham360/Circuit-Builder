import {pins,key,routeWire,topology} from './solver.js';

export function looseEnd(circuit,p){
 const k=key(p),ends=circuit.wires.filter(w=>[w.points[0],w.points.at(-1)].some(q=>key(q)===k));
 if(ends.length!==1||circuit.components.some(c=>pins(c).some(q=>key(q)===k)))return false;
 return !circuit.wires.some(w=>w!==ends[0]&&w.points.some((b,i)=>i&&onSegment(p,w.points[i-1],b)));
}
function onSegment(p,a,b){return Math.abs((p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x))<1e-6&&p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y);}
export function moveAttached(circuit,c,x,y){
 const before=pins(c),dx=x-c.x,dy=y-c.y;
 for(const old of before){const next={x:old.x+dx,y:old.y+dy},shared=circuit.components.some(other=>other!==c&&pins(other).some(p=>key(p)===key(old))),internal=circuit.wires.some(w=>w.points.some((p,i)=>i&&onSegment(old,w.points[i-1],p))&&key(w.points[0])!==key(old)&&key(w.points.at(-1))!==key(old));
 if(shared||internal){circuit.wires.push({points:routeWire(old,next),routing:'orthogonal'});continue;}
 for(const w of circuit.wires){if(key(w.points[0])===key(old)){const tail=w.points.slice(1);w.points=[...routeWire(next,tail[0],{mode:w.routing||'orthogonal',angle:w.angle}).slice(0,-1),...tail];}else if(key(w.points.at(-1))===key(old)){const head=w.points.slice(0,-1);w.points=[...head,...routeWire(head.at(-1),next,{mode:w.routing||'orthogonal',angle:w.angle}).slice(1)];}}
 if(circuit.junctionNames?.[key(old)]){circuit.junctionNames[key(next)]=circuit.junctionNames[key(old)];delete circuit.junctionNames[key(old)];}
 }
 c.x=x;c.y=y;
}
export function connectionIssues(circuit){
 const issues=[];if(!circuit.components.some(c=>c.type==='ground'))issues.push({message:'Add a ground reference.',point:circuit.components[0]||{x:0,y:0}});
 for(const c of circuit.components)for(const [i,p]of pins(c).entries()){
 const connected=circuit.components.some(other=>other!==c&&pins(other).some(q=>key(p)===key(q)))||circuit.wires.some(w=>w.points.some((b,j)=>j&&onSegment(p,w.points[j-1],b)));
 if(!connected)issues.push({message:`${c.id} terminal ${i?'B':'A'} is unconnected.`,point:p});
 }
 try{const t=topology(circuit);for(const c of circuit.components.filter(c=>['voltage','ac'].includes(c.type))){const [a,b]=pins(c);if(t.node(a)===t.node(b)&&c.value!==0)issues.push({message:c.id+' is shorted. Separate its terminals.',point:c});for(const d of circuit.components.filter(d=>d!==c&&d.type===c.type)){const [x,y]=pins(d),same=t.node(a)===t.node(x)&&t.node(b)===t.node(y),reverse=t.node(a)===t.node(y)&&t.node(b)===t.node(x);if((same&&c.value!==d.value)||(reverse&&c.value!==-d.value))issues.push({message:c.id+' conflicts with '+d.id+'. Check source connections and values.',point:c});}}}catch{}
 return issues;
}

export function mountUX(api){
 const $=s=>document.querySelector(s),svg=$('#canvas');
 const button=(text,action,parent=$('.head-actions'))=>{const b=document.createElement('button');b.className='button';b.textContent=text;b.onclick=action;parent.append(b);return b;};
 button('My circuits',()=>{
 const read=()=>JSON.parse(localStorage.getItem('circuit-builder-projects')||'[]');let projects;
 try{projects=read();}catch{api.toast('Saved circuits could not be read.',true);return;}
 api.modal('<h2>My circuits</h2><div id="projects"></div><button class="button" id="store-project">Save current as a new circuit</button>');
 const draw=()=>{const list=$('#projects');list.replaceChildren();projects.sort((a,b)=>b.updated-a.updated);for(const p of projects){const row=document.createElement('article');row.className='saved-project';const preview=document.createElementNS('http://www.w3.org/2000/svg','svg');preview.setAttribute('viewBox',api.bounds(p.circuit));preview.innerHTML=api.preview(p.circuit);row.append(preview);const name=document.createElement('input');name.value=p.title;name.setAttribute('aria-label','Circuit name');name.onchange=()=>{p.title=name.value.trim()||'Untitled circuit';save();};row.append(name);button('Open',()=>{api.load(p);p.updated=Date.now();save();$('#modal').close();},row);button('Duplicate',()=>{projects.push({...structuredClone(p),id:crypto.randomUUID(),title:p.title+' copy',updated:Date.now()});save();draw();},row);list.append(row);}};
 const save=()=>{try{localStorage.setItem('circuit-builder-projects',JSON.stringify(projects));}catch{api.toast('Storage is full. Export your circuit to keep a copy.',true);}};
 $('#store-project').onclick=()=>{projects.push({...api.snapshot(),id:crypto.randomUUID(),updated:Date.now()});save();draw();};draw();
 });
 button('Compare readings',()=>{
 const results=api.results();if(!results){api.toast('Run a simulation first.',true);return;}
 api.modal('<h2>Calculated and measured</h2><p>Enter readings in base units. Difference = 100 × |measured − calculated| / |calculated|. AC voltage and current use peak values. AC power uses average real power.</p><div id="comparison"></div>');
 const host=$('#comparison');for(const [id,r]of Object.entries(results))for(const [quantity,unit]of [['v','V'],['i','A'],['p','W']]){const expected=api.numeric(r[quantity],quantity),label=document.createElement('label');label.className='comparison-row';label.textContent=`${id} ${unit}: calculated ${api.fmt(expected,unit)} `;const input=document.createElement('input');input.type='number';input.step='any';input.placeholder='Measured '+unit;input.setAttribute('aria-label',id+' measured '+unit);const output=document.createElement('output');input.oninput=()=>{const n=Number(input.value);output.textContent=input.value===''?'':!Number.isFinite(n)?'Enter a finite reading':expected===0?'Absolute difference: '+api.fmt(Math.abs(n),unit):(100*Math.abs(n-expected)/Math.abs(expected)).toFixed(2)+'% difference';};label.append(input,output);host.append(label);}
 });
 svg.addEventListener('dblclick',e=>{if(!e.target.matches('.component-value'))return;const id=e.target.closest('[data-id]')?.dataset.id;if(id)api.edit(id);});
 svg.addEventListener('pointermove',e=>{
 if(e.buttons)return;svg.querySelectorAll('.net-hover').forEach(el=>el.classList.remove('net-hover'));
 const wire=e.target.closest('[data-wire]'),pin=e.target.closest('[data-pin]');if(!wire&&!pin)return;
 try{const c=api.circuit(),t=topology(c),p=wire?c.wires[Number(wire.dataset.wire)].points[0]:pins(c.components.find(c=>c.id===pin.closest('[data-id]').dataset.id))[Number(pin.dataset.pin)],node=t.node(p);
 svg.querySelectorAll('[data-wire]').forEach(el=>{if(t.node(c.wires[Number(el.dataset.wire)].points[0])===node)el.classList.add('net-hover');});
 svg.querySelectorAll('[data-id] [data-pin]').forEach(el=>{const part=c.components.find(c=>c.id===el.closest('[data-id]').dataset.id);if(t.node(pins(part)[Number(el.dataset.pin)])===node)el.classList.add('net-hover');});
 }catch{}
 });
 svg.addEventListener('pointerleave',()=>svg.querySelectorAll('.net-hover').forEach(el=>el.classList.remove('net-hover')));
 for(const [selector,name]of [['.palette','Components'],['.right-column','Controls']]){const panel=$(selector),handle=document.createElement('div');handle.className='panel-resizer';handle.tabIndex=0;handle.role='separator';handle.setAttribute('aria-label','Resize '+name);panel.append(handle);const set=x=>{panel.style.width=Math.max(190,Math.min(380,x))+'px';panel.style.minWidth=panel.style.width;document.body.style.setProperty(selector==='.palette'?'--palette-width':'--inspector-width',panel.style.width);};handle.onpointerdown=e=>{handle.setPointerCapture(e.pointerId);const start=e.clientX,width=panel.getBoundingClientRect().width;handle.onpointermove=e=>set(width+(selector==='.palette'?1:-1)*(e.clientX-start));};handle.onpointerup=handle.onpointercancel=()=>handle.onpointermove=null;handle.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();set(panel.clientWidth+(e.key==='ArrowRight'?20:-20));}};}
 button('Components',()=>document.body.classList.toggle('palette-collapsed'));button('Hide/show controls',()=>{if(document.body.dataset.view==='breadboard'||innerWidth<=850)document.body.classList.toggle('controls-open');else document.body.classList.toggle('inspector-collapsed');});
}
