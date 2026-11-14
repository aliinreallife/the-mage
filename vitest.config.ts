import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so the single-file build plugins stay out of tests.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    testTimeout: 60000,
  },
});
