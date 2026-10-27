import {make} from './homework-circuits.js';
const R=(id,v,a,b,extra)=>[id,'resistor',v,a,b,extra],V=(id,v,a,b)=>[id,'voltage',v,a,b];
const lab=(...args)=>({...make(...args),category:'EE 215 LAB 2',level:'Lab procedure'});
export const labCircuits=[
lab('lab2-p1','Lab 2 · Procedure 1 · Node and mesh analysis',
{'0':[0,2],S:[0,0],L:[1,0],a:[2,0],T:[3,0],X:[3,1],b:[2,2]},
[V('V9',9,'S','0'),R('R82',8200,'S','L'),R('R15',1500,'L','a'),R('R47',4700,'a','T'),R('Rtop',1000,'L','T',{via:[2,-0.8]}),R('Rright',10000,'T','X'),V('V15',1.5,'X','b'),R('Rbottom',10000,'0','b'),R('RLoad',20000,'a','b')],
'Figure P1-1: find v = V(a) − V(b) and downward i through RLoad (20 kΩ). Use the node solution and mesh / loop report, then compare with your meter.',{kind:'voltage',component:'RLoad'}),
lab('lab2-p3','Lab 2 · Procedure 3 · Thévenin and load power',
{'0':[0,2],S:[0,0],a:[1.5,0],T:[3,0],X:[3,2],b:[1.5,2]},
[V('V9',9,'S','0'),R('R10',10000,'S','a'),R('R30',30000,'a','T'),V('V15',1.5,'T','X'),R('R15',1500,'b','X'),R('RLoad',20000,'a','b'),R('R47',4700,'0','b')],
'Figure P3-1: RLoad is the detachable 20 kΩ load. The lab tools calculate open / short circuit results, source-deactivated resistance, a 100 kΩ rheostat, and load power.',{kind:'port',component:'RLoad'}),
...[
['aa','AA battery',1.5,0.2],
['potato','Potato battery',0.9,1000]
].map(([id,name,voltage,internal])=>lab('lab2-'+id,'Lab 2 · Procedure 2 · '+name,
{'0':[0,2],S:[0,0],X:[1,0],a:[2,0]},
[V('Battery',voltage,'S','0'),R('Rinternal',internal,'S','X'),R('R100',100,'X','a'),R('RLoad',1e6,'a','0')],
'Figure P2-1: illustrative editable battery model, not measured data. R100 stays in series. RLoad represents an external meter / load and is detached for port analysis. Enter your actual Voc and Isc in the measurement calculator.',{kind:'port',component:'RLoad'}))
];
