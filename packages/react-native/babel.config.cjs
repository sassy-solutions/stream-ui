/**
 * Babel preset for jest-expo: keep this file in CommonJS so Jest's
 * runner can `require()` it without an extra hop.
 */
module.exports = {
  presets: ['babel-preset-expo'],
};
