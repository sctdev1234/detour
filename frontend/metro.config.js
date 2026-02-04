// metro.config.cjs
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Force Metro to avoid resolving ESM "exports" entrypoints that may contain import.meta
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
