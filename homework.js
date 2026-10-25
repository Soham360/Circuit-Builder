import {equivalentResistance} from './equivalent.js';
import {pins,topology,solve,terminal,dependentTypes,voltageControlled,currentControlled} from './solver.js';

// Deterministic DC modified nodal analysis. Algebra is supplied by the vendored
// Nerdamer engine; no network requests, prompts, or language model are involved.
export function homework(circuit,query,n){
 if(!n)throw Error('The local algebra engine did not load. Reload the page.');
 if(query.kind==='equivalent')return equivalentResistance(circuit,query,n);
 if(circuit.components.length>24)throw Error('Worked symbolic solutions support up to 24 components. Split this problem into smaller networks.');
 const top=topology(circuit),parts=circuit.components.filter(c=>c.type!=='ground');
 if(top.count>16)throw Error('Worked solutions support up to 16 non-ground nodes.');
 const unknowns=parts.filter(c=>c.unknown);if(unknowns.length>5)throw Error('Use at most five undefined component values in one symbolic problem.');
 const symbols=Object.fromEntries(unknowns.map((c,i)=>[c.id,'U'+(i+1)]));
 for(const c of parts){if(c.type==='ac')throw Error('Homework solutions currently use DC circuits. Replace AC sources with DC sources for a DC problem.');if(!c.unknown&&(!Number.isFinite(c.value)||(['resistor','capacitor','inductor'].includes(c.type)&&c.value<=0)))throw Error('Known component values must be finite; R, L, and C must be positive.');}
 let operations=0;const begun=Date.now();
 const calc=expr=>{if(++operations>6000||Date.now()-begun>12000)throw Error('This symbolic system is too large. Define more component values and try again.');if(expr.length>30000)throw Error('The symbolic expression is too large. Define more component values.');return n(expr).toString();};
 // Keep rational arithmetic as expanded polynomial numerator/denominator pairs.
 // This avoids nested reciprocal expressions during row reduction.
 const cache=new Map();
 const fraction=x=>{if(cache.has(x))return cache.get(x);const e=n(x),pair=[calc('expand('+e.numerator().toString()+')'),calc('expand('+e.denominator().toString()+')')];cache.set(x,pair);return pair;};
 const make=(p,q)=>{p=calc('expand('+p+')');q=calc('expand('+q+')');if(q==='0')throw Error('A zero denominator makes this circuit inconsistent.');if(p==='0')return '0';if(/[A-Za-z]/.test(p))p=calc('factor('+p+')');if(/[A-Za-z]/.test(q))q=calc('factor('+q+')');const result=calc('('+p+')/('+q+')');return /[A-Za-z]/.test(result)?calc('factor('+result+')'):result;};
 const simple=expr=>calc(expr);
 const add=(a,b)=>{if(a==='0')return b;if(b==='0')return a;const [p,q]=fraction(a),[r,s]=fraction(b);return make('('+p+')*('+s+')+('+r+')*('+q+')','('+q+')*('+s+')');};
 const neg=a=>a==='0'?'0':calc('-('+a+')');
 const mul=(a,b)=>{if(a==='0'||b==='0')return '0';if(a==='1')return b;if(b==='1')return a;const [p,q]=fraction(a),[r,s]=fraction(b);return make('('+p+')*('+r+')','('+q+')*('+s+')');};
 const div=(a,b)=>{if(a==='0')return '0';if(b==='1')return a;const [p,q]=fraction(a),[r,s]=fraction(b);return make('('+p+')*('+s+')','('+q+')*('+r+')');};

 const branches=parts.filter(c=>['voltage','current','inductor',...dependentTypes].includes(c.type));
 const vars=Array.from({length:top.count},(_,i)=>'N'+(i+1)).concat(branches.map((c,i)=>'J'+(i+1))),size=vars.length;
 if(!size)throw Error('Build a circuit with a source and at least one non-ground node.');
 const A=Array.from({length:size},()=>Array(size).fill('0')),b=Array(size).fill('0'),laws=[],nodeTerms=Array.from({length:top.count},()=>[]);
 const nodeName=i=>i<0?'0':vars[i];const value=c=>c.unknown?symbols[c.id]:String(c.value);
 const stamp=(r,c,x)=>{if(r>=0&&c>=0)A[r][c]=add(A[r][c],x);};const rhs=(r,x)=>{if(r>=0)b[r]=add(b[r],x);};
 const terms=(a,d,i)=>{if(a>=0)nodeTerms[a].push(i);if(d>=0)nodeTerms[d].push(`-(${i})`);};
 for(const c of parts){const [a,d]=pins(c).map(top.node),va=nodeName(a),vb=nodeName(d),v=value(c),drop=`(${va}-${vb})`;
 if(c.type==='resistor'||c.type==='switch'){const r=c.type==='switch'?(c.closed?'0.000001':'1000000000000'):v,g=div('1',r);stamp(a,a,g);stamp(d,d,g);stamp(a,d,neg(g));stamp(d,a,neg(g));terms(a,d,`${drop}/(${r})`);laws.push({id:c.id,law:`I(${c.id}) = ${drop} / (${r})`});}
 else if(c.type==='capacitor')laws.push({id:c.id,law:`I(${c.id}) = 0 (open circuit at DC)`});
 else{const index=branches.indexOf(c),j=top.count+index,J=vars[j],isCurrent=['current','vccs','cccs'].includes(c.type);stamp(a,j,'1');stamp(d,j,'-1');if(isCurrent)stamp(j,j,'1');else{stamp(j,a,'1');stamp(j,d,'-1');}terms(a,d,J);
 if(voltageControlled(c)){const cp=top.node(terminal(circuit,c.controlPositive)),cn=top.node(terminal(circuit,c.controlNegative));stamp(j,cp,neg(v));stamp(j,cn,v);laws.push({id:c.id,law:`${isCurrent?J:va+' - '+vb} = (${v})*(${nodeName(cp)}-${nodeName(cn)}); ${J} = I(${c.id})`});}
 else if(currentControlled(c)){const control=parts.find(p=>p.id===c.control);if(!control)throw Error('Choose a valid controlling branch in Properties.');if(branches.includes(control))stamp(j,top.count+branches.indexOf(control),neg(v));else if(control.type==='resistor'||control.type==='switch'){const [pa,pb]=pins(control).map(top.node),gain=div(v,control.type==='switch'?(control.closed?'0.000001':'1000000000000'):value(control));stamp(j,pa,neg(gain));stamp(j,pb,gain);}laws.push({id:c.id,law:`${isCurrent?J:va+' - '+vb} = (${v})*I(${control.id}); ${J} = I(${c.id})`});}
 else if(c.type==='current'){rhs(j,v);laws.push({id:c.id,law:`${J} = I(${c.id}) = ${v}`});}
 else{rhs(j,c.type==='inductor'?'0':v);laws.push({id:c.id,law:`${va} - ${vb} = ${c.type==='inductor'?'0':v}; ${J} = I(${c.id})`});}}}

 const reductions=[];
 for(let col=0;col<size;col++){let pivot=-1;for(let r=col;r<size;r++)if(A[r][col]!=='0'&&(pivot<0||A[r][col].length<A[pivot][col].length))pivot=r;
 if(pivot<0)throw Error('The circuit is underdetermined or inconsistent. Check floating terminals, unused wire islands, and ideal source loops.');
 [A[col],A[pivot]]=[A[pivot],A[col]];[b[col],b[pivot]]=[b[pivot],b[col]];
 reductions.push({variable:vars[col],pivot:A[col][col],equation:A[col].map((v,j)=>v==='0'?null:`(${v})*${vars[j]}`).filter(Boolean).join(' + ')+` = ${b[col]}`});
 for(let r=col+1;r<size;r++){if(A[r][col]==='0')continue;const f=div(A[r][col],A[col][col]);for(let j=col+1;j<size;j++)A[r][j]=simple(add(A[r][j],neg(mul(f,A[col][j]))));b[r]=simple(add(b[r],neg(mul(f,b[col]))));A[r][col]='0';}}
 const x=Array(size).fill('0');for(let r=size-1;r>=0;r--){let v=b[r];for(let j=r+1;j<size;j++)v=add(v,neg(mul(A[r][j],x[j])));x[r]=simple(div(v,A[r][r]));}
 const nodeExpression=id=>{if(id==='0'||id===-1)return '0';const i=Number(String(id).replace('N',''))-1;if(!Number.isInteger(i)||i<0||i>=top.count)throw Error('Choose a node from the circuit.');return x[i];};
 const componentExpression=(id,kind)=>{const c=parts.find(c=>c.id===id);if(!c)throw Error('Choose a component from the circuit.');const [a,d]=pins(c).map(top.node),v=simple(add(a<0?'0':x[a],neg(d<0?'0':x[d])));if(kind==='voltage')return v;if(kind==='unknown')return value(c);if(c.type==='resistor')return simple(div(v,value(c)));if(c.type==='capacitor')return '0';if(c.type==='switch')return simple(div(v,c.closed?'0.000001':'1000000000000'));return x[top.count+branches.indexOf(c)];};
 const expressionFor=q=>q.kind==='node'?nodeExpression(q.nodeA):q.kind==='difference'?simple(add(nodeExpression(q.nodeA),neg(nodeExpression(q.nodeB)))):componentExpression(q.component,q.kind);
 let expression=expressionFor(query),candidates=[],condition=null,conditional=false;
 const numeric=expr=>{try{if(n(expr).variables().length)return null;const v=Number(n(expr).evaluate().toDecimal(14));return Number.isFinite(v)?v:null;}catch{return null;}};
 const present=expr=>{const [p,q]=fraction(expr);return make(p,q);};
 if(query.kind==='unknown'){
 const c=parts.find(c=>c.id===query.component);if(!c?.unknown)throw Error('Mark the component value as unknown in Properties first.');if(['capacitor','inductor','switch'].includes(c.type))throw Error('A DC steady-state measurement cannot determine ideal capacitance, inductance, or a switch resistance. Use a resistor or independent source unknown.');
 if(!query.given||!Number.isFinite(query.given.value))throw Error('Add a known voltage or current measurement to determine this component.');
 const observed=present(expressionFor(query.given)),symbol=symbols[c.id];condition={expression:observed,value:query.given.value};const numerator=n(observed).numerator().expand().toString(),denominator=n(observed).denominator().expand().toString();condition.steps=[`${numerator} = (${query.given.value}) * (${denominator})`,`${calc(`expand((${numerator})-(${query.given.value})*(${denominator}))`)} = 0`];const residual=simple(`(${observed})-(${query.given.value})`);
 if(!n(residual).variables().includes(symbol))throw Error(residual==='0'?'This measurement is satisfied independently of the selected unknown. Add an independent measurement.':'This measurement does not determine the selected unknown, or conflicts with the other given values.');
 let roots;try{roots=n.solve(`${observed}=(${query.given.value})`,symbol).elements;}catch{throw Error('This constraint could not be isolated algebraically. Define more values or use a different measurement.');}
 for(const root of roots){const candidate=root.toString(),num=numeric(candidate);if(num!==null&&c.type==='resistor'&&num<=0)continue;let check;try{check=simple(n(residual,{[symbol]:candidate}).toString());}catch{continue;}let exact=check==='0';if(!exact){try{exact=n(check).numerator().expand().toString()==='0';}catch{}}const err=numeric(check);if(!exact&&(err===null||Math.abs(err)>1e-8*Math.max(1,Math.abs(query.given.value))))continue;
 if(num!==null&&unknowns.length===1){try{const cc=structuredClone(circuit),part=cc.components.find(p=>p.id===c.id);part.unknown=false;part.value=num;const solved=solve(cc);let actual;if(query.given.kind==='node'||query.given.kind==='difference'){const get=id=>id==='0'?0:solved.voltage([...top.points.values()].find(p=>top.node(p)===Number(id.slice(1))-1)).re;actual=get(query.given.nodeA)-(query.given.kind==='difference'?get(query.given.nodeB):0);}else actual=solved.results[query.given.component][query.given.kind==='current'?'i':'v'].re;if(Math.abs(actual-query.given.value)>1e-7*Math.max(1,Math.abs(query.given.value)))continue;}catch{continue;}}
 candidates.push({expression: simple(candidate),numeric:num});}
 if(!candidates.length)throw Error('No verified physical solution was found. The measurement may be inconsistent or require a non-positive resistance.');expression=candidates.map(c=>c.expression).join(' OR ');conditional=candidates.some(c=>c.numeric===null);
 }
 expression=query.kind==='unknown'?expression:present(expression);
 const nodes=Array.from({length:top.count},(_,i)=>({name:'N'+(i+1),expression:present(x[i]),numeric:numeric(x[i]),terminals:circuit.components.flatMap(c=>pins(c).map((p,j)=>top.node(p)===i?`${c.id}.${j?'B':'A'}`:null)).filter(Boolean)}));
 return {expression,numeric:query.kind==='unknown'?candidates.length===1?candidates[0].numeric:null:numeric(expression),candidates,conditional,condition,unknowns:unknowns.map(c=>({id:c.id,symbol:symbols[c.id],type:c.type})),knowns:parts.filter(c=>!c.unknown).map(c=>({id:c.id,type:c.type,value:c.value})),nodes,laws,kcl:nodeTerms.map((t,i)=>({node:'N'+(i+1),equation:(t.join(' + ')||'0')+' = 0'})),reductions,solutions:vars.map((v,i)=>({variable:v,expression:present(x[i]),numeric:numeric(x[i])})),target:query,substitution:query.kind==='node'?query.nodeA:query.kind==='difference'?`${query.nodeA} - ${query.nodeB}`:query.kind==='current'?`I(${query.component})`:query.kind==='unknown'?symbols[query.component]:parts.find(c=>c.id===query.component)?pins(parts.find(c=>c.id===query.component)).map(top.node).map(nodeName).join(' - '):'',elapsed:Date.now()-begun};
}
