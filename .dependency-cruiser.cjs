const { readdirSync } = require("node:fs")
const path = require("node:path")

const MODULE_POLICY = [
  { key: "utils", pathRegex: "^src/utils/", allow: [] },
  { key: "models", pathRegex: "^src/models/", allow: ["models"] },
  { key: "plugins", pathRegex: "^src/plugins/", allow: ["utils"] },
  {
    key: "repositories",
    pathRegex: "^src/repositories/",
    allow: ["plugins", "models", "utils"],
  },
  {
    key: "services",
    pathRegex: "^src/services/",
    allow: ["plugins", "models", "utils", "repositories", "services"],
  },
  {
    key: "app",
    pathRegex: "^src/app/",
    allow: ["app", "utils", "models", "plugins", "repositories", "services"],
  },
  {
    key: "ui/root",
    pathRegex:
      "^src/ui/(app\\.tsx|main\\.tsx|index\\.css|index\\.html|renderer-globals\\.d\\.ts|test-setup\\.ts)$",
    allow: ["ui/layout", "ui/pages", "ui/pages/*", "models"],
  },
  { key: "ui/hooks", pathRegex: "^src/ui/hooks/", allow: [] },
  {
    key: "ui/components",
    pathRegex: "^src/ui/components/",
    allow: ["ui/hooks"],
  },
  {
    key: "ui/layout",
    pathRegex: "^src/ui/layout/",
    allow: ["ui/hooks", "ui/components"],
  },
  { key: "ui/data", pathRegex: "^src/ui/data/", allow: ["models"] },
  {
    key: "ui/pages/:group",
    pathRegex: "^src/ui/pages/:group/",
    allow: [
      "ui/hooks",
      "ui/components",
      "ui/layout",
      "ui/data",
      "models",
      "ui/pages/:group",
    ],
  },
  {
    key: "ui/pages",
    pathRegex: "^src/ui/pages/index\\.ts$",
    allow: ["ui/pages", "ui/pages/*"],
  },
]

/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    ...buildInternalBoundaryRules(),
    {
      name: "no-value-imports-from-types",
      severity: "error",
      from: { path: "^src/" },
      to: {
        path: "^src/.+/types\\.ts$",
        dependencyTypesNot: ["type-only"],
      },
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
}

function buildInternalBoundaryRules() {
  const modules = buildModules()

  return modules.map((sourceModule) => {
    const allowedTargets = resolveAllowedTargetPaths(sourceModule, modules)

    return {
      name: `boundary-${sourceModule.key.replaceAll("/", "-")}`,
      severity: "error",
      from: { path: sourceModule.pathRegex },
      to: {
        path: "^src/",
        pathNot: allowedTargets,
      },
    }
  })
}

function buildModules() {
  const pageGroups = listDirectories(path.join(process.cwd(), "src/ui/pages"))
  const pageGroupPolicy = MODULE_POLICY.find(
    (module) => module.key === "ui/pages/:group",
  )

  if (!pageGroupPolicy) {
    throw new Error("ui/pages/:group policy must be defined")
  }

  return [
    ...MODULE_POLICY.filter((module) => module.key !== "ui/pages/:group"),
    ...pageGroups.map((group) => ({
      key: `ui/pages/${group}`,
      pathRegex: pageGroupPolicy.pathRegex.replace(
        ":group",
        escapeRegex(group),
      ),
      allow: resolveGroupDependencies(pageGroupPolicy.allow, group),
    })),
  ]
}

function resolveAllowedTargetPaths(sourceModule, modules) {
  const ownModulePattern = sourceModule.pathRegex
  const allowedModulePatterns = modules
    .filter((targetModule) => isAllowed(sourceModule, targetModule))
    .flatMap((targetModule) => [
      ...toValuePublicSurfacePatterns(targetModule),
      ...toTypePublicSurfacePatterns(targetModule),
    ])

  return [ownModulePattern, ...allowedModulePatterns]
}

function isAllowed(sourceModule, targetModule) {
  if (targetModule.key === sourceModule.key) return true

  return sourceModule.allow.some((allowedKey) =>
    doesAllowedModuleMatchTarget(allowedKey, targetModule.key),
  )
}

function resolveGroupDependencies(policy, group) {
  return policy.map((key) => key.replace(":group", group))
}

function doesAllowedModuleMatchTarget(allowedKey, targetKey) {
  if (allowedKey === targetKey) return true
  if (allowedKey.endsWith("/*")) {
    return targetKey.startsWith(allowedKey.slice(0, -1))
  }

  return false
}

function toValuePublicSurfacePatterns(module) {
  if (module.key === "utils") return ["^src/utils/index\\.ts$"]
  if (module.key === "models")
    return ["^src/models/[^/]+/index\\.ts$", "^src/models/index\\.ts$"]
  if (module.key === "plugins") return ["^src/plugins/[^/]+/index\\.ts$"]
  if (module.key === "repositories")
    return ["^src/repositories/[^/]+/index\\.ts$"]
  if (module.key === "services") return ["^src/services/[^/]+/index\\.ts$"]
  if (module.key === "app")
    return ["^src/app/[^/]+/index\\.ts$", "^src/app/index\\.ts$"]
  if (module.key === "ui/hooks") return ["^src/ui/hooks/index\\.ts$"]
  if (module.key === "ui/components") return ["^src/ui/components/index\\.ts$"]
  if (module.key === "ui/layout") return ["^src/ui/layout/index\\.ts$"]
  if (module.key === "ui/data") return ["^src/ui/data/index\\.ts$"]
  if (module.key.startsWith("ui/pages/")) {
    const group = module.key.replace("ui/pages/", "")
    return [
      `^src/ui/pages/${escapeRegex(group)}/index\\.ts$`,
      `^src/ui/pages/${escapeRegex(group)}/components/index\\.ts$`,
      `^src/ui/pages/${escapeRegex(group)}/hooks/index\\.ts$`,
    ]
  }
  if (module.key === "ui/pages") return ["^src/ui/pages/index\\.ts$"]
  if (module.key === "ui/root")
    return ["^src/ui/pages/index\\.ts$", "^src/ui/layout/index\\.ts$"]

  return []
}

function toTypePublicSurfacePatterns(module) {
  const valueSurfaces = toValuePublicSurfacePatterns(module)
  if (module.key === "utils") return valueSurfaces
  if (module.key === "ui/root") return valueSurfaces

  return [...valueSurfaces, ...toTypesSurfacePatterns(module)]
}

function toTypesSurfacePatterns(module) {
  if (module.key === "models") return ["^src/models/[^/]+/types\\.ts$"]
  if (module.key === "plugins") return ["^src/plugins/[^/]+/types\\.ts$"]
  if (module.key === "repositories")
    return ["^src/repositories/[^/]+/types\\.ts$"]
  if (module.key === "services") return ["^src/services/[^/]+/types\\.ts$"]
  if (module.key === "app") return ["^src/app/[^/]+/types\\.ts$"]
  if (module.key === "ui/hooks") return ["^src/ui/hooks/types\\.ts$"]
  if (module.key === "ui/components") return ["^src/ui/components/types\\.ts$"]
  if (module.key === "ui/layout") return ["^src/ui/layout/types\\.ts$"]
  if (module.key === "ui/data") return ["^src/ui/data/types\\.ts$"]
  if (module.key.startsWith("ui/pages/")) {
    const group = module.key.replace("ui/pages/", "")
    return [
      `^src/ui/pages/${escapeRegex(group)}/types\\.ts$`,
      `^src/ui/pages/${escapeRegex(group)}/hooks/types\\.ts$`,
      `^src/ui/pages/${escapeRegex(group)}/components/types\\.ts$`,
    ]
  }

  return []
}

function listDirectories(absolutePath) {
  return readdirSync(absolutePath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

function escapeRegex(value) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
