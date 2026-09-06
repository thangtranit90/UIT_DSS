import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FFFFFF",
        surface: "#F6F7F9",
        surface2: "#EEF0F4",
        border: "#E4E7EC",
        ink: "#0E1220",
        muted: "#667085",
        faint: "#98A2B3",
        accent: "#4F46E5",
        accentDark: "#3B34C4",
        accentSoft: "#EEEDFC",
        success: "#12B76A",
        successSoft: "#E7F7EF",
        warning: "#F79009",
        danger: "#F04438",
      },
      fontFamily: {
        head: ["var(--font-head)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "16px" },
    },
  },
  plugins: [],
};

export default config;
