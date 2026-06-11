const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// pdf-lib bundles against tslib@1.x CJS helpers. The root tslib@2.x ESM build
// breaks on web with: "Cannot destructure property '__extends' of 'tslib.default'".
config.resolver.extraNodeModules = {
  tslib: path.join(__dirname, 'node_modules', 'pdf-lib', 'node_modules', 'tslib'),
};

module.exports = config;
