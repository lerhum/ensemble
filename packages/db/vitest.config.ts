import { defineConfig, coverageConfigDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      exclude: [...coverageConfigDefaults.exclude, "src/migrate.ts", "src/seed.ts"],
    },
  },
});
