import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import checkFile from "eslint-plugin-check-file";

const ALL_LAYERS = ["plugins", "models", "repositories", "services", "app"];

const ALLOWED_IMPORTS = {
  plugins: ["plugins"],
  models: ["models"],
  repositories: ["models", "repositories"],
  services: ["models", "plugins", "repositories", "services"],
  app: ["models", "plugins", "repositories", "services", "app"],
};

const NO_RELATIVE_PARENT = {
  group: ["../*"],
  message: "Use @/ path alias instead of relative ../ imports",
};

function layerRule(layer) {
  const allowed = ALLOWED_IMPORTS[layer];
  const forbidden = ALL_LAYERS.filter((l) => !allowed.includes(l));
  const patterns = [NO_RELATIVE_PARENT];

  if (forbidden.length > 0) {
    const msg =
      allowed.length > 0
        ? `${layer}/ may only import from: ${allowed.map((l) => `@/${l}`).join(", ")}`
        : `${layer}/ must not use @/ imports`;
    patterns.push({
      group: forbidden.flatMap((l) => [`@/${l}`, `@/${l}/**`]),
      message: msg,
    });
  }

  return {
    files: [`src/${layer}/**/*.{ts,tsx}`],
    rules: {
      "no-restricted-imports": ["error", { patterns }],
    },
  };
}

// --- UI sub-layer rules ---

const UI_CROSS_LAYER = ALL_LAYERS.filter((l) => l !== "models").flatMap((l) => [
  `@/${l}`,
  `@/${l}/**`,
]);

const PAGE_GROUPS = ["applicant", "job-search", "settings"];

function uiRule(files, blocked, msg) {
  return {
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            NO_RELATIVE_PARENT,
            { group: [...UI_CROSS_LAYER, ...blocked], message: msg },
          ],
        },
      ],
    },
  };
}

const uiSubLayerRules = [
  // components/ — pure presentational, may only import from hooks (type-only)
  uiRule(
    ["src/ui/components/**/*.{ts,tsx}"],
    [
      "@/ui/data",
      "@/ui/data/**",
      "@/ui/hooks/internal",
      "@/ui/hooks/internal/**",
      "@/ui/layout",
      "@/ui/layout/**",
      "@/ui/pages",
      "@/ui/pages/**",
      "@/ui/constants",
    ],
    "ui/components/ may only import from: @/models, @/ui/hooks",
  ),

  // hooks/ — self-contained infrastructure
  uiRule(
    ["src/ui/hooks/**/*.{ts,tsx}"],
    [
      "@/ui/components",
      "@/ui/components/**",
      "@/ui/data",
      "@/ui/data/**",
      "@/ui/layout",
      "@/ui/layout/**",
      "@/ui/pages",
      "@/ui/pages/**",
      "@/ui/constants",
    ],
    "ui/hooks/ must not import from other ui sub-layers",
  ),

  // data/ — domain query hooks need model types + IPC primitives
  uiRule(
    ["src/ui/data/**/*.{ts,tsx}"],
    [
      "@/ui/components",
      "@/ui/components/**",
      "@/ui/hooks/internal",
      "@/ui/hooks/internal/**",
      "@/ui/layout",
      "@/ui/layout/**",
      "@/ui/pages",
      "@/ui/pages/**",
      "@/ui/constants",
    ],
    "ui/data/ may only import from: @/models, @/ui/hooks",
  ),

  // layout/ — renders shared components, uses hook types
  uiRule(
    ["src/ui/layout/**/*.{ts,tsx}"],
    [
      "@/ui/data",
      "@/ui/data/**",
      "@/ui/hooks/internal",
      "@/ui/hooks/internal/**",
      "@/ui/pages",
      "@/ui/pages/**",
      "@/ui/constants",
    ],
    "ui/layout/ may only import from: @/models, @/ui/components, @/ui/hooks",
  ),

  // pages/ — full access within ui, but no cross-layer imports
  // Each page group also gets a rule blocking sibling page groups
  ...PAGE_GROUPS.map((group) => {
    const siblings = [
      ...PAGE_GROUPS.filter((g) => g !== group).flatMap((g) => [
        `@/ui/pages/${g}`,
        `@/ui/pages/${g}/**`,
      ]),
      "@/ui/hooks/internal",
      "@/ui/hooks/internal/**",
    ];
    return uiRule(
      [`src/ui/pages/${group}/**/*.{ts,tsx}`],
      siblings,
      `ui/pages/${group}/ must not import from sibling page groups`,
    );
  }),
];

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
  ...ALL_LAYERS.map(layerRule),
  ...uiSubLayerRules,
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
