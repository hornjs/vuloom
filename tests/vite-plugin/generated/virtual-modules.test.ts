import { describe, expect, test } from "vitest";
import { resolveVirtualModuleId } from "../../../src/lib/vite/generated/virtual-modules.ts";
import {
  createClientEntryModule,
  createVirtualAppRuntimeModule,
  createVirtualAppPluginModule,
  createVirtualConfigModule,
  createVirtualRoutesManifestModule,
  createVirtualRoutesModulesModule,
  createVirtualServerPluginModule,
  createVirtualServerRoutesModule,
} from "../../../src/lib/vite/generated/index.ts";
import {
  createRouteManifest,
  type ScannedRoutesResult,
} from "../../../src/lib/vite/scanners/index.ts";

const scannedResult: ScannedRoutesResult = {
  root: "/repo",
  appDir: "/repo/app",
  routesDir: "/repo/app/pages",
  serverRoutesDir: "/repo/server/routes",
  serverMiddlewareDir: "/repo/server/middleware",
  app: {
    app: "app/app.vue",
    error: "app/error.vue",
    loader: "app/loader.ts",
    config: "app.config.ts",
    middleware: {
      auth: "app/middleware/auth.ts",
    },
  },
  server: {
    routesDir: "server/routes",
    middlewareDir: "server/middleware",
    routes: [
      {
        id: "robots.txt",
        file: "server/routes/robots.txt.ts",
        absoluteFile: "/repo/server/routes/robots.txt.ts",
        directoryMiddleware: [],
        path: "/robots.txt",
      },
    ],
    middleware: {
      trace: "server/middleware/trace.ts",
    },
  },
  modules: [
    {
      id: "layout",
      kind: "layout",
      file: "app/pages/layout.vue",
      absoluteFile: "/repo/app/pages/layout.vue",
      directoryMiddleware: [],
      path: "/",
      files: {
        layout: "app/pages/layout.vue",
      },
    },
    {
      id: "posts/[slug]/page",
      kind: "page",
      file: "app/pages/posts/[slug]/page.vue",
      absoluteFile: "/repo/app/pages/posts/[slug]/page.vue",
      directoryMiddleware: ["app/pages/posts/_middleware.ts"],
      path: ":slug",
      parentId: "layout",
      files: {
        page: "app/pages/posts/[slug]/page.vue",
        loader: "app/pages/posts/[slug]/loader.ts",
      },
    },
  ],
  manifest: [],
};

scannedResult.manifest = createRouteManifest(scannedResult.modules);

describe("virtual module generators", () => {
  test("generates routes manifest and runtime modules", () => {
    const manifestModule = createVirtualRoutesManifestModule(scannedResult);
    const runtimeModule = createVirtualAppRuntimeModule(scannedResult);
    const appPluginModule = createVirtualAppPluginModule();
    const serverPluginModule = createVirtualServerPluginModule();
    const routesModule = createVirtualRoutesModulesModule(scannedResult, {
      moduleImportMode: "eager",
    });
    const clientEntry = createClientEntryModule({ idPrefix: "" });

    expect(manifestModule).toContain("export const manifest = [");
    expect(runtimeModule).toContain("vuepagelet/integration");
    expect(runtimeModule).toContain("phial/generated-app-middleware");
    expect(runtimeModule).toContain("resolveMiddlewareReferences");
    expect(runtimeModule).toContain("resolvedModule.directoryMiddleware");
    expect(runtimeModule).toContain("attachAppMiddleware");
    expect(runtimeModule).toContain("export default integration");
    expect(runtimeModule).toContain("export function createIntegration");
    expect(runtimeModule).toContain("__ROUTE_MODULE_HMR__");
    expect(runtimeModule).toContain("__APP_RUNTIME_HMR__");
    expect(appPluginModule).toContain("createAppRouteMiddleware");
    expect(appPluginModule).toContain("export function createAppPlugin");
    expect(appPluginModule).toContain("createIntegration");
    expect(appPluginModule).toContain("return async (context, next) => {");
    expect(appPluginModule).toContain("const request = context.request");
    expect(appPluginModule).toContain("return next(context)");
    expect(appPluginModule).toContain("export default createAppPlugin");
    expect(appPluginModule).not.toContain("createIntegration: () => integration");
    expect(serverPluginModule).toContain("createServerPlugin");
    expect(serverPluginModule).toContain("export function createServerPlugin");
    expect(serverPluginModule).toContain("return async (context, next) => {");
    expect(serverPluginModule).toContain("const request = context.request");
    expect(serverPluginModule).toContain("return next(context)");
    expect(serverPluginModule).toContain("export default createServerPlugin");
    expect(serverPluginModule).toContain("serverRoutes");
    expect(serverPluginModule).toContain("runMiddleware");
    expect(serverPluginModule).toContain("return handleRoute(context, handler)");
    expect(serverPluginModule).toContain("return runMiddleware({");
    expect(serverPluginModule).toContain("context,");
    expect(serverPluginModule).toContain("middleware,");
    expect(serverPluginModule).toContain("terminal: (nextContext) => handleRoute(nextContext, handler),");
    expect(serverPluginModule).toContain("globalMiddlewareNames: config.server?.middleware ?? []");
    expect(serverPluginModule).not.toContain(
      "runMiddleware(middleware, request, (nextRequest) => handleRoute(nextRequest, handler))",
    );
    expect(serverPluginModule).not.toContain("const result = await handler(request)");
    expect(routesModule).toContain("export const routeFiles = {");
    expect(routesModule).toContain("createPhialRouteModule");
    expect(routesModule).toContain(
      'shouldRevalidate: resolveNamedExport(primaryModule, "shouldRevalidate")',
    );
    expect(clientEntry).toContain("integration.hydrate().mount()");
    expect(clientEntry).toContain("phial/generated-app-runtime");
    expect(clientEntry).toContain("phial/generated-app-plugin");
    expect(clientEntry).toContain("phial/generated-server-plugin");
    expect(clientEntry).toContain("[phial]");
  });

  test("generates server routes in the shape expected by the sevok server plugin", () => {
    const serverRoutesModule = createVirtualServerRoutesModule(scannedResult);

    expect(serverRoutesModule).toContain("directoryMiddlewareNames");
    expect(serverRoutesModule).toContain("definition");
    expect(serverRoutesModule).toContain(
      "middlewareNames: normalizeMiddlewareNames(route?.middleware)",
    );
    expect(serverRoutesModule).toContain('meta: route?.meta && typeof route.meta === "object"');
    expect(serverRoutesModule).not.toContain('"route",');
    expect(serverRoutesModule).not.toContain('"directoryMiddleware",');
  });

  test("generates config module and resolves virtual ids", () => {
    expect(
      createVirtualConfigModule({
        config: { appDir: "app" },
        hasConfigFile: true,
      }),
    ).toContain("export const hasConfig = true");

    expect(resolveVirtualModuleId("phial/generated-routes-manifest")).toBe(
      "\0phial/generated-routes-manifest",
    );
    expect(resolveVirtualModuleId("phial/generated-routes-manifest")).toBe(
      "\0phial/generated-routes-manifest",
    );
    expect(resolveVirtualModuleId("virtual:phial-routes-manifest")).toBe(
      "\0virtual:phial-routes-manifest",
    );
    expect(resolveVirtualModuleId("virtual:unknown")).toBeNull();
  });
});
