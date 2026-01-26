const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure proper resolution of ESM packages
config.resolver.sourceExts.push('mjs');

module.exports = config;
