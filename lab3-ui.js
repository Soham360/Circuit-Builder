import {lab3Circuits,resistorPairs,summingPairs} from './lab3-circuits.js';
import {dcReading,percentError,inputResistance,outputResistance,summingDesign,summingRange} from './lab3-analysis.js';

const cases=Object.fromEntries(lab3Circuits.map(t=>[t.id,t.data]));
const simulate=id=>dcReading(cases[id]);
const number=(id,label,value='')=>`<label>${label}<input id="l3-${id}" type="number" step="any" value="${value}"></label>`;
const open=(id,label='Open circuit')=>`<button class="button" type="button" data-l3-open="lab3-${id}">${label}</button>`;
const field=(id,label)=>`<input id="l3-${id}" aria-label="${label}" type="number" step="any">`;
const header=labels=>'<thead><tr>'+labels.map(label=>`<th scope="col">${label}</th>`).join('')+'</tr></thead>';
const reading=value=>Number(value.toFixed(5));
const percent=(expected,actual)=>percentError(expected,actual)?.toFixed(2)??'—';

function plot({slope,lower,upper}){
 const halfX=Math.max(12,Math.abs(lower),Math.abs(upper))/Math.max(1,Math.abs(slope));
 const halfY=Math.max(Math.abs(lower),Math.abs(upper))+Math.abs(slope)*halfX;
 const x=v=>82+420*(1+v/halfX)/2,y=v=>26+238*(1-v/halfY)/2;
 const segment=(intercept)=>`${x(-halfX)},${y(intercept-slope*halfX)} ${x(halfX)},${y(intercept+slope*halfX)}`;
 const lowerSegment=segment(lower),upperSegment=segment(upper);
 const ticks=[-1,-0.5,0,0.5,1];
 return `<svg class="lab3-plot" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 530 316" role="img" aria-label="Linear summing amplifier range. Line slope ${reading(slope)}. Intercepts ${reading(lower)} and ${reading(upper)} volts.">
 <rect width="530" height="316" fill="#fff"/><polygon points="${upperSegment} ${lowerSegment.split(' ').reverse().join(' ')}" fill="#dbeee2"/>
 <path d="M82 ${y(0)}H502 M${x(0)} 26V264" fill="none" stroke="#697872"/>
 <polyline points="${lowerSegment}" fill="none" stroke="#16603d" stroke-width="2"/><polyline points="${upperSegment}" fill="none" stroke="#16603d" stroke-width="2"/>
 <g fill="#233930" font-family="sans-serif" font-size="12">
 ${ticks.map(t=>`<text x="${x(t*halfX)}" y="282" text-anchor="middle">${reading(t*halfX)}</text><text x="74" y="${y(t*halfY)+4}" text-anchor="end">${reading(t*halfY)}</text>`).join('')}
 <text x="292" y="305" text-anchor="middle">va (V)</text><text x="19" y="145" text-anchor="middle" transform="rotate(-90 19 145)">vb (V)</text>
 </g><rect x="82" y="26" width="420" height="238" fill="none" stroke="#697872"/></svg>`;
}

export function initLab3({loadTemplate,getCircuit,applyDesign,fmt}){
 const panel=document.createElement('div');
 panel.id='lab3-tools';
 panel.className='panel lab-tools lab3-tools';
 const gainRows=(kind)=>resistorPairs.map(([rs,rf],i)=>{
  const n=i+1,id=kind+'-'+n,sim=simulate('lab3-'+id);
  const expected=(kind==='inv'?-rf/rs:1+rf/rs);
  return `<tr><th scope="row">${n}</th><td>${rs/1000}</td><td>${rf/1000}</td><td>${reading(expected)}</td><td>${reading(sim.output)}${sim.saturation==='linear'?'':' (clipped)'}</td><td>${reading(sim.output/sim.source)}</td><td>${percent(expected,sim.output/sim.source)}</td>
   <td>${field(id+'-vs','Row '+n+' measured Vs (V)')}</td><td>${field(id+'-vo','Row '+n+' measured Vo (V)')}</td><td id="l3-${id}-gain">—</td><td id="l3-${id}-error">—</td><td>${open(id,'Open')}</td></tr>`;
 }).join('');
 const gainTable=kind=>`<div class="lab-table-wrap"><table>${header(['Row','Rs (kΩ)','Rf (kΩ)','Ideal gain','Sim. Vo (V)','Sim. gain','Sim. error (%)','Measured Vs (V)','Measured Vo (V)','Measured gain','Error (%)','Circuit'])}<tbody>${gainRows(kind)}</tbody></table></div>`;
 const base=simulate('lab3-inv-1'),out=simulate('lab3-output'),series=simulate('lab3-input');
 panel.innerHTML=`<header class="lab-page-heading"><h1>EE 215 · Lab 3</h1><p>Amplifier gain, resistance and summing range</p></header>
 <div class="lab-tools-body">
 <label for="l3-procedure">Procedure</label>
 <select id="l3-procedure"><option value="1">1 · Inverting amplifier</option><option value="2">2 · Non-inverting amplifier</option><option value="3">3 · Summing amplifier</option></select>
 <button class="button" id="l3-download">Download current gain or summing table (CSV)</button>
 <p>Preset simulations use ±9 V supplies and ideal ±9 V output limits. Use the measured fields for your physical readings. They save on this device.</p>
 <section data-l3-procedure="1">
 <h3>1a · Inverting gain</h3><p>Figure P1-1 uses a 1.5 V input source and a 1 MΩ resistor from pin 3 to ground. The breadboard shows both 9 V supplies connected to pins 4 and 7 with a common ground.</p><p>Negative feedback holds pin 2 near ground while the output is linear. The current through Rs also flows through Rf, so the gain is −Rf/Rs.</p>
 ${gainTable('inv')}
 <fieldset><legend>1b · Output Thévenin resistance</legend>
 <p>${open('inv-1','Open circuit with no load')} ${open('output','Open circuit with 1 kΩ load')}</p>
 <p>Simulated open output is ${fmt(base.output,'V')} and loaded output is ${fmt(out.output,'V')}. The model has zero series output resistance. Use your meter readings and accuracy to estimate a physical upper bound.</p>
 <p>Measure pin 6 relative to ground twice, with the feedback resistor connected in both runs. Use a load of at least 1 kΩ. The load draws current so any internal resistance shows up as a voltage drop.</p>
 <div class="lab3-fields">${number('voc','Open-circuit voltage (V)')}${number('vl','Loaded voltage (V)')}${number('load','Load (Ω)',1000)}${number('oc-error','Open reading uncertainty (V)',0)}${number('load-error','Loaded reading uncertainty (V)',0)}${number('battery','Lab 2 AA resistance (Ω)')}</div>
 <output id="l3-out-result" aria-live="polite"></output>
 </fieldset>
 <fieldset><legend>1c · Input Thévenin resistance</legend>
 <p>${open('inv-1','Open circuit without series resistor')} ${open('input','Open circuit with 1 kΩ in series')}</p>
 <p>Model readings across the amplifier input are ${fmt(base.input,'V')} at ${fmt(base.current,'A')} and ${fmt(series.input,'V')} at ${fmt(series.current,'A')}. The series-case voltage is taken after the added 1 kΩ resistor.</p>
 <p>Use ΔV/ΔI to find the resistance seen at the amplifier terminals. The ideal value is 4.7 kΩ because Rs leads to the virtual ground at pin 2.</p>
 <div class="lab3-fields">${number('vin-open','Input voltage without series resistor (V)')}${number('iin-open','Input current without series resistor (mA)')}${number('vin-series','Input voltage with series resistor (V)')}${number('iin-series','Input current with series resistor (mA)')}</div>
 <output id="l3-in-result" aria-live="polite"></output>
 </fieldset>
 </section>
 <section data-l3-procedure="2" hidden>
 <h3>2 · Non-inverting gain</h3>
 <p>Rf and Rs divide the output until pin 2 matches the source at pin 3. The gain is 1 + Rf/Rs in the linear region. Row 4 asks for 9.7 V, which exceeds the supply, so the modeled output clips at 9 V.</p>
 ${gainTable('non')}
 </section>
 <section data-l3-procedure="3" hidden>
 <fieldset><legend>3a · Design the summing amplifier</legend>
 <p>Each input drives current into the virtual ground through its own resistor. Rf converts the sum of those currents to the output voltage. Match the two coefficient magnitudes using Ra = Rf/|a| and Rb = Rf/|b|.</p>
 <div class="lab3-fields">${number('rf','Rf (Ω)',10000)}${number('weight-a','Magnitude of Va coefficient',0.25)}${number('weight-b','Magnitude of Vb coefficient',0.4)}</div>
 <output id="l3-design" aria-live="polite"></output>
 <button class="button" id="l3-apply-design">Apply design to current summing circuit</button>
 <p id="l3-design-status" aria-live="polite"></p>
 <p>With suitable kit stock, 20 kΩ + 20 kΩ gives 40 kΩ. A 20 kΩ resistor in series with a parallel pair of 10 kΩ resistors gives 25 kΩ. For other designs, edit Ra, Rb and Rf in the workspace.</p>
 </fieldset>
 <h3>3b · Test the five input pairs</h3>
 <div class="lab-table-wrap"><table>${header(['Row','Va (V)','Vb (V)','Sim. Vo (V)','Measured Va (V)','Measured Vb (V)','Calculated Vo (V)','Measured Vo (V)','Error (%)','Circuit'])}<tbody>
 ${summingPairs.map(([a,b],i)=>{
  const n=i+1,id='sum-'+n;
  return `<tr><th scope="row">${n}</th><td>${a}</td><td>${b}</td><td>${reading(simulate('lab3-'+id).output)}</td><td>${field(id+'-va','Row '+n+' measured Va (V)')}</td><td>${field(id+'-vb','Row '+n+' measured Vb (V)')}</td><td id="l3-${id}-calc">—</td><td>${field(id+'-vo','Row '+n+' measured Vo (V)')}</td><td id="l3-${id}-error">—</td><td>${open(id,'Open')}</td></tr>`;
 }).join('')}</tbody></table></div>
 <h3>3c · Breadboard demonstration</h3>
 <p>Pin 2 is the summing junction, pin 3 is common ground, and pin 6 is the output. Use two 9 V batteries with the upper battery negative and lower battery positive joined at ground. Pin 7 goes to +9 V and pin 4 to −9 V. When a preset uses ±9 V as an input, the breadboard view and build sheet share its 9 V battery with the corresponding supply pin. Ground the AA negative terminal for +1.5 V or its positive terminal for −1.5 V.</p>
 <h3>3d · Linear input range</h3>
 <p>The shaded region contains input pairs that keep the requested output between the configured output limits. The upper line reaches the negative limit and the lower line reaches the positive limit.</p>
 <button class="button" id="l3-plot-current">Plot current summing circuit</button>
 <button class="button" id="l3-plot-download">Download plot (SVG)</button>
 <p id="l3-plot-message" aria-live="polite"></p><div id="l3-plot"></div>
 </section></div>`;
 document.querySelector('#lab3').append(panel);
 const $=id=>panel.querySelector('#l3-'+id);
 const inputs=[...panel.querySelectorAll('input')];
 const savedKey='circuit-builder-lab3-readings';
 try{
  const saved=JSON.parse(localStorage.getItem(savedKey)||'{}');
  for(const input of inputs)if(typeof saved[input.id]==='string')input.value=saved[input.id];
 }catch{}
 const read=id=>{const el=$(id);return Number.isFinite(el.valueAsNumber)?el.valueAsNumber:null;};
 const ready=values=>values.every(v=>v!==null);
 const set=(id,value)=>$(id).textContent=value??'—';
 const calculate=(id,ids,fn)=>{
  const values=ids.map(read);
  if(!ready(values)){set(id,'');return;}
  try{set(id,fn(...values));}catch(error){set(id,error.message);}
 };
 function update(){
  for(const kind of ['inv','non'])resistorPairs.forEach(([rs,rf],i)=>{
   const id=kind+'-'+(i+1),vs=read(id+'-vs'),vo=read(id+'-vo');
   const gain=ready([vs,vo])&&vs!==0?vo/vs:null;
   set(id+'-gain',gain===null?null:reading(gain));
   set(id+'-error',gain===null?null:percent(kind==='inv'?-rf/rs:1+rf/rs,gain));
  });
  summingPairs.forEach((_,i)=>{
   const id='sum-'+(i+1),va=read(id+'-va'),vb=read(id+'-vb'),vo=read(id+'-vo');
   const expected=ready([va,vb])?-0.25*va-0.4*vb:null;
   set(id+'-calc',expected===null?null:reading(expected));
   set(id+'-error',ready([expected,vo])?percent(expected,vo):null);
  });
  calculate('out-result',['voc','vl','load','oc-error','load-error'],(voc,vl,load,openError,loadError)=>{
   const {estimate,upper}=outputResistance(voc,vl,load,openError,loadError);
   const battery=read('battery');
   const comparison=battery===null?'':battery<0?' Enter a nonnegative AA resistance.':upper<battery?' Even the upper bound is below the AA resistance, so the amplifier is the stiffer voltage source.':' This upper bound does not establish that the amplifier has lower output resistance than the AA battery.';
   return `Estimate: ${fmt(estimate,'Ω')}. Maximum with meter uncertainty: ${fmt(upper,'Ω')}.${comparison}`;
  });
  calculate('in-result',['vin-open','iin-open','vin-series','iin-series'],(v0,i0,v1,i1)=>{
   const resistance=inputResistance(v0,i0/1000,v1,i1/1000);
   return `Input resistance: ${fmt(resistance,'Ω')}. Difference from ideal 4.7 kΩ: ${percent(4700,resistance)}%.`;
  });
  calculate('design',['rf','weight-a','weight-b'],(rf,a,b)=>{
   const {ra,rb}=summingDesign(rf,a,b);
   return `Ra = ${fmt(ra,'Ω')}. Rb = ${fmt(rb,'Ω')}. Vo = −(${a} Va + ${b} Vb).`;
  });
 }
 function showPlot(circuit){
  try{
   const range=summingRange(circuit);
   $('plot').innerHTML=plot(range);
   set('plot-message',`Lower boundary: ${reading(range.lower)} V + (${reading(range.slope)})·Va. Upper boundary: ${reading(range.upper)} V + (${reading(range.slope)})·Va.`);
  }catch(error){$('plot').replaceChildren();set('plot-message',error.message);}
  $('plot-download').disabled=!$('plot').firstElementChild;
 }
 function download(filename,body,type){
  const url=URL.createObjectURL(new Blob([body],{type}));
  const link=document.createElement('a');
  link.href=url;link.download=filename;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 $('procedure').onchange=()=>{
  for(const section of panel.querySelectorAll('[data-l3-procedure]'))section.hidden=section.dataset.l3Procedure!==$('procedure').value;
 };
 panel.addEventListener('click',event=>{
  const button=event.target.closest('[data-l3-open]');
  if(button)loadTemplate(button.dataset.l3Open);
 });
 panel.addEventListener('input',event=>{
  if(event.target.tagName!=='INPUT')return;
  try{localStorage.setItem(savedKey,JSON.stringify(Object.fromEntries(inputs.map(input=>[input.id,input.value]))));}catch{}
  update();
 });
 $('download').onclick=()=>{
  const procedure=$('procedure').value,section=panel.querySelector(`[data-l3-procedure="${procedure}"]`);
  const rows=[...section.querySelectorAll('table tr')].map(row=>[...row.cells].slice(0,-1).map(cell=>{
   const value=cell.querySelector('input')?.value??cell.textContent;
   return '"'+value.replaceAll('"','""')+'"';
  }).join(','));
  download('EE215-Lab3-P'+procedure+'.csv',rows.join('\r\n'),'text/csv');
 };
 $('apply-design').onclick=()=>{
  try{
   const rf=read('rf'),design=summingDesign(rf,read('weight-a'),read('weight-b'));
   applyDesign({Rf:rf,Ra:design.ra,Rb:design.rb});
   showPlot(getCircuit());
   set('design-status','Design applied. The workspace and plot use the new resistor values.');
  }catch(error){set('design-status',error.message);}
 };
 $('plot-current').onclick=()=>showPlot(getCircuit());
 $('plot-download').onclick=()=>download('EE215-Lab3-linear-range.svg',$('plot').innerHTML,'image/svg+xml');
 showPlot(cases['lab3-sum-1']);
 update();
}
