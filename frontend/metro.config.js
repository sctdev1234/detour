// metro.config.cjs
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Force Metro to avoid resolving ESM "exports" entrypoints that may contain import.meta
config.resolver.unstable_enablePackageExports = false;

// Force axios to resolve to the browser build (no node core modules)
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "axios") {
        return context.resolveRequest(context, "axios/dist/browser/axios.cjs", platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config);
