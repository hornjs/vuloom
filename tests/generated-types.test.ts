import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const repoRoot = resolve(import.meta.dirname, "..");

describe("generated module type surface", () => {
  test("source generated subpaths stay aligned with the src public contract", () => {
    const generatedTypesPath = resolve(repoRoot, "src/lib/generated-routes.d.ts");
    const packageJsonPath = resolve(repoRoot, "package.json");
    const source = readFileSync(generatedTypesPath, "utf8");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      exports: Record<string, string>;
    };

    expect(packageJson.exports["./generated-routes-manifest"]).toEqual(
      "./src/lib/generated-routes.d.ts",
    );
    expect(packageJson.exports["./generated-routes-modules"]).toEqual(
      "./src/lib/generated-routes.d.ts",
    );
    expect(packageJson.exports["./generated-app-runtime"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(packageJson.exports["./generated-app-loader"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(packageJson.exports["./generated-app-middleware"]).toEqual(
      "./src/lib/generated-routes.d.ts",
    );
    expect(packageJson.exports["./generated-app-plugin"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(packageJson.exports["./generated-server-routes"]).toEqual(
      "./src/lib/generated-routes.d.ts",
    );
    expect(packageJson.exports["./generated-server-middleware"]).toEqual(
      "./src/lib/generated-routes.d.ts",
    );
    expect(packageJson.exports["./generated-server-plugin"]).toEqual(
      "./src/lib/generated-routes.d.ts",
    );
    expect(packageJson.exports["./generated-config"]).toEqual("./src/lib/generated-routes.d.ts");

    expect(source).toContain('declare module "vuloom/generated-routes-manifest"');
    expect(source).toContain('declare module "vuloom/generated-app-runtime"');
    expect(source).toContain('declare module "vuloom/generated-config"');
    expect(source).toContain("declare namespace VuloomGeneratedTypes");
    expect(source).toContain("type ServerRouteHandler = import(\"sevok\").ServerHandler;");
    expect(source).toContain("type ServerMiddleware = import(\"sevok\").ServerMiddleware;");
    expect(source).toContain("type ServerMiddlewareFunction = import(\"sevok\").ServerMiddlewareFunction;");
    expect(source).toContain("createAppPlugin");
    expect(source).toContain("createServerPlugin");
    expect(source).not.toContain("FestServerPlugin");
  });
});
