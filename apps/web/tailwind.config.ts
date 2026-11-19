import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        wine: "#4A1830",
        rose: "#B76E79",
        champagne: "#D8C3A5",
        ivory: "#FAF7F2",
        ink: "#211820",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        sans: ["Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
