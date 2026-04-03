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
  unslop.configs?.["recommended"],
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
      ".dependency-cruiser.cjs",
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
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "import-x": importX,
    },
    rules: {
      "unslop/read-friendly-order": "error",
      "unslop/no-false-sharing": [
        "error",
        {
          mode: "dir",
          dirs: [{ path: "utils" }, { path: "ui/components" }],
        },
      ],
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
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: String.raw`^\.\./`,
              message:
                "Parent imports (../) are forbidden under src/. Use @/ aliases or ./ local imports.",
            },
          ],
        },
      ],
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

  // main.ts: null required by Electron API; top-level await unsupported in CJS build format
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
