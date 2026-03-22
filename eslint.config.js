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
  ["\u202F", "narrow no-break space"],
  ["\u2007", "figure space"],
  ["\u2008", "punctuation space"],
  ["\u2009", "thin space"],
  ["\u200A", "hair space"],
  ["\u200B", "zero-width space"],
  ["\u2002", "en space"],
  ["\u2003", "em space"],
  ["\u205F", "medium mathematical space"],
  ["\u3000", "ideographic space"],
  ["\uFEFF", "zero-width no-break space"],
  ["\u2013", "en dash"],
  ["\u2014", "em dash"],
  ["\u2026", "horizontal ellipsis"],
]);
const BANNED_CHARS_RE = new RegExp([...BANNED_CHARS.keys()].join("|"));
const UNICODE_ESCAPE_RE = /\\u[0-9a-fA-F]{4}/;

// Extracts the string text from a Literal or TemplateLiteral AST node.
// `useRaw` returns the source representation (preserving \uXXXX escapes);
// otherwise returns the decoded JS value.
function getStringValue(node, useRaw) {
  if (node.type === "TemplateLiteral") {
    return node.quasis.map((q) => q.value.raw).join("");
  }
  return typeof node.value === "string" ? (useRaw ? node.raw : node.value) : null;
}

const noSpecialUnicode = {
  rules: {
    "no-special-unicode": {
      meta: { type: "problem" },
      create(context) {
        function check(node) {
          const text = getStringValue(node, false);
          if (text === null || !BANNED_CHARS_RE.test(text)) return;
          for (const [char, name] of BANNED_CHARS) {
            if (text.includes(char)) {
              context.report({ node, message: `String contains ${name} (U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}). Use the ASCII equivalent.` });
            }
          }
        }
        return { Literal: check, TemplateLiteral: check };
      },
    },
    "no-unicode-escape": {
      meta: { type: "suggestion" },
      create(context) {
        function check(node) {
          const text = getStringValue(node, true);
          if (text === null) return;
          if (UNICODE_ESCAPE_RE.test(text)) {
            context.report({ node, message: "Use the actual character instead of a \\uXXXX escape sequence." });
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
      "custom/no-unicode-escape": "error",
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
