import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import globals from "globals";

export default [
    // Ignore paths (replaces deprecated .eslintignore)
    {
        ignores: [
            "dist/**",
            "app/dist/**",
            "coverage/**",
            "src-tauri/target/**",
            "node_modules/**",
        ],
    },

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
                {
                    singleQuote: false,
                    jsxSingleQuote: false,
                    tabWidth: 4,
                    useTabs: false,
                },
            ],
        },
    },

    // Tests (Vitest)
    {
        files: [
            "app/tests/**/*.{ts,tsx}",
            "app/src/**/*.test.{ts,tsx}",
            "app/src/**/__tests__/**/*.{ts,tsx}",
        ],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                vi: "readonly",
                describe: "readonly",
                it: "readonly",
                expect: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
            },
        },
        plugins: { "@typescript-eslint": typescript, prettier },
        rules: {
            ...typescript.configs.recommended.rules,
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "prettier/prettier": ["error", { tabWidth: 4, useTabs: false }],
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
            "prettier/prettier": ["error", { tabWidth: 4, useTabs: false }],
        },
    },

    // Node runtime scripts (CommonJS)
    {
        files: ["scripts/**/*.cjs"],
        languageOptions: {
            parserOptions: { ecmaVersion: "latest", sourceType: "script" },
            globals: { ...globals.node, console: "readonly" },
        },
        rules: {
            // keep defaults; just provide node globals so no-undef doesn't fire
        },
    },

    // Base JS
    js.configs.recommended,
];
