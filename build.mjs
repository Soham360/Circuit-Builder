import {mkdir,readFile,writeFile,copyFile,cp,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=process.cwd(),dist=path.resolve(root,'dist');
if(path.dirname(dist)!==root||path.basename(dist)!=='dist')throw Error('Invalid build output directory');
const files=['lesson-animations.js','equivalent-ui.js','equivalent.js','style.css','app.js','routing.js','solver.js','content.js','homework.js','homework-ui.js','homework-worker.js','resistor.js','breadboard.js','math.js','pagination.js','values.js','breadboard-model.js'];
const hash=createHash('sha256');
for(const file of ['index.html',...files,'vendor/nerdamer.js','vendor/katex.min.js'])hash.update(file).update(await readFile(file));
const revision=hash.digest('hex').slice(0,16),assetPath=`assets/${revision}`;
// The verified dist/ directory contains generated output only.
await mkdir(dist,{recursive:true});
// Synced Windows folders may reject removing directories; clean generated files in place.
async function clearGeneratedFiles(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const target=path.resolve(directory,entry.name);if(path.dirname(target)!==directory||!target.startsWith(dist+path.sep))throw Error('Invalid build entry');if(entry.isDirectory())await clearGeneratedFiles(target);else await rm(target,{force:true,maxRetries:8,retryDelay:150});}}
await clearGeneratedFiles(dist);
await mkdir(path.join(dist,assetPath),{recursive:true});
for(const file of files)await copyFile(file,path.join(dist,assetPath,file));
await cp('vendor',path.join(dist,assetPath,'vendor'),{recursive:true});
let html=await readFile('index.html','utf8');
html=html.replace('href="./style.css"',`href="./${assetPath}/style.css"`).replace('src="./app.js"',`src="./${assetPath}/app.js"`);
await writeFile(path.join(dist,'index.html'),html);
await writeFile(path.join(dist,'build-info.json'),JSON.stringify({revision,assetPath},null,2));
console.log(`Built static site with versioned assets: ${assetPath}`);
