import { access, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "..");
const execFileAsync = promisify(execFile);

describe("phial public entry surface", () => {
  it("matches the phial-branded package and public API contract", async () => {
    const packageJson = await readFile(resolve(repoRoot, "package.json"), "utf8");
    const readme = await readFile(resolve(repoRoot, "README.md"), "utf8");
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

    expect(packageJsonData.bin).toEqual({
      phial: "./bin/phial.mjs",
    });
    expect(packageJsonData.files).toEqual(
      expect.arrayContaining(["dist", "bin/phial.mjs"]),
    );
    expect(packageJsonData.exports).toMatchObject({
      ".": "./src/index.ts",
      "./vite-plugin": "./src/vite-plugin.ts",
      "./cli": "./src/cli.ts",
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
          args: expect.arrayContaining(["--noEmit", "-p", "tsconfig.app.json"]),
        }),
        expect.objectContaining({
          command: "tsc",
          args: expect.arrayContaining(["--noEmit", "-p", "tsconfig.node.json"]),
        }),
      ]),
    );

    await execFileAsync("pnpm", ["build"], { cwd: repoRoot });

    await expect(access(resolve(repoRoot, "dist/index.js"))).resolves.toBeUndefined();
    await expect(access(resolve(repoRoot, "dist/vite-plugin.js"))).resolves.toBeUndefined();
    await expect(access(resolve(repoRoot, "dist/index.d.ts"))).resolves.toBeUndefined();
    await expect(access(resolve(repoRoot, "dist/vite-plugin.d.ts"))).resolves.toBeUndefined();
    await expect(access(resolve(repoRoot, "dist/cli.d.ts"))).resolves.toBeUndefined();

    const indexDist = await import(pathToFileURL(resolve(repoRoot, "dist/index.js")).href);
    const vitePluginDist = await import(
      pathToFileURL(resolve(repoRoot, "dist/vite-plugin.js")).href,
    );
    const cliDist = await import(pathToFileURL(resolve(repoRoot, "dist/cli.js")).href);
    const vitePluginTypes = await readFile(resolve(repoRoot, "dist/vite-plugin.d.ts"), "utf8");
    const cliTypes = await readFile(resolve(repoRoot, "dist/cli.d.ts"), "utf8");
    const indexTypes = await readFile(resolve(repoRoot, "dist/index.d.ts"), "utf8");

    expect(indexDist).toHaveProperty("RouterView");
    expect(indexDist).toHaveProperty("useAppData");
    expect(indexDist).toHaveProperty("defer");
    expect(indexDist).not.toHaveProperty("runHornCli");
    expect(indexTypes).toContain('export * from "vuepagelet";');

    expect(vitePluginDist).toHaveProperty("defineConfig");
    expect(vitePluginDist).toHaveProperty("loadPhialConfig");
    expect(vitePluginDist).toHaveProperty("buildPhialApp");
    expect(vitePluginDist).toHaveProperty("preparePhialApp");
    expect(vitePluginDist).toHaveProperty("startPhialDevServer");
    expect(vitePluginDist).toHaveProperty("startPhialServer");
    expect(vitePluginDist).toHaveProperty("phialVitePlugin");
    expect(vitePluginDist).not.toHaveProperty("DEFAULT_CLIENT_BUILD_OUT_DIR");
    expect(vitePluginDist).not.toHaveProperty("DEFAULT_SERVER_BUILD_OUT_DIR");
    expect(vitePluginDist).not.toHaveProperty("loadHornConfig");
    expect(vitePluginDist).not.toHaveProperty("buildHornApp");
    expect(vitePluginDist).not.toHaveProperty("prepareHornApp");
    expect(vitePluginDist).not.toHaveProperty("startHornDevServer");
    expect(vitePluginDist).not.toHaveProperty("startHornServer");
    expect(vitePluginDist).not.toHaveProperty("hornVitePlugin");

    expect(cliDist).toHaveProperty("runPhialCli");
    expect(cliDist).not.toHaveProperty("runHornCli");
    expect(cliTypes).toContain("runPhialCli");
    expect(cliTypes).not.toContain("runHornCli");
    expect(vitePluginTypes).toContain("PhialConfig");
    expect(vitePluginTypes).toContain("PhialDevConfig");
    expect(vitePluginTypes).toContain("PhialPluginOptions");
    expect(vitePluginTypes).toContain("PhialServerConfig");
    expect(vitePluginTypes).toContain("LoadPhialConfigOptions");
    expect(vitePluginTypes).toContain("LoadedPhialConfig");
    expect(vitePluginTypes).toContain("PhialVitePluginOptions");
    expect(vitePluginTypes).toContain("PhialBuildOptions");
    expect(vitePluginTypes).toContain("PhialBuildResult");
    expect(vitePluginTypes).toContain("PhialPrepareOptions");
    expect(vitePluginTypes).toContain("PhialDevServerHandle");
    expect(vitePluginTypes).toContain("PhialDevServerOptions");
    expect(vitePluginTypes).toContain("PhialStartServerHandle");
    expect(vitePluginTypes).toContain("PhialStartServerOptions");
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

    const { stdout, stderr } = await execFileAsync("node", ["bin/phial.mjs"], {
      cwd: repoRoot,
    });

    expect(stdout).toContain("Usage: phial");
    expect(stdout).toContain("phial dev");
    expect(stdout).not.toContain("horn");
    expect(stderr).toBe("");

    const packRun = await execFileAsync("npm", ["pack", "--dry-run", "--json"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        HOME: "/tmp",
        npm_config_cache: "/tmp/npm-cache",
      },
    });
    const packOutput = JSON.parse(packRun.stdout as string) as Array<{
      files?: Array<{ path: string }>;
    }>;
    const packFiles = packOutput.flatMap((entry) => entry.files?.map((file) => file.path) ?? []);

    expect(packFiles).toEqual(
      expect.arrayContaining([
        "bin/phial.mjs",
        "dist/cli.js",
        "dist/cli.d.ts",
        "dist/index.js",
        "dist/index.d.ts",
        "dist/vite-plugin.js",
        "dist/vite-plugin.d.ts",
      ]),
    );

    expect(extractTopLevelTitle(readme)).toBe("phial");
    expect(extractPublicEntryPoints(readme)).toEqual(["phial", "phial/vite-plugin"]);
    expect(extractSectionParagraph(readme, "Public entry points")).toContain(
      "phial re-exports the vuepagelet runtime surface",
    );
    expect(hasLegacyPackageNames(readme)).toBe(false);
  });
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

    entries.push(trimmed.slice(2).replaceAll("`", ""));
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

  return paragraphLines.join(" ").replaceAll("`", "");
}

function hasLegacyPackageNames(readme: string): boolean {
  const normalized = readme.toLowerCase().replaceAll("`", "");
  return normalized.includes("@hornjs/horn");
}
