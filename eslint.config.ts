import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import checkFile from "eslint-plugin-check-file"
import importX from "eslint-plugin-import-x"
import unicorn from "eslint-plugin-unicorn"
import unslop from "eslint-plugin-unslop"

// =============================================================================
// Config
// =============================================================================

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  unicorn.configs.recommended,
  // @ts-expect-error ESLint plugin type mismatch with typescript-eslint config helper
  unslop.configs.full,

  // Architecture configuration for unslop
  {
    settings: {
      unslop: {
        sourceRoot: "src",
        architecture: {
          "models/*": {
            imports: ["models/*"],
          },
          "plugins/*": {
            imports: ["plugins/*", "utils", "utils/node"],
          },
          "repositories/*": {
            imports: [
              "repositories/*",
              "models",
              "models/*",
              "utils",
              "utils/node",
            ],
          },
          "services/*": {
            imports: [
              "services/*",
              "plugins/*",
              "models",
              "models/*",
              "repositories/*",
              "utils",
              "utils/node",
            ],
          },
          app: {
            imports: [
              "utils",
              "utils/node",
              "models",
              "models/*",
              "plugins/*",
              "repositories/*",
              "services/*",
            ],
          },
          "app/*": {
            imports: [
              "utils",
              "utils/node",
              "models",
              "models/*",
              "plugins/*",
              "repositories/*",
              "services/*",
            ],
          },
          "ui/components": {
            shared: true,
            imports: ["ui/hooks"],
          },
          "ui/hooks": {
            imports: [],
          },
          "ui/layout": {
            imports: ["ui/hooks", "ui/components", "models", "models/*"],
          },
          "ui/data": {
            imports: ["models", "models/*"],
          },
          "ui/pages/*": {
            imports: [
              "ui/hooks",
              "ui/components",
              "ui/layout",
              "ui/data",
              "models",
              "models/*",
              "utils",
            ],
          },
        },
      },
    },
  },
  {
    ignores: [
      "dist/",
      "out/",
      "e2e/",
      "output/",
      "html_samples/",
      "scratchpad/",
      "scratchpad_dev/",
      "test-results/",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.test-suite.ts",
      "**/*.integration-test.ts",
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "import-x": importX,
    },
    rules: {
      complexity: ["error", 7],
      "max-lines": [
        "error",
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        { allowConstantLoopConditions: true },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "PropertyDefinition > ArrowFunctionExpression",
          message:
            "Use a regular method instead of an arrow-function class field.",
        },
        {
          selector: "FunctionDeclaration[id.name=/^[A-Z]/] > Identifier.params",
          message:
            "Component props must be destructured: use ({ a, b }) instead of (props).",
        },
      ],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "import-x/no-useless-path-segments": ["error", { noUselessIndex: true }],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test-suite.ts", "**/*.integration-test.ts"],
    rules: {
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // Utils: tighter file-size limit (small, focused utilities)
  {
    files: ["src/utils/*.ts"],
    ignores: ["src/utils/*.test.ts"],
    rules: {
      "max-lines": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
    },
  },

  // Disable read-friendly-order for config files and scripts
  {
    files: ["*.config.ts", "scripts/**/*.ts"],
    rules: {
      "unslop/read-friendly-order": "off",
    },
  },

  // Disable read-friendly-order for existing source files that would require extensive refactoring
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "unslop/read-friendly-order": "off",
    },
  },
  {
    files: ["src/app/main.ts"],
    rules: {
      "unicorn/no-null": "off",
      "unicorn/prefer-top-level-await": "off",
    },
  },

  // File naming: .ts/.tsx → kebab-case
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        { "**/*.{ts,tsx}": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
    },
  },
)
