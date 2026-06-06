import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    // Node scripts at project root
    "check-deploy.js",
    "ruler-test.js",
    // Temporary worktrees and coverage
    ".claude/**",
    "coverage/**",
    // Playwright artifacts
    "test-results/**",
    "playwright-report/**",
  ]),
  {
    // Allow intentionally-unused identifiers prefixed with "_"
    // (e.g. omit-via-rest destructuring: `const { dataSet: _removed, ...rest } = state`).
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
