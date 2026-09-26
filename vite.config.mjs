import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  logLevel: "error",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  server: {
    allowedHosts: 'all',
    host: '0.0.0.0',
  },
})
