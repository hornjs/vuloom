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
    };

    await expect(access(resolve(repoRoot, "bin/horn.mjs"))).rejects.toMatchObject({
      code: "ENOENT",
    });

    expect(packageJsonData.bin).toEqual({
      phial: "./bin/phial.mjs",
    });
    expect(packageJsonData.files).toEqual(
      expect.arrayContaining(["dist", "bin/phial.mjs", "src/lib/generated-routes.d.ts"]),
    );
    expect(packageJsonData.exports).toMatchObject({
      ".": {
        types: "./dist/index.d.ts",
        default: "./dist/index.js",
      },
      "./vite-plugin": {
        types: "./dist/vite-plugin.d.ts",
        default: "./dist/vite-plugin.js",
      },
      "./generated-routes-manifest": "./src/lib/generated-routes.d.ts",
      "./generated-config": "./src/lib/generated-routes.d.ts",
    });

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
        "src/lib/generated-routes.d.ts",
      ]),
    );

    expect(readme).toContain("# phial");
    expect(readme).toContain("phial/vite-plugin");
    expect(readme).toContain("vuepagelet");
    expect(readme).not.toContain("@hornjs/horn");
  });
});
