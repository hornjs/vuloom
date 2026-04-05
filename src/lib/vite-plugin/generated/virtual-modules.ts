import type { ScannedRouteModule, ScannedRoutesResult } from "../scanners/route-manifest";

export const VIRTUAL_ROUTES_MANIFEST_ID = "virtual:phial-routes-manifest";
export const VIRTUAL_ROUTES_MODULES_ID = "virtual:phial-routes-modules";
export const VIRTUAL_APP_RUNTIME_ID = "virtual:phial-app-runtime";
export const GENERATED_ROUTES_MANIFEST_ID = "phial/generated-routes-manifest";
export const GENERATED_ROUTES_MODULES_ID = "phial/generated-routes-modules";
export const GENERATED_APP_RUNTIME_ID = "phial/generated-app-runtime";
export const GENERATED_APP_LOADER_ID = "phial/generated-app-loader";
export const GENERATED_APP_MIDDLEWARE_ID = "phial/generated-app-middleware";
export const GENERATED_APP_PLUGIN_ID = "phial/generated-app-plugin";
export const GENERATED_SERVER_ROUTES_ID = "phial/generated-server-routes";
export const GENERATED_SERVER_MIDDLEWARE_ID = "phial/generated-server-middleware";
export const GENERATED_SERVER_PLUGIN_ID = "phial/generated-server-plugin";
export const GENERATED_CONFIG_ID = "phial/generated-config";
export const RESOLVED_VIRTUAL_ROUTES_MANIFEST_ID = `\0${VIRTUAL_ROUTES_MANIFEST_ID}`;
export const RESOLVED_VIRTUAL_ROUTES_MODULES_ID = `\0${VIRTUAL_ROUTES_MODULES_ID}`;
export const RESOLVED_VIRTUAL_APP_RUNTIME_ID = `\0${VIRTUAL_APP_RUNTIME_ID}`;
export const RESOLVED_GENERATED_ROUTES_MANIFEST_ID = `\0${GENERATED_ROUTES_MANIFEST_ID}`;
export const RESOLVED_GENERATED_ROUTES_MODULES_ID = `\0${GENERATED_ROUTES_MODULES_ID}`;
export const RESOLVED_GENERATED_APP_RUNTIME_ID = `\0${GENERATED_APP_RUNTIME_ID}`;
export const RESOLVED_GENERATED_APP_LOADER_ID = `\0${GENERATED_APP_LOADER_ID}`;
export const RESOLVED_GENERATED_APP_MIDDLEWARE_ID = `\0${GENERATED_APP_MIDDLEWARE_ID}`;
export const RESOLVED_GENERATED_APP_PLUGIN_ID = `\0${GENERATED_APP_PLUGIN_ID}`;
export const RESOLVED_GENERATED_SERVER_ROUTES_ID = `\0${GENERATED_SERVER_ROUTES_ID}`;
export const RESOLVED_GENERATED_SERVER_MIDDLEWARE_ID = `\0${GENERATED_SERVER_MIDDLEWARE_ID}`;
export const RESOLVED_GENERATED_SERVER_PLUGIN_ID = `\0${GENERATED_SERVER_PLUGIN_ID}`;
export const RESOLVED_GENERATED_CONFIG_ID = `\0${GENERATED_CONFIG_ID}`;

type RouteFileKey = keyof ScannedRouteModule["files"];

export interface VirtualRoutesModuleOptions {
  moduleImportMode?: "eager" | "lazy";
}

export function createVirtualRoutesManifestModule(result: ScannedRoutesResult): string {
  const manifest = JSON.stringify(result.manifest, null, 2);

  return [`export const manifest = ${manifest}`, "", "export default manifest"].join("\n");
}

export function createVirtualRoutesModulesModule(
  result: ScannedRoutesResult,
  options: VirtualRoutesModuleOptions = {},
): string {
  return options.moduleImportMode === "eager"
    ? createEagerRouteModulesModule(result)
    : createDynamicRouteModulesModule(result);
}

export function createVirtualAppRuntimeModule(result: ScannedRoutesResult): string {
  const importEntries = [
    result.app.app
      ? {
          importedLocal: "importedAppComponentModule",
          local: "appComponentModule",
          exportName: "appComponent",
          specifier: createImportSpecifier(result.app.app),
        }
      : null,
    result.app.error
      ? {
          importedLocal: "importedErrorComponentModule",
          local: "errorComponentModule",
          exportName: "errorComponent",
          specifier: createImportSpecifier(result.app.error),
        }
      : null,
    result.app.loader
      ? {
          importedLocal: "importedAppLoaderModule",
          local: "appLoaderModule",
          exportName: "appLoader",
          specifier: createImportSpecifier(result.app.loader),
        }
      : null,
    result.app.config
      ? {
          importedLocal: "importedAppConfigModule",
          local: "appConfigModule",
          exportName: "appConfig",
          specifier: createImportSpecifier(result.app.config),
        }
      : null,
  ].filter(Boolean) as Array<{
    importedLocal: string;
    local: string;
    exportName: "appComponent" | "errorComponent" | "appLoader" | "appConfig";
    specifier: string;
  }>;
  const importLines = importEntries.map(
    ({ importedLocal, specifier }) =>
      `import * as ${importedLocal} from ${JSON.stringify(specifier)}`,
  );
  const mutableBindings = importEntries.map(
    ({ importedLocal, local }) => `let ${local} = ${importedLocal}`,
  );
  const exportInitializers = [
    'let appComponent = resolveAppComponent(typeof appComponentModule !== "undefined" ? appComponentModule : undefined)',
    'let errorComponent = resolveErrorComponent(typeof errorComponentModule !== "undefined" ? errorComponentModule : undefined)',
    'export let appLoader = resolveAppLoader(typeof appLoaderModule !== "undefined" ? appLoaderModule : undefined)',
    'let appConfig = resolveAppConfig(typeof appConfigModule !== "undefined" ? appConfigModule : undefined)',
    "export let app = createAppModule(appComponent, errorComponent, appLoader)",
    "export let routes = createRouteRecords(manifest, routeModules)",
    "export function createIntegration(runtimeOptions = {}) {",
    "  return createRouteRuntimeIntegration({",
    "    app,",
    "    routes,",
    "    ...runtimeOptions",
    "  })",
    "}",
    "export let integration = createIntegration()",
    "installRouteModuleHmrBridge()",
  ];

  return [
    'import { createRouteRuntimeIntegration } from "vuepagelet/integration"',
    `import { manifest } from ${JSON.stringify(GENERATED_ROUTES_MANIFEST_ID)}`,
    `import { routeModules } from ${JSON.stringify(GENERATED_ROUTES_MODULES_ID)}`,
    `import { appMiddlewareRegistry } from ${JSON.stringify(GENERATED_APP_MIDDLEWARE_ID)}`,
    "",
    ...importLines,
    ...(importLines.length > 0 ? [""] : []),
    ...mutableBindings,
    ...(mutableBindings.length > 0 ? [""] : []),
    ...exportInitializers,
    "",
    "function resolveAppComponent(module) {",
    "  return module?.default",
    "}",
    "",
    "function resolveErrorComponent(module) {",
    "  return module?.default",
    "}",
    "",
    "function resolveAppLoader(module) {",
    "  const loader = module?.loader ?? module?.default",
    '  if (loader !== undefined && typeof loader !== "function") {',
    '    throw new Error("Invalid app loader module. Expected a default export or named \\"loader\\" export.")',
    "  }",
    "",
    "  return loader",
    "}",
    "",
    "function resolveAppConfig(module) {",
    "  return module?.default ?? module?.appConfig ?? {}",
    "}",
    "",
    "function createAppModule(shell, error, loader) {",
    "  return { shell, error, loader }",
    "}",
    "",
    "function createRouteRecords(routeManifest, loadedRouteModules) {",
    "  const records = routeManifest.map((entry) => ({",
    "    id: entry.id,",
    "    path: entry.path,",
    "    module: createRouteModule(entry, loadedRouteModules[entry.id]),",
    "    children: []",
    "  }))",
    "  const recordMap = new Map(records.map((record) => [record.id, record]))",
    "  const roots = []",
    "",
    "  for (const entry of routeManifest) {",
    "    const record = recordMap.get(entry.id)",
    "    if (!record) {",
    "      continue",
    "    }",
    "",
    "    if (entry.parentId) {",
    "      const parent = recordMap.get(entry.parentId)",
    "      if (parent) {",
    "        parent.children.push(record)",
    "        continue",
    "      }",
    "    }",
    "",
    "    roots.push(record)",
    "  }",
    "",
    "  return attachAppMiddleware(roots, resolveGlobalMiddleware(appConfig, appMiddlewareRegistry))",
    "}",
    "",
    "function installRouteModuleHmrBridge() {",
    '  if (typeof globalThis === "undefined") {',
    "    return",
    "  }",
    "",
    "  globalThis.__ROUTE_MODULE_HMR__ = async () => {",
    "    const nextRoutes = createRouteRecords(manifest, routeModules)",
    "    syncRouteRecords(routes, nextRoutes)",
    "    integration = createIntegration()",
    "    await notifyAppRuntimeHotUpdate({",
    "      appComponent,",
    "      errorComponent,",
    "      config: appConfig,",
    "      routes,",
    "    })",
    "  }",
    "}",
    "",
    "async function notifyAppRuntimeHotUpdate(payload) {",
    '  if (typeof globalThis === "undefined") {',
    "    return false",
    "  }",
    "",
    "  const applyAppRuntimeHotUpdate = globalThis.__APP_RUNTIME_HMR__",
    '  if (typeof applyAppRuntimeHotUpdate !== "function") {',
    "    return false",
    "  }",
    "",
    "  await applyAppRuntimeHotUpdate(payload)",
    "  return true",
    "}",
    "",
    "function syncRouteRecords(targetRoutes, nextRoutes) {",
    "  const targetRouteMap = new Map(flattenRoutes(targetRoutes).map((route) => [route.id, route]))",
    "",
    "  for (const nextRoute of flattenRoutes(nextRoutes)) {",
    "    const targetRoute = targetRouteMap.get(nextRoute.id)",
    "    if (!targetRoute) {",
    "      continue",
    "    }",
    "",
    "    targetRoute.path = nextRoute.path",
    "    targetRoute.name = nextRoute.name",
    "    targetRoute.module = nextRoute.module",
    "  }",
    "}",
    "",
    "function flattenRoutes(routes) {",
    "  return routes.flatMap((route) => [route, ...flattenRoutes(route.children ?? [])])",
    "}",
    "",
    "function createRouteModule(entry, module) {",
    "  const resolvedModule = module ?? {}",
    '  const routeModule = entry.kind === "layout"',
    "    ? { layout: resolveDefaultExport(resolvedModule) }",
    "    : { component: resolveDefaultExport(resolvedModule) }",
    "  const middleware = resolveMiddlewareReferences([",
    "    ...(resolvedModule.directoryMiddleware ?? []),",
    "    ...(resolvedModule.middleware ?? []),",
    "  ], appMiddlewareRegistry)",
    "",
    "  if (resolvedModule.Loading !== undefined) {",
    "    routeModule.loading = resolvedModule.Loading",
    "  }",
    "",
    "  if (resolvedModule.ErrorBoundary !== undefined) {",
    "    routeModule.error = resolvedModule.ErrorBoundary",
    "  }",
    "",
    "  if (resolvedModule.loader !== undefined) {",
    "    routeModule.loader = resolvedModule.loader",
    "  }",
    "",
    "  if (resolvedModule.action !== undefined) {",
    "    routeModule.action = resolvedModule.action",
    "  }",
    "",
    "  if (middleware.length > 0) {",
    "    routeModule.middleware = middleware",
    "  }",
    "",
    "  if (resolvedModule.shouldRevalidate !== undefined) {",
    "    routeModule.shouldRevalidate = resolvedModule.shouldRevalidate",
    "  }",
    "",
    "  return routeModule",
    "}",
    "",
    "function resolveDefaultExport(module) {",
    "  return module?.default",
    "}",
    "",
    "function resolveGlobalMiddleware(config, registry) {",
    "  return resolveMiddlewareReferences(config?.middleware ?? [], registry)",
    "}",
    "",
    "function resolveMiddlewareReferences(references, registry) {",
    "  const entries = Array.isArray(references) ? references : [references]",
    "  const middleware = []",
    "",
    "  for (const reference of entries) {",
    "    if (reference === undefined) {",
    "      continue",
    "    }",
    "",
    '    if (typeof reference === "function") {',
    "      middleware.push(reference)",
    "      continue",
    "    }",
    "",
    "    const handler = registry[reference]",
    "    if (!handler) {",
    '      throw new Error(`Unknown middleware reference "${reference}".`)',
    "    }",
    "",
    "    middleware.push(handler)",
    "  }",
    "",
    "  return middleware",
    "}",
    "",
    "function attachAppMiddleware(routes, middleware) {",
    "  if (!Array.isArray(middleware) || middleware.length === 0) {",
    "    return routes",
    "  }",
    "",
    "  return routes.map((route) => ({",
    "    ...route,",
    "    module: {",
    "      ...route.module,",
    "      middleware: [...middleware, ...(route.module.middleware ?? [])],",
    "    },",
    "  }))",
    "}",
    "",
    ...(importLines.length > 0 ? ["", ...createAppRuntimeHmrBlock(importEntries)] : []),
    "",
    "export default integration",
  ].join("\n");
}

export function createVirtualAppLoaderModule(result: ScannedRoutesResult): string {
  if (!result.app.loader) {
    return ["export const appLoader = undefined", "", "export default appLoader"].join("\n");
  }

  return [
    `import * as appLoaderModule from ${JSON.stringify(createImportSpecifier(result.app.loader))}`,
    "",
    "export const appLoader = resolveAppLoader(appLoaderModule)",
    "",
    "function resolveAppLoader(module) {",
    "  const loader = module?.loader ?? module?.default",
    '  if (typeof loader !== "function") {',
    '    throw new Error("Invalid app loader module. Expected a default export or named \\"loader\\" export.")',
    "  }",
    "",
    "  return loader",
    "}",
    "",
    "export default appLoader",
  ].join("\n");
}

export function createVirtualAppMiddlewareModule(result: ScannedRoutesResult): string {
  const middlewareEntries = Object.entries(result.app.middleware);
  const importLines = middlewareEntries.map(
    ([, file], index) =>
      `import * as middlewareModule${index} from ${JSON.stringify(createImportSpecifier(file))}`,
  );
  const registryEntries: Array<[string, string]> = middlewareEntries.map(([name], index) => [
    name,
    `resolveMiddleware(middlewareModule${index}, ${JSON.stringify(name)})`,
  ]);

  return [
    ...importLines,
    importLines.length > 0 ? "" : "",
    `export const appMiddlewareRegistry = ${serializeObject(registryEntries)}`,
    "",
    "function resolveMiddleware(module, name) {",
    "  const middleware = module?.middleware ?? module?.default",
    '  if (typeof middleware !== "function") {',
    '    throw new Error(`Invalid middleware module "${name}". Expected a default export or named "middleware" export.`)',
    "  }",
    "",
    "  return middleware",
    "}",
    "",
    "export default appMiddlewareRegistry",
  ].join("\n");
}

export function createVirtualServerRoutesModule(result: ScannedRoutesResult): string {
  const routeEntries = result.server.routes;
  const uniqueFiles = Array.from(
    new Set(routeEntries.flatMap((route) => [route.file, ...route.directoryMiddleware])),
  );
  const importLines = uniqueFiles.map(
    (specifier, index) =>
      `import * as importedServerFile${index} from ${JSON.stringify(createImportSpecifier(specifier))}`,
  );
  const fileModuleBindings = uniqueFiles.map(
    (_specifier, index) => `const serverFileModule${index} = importedServerFile${index}`,
  );
  const fileIndexMap = serializeObject(
    uniqueFiles.map((specifier, index) => [specifier, String(index)]),
  );

  return [
    `export { serverMiddlewareRegistry } from ${JSON.stringify(GENERATED_SERVER_MIDDLEWARE_ID)}`,
    "",
    ...importLines,
    importLines.length > 0 ? "" : "",
    ...fileModuleBindings,
    fileModuleBindings.length > 0 ? "" : "",
    `export const serverRoutes = ${serializeArrayOfObjects(
      routeEntries.map((route) => [
        ["id", JSON.stringify(route.id)],
        ["path", JSON.stringify(route.path)],
        ["file", JSON.stringify(route.file)],
        [
          "definition",
          `resolveServerRoute(getLoadedServerModule(${JSON.stringify(route.file)}), ${JSON.stringify(route.file)})`,
        ],
        [
          "directoryMiddlewareNames",
          `resolveDirectoryMiddlewareNames(${serializeArray(route.directoryMiddleware)})`,
        ],
      ]),
    )}`,
    "",
    "function resolveDirectoryMiddlewareNames(files) {",
    "  return files.flatMap((file) => resolveMiddlewareNames(getLoadedServerModule(file), file))",
    "}",
    "",
    "function resolveServerRoute(module, file) {",
    "  const route = module?.default ?? module?.route",
    '  if (!route || typeof route !== "object") {',
    '    throw new Error(`Invalid server route module "${file}". Expected a default export or named "route" export.`)',
    "  }",
    "",
    "  return {",
    "    middlewareNames: normalizeMiddlewareNames(route?.middleware),",
    '    meta: route?.meta && typeof route.meta === "object" ? route.meta : undefined,',
    "    handler: asHandler(route?.handler),",
    "    GET: asHandler(route?.GET),",
    "    POST: asHandler(route?.POST),",
    "    PUT: asHandler(route?.PUT),",
    "    PATCH: asHandler(route?.PATCH),",
    "    DELETE: asHandler(route?.DELETE),",
    "    HEAD: asHandler(route?.HEAD),",
    "    OPTIONS: asHandler(route?.OPTIONS),",
    "  }",
    "}",
    "",
    "function resolveMiddlewareNames(module, file) {",
    "  if (!module) {",
    "    return []",
    "  }",
    "",
    "  const middleware = module?.middleware ?? module?.default",
    "  if (middleware === undefined) {",
    "    return []",
    "  }",
    "",
    '  if (!Array.isArray(middleware) || middleware.some((name) => typeof name !== "string")) {',
    '    throw new Error(`Invalid server route directory middleware "${file}". Expected a default export or named "middleware" export with a string array.`)',
    "  }",
    "",
    "  return middleware",
    "}",
    "",
    "function normalizeMiddlewareNames(value) {",
    "  if (value === undefined) {",
    "    return undefined",
    "  }",
    "",
    '  if (!Array.isArray(value) || value.some((name) => typeof name !== "string")) {',
    "    throw new Error('Server route \"middleware\" must be a string array.')",
    "  }",
    "",
    "  return value",
    "}",
    "",
    "function asHandler(value) {",
    '  return typeof value === "function" ? value : undefined',
    "}",
    "",
    "function getLoadedServerModule(file) {",
    `  const fileIndex = ${fileIndexMap}[file]`,
    "  if (fileIndex === undefined) {",
    "    return undefined",
    "  }",
    "",
    "  return [",
    ...uniqueFiles.map(
      (_, index) => `    serverFileModule${index}${index < uniqueFiles.length - 1 ? "," : ""}`,
    ),
    "  ][fileIndex]",
    "}",
    "",
    "export default serverRoutes",
  ].join("\n");
}

export function createVirtualServerMiddlewareModule(result: ScannedRoutesResult): string {
  const middlewareEntries = Object.entries(result.server.middleware);
  const importLines = middlewareEntries.map(
    ([, file], index) =>
      `import * as middlewareModule${index} from ${JSON.stringify(createImportSpecifier(file))}`,
  );
  const registryEntries: Array<[string, string]> = middlewareEntries.map(([name], index) => [
    name,
    `resolveMiddleware(middlewareModule${index}, ${JSON.stringify(name)})`,
  ]);

  return [
    ...importLines,
    importLines.length > 0 ? "" : "",
    `export const serverMiddlewareRegistry = ${serializeObject(registryEntries)}`,
    "",
    "function resolveMiddleware(module, name) {",
    "  const middleware = module?.middleware ?? module?.default",
    '  if (typeof middleware !== "function") {',
    '    throw new Error(`Invalid server middleware module "${name}". Expected a default export or named "middleware" export.`)',
    "  }",
    "",
    "  return middleware",
    "}",
    "",
    "export default serverMiddlewareRegistry",
  ].join("\n");
}

export function createVirtualAppPluginModule(): string {
  return [
    `import { createIntegration } from ${JSON.stringify(GENERATED_APP_RUNTIME_ID)}`,
    "",
    "function createAppRouteMiddleware(getIntegration) {",
    "  return async (request, next) => {",
    "    const integration = await getIntegration()",
    "    const routeMatch = integration.match(new URL(request.url).pathname)",
    "    if (!routeMatch) {",
    "      return next(request)",
    "    }",
    "",
    "    return integration.handleRequest(request)",
    "  }",
    "}",
    "",
    "function createAppRouteServerPlugin(options = {}) {",
    "  let integrationPromise",
    "",
    "  return (server) => {",
    "    server.options.middleware.push(",
    "      createAppRouteMiddleware(() => {",
    "        if (!integrationPromise) {",
    "          integrationPromise = Promise.resolve(createIntegration(options))",
    "        }",
    "",
    "        return integrationPromise",
    "      }),",
    "    )",
    "  }",
    "}",
    "",
    "export function createAppPlugin(options = {}) {",
    "  return createAppRouteServerPlugin(options)",
    "}",
    "",
    "export const appPlugin = createAppPlugin()",
    "",
    "export default createAppPlugin",
  ].join("\n");
}

export function createVirtualServerPluginModule(): string {
  return [
    'import { runMiddleware } from "@hornjs/fest"',
    `import { config } from ${JSON.stringify(GENERATED_CONFIG_ID)}`,
    `import { serverMiddlewareRegistry, serverRoutes } from ${JSON.stringify(GENERATED_SERVER_ROUTES_ID)}`,
    "",
    "function createServerRoutesPlugin(options) {",
    "  return (server) => {",
    "    server.options.middleware.unshift(createServerRoutesMiddleware(options))",
    "  }",
    "}",
    "",
    "function createServerRoutesMiddleware(options) {",
    "  return async (request, next) => {",
    "    const route = findServerRoute(options.routes, new URL(request.url).pathname)",
    "    if (!route) {",
    "      return next(request)",
    "    }",
    "",
    "    const handler = getRouteHandler(route, request.method)",
    "    if (!handler) {",
    '      return new Response("Method Not Allowed", { status: 405 })',
    "    }",
    "",
    "    const middleware = resolveMiddlewareChain(",
    "      route,",
    "      options.middlewareRegistry,",
    "      options.globalMiddlewareNames,",
    "    )",
    "    if (middleware.length === 0) {",
    "      return handleRoute(request, handler)",
    "    }",
    "",
    "    return runMiddleware(middleware, request, (nextRequest) => handleRoute(nextRequest, handler))",
    "  }",
    "}",
    "",
    "async function handleRoute(request, handler) {",
    "  const result = await handler(request)",
    "  if (result instanceof Response) {",
    "    return result",
    "  }",
    "",
    "  return Response.json(result)",
    "}",
    "",
    "function resolveMiddlewareChain(route, registry, globalMiddlewareNames = []) {",
    "  const names = [",
    "    ...globalMiddlewareNames,",
    "    ...(route.directoryMiddlewareNames ?? []),",
    "    ...(route.definition.middlewareNames ?? []),",
    "  ]",
    "",
    "  return names.map((name) => {",
    "    const middleware = registry[name]",
    "    if (!middleware) {",
    '      throw new Error(`Unknown server middleware "${name}" referenced by route "${route.id}".`)',
    "    }",
    "",
    "    return middleware",
    "  })",
    "}",
    "",
    "function findServerRoute(routes, pathname) {",
    "  const normalizedPathname = normalizePathname(pathname)",
    "  return routes.find((route) => matchesServerRoutePath(route.path, normalizedPathname))",
    "}",
    "",
    "function matchesServerRoutePath(pattern, pathname) {",
    "  const normalizedPattern = normalizePathname(pattern)",
    "  if (normalizedPattern === pathname) {",
    "    return true",
    "  }",
    "",
    "  const patternSegments = splitPathSegments(normalizedPattern)",
    "  const pathnameSegments = splitPathSegments(pathname)",
    "  if (patternSegments.length !== pathnameSegments.length) {",
    "    return false",
    "  }",
    "",
    "  for (let index = 0; index < patternSegments.length; index += 1) {",
    "    const patternSegment = patternSegments[index]",
    "    const pathnameSegment = pathnameSegments[index]",
    "",
    "    if (!patternSegment) {",
    "      return false",
    "    }",
    "",
    '    if (patternSegment.startsWith(":")) {',
    "      continue",
    "    }",
    "",
    "    if (patternSegment !== pathnameSegment) {",
    "      return false",
    "    }",
    "  }",
    "",
    "  return true",
    "}",
    "",
    "function getRouteHandler(route, method) {",
    "  const resolvedMethod = method.toUpperCase()",
    "  const definition = route.definition",
    "",
    "  switch (resolvedMethod) {",
    '    case "GET":',
    "      return definition.GET ?? definition.handler",
    '    case "POST":',
    "      return definition.POST ?? definition.handler",
    '    case "PUT":',
    "      return definition.PUT ?? definition.handler",
    '    case "PATCH":',
    "      return definition.PATCH ?? definition.handler",
    '    case "DELETE":',
    "      return definition.DELETE ?? definition.handler",
    '    case "HEAD":',
    "      return definition.HEAD ?? definition.handler",
    '    case "OPTIONS":',
    "      return definition.OPTIONS ?? definition.handler",
    "    default:",
    "      return definition.handler",
    "  }",
    "}",
    "",
    "function normalizePathname(pathname) {",
    "  if (!pathname) {",
    '    return "/"',
    "  }",
    "",
    '  if (!pathname.startsWith("/")) {',
    "    return `/${pathname}`",
    "  }",
    "",
    '  if (pathname.length > 1 && pathname.endsWith("/")) {',
    '    return pathname.replace(/\\/+$/, "")',
    "  }",
    "",
    "  return pathname",
    "}",
    "",
    "function splitPathSegments(pathname) {",
    "  const normalized = normalizePathname(pathname)",
    '  if (normalized === "/") {',
    "    return []",
    "  }",
    "",
    '  return normalized.replace(/^\\/+|\\/+$/g, "").split("/")',
    "}",
    "",
    "export function createServerPlugin() {",
    "  return createServerRoutesPlugin({",
    "    routes: serverRoutes,",
    "    middlewareRegistry: serverMiddlewareRegistry,",
    "    globalMiddlewareNames: config.server?.middleware ?? []",
    "  })",
    "}",
    "",
    "export const serverPlugin = createServerPlugin()",
    "",
    "export default createServerPlugin",
  ].join("\n");
}

export function resolveVirtualModuleId(id: string): string | null {
  if (id === VIRTUAL_ROUTES_MANIFEST_ID || id === RESOLVED_VIRTUAL_ROUTES_MANIFEST_ID) {
    return RESOLVED_VIRTUAL_ROUTES_MANIFEST_ID;
  }

  if (id === VIRTUAL_ROUTES_MODULES_ID || id === RESOLVED_VIRTUAL_ROUTES_MODULES_ID) {
    return RESOLVED_VIRTUAL_ROUTES_MODULES_ID;
  }

  if (id === VIRTUAL_APP_RUNTIME_ID || id === RESOLVED_VIRTUAL_APP_RUNTIME_ID) {
    return RESOLVED_VIRTUAL_APP_RUNTIME_ID;
  }

  if (id === GENERATED_ROUTES_MANIFEST_ID || id === RESOLVED_GENERATED_ROUTES_MANIFEST_ID) {
    return RESOLVED_GENERATED_ROUTES_MANIFEST_ID;
  }

  if (id === GENERATED_ROUTES_MODULES_ID || id === RESOLVED_GENERATED_ROUTES_MODULES_ID) {
    return RESOLVED_GENERATED_ROUTES_MODULES_ID;
  }

  if (id === GENERATED_APP_RUNTIME_ID || id === RESOLVED_GENERATED_APP_RUNTIME_ID) {
    return RESOLVED_GENERATED_APP_RUNTIME_ID;
  }

  if (id === GENERATED_APP_LOADER_ID || id === RESOLVED_GENERATED_APP_LOADER_ID) {
    return RESOLVED_GENERATED_APP_LOADER_ID;
  }

  if (id === GENERATED_APP_MIDDLEWARE_ID || id === RESOLVED_GENERATED_APP_MIDDLEWARE_ID) {
    return RESOLVED_GENERATED_APP_MIDDLEWARE_ID;
  }

  if (id === GENERATED_APP_PLUGIN_ID || id === RESOLVED_GENERATED_APP_PLUGIN_ID) {
    return RESOLVED_GENERATED_APP_PLUGIN_ID;
  }

  if (id === GENERATED_SERVER_ROUTES_ID || id === RESOLVED_GENERATED_SERVER_ROUTES_ID) {
    return RESOLVED_GENERATED_SERVER_ROUTES_ID;
  }

  if (id === GENERATED_SERVER_MIDDLEWARE_ID || id === RESOLVED_GENERATED_SERVER_MIDDLEWARE_ID) {
    return RESOLVED_GENERATED_SERVER_MIDDLEWARE_ID;
  }

  if (id === GENERATED_SERVER_PLUGIN_ID || id === RESOLVED_GENERATED_SERVER_PLUGIN_ID) {
    return RESOLVED_GENERATED_SERVER_PLUGIN_ID;
  }

  if (id === GENERATED_CONFIG_ID || id === RESOLVED_GENERATED_CONFIG_ID) {
    return RESOLVED_GENERATED_CONFIG_ID;
  }

  return null;
}

export function createVirtualConfigModule(options: {
  config: Record<string, unknown>;
  hasConfigFile: boolean;
}): string {
  if (!options.hasConfigFile) {
    return [
      "export const hasConfig = false",
      "export const config = {}",
      "",
      "export default config",
    ].join("\n");
  }

  return [
    "export const hasConfig = true",
    `export const config = ${JSON.stringify(options.config, null, 2)}`,
    "",
    "export default config",
  ].join("\n");
}

function createDynamicRouteModulesModule(result: ScannedRoutesResult): string {
  const routeFiles = serializeObject(
    result.modules.map((module) => [module.id, serializeArray(resolveModuleSpecifiers(module))]),
  );
  const routeModules = serializeObject(
    result.modules.map((module) => [
      module.id,
      `() => loadResolvedRouteModule(${JSON.stringify(module.id)})`,
    ]),
  );
  const routeImportSpecifiers = Array.from(
    new Set(result.modules.flatMap((module) => resolveModuleSpecifiers(module))),
  );
  const hmrBlock = createRouteModulesHmrBlock(routeImportSpecifiers);

  return [
    `export const routeFiles = ${routeFiles}`,
    "",
    `export const routeModules = ${routeModules}`,
    "",
    "export async function loadRouteModule(id) {",
    "  const importer = routeModules[id]",
    "  return importer ? importer() : undefined",
    "}",
    "",
    "async function loadResolvedRouteModule(id) {",
    `  const routeDefinitions = ${serializeObject(result.modules.map((module) => [module.id, createRouteDefinition(module)]))}`,
    "  const definition = routeDefinitions[id]",
    "  if (!definition) {",
    "    return undefined",
    "  }",
    "",
    "  const loadedModules = await Promise.all(definition.files.map(file => import(file)))",
    "  return createPhialRouteModule(definition, loadedModules)",
    "}",
    "",
    ...createRouteModuleHelperLines(),
    ...(hmrBlock.length > 0 ? ["", ...hmrBlock] : []),
    "",
    "export default routeModules",
  ].join("\n");
}

function createEagerRouteModulesModule(result: ScannedRoutesResult): string {
  const uniqueFiles = Array.from(
    new Set(result.modules.flatMap((module) => resolveModuleSpecifiers(module))),
  );
  const importLines = uniqueFiles.map((specifier, index) => {
    return `import * as importedRouteFile${index} from ${JSON.stringify(specifier)}`;
  });
  const fileModuleInitializers = uniqueFiles.map((_specifier, index) => {
    return `let routeFileModule${index} = importedRouteFile${index}`;
  });
  const fileSetters = uniqueFiles.map((_specifier, index) => {
    return `  (nextModule) => { if (nextModule) routeFileModule${index} = nextModule }`;
  });
  const routeDefinitions = serializeObject(
    result.modules.map((module) => [module.id, createRouteDefinition(module)]),
  );
  const routeFiles = serializeObject(
    result.modules.map((module) => [module.id, serializeArray(resolveModuleSpecifiers(module))]),
  );
  const routeModules = serializeObject(
    result.modules.map((module) => [
      module.id,
      `createResolvedRouteModule(${JSON.stringify(module.id)})`,
    ]),
  );
  const hmrBlock = createRouteModulesHmrBlock(uniqueFiles, {
    applyUpdatedModules: [
      `    const applyFileModuleUpdates = [\n${fileSetters.join(",\n")}\n    ]`,
      "    nextModules.forEach((nextModule, index) => {",
      "      const applyUpdate = applyFileModuleUpdates[index]",
      "      if (applyUpdate) {",
      "        applyUpdate(nextModule)",
      "      }",
      "    })",
      "",
      `    const routeIds = ${JSON.stringify(result.modules.map((module) => module.id))}`,
      "    routeIds.forEach((routeId) => {",
      "      routeModules[routeId] = createResolvedRouteModule(routeId)",
      "    })",
      "",
    ],
  });

  return [
    ...importLines,
    importLines.length > 0 ? "" : "",
    ...fileModuleInitializers,
    fileModuleInitializers.length > 0 ? "" : "",
    `const routeDefinitions = ${routeDefinitions}`,
    "",
    `export const routeFiles = ${routeFiles}`,
    "",
    `export const routeModules = ${routeModules}`,
    "",
    "export function loadRouteModule(id) {",
    "  return routeModules[id]",
    "}",
    "",
    "function createResolvedRouteModule(id) {",
    "  const definition = routeDefinitions[id]",
    "  if (!definition) {",
    "    return undefined",
    "  }",
    "",
    "  const loadedModules = definition.files.map((file) => getLoadedRouteFileModule(file))",
    "  return createPhialRouteModule(definition, loadedModules)",
    "}",
    "",
    "function getLoadedRouteFileModule(file) {",
    `  const routeFileIndexMap = ${serializeObject(uniqueFiles.map((specifier, index) => [specifier, String(index)]))}`,
    "  const fileIndex = routeFileIndexMap[file]",
    "  if (fileIndex === undefined) {",
    "    return undefined",
    "  }",
    "",
    "  return [",
    ...uniqueFiles.map(
      (_, index) => `    routeFileModule${index}${index < uniqueFiles.length - 1 ? "," : ""}`,
    ),
    "  ][fileIndex]",
    "}",
    "",
    ...createRouteModuleHelperLines(),
    ...(hmrBlock.length > 0 ? ["", ...hmrBlock] : []),
    "",
    "export default routeModules",
  ].join("\n");
}

function createRouteModulesHmrBlock(
  routeImportSpecifiers: string[],
  options: {
    applyUpdatedModules?: string[];
  } = {},
): string[] {
  if (routeImportSpecifiers.length === 0) {
    return [];
  }

  return [
    "if (import.meta.hot) {",
    `  import.meta.hot.accept(${JSON.stringify(routeImportSpecifiers)}, async (nextModules) => {`,
    ...(options.applyUpdatedModules ?? []),
    '    if (typeof window !== "undefined") {',
    "      const runtime = globalThis",
    "      const applyRouteModuleHotUpdate = runtime.__ROUTE_MODULE_HMR__",
    "",
    '      if (typeof applyRouteModuleHotUpdate === "function") {',
    "        await applyRouteModuleHotUpdate()",
    "        return",
    "      }",
    "    }",
    "",
    "    import.meta.hot.invalidate()",
    "  })",
    "}",
  ];
}

function createAppRuntimeHmrBlock(
  importEntries: Array<{
    local: string;
    exportName: "appComponent" | "errorComponent" | "appLoader" | "appConfig";
    specifier: string;
  }>,
): string[] {
  const importSpecifiers = importEntries.map((entry) => entry.specifier);
  const updateBindings = importEntries.flatMap((entry, index) => {
    const resolveExpression =
      entry.exportName === "appComponent"
        ? `resolveAppComponent(${entry.local})`
        : entry.exportName === "errorComponent"
          ? `resolveErrorComponent(${entry.local})`
          : entry.exportName === "appLoader"
            ? `resolveAppLoader(${entry.local})`
            : `resolveAppConfig(${entry.local})`;

    return [
      `    if (nextModules[${index}]) {`,
      `      ${entry.local} = nextModules[${index}]`,
      "    }",
      `    ${entry.exportName} = ${resolveExpression}`,
    ];
  });

  return [
    "if (import.meta.hot) {",
    `  import.meta.hot.accept(${JSON.stringify(importSpecifiers)}, async (nextModules) => {`,
    ...updateBindings,
    "    app = createAppModule(appComponent, errorComponent, appLoader)",
    "    integration = createIntegration()",
    "",
    "    if (await notifyAppRuntimeHotUpdate({",
    "      appComponent,",
    "      errorComponent,",
    "      config: appConfig,",
    "      routes,",
    "    })) {",
    "      return",
    "    }",
    "",
    "    import.meta.hot.invalidate()",
    "  })",
    "}",
  ];
}

function createRouteDefinition(module: ScannedRouteModule): string {
  const entries = Object.entries(module.files) as Array<[RouteFileKey, string]>;
  const fileEntries = entries.map(([key, file]) => [key, createImportSpecifier(file)] as const);
  const directoryMiddlewareFiles = module.directoryMiddleware.map((file) =>
    createImportSpecifier(file),
  );
  const files = Array.from(
    new Set([...fileEntries.map(([, specifier]) => specifier), ...directoryMiddlewareFiles]),
  );

  return `{
  id: ${JSON.stringify(module.id)},
  kind: ${JSON.stringify(module.kind)},
  files: ${serializeArray(files)},
  entryFiles: ${serializeObject(fileEntries.map(([key, specifier]) => [key, JSON.stringify(specifier)]))},
  directoryMiddlewareFiles: ${serializeArray(directoryMiddlewareFiles)}
}`;
}

function createRouteModuleHelperLines(): string[] {
  return [
    "function createPhialRouteModule(definition, loadedModules) {",
    "  const modules = Object.fromEntries(definition.files.map((file, index) => [file, loadedModules[index]]))",
    "  const primaryModule = resolvePrimaryModule(definition, modules)",
    '  const errorModule = resolveEntryModule(definition, modules, "error")',
    '  const loadingModule = resolveEntryModule(definition, modules, "loading")',
    '  const loaderModule = resolveEntryModule(definition, modules, "loader")',
    '  const actionModule = resolveEntryModule(definition, modules, "action")',
    '  const middlewareModule = resolveEntryModule(definition, modules, "middleware")',
    "  const directoryMiddlewareModules = definition.directoryMiddlewareFiles.map((file) => modules[file])",
    "",
    "  return {",
    "    default: resolveDefaultExport(primaryModule),",
    "    directoryMiddleware: directoryMiddlewareModules.flatMap((module) => resolveMiddlewareExport(module) ?? []),",
    '    loader: resolveHandlerExport(loaderModule, "loader") ?? resolveNamedExport(primaryModule, "loader"),',
    '    action: resolveHandlerExport(actionModule, "action") ?? resolveNamedExport(primaryModule, "action"),',
    "    middleware: resolveMiddlewareExport(middlewareModule) ?? resolveMiddlewareExport(primaryModule, false),",
    '    shouldRevalidate: resolveNamedExport(primaryModule, "shouldRevalidate"),',
    '    meta: resolveNamedExport(primaryModule, "meta"),',
    '    ErrorBoundary: resolveDefaultExport(errorModule) ?? resolveNamedExport(primaryModule, "ErrorBoundary"),',
    '    Loading: resolveDefaultExport(loadingModule) ?? resolveNamedExport(primaryModule, "Loading"),',
    '    onError: resolveHandlerExport(errorModule, "onError") ?? resolveNamedExport(primaryModule, "onError")',
    "  }",
    "}",
    "",
    "function resolvePrimaryModule(definition, modules) {",
    "  const primaryFile = definition.entryFiles[definition.kind]",
    "  return primaryFile ? modules[primaryFile] : undefined",
    "}",
    "",
    "function resolveEntryModule(definition, modules, key) {",
    "  const file = definition.entryFiles[key]",
    "  return file ? modules[file] : undefined",
    "}",
    "",
    "function resolveDefaultExport(module) {",
    "  return module?.default",
    "}",
    "",
    "function resolveNamedExport(module, name) {",
    "  return module?.[name]",
    "}",
    "",
    "function resolveHandlerExport(module, name) {",
    "  if (!module) {",
    "    return undefined",
    "  }",
    "",
    "  return module[name] ?? module.default",
    "}",
    "",
    "function resolveMiddlewareExport(module, allowDefault = true) {",
    "  if (!module) {",
    "    return undefined",
    "  }",
    "",
    "  const middleware = module.middleware ?? (allowDefault ? module.default : undefined)",
    "  if (middleware === undefined) {",
    "    return undefined",
    "  }",
    "",
    "  return Array.isArray(middleware) ? middleware : [middleware]",
    "}",
  ];
}

function resolveModuleSpecifiers(module: ScannedRouteModule): string[] {
  return Array.from(
    new Set([
      ...Object.values(module.files).map((file) => createImportSpecifier(file)),
      ...module.directoryMiddleware.map((file) => createImportSpecifier(file)),
    ]),
  );
}

function serializeObject(entries: Array<[string, string]>): string {
  if (entries.length === 0) {
    return "{}";
  }

  return `{\n${entries.map(([key, value]) => `  ${JSON.stringify(key)}: ${value}`).join(",\n")}\n}`;
}

function serializeArrayOfObjects(entries: Array<Array<[string, string]>>): string {
  if (entries.length === 0) {
    return "[]";
  }

  return `[\n${entries.map((objectEntries) => `  ${serializeInlineObject(objectEntries)}`).join(",\n")}\n]`;
}

function serializeInlineObject(entries: Array<[string, string]>): string {
  if (entries.length === 0) {
    return "{}";
  }

  return `{ ${entries.map(([key, value]) => `${JSON.stringify(key)}: ${value}`).join(", ")} }`;
}

function serializeArray(entries: string[]): string {
  if (entries.length === 0) {
    return "[]";
  }

  return `[\n${entries.map((entry) => `  ${JSON.stringify(entry)}`).join(",\n")}\n]`;
}

function createImportSpecifier(file: string): string {
  return file.startsWith("/") ? file : `/${file}`;
}
