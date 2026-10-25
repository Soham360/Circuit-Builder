import test from 'node:test';import assert from 'node:assert/strict';
globalThis.self=globalThis;
const {toTex,mathHTML,lessonTex}=await import('../math.js');
test('equations use fractions, powers, subscripts, and accessible MathML',()=>{assert.match(toTex('(N1-N2)/R1=I(R1)'),/\\frac/);assert.match(toTex('R1^2'),/\^\{/);const html=mathHTML('(N1-N2)/R1=I(R1)');assert.match(html,/<math/);assert.match(html,/<mfrac>/);assert.match(html,/annotation encoding="application\/x-tex"/);assert.ok(!html.includes('katex-error'));});
test('guide formulas, including dependent sources, render valid LaTeX',()=>{for(const tex of Object.values(lessonTex))assert.ok(!mathHTML(tex,{tex:true}).includes('katex-error'),tex);});

test('junction voltage labels render as voltage subscripts',()=>{assert.equal(toTex('VA'),'V_{A}');assert.ok(!mathHTML('(VA-VB)/R1 = 0').includes('katex-error'));});
