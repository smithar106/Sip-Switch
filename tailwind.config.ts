import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        accent: {
          DEFAULT: "#C8A96E",
          light: "#D4B97E",
          dark: "#B8995E",
        },
        card: "rgba(255,255,255,0.05)",
        "card-border": "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "20px",
        button: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
