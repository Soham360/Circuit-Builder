# Vendored algebra library

- Package: nerdamer 2.0.0
- Source: https://registry.npmjs.org/nerdamer/-/nerdamer-2.0.0.tgz
- Project: https://github.com/jiggzson/nerdamer
- Copied browser bundle: package/dist/bundle.js → nerdamer.js
- Bundle notices: bundle.js.LICENSE.txt (includes decimal.js)
- License: MIT; Nerdamer license text retained in NERDAMER-LICENSE.txt

No CDN or network calls are used by the homework solver. The wrapper is in ../homework.js. Rational operations keep expanded polynomial numerators and denominators and factor them before cancellation; no general heuristic simplifier is used for circuit arithmetic.
