importScripts('./vendor/nerdamer.js');
onmessage=async event=>{try{const {homework}=await import('./homework.js');postMessage({ok:true,result:homework(event.data.circuit,event.data.query,self.nerdamer)});}catch(error){postMessage({ok:false,error:error.message||'Unable to solve this circuit.'});}};
