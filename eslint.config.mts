import { fixupPluginRules } from "@eslint/compat";
import { globalIgnores } from "eslint/config";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import next from "@next/eslint-plugin-next";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  globalIgnores([
    ".next/**",
    "out/**",
    "public/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    ".netlify/**",
    ".vercel/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    ".remember/**",
  ]),

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // Main configuration
  {
    plugins: {
      // react and jsx-a11y still call context APIs removed in ESLint 10
      react: fixupPluginRules(react),
      "react-hooks": reactHooks,
      "jsx-a11y": fixupPluginRules(jsxA11y),
      "@next/next": next as any,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,

      // Unused imports/variables
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unused-expressions": "warn",

      // React
      "react/function-component-definition": ["warn", { namedComponents: "arrow-function" }],
      "react/no-danger": "error",
      "react/prop-types": "off",
      "react/jsx-props-no-spreading": "off",
      "react/no-unescaped-entities": "off",
      "react/require-default-props": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/exhaustive-deps": "off",

      // TypeScript
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",

      // General rules
      "no-console": "error",

      // Accessibility rules
      "jsx-a11y/label-has-associated-control": [
        "error",
        {
          controlComponents: ["Cascader", "Checkbox", "Input", "InputNumber", "Radio", "Select", "Slider", "Switch"],
          depth: 3,
        },
      ],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // Override for Node.js config files
  {
    files: ["**/*.config.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  prettier,
);
