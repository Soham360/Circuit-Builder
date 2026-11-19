import {pins,solve} from './solver.js';
import {opampSupply} from './devices.js';

export function dcReading(circuit){
 const {results,voltage}=solve(circuit,{mode:'dc'});
 const rs=circuit.components.find(c=>c.id==='Rs');
 return {
  output:results.U1.v.re,
  saturation:results.U1.saturation,
  source:results.Vs?.v.re,
  input:rs&&voltage(pins(rs)[0]).re,
  current:results.Rs?.i.re
 };
}

export function percentError(expected,measured){
 return expected===0?null:100*Math.abs(Math.abs(measured)-Math.abs(expected))/Math.abs(expected);
}

export function inputResistance(vWithout,iWithout,vWith,iWith){
 if(iWithout===iWith)throw Error('The two input currents must differ to find the slope.');
 return (vWithout-vWith)/(iWithout-iWith);
}

export function outputResistance(vOpen,vLoad,load,openError=0,loadError=0){
 if(load<1000)throw Error('Use a load of at least 1 kΩ.');
 if(openError<0||loadError<0)throw Error('Enter nonnegative voltage uncertainties.');
 if(Math.abs(vLoad)<=loadError)throw Error('The loaded reading must have a magnitude greater than its uncertainty.');
 return {
  estimate:load*(Math.abs(vOpen)/Math.abs(vLoad)-1),
  upper:Math.max(0,load*((Math.abs(vOpen)+openError)/(Math.abs(vLoad)-loadError)-1))
 };
}

export function summingDesign(rf,gainA,gainB){
 if([rf,gainA,gainB].some(v=>!Number.isFinite(v)||v<=0))throw Error('Enter a positive feedback resistance and positive coefficient magnitudes.');
 const ra=rf/gainA,rb=rf/gainB;
 if(!Number.isFinite(ra)||!Number.isFinite(rb)||ra<=0||rb<=0)throw Error('The computed resistances are outside the supported numeric range.');
 return {ra,rb};
}

export function summingRange(circuit){
 const part=id=>circuit.components.find(c=>c.id===id);
 const ra=part('Ra'),rb=part('Rb'),rf=part('Rf'),amp=part('U1');
 if(!amp||amp.type!=='opamp'||[ra,rb,rf].some(r=>r?.type!=='resistor'||r.unknown||!(r.value>0)))throw Error('Open a Procedure 3 template with known Ra, Rb and Rf.');
 const {outputMin,outputMax}=opampSupply(amp);
 const a=rf.value/ra.value,b=rf.value/rb.value;
 return {slope:-a/b,lower:-outputMax/b,upper:-outputMin/b};
}
