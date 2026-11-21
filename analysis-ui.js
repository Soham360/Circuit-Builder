import {mathHTML} from './math.js';
import {mountSolutionPager} from './pagination.js';

export function renderAnalysis(out,r,{fmt,esc}){

 const expr=s=>`<div class="math-line">${mathHTML(s)}</div>`,number=(x,u)=>esc(fmt(x,u));let title='',answer='',steps='',diagrams='';

 if(r.kind==='port'){

  title='Thévenin and Norton equivalents';
  answer=`Vth = ${number(r.vth,'V')} · Rth = ${number(r.rth,'Ω')}${r.isc===null?'':` · In = ${number(r.isc,'A')}`}`;
  const diagram=(title,contents)=>`<figure class="solution-circuit"><svg viewBox="0 0 300 174" role="img" aria-label="${title} equivalent circuit">${contents}</svg><figcaption>${title}</figcaption></figure>`;
  const terminals=`<g fill="white" stroke="currentColor"><circle cx="248" cy="31" r="4"/><circle cx="248" cy="145" r="4"/></g><text x="261" y="35">A</text><text x="261" y="149">B</text>`;
  const circuit=(drawing,labels)=>`<g fill="none" stroke="currentColor" stroke-width="2">${drawing}</g><g fill="currentColor" font-size="13">${terminals}${labels}</g>`;
  const forward=r.isc>=0;
  diagrams=diagram('Thévenin',circuit(
   `<path d="M248 31H${r.rth===0?40:157}${r.rth===0?'':'M99 31H40'}V66M40 110V145H248"/><circle cx="40" cy="88" r="22"/>${r.rth===0?'':'<rect x="99" y="21" width="58" height="20"/>'}`,
   `<text x="35" y="83">+</text><text x="35" y="102">−</text><text x="70" y="93">Vth = ${number(r.vth,'V')}</text>${r.rth===0?'':`<text x="128" y="16" text-anchor="middle">Rth = ${number(r.rth,'Ω')}</text>`}`));
  if(r.isc!==null)diagrams+=diagram('Norton',circuit(
   `<path d="M248 31H40V66M40 110V145H248M162 31V64M162 112V145M40 ${forward?102:74}V${forward?74:102}m-6 ${forward?8:-8}l6 ${forward?-8:8} 6 ${forward?8:-8}"/><circle cx="40" cy="88" r="22"/><rect x="152" y="64" width="20" height="48"/>`,
   `<text x="68" y="92">In = ${number(Math.abs(r.isc),'A')}</text><text x="179" y="92">Rth</text><text x="179" y="108">${number(r.rth,'Ω')}</text>`));
  else diagrams+='<p>This port behaves as an ideal voltage source (0 Ω). A finite Norton current source is unavailable.</p>';
  steps=`<li><h3>Find the open-circuit voltage</h3><p>${r.removedLoad?`Remove ${esc(r.removedLoad)} and use its terminals A and B.`:'Use the selected nodes as terminals A and B.'}${r.linearOpamps?' This equivalent assumes the op-amps stay in their linear range.':''}</p>${expr('Vth = V(A) - V(B) = '+r.vth)}</li><li><h3>Find the port resistance</h3><p>Short independent voltage sources and open independent current sources. Keep dependent sources active (${esc(r.dependent.join(', ')||'none')}). Test current enters the network at A.</p>${r.currentTest?'<p>Inject 1 A at terminal A and measure the resulting port voltage.</p>'+expr('Rth = Vtest / 1 = '+r.rth):'<p>Apply a 1 V test source across A and B.</p>'+expr('Itest = '+r.itest)+expr('Rth = 1/Itest = '+r.rth)}</li><li><h3>Find the Norton current</h3>${r.isc===null?'<p>A zero-resistance voltage source has no finite Norton current.</p>':expr('In = Vth / Rth = '+r.isc)+'<p>Positive short-circuit current flows A → B through the external short. The Norton source points B → A for a positive value.</p>'}</li>${r.loadResistance?`<li><h3>Reconnect the load</h3>${expr('IL = Vth/(Rth + RL) = '+r.loadCurrent)}${expr('VL = IL*RL = '+r.loadVoltage)}</li>`:''}`;

 }else if(r.kind==='loops'){

  title='Loop currents and conservation laws';answer=`${r.loops.length} independent loops · net power ${number(r.power,'W')}`;

  const sum=terms=>terms.map(e=>`${e.sign<0?'-':'+'} ${e.loop||'I('+e.id+')'}`).join(' ').replace(/^\+ /,'')||'0';

  steps=`<li><h3>Choose independent loop currents</h3><p>Each loop follows its listed signed A → B branches. A minus sign reverses the branch. These are fundamental loops; they may span several planar meshes.</p>${r.opamps?.length?'<p>Each op-amp is modeled as a voltage branch from its output to ground, with zero current at both inputs.</p>':''}${r.loops.map(l=>`<p>${esc(l.name)} = ${number(l.current,'A')}: ${esc(l.edges.map(e=>(e.sign<0?'−':' +')+e.id).join(' '))}</p>`).join('')}</li><li><h3>Express branch currents and component laws</h3>${r.rows.map(row=>expr(`I(${row.id}) = ${sum(row.terms)} = ${row.i}`)).join('')}<p>Use V = RI for resistors, fixed source constraints for independent sources, and the controlling current/voltage for dependent sources. A current source sets a branch-current constraint; its voltage remains unknown.</p></li><li><h3>KCL at each node</h3>${r.kcl.map(row=>expr(`${sum(row.terms)} = 0`)).join('')}</li><li><h3>KVL around every independent loop</h3>${r.loops.map(l=>expr(l.edges.map(e=>`${e.sign<0?'-':'+'} V(${e.id})`).join(' ').replace(/^\+ /,'')+' = 0')).join('')}<h3>Substitute the component laws</h3>${r.loopEquations.map(expr).join('')}${r.constraints.map(expr).join('')}<p>Solve this system for the loop currents and any current-source voltages V(source). The values above solve the full system. Summing adjacent equations eliminates shared current-source voltage and produces the usual supermesh equations.</p></li><li><h3>All branch results and power check</h3><table><thead><tr><th>Part</th><th>V(A) − V(B)</th><th>I(A → B)</th><th>Absorbed power</th></tr></thead><tbody>${r.rows.map(row=>`<tr><td>${esc(row.id)}</td><td>${number(row.v,'V')}</td><td>${number(row.i,'A')}</td><td>${number(row.p,'W')}</td></tr>`).join('')}</tbody></table><p>Positive power is absorbed; negative power is delivered. Sum = ${number(r.power,'W')}.</p></li>`;

 }else if(r.kind==='transform'){

  title=`${r.from} → ${r.to}`;answer=number(r.value,r.unit);steps=`<li><h3>Identify the source and resistor</h3><p>${esc(r.source)} with ${esc(r.resistor)}, R = ${number(r.resistance,'Ω')}.</p></li><li><h3>Transform the source</h3><p>${esc(r.explanation)}</p>${expr((r.unit==='V'?'Veq':'Ieq')+' = '+r.value)}<p>The equivalent keeps R = ${number(r.resistance,'Ω')}. Edit those parts in the workspace to continue transforming the network. Internal currents and voltages need not be preserved.</p></li>`;

 }else if(r.kind==='constraints'){

  title='Solve simultaneous measurements';answer=r.values.map(v=>esc(v.id)+' = '+number(v.value,({resistor:'Ω',voltage:'V',current:'A',ccvs:'Ω',cccs:'A/A',vcvs:'V/V',vccs:'S'})[v.type]||'')).join(' · ');steps=`<li><h3>Form the measurement equations</h3><p>${r.values.map(v=>esc(v.symbol)+' = '+esc(v.id)).join(' · ')}</p>${r.equations.map(e=>expr(e+' = 0')).join('')}</li><li><h3>Isolate and verify the unknowns</h3>${r.values.map(v=>expr(`${v.id} = ${v.symbol} = ${v.value}`)).join('')}<p>Values are in each component’s base unit. Every supplied measurement was checked by substitution, and the complete numerical circuit was solved again.</p></li>`;

 }else if(r.kind==='waveform'){

  title='Power and delivered energy';answer=number(r.power,'W');steps=`<li><h3>Multiply signed voltage and current</h3><p>p(t) = sign × v(t) × i(t), in watts. Positive means absorbed. Evaluation time: ${number(r.time??0.001,'s')}.</p>${expr('p = '+r.power)}</li><li><h3>Integrate each exponential term</h3><p>Energy = ∫ p(t) dt. For rate k > 0, each term contributes A (exp(−k start) − exp(−k end))/k. Constant terms contribute A (end − start).</p><p>${r.diverges?'The improper integral does not converge.':'Energy delivered to the element from '+number(r.start,'s')+' to '+(r.end===Infinity?'∞':number(r.end,'s'))+': '+number(r.energy,'J')}</p></li>`;

 }else if(r.kind==='balance'){

  title='Power balance';answer=r.balanced?'Power is conserved':'Power table is inconsistent';steps=`<li><h3>Apply the reference sign to every element</h3>${r.powers.map(p=>expr(`${p.id||'element'}: P = (${p.sign})*(${p.voltage})*(${p.current}) = ${p.power}`)).join('')}</li><li><h3>Sum absorbed and delivered power</h3>${expr('sum(P) = '+r.net)}<p>Positive values are absorbed; negative values are delivered.</p></li>`;

 }

 out.innerHTML=`<div class="worked-heading"><h2>${esc(title)}</h2></div><div class="answer-card"><h3>${answer}</h3>${diagrams?`<div class="port-diagrams">${diagrams}</div>`:''}</div><ol class="worked-steps">${steps}</ol>`;mountSolutionPager(out);

}
