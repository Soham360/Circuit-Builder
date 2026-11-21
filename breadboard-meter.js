import {boardGraph, circuitFromBreadboard, opampBatteryConnections, validHole} from './breadboard-model.js';
import {effectiveResistance, isContact, isVariable} from './devices.js';
import {pins, solve} from './solver.js';

function contacts(circuit, plan, graph) {
 const points = new Map(circuit.components.map(component => [component.id, pins(component)]));
 const terminals = new Map(plan.ports.map(port => [
  graph.root(port.hole), points.get(port.component)?.['ABC'.indexOf(port.pin)]
 ]).filter(([, point]) => point));
 for (const ref of plan.references) terminals.set(graph.root(ref.hole), points.get(ref.component)[0]);
 return terminals;
}

function resistance(plan, graph, red, black) {
 const branches = plan.devices.filter(c => ['resistor', 'inductor'].includes(c.type) || isVariable(c) || (isContact(c) && c.closed)).map(c => ({
  a: graph.root(c.ports[0].hole), b: graph.root(c.ports[1].hole),
  value: c.type === 'inductor' || isContact(c) ? 0 : effectiveResistance(c)
 }));
 const reached = new Set([red]), queue = [red];
 for (const node of queue) {
  for (const {a, b} of branches) {
   const next = a === node ? b : b === node ? a : null;
   if (next !== null && !reached.has(next)) { reached.add(next); queue.push(next); }
  }
 }
 if (!reached.has(black)) return Infinity;
 const x = node => 100 + 100 * queue.indexOf(node);
 const network = {components: [{id:'GND', type:'ground', x:x(black), y:0}], wires:[]};
 const add = ({a, b, value}, type) => {
  if (a === b) return;
  network.components.push({id:'Meter'+network.components.length, type, value,
   x:(x(a)+x(b))/2, y:0, length:Math.abs(x(a)-x(b)), rot:x(a)<x(b)?0:180});
 };
 // Collapse closed contacts and inductors before solving the DC resistor network.
 const parent = new Map(queue.map(node => [node, node]));
 const root = node => { while (parent.get(node) !== node) node = parent.get(node); return node; };
 for (const {a,b,value} of branches) if (value === 0 && reached.has(a)) parent.set(root(a), root(b));
 const a = root(red), b = root(black);
 if (a === b) return 0;
 network.components[0].x = x(b);
 for (const branch of branches) if (reached.has(branch.a) && branch.value > 0) {
  add({...branch, a:root(branch.a), b:root(branch.b)}, 'resistor');
 }
 add({a:b, b:a, value:1}, 'current');
 return solve(network).voltage({x:x(a), y:0}).re;
}

export function measureBreadboard(circuit, plan, {red, black, mode, gap}) {
 if (![red,black].every(h => validHole(h) && h.board < plan.boardCount)) throw Error('Place both probes on breadboard holes.');
 const graph = boardGraph(plan), a = graph.root(red), b = graph.root(black);
 if (mode === 'resistance') return a === b ? 0 : resistance(plan, graph, a, b);
 if (mode === 'current') {
  const jumper = plan.jumpers.find(w => w.id === gap);
  if (!jumper) throw Error('Choose a jumper to open, then bridge that gap with the probes.');
  const cut = {...plan, jumpers:plan.jumpers.filter(w => w !== jumper)};
  const split = boardGraph(cut), r = split.root(red), k = split.root(black);
  const ends = [split.root(jumper.from),split.root(jumper.to)];
  if (ends[0] === ends[1]) throw Error('A parallel connection bypasses this jumper. Choose another jumper.');
  if (r === k || !ends.includes(r) || !ends.includes(k)) throw Error('Place one probe on each side of the opened jumper.');
  const network = circuitFromBreadboard(circuit, cut);
  const at = contacts(network, cut, split), p = at.get(r), q = at.get(k);
  if (!p || !q) return 0;
  let id = 'Meter';
  while (network.components.some(c => c.id === id)) id += 'X';
  network.components.push({id,type:'voltage',value:0,x:(p.x+q.x)/2,y:(p.y+q.y)/2,
   length:Math.hypot(q.x-p.x,q.y-p.y),rot:Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI});
  return solve(network).results[id].i.re;
 }
 const at = contacts(circuit, plan, graph);
 const supplies = new Map(opampBatteryConnections(plan).filter(lead => lead.groundHole).map(lead => [graph.root(lead.hole),lead.voltage]));
 const solution = at.has(a) || at.has(b) ? solve(circuit) : null;
 const voltage = node => supplies.get(node) ?? (at.has(node) ? solution.voltage(at.get(node)).re : NaN);
 const result = voltage(a) - voltage(b);
 if (!Number.isFinite(result)) throw Error('A probe is on a floating strip.');
 return result;
}
