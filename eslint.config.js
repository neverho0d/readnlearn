import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import globals from "globals";

export default [
  // Ignore paths (replaces deprecated .eslintignore)
  { ignores: ["dist/**", "node_modules/**"] },

  // App/browser code
  {
    files: ["app/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser }, // document, window, HTMLElement, localStorage, alert, setTimeout
    },
    plugins: { "@typescript-eslint": typescript, prettier },
    rules: {
      ...typescript.configs.recommended.rules,
      // Prefer TS rule and silence base one
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "prettier/prettier": [
        "error",
        { singleQuote: false, jsxSingleQuote: false },
      ],
    },
  },

  // Node/config files
  {
    files: ["vite.config.ts", "vitest.config.ts", "eslint.config.js"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
      globals: { ...globals.node }, // __dirname, process, etc.
    },
    plugins: { "@typescript-eslint": typescript, prettier },
    rules: {
      ...typescript.configs.recommended.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "prettier/prettier": "error",
    },
  },

  // Base JS
  js.configs.recommended,
];
