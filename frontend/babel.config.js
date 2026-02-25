module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            // Ensure reanimated plugin is listed last if used
            'react-native-reanimated/plugin',
        ],
    };
};
