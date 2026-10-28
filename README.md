# Circuit Builder

A browser-based, 2D circuit workbench for introductory electrical engineering. No package installation, accounts, or backend are required. Symbolic algebra uses a vendored copy of Nerdamer 2.0.0.

## Run locally

Install Node.js 22 or newer, then run:

```sh
node server.mjs
```

Open http://127.0.0.1:4173. Alternatively, run `npm run dev` if npm is installed. ES modules need an HTTP server; opening index.html directly is unsupported.

## Features

- Drag or tap to add components, snap-to-grid movement, two-click wiring with default 90° / 180° routing, direct segments, custom first-segment angles, and draggable wire handles, rotation, duplication, deletion, undo/redo, panning, and zoom.
- Resistors, capacitors, inductors, LEDs, diodes, adjustable potentiometers (two-terminal rheostat mode), momentary pushbuttons, latching switches, independent DC voltage/current sources, sinusoidal voltage sources, and ground.
- DC operating points, AC phasor analysis, and fixed-step transient simulation. Results show voltage, current, and power; transients include a probe chart.
- Seven classic editable templates plus 19 course circuits from Homework 1–4: Wheatstone bridge, divider, parallel resistors, RC charging, RL step response, RC low-pass filter, and switched loop.
- Nine guides with formulas, worked examples, experiments, quizzes, and primary educational references.
- Browser autosave, JSON import/export, and responsive layout.

## Controls

Drag a component from the palette or tap it to add. Select a part and enter its value in base units (ohms, farads, henries, volts, amperes); click **Apply value**. Use the wire tool to click two terminals. A diagonal connection defaults to a horizontal segment then a vertical segment. Use the routing menu to choose Direct or Custom angle. Select a wire to reroute it or drag its square handles. Component angles are editable in Properties. Wire endpoints touching a wire segment create a junction; geometric crossings without endpoints do not. Moving a component leaves its wires in place. Connect a source and ground before running.

- V: select; W: wire; P: probe; H: pan; R: rotate.
- Delete: remove selected part or wire; Escape: cancel wiring.
- Ctrl/Cmd+Z: undo; Ctrl/Cmd+Shift+Z: redo; Ctrl/Cmd+S: save locally.
- Enter: run; Ctrl/Cmd+scroll or zoom buttons: zoom.

## Simulation details and limits

The solver uses modified nodal analysis and partial-pivot Gaussian elimination. Voltages are V(A) minus V(B); branch currents are positive from A to B. Sources use the passive sign convention, so supplying power is negative.

DC capacitors are open circuits; DC inductors are ideal shorts. Transients use backward Euler at 300 uniform steps, zero initial capacitor voltage and inductor current, and a DC source step at time zero. AC voltage sources are sinusoidal in transient mode. Results are numerical approximations; use shorter windows for faster dynamics. Switching during a single transient run and user-defined initial conditions are not supported.

AC analysis solves one frequency at a time with complex impedances. Source values and result magnitudes are **peak**, not RMS. DC voltage sources become shorts and DC current sources become opens in AC. Real average power is Re(V × conjugate(I))/2. The AC analysis frequency is global; the source frequency property applies only to time simulation.

Closed switches have 1 microohm resistance, open switches 1 teraohm. LEDs and diodes use a piecewise-linear DC/transient model: editable forward voltage, 10 ohm dynamic resistance, and 1 gigaohm reverse leakage. They do not model breakdown, thermal behavior, or small-signal AC. No op-amps, parasitics, temperature, or physical safety ratings are modeled. Linear dependent sources are supported. Floating terminals and conflicting ideal sources produce errors. Very ill-conditioned networks can exceed numerical precision. This is an educational linear-circuit lab, not a replacement for SPICE or lab measurements.

## Validate and build

```sh
node --test tests/*.test.mjs
node build.mjs
```

The build copies the static app into `dist/`. All asset links are relative, so deployment works under a GitHub Pages repository path. The GitHub Actions workflow tests and builds pull requests and deploys pushes to main. Enable GitHub Pages with **GitHub Actions** as the source in repository settings if needed.

## Curriculum sources

The guides are original explanations of standard introductory circuit topics, with links to [MIT OpenCourseWare linear circuit analysis](https://ocw.mit.edu/courses/6-071j-introduction-to-electronics-signals-and-measurement-spring-2006/resources/linear_crct_ana/), [MIT lecture notes](https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/pages/lecture-notes/), and [OpenStax RC circuits](https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits). They have not been matched to a particular course syllabus.

## Homework lab

Open **Homework** to use the same circuit editor with deterministic, worked DC circuit solutions. There is no chatbot or AI service. All algebra runs locally in a cancellable browser worker.

Select a part and check **Value is unknown** to leave its value symbolic. Choose a node potential, voltage difference between two nodes, component voltage drop, or branch/path current. The solution shows known and unknown quantities, node connectivity, component laws, KCL equations, elimination rows, back-substitution, and target evaluation. A path current uses a component as its reference and identifies its unbranched series path; it does not assign an arbitrary current to an ideal wire at a junction.

To find an unknown resistor or independent source value, supply one known voltage/current measurement. Other unknown values may remain parameters in a conditional expression. Numeric single-unknown candidates are checked by substitution and by the numerical circuit solver. Non-positive resistance, undefined expressions, and inconsistent constraints are rejected. Missing data yields symbolic results instead of invented numbers.

The homework engine supports DC steady state, up to 24 components, 16 non-ground nodes, and five undefined values. Symbolic operations have size/time limits. It does not solve AC or transient homework networks or infer ideal capacitance/inductance from DC steady-state measurements. The separate power/energy calculator integrates entered exponential waveforms. Several known measurements can determine multiple unknowns within the polynomial elimination limits described in HOMEWORK-COVERAGE.md. Some symbolic circuits are singular at particular parameter values; expressions assume valid, nonzero denominators and positive passive components.

The Wheatstone bridge template is a classic diamond. The original unmodified rectangular geometry in old browser saves is migrated while preserving edited component values. Custom circuit layouts are preserved.

### Vendored algebra

Nerdamer 2.0.0 is bundled from its npm distribution, with MIT license notices in vendor/. The numerical simulation remains dependency-free. Build copies the worker, homework modules, and vendor assets to dist/.

## Navigation and deployment

The URL fragment selects the page, including direct links and reloads at #homework. Browser Back/Forward and fragment changes update the visible editor and navigation together. Production builds place all modules, styles, and worker dependencies in a content-versioned assets directory, so older cached scripts cannot mix with a newer page. Workers resolve relative to their module URL. The static build workflow is the single GitHub Pages publishing path.

## Editor upgrades

The workbench fills the viewport. Palette categories, inspector tabs, paged guides, and paged worked solutions keep controls available without a long page. Zoom and pan cover an open grid; component coordinates are not limited to the original drawing rectangle.

Dependent sources use A → B output references. VCVS/VCCS sense a selected positive terminal minus a negative terminal; CCVS/CCCS sense the selected component's signed A → B current. Gain units are V/V, Ω, S, and A/A respectively. Numerical DC, AC, and transient analysis supports these models. Homework provides deterministic DC equations and can isolate an undefined gain.

Breadboard view maps the current topology onto real five-hole terminal buses, with explicit jumpers and a paged wiring list. Large circuits use multiple boards. The schematic remains visible alongside the breadboard, with independent pan/zoom. Jumpers and component leads are orthogonal. DC voltage sources appear as batteries connected to continuous power rails; additional supplies receive separate rail pairs or boards. AC, current, and dependent sources appear as external modules; this is a connectivity layout, not a transistor-level implementation of those ideal models.

Schematic resistors use the standard zigzag symbol. Breadboard resistors display four bands and their specified numeric resistance. Four-band codes use two significant digits; when the specified value needs rounding, the Bands inspector states both the encoded nominal and the exact circuit value. Unknown or out-of-range values use neutral bands. Visual tolerance does not randomize the simulation.

Equations render locally with KaTeX 0.16.22's accessible MathML output. Worked pages include Copy LaTeX, and the complete derivation remains available through browser printing. KaTeX and Nerdamer are vendored with their licenses; no AI service or runtime CDN is used.

Click a terminal or wire endpoint to start a connection without selecting Wire; completion returns to selection. The Wire tool remains available for repeated wiring. Drag empty schematic space to pan and scroll there to zoom around the pointer. Grid dots retain a visible screen size as the camera changes.

## Resistance entry and editable breadboards

Resistance accepts engineering notation such as `2k`, `2.2kΩ`, `4k7`, and `1M`; Enter, Apply, or leaving the field normalizes it to ohms. The on-screen arrows and keyboard Up/Down step by the smallest non-zero place of the current value (`2000 → 1000`, `2200 → 100`, `2.2 → 0.1`). A step cannot produce zero or negative resistance.

Components mount horizontally or vertically between actual five-hole terminal strips. Supply and return jumpers are single vertical wires, and each jumper has only two endpoints. Battery leads terminate on separate power rail holes. Independent supplies receive separate boards when needed.

Breadboard Inspect edits the shared component values; Move parts drags legs to new holes; Wire joins two free holes in one row or column; Erase wire removes a jumper. Rotate acts on the selected breadboard component. Physical bus connections are traced back into the schematic, including opens, shorts, and changed sensing terminals. Electrical edits are verified against the schematic topology before being committed. Unchanged connectivity keeps the existing schematic layout. Undo, local saving, reload, and circuit export retain edited breadboard layouts. Schematic topology changes regenerate the automatic breadboard layout.

## Homework 1–4 support

Use **Circuit library → Homework 1–4** for editable versions of all 19 circuit diagrams. Course examples open Homework with a preset target; missing values remain unknown. The Homework Find menu also includes component power, Thévenin/Norton equivalents, independent loop currents with KCL/KVL and power balance, source transformations, simultaneous measurements, exponential-waveform power/energy, and signed element power tables. All calculations run locally in the cancellable worker.

The Thévenin/Norton tool detaches the selected load, measures open-circuit voltage and ideal short-circuit current, and calculates resistance using a 1 V test with independent sources zeroed and dependent sources retained. It shows both equivalent diagrams and verifies loaded voltage/current. Source transformation results identify a valid resistor partner, replacement value, polarity and connection; successive edits are made in the workspace. Loop currents use an independent cycle basis, which can span multiple planar meshes.

See [HOMEWORK-COVERAGE.md](HOMEWORK-COVERAGE.md) for the problem-by-problem mapping, assumptions for unspecified elements, the experimental resistance estimate, reference directions and calculation limits.

## EE 215 Lab 2

Open **EE 215 · Lab 2 tools** above the workspace or filter the circuit library by **EE 215 Lab 2**. Four editable presets cover Figures P1-1, P2-1 (AA and potato models), and P3-1. All work in schematic and breadboard views.

- Procedure 1: node voltage solution, mesh / loop equations, and comparison of measured load voltage and downward current with the ideal model.
- Procedure 2: enter actual open-circuit voltage, short-circuit current in mA, and measured series resistance for both batteries. The tool draws equivalents with and without the series resistor and compares delivery to the same load. Battery preset values are illustrative, not experimental readings. Keep the series resistor in place for short-circuit measurements.
- Procedure 3: detach RLoad mathematically for Voc, Isc, and source-deactivated Rth; compare 5 kΩ, 10 kΩ and 20 kΩ load power; find the continuous maximum; and adjust a 100 kΩ rheostat model (1 Ω to 100 kΩ). Pins 2 and 3 are strapped at b, and pin 1 connects to a. The ideal zero-ohm short is computed by port analysis.

The tools operate on the current circuit using a resistor named RLoad as the output port. Recalculate after edits. Physical measurements must be entered by the user. For P3-1, nominal values give Vth = 6.613636 V, Rth = 10.022727 kΩ, Isc = 0.659864 mA; the 10 kΩ load is best among the specified three.

## Lab wire kit

In Breadboard view, check **Lab** to route jumpers using only this kit. The preference persists across reloads and circuit changes. Uncheck it to allow arbitrary straight wire lengths and net colors again.

Lengths count both end holes: a 3-hole wire joins columns 1 and 3. The center channel spans four pitches; power rails use the board's nominal 0.1-inch pitch layout. Battery leads are attached source leads, separate from breadboard jumpers.

| Wire | Holes |
| --- | ---: |
| Long green | 51 |
| Long yellow | 41 |
| Long orange | 31 |
| Long red | 21 |
| Brown | 11 |
| White | 10 |
| Gray | 9 |
| Purple | 8 |
| Blue | 7 |
| Short green | 6 |
| Short yellow | 5 |
| Short orange | 4 |
| Short red | 3 |
| Bare | 2 |

The router can join multiple kit wires through free terminal strips while preserving every electrical net and component position. Colors identify kit lengths in Lab mode; the Net selector still highlights connections. **Wiring list → Jumpers & lengths** lists every jumper, its kit name, length, and endpoint holes. Manual wiring also enforces the kit. If a placement cannot be routed, the app reports it instead of substituting an unsupported wire. No quantity limits are assumed because inventory counts were not provided.

### Visible breadboard connections

Dashed lines show the breadboard's internal metal strips, including intermediate columns used to join two kit jumpers. Every jumper endpoint has a visible strip; hover over a strip or select a jumper to see the exact connected holes and parts. Orange rings and a connection status flag unconnected ends in manually edited wiring. Generated layouts reject reused holes, isolated wires, and unconnected ends, and omit unused relay branches. Older Lab layouts are rerouted on reload; inconsistent saved connections are regenerated from the schematic.

Breadboard jumpers cannot cross, touch, or overlap other jumpers, even on the same electrical net. Routing checks both existing wires and all segments of a proposed route. Manual wire drawing rejects intersections, generated plans are checked before display, and older crossing layouts are regenerated when reopened. Dashed internal metal-strip indicators are not jumper wires.

## Interactive parts and display

LED and diode A terminals are anodes; B terminals are cathodes. In Workspace, Run calculates conduction; an LED schematic turns red above 0.1 mA. Add a series resistor. These approximate models support DC and transient analysis; unsupported AC and symbolic Homework requests produce an explanation.

The potentiometer is wired as a two-terminal rheostat, rather than a three-terminal divider. Set maximum resistance and adjust the wiper slider in Properties. Its minimum modeled resistance is 1 milliohm. Pushbuttons are normally open: hold the Properties button with pointer, Space, or Enter to close, and release to reopen. DC results update while pressing and releasing. Switches retain their existing latching open/closed control. Saved/exported pushbuttons always return to the released state.

The breadboard layout keeps a readable Components column; long lists scroll vertically on desktop and horizontally on mobile. Toolbar icons use inline SVG rather than uncommon font glyphs. Shared interactive-device predicates, symbols, and resistance calculations live in devices.js.
