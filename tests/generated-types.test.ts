import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, mkdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const repoRoot = resolve(import.meta.dirname, "..");
const vuepageletRoot = resolve(repoRoot, "../vuepagelet");

describe("generated module type surface", () => {
  test("published generated subpaths typecheck in a downstream project", async () => {
    const generatedTypesPath = resolve(import.meta.dirname, "../src/lib/generated-routes.d.ts");
    const packageJsonPath = resolve(import.meta.dirname, "../package.json");

    expect(existsSync(generatedTypesPath)).toBe(true);
    expect(existsSync(vuepageletRoot)).toBe(true);
    if (!existsSync(generatedTypesPath)) {
      return;
    }

    const source = readFileSync(generatedTypesPath, "utf8");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      files: string[];
      exports: Record<string, { types?: string } | string>;
    };
    expect(source).toContain('declare module "phial/generated-routes-manifest"');
    expect(source).toContain('declare module "phial/generated-app-runtime"');
    expect(source).toContain('declare module "phial/generated-config"');
    expect(source).toContain("declare namespace PhialGeneratedTypes");
    expect(source).toContain("vuepagelet/integration");
    expect(source).toContain("PhialGeneratedTypes.RouteManifestEntry[]");
    expect(source).toContain("PhialGeneratedTypes.ServerRouteRecord[]");
    expect(source).toContain("interface Config {");
    expect(source).toContain("serverMiddlewareRegistry: Record<string, PhialGeneratedTypes.ServerMiddleware>");
    expect(source).not.toContain("@hornjs/horn/generated-");
    expect(source).not.toContain('@hornjs/fest');
    expect(source).not.toContain('import("phial/vite-plugin").PhialConfig');
    expect(source).not.toContain('import("./vite-plugin/scanners/route-manifest")');
    expect(source).not.toContain('import("./server-routes/types")');
    expect(source).not.toContain('import("./vite-plugin/config")');
    expect(source).not.toContain('import("./lib/vite-plugin/config").HornConfig');
    // files should not include src - prepare-publish handles this
    expect(packageJson.exports["."]).toEqual("./src/index.ts");
    expect(packageJson.exports["./vite-plugin"]).toEqual("./src/vite-plugin.ts");
    expect(packageJson.exports).not.toHaveProperty("./internal/vite-plugin");
    expect(packageJson.exports["./generated-app-runtime"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(packageJson.exports["./generated-server-plugin"]).toEqual("./src/lib/generated-routes.d.ts");

    const fixtureRoot = await mkdtemp(resolve(repoRoot, ".tmp-phial-generated-types-"));

    try {
      const nodeModulesDir = resolve(fixtureRoot, "node_modules");
      await mkdir(nodeModulesDir, { recursive: true });
      const packedTarballDir = resolve(fixtureRoot, "packed");
      await mkdir(packedTarballDir, { recursive: true });
      await execFileAsync("pnpm", ["pack", "--pack-destination", packedTarballDir], {
        cwd: repoRoot,
      });
      const packedTarball = resolve(packedTarballDir, "phial-0.0.0.tgz");

      await execFileAsync("tar", ["-xzf", packedTarball, "-C", nodeModulesDir]);
      await rename(resolve(nodeModulesDir, "package"), resolve(nodeModulesDir, "phial"));
      await symlink(vuepageletRoot, resolve(nodeModulesDir, "vuepagelet"), "dir");
      await writeFile(
        resolve(fixtureRoot, "package.json"),
        JSON.stringify(
          {
            private: true,
            name: "phial-generated-types-consumer",
            type: "module",
          },
          null,
          2,
        ),
        "utf8",
      );
      await writeFile(
        resolve(fixtureRoot, "tsconfig.json"),
        JSON.stringify(
          {
            compilerOptions: {
              target: "ES2020",
              module: "ESNext",
              moduleResolution: "bundler",
              allowImportingTsExtensions: true,
              strict: true,
              skipLibCheck: false,
              noEmit: true,
              types: ["node"],
            },
            include: ["index.ts"],
          },
          null,
          2,
        ),
        "utf8",
      );
      await writeFile(
        resolve(fixtureRoot, "index.ts"),
        [
          'import config, { hasConfig } from "phial/generated-config";',
          'import serverRoutes, { serverMiddlewareRegistry as serverRoutesMiddlewareRegistry } from "phial/generated-server-routes";',
          'import manifest from "phial/generated-routes-manifest";',
          'import routeModules, { loadRouteModule } from "phial/generated-routes-modules";',
          'import runtime, { createIntegration } from "phial/generated-app-runtime";',
          'import appLoader from "phial/generated-app-loader";',
          'import appMiddlewareRegistry from "phial/generated-app-middleware";',
          'import createAppPlugin from "phial/generated-app-plugin";',
          'import serverMiddlewareRegistry from "phial/generated-server-middleware";',
          'import createServerPlugin from "phial/generated-server-plugin";',
          "",
          "export const resolvedConfig: typeof config = config;",
          "export const resolvedHasConfig: boolean = hasConfig;",
          "export const resolvedServerRoutes: typeof serverRoutes = serverRoutes;",
          "export const resolvedServerRoutesMiddlewareRegistry: typeof serverRoutesMiddlewareRegistry = serverRoutesMiddlewareRegistry;",
          "export const resolvedManifest: typeof manifest = manifest;",
          "export const resolvedRouteModules: typeof routeModules = routeModules;",
          "export const resolvedLoadRouteModule: typeof loadRouteModule = loadRouteModule;",
          "export const resolvedRuntime: typeof runtime = runtime;",
          "export const resolvedCreateIntegration: typeof createIntegration = createIntegration;",
          "export const resolvedAppLoader: typeof appLoader = appLoader;",
          "export const resolvedAppMiddlewareRegistry: typeof appMiddlewareRegistry = appMiddlewareRegistry;",
          "export const resolvedCreateAppPlugin: typeof createAppPlugin = createAppPlugin;",
          "export const resolvedServerMiddlewareRegistry: typeof serverMiddlewareRegistry = serverMiddlewareRegistry;",
          "export const resolvedCreateServerPlugin: typeof createServerPlugin = createServerPlugin;",
          "",
        ].join("\n"),
        "utf8",
      );

      try {
        await execFileAsync(
          "pnpm",
          ["exec", "tsc", "--noEmit", "-p", resolve(fixtureRoot, "tsconfig.json")],
          {
            cwd: repoRoot,
          },
        );
      } catch (error) {
        const failure = error as {
          stdout?: string | Buffer;
          stderr?: string | Buffer;
          message?: string;
        };
        throw new Error(
          [
            failure.message ?? "tsc failed",
            typeof failure.stdout === "string" ? failure.stdout : failure.stdout?.toString(),
            typeof failure.stderr === "string" ? failure.stderr : failure.stderr?.toString(),
          ]
            .filter(Boolean)
            .join("\n"),
        );
      }
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });
});
