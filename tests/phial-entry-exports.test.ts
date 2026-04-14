import { access, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "..");
const execFileAsync = promisify(execFile);

describe("vuloom public entry surface", () => {
  it("matches the vuloom-branded package and public API contract", async () => {
    const packageJson = await readFile(resolve(repoRoot, "package.json"), "utf8");
    const readme = await readFile(resolve(repoRoot, "README.md"), "utf8");
    const sourceBin = await readFile(resolve(repoRoot, "src/bin.ts"), "utf8");
    const packageJsonData = JSON.parse(packageJson) as {
      bin?: Record<string, string>;
      files?: string[];
      exports?: Record<string, unknown>;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    await expect(access(resolve(repoRoot, "bin/horn.mjs"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(access(resolve(repoRoot, "src/bin.ts"))).resolves.toBeUndefined();

    expect(packageJsonData.bin).toEqual({
      vuloom: "./src/bin.ts",
    });
    expect(packageJsonData.files).toEqual(expect.arrayContaining(["dist"]));
    expect(packageJsonData.files).not.toContain("bin/vuloom.mjs");
    expect(sourceBin).toContain("#!/usr/bin/env node");
    expect(sourceBin).toContain('import { runVuloomCli } from "./lib/cli.js";');
    expect(sourceBin).toContain("process.exitCode = await runVuloomCli(process.argv.slice(2));");
    expect(packageJsonData.exports).toMatchObject({
      ".": "./src/index.ts",
      "./vite": "./src/vite.ts",
    });
    const exports = packageJsonData.exports!;
    expect(typeof exports["./generated-routes-manifest"]).toBe("string");
    expect(typeof exports["./generated-config"]).toBe("string");
    expect(exports["./generated-routes-manifest"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(exports["./generated-routes-modules"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(exports["./generated-app-runtime"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(exports["./generated-app-loader"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(exports["./generated-app-middleware"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(exports["./generated-app-plugin"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(exports["./generated-server-routes"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(exports["./generated-server-middleware"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(exports["./generated-server-plugin"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(exports["./generated-config"]).toEqual("./src/lib/generated-routes.d.ts");
    expect(packageJsonData.dependencies).toEqual(
      expect.objectContaining({
        vuepagelet: expect.any(String),
      }),
    );
    expect(packageJsonData.devDependencies).toHaveProperty("playwright");
    expect(packageJsonData.devDependencies).toHaveProperty("vue-tsc");
    expect(packageJsonData.scripts?.typecheck).toBeDefined();
    expect(parseCommandChain(packageJsonData.scripts?.typecheck ?? "")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: "vue-tsc",
          args: expect.arrayContaining(["--noEmit"]),
        }),
        expect.objectContaining({
          command: "tsc",
          args: expect.arrayContaining(["--noEmit", "-p", "tsconfig.node.json"]),
        }),
      ]),
    );

    await execFileAsync("pnpm", ["build"], { cwd: repoRoot });

    await expect(access(resolve(repoRoot, "dist/index.js"))).resolves.toBeUndefined();
    await expect(access(resolve(repoRoot, "dist/vite.js"))).resolves.toBeUndefined();
    await expect(access(resolve(repoRoot, "dist/index.d.ts"))).resolves.toBeUndefined();
    await expect(access(resolve(repoRoot, "dist/vite.d.ts"))).resolves.toBeUndefined();
    await expect(access(resolve(repoRoot, "dist/app.js"))).resolves.toBeUndefined();
    await expect(access(resolve(repoRoot, "dist/server.js"))).resolves.toBeUndefined();
    await expect(access(resolve(repoRoot, "dist/app.d.ts"))).resolves.toBeUndefined();
    await expect(access(resolve(repoRoot, "dist/server.d.ts"))).resolves.toBeUndefined();

    const indexDist = await import(pathToFileURL(resolve(repoRoot, "dist/index.js")).href);
    const vitePluginDist = await import(
      pathToFileURL(resolve(repoRoot, "dist/vite.js")).href,
    );
    const vitePluginTypes = await readFile(resolve(repoRoot, "dist/vite.d.ts"), "utf8");
    const indexTypes = await readFile(resolve(repoRoot, "dist/index.d.ts"), "utf8");

    expect(indexDist).toHaveProperty("name");
    expect(indexDist).toHaveProperty("version");
    expect(indexDist).not.toHaveProperty("RouterView");
    expect(indexDist).not.toHaveProperty("useAppData");
    expect(indexDist).not.toHaveProperty("defer");
    expect(indexDist).not.toHaveProperty("runHornCli");
    expect(indexTypes).toContain('export {');

    expect(vitePluginDist).toHaveProperty("vuloom");
    expect(vitePluginDist).not.toHaveProperty("vuloomVitePlugin");
    expect(vitePluginDist).not.toHaveProperty("DEFAULT_CLIENT_BUILD_OUT_DIR");
    expect(vitePluginDist).not.toHaveProperty("DEFAULT_SERVER_BUILD_OUT_DIR");
    expect(vitePluginDist).not.toHaveProperty("loadHornConfig");
    expect(vitePluginDist).not.toHaveProperty("buildHornApp");
    expect(vitePluginDist).not.toHaveProperty("prepareHornApp");
    expect(vitePluginDist).not.toHaveProperty("startHornDevServer");
    expect(vitePluginDist).not.toHaveProperty("startHornServer");
    expect(vitePluginDist).not.toHaveProperty("hornVitePlugin");

    // app.ts and server.ts exports
    const appTypes = await readFile(resolve(repoRoot, "dist/app.d.ts"), "utf8");
    const serverTypes = await readFile(resolve(repoRoot, "dist/server.d.ts"), "utf8");

    expect(appTypes).toContain("LoaderContext");
    expect(appTypes).toContain("ActionContext");
    expect(appTypes).toContain("PageMiddleware");
    expect(appTypes).toContain("ClientOnly");
    expect(appTypes).toContain("DevOnly");
    expect(appTypes).toContain("useHead");
    expect(appTypes).toContain("useTitle");
    expect(appTypes).toContain("useMeta");
    expect(appTypes).toContain("useLink");
    expect(appTypes).toContain("useStyle");
    expect(appTypes).toContain("useScript");
    expect(serverTypes).toContain("ServerHandler");
    expect(serverTypes).toContain("ServerMiddleware");
    expect(serverTypes).toContain("InvocationContext");

    expect(vitePluginTypes).toContain("VuloomOptions");
    expect(vitePluginTypes).not.toContain("VuloomVitePluginOptions");
    expect(vitePluginTypes).not.toContain("loadHornConfig as loadHornConfig");
    expect(vitePluginTypes).not.toContain("buildHornApp as buildHornApp");
    expect(vitePluginTypes).not.toContain("prepareHornApp as prepareHornApp");
    expect(vitePluginTypes).not.toContain("startHornDevServer as startHornDevServer");
    expect(vitePluginTypes).not.toContain("startHornServer as startHornServer");
    expect(vitePluginTypes).not.toContain("hornVitePlugin as hornVitePlugin");
    expect(vitePluginTypes).not.toContain("HornConfig as HornConfig");
    expect(vitePluginTypes).not.toContain("HornDevConfig as HornDevConfig");
    expect(vitePluginTypes).not.toContain("HornPluginOptions as HornPluginOptions");
    expect(vitePluginTypes).not.toContain("HornServerConfig as HornServerConfig");
    expect(vitePluginTypes).not.toContain("LoadHornConfigOptions as LoadHornConfigOptions");
    expect(vitePluginTypes).not.toContain("LoadedHornConfig as LoadedHornConfig");
    expect(vitePluginTypes).not.toContain("HornVitePluginOptions as HornVitePluginOptions");
    expect(vitePluginTypes).not.toContain("HornBuildOptions as HornBuildOptions");
    expect(vitePluginTypes).not.toContain("HornBuildResult as HornBuildResult");
    expect(vitePluginTypes).not.toContain("HornPrepareOptions as HornPrepareOptions");
    expect(vitePluginTypes).not.toContain("HornDevServerHandle as HornDevServerHandle");
    expect(vitePluginTypes).not.toContain("HornDevServerOptions as HornDevServerOptions");
    expect(vitePluginTypes).not.toContain("HornStartServerHandle as HornStartServerHandle");
    expect(vitePluginTypes).not.toContain("HornStartServerOptions as HornStartServerOptions");

    const prepareRun = await execFileAsync(
      "pnpm",
      ["exec", "prepare-publish", "--json", "--disable-lint"],
      {
        cwd: repoRoot,
      },
    );
    const prepareOutput = JSON.parse(prepareRun.stdout as string) as {
      packageJSON?: {
        bin?: Record<string, string>;
        files?: string[];
      };
      packedFiles?: Array<{ file: string }>;
    };
    const packedFiles = prepareOutput.packedFiles?.map((entry) => entry.file) ?? [];

    expect(prepareOutput.packageJSON?.bin).toEqual({
      vuloom: "./dist/bin.js",
    });
    expect(prepareOutput.packageJSON?.files).not.toContain("bin/vuloom.mjs");

    const publishBin = resolve(repoRoot, ".prepare-publish/dist/bin.js");
    const publishBinRun = await execFileAsync("node", [publishBin], {
      cwd: repoRoot,
    });

    expect(publishBinRun.stdout).toContain("Usage: vuloom");
    expect(publishBinRun.stdout).toContain("vuloom dev");
    expect(publishBinRun.stdout).not.toContain("horn");
    expect(publishBinRun.stderr).toBe("");

    expect(packedFiles).toEqual(
      expect.arrayContaining([
        "src/bin.ts",
        "dist/bin.js",
        "dist/index.js",
        "dist/index.d.ts",
        "dist/vite.js",
        "dist/vite.d.ts",
      ]),
    );

    expect(extractTopLevelTitle(readme)).toBe("vuloom");
    expect(extractPublicEntryPoints(readme)).toEqual([
      "vuloom",
      "vuloom/vite",
      "vuloom/app",
      "vuloom/server",
    ]);
    expect(extractSectionParagraph(readme, "Public entry points")).toContain(
      "vuloom exports the package version",
    );
    expect(extractSectionParagraph(readme, "Public entry points")).toContain(
      "vuloom/vite provides the Vite plugin, config utilities, and build tools",
    );
  }, 20_000);
});

function parseCommandChain(script: string): Array<{ command: string; args: string[] }> {
  return script.split("&&").map((part) => {
    const tokens = part
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return {
      command: tokens[0] ?? "",
      args: tokens.slice(1),
    };
  });
}

function extractPublicEntryPoints(readme: string): string[] {
  const lines = readme.split("\n");
  const start = lines.findIndex((line) => line.trim() === "## Public entry points");

  if (start === -1) {
    throw new Error('README is missing the "Public entry points" section.');
  }

  const entries: string[] = [];

  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (entries.length > 0) {
        continue;
      }
      continue;
    }

    if (!trimmed.startsWith("- ")) {
      break;
    }

    entries.push(trimmed.slice(2).split("`").join(""));
  }

  return entries;
}

function extractTopLevelTitle(readme: string): string {
  const firstLine = readme
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine || !firstLine.startsWith("# ")) {
    throw new Error("README is missing a top-level title.");
  }

  return firstLine.slice(2);
}

function extractSectionParagraph(readme: string, sectionTitle: string): string {
  const lines = readme.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${sectionTitle}`);

  if (start === -1) {
    throw new Error(`README is missing the "${sectionTitle}" section.`);
  }

  const sectionLines = lines.slice(start + 1);
  const paragraphLines: string[] = [];
  let collecting = false;

  for (const line of sectionLines) {
    const trimmed = line.trim();

    if (!collecting) {
      if (trimmed.length === 0 || trimmed.startsWith("- ")) {
        continue;
      }

      collecting = true;
      paragraphLines.push(trimmed);
      continue;
    }

    if (trimmed.length === 0) {
      break;
    }

    if (trimmed.startsWith("- ")) {
      break;
    }

    paragraphLines.push(trimmed);
  }

  if (paragraphLines.length === 0) {
    throw new Error(`README section "${sectionTitle}" does not contain a paragraph.`);
  }

  return paragraphLines.join(" ").split("`").join("");
}
