import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./content.ts"],
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
      },
    },
  },
  plugins: [],
};
export default config;
