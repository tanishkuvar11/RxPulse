import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    // The repo lives under a path containing "#" (Windows). Node's realpath
    // resolution would otherwise unwrap a junction back to that literal path and
    // break Rollup's relative-import resolution (a "#" is a URL fragment
    // separator). Keeping the given path avoids the realpath round-trip.
    preserveSymlinks: true,
  },
});
