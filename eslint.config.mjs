import typescriptParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
    ...obsidianmd.configs.recommended,
    {
        ignores: ["main.js", "dist/**", "node_modules/**", "*.d.ts"],
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: typescriptParser,
            globals: globals.browser,
            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
    {
        files: ["package.json"],
        rules: {
            "depend/ban-dependencies": "off",
        },
    },
]);
