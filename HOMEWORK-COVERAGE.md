# Homework 1–4 circuit coverage

Open **Circuit library → Homework 1–4**. All 19 circuit diagrams have editable transcriptions. Opening a course circuit enters Homework and selects a useful target; unknown-value and port problems include their target and measurement. Original PDF files, submission instructions, personal reflection prompts and external video content are not distributed with the app.

| Problem | Supported workflow |
| --- | --- |
| HW1.1 | Time-dependent power and energy: enter sums of exponential terms, compute instantaneous power, finite-interval energy or the integral to Infinity. Current amplitudes are in A. |
| HW1.2 | Power table with chosen references: all eight voltage/current/sign rows are prefilled. This is a terminal-data calculation rather than an assumed internal model of the black boxes. |
| HW1.3 | Editable operating-point model; isolate Vs using the given branch current, then query its power. The two unspecified elements are represented by the resistances inferred from their given V/I data, valid at this operating point. |
| HW1.4 | Isolate V3 from the clockwise 0.20 A resistor current; the sign retains the indicated source polarity. |
| HW1.6 | Independent voltage/current sources, resistor drops, node potentials and signed branch currents. |
| HW2.1 | All branch voltages and powers, KCL and KVL. |
| HW2.2 | Unknown resistor with the 60 V measured resistor drop. |
| HW2.3 | Passive equivalent-resistance reduction and component-voltage queries. |
| HW2.4 | KCL equates the four series resistor currents; KVL sums the four drops and source voltage. Loop report shows equations and values. |
| HW2.5 | Simultaneous node measurements determine Vs and the unspecified R4. R1 is computed from P/I²; R2 is an editable approximately 6.4 kΩ estimate from the scattered plot; R3 is 16 kΩ, gold tolerance ±5%. The answer depends on the estimated slope. |
| HW2.6 | Isolate the signed source current from ia = 4 A; verify ib = 2 A and power balance. A negative result means opposite to the indicated source arrow. |
| HW3.1 | Supernode voltage constraint and independent loop equations with current-source constraints. |
| HW3.2 | All independent sources active, component voltage queries and loop verification. |
| HW3.3 | Eight-resistor reduction and source current / R8 voltage. |
| HW3.4 | Isolate Rdesign using zero bridge current. Rbridge remains unspecified and symbolic; no arbitrary bridge resistance is required to determine the balance. |
| HW3.5 | CCVS controlled by the signed current in the 7.5 Ω branch. |
| HW3.6 | CCCS controlled by id in the 25 Ω branch; all branch currents and loop equations. |
| HW4.1 | Load voltage; automatic load detachment; open voltage, ideal short current, 1 V test resistance, Thévenin/Norton diagrams and loaded verification. |
| HW4.2 | Same port methods with the dependent current source retained during test excitation. RLoad has an editable 2 kΩ demonstration value because the diagram specifies none. Port equivalents do not depend on this value. |
| HW4.3 | Source transformation values, resistor identification and polarity references; full branch and loop report verifies i0 through the 2 Ω resistor. |
| HW4.4 | Same transformation workflow; v0 is the A → B voltage of the 24 kΩ resistor. |

## References and method limits

Components use V(A) − V(B), current A → B and absorbed power VI. Reverse a reported current to match a B → A arrow. Source transformation output states the external terminal reference and replacement connection; apply successive replacements in the editor. Internal quantities do not survive source transformations.

The loop tool constructs a spanning-tree cycle basis. It displays independent loop currents, branch-current combinations, KCL, KVL, resistor/independent-source/CCVS substitutions and independent-current/CCCS constraints. These loops can span multiple faces rather than matching the smallest planar meshes. Current-source voltages appear as additional unknowns; summing loop equations removes them to form supermeshes. Numerical results use the existing MNA solver and are checked against the displayed loop system in tests.

The passive equivalent-resistance tool intentionally disconnects all independent source branches to examine a resistor network. It is distinct from port resistance: the Thévenin/Norton tool sets independent voltage sources to 0 V, sets independent current sources to 0 A, retains dependent sources, and applies a 1 V test source. Its short-circuit current uses an ideal 0 V voltage source.

Simultaneous measurement solving supports up to five undefined component values and eight measurements, under the existing DC circuit size limits. Polynomial elimination requires a linear unknown at each step and a final polynomial of degree at most two. Only one finite physical candidate satisfying every original measurement is accepted. Unsupported or underdetermined systems report an error. Waveform power is analytic for sums of non-growing exponentials, including constants; it is independent of the schematic and does not change the transient-source model.

The general research, I–V sketch, sensor, electron-flow and personal reflection questions do not specify additional circuits to simulate. There is no nonlinear diode simulation or automated homework submission.

## Validation

`tests/homework-coverage.test.mjs` verifies every transcription's endpoint connectivity, finite numerical results, KCL, KVL, power conservation, branch-current reconstruction from loops, and the substituted loop system. It checks design answers, simultaneous measurements and conflicting/insufficient data, waveform integrals, reference signs, source transformations, and both port problems under multiple loads. Existing breadboard tests include all new examples and preserve unknown values during round trips.
