import {opampSupply} from './devices.js';
import {componentTypes} from './content.js';

const types=new Set(componentTypes.map(component=>component.type));
const validPoint=point=>Number.isFinite(point?.x)&&Number.isFinite(point?.y);

export function validateCircuit(record){
 const circuit=record?.circuit;
 if(!Array.isArray(circuit?.components)||!Array.isArray(circuit.wires))throw Error('Expected a circuit export.');
 const ids=new Set();
 for(const component of circuit.components){
  if(!types.has(component?.type)||typeof component.id!=='string'||component.id.length>32||
     ids.has(component.id)||!validPoint(component)||!Number.isFinite(component.rot)||
     (!component.unknown&&!Number.isFinite(component.value))||
     (component.length!==undefined&&(!Number.isFinite(component.length)||component.length<=0))){
   throw Error('Invalid component data.');
  }
  if(component.type==='opamp')opampSupply(component);
  ids.add(component.id);
  if(component.type==='button')component.closed=false;
 }
 for(const wire of circuit.wires){
  if(!Array.isArray(wire?.points)||wire.points.length<2||!wire.points.every(validPoint))throw Error('Invalid wire data.');
 }
 return record;
}

export function encodeCircuit(snapshot){
 return JSON.stringify({version:1,...snapshot});
}

export function decodeCircuit(text){
 return validateCircuit(JSON.parse(text));
}

export function analysisSettings(record,defaults){
 const frequency=Number(record.frequency),duration=Number(record.duration);
 return {
  mode:['dc','ac','transient'].includes(record.mode)?record.mode:'dc',
  frequency:Number.isFinite(frequency)&&frequency>0?frequency:defaults.frequency,
  duration:duration>0&&duration<=1000?duration:defaults.duration
 };
}
