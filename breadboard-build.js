import {boardGraph,busKey,opampBatteryConnections} from './breadboard-model.js';
import {boardConnections,jumperConnectionProblems,wireIntersections} from './breadboard-connections.js';
import {effectiveResistance,isVariable} from './devices.js';
import {wireHoleSpan} from './lab-wires.js';
import {pins,solve} from './solver.js';

export const boardHoleName=h=>`Board ${h.board+1} · ${h.row.toUpperCase()}${h.column}`;

export function buildGuide(circuit,plan,fmt){
 const graph=boardGraph(plan),parts=new Map(),wires=new Map(),voltages=new Map(),warnings=[];
 const power=opampBatteryConnections(plan);
 const ground=plan.ports.find(p=>p.node<0&&'pnqr'.includes(p.hole.row))?.hole??plan.references[0]?.hole;
 const add=(map,label,id)=>{if(!map.has(label))map.set(label,[]);map.get(label).push(id);};
 const units={resistor:'Ω',capacitor:'F',inductor:'H',potentiometer:'Ω',voltage:'V',current:'A',ac:'V',led:'V',diode:'V'};
 const placement=plan.devices.map(c=>{
  const type=c.type==='opamp'?'LM741 DIP-8':c.battery?'DC battery or supply':c.type;
  const value=c.unknown?'value to determine':units[c.type]?fmt(c.value,units[c.type]).trim():'';
  add(parts,[type,value].filter(Boolean).join(' · '),c.id);
  const terminals=c.ports.map(p=>{
   const i=['A','B','C'].indexOf(p.pin);
   const pin=c.type==='opamp'?[6,2,3][i]:c.battery?(p.pin==='A')===(c.value>=0)?'+':'−':['led','diode'].includes(c.type)?i===0?'Anode':'Cathode':p.pin;
   return `${pin} → ${boardHoleName(p.hole)}`;
  });
  if(c.type==='opamp')terminals.push('Align the notch with the drawing. Leave pins 1, 5 and 8 open for this circuit.');
  if(c.type==='capacitor')terminals.push('For a polarized capacitor, verify orientation against the actual terminal voltages.');
  if(isVariable(c))terminals.push(`Set the rheostat to ${fmt(effectiveResistance(c),'Ω')} between the used terminals`);
  return {id:c.id,battery:c.battery,text:`${c.id} · ${[type,value,...terminals].filter(Boolean).join(' · ')}`};
 });
 for(const lead of power)add(parts,`DC battery or supply · ${fmt(Math.abs(lead.voltage),'V').trim()}`,`${lead.component} pin ${lead.pin}`);
 for(const wire of plan.jumpers){
  const type=wire.kitName||'Insulated jumper';
  const span=wireHoleSpan(wire.from,wire.to);
  add(wires,span?`${type} · ${span} holes`:type,wire.id);
 }
 if(power.some(lead=>!lead.groundHole))warnings.push('A battery return has no free contact. Add a connected ground strip or free a hole on the ground net.');
 for(const problem of jumperConnectionProblems(plan))warnings.push(`${problem.wire} at ${boardHoleName(problem.hole)} · ${problem.reason}`);
 for(const [a,b] of wireIntersections(plan))warnings.push(`${a} crosses ${b}. Verify wire clearance.`);
 if(plan.devices.some(c=>c.external))warnings.push('External sources may need lab equipment. Check source polarity and use a shared reference where the schematic shows ground.');
 let simulationError='';
 try{
  const result=solve(circuit);
  for(const c of circuit.components.filter(c=>c.type!=='ground')){
   const ports=plan.ports.filter(p=>p.component===c.id);
   for(const [i,point] of pins(c).entries()){
    const port=ports.find(p=>p.pin===['A','B','C'][i]);
    if(port)voltages.set(graph.root(port.hole),result.voltage(point).re);
   }
   const r=result.results[c.id];
   if(c.type==='resistor'&&r.p.re>=.25)warnings.push(`${c.id} dissipates ${fmt(r.p.re,'W')}. Check its power rating and derating.`);
   if(c.type==='opamp'&&r.saturation!=='linear')warnings.push(`${c.id} saturates ${r.saturation} at ${fmt(r.v.re,'V')} in the DC model.`);
  }
 }catch(error){simulationError=error.message;}
 const probes=boardConnections(plan).filter(g=>!g.relay||g.node!==null).map(g=>{
  const root=graph.root(g.hole),name=plan.nets.find(n=>n.node===g.node)?.name??'Unassigned';
  return {id:g.id,root,voltage:g.node===-1?0:voltages.get(root),label:`${boardHoleName(g.hole)} · ${name}`};
 });
 for(const lead of power)probes.push({id:busKey(lead.hole),root:busKey(lead.hole),voltage:lead.voltage,label:`${boardHoleName(lead.hole)} · ${lead.component} pin ${lead.pin}`});
 const supplySteps=power.map(lead=>`${lead.component} pin ${lead.pin}: connect the ${lead.voltage<0?'negative':'positive'} terminal of a ${fmt(Math.abs(lead.voltage),'V').trim()} supply to ${boardHoleName(lead.hole)}. Connect its other terminal to ${lead.groundHole?boardHoleName(lead.groundHole)+' (shared GND)':'a free contact on circuit GND before applying power'}.`);
 return {parts,wires,placement,probes,supplySteps,warnings,simulationError,groundId:ground?busKey(ground):null};
}

export function meterCheck(red,black){
 return {
  sameNet:red.root===black.root,
  dc:Number.isFinite(red.voltage)&&Number.isFinite(black.voltage)?red.voltage-black.voltage:null
 };
}
