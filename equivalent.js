import {topology,pins,nodeLabels} from './solver.js';

// Resistance of the passive resistor network between two named electrical nodes.
export function equivalentResistance(circuit,query,n){
 const top=topology(circuit),labels=nodeLabels(circuit,top),parse=id=>id==='0'?-1:Number(String(id).slice(1))-1;
 const a=parse(query.nodeA),b=parse(query.nodeB),valid=i=>Number.isInteger(i)&&i>=-1&&i<top.count;
 if(!valid(a)||!valid(b))throw Error('Choose both terminals of the resistor network.');
 if(circuit.components.some(c=>!['resistor','ground','voltage','current'].includes(c.type)))throw Error('Equivalent resistance currently supports resistors and independent DC sources. Remove reactive or controlled devices first.');
 const parts=circuit.components.filter(c=>c.type==='resistor');if(parts.length>60)throw Error('Use at most 60 resistors for a worked resistance calculation.');
 const unknowns=parts.filter(c=>c.unknown).map((c,i)=>({id:c.id,symbol:'U'+(i+1),type:'resistor'})),symbols=Object.fromEntries(unknowns.map(u=>[u.id,u.symbol]));
 const calc=s=>n(s).toString(),numeric=s=>{try{if(n(s).variables().length)return null;const x=Number(n(s).evaluate().toDecimal(14));return Number.isFinite(x)?x:null;}catch{return null;}};
 let edges=parts.map(c=>{if(!c.unknown&&(!Number.isFinite(c.value)||c.value<=0))throw Error('Known resistances must be positive.');const [a,b]=pins(c).map(top.node);return {id:c.id,a,b,value:c.unknown?symbols[c.id]:String(c.value),members:[c.id]};}).filter(e=>e.a!==e.b);
 const name=i=>i<0?'0':'N'+(i+1),steps=[],kcl=[];let serial=0;
 const reachable=new Set([a]);let changed=true;while(changed){changed=false;for(const e of edges)if(reachable.has(e.a)||reachable.has(e.b)){for(const v of [e.a,e.b])if(!reachable.has(v)){reachable.add(v);changed=true;}}}
 const base={kind:'equivalent',target:query,labels,unknowns,steps,kcl,portA:name(a),portB:name(b),sourceIds:circuit.components.filter(c=>['voltage','current'].includes(c.type)).map(c=>c.id)};
 if(a===b)return {...base,expression:'0',numeric:0};
 if(!reachable.has(b))return {...base,expression:'open',numeric:null,open:true};
 edges=edges.filter(e=>reachable.has(e.a));
 // Remove dangling branches: KCL forces their current to zero.
 let again=true;while(again){again=false;const nodes=[...new Set(edges.flatMap(e=>[e.a,e.b]))];for(const v of nodes){if(v===a||v===b)continue;const incident=edges.filter(e=>e.a===v||e.b===v);if(incident.length===1){const edge=incident[0];steps.push({type:'dangling',inputs:[edge],output:null});edges=edges.filter(e=>e!==edge);again=true;break;}}}
 const replace=(type,inputs,aa,bb,value)=>{const output={id:'Req'+(++serial),a:aa,b:bb,value:calc(value),members:inputs.flatMap(e=>e.members)};steps.push({type,inputs:structuredClone(inputs),output});edges=edges.filter(e=>!inputs.includes(e));edges.push(output);};
 for(let limit=0;limit<120;limit++){
 let reduced=false;for(const e of edges){const group=edges.filter(q=>q.a===e.a&&q.b===e.b||q.a===e.b&&q.b===e.a);if(group.length>1){replace('parallel',group,e.a,e.b,'1/('+group.map(q=>'1/('+q.value+')').join('+')+')');reduced=true;break;}}
 if(reduced)continue;
 const nodes=[...new Set(edges.flatMap(e=>[e.a,e.b]))];for(const v of nodes){if(v===a||v===b)continue;const pair=edges.filter(e=>e.a===v||e.b===v);if(pair.length===2){const aa=pair[0].a===v?pair[0].b:pair[0].a,bb=pair[1].a===v?pair[1].b:pair[1].a;if(aa===bb)continue;replace('series',pair,aa,bb,pair.map(e=>'('+e.value+')').join('+'));reduced=true;break;}}
 if(!reduced)break;
 }
 if(edges.length===1)return {...base,expression:edges[0].value,numeric:numeric(edges[0].value)};
 // Bridges cannot always be reduced by series/parallel. Apply a 1 V test source.
 const interior=[...new Set(edges.flatMap(e=>[e.a,e.b]))].filter(v=>v!==a&&v!==b),size=interior.length;
 const A=Array.from({length:size},()=>Array(size).fill('0')),rhs=Array(size).fill('0'),add=(x,y)=>calc('('+x+')+('+y+')');
 const voltage=v=>v===a?'1':v===b?'0':name(v);
 for(const [i,v] of interior.entries()){const incident=edges.filter(e=>e.a===v||e.b===v);kcl.push({node:name(v),equation:incident.map(e=>'('+voltage(v)+'-'+voltage(e.a===v?e.b:e.a)+')/('+e.value+')').join(' + ')+' = 0'});for(const e of incident){const other=e.a===v?e.b:e.a,g=calc('1/('+e.value+')');A[i][i]=add(A[i][i],g);if(other===a)rhs[i]=add(rhs[i],g);else if(other!==b){const j=interior.indexOf(other);A[i][j]=add(A[i][j],'-('+g+')');}}}
 for(let i=0;i<size;i++){let pivot=i;while(pivot<size&&A[pivot][i]==='0')pivot++;if(pivot===size)throw Error('The resistance equations are singular. Check the connections.');[A[i],A[pivot]]=[A[pivot],A[i]];[rhs[i],rhs[pivot]]=[rhs[pivot],rhs[i]];for(let j=i+1;j<size;j++){if(A[j][i]==='0')continue;const factor=calc('('+A[j][i]+')/('+A[i][i]+')');for(let k=i;k<size;k++)A[j][k]=add(A[j][k],'-('+factor+')*('+A[i][k]+')');rhs[j]=add(rhs[j],'-('+factor+')*('+rhs[i]+')');}}
 const x=Array(size);for(let i=size-1;i>=0;i--){let r=rhs[i];for(let j=i+1;j<size;j++)r=add(r,'-('+A[i][j]+')*('+x[j]+')');x[i]=calc('('+r+')/('+A[i][i]+')');}
 const potential=v=>v===a?'1':v===b?'0':x[interior.indexOf(v)],terms=edges.filter(e=>e.a===a||e.b===a).map(e=>'(1-('+potential(e.a===a?e.b:e.a)+'))/('+e.value+')'),current=calc(terms.join('+')),expression=calc('1/('+current+')');
 return {...base,expression,numeric:numeric(expression),testCurrent:current,solutions:interior.map((v,i)=>({variable:name(v),expression:x[i]})),remaining:edges};
}
