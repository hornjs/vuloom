import { describe, expect, test } from "vitest";
import {
  GENERATED_APP_PLUGIN_ID,
  GENERATED_SERVER_PLUGIN_ID,
  resolveVirtualModuleId,
} from "../../../src/lib/vite-plugin/generated/virtual-modules.ts";
import {
  createClientEntryModule,
  createVirtualAppRuntimeModule,
  createVirtualAppPluginModule,
  createVirtualConfigModule,
  createVirtualRoutesManifestModule,
  createVirtualRoutesModulesModule,
  createVirtualServerPluginModule,
  createVirtualServerRoutesModule,
} from "../../../src/lib/vite-plugin/generated/index.ts";
import {
  createRouteManifest,
  type ScannedRoutesResult,
} from "../../../src/lib/vite-plugin/scanners/index.ts";

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
    const appPluginModule = createVirtualAppPluginModule(scannedResult);
    const serverPluginModule = createVirtualServerPluginModule(scannedResult);
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
    expect(appPluginModule).toContain("createAppRouteServerPlugin");
    expect(appPluginModule).not.toContain("@hornjs/horn/internal/vite-plugin");
    expect(appPluginModule).not.toContain('from "@hornjs/horn"');
    expect(appPluginModule).toContain("export function createAppPlugin");
    expect(appPluginModule).toContain("createIntegration");
    expect(appPluginModule).toContain("export default createAppPlugin");
    expect(appPluginModule).not.toContain("createIntegration: () => integration");
    expect(serverPluginModule).toContain("createServerRoutesPlugin");
    expect(serverPluginModule).not.toContain("@hornjs/horn/internal/vite-plugin");
    expect(serverPluginModule).not.toContain('from "@hornjs/horn"');
    expect(serverPluginModule).toContain("export function createServerPlugin");
    expect(serverPluginModule).toContain("export default createServerPlugin");
    expect(serverPluginModule).toContain("serverRoutes");
    expect(serverPluginModule).toContain("globalMiddlewareNames: config.server?.middleware ?? []");
    expect(routesModule).toContain("export const routeFiles = {");
    expect(routesModule).toContain("createPhialRouteModule");
    expect(routesModule).toContain(
      'shouldRevalidate: resolveNamedExport(primaryModule, "shouldRevalidate")',
    );
    expect(clientEntry).toContain("integration.hydrate().mount()");
    expect(clientEntry).toContain("phial/generated-app-runtime");
    expect(clientEntry).toContain("phial/generated-app-plugin");
    expect(clientEntry).toContain("phial/generated-server-plugin");
    expect(clientEntry).not.toContain("@hornjs/horn/generated-routes-manifest");
    expect(clientEntry).not.toContain("@hornjs/horn/generated-routes-modules");
    expect(clientEntry).not.toContain("@hornjs/horn/client");
    expect(clientEntry).toContain("[phial]");
  });

  test("generates server routes in the shape expected by fest server plugin", () => {
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
