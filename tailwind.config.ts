import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: "#f59e0b",
          dark: "#0c0f14",
          darker: "#080a0f",
          card: "#1a1f2e",
          border: "#2a2f3e",
        },
        score: {
          high: "#059669",
          mid: "#2563eb",
          low: "#d97706",
          none: "#6b7280",
        },
      },
    },
  },
  plugins: [],
};

export default config;
