// ESLint flat config for the whole monorepo. Run with `npm run lint`.
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/dev-dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      // Prisma 7 generates its client as TypeScript into the API's source tree.
      "apps/api/src/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow intentionally unused args/vars when prefixed with "_".
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ["apps/api/**/*.ts", "**/*.config.{ts,mjs,js}", "**/vite.config.ts"],
    languageOptions: { globals: globals.node },
  },
);
