/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  allowedSeverity: "error",
  allowed: [
    {
      from: {},
      to: {
        dependencyTypes: ["core", "npm", "npm-dev", "npm-optional", "npm-peer"],
      },
    },

    // utils
    { from: { path: "^src/utils/" }, to: { path: "^src/utils/" } },

    // models
    { from: { path: "^src/models/" }, to: { path: "^src/models/" } },

    // plugins
    {
      from: { path: "^src/plugins/" },
      to: { path: ["^src/plugins/", "^src/utils/"] },
    },
    {
      from: { path: "^src/plugins/" },
      to: { path: "^src/plugins/[^/]+/types\\.ts$" },
    },

    // repositories
    {
      from: { path: "^src/repositories/" },
      to: { path: ["^src/repositories/", "^src/utils/"] },
    },
    {
      from: { path: "^src/repositories/" },
      to: {
        path: [
          "^src/models/[^/]+/(index|types)\\.ts$",
          "^src/models/(events|utilities)\\.ts$",
        ],
      },
    },

    // services
    {
      from: { path: "^src/services/" },
      to: { path: ["^src/services/", "^src/utils/"] },
    },
    {
      from: { path: "^src/services/" },
      to: {
        path: [
          "^src/models/[^/]+/(index|types)\\.ts$",
          "^src/models/(events|utilities)\\.ts$",
        ],
      },
    },
    {
      from: { path: "^src/services/" },
      to: { path: "^src/plugins/[^/]+/types\\.ts$" },
    },
    {
      from: { path: "^src/services/" },
      to: { path: "^src/repositories/[^/]+/types\\.ts$" },
    },

    // app
    {
      from: { path: "^src/app/" },
      to: { path: ["^src/app/", "^src/utils/", "^src/models/"] },
    },
    {
      from: { path: "^src/app/" },
      to: { path: "^src/plugins/[^/]+/(index|types)\\.ts$" },
    },
    {
      from: { path: "^src/app/" },
      to: { path: "^src/repositories/[^/]+/(index|types)\\.ts$" },
    },
    {
      from: { path: "^src/app/" },
      to: { path: "^src/services/[^/]+/(index|types)\\.ts$" },
    },

    // ui shared folders
    {
      from: { path: "^src/ui/hooks/" },
      to: {
        path: [
          "^src/ui/hooks/",
          "^src/models/[^/]+/(index|types)\\.ts$",
          "^src/models/(events|utilities)\\.ts$",
        ],
      },
    },
    {
      from: { path: "^src/ui/data/" },
      to: {
        path: [
          "^src/ui/data/",
          "^src/models/[^/]+/(index|types)\\.ts$",
          "^src/models/(events|utilities)\\.ts$",
        ],
      },
    },
    {
      from: { path: "^src/ui/components/" },
      to: {
        path: [
          "^src/ui/components/",
          "^src/ui/data/",
          "^src/models/[^/]+/(index|types)\\.ts$",
          "^src/models/(events|utilities)\\.ts$",
        ],
      },
    },
    {
      from: { path: "^src/ui/layout/" },
      to: {
        path: [
          "^src/ui/layout/",
          "^src/ui/components/",
          "^src/ui/hooks/",
          "^src/models/[^/]+/(index|types)\\.ts$",
          "^src/models/(events|utilities)\\.ts$",
        ],
      },
    },

    // ui pages
    {
      from: { path: "^src/ui/pages/" },
      to: {
        path: [
          "^src/ui/pages/",
          "^src/ui/components/",
          "^src/ui/data/",
          "^src/ui/hooks/",
          "^src/ui/layout/",
          "^src/ui/constants\\.ts$",
          "^src/models/[^/]+/(index|types)\\.ts$",
          "^src/models/(events|utilities)\\.ts$",
        ],
      },
    },

    // ui entry files
    {
      from: { path: "^src/ui/[^/]+\\.[^/]+$" },
      to: { path: "^src/" },
    },
  ],

  forbidden: [
    {
      name: "ui-pages-no-cross-group-applicant",
      severity: "error",
      from: { path: "^src/ui/pages/applicant/" },
      to: { path: "^src/ui/pages/(job-search|settings)/" },
    },
    {
      name: "ui-pages-no-cross-group-job-search",
      severity: "error",
      from: { path: "^src/ui/pages/job-search/" },
      to: { path: "^src/ui/pages/(applicant|settings)/" },
    },
    {
      name: "ui-pages-no-cross-group-settings",
      severity: "error",
      from: { path: "^src/ui/pages/settings/" },
      to: { path: "^src/ui/pages/(applicant|job-search)/" },
    },
    {
      name: "tests-only-index-or-types",
      severity: "error",
      from: { path: "^src/.+\\.(test|test-suite|integration-test)\\.tsx?$" },
      to: {
        path: "^src/",
        pathNot: [".*/(index|types)\\.ts$"],
      },
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      dot: { collapsePattern: "node_modules/[^/]+" },
    },
  },
};
