import {portEquivalent} from './network-analysis.js';
import {solve} from './solver.js';
export function batteryFromMeasurements(voc,isc,series=100){
 if(![voc,isc,series].every(Number.isFinite)||voc<=0||isc<=0||series<0)throw Error('Enter positive open-circuit voltage and short-circuit current, and a nonnegative series resistance.');
 const total= voc/isc,internal=total-series;
 if(internal<0)throw Error('These measurements imply negative battery resistance. Check current units, polarity, and the measured series resistance.');
 return {voc,isc,total,internal,maximumPower:internal>0?voc*voc/(4*internal):null};
}
export function loadPoint(vth,rth,resistance){
 if(![vth,rth,resistance].every(Number.isFinite)||rth<=0||resistance<0)throw Error('Use a positive Thévenin resistance and a nonnegative load.');
 const current=vth/(rth+resistance),voltage=current*resistance;
 return {resistance,current,voltage,power:current*current*resistance};
}
export function labReport(circuit){
 const port=portEquivalent(circuit,{component:'RLoad'});
 if(port.rth<=0)throw Error('Maximum power tools require a positive port resistance.');
 const loaded=solve(circuit).results.RLoad;
 return {...port,loaded:{voltage:loaded.v.re,current:loaded.i.re,power:loaded.p.re},loads:[5000,10000,20000].map(r=>loadPoint(port.vth,port.rth,r)),optimal:loadPoint(port.vth,port.rth,port.rth),halfVoltage:port.vth/2};
}
