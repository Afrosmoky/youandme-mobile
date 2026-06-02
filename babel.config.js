module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // zod v4 ships `export * as core from ...` (namespace re-export), which the
  // RN preset does not transform on its own. Required for zod to bundle on RN.
  plugins: ['@babel/plugin-transform-export-namespace-from'],
};
