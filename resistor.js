export const bandColors=[['black','#282923'],['brown','#7c4735'],['red','#c33d36'],['orange','#e58a39'],['yellow','#e6c74e'],['green','#4f8c58'],['blue','#4078b4'],['violet','#8854a3'],['gray','#969a97'],['white','#f4f2e8']];
const toleranceColors={1:['brown','#7c4735'],2:['red','#c33d36'],5:['gold','#b69a43'],10:['silver','#b9bdc2']};
export function resistorBands(value,{unknown=false,tolerance=5}={}){
 if(unknown||!Number.isFinite(value)||value<=0)return {valid:false,unknown,bands:Array.from({length:4},()=>({name:'undefined',color:'#bbb9a9'})),nominal:null,tolerance};
 const nominal=Number(value.toPrecision(2));let exponent=Math.floor(Math.log10(nominal))-1,digits=Math.round(nominal/10**exponent);if(digits===100){digits=10;exponent++;}
 if(exponent< -2||exponent>9)return {valid:false,bands:Array.from({length:4},()=>({name:'out of range',color:'#bbb9a9'})),nominal:null,tolerance};
 const colors=[bandColors[Math.floor(digits/10)],bandColors[digits%10],exponent===-2?['silver','#b9bdc2']:exponent===-1?['gold','#b69a43']:bandColors[exponent],toleranceColors[tolerance]||toleranceColors[5]];
 return {valid:true,bands:colors.map(([name,color])=>({name,color})),nominal:digits*10**exponent,tolerance,exact:Math.abs(digits*10**exponent-value)<Math.abs(value)*1e-10};
}
export function resistorBody(c){const code=resistorBands(c.value,{unknown:c.unknown,tolerance:c.tolerance||5});return `<g class="resistor-body"><path d="M-48 0H-24M24 0H48" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="-24" y="-10" width="48" height="20" rx="7" fill="#decca7" stroke="#9d8b69" stroke-width="1.2"/>${code.bands.map((b,i)=>`<rect class="resistor-band" data-band="${b.name}" x="${[-16,-8,0,14][i]}" y="-9.4" width="4.6" height="18.8" fill="${b.color}" stroke="#766744" stroke-width=".15"/>`).join('')}</g>`;}
