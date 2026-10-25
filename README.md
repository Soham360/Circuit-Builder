# Circuit Builder

A browser-based, 2D circuit workbench for introductory electrical engineering. No frameworks, dependencies, accounts, or backend are required.

## Run locally

Install Node.js 22 or newer, then run:

```sh
node server.mjs
```

Open http://127.0.0.1:4173. Alternatively, run `npm run dev` if npm is installed. ES modules need an HTTP server; opening index.html directly is unsupported.

## Features

- Drag or tap to add components, snap-to-grid movement, two-click orthogonal wiring, rotation, duplication, deletion, undo/redo, panning, and zoom.
- Resistors, capacitors, inductors, independent DC voltage/current sources, sinusoidal voltage sources, switches, and ground.
- DC operating points, AC phasor analysis, and fixed-step transient simulation. Results show voltage, current, and power; transients include a probe chart.
- Seven editable templates: Wheatstone bridge, divider, parallel resistors, RC charging, RL step response, RC low-pass filter, and switched loop.
- Nine guides with formulas, worked examples, experiments, quizzes, and primary educational references.
- Browser autosave, JSON import/export, and responsive layout.

## Controls

Drag a component from the palette or tap it to add. Select a part and enter its value in base units (ohms, farads, henries, volts, amperes); click **Apply value**. Use the wire tool to click two terminals. A diagonal connection routes horizontally first, then vertically. Wire endpoints touching a wire segment create a junction; geometric crossings without endpoints do not. Moving a component leaves its wires in place. Connect a source and ground before running.

- V: select; W: wire; P: probe; H: pan; R: rotate.
- Delete: remove selected part or wire; Escape: cancel wiring.
- Ctrl/Cmd+Z: undo; Ctrl/Cmd+Shift+Z: redo; Ctrl/Cmd+S: save locally.
- Enter: run; Ctrl/Cmd+scroll or zoom buttons: zoom.

## Simulation details and limits

The solver uses modified nodal analysis and partial-pivot Gaussian elimination. Voltages are V(A) minus V(B); branch currents are positive from A to B. Sources use the passive sign convention, so supplying power is negative.

DC capacitors are open circuits; DC inductors are ideal shorts. Transients use backward Euler at 300 uniform steps, zero initial capacitor voltage and inductor current, and a DC source step at time zero. AC voltage sources are sinusoidal in transient mode. Results are numerical approximations; use shorter windows for faster dynamics. Switching during a single transient run and user-defined initial conditions are not supported.

AC analysis solves one frequency at a time with complex impedances. Source values and result magnitudes are **peak**, not RMS. DC voltage sources become shorts and DC current sources become opens in AC. Real average power is Re(V × conjugate(I))/2. The AC analysis frequency is global; the source frequency property applies only to time simulation.

Closed switches have 1 microohm resistance, open switches 1 teraohm. No nonlinear devices, semiconductors, op-amps, dependent sources, parasitics, temperature, or physical safety ratings are modeled. Floating terminals and conflicting ideal sources produce errors. Very ill-conditioned networks can exceed numerical precision. This is an educational linear-circuit lab, not a replacement for SPICE or lab measurements.

## Validate and build

```sh
node --test tests/solver.test.mjs
node build.mjs
```

The build copies the static app into `dist/`. All asset links are relative, so deployment works under a GitHub Pages repository path. The GitHub Actions workflow tests and builds pull requests and deploys pushes to main. Enable GitHub Pages with **GitHub Actions** as the source in repository settings if needed.

## Curriculum sources

The guides are original explanations of standard introductory circuit topics, with links to [MIT OpenCourseWare linear circuit analysis](https://ocw.mit.edu/courses/6-071j-introduction-to-electronics-signals-and-measurement-spring-2006/resources/linear_crct_ana/), [MIT lecture notes](https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/pages/lecture-notes/), and [OpenStax RC circuits](https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits). They have not been matched to a particular course syllabus.
