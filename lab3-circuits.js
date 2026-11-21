import {pins} from './solver.js';

export const resistorPairs=[[4700,4700],[4700,8200],[1500,4700],[1500,8200]];
export const summingPairs=[[9,1.5],[-9,-9],[1.5,0],[1.5,9],[0,-1.5]];

const supply={negativeRail:-9,positiveRail:9,outputMin:-7,outputMax:7};
function make(id,title,{type,rs,rf,load=false,series=false,va,vb}){
  const components=[],wires=[],junctionNames={};
  function part(id,type,value,x,y,rot=0,extra={}){
    const c={id,type,value,x,y,rot,...extra};
    components.push(c);
    return pins(c).map(({x,y})=>[x,y]);
  }
  const wire=(...route)=>wires.push({points:route.map(([x,y])=>({x,y}))});
  const name=(point,label)=>junctionNames[point.join(',')]=label;
  const ampY=type==='sum'?240:264;
  const [out,minus,plus]=part('U1','opamp',200000,624,ampY,0,{supply});
  const [f1,f2]=part('Rf','resistor',rf,624,72);
  const [gnd]=part('GND','ground',0,96,504);
  const m=[504,minus[1]], o=[744,ampY], ground=[480,504];
  wire(minus,m,[504,72],f1);
  wire(f2,[744,72],o,out);
  wire(o,[816,ampY]);
  name(o,'Vo');
  name(m,'Vminus');
  wire(gnd,ground);
  if(type==='sum'){
    wire(plus,[552,plus[1]],[552,504],ground);
    const [a1,a2]=part('Ra','resistor',40000,360,120);
    const [b1,b2]=part('Rb','resistor',25000,360,264);
    const branch=(p)=>[m[0],p[1]];
    wire(a2,branch(a2));
    wire(b2,branch(b2),m);
    function input(id,value,x,destination){
      const lead=[x,destination[1]], bottom=[x,504];
      if(value===0){wire(bottom,lead,destination);return;}
      const negative=value<0, rail=Math.abs(value)===9;
      const [a,b]=part(id,'voltage',Math.abs(value),x,384,negative?270:90,
        rail?{opampRail:{component:'U1',pin:negative?4:7}}:{});
      wire(negative?b:a,lead,destination);
      wire(negative?a:b,bottom);
    }
    input('Va',va,96,a1);
    if(va===vb&&va!==0){
      wire([240,a1[1]],[240,b1[1]],b1);
      name([240,a1[1]],'Va = Vb');
    }else{
      input('Vb',vb,240,b1);
    }
  }else{
    const [p,n]=part('Vs','voltage',1.5,96,360,90);
    wire(n,gnd);
    const source=[96,240];
    if(type==='inv'){wire(p,source);name(source,'Vs');}
    else name([96,288],'Vs');
    const [r1,r2]=part('Rs','resistor',rs,408,240);
    if(type==='inv'){
      wire(r2,m);
      wire(plus,[552,288],[552,504],ground);
      if(series){
        const [s1,s2]=part('Rseries','resistor',1000,216,240);
        wire(source,s1);
        wire(s2,[312,240],r1);
        name([312,240],'Vin');
      }else{
        wire(source,r1);
      }
    }else{
      // Rs runs from feedback node down to ground using a separate left-hand route.
      wire(r2,m);
      wire(r1,[324,240],[324,504]);
      wire(p,[96,288],plus);
      // The horizontal input wire crosses the Rs return without a junction.
    }
    if(load){
      const [l1,l2]=part('RL','resistor',1000,816,384,90);
      wire([816,264],l1);
      wire(l2,[816,504],[552,504]);
    }
  }
  return {
    id,name:title,mode:'dc',category:'EE 215 LAB 3',level:'Lab procedure',
    description:'Open this circuit to run the DC model and compare it with your lab readings.',
    data:{components,wires,junctionNames}
  };
}
export const lab3Circuits=[
  ...resistorPairs.map(([rs,rf],i)=>make('lab3-inv-'+(i+1),'P1a · Inverting amplifier · Row '+(i+1),{type:'inv',rs,rf})),
  make('lab3-output','P1b · Output resistance · 1 kΩ load',{type:'inv',rs:4700,rf:4700,load:true}),
  make('lab3-input','P1c · Input resistance · 1 kΩ in series',{type:'inv',rs:4700,rf:4700,series:true}),
  ...resistorPairs.map(([rs,rf],i)=>make('lab3-non-'+(i+1),'P2 · Non-inverting amplifier · Row '+(i+1),{type:'non',rs,rf})),
  ...summingPairs.map(([va,vb],i)=>make('lab3-sum-'+(i+1),'P3 · Summing amplifier · Row '+(i+1),{type:'sum',rf:10000,va,vb}))
];
