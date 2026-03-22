import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import checkFile from "eslint-plugin-check-file";

// =============================================================================
// Custom plugins
// =============================================================================

const BANNED_CHARS = new Map([
  ["\u201C", "left double quotation mark"],
  ["\u201D", "right double quotation mark"],
  ["\u2018", "left single quotation mark"],
  ["\u2019", "right single quotation mark"],
  ["\u00A0", "non-breaking space"],
  ["\u2013", "en dash"],
  ["\u2014", "em dash"],
  ["\u2026", "horizontal ellipsis"],
]);

const noSpecialUnicode = {
  rules: {
    "no-special-unicode": {
      meta: { type: "problem" },
      create(context) {
        function check(node) {
          const raw = node.type === "TemplateLiteral"
            ? node.quasis.map((q) => q.value.raw).join("")
            : typeof node.value === "string"
              ? node.value
              : null;
          if (raw === null) return;
          for (const [char, name] of BANNED_CHARS) {
            if (raw.includes(char)) {
              context.report({ node, message: `String contains ${name} (U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}). Use the ASCII equivalent.` });
            }
          }
        }
        return { Literal: check, TemplateLiteral: check };
      },
    },
  },
};

// =============================================================================
// Config
// =============================================================================

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "dist/",
      "out/",
      "e2e/",
      "output/",
      "html_samples/",
      "scratchpad/",
      "scratchpad_dev/",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { custom: noSpecialUnicode },
    rules: {
      "custom/no-special-unicode": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      complexity: ["error", 20],
      "no-restricted-syntax": [
        "error",
        {
          selector: "PropertyDefinition > ArrowFunctionExpression",
          message:
            "Use a regular method instead of an arrow-function class field.",
        },
      ],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "never" },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.integration-test.ts"],
    rules: {
      "@typescript-eslint/consistent-type-assertions": "off",
    },
  },

  // Ban ../ relative imports in src/
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],
              message: "Use @/ path alias instead of relative ../ imports",
            },
          ],
        },
      ],
    },
  },

  // Utils: stricter limits (small, focused utilities)
  {
    files: ["src/utils/*.ts"],
    ignores: ["src/utils/*.test.ts"],
    rules: {
      complexity: ["error", 10],
      "max-lines": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
    },
  },

  // File naming: .ts → kebab-case, .tsx → PascalCase
  {
    files: ["**/*.ts"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        { "**/*.ts": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
    },
  },
  {
    files: ["**/*.tsx"],
    ignores: ["**/main.tsx", "**/layout.tsx"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        { "**/*.tsx": "PASCAL_CASE" },
        { ignoreMiddleExtensions: true },
      ],
    },
  },
);
