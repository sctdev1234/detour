/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#18181b', // zinc-900
                    dark: '#ffffff', // white for dark mode
                },
                secondary: {
                    DEFAULT: '#10b981', // emerald-500
                    dark: '#34d399', // emerald-400
                },
                background: {
                    DEFAULT: '#fafafa', // zinc-50
                    dark: '#09090b', // zinc-950
                },
                surface: {
                    DEFAULT: '#ffffff', // white
                    dark: '#18181b', // zinc-900
                },
                destructive: {
                    DEFAULT: '#f43f5e', // rose-500
                    dark: '#fb7185', // rose-400
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
