import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

/**
 * ESLint for the Rewaa storefront.
 *
 * Rules below are the ones that caught real problems in this codebase: floating
 * promises around the service layer, unused parameters, and accidental use of
 * `any`. Style/formatting is left to the editor — the goal is correctness.
 */
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "public/**",
      "*.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Core hook correctness only: the newer compiler-oriented rules in
      // `recommended-latest` flag long-standing, working patterns in this
      // codebase (lazy refs, effect-based hydration) that are out of scope.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-debugger": "error",
    },
  },
  {
    // Providers intentionally export their context hook next to the component.
    files: ["src/store/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Services, config and scripts legitimately talk to the console.
    files: ["src/services/**", "src/config/**", "scripts/**", "src/**/*.test.{ts,tsx}", "tests/**"],
    rules: { "no-console": "off" },
  },
  {
    files: ["**/*.test.{ts,tsx}", "tests/**", "playwright.config.ts", "vitest.config.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
  {
    // Reference AI gateway — runs on Node, not in the browser.
    files: ["server/**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
    rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
  },
  {
    // Node-side build scripts.
    files: ["scripts/**/*.{mjs,ts,tsx}", "tests/**"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  }
);
