# Three.js 0.186.0

Source: the published `three@0.186.0` npm package (https://github.com/mrdoob/three.js).
License: MIT; see LICENSE in this directory.

`three.module.js` and `three.core.js` are unmodified upstream build files.
`OrbitControls.js` comes from `examples/jsm/controls/OrbitControls.js`; its one bare `three` import is changed to the relative `./three.module.js` so the original buildless page works without an external CDN or import map.

To reproduce, install the committed npm lock, copy these two build modules plus LICENSE, copy OrbitControls, and make that single import replacement. The upstream release does not ship minified build filenames.
