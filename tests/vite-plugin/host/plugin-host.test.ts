import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPhialBuildServerEntryModule } from "../../../src/lib/host/plugin-build";

describe("plugin host", () => {
  test("server entry targets sevok plugins instead of horn server runtime", () => {
    const source = createPhialBuildServerEntryModule();

    expect(source).toContain("sevok");
    expect(source).toContain("sevok/node");
    expect(source).toContain("NodeRuntimeAdapter");
    expect(source).toContain("phial/generated-app-plugin");
    expect(source).toContain("phial/generated-server-plugin");
    expect(source).toContain("manual = false");
  });

  test("production host delegates node serving to sevok adapter", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../../src/lib/host/plugin-server.ts"),
      "utf8",
    );

    expect(source).not.toContain("function createNodeRequest");
    expect(source).not.toContain("function writeNodeResponse");
    expect(source).toContain("await app.ready()");
  });

  test("dev host only remaps phial package source entrypoints that remain public", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../../src/lib/host/plugin-dev-server.ts"),
      "utf8",
    );

    expect(source).toContain('const PHIAL_PACKAGE_ID = "phial";');
    expect(source).toContain('return resolve(currentDir, "../../../..");');
    expect(source).not.toContain('resolveWorkspacePackageRoot("horn")');
    expect(source).toContain("id === `${PHIAL_PACKAGE_ID}/vite`");
    expect(source).not.toContain("id === `${PHIAL_PACKAGE_ID}/server`");
    expect(source).not.toContain("id === `${PHIAL_PACKAGE_ID}/internal/vite-plugin`");
    expect(source).not.toContain("ssrLoadModule(`${PHIAL_PACKAGE_ID}/server`)");
    expect(source).not.toContain("id === `${PHIAL_PACKAGE_ID}/client`");
    expect(source).not.toContain("createServerRoutesPlugin(");
    expect(source).not.toContain("@revuejs/vue");
    expect(source).not.toContain("VUE_PACKAGE_ID");
    expect(source).not.toContain("src/source.ts");
    expect(source).not.toContain(`${"${PHIAL_PACKAGE_ID}"}/generated-app-runtime`);
    expect(source).not.toContain(`${"${PHIAL_PACKAGE_ID}"}/generated-server-routes`);
  });

  test("runtime-facing dynamic imports are annotated for vite ssr analysis", () => {
    const appRoutesMiddlewareSource = readFileSync(
      resolve(import.meta.dirname, "../../../src/lib/app-routes/app-routes-middleware.ts"),
      "utf8",
    );
    const serverHostSource = readFileSync(
      resolve(import.meta.dirname, "../../../src/lib/host/plugin-server.ts"),
      "utf8",
    );

    expect(appRoutesMiddlewareSource).toContain("/* @vite-ignore */");
    expect(serverHostSource).toContain("/* @vite-ignore */");
  });

  test("horn package no longer exposes generated module compatibility wrappers", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../../../package.json"), "utf8"),
    ) as {
      exports: Record<string, unknown>;
    };
    const tsdownConfig = readFileSync(
      resolve(import.meta.dirname, "../../../tsdown.config.ts"),
      "utf8",
    );
    const generatedAppPluginPath = resolve(
      import.meta.dirname,
      "../../../src/generated-app-plugin.ts",
    );
    const generatedServerPluginPath = resolve(
      import.meta.dirname,
      "../../../src/generated-server-plugin.ts",
    );
    const browserSourcePath = resolve(import.meta.dirname, "../../../src/browser.ts");
    const clientSourcePath = resolve(import.meta.dirname, "../../../src/client.ts");
    const sharedSourcePath = resolve(import.meta.dirname, "../../../src/shared.ts");

    expect(packageJson.exports).toHaveProperty("./generated-app-plugin");
    expect(packageJson.exports).toHaveProperty("./generated-server-plugin");
    expect(packageJson.exports).toHaveProperty("./generated-app-runtime");
    expect(packageJson.exports).toHaveProperty("./generated-app-loader");
    expect(packageJson.exports).toHaveProperty("./generated-app-middleware");
    expect(packageJson.exports).toHaveProperty("./generated-server-routes");
    expect(packageJson.exports).toHaveProperty("./generated-server-middleware");
    expect(packageJson.exports).toHaveProperty("./generated-server-plugin");
    expect(packageJson.exports).toHaveProperty("./generated-routes-manifest");
    expect(packageJson.exports).toHaveProperty("./generated-routes-modules");
    expect(packageJson.exports).toHaveProperty("./generated-config");
    expect(packageJson.exports).not.toHaveProperty("./internal/vite-plugin");
    expect(packageJson.exports).toHaveProperty("./server");
    expect(packageJson.exports).toHaveProperty("./app");
    expect(packageJson.exports).not.toHaveProperty("./node");
    expect(packageJson.exports).not.toHaveProperty("./bun");
    expect(packageJson.exports).not.toHaveProperty("./deno");
    expect(packageJson.exports["."]).toEqual("./src/index.ts");
    expect(tsdownConfig).not.toContain("src/generated-app-plugin.ts");
    expect(tsdownConfig).not.toContain("src/generated-server-plugin.ts");
    expect(tsdownConfig).not.toContain("src/internal/vite-plugin.ts");
    expect(tsdownConfig).not.toContain("src/browser.ts");
    expect(tsdownConfig).not.toContain("src/client.ts");
    expect(tsdownConfig).not.toContain("src/shared.ts");
    expect(existsSync(generatedAppPluginPath)).toBe(false);
    expect(existsSync(generatedServerPluginPath)).toBe(false);
    expect(existsSync(browserSourcePath)).toBe(false);
    expect(existsSync(clientSourcePath)).toBe(false);
    expect(existsSync(sharedSourcePath)).toBe(false);
  });

  test("phial owns generated module ambient declarations", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../../../src/lib/generated-routes.d.ts"),
      "utf8",
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../../../package.json"), "utf8"),
    ) as {
      files: string[];
      exports: Record<string, { types?: string } | string>;
    };

    expect(source).toContain('declare module "phial/generated-app-runtime"');
    expect(source).toContain('declare module "phial/generated-server-plugin"');
    // files should not include src files - prepare-publish handles this
    expect(packageJson.exports["./generated-app-runtime"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(packageJson.exports["./generated-server-plugin"]).toEqual("./src/lib/generated-routes.d.ts");
  });
});
