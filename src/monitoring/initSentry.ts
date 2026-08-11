// Side-effect module: importing it starts crash reporting.
//
// This exists because `import` statements are hoisted. A bare `initSentry()`
// call in the body of index.js would run only after every module index.js
// imports has already been evaluated — including App.tsx, which does real work
// at module scope (the AppState focus listener, the AdMob initialize call). An
// import evaluated first is the only way to be genuinely first.
//
// Keep it as the first import in index.js, above every other one.

import { initSentry } from './sentry';

initSentry();
