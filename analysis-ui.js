import {mathHTML} from './math.js';
import {mountSolutionPager} from './pagination.js';

export function renderAnalysis(out,r,{fmt,esc}){

 const expr=s=>`<div class="math-line">${mathHTML(s)}</div>`,number=(x,u)=>esc(fmt(x,u));let title='',answer='',steps='';

 if(r.kind==='port'){

  title='Thévenin and Norton equivalents';answer=`Vth = ${number(r.vth,'V')} · Rth = ${number(r.rth,'Ω')}`;

  steps=`<li><h3>Detach the load and find the open-circuit voltage</h3><p>Removed load: ${esc(r.removedLoad||'none')}. Port A is the load’s terminal A, and B is terminal B.</p>${expr('Vth = V(A) - V(B) = '+r.vth)}</li><li><h3>Short the port and measure current A → B</h3><p>An ideal 0 V source measures the short-circuit current, with no small-resistance approximation.</p>${expr('In = Isc = '+r.isc)}</li><li><h3>Apply a 1 V test source</h3><p>Set independent voltage and current sources to zero. Keep dependent sources active (${esc(r.dependent.join(', ')||'none')}). Test current enters the network at A.</p>${expr('Itest = '+r.itest)}${expr('Rth = 1/Itest = '+r.rth)}<p>A negative resistance can occur in an active dependent-source network.</p></li><li><h3>Build either equivalent</h3><p>Thévenin: a source with + toward A and voltage ${number(r.vth,'V')}, in series with ${number(r.rth,'Ω')}. Norton: a source ${number(r.isc,'A')} directed B → A, in parallel with ${number(r.rth,'Ω')}.</p><svg viewBox="0 0 600 190" role="img" aria-label="Thevenin source in series with resistor and Norton source in parallel with resistor"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M40 150V100m0-40V25h90m60 0h65v125H40M330 150V100m0-40V25h200v125H330M450 25v35m0 45v45"/><circle cx="40" cy="80" r="20"/><rect x="130" y="15" width="60" height="20"/><circle cx="330" cy="80" r="20"/><rect x="440" y="60" width="20" height="45"/><path d="M330 94V66l-7 10m7-10 7 10"/></g><g fill="currentColor" font-size="14"><text x="31" y="77">+</text><text x="36" y="94">−</text><text x="138" y="53">Rth</text><text x="66" y="85">Vth</text><text x="365" y="85">In</text><text x="467" y="85">Rth</text><text x="263" y="28">A</text><text x="263" y="153">B</text><text x="540" y="28">A</text><text x="540" y="153">B</text></g></svg></li>${r.loadResistance?`<li><h3>Reconnect the load</h3>${expr('IL = Vth/(Rth + RL) = '+r.loadCurrent)}${expr('VL = IL*RL = '+r.loadVoltage)}<p>Load ${number(r.loadResistance,'Ω')}: ${number(r.loadVoltage,'V')}, ${number(r.loadCurrent,'A')} A → B.</p></li>`:''}`;

 }else if(r.kind==='loops'){

  title='Loop currents and conservation laws';answer=`${r.loops.length} independent loops · net power ${number(r.power,'W')}`;

  const sum=terms=>terms.map(e=>`${e.sign<0?'-':'+'} ${e.loop||'I('+e.id+')'}`).join(' ').replace(/^\+ /,'')||'0';

  steps=`<li><h3>Choose independent loop currents</h3><p>Each loop follows its listed signed A → B branches. A minus sign reverses the branch. These are fundamental loops; they may span several planar meshes.</p>${r.loops.map(l=>`<p>${esc(l.name)} = ${number(l.current,'A')}: ${esc(l.edges.map(e=>(e.sign<0?'−':' +')+e.id).join(' '))}</p>`).join('')}</li><li><h3>Express branch currents and component laws</h3>${r.rows.map(row=>expr(`I(${row.id}) = ${sum(row.terms)} = ${row.i}`)).join('')}<p>Use V = RI for resistors, fixed source constraints for independent sources, and the controlling current/voltage for dependent sources. A current source sets a branch-current constraint; its voltage remains unknown.</p></li><li><h3>KCL at each node</h3>${r.kcl.map(row=>expr(`${sum(row.terms)} = 0`)).join('')}</li><li><h3>KVL around every independent loop</h3>${r.loops.map(l=>expr(l.edges.map(e=>`${e.sign<0?'-':'+'} V(${e.id})`).join(' ').replace(/^\+ /,'')+' = 0')).join('')}<h3>Substitute the component laws</h3>${r.loopEquations.map(expr).join('')}${r.constraints.map(expr).join('')}<p>Solve this system for the loop currents and any current-source voltages V(source). The values above solve the full system. Summing adjacent equations eliminates shared current-source voltage and produces the usual supermesh equations.</p></li><li><h3>All branch results and power check</h3><table><thead><tr><th>Part</th><th>V(A) − V(B)</th><th>I(A → B)</th><th>Absorbed power</th></tr></thead><tbody>${r.rows.map(row=>`<tr><td>${esc(row.id)}</td><td>${number(row.v,'V')}</td><td>${number(row.i,'A')}</td><td>${number(row.p,'W')}</td></tr>`).join('')}</tbody></table><p>Positive power is absorbed; negative power is delivered. Sum = ${number(r.power,'W')}.</p></li>`;

 }else if(r.kind==='transform'){

  title=`${r.from} → ${r.to}`;answer=number(r.value,r.unit);steps=`<li><h3>Identify the source and resistor</h3><p>${esc(r.source)} with ${esc(r.resistor)}, R = ${number(r.resistance,'Ω')}.</p></li><li><h3>Transform the source</h3><p>${esc(r.explanation)}</p>${expr((r.unit==='V'?'Veq':'Ieq')+' = '+r.value)}<p>The equivalent keeps R = ${number(r.resistance,'Ω')}. Edit those parts in the workspace to continue transforming the network. Internal currents and voltages need not be preserved.</p></li>`;

 }else if(r.kind==='constraints'){

  title='Solve simultaneous measurements';answer=r.values.map(v=>esc(v.id)+' = '+number(v.value,({resistor:'Ω',voltage:'V',current:'A',ccvs:'Ω',cccs:'A/A',vcvs:'V/V',vccs:'S'})[v.type]||'')).join(' · ');steps=`<li><h3>Form the measurement equations</h3><p>${r.values.map(v=>esc(v.symbol)+' = '+esc(v.id)).join(' · ')}</p>${r.equations.map(e=>expr(e+' = 0')).join('')}</li><li><h3>Isolate and verify the unknowns</h3>${r.values.map(v=>expr(`${v.id} = ${v.symbol} = ${v.value}`)).join('')}<p>Values are in each component’s base unit. Every supplied measurement was checked by substitution, and the complete numerical circuit was solved again.</p></li>`;

 }else if(r.kind==='waveform'){

  title='Power and delivered energy';answer=number(r.power,'W');steps=`<li><h3>Multiply signed voltage and current</h3><p>p(t) = sign × v(t) × i(t), in watts. Positive means absorbed. Evaluation time: ${number(r.time??0.001,'s')}.</p>${expr('p = '+r.power)}</li><li><h3>Integrate each exponential term</h3><p>Energy = ∫ p(t) dt. For rate k > 0, each term contributes A (exp(−k start) − exp(−k end))/k. Constant terms contribute A (end − start).</p><p>${r.diverges?'The improper integral does not converge.':'Energy delivered to the element from '+number(r.start,'s')+' to '+(r.end===Infinity?'∞':number(r.end,'s'))+': '+number(r.energy,'J')}</p></li>`;

 }else if(r.kind==='balance'){

  title='Power balance';answer=r.balanced?'Power is conserved':'Power table is inconsistent';steps=`<li><h3>Apply the reference sign to every element</h3>${r.powers.map(p=>expr(`${p.id||'element'}: P = (${p.sign})*(${p.voltage})*(${p.current}) = ${p.power}`)).join('')}</li><li><h3>Sum absorbed and delivered power</h3>${expr('sum(P) = '+r.net)}<p>Positive values are absorbed; negative values are delivered.</p></li>`;

 }

 out.innerHTML=`<div class="worked-heading"><h2>${esc(title)}</h2></div><div class="answer-card"><h3>${answer}</h3></div><ol class="worked-steps">${steps}</ol>`;mountSolutionPager(out);

}
