// Shared behavior for two-terminal interactive devices.
export const isContact=c=>['switch','button'].includes(c.type);
export const isDiode=c=>['led','diode'].includes(c.type);
export const isVariable=c=>c.type==='potentiometer';
export function effectiveResistance(c){
 if(isContact(c))return c.closed?1e-6:1e12;
 if(isVariable(c)){const position=c.position??.5;if(!Number.isFinite(position)||position<0||position>1)throw Error('Potentiometer position must be between 0 and 100%.');return Math.max(1e-3,c.value*position);}
 return c.value;
}
export const deviceSymbols={
 diode:'<path d="M-48 0H-15M15 0H48M-15 -17L15 0 -15 17ZM15 -17V17"/>',
 led:'<path d="M-48 0H-15M15 0H48M-15 -17L15 0 -15 17ZM15 -17V17M8 -25L23 -40M16 -40H23V-33M23 -18L38 -33M31 -33H38V-26"/>',
 potentiometer:'<path d="M-48 0H-25V-12H25V12H-25V0M25 0H48M-15 25L17 -22M9 -19L17 -22 17 -14"/>',
 button:'<path d="M-48 0H-17M17 0H48M-17 -9H17M0 -9V-22M-10 -22H10"/><circle cx="-17" r="3"/><circle cx="17" r="3"/>'
};
