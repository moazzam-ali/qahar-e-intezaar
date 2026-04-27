/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FFFCF5",
          100: "#FBF6EE",
          200: "#E8E0D2",
        },
        ink: {
          900: "#2A2520",
          700: "#6B6358",
          500: "#A89F90",
        },
        terracotta: "#B8826B",
        // Dark variants
        night: {
          900: "#1A1612",
          800: "#221D17",
          700: "#332B22",
        },
      },
      fontFamily: {
        serif: ["Fraunces_350Light", "Fraunces", "serif"],
        sans: ["Inter_400Regular", "Inter", "sans-serif"],
        sansMedium: ["Inter_500Medium", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
