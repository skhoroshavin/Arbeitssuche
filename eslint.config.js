import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import checkFile from "eslint-plugin-check-file";

// =============================================================================
// Layer architecture
// =============================================================================
//
// src/utils/          — shared utilities (self-contained)
// src/plugins/        — external service interfaces
// src/models/         — domain types
// src/repositories/   — data access
// src/services/       — business logic
// src/app/            — Electron main process
// src/ui/             — renderer (React), has its own sub-layer rules below

const ALL_LAYERS = ["utils", "plugins", "models", "repositories", "services", "app"];
const BACKEND_LAYERS = ["plugins", "repositories", "services"];

// What each layer may import via @/ paths.
// Example: plugins/ can use @/plugins and @/utils, nothing else.
const ALLOWED_IMPORTS = {
  utils: ["utils"],
  plugins: ["plugins", "utils"],
  models: ["models"],
  repositories: ["models", "repositories", "utils"],
  services: ["models", "plugins", "repositories", "services", "utils"],
  app: ["models", "plugins", "repositories", "services", "app", "utils"],
};

const FORBID_RELATIVE_PARENT = {
  group: ["../*"],
  message: "Use @/ path alias instead of relative ../ imports",
};

// Backend modules expose only index.ts and types.ts for cross-module imports.
//   ✓ @/plugins/llm/openrouter/index.js   ✓ @/plugins/llm/types.js
//   ✗ @/plugins/llm/openrouter/models.js  (internal file)
//
// Patterns use *.js to match files only — ESLint's no-restricted-imports uses
// the `ignore` package (gitignore semantics) where matching a bare directory
// also matches all its contents, making negation impossible.
function indexAndTypesOnly(layers) {
  return {
    group: [
      ...layers.flatMap((l) => [`@/${l}/*/*.js`, `@/${l}/*/*/*.js`]),
      ...layers.flatMap((l) => [
        `!@/${l}/*/index.js`,
        `!@/${l}/*/types.js`,
        `!@/${l}/*/*/index.js`,
        `!@/${l}/*/*/types.js`,
      ]),
    ],
    message: "Import from index.js or types.js only",
  };
}

// Import restriction patterns for a layer: forbidden layers + module boundaries.
function layerPatterns(layer) {
  const allowed = ALLOWED_IMPORTS[layer];
  const forbidden = ALL_LAYERS.filter((l) => !allowed.includes(l));
  const patterns = [FORBID_RELATIVE_PARENT];

  if (forbidden.length > 0) {
    patterns.push({
      group: forbidden.flatMap((l) => [`@/${l}`, `@/${l}/**`]),
      message: `${layer}/ may only import from: ${allowed.map((l) => `@/${l}`).join(", ")}`,
    });
  }

  const backendAllowed = allowed.filter((l) => BACKEND_LAYERS.includes(l));
  if (backendAllowed.length > 0) {
    patterns.push(indexAndTypesOnly(backendAllowed));
  }

  return patterns;
}

function layerRule(layer) {
  return {
    files: [`src/${layer}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": ["error", { patterns: layerPatterns(layer) }],
    },
  };
}

// Backend test files: same layer restrictions + black-box imports only.
//   ✓ ./index.js  ✓ ./types.js  ✓ ./foo.test-suite.js
//   ✗ ./scan.js   ✗ ./helpers/bar.js
function testRule(layer) {
  return {
    files: [
      `src/${layer}/**/*.test.ts`,
      `src/${layer}/**/*.integration-test.ts`,
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...layerPatterns(layer),
            {
              group: [
                "./**",
                "!./index.js",
                "!./types.js",
                "!./*.test-suite.js",
              ],
              message: "Tests must import only from index.js or types.js",
            },
          ],
        },
      ],
    },
  };
}

// =============================================================================
// UI sub-layer rules
// =============================================================================
//
// All UI sub-layers may import @/models. No other backend layers.
// Each sub-layer declares which OTHER UI sub-layers it may use.
// hooks/internal/ is private to hooks/ — blocked everywhere else.

const PAGE_GROUPS = ["applicant", "job-search", "settings"];
const UI_SUBLAYERS = [
  "components",
  "hooks",
  "data",
  "layout",
  "pages",
  "constants",
];

// UI files cannot import from backend layers (except @/models).
const UI_BACKEND_BLOCKED = ALL_LAYERS.filter((l) => l !== "models").flatMap(
  (l) => [`@/${l}`, `@/${l}/**`],
);

// Build UI rule from an allow-list.
// Example: uiSubLayerRule("components", ["hooks"])
//   → components/ may import @/models and @/ui/hooks, nothing else.
function uiSubLayerRule(subLayer, allowedUi) {
  const blockedUi = UI_SUBLAYERS.filter(
    (u) => u !== subLayer && !allowedUi.includes(u),
  ).flatMap((u) => [`@/ui/${u}`, `@/ui/${u}/**`]);

  if (subLayer !== "hooks") {
    blockedUi.push("@/ui/hooks/internal", "@/ui/hooks/internal/**");
  }

  const allowed = ["@/models", ...allowedUi.map((u) => `@/ui/${u}`)].join(
    ", ",
  );

  return {
    files: [`src/ui/${subLayer}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            FORBID_RELATIVE_PARENT,
            {
              group: [...UI_BACKEND_BLOCKED, ...blockedUi],
              message: `ui/${subLayer}/ may only import from: ${allowed}`,
            },
          ],
        },
      ],
    },
  };
}

const uiRules = [
  // Sub-layer      Allowed UI imports
  uiSubLayerRule("components", ["hooks"]),
  uiSubLayerRule("hooks", []),
  uiSubLayerRule("data", ["hooks"]),
  uiSubLayerRule("layout", ["components", "hooks"]),

  // Pages: full UI access, but no sibling page groups or hooks/internal
  ...PAGE_GROUPS.map((group) => ({
    files: [`src/ui/pages/${group}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            FORBID_RELATIVE_PARENT,
            {
              group: [
                ...UI_BACKEND_BLOCKED,
                ...PAGE_GROUPS.filter((g) => g !== group).flatMap((g) => [
                  `@/ui/pages/${g}`,
                  `@/ui/pages/${g}/**`,
                ]),
                "@/ui/hooks/internal",
                "@/ui/hooks/internal/**",
              ],
              message: `ui/pages/${group}/ must not import from sibling page groups`,
            },
          ],
        },
      ],
    },
  })),
];

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
    rules: {
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

  // Layer + test rules
  ...ALL_LAYERS.map(layerRule),
  ...BACKEND_LAYERS.map(testRule),

  // UI sub-layer rules
  ...uiRules,

  // Export restrictions: job-site plugins may only export create*Site + SUPPORTED_MODES
  {
    files: ["src/plugins/job-site/*/index.ts"],
    ignores: ["src/plugins/job-site/stub/index.ts"],
    rules: {
      "no-restricted-exports": [
        "error",
        {
          restrictedNamedExportsPattern:
            "^(?!create[A-Z]\\w*Site$|SUPPORTED_MODES$)",
        },
      ],
    },
  },

  // Export restrictions: module index.ts may only export create*, derive*, get*, PascalCase
  {
    files: [
      "src/plugins/*/index.ts",
      "src/repositories/*/index.ts",
      "src/services/*/index.ts",
    ],
    rules: {
      "no-restricted-exports": [
        "error",
        {
          restrictedNamedExportsPattern:
            "^(?!create[A-Z]|derive[A-Z]|get[A-Z]|[A-Z])",
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
