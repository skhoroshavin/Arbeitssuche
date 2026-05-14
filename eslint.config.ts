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
        architecture: {
          utils: {
            shared: true,
          },
          "models/*": {
            imports: ["models/+"],
          },
          "plugins/*": {
            imports: ["plugins/*", "utils/+"],
          },
          "repositories/*": {
            imports: ["repositories/+", "models/+", "utils/+"],
          },
          "services/*": {
            imports: ["repositories/+", "plugins/+", "models/+", "utils/+"],
          },
          "services/scan-pipeline": {
            imports: [
              "services/site-crawler",
              "services/commute-computer",
              "services/vacancy-enricher",
              "repositories/+",
              "plugins/+",
              "models/+",
              "utils/+",
            ],
          },
          app: {
            imports: [
              "app/+",
              "utils/+",
              "models/+",
              "plugins/+",
              "services/+",
            ],
          },
          "app/*": {
            imports: [
              "app/+",
              "utils/+",
              "models/+",
              "plugins/+",
              "services/+",
            ],
          },
          "app/composition": {
            imports: [
              "app/+",
              "utils/+",
              "models/+",
              "plugins/+",
              "repositories/+",
              "services/+",
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
            imports: ["ui/hooks", "ui/components", "models/+"],
          },
          "ui/data": {
            imports: ["models/+"],
          },
          "ui/views": {
            imports: ["ui/components", "models/+"],
          },
          "ui/views/*": {
            imports: ["ui/views", "ui/components", "models/+"],
          },
          "ui/pages/*": {
            imports: [
              "ui/hooks",
              "ui/components",
              "ui/layout",
              "ui/data",
              "ui/views/+",
              "models/+",
              "utils",
            ],
          },
          e2e: {
            imports: ["e2e/helpers/+", "e2e/pages/+"],
            entrypoints: ["fixtures.ts", "electron-fixtures.ts"],
          },
          "e2e/pages": {
            imports: ["e2e/pages/+"],
            entrypoints: [
              "index.ts",
              "applicant-list.page.ts",
              "applicant.page.ts",
              "first-start.page.ts",
              "job-search.page.ts",
              "layout.page.ts",
              "settings.page.ts",
            ],
          },
          "e2e/helpers": {
            imports: ["e2e/helpers/+", "e2e/pages/+", "services/+"],
            entrypoints: [
              "electron-api-helper.ts",
              "live-e2e-setup.ts",
              "live-flow-helper.ts",
              "first-start-helper.ts",
              "assertions.ts",
              "resume-renderer-helper.ts",
            ],
          },
          "e2e/tests-flow": {
            imports: ["e2e/helpers/+", "e2e/pages/+", "e2e/+"],
          },
          "e2e/tests-templates": {
            imports: ["e2e/helpers/+", "e2e/pages/+", "e2e/+"],
          },
        },
      },
    },
  },
  {
    ignores: [
      "dist/",
      "out/",
      "output/",
      "html_samples/",
      "scratchpad/",
      "scratchpad_dev/",
      "test-results/",
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

  // Test files: strictest complexity rule (unit/integration)
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/*.integration-test.ts",
      "**/*.test-suite.ts",
    ],
    ignores: ["e2e/**/*"],
    rules: {
      complexity: ["error", 2],
    },
  },

  // E2E test specs: simplest possible (flat describe/test blocks)
  {
    files: ["e2e/tests-*/**/*.spec.ts"],
    rules: {
      complexity: ["error", 1],
    },
  },

  // E2E helpers, pages, fixtures: allow moderate complexity for setup
  {
    files: [
      "e2e/helpers/**/*.ts",
      "e2e/pages/**/*.ts",
      "e2e/electron-fixtures.ts",
      "e2e/fixtures.ts",
    ],
    rules: {
      complexity: ["error", 4],
    },
  },

  // Disable read-friendly-order for config files and scripts, and e2e helpers/pages
  {
    files: ["*.config.ts", "scripts/**/*.ts", "e2e/**/*.ts"],
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

  // E2E tests: relax rules appropriate for Playwright-based test code
  {
    files: ["e2e/**/*.ts"],
    rules: {
      "unicorn/no-null": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/import-style": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/require-await": "off",
      "no-empty-pattern": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
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
