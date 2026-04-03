import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "..");

describe("phial public entry surface", () => {
  it("matches the phial-branded package and public API contract", async () => {
    const packageJson = await readFile(resolve(repoRoot, "package.json"), "utf8");
    const entrySource = await readFile(resolve(repoRoot, "src/index.ts"), "utf8");
    const vitePluginSource = await readFile(resolve(repoRoot, "src/vite-plugin.ts"), "utf8");
    const cliSource = await readFile(resolve(repoRoot, "src/cli.ts"), "utf8");
    const binSource = await readFile(resolve(repoRoot, "bin/phial.mjs"), "utf8");
    const readme = await readFile(resolve(repoRoot, "README.md"), "utf8");

    await expect(access(resolve(repoRoot, "bin/horn.mjs"))).rejects.toMatchObject({
      code: "ENOENT",
    });

    expect(packageJson).toContain('"name": "phial"');
    expect(packageJson).toContain(
      '"example:zero-config": "pnpm build && node bin/phial.mjs dev examples/zero-config"',
    );

    expect(entrySource).toContain('export * from "vuepagelet";');
    expect(entrySource).not.toContain("@hornjs/vue-route-runtime");

    expect(vitePluginSource).toContain("loadPhialConfig");
    expect(vitePluginSource).toContain("phialVitePlugin");
    expect(vitePluginSource).toContain("PhialConfig");
    expect(vitePluginSource).not.toContain("\n  loadHornConfig,\n");
    expect(vitePluginSource).not.toContain("\n  buildHornApp,\n");
    expect(vitePluginSource).not.toContain("\n  prepareHornApp,\n");
    expect(vitePluginSource).not.toContain("\n  startHornDevServer,\n");
    expect(vitePluginSource).not.toContain("\n  startHornServer,\n");
    expect(vitePluginSource).not.toContain("\n  hornVitePlugin,\n");
    expect(vitePluginSource).not.toContain("\n  HornConfig,\n");
    expect(vitePluginSource).not.toContain("\n  HornDevConfig,\n");
    expect(vitePluginSource).not.toContain("\n  HornPluginOptions,\n");
    expect(vitePluginSource).not.toContain("\n  HornServerConfig,\n");
    expect(vitePluginSource).not.toContain("\n  LoadHornConfigOptions,\n");
    expect(vitePluginSource).not.toContain("\n  LoadedHornConfig,\n");
    expect(vitePluginSource).not.toContain("\n  HornBuildOptions,\n");
    expect(vitePluginSource).not.toContain("\n  HornBuildResult,\n");
    expect(vitePluginSource).not.toContain("\n  HornPrepareOptions,\n");
    expect(vitePluginSource).not.toContain("\n  HornDevServerHandle,\n");
    expect(vitePluginSource).not.toContain("\n  HornDevServerOptions,\n");
    expect(vitePluginSource).not.toContain("\n  HornStartServerHandle,\n");
    expect(vitePluginSource).not.toContain("\n  HornStartServerOptions,\n");

    expect(cliSource).toContain("runPhialCli");
    expect(cliSource).not.toContain('export { runHornCli } from "./lib/cli/index";');
    expect(binSource).toContain("runPhialCli");

    expect(readme).toContain("# phial");
    expect(readme).toContain("phial/vite-plugin");
    expect(readme).toContain("vuepagelet");
    expect(readme).not.toContain("@hornjs/horn");
  });
});
