import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisSettings,decodeCircuit,encodeCircuit} from '../circuit-file.js';

const defaults={frequency:100,duration:.05};

test('a circuit file restores its own frequency and duration',()=>{
 const saved={circuit:{components:[],wires:[]},mode:'ac',frequency:'1000',duration:'0.25'};
 const restored=decodeCircuit(encodeCircuit(saved));
 assert.deepEqual(analysisSettings(restored,defaults),{mode:'ac',frequency:1000,duration:.25});
 assert.deepEqual(analysisSettings({mode:'transient'},defaults),{mode:'transient',...defaults});
});

test('an existing autosave above the old file limits can be exported and reopened',()=>{
 const components=Array.from({length:101},(_,i)=>({id:'R'+i,type:'resistor',x:i,y:0,rot:0,value:1000}));
 const wires=Array.from({length:301},(_,i)=>({points:[{x:i,y:1},{x:i,y:2}]}));
 const original={version:1,circuit:{components,wires}};
 const autosave=decodeCircuit(JSON.stringify(original));
 assert.deepEqual(decodeCircuit(encodeCircuit(autosave)),original);
});

test('invalid wire geometry is still rejected',()=>{
 const circuit={components:[],wires:[{points:[{x:0,y:0},null]}]};
 assert.throws(()=>decodeCircuit(encodeCircuit({circuit})),/Invalid wire data/);
});
