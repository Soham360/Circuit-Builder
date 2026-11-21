// Presentation of the editable P1-1 schematic. The two supply drawings show
// the amplifier's configured rails; the solver and breadboard use those same values.
import {opampSupply} from './devices.js';
import {key, pins, topology} from './solver.js';

const text = (x,y,label,attrs='') => `<text x="${x}" y="${y}" ${attrs}>${label}</text>`;
const sub = (name,suffix) => `${name}<tspan baseline-shift="sub" font-size="75%">${suffix}</tspan>`;
const battery = (x,y,positiveTop) => `<path d="M${x} ${y-30}V${y-18}M${x} ${y+18}V${y+30}${Array.from({length:6},(_,i)=>{
 const half=(i%2===0)===positiveTop?11:6;
 return `M${x-half} ${y-18+7.2*i}h${2*half}`;
 }).join('')}"/>`;
const symbol = paths => `<g class="lab-figure-symbol">${paths}</g>`;
const labels = content => `<g class="lab-figure-label">${content}</g>`;

export function p1Component(c, fmt, esc) {
 if (c.id==='U1' && c.type==='opamp' && c.rot===0 && !c.length) {
  return {replaceLabel:true, symbol:symbol('<path d="M-48-24H-44M-48 24H-44M-44-44L35 0-44 44ZM35 0H48"/>')+
   labels(text(-59,-30,'2')+text(-59,19,'3')+text(36,-6,'6'))};
 }
 if(c.id==='GND' && c.type==='ground')return {replaceLabel:true,symbol:''};
 if(c.id==='Vs' && c.type==='voltage' && c.rot===90) {
  // The local x axis follows the battery's terminals; compensate for the
  // component's rotation so the plates render horizontally.
  const half=(c.length||96)/2;
  const sign=c.value>=0;
  return {replaceLabel:true, symbol:`<g transform="scale(${96/(c.length||96)} 1) rotate(-90)">${symbol(battery(0,0,sign)+`<path d="M0 -30V${-half}M0 30V${half}"/>`)}${labels(text(-18,-25,sign?'+':'−')+text(-18,28,sign?'−':'+')+text(-19,4,esc(fmt(Math.abs(c.value),'V')),'text-anchor="end"')+text(11,-27,sub('v','s')))}</g>`};
 }
 if(c.type==='resistor' && ['Rs','Rf','Rb'].includes(c.id)) {
  const label=c.id==='Rb'?esc(fmt(c.value,'Ω')):sub('R',c.id.at(-1));
  return {replaceLabel:true,label};
 }
 return {};
}

export function p1Details(circuit, fmt, esc) {
 const amp=circuit.components.find(c=>c.id==='U1'&&c.type==='opamp'&&c.rot===0&&!c.length);
 const ground=circuit.components.find(c=>c.id==='GND'&&c.type==='ground');
 const points=new Set(circuit.wires.flatMap(w=>w.points.map(key)));
 if(!amp||!ground)return '';
 const {x,y}=amp;
 const end={x:480,y:312},output={x:480,y:198};
 if(!points.has(key(end))||!points.has(key(output)))return '';
 const top=topology(circuit);
 if(top.node(end)!==-1||top.node(output)!==top.node(pins(amp)[0]))return '';
 const supplyDrawing=ground.y-y===114&&ground.x<x&&x+60<end.x&&
  circuit.wires.some(w=>w.points.some((p,i)=>i>0&&p.y===end.y&&w.points[i-1].y===end.y&&
   Math.min(p.x,w.points[i-1].x)<=x&&Math.max(p.x,w.points[i-1].x)>=x+60));
 let details='';
 if(supplyDrawing){
  const {negativeRail,positiveRail}=opampSupply(amp), g=ground.y;
  details+=symbol(`<path d="M${x} ${y+20}V${g-60}M${x+60} ${g-60}V${y-60}H${x}V${y-20}"/>${battery(x,g-30,false)}${battery(x+60,g-30,true)}`)+
    labels(text(x+5,y-24,'7')+text(x+9,y+26,'4')+text(x-32,g-47,'−')+text(x-32,g-12,'+')+text(x+84,g-47,'+')+text(x+84,g-12,'−')+
    text(x-27,g-27,esc(fmt(Math.abs(negativeRail),'V')),'text-anchor="end"')+text(x+79,g-27,esc(fmt(positiveRail,'V'))));
  details+=`<circle class="lab-figure-dot" cx="${x}" cy="${g}" r="4"/><circle class="lab-figure-dot" cx="${x+60}" cy="${g}" r="4"/>`;
 }
 details+=`<circle class="lab-figure-terminal" cx="480" cy="198" r="5"/><circle class="lab-figure-terminal" cx="480" cy="312" r="5"/>`+
   labels(text(501,203,'+')+text(501,316,'−')+text(500,254,sub('v','o'))+
   text(288,344,'Figure P1-1 – Inverting amplifier','class="lab-figure-caption" text-anchor="middle"'));
 return details;
}
