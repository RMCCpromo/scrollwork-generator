import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// IMPORTANT: If your repo is named something else, change the base path below
export default defineConfig({
  plugins: [react()],
  base: "/scrollwork-generator/"
});