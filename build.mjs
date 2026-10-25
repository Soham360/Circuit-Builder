import {mkdir,readFile,writeFile,copyFile,cp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=process.cwd(),dist=path.resolve(root,'dist');
if(path.dirname(dist)!==root||path.basename(dist)!=='dist')throw Error('Invalid build output directory');
const files=['style.css','app.js','routing.js','solver.js','content.js','homework.js','homework-ui.js','homework-worker.js'];
const hash=createHash('sha256');
for(const file of ['index.html',...files,'vendor/nerdamer.js'])hash.update(file).update(await readFile(file));
const revision=hash.digest('hex').slice(0,16),assetPath=`assets/${revision}`;
// The verified dist/ directory contains generated output only.
await rm(dist,{recursive:true,force:true});
await mkdir(path.join(dist,assetPath),{recursive:true});
for(const file of files)await copyFile(file,path.join(dist,assetPath,file));
await cp('vendor',path.join(dist,assetPath,'vendor'),{recursive:true});
let html=await readFile('index.html','utf8');
html=html.replace('href="./style.css"',`href="./${assetPath}/style.css"`).replace('src="./app.js"',`src="./${assetPath}/app.js"`);
await writeFile(path.join(dist,'index.html'),html);
await writeFile(path.join(dist,'build-info.json'),JSON.stringify({revision,assetPath},null,2));
console.log(`Built static site with versioned assets: ${assetPath}`);
