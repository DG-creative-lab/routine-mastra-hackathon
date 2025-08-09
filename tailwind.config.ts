import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sun:   { 50:"#FFF8E1", 100:"#FFEAB3", 200:"#FFD86E", 300:"#FFC63B", 400:"#FFB300", 500:"#F4A100" },
        ink:   { 700:"#1f2937", 800:"#111827", 900:"#0b0f19" },
        leaf:  { 400:"#33D78F" },
        sky:   { 400:"#38bdf8", 500:"#0ea5e9" }
      },
      fontFamily: {
        display: ["Poppins", "ui-sans-serif", "system-ui"],
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        soft: "0 10px 40px rgba(17,24,39,0.08)",
      },
      keyframes: {
        float: { "0%,100%": { transform:"translateY(0)" }, "50%": { transform:"translateY(-6px)" } },
        wave:  { "0%": { transform:"rotate(0deg)" }, "50%": { transform:"rotate(8deg)" }, "100%": { transform:"rotate(0deg)" } },
        blob:  { "0%": { borderRadius:"60% 40% 55% 45%/45% 55% 45% 55%" },
                 "50%":{ borderRadius:"40% 60% 45% 55%/60% 40% 60% 40%" },
                 "100%":{borderRadius:"60% 40% 55% 45%/45% 55% 45% 55%"} }
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        wave: "wave 2.2s ease-in-out infinite",
        blob: "blob 12s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;