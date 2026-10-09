import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1e1b3a",
        grape: { 50: "#f4f1ff", 100: "#e9e3ff", 200: "#d4c8ff", 400: "#9b82ff", 500: "#7c5cff", 600: "#6540f0", 700: "#5230c9" },
        coral: { 100: "#ffe4dc", 400: "#ff8a6b", 500: "#ff6b47", 600: "#e5502c" },
        mint: { 100: "#d9f8ec", 400: "#3ddc97", 500: "#1fc47f", 600: "#14a066" },
        sun: { 100: "#fff4cc", 400: "#ffcc33", 500: "#ffb800", 600: "#e09e00" },
        sky2: { 100: "#dff1ff", 500: "#2fa8ff", 600: "#1689e0" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        pop: { "0%": { transform: "scale(.8)", opacity: "0" }, "60%": { transform: "scale(1.06)", opacity: "1" }, "100%": { transform: "scale(1)" } },
        shake: { "0%,100%": { transform: "translateX(0)" }, "20%,60%": { transform: "translateX(-8px)" }, "40%,80%": { transform: "translateX(8px)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        slideup: { "0%": { transform: "translateY(100%)" }, "100%": { transform: "translateY(0)" } },
        pulseglow: { "0%,100%": { boxShadow: "0 0 0 0 rgba(124,92,255,.45)" }, "50%": { boxShadow: "0 0 0 14px rgba(124,92,255,0)" } },
      },
      animation: {
        pop: "pop .35s ease-out both",
        shake: "shake .4s ease-in-out",
        float: "float 3s ease-in-out infinite",
        slideup: "slideup .25s ease-out both",
        pulseglow: "pulseglow 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
