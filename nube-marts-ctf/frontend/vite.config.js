import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  build: {
    // OSINT: source maps are shipped to production so the original,
    // un-minified source (including the comments below) is recoverable.
    sourcemap: true,
    minify: false,
  },
});
