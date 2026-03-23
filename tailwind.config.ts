import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50:  "#f0f7ee",
          100: "#daefd5",
          200: "#b5dfac",
          300: "#84c87a",
          400: "#57ae4a",
          500: "#3a9130",
          600: "#2b7424",
          700: "#235c1e",
          800: "#1e4a1a",
          900: "#183d16",
        },
        earth: {
          50:  "#faf6f1",
          100: "#f3eade",
          200: "#e6d4bc",
          300: "#d4b793",
          400: "#c09468",
          500: "#a97a4f",
          600: "#8d6340",
          700: "#724f35",
          800: "#5e422e",
          900: "#4f3828",
        },
        sky: {
          50:  "#f0f9ff",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
        },
      },
      fontFamily: {
        sans: ["var(--font-noto)", "Noto Sans JP", "sans-serif"],
        display: ["var(--font-zen)", "Zen Kaku Gothic New", "sans-serif"],
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease forwards",
        "pulse-gentle": "pulseGentle 2s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGentle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
