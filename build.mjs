import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','app.js','solver.js','content.js','homework.js','homework-ui.js','homework-worker.js']) await copyFile(file,`dist/${file}`);
console.log('Built dependency-free static site in dist/');

await cp('vendor','dist/vendor',{recursive:true});
