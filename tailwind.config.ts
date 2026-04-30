import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2937",
        line: "#d3d7df",
        paper: "#f6f1e7",
        accent: {
          50: "#eef7f3",
          100: "#d9eee4",
          500: "#21785d",
          600: "#165944",
        },
        sky: {
          50: "#f2f8fb",
          100: "#dbeaf1",
          500: "#4f8092",
          700: "#2c5360",
        },
        amberline: "#d2a551",
      },
      fontFamily: {
        sans: [
          "\"Noto Sans KR\"",
          "\"Pretendard\"",
          "\"Apple SD Gothic Neo\"",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        panel: "0 18px 38px rgba(22, 32, 51, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
