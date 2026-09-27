import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import globals from "globals";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated/external files
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    // Crawler: fixtures are captured portal HTML/JSON snapshots — noisy, keep
    // ignored. capture-fixture.ts is one-off dev capture infra, also ignored.
    // Other crawler/scripts/** files (e.g. crawl-all.ts) are real production
    // entrypoints and ARE linted, via the crawler/**/*.ts block below.
    "crawler/fixtures/**",
    "crawler/scripts/capture-fixture.ts",
  ]),
  // I8 — scoped lint for the crawler subsystem (was a blanket ignore).
  {
    files: ["crawler/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 2021, sourceType: "module" },
      globals: { ...globals.node, ...globals.jest },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "prefer-const": "warn",
      "no-var": "error",
      eqeqeq: ["warn", "smart"],
    },
  },
]);

export default eslintConfig;
